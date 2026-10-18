import json
import re
import shlex
import shutil
from pathlib import Path

from app.core import config
from app.engine import connectors, events, skills, uploads
from app.engine.commands import CommandError, command

NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
STATE = ".format-plugin.json"
MAX_FILES = 2000


def root() -> Path:
    p = config.data_dir() / "plugins"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _manifest(folder: Path) -> dict | None:
    for rel in (".claude-plugin/plugin.json", "plugin.json"):
        f = folder / rel
        if f.is_file():
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
            except ValueError as exc:
                raise CommandError(f"{rel} is not valid JSON: {exc}") from None
            return data if isinstance(data, dict) else None
    return None


def _find(base: Path) -> Path:
    hits = sorted({p.parent.parent if p.parent.name == ".claude-plugin" else p.parent
                   for p in list(base.rglob(".claude-plugin/plugin.json")) + list(base.rglob("plugin.json")) if "__MACOSX" not in p.parts},
                  key=lambda p: len(p.parts))
    if not hits:
        raise CommandError("No plugin here: a plugin folder has .claude-plugin/plugin.json with a name and description")
    return hits[0]


def _state(folder: Path) -> dict:
    try:
        return json.loads((folder / STATE).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {"enabled": True, "skills": [], "connectors": []}


def _save_state(folder: Path, st: dict) -> None:
    (folder / STATE).write_text(json.dumps(st, indent=1), encoding="utf-8")


def _folder(name: str) -> Path:
    p = root() / (name or "")
    if not NAME.match(name or "") or not p.is_dir():
        raise CommandError(f"No plugin {name}; plugin.list gives the names", 404)
    return p


def _author(m: dict) -> str:
    a = m.get("author")
    return str(a.get("name") or "") if isinstance(a, dict) else str(a or "")


def _server_view(st: dict, conns: dict) -> list[dict]:
    out, ids = [], dict(st.get("serverIds") or {})
    for server, spec in (st.get("servers") or {}).items():
        c = conns.get(ids.get(server, ""))
        out.append({"name": server, "kind": "url" if spec.get("url") else "command", "target": str(spec.get("url") or spec.get("command") or ""),
                    "connectorId": c["id"] if c else "", "state": "not_added" if not c else "connected" if c["enabled"] and c["status"] == "connected" else "not_connected"})
    for cid in st.get("connectors") or []:
        c = conns.get(cid)
        if c and cid not in ids.values():
            out.append({"name": c["name"], "kind": c["kind"], "target": c["url"] or c["command"], "connectorId": cid,
                        "state": "connected" if c["enabled"] and c["status"] == "connected" else "not_connected"})
    return out


def summary(folder: Path) -> dict:
    m = _manifest(folder) or {}
    st = _state(folder)
    conns = {c["id"]: c for c in connectors.list_()}
    adir = folder / "agents"
    return {"name": folder.name, "description": str(m.get("description") or "")[:1024], "version": str(m.get("version") or ""),
            "author": _author(m), "enabled": bool(st.get("enabled", True)), "skills": list(st.get("skills") or []),
            "connectors": [{"id": cid, "name": conns[cid]["name"]} for cid in st.get("connectors") or [] if cid in conns],
            "commands": int(st.get("commands") or 0), "commandSkills": list(st.get("commandSkills") or []), "servers": _server_view(st, conns),
            "agents": sorted(a.stem for a in adir.glob("*.md")) if adir.is_dir() else [],
            "hooks": (folder / "hooks" / "hooks.json").is_file() or bool(m.get("hooks")), "origin": dict(st.get("origin") or {"kind": "upload"})}


def list_() -> list[dict]:
    return [summary(p) for p in sorted(root().iterdir()) if p.is_dir() and NAME.match(p.name) and _manifest(p) is not None]


def _publish() -> None:
    events.publish("plugins.changed", plugins=list_())


def _remove_parts(folder: Path, keep_connectors: bool = False) -> None:
    st = _state(folder)
    have = {s["name"] for s in skills.list_()}
    for s in st.get("skills") or []:
        if s in have:
            skills.delete(s)
    for cid in [] if keep_connectors else st.get("connectors") or []:
        try:
            connectors.delete(cid)
        except Exception:
            pass


def _front_md(text: str, name: str, fallback: str) -> str:
    front, body = skills.parse(text)
    desc = " ".join(str(front.get("description") or "").split()) or fallback
    return f"---\nname: {name}\ndescription: {desc}\n---\n\n{body.strip()}\n"


def _servers(folder: Path, m: dict) -> dict:
    spec = m.get("mcpServers")
    if isinstance(spec, str):
        f = (folder / spec).resolve()
        spec = json.loads(f.read_text(encoding="utf-8")) if f.is_file() and folder.resolve() in f.parents else None
    if not isinstance(spec, dict) and (folder / ".mcp.json").is_file():
        spec = json.loads((folder / ".mcp.json").read_text(encoding="utf-8"))
    if isinstance(spec, dict) and isinstance(spec.get("mcpServers"), dict):
        spec = spec["mcpServers"]
    return spec if isinstance(spec, dict) else {}


def install(src: Path, origin: dict | None = None) -> dict:
    src = _find(src)
    m = _manifest(src) or {}
    name = str(m.get("name") or "").strip().lower()
    if not NAME.match(name):
        raise CommandError(f"The plugin's name {name!r} must be lowercase letters, digits and hyphens; set name in .claude-plugin/plugin.json")
    if not str(m.get("description") or "").strip():
        raise CommandError("plugin.json needs a description: it is how you and Claude know what the plugin is for")
    if sum(1 for f in src.rglob("*") if f.is_file()) > MAX_FILES:
        raise CommandError(f"A plugin holds at most {MAX_FILES} files")
    dest = root() / name
    kept = {}
    if dest.exists():
        old = _state(dest)
        kept = {"enabled": bool(old.get("enabled", True)), "connectors": list(old.get("connectors") or []), "serverIds": dict(old.get("serverIds") or {})}
        _remove_parts(dest, keep_connectors=True)
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns("__MACOSX", ".DS_Store", ".git", "node_modules"))
    st = {"enabled": True, "skills": [], "connectors": [], "commands": 0, "commandSkills": [], "servers": {}, "serverIds": {}, "origin": origin or {"kind": "upload"}} | kept
    try:
        sdir = dest / (m["skills"] if isinstance(m.get("skills"), str) else "skills")
        for sk in sorted(sdir.glob("*/SKILL.md")) if sdir.is_dir() else []:
            text = sk.read_text(encoding="utf-8", errors="replace")
            base = str(skills.parse(text)[0].get("name") or sk.parent.name).strip().lower()
            sname = (base if base.startswith(f"{name}-") or base == name else f"{name}-{base}")[:64].strip("-")
            staged = skills.root() / f".plugin-{sname}"
            if staged.exists():
                shutil.rmtree(staged)
            shutil.copytree(sk.parent, staged)
            (staged / "SKILL.md").write_text(_front_md(text, sname, f"From the {name} plugin"), encoding="utf-8")
            try:
                got = skills._install(staged, sname)
            finally:
                shutil.rmtree(staged, ignore_errors=True)
            st["skills"].append(got["name"])
        cdir = dest / "commands"
        for cmd in sorted(cdir.glob("*.md")) if cdir.is_dir() else []:
            text = cmd.read_text(encoding="utf-8", errors="replace")
            first = next((ln.strip("# ").strip() for ln in skills.parse(text)[1].splitlines() if ln.strip()), "")
            sname = f"{name}-{cmd.stem.lower()}"[:64].strip("-")
            got = skills.create_from_text(_front_md(text, sname, f"The /{cmd.stem} command from the {name} plugin: {first}"[:300]))
            st["skills"].append(got["name"])
            st["commandSkills"].append(got["name"])
            st["commands"] += 1
        for sname, spec in _servers(dest, m).items():
            if isinstance(spec, dict) and (spec.get("url") or spec.get("command")):
                st["servers"][re.sub(r"[^a-z0-9_-]", "-", str(sname).lower())[:40] or name] = spec
        if not st["enabled"]:
            for s in st["skills"]:
                skills.set_enabled(s, False)
    except Exception as exc:
        _save_state(dest, st)
        _remove_parts(dest, keep_connectors=bool(kept))
        shutil.rmtree(dest, ignore_errors=True)
        if isinstance(exc, (skills.SkillError, connectors.ConnectorError, ValueError)):
            raise CommandError(f"The plugin was not added: {exc}") from None
        raise
    _save_state(dest, st)
    skills._publish()
    _publish()
    return summary(dest)


def set_enabled(name: str, on: bool) -> dict:
    folder = _folder(name)
    st = _state(folder)
    st["enabled"] = bool(on)
    _save_state(folder, st)
    have = {s["name"] for s in skills.list_()}
    for s in st.get("skills") or []:
        if s in have:
            skills.set_enabled(s, on)
    for cid in st.get("connectors") or []:
        try:
            connectors.update(cid, enabled=on)
        except Exception:
            pass
    _publish()
    return summary(folder)


def add_connector(name: str, server: str) -> dict:
    folder = _folder(name)
    st = _state(folder)
    spec = (st.get("servers") or {}).get(server)
    if not isinstance(spec, dict):
        raise CommandError(f"The {name} plugin has no connector {server}; plugin.get lists them", 404)
    known = {c["id"]: c for c in connectors.list_()}
    if (st.get("serverIds") or {}).get(server) in known:
        return summary(folder)
    taken = {c["name"] for c in known.values()}
    cname = server if server not in taken else f"{name}-{server}"[:40]
    try:
        if spec.get("url"):
            auth = str((spec.get("headers") or {}).get("Authorization") or "")
            c = connectors.add(cname, url=str(spec["url"]), token=auth.removeprefix("Bearer ").strip())
        else:
            argv = [str(spec["command"])] + [str(a).replace("${CLAUDE_PLUGIN_ROOT}", str(folder)) for a in spec.get("args") or []]
            c = connectors.add(cname, command=shlex.join(argv), env={str(k): str(v) for k, v in (spec.get("env") or {}).items()} or None)
    except connectors.ConnectorError as exc:
        raise CommandError(f"The connector was not added: {exc}") from None
    st.setdefault("serverIds", {})[server] = c["id"]
    st.setdefault("connectors", []).append(c["id"])
    _save_state(folder, st)
    _publish()
    return summary(folder) | {"added": c["id"]}


MAX_EDIT_BYTES = 1_000_000


def files_of(name: str) -> list[dict]:
    folder = _folder(name)
    out = []
    for f in sorted(folder.rglob("*")):
        rel = f.relative_to(folder).as_posix()
        if not f.is_file() or rel == STATE or rel.startswith(".claude-plugin/") or f.stat().st_size > 200_000:
            continue
        try:
            out.append({"path": rel, "content": f.read_text(encoding="utf-8")})
        except UnicodeDecodeError:
            continue
    return out


def create(name: str, description: str, files: list | None, version: str = "") -> dict:
    import tempfile
    name = (name or "").strip().lower()
    if not NAME.match(name):
        raise CommandError("A plugin name is lowercase letters, digits and hyphens, up to 64")
    if not (description or "").strip():
        raise CommandError("Give the plugin a description: it is how you and Claude know what it is for")
    items = files or []
    if not isinstance(items, list) or any(not isinstance(f, dict) or not isinstance(f.get("path"), str) or not isinstance(f.get("content", ""), str) for f in items):
        raise CommandError("files is a list of {path, content}")
    if len(items) > 200 or sum(len(f.get("content", "")) for f in items) > MAX_EDIT_BYTES:
        raise CommandError("A plugin written here holds at most 200 files and 1 MB of text")
    with tempfile.TemporaryDirectory(prefix="format-plugin-") as tmp:
        base = Path(tmp) / name
        (base / ".claude-plugin").mkdir(parents=True)
        manifest = {"name": name, "description": description.strip(), "version": (version or "").strip() or "0.1.0"}
        old = root() / name
        if old.is_dir():
            prev = _manifest(old) or {}
            manifest = {k: v for k, v in prev.items() if k not in ("name", "description", "version")} | manifest
        (base / ".claude-plugin" / "plugin.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
        for f in items:
            rel = Path(f["path"].strip().lstrip("/"))
            if not f["path"].strip() or ".." in rel.parts or rel.parts[0] in (".claude-plugin", STATE):
                raise CommandError(f"The path {f['path']!r} must be inside the plugin and not in .claude-plugin")
            target = base / rel
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text(f.get("content", ""), encoding="utf-8")
        origin = _state(old).get("origin") if old.is_dir() else None
        return install(base, origin if isinstance(origin, dict) and origin.get("kind") == "created" else {"kind": "created"})


def owner_of_skill(skill: str) -> str:
    for p in root().iterdir():
        if p.is_dir() and skill in (_state(p).get("skills") or []):
            return p.name
    return ""


@command("plugin.list", "Plugins", mutates=False,
         description="The plugins installed in Format: each bundles skills, commands (installed as skills), MCP servers (servers, each connected, not_connected or not_added) and agents, with whether it is on and where it came from (origin: upload or marketplace).")
def plugin_list() -> dict:
    return {"plugins": list_()}


@command("plugin.get", "Open a plugin", {"name": {"type": "string", "required": True}}, mutates=False,
         description="One plugin: its description, version, author, skills, commandSkills, servers with their state, agents, hooks and origin.")
def plugin_get(name: str) -> dict:
    return summary(_folder(name))


@command("plugin.add", "Add a plugin",
         {"uploadId": {"type": "string", "description": "A .zip of the plugin folder, from POST /api/uploads"},
          "path": {"type": "string", "description": "Or a plugin folder on this computer"}},
         description="Installs a Claude plugin (a folder with .claude-plugin/plugin.json): its skills/ and commands/ become skills; its .mcp.json servers are listed on the plugin for plugin.addConnector, not added. Adding a plugin with the same name replaces it and keeps the connectors already added.")
def plugin_add(uploadId: str | None = None, path: str | None = None) -> dict:
    if bool(uploadId) == bool(path):
        raise CommandError("Pass uploadId (a .zip of the plugin) or path (a folder)")
    if path:
        src = Path(path).expanduser()
        if not src.is_dir():
            raise CommandError(f"No folder {path}", 404)
        return install(src)
    meta = uploads.get(str(uploadId))
    if meta is None:
        raise CommandError(f"No uploaded file {uploadId}", 404)
    if meta["kind"] != "zip" or not Path(meta.get("unzipped") or "").is_dir():
        raise CommandError("Add a plugin as a .zip of its folder")
    return install(Path(meta["unzipped"]))


@command("plugin.addConnector", "Add a plugin's connector", {"name": {"type": "string", "required": True}, "server": {"type": "string", "required": True, "description": "the connector's name in the plugin, from plugin.get servers"}},
         description="Adds one of a plugin's MCP servers as a connector (a plugin adds none by itself, as on claude.ai); then connector.connect connects it. Returns the plugin with added, the new connector's id.")
def plugin_add_connector(name: str, server: str) -> dict:
    return add_connector(name, server)


@command("plugin.create", "Create a plugin",
         {"name": {"type": "string", "required": True, "description": "lowercase letters, digits and hyphens"}, "description": {"type": "string", "required": True},
          "version": {"type": "string"}, "files": {"type": "array", "items": {"type": "object"}, "description": "the plugin's files as {path, content}, such as skills/<skill>/SKILL.md, commands/<name>.md or .mcp.json"}},
         description="Writes a plugin from its files and installs it (Customize, Plugins, Add, Create a plugin). Creating one with the name of an installed plugin replaces it and keeps its connectors and on or off state; plugin.files gives the files to edit.")
def plugin_create(name: str, description: str, version: str | None = None, files: list | None = None) -> dict:
    return create(name, description, files, version or "")


@command("plugin.files", "A plugin's files", {"name": {"type": "string", "required": True}}, mutates=False,
         description="The text files of an installed plugin, as {path, content}, for editing and plugin.create (plugin.json is left out; its name, description and version are on plugin.get).")
def plugin_files(name: str) -> dict:
    return {"name": name, "files": files_of(name)}


@command("plugin.enable", "Turn a plugin on or off", {"name": {"type": "string", "required": True}, "enabled": {"type": "boolean", "required": True}},
         description="Turns all of a plugin's skills and connectors on or off together.")
def plugin_enable(name: str, enabled: bool) -> dict:
    return set_enabled(name, enabled)


@command("plugin.delete", "Remove a plugin", {"name": {"type": "string", "required": True}},
         description="Removes a plugin with the skills and connectors it added. Not undoable.")
def plugin_delete(name: str) -> dict:
    folder = _folder(name)
    _remove_parts(folder)
    shutil.rmtree(folder)
    _publish()
    return {"deleted": name}
