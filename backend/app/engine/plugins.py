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


def summary(folder: Path) -> dict:
    m = _manifest(folder) or {}
    st = _state(folder)
    conns = {c["id"]: c for c in connectors.list_()}
    return {"name": folder.name, "description": str(m.get("description") or "")[:1024], "version": str(m.get("version") or ""),
            "author": _author(m), "enabled": bool(st.get("enabled", True)), "skills": list(st.get("skills") or []),
            "connectors": [{"id": cid, "name": conns[cid]["name"]} for cid in st.get("connectors") or [] if cid in conns],
            "commands": int(st.get("commands") or 0)}


def list_() -> list[dict]:
    return [summary(p) for p in sorted(root().iterdir()) if p.is_dir() and NAME.match(p.name) and _manifest(p) is not None]


def _publish() -> None:
    events.publish("plugins.changed", plugins=list_())


def _remove_parts(folder: Path) -> None:
    st = _state(folder)
    have = {s["name"] for s in skills.list_()}
    for s in st.get("skills") or []:
        if s in have:
            skills.delete(s)
    for cid in st.get("connectors") or []:
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


def install(src: Path) -> dict:
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
    if dest.exists():
        _remove_parts(dest)
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns("__MACOSX", ".DS_Store", ".git", "node_modules"))
    st = {"enabled": True, "skills": [], "connectors": [], "commands": 0}
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
            st["commands"] += 1
        taken = {c["name"] for c in connectors.list_()}
        for sname, spec in _servers(dest, m).items():
            if not isinstance(spec, dict):
                continue
            cname = re.sub(r"[^a-z0-9_-]", "-", str(sname).lower())[:40] or name
            if cname in taken:
                cname = f"{name}-{cname}"[:40]
            env = {str(k): str(v) for k, v in (spec.get("env") or {}).items()}
            if spec.get("url"):
                auth = str((spec.get("headers") or {}).get("Authorization") or "")
                c = connectors.add(cname, url=str(spec["url"]), token=auth.removeprefix("Bearer ").strip())
            elif spec.get("command"):
                argv = [str(spec["command"])] + [str(a).replace("${CLAUDE_PLUGIN_ROOT}", str(dest)) for a in spec.get("args") or []]
                c = connectors.add(cname, command=shlex.join(argv), env=env or None)
            else:
                continue
            taken.add(cname)
            st["connectors"].append(c["id"])
    except Exception as exc:
        _save_state(dest, st)
        _remove_parts(dest)
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


def owner_of_skill(skill: str) -> str:
    for p in root().iterdir():
        if p.is_dir() and skill in (_state(p).get("skills") or []):
            return p.name
    return ""


@command("plugin.list", "Plugins", mutates=False,
         description="The plugins installed in Format: each bundles skills, commands (installed as skills) and MCP servers (installed as connectors), with whether it is on.")
def plugin_list() -> dict:
    return {"plugins": list_()}


@command("plugin.get", "Open a plugin", {"name": {"type": "string", "required": True}}, mutates=False,
         description="One plugin: its description, version, author and the skills and connectors it added.")
def plugin_get(name: str) -> dict:
    return summary(_folder(name))


@command("plugin.add", "Add a plugin",
         {"uploadId": {"type": "string", "description": "A .zip of the plugin folder, from POST /api/uploads"},
          "path": {"type": "string", "description": "Or a plugin folder on this computer"}},
         description="Installs a Claude plugin (a folder with .claude-plugin/plugin.json): its skills/ and commands/ become skills and its .mcp.json servers become connectors. Adding a plugin with the same name replaces it.")
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
