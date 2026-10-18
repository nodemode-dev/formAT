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


def _git(*args: str, cwd: Path | None = None) -> str:
    if shutil.which("git") is None:
        raise CommandError("Adding a marketplace needs git on this computer")
    try:
        done = subprocess.run(["git", *args], cwd=cwd, capture_output=True, text=True, timeout=GIT_TIMEOUT, env=os.environ | {"GIT_TERMINAL_PROMPT": "0"})
    except subprocess.TimeoutExpired:
        raise CommandError(f"git {args[0]} took longer than {GIT_TIMEOUT} s") from None
    if done.returncode != 0:
        raise CommandError(f"git {args[0]} failed: {(done.stderr or done.stdout).strip().splitlines()[-1] if (done.stderr or done.stdout).strip() else done.returncode}")
    return done.stdout.strip()


def _url(source: str) -> str:
    return f"https://github.com/{source.removesuffix('.git')}.git" if SHORT.match(source) else source


def _clone(url: str, dest: Path, ref: str = "", sha: str = "") -> None:
    _git("clone", *([] if sha else ["--depth", "1"]), *(["--branch", ref] if ref and not sha else []), _url(url), str(dest))
    if sha:
        _git("checkout", "--quiet", sha, cwd=dest)


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
                    "installed": from_here, "installedVersion": mine["version"] if from_here else "", "taken": bool(mine) and not from_here,
                    "update": from_here and bool(version) and version != mine["version"]})
    return out


def _public(e: dict) -> dict:
    return {k: e.get(k) for k in ("name", "source", "kind", "sync", "added", "checked", "error", "description")} | {"plugins": _offers(e)}


def list_() -> list[dict]:
    return [_public(e) for e in _registry()]


def _publish() -> None:
    events.publish("marketplaces.changed", marketplaces=list_())


def add(source: str) -> dict:
    source = (source or "").strip()
    if not source:
        raise CommandError("Give a repository URL, owner/repo for GitHub, or a folder on this computer")
    path = Path(source).expanduser()
    with _lock:
        if path.is_dir():
            data, folder, kind = _catalog(path), path.resolve(), "path"
        elif SHORT.match(source) or re.match(r"^(https?|ssh|git|file)://|^git@", source):
            incoming = root() / f".incoming-{int(time.time() * 1000)}"
            try:
                _clone(source, incoming)
                data = _catalog(incoming)
            except CommandError:
                shutil.rmtree(incoming, ignore_errors=True)
                raise
            kind, folder = "git", None
        else:
            raise CommandError("That is not a repository URL, owner/repo, or a folder on this computer")
        name = str(data["name"]).strip().lower()
        if not NAME.match(name) or name in ("registry.json",):
            raise CommandError(f"The marketplace name {name!r} must be lowercase letters, digits, dots, hyphens and underscores")
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
        e = {"name": name, "source": source, "kind": kind, "folder": str(folder), "sync": False, "added": now, "checked": now, "error": "",
             "description": str(data.get("description") or (data.get("metadata") or {}).get("description") or "")[:300]}
        _write(items + [e])
    _publish()
    return _public(e)


def install(market: str, plugin: str) -> dict:
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
            _clone(str(src.get("repo") or src.get("url") or ""), temp, str(src.get("ref") or ""), str(src.get("sha") or ""))
            path = temp / str(src.get("path") or "") if src["source"] == "git-subdir" else temp
            if ".." in Path(str(src.get("path") or "")).parts or not path.is_dir():
                raise CommandError(f"The plugin's path {src.get('path')} is not in its repository")
        else:
            kind = src.get("source") if isinstance(src, dict) else type(src).__name__
            raise CommandError(f"Format installs plugins from a folder in the marketplace or from github, url and git-subdir sources; this one is {kind}")
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
            _git("fetch", "--depth", "1", "origin", "HEAD", cwd=folder)
            _git("reset", "--hard", "--quiet", "FETCH_HEAD", cwd=folder)
        _catalog(folder)
    except CommandError as exc:
        error = str(exc)
    updated = []
    if not error:
        for offer in _offers(e):
            if offer["update"]:
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


@command("marketplace.add", "Add a marketplace", {"source": {"type": "string", "required": True, "description": "a repository URL, owner/repo for GitHub, or a folder on this computer"}},
         description="Adds a plugin marketplace: Format clones the repository (or reads the folder) and lists its plugins in Discover. Nothing is installed until plugin.install.")
def marketplace_add(source: str) -> dict:
    return add(source)


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


@command("plugin.install", "Add a plugin from a marketplace", {"marketplace": {"type": "string", "required": True}, "plugin": {"type": "string", "required": True}},
         description="Installs one plugin a marketplace offers (marketplace.list): from a folder in the marketplace, or by cloning its github, url or git-subdir source. Its skills and commands become skills; its connectors are listed on the plugin to add.")
def plugin_install(marketplace: str, plugin: str) -> dict:
    return install(marketplace, plugin)
