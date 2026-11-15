import json
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

from app.core import config
from app.engine import events, plugins
from app.engine.commands import CommandError, command

NAME = re.compile(r"^[a-z0-9][a-z0-9._-]{0,63}$")
SHORT = re.compile(r"^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")
RESERVED = {"claude-code-marketplace", "claude-code-plugins", "claude-plugins-official", "anthropic-marketplace", "anthropic-plugins", "agent-skills", "anthropic-agent-skills",
            "life-sciences", "knowledge-work-plugins", "claude-for-legal", "claude-for-financial-services", "financial-services-plugins", "first-party-plugins", "claude-tag-plugins",
            "claude-community", "claude-plugins-community", "healthcare", "anthropic-plugin-directory", "claude-plugin-directory", "inline", "builtin", "skills-dir", "synced",
            "claude-plugin-test", "npm", "pip", "uv", "cargo", "github", "gh"}
ARCHIVE_CAP = 100_000_000
GIT_TIMEOUT = 120
SYNC_EVERY = 3600
_lock = threading.Lock()
_stop = threading.Event()


def root() -> Path:
    p = config.data_dir() / "marketplaces"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _registry() -> list[dict]:
    try:
        data = json.loads((root() / "registry.json").read_text(encoding="utf-8"))
        return data if isinstance(data, list) else []
    except (OSError, ValueError):
        return []


def _write(items: list[dict]) -> None:
    (root() / "registry.json").write_text(json.dumps(items, indent=1), encoding="utf-8")


def _entry(name: str) -> dict:
    for e in _registry():
        if e["name"] == name:
            return e
    raise CommandError(f"No marketplace {name}; marketplace.list gives them", 404)


def _git(*args: str, cwd: Path | None = None, token: str = "") -> str:
    if shutil.which("git") is None:
        raise CommandError("Adding a marketplace needs git on this computer")
    import base64
    auth = ["-c", "http.extraHeader=Authorization: Basic " + base64.b64encode(f"x-access-token:{token}".encode()).decode()] if token else []
    try:
        done = subprocess.run(["git", *auth, *args], cwd=cwd, capture_output=True, text=True, timeout=GIT_TIMEOUT, env=os.environ | {"GIT_TERMINAL_PROMPT": "0"})
    except subprocess.TimeoutExpired:
        raise CommandError(f"git {args[0]} took longer than {GIT_TIMEOUT} s") from None
    if done.returncode != 0:
        raise CommandError(f"git {args[0]} failed: {(done.stderr or done.stdout).strip().splitlines()[-1] if (done.stderr or done.stdout).strip() else done.returncode}")
    return done.stdout.strip()


def _url(source: str) -> str:
    return f"https://github.com/{source.removesuffix('.git')}.git" if SHORT.match(source) else source


def _clone(url: str, dest: Path, ref: str = "", sha: str = "", token: str = "") -> None:
    _git("clone", *([] if sha else ["--depth", "1"]), *(["--branch", ref] if ref and not sha else []), _url(url), str(dest), token=token)
    if sha:
        _git("checkout", "--quiet", sha, cwd=dest)


def _github(url: str) -> bool:
    return bool(SHORT.match(url)) or url.startswith(("https://github.com/", "git@github.com:"))


def _archive(src: dict, dest: Path) -> Path:
    import hashlib
    import ipaddress
    import zipfile
    from urllib.parse import urlparse

    import httpx
    url = str(src.get("url") or "")
    u = urlparse(url)
    host = (u.hostname or "").lower()
    if u.scheme != "https" or host in ("localhost", "metadata.google.internal") or host.endswith(".localhost"):
        raise CommandError("An archive plugin source must be an https URL on a public host")
    try:
        ip = ipaddress.ip_address(host)
        if ip.is_loopback or ip.is_link_local or ip.is_private:
            raise CommandError("An archive plugin source must be an https URL on a public host")
    except ValueError:
        pass
    try:
        with httpx.Client(timeout=60, follow_redirects=True, max_redirects=5) as http, http.stream("GET", url) as res:
            if res.status_code != 200:
                raise CommandError(f"The archive download answered HTTP {res.status_code}")
            data = bytearray()
            for chunk in res.iter_bytes():
                data.extend(chunk)
                if len(data) > ARCHIVE_CAP:
                    raise CommandError("The archive is larger than 100 MB")
    except httpx.HTTPError as exc:
        raise CommandError(f"The archive could not be downloaded: {exc}") from None
    want = str(src.get("sha256") or "").lower()
    if want and hashlib.sha256(data).hexdigest() != want:
        raise CommandError("The archive does not match its sha256, so it was not installed")
    zpath = dest.with_suffix(".zip")
    zpath.write_bytes(bytes(data))
    try:
        with zipfile.ZipFile(zpath) as zf:
            base = dest.resolve()
            for info in zf.infolist():
                target = (dest / info.filename).resolve()
                if info.is_dir() or base not in target.parents:
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(zf.read(info))
    except zipfile.BadZipFile:
        raise CommandError("The archive is not a zip file") from None
    finally:
        zpath.unlink(missing_ok=True)
    return dest


def _npm(src: dict, dest: Path) -> Path:
    import tarfile
    pkg, version, registry = str(src.get("package") or ""), str(src.get("version") or ""), str(src.get("registry") or "")
    if not pkg or pkg.startswith(("git", "file:", "npm:", "http:", ".", "/")) or ".." in pkg:
        raise CommandError(f"FormAT does not fetch the npm package {pkg!r}: use a package name or an https tarball link")
    if registry and not registry.startswith("https://"):
        raise CommandError("An npm registry must use https")
    if shutil.which("npm") is None:
        raise CommandError("This plugin comes from npm, which is not installed on this computer")
    spec = pkg if pkg.startswith("https://") or "@" in pkg.lstrip("@") or not version else f"{pkg}@{version}"
    dest.mkdir(parents=True, exist_ok=True)
    try:
        done = subprocess.run(["npm", "pack", spec, "--ignore-scripts", "--silent", "--pack-destination", str(dest), *(["--registry", registry] if registry else [])],
                              capture_output=True, text=True, timeout=GIT_TIMEOUT)
    except subprocess.TimeoutExpired:
        raise CommandError("npm took too long to fetch the package") from None
    tgz = next(iter(sorted(dest.glob("*.tgz"))), None)
    if done.returncode != 0 or tgz is None:
        raise CommandError(f"npm could not fetch {spec}: {(done.stderr or done.stdout).strip()[-300:]}")
    with tarfile.open(tgz) as tf:
        tf.extractall(dest, filter="data")
    return dest / "package" if (dest / "package").is_dir() else dest


def _command(src: dict) -> Path:
    cmd = str(src.get("command") or "")
    if not cmd or len(cmd) > 500 or not all(32 <= ord(ch) < 127 for ch in cmd) or "    " in cmd:
        raise CommandError("A command source must be printable ASCII, at most 500 characters, with no run of four spaces")
    try:
        limit = int(src.get("timeout") or 60)
    except (TypeError, ValueError):
        limit = 60
    try:
        done = subprocess.run(cmd, shell=True, cwd=str(Path.home()), capture_output=True, text=True, timeout=max(1, min(limit, 600)))
    except subprocess.TimeoutExpired:
        raise CommandError("The plugin's command took longer than its timeout") from None
    lines = [ln for ln in done.stdout.splitlines() if ln.strip()]
    if done.returncode != 0 or len(lines) != 1 or not os.path.isabs(lines[0].strip()):
        raise CommandError("The plugin's command must print one absolute path and exit 0")
    out = Path(lines[0].strip())
    home = Path.home().resolve()
    if not out.is_dir() or out.resolve() == home or out.resolve() in home.parents:
        raise CommandError(f"The plugin's command printed {out}, which is not a plugin folder")
    if not any((out / d).exists() for d in (".claude-plugin", "skills", "commands", "agents", "hooks")):
        raise CommandError(f"{out} has no plugin content")
    return out


def _catalog(folder: Path) -> dict:
    f = folder / ".claude-plugin" / "marketplace.json"
    if not f.is_file():
        raise CommandError("No .claude-plugin/marketplace.json in that repository; a marketplace lists its plugins there")
    try:
        data = json.loads(f.read_text(encoding="utf-8"))
    except ValueError as exc:
        raise CommandError(f"marketplace.json is not valid JSON: {exc}") from None
    if not isinstance(data, dict) or not data.get("name") or not isinstance(data.get("plugins"), list):
        raise CommandError("marketplace.json needs a name, an owner and a plugins list")
    return data


def _local(folder: Path, data: dict, source) -> Path | None:
    if not isinstance(source, str):
        return None
    rel = source if source.startswith("./") or not (data.get("metadata") or {}).get("pluginRoot") else f"{data['metadata']['pluginRoot'].rstrip('/')}/{source}"
    if ".." in Path(rel).parts:
        raise CommandError(f"The plugin source {source} leaves the marketplace")
    p = (folder / rel).resolve()
    return p if folder.resolve() in p.parents or p == folder.resolve() else None


def _offers(e: dict) -> list[dict]:
    folder = Path(e["folder"])
    try:
        data = _catalog(folder)
    except CommandError:
        return []
    have = {p["name"]: p for p in plugins.list_()}
    out = []
    for item in data["plugins"]:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        name = str(item["name"]).lower()
        src = item.get("source")
        local = _local(folder, data, src) if isinstance(src, str) else None
        manifest = plugins._manifest(local) if local and local.is_dir() else None
        version = str(item.get("version") or (manifest or {}).get("version") or "")
        mine = have.get(name)
        from_here = bool(mine) and (mine.get("origin") or {}).get("marketplace") == e["name"]
        author = item.get("author")
        out.append({"name": name, "description": str(item.get("description") or (manifest or {}).get("description") or "")[:600], "version": version,
                    "category": str(item.get("category") or ""), "author": str(author.get("name") if isinstance(author, dict) else author or ""),
                    "source": "path" if isinstance(src, str) else str((src or {}).get("source") or "unknown"),
                    "command": str(src.get("command") or "") if isinstance(src, dict) and src.get("source") == "command" else "",
                    "installed": from_here, "installedVersion": mine["version"] if from_here else "", "taken": bool(mine) and not from_here,
                    "update": from_here and bool(version) and version != mine["version"]})
    return out


def _public(e: dict) -> dict:
    return {k: e.get(k) for k in ("name", "source", "kind", "sync", "added", "checked", "error", "description")} | {"private": bool(e.get("token")), "plugins": _offers(e)}


def list_() -> list[dict]:
    return [_public(e) for e in _registry()]


def _publish() -> None:
    events.publish("marketplaces.changed", marketplaces=list_())


def add(source: str, token: str = "") -> dict:
    source, token = (source or "").strip(), (token or "").strip()
    if not source:
        raise CommandError("Give a repository URL, owner/repo for GitHub, or a folder on this computer")
    ref = ""
    pinned = re.match(r"^([A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)[@#](.+)$", source)
    if pinned:
        source, ref = pinned.group(1), pinned.group(2)
    path = Path(source).expanduser()
    with _lock:
        if path.is_dir():
            data, folder, kind = _catalog(path), path.resolve(), "path"
        elif SHORT.match(source) or re.match(r"^(https?|ssh|git|file)://|^git@", source):
            incoming = root() / f".incoming-{int(time.time() * 1000)}"
            try:
                _clone(source, incoming, ref, token=token)
                data = _catalog(incoming)
            except CommandError:
                shutil.rmtree(incoming, ignore_errors=True)
                raise
            kind, folder = "git", None
        else:
            raise CommandError("That is not a repository URL, owner/repo, or a folder on this computer")
        name = str(data["name"]).strip().lower()
        official = bool(re.match(r"^(anthropics/|https://github\.com/anthropics/|git@github\.com:anthropics/)", source))
        problem = (f"The marketplace name {name!r} must be lowercase letters, digits, dots, hyphens and underscores" if not NAME.match(name) or name == "registry.json"
                   else f"The name {name!r} is reserved for official Anthropic marketplaces" if (name in RESERVED or re.sub(r"[^a-z0-9_]", "-", name.rstrip(".")) in RESERVED) and not official
                   else f"Names starting with claudeai- are reserved for marketplaces hosted on claude.ai" if name.startswith("claudeai-") else "")
        if problem:
            if kind == "git":
                shutil.rmtree(incoming, ignore_errors=True)
            raise CommandError(problem)
        items = _registry()
        if any(e["name"] == name for e in items):
            if kind == "git":
                shutil.rmtree(incoming, ignore_errors=True)
            raise CommandError(f"The {name} marketplace is already added; Check for updates refreshes it")
        if kind == "git":
            folder = root() / name
            shutil.rmtree(folder, ignore_errors=True)
            incoming.rename(folder)
        now = time.time()
        e = {"name": name, "source": source + (f"@{ref}" if ref else ""), "kind": kind, "folder": str(folder), "sync": False, "added": now, "checked": now, "error": "", "token": token,
             "description": str(data.get("description") or (data.get("metadata") or {}).get("description") or "")[:300]}
        _write(items + [e])
    _publish()
    return _public(e)


def install(market: str, plugin: str, confirm: bool = False) -> dict:
    e = _entry(market)
    folder = Path(e["folder"])
    data = _catalog(folder)
    item = next((i for i in data["plugins"] if isinstance(i, dict) and str(i.get("name", "")).lower() == plugin.lower()), None)
    if item is None:
        raise CommandError(f"No plugin {plugin} in the {market} marketplace", 404)
    src = item.get("source")
    temp = None
    try:
        if isinstance(src, str):
            path = _local(folder, data, src)
            if path is None or not path.is_dir():
                raise CommandError(f"The plugin's folder {src} is not in the marketplace")
        elif isinstance(src, dict) and src.get("source") in ("github", "url", "git-subdir"):
            temp = root() / f".plugin-{int(time.time() * 1000)}"
            where = str(src.get("repo") or src.get("url") or "")
            _clone(where, temp, str(src.get("ref") or ""), str(src.get("sha") or ""), token=e.get("token", "") if _github(where) else "")
            path = temp / str(src.get("path") or "") if src["source"] == "git-subdir" else temp
            if ".." in Path(str(src.get("path") or "")).parts or not path.is_dir():
                raise CommandError(f"The plugin's path {src.get('path')} is not in its repository")
        elif isinstance(src, dict) and src.get("source") == "archive":
            temp = root() / f".plugin-{int(time.time() * 1000)}"
            path = _archive(src, temp)
        elif isinstance(src, dict) and src.get("source") == "npm":
            temp = root() / f".plugin-{int(time.time() * 1000)}"
            path = _npm(src, temp)
        elif isinstance(src, dict) and src.get("source") == "command":
            if not confirm:
                raise CommandError(f"This plugin runs a command on this computer to make its files: {src.get('command')}. Add it again with confirm to run it.", 409)
            path = _command(src)
        else:
            kind = src.get("source") if isinstance(src, dict) else type(src).__name__
            raise CommandError(f"FormAT does not install plugins from a {kind} source")
        got = plugins.install(path, {"kind": "marketplace", "marketplace": market, "entry": str(item["name"])})
    finally:
        if temp is not None:
            shutil.rmtree(temp, ignore_errors=True)
    _publish()
    return got


def update(name: str) -> dict:
    e = _entry(name)
    folder = Path(e["folder"])
    error = ""
    try:
        if e["kind"] == "git":
            _git("fetch", "--depth", "1", "origin", "HEAD", cwd=folder, token=e.get("token", ""))
            _git("reset", "--hard", "--quiet", "FETCH_HEAD", cwd=folder)
        _catalog(folder)
    except CommandError as exc:
        error = str(exc)
    updated = []
    if not error:
        for offer in _offers(e):
            if offer["update"] and not offer["command"]:
                try:
                    install(name, offer["name"])
                    updated.append(offer["name"])
                except CommandError as exc:
                    error = f"{offer['name']}: {exc}"
    with _lock:
        items = _registry()
        for x in items:
            if x["name"] == name:
                x["checked"], x["error"] = time.time(), error
        _write(items)
    _publish()
    return {"marketplace": _public(_entry(name)), "updated": updated}


def set_sync(name: str, on: bool) -> dict:
    with _lock:
        items = _registry()
        for x in items:
            if x["name"] == name:
                if on and x["kind"] != "git":
                    raise CommandError("Sync automatically is for a marketplace added from a repository")
                x["sync"] = bool(on)
                break
        else:
            raise CommandError(f"No marketplace {name}; marketplace.list gives them", 404)
        _write(items)
    _publish()
    return _public(_entry(name))


def remove(name: str) -> dict:
    e = _entry(name)
    gone = []
    for p in plugins.list_():
        if (p.get("origin") or {}).get("marketplace") == name:
            plugins.plugin_delete(p["name"])
            gone.append(p["name"])
    with _lock:
        _write([x for x in _registry() if x["name"] != name])
        if e["kind"] == "git":
            shutil.rmtree(e["folder"], ignore_errors=True)
    _publish()
    return {"removed": name, "plugins": gone}


def _official(e: dict) -> bool:
    return bool(re.match(r"^(anthropics/|https://github\.com/anthropics/|git@github\.com:anthropics/)", e.get("source") or ""))


def skill_offers() -> list[dict]:
    from app.engine import skills
    have = {s["name"]: s for s in skills.list_()}
    out, seen = [], set()
    for e in _registry():
        folder = Path(e["folder"])
        try:
            data = _catalog(folder)
        except CommandError:
            continue
        for item in data["plugins"]:
            if not isinstance(item, dict) or not isinstance(item.get("source"), str):
                continue
            try:
                base = _local(folder, data, item["source"])
            except CommandError:
                continue
            if base is None or not base.is_dir():
                continue
            listed = [base / str(p) for p in item.get("skills") or [] if isinstance(p, str) and ".." not in Path(p).parts]
            for sk in sorted({p.parent for p in base.glob("skills/*/SKILL.md")} | {p for p in listed if (p / "SKILL.md").is_file()}):
                key = (e["name"], sk.resolve())
                if key in seen:
                    continue
                seen.add(key)
                front, _ = skills.parse((sk / "SKILL.md").read_text(encoding="utf-8", errors="replace"))
                name = str(front.get("name") or sk.name).strip().lower()
                mine = have.get(name)
                out.append({"marketplace": e["name"], "plugin": str(item.get("name") or ""), "name": name, "description": " ".join(str(front.get("description") or "").split())[:400],
                            "path": sk.resolve().relative_to(folder.resolve()).as_posix(), "official": _official(e),
                            "installed": bool(mine) and (mine.get("source") or {}).get("marketplace") == e["name"], "taken": bool(mine) and (mine.get("source") or {}).get("marketplace") != e["name"]})
    return out


def install_skill(market: str, path: str) -> dict:
    from app.engine import skills
    e = _entry(market)
    folder = Path(e["folder"]).resolve()
    sk = (folder / path).resolve()
    if folder not in sk.parents or not (sk / "SKILL.md").is_file():
        raise CommandError(f"No skill at {path} in the {market} marketplace", 404)
    try:
        return skills.install_from(sk, {"marketplace": market, "official": _official(e)})
    except skills.SkillError as exc:
        raise CommandError(str(exc)) from None


def _sync_loop() -> None:
    while not _stop.wait(SYNC_EVERY):
        for e in _registry():
            if e.get("sync") and e["kind"] == "git":
                try:
                    update(e["name"])
                except Exception:
                    pass


def start() -> None:
    threading.Thread(target=_sync_loop, name="marketplace-sync", daemon=True).start()


@command("marketplace.list", "Plugin marketplaces", mutates=False,
         description="The marketplaces added to Format (Git repositories or folders with .claude-plugin/marketplace.json) and the plugins each offers: name, description, version, whether it is installed from there, and whether an update is waiting.")
def marketplace_list() -> dict:
    return {"marketplaces": list_()}


@command("marketplace.add", "Add a marketplace", {"source": {"type": "string", "required": True, "description": "a repository URL, owner/repo (optionally @ref) for GitHub, or a folder on this computer"},
                                                  "token": {"type": "string", "description": "a GitHub access token, for a private repository; also used for its plugins' github sources"}},
         description="Adds a plugin marketplace: Format clones the repository (or reads the folder) and lists its plugins in Discover. Nothing is installed until plugin.install. Official Anthropic marketplace names are refused unless the repository is under github.com/anthropics.")
def marketplace_add(source: str, token: str | None = None) -> dict:
    return add(source, token or "")


@command("marketplace.update", "Check for updates", {"name": {"type": "string", "required": True}},
         description="Pulls the marketplace's latest catalog and reinstalls each plugin installed from it whose version changed, keeping its on or off state and the connectors already added.")
def marketplace_update(name: str) -> dict:
    return update(name)


@command("marketplace.sync", "Sync a marketplace automatically", {"name": {"type": "string", "required": True}, "on": {"type": "boolean", "required": True}},
         description="Turns Sync automatically on or off for a marketplace added from a repository: while on, Format checks it for updates every hour while the engine runs.")
def marketplace_sync(name: str, on: bool) -> dict:
    return set_sync(name, on)


@command("marketplace.remove", "Remove a marketplace", {"name": {"type": "string", "required": True}},
         description="Removes a marketplace and uninstalls the plugins installed from it, with their skills and connectors. Not undoable.")
def marketplace_remove(name: str) -> dict:
    return remove(name)


@command("skill.discover", "Discover skills", mutates=False,
         description="Skills the added marketplaces offer (from plugins kept in the marketplace itself): name, description, marketplace, plugin, path, official (from github.com/anthropics), and whether it is installed.")
def skill_discover() -> dict:
    return {"skills": skill_offers()}


@command("skill.installFrom", "Add a skill from a marketplace", {"marketplace": {"type": "string", "required": True}, "path": {"type": "string", "required": True, "description": "the skill's path from skill.discover"}},
         description="Installs one skill from a marketplace on its own, without its plugin. It is listed under From Anthropic and partners when the marketplace is Anthropic's, otherwise From marketplaces.")
def skill_install_from(marketplace: str, path: str) -> dict:
    return install_skill(marketplace, path)


@command("plugin.install", "Add a plugin from a marketplace", {"marketplace": {"type": "string", "required": True}, "plugin": {"type": "string", "required": True},
                                                                "confirm": {"type": "boolean", "description": "true to run a command source's command (show it to the person first)"}},
         description="Installs one plugin a marketplace offers (marketplace.list): from a folder in the marketplace, by cloning a github, url or git-subdir source, by downloading an archive (https zip, sha256 checked) or an npm package (scripts not run), or by running a command source's command once confirmed. Its skills and commands become skills; its connectors are listed on the plugin to add.")
def plugin_install(marketplace: str, plugin: str, confirm: bool | None = None) -> dict:
    return install(marketplace, plugin, bool(confirm))
