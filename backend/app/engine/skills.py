import json
import re
import shutil
from pathlib import Path

from app.core import config
from app.engine import events, store, uploads

NAME = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")
MAX_SKILL_FILE = 400_000
MAX_FILES = 400


class SkillError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def root() -> Path:
    p = config.data_dir() / "skills"
    p.mkdir(parents=True, exist_ok=True)
    return p


def parse(text: str) -> tuple[dict, str]:
    m = re.match(r"^---\s*\n(.*?)\n---\s*\n?", text, re.S)
    if not m:
        return {}, text
    front: dict = {}
    key = None
    for line in m.group(1).splitlines():
        kv = re.match(r"^([A-Za-z0-9_-]+):\s*(.*)$", line)
        if kv:
            key = kv.group(1)
            value = kv.group(2).strip()
            front[key] = "" if re.fullmatch(r"[>|][+-]?", value) else value.strip("\"'")
        elif key and line.startswith((" ", "\t")):
            front[key] = (front[key] + " " + line.strip()).strip()
    return front, text[m.end():]


def _disabled() -> set[str]:
    r = store.row("SELECT value FROM meta WHERE key = 'skills.disabled'")
    return set(json.loads(r["value"])) if r else set()


def _set_disabled(names: set[str]) -> None:
    store.run("INSERT INTO meta(key, value) VALUES ('skills.disabled', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps(sorted(names)),))


def _folder(name: str) -> Path:
    if not NAME.match(name or ""):
        raise SkillError(f"{name!r} is not a skill name; use lowercase letters, digits and hyphens, up to 64")
    p = root() / name
    if not (p / "SKILL.md").is_file():
        raise SkillError(f"No skill {name}; skill.list gives the names", 404)
    return p


def _summary(p: Path, off: set[str]) -> dict:
    front, body = parse((p / "SKILL.md").read_text(encoding="utf-8", errors="replace"))
    files = [f for f in p.rglob("*") if f.is_file()]
    from app.engine import plugins
    try:
        source = json.loads((p / ORIGIN).read_text(encoding="utf-8"))
    except (OSError, ValueError):
        source = {}
    return {"name": p.name, "description": front.get("description", "")[:1024], "enabled": p.name not in off,
            "files": len([f for f in files if f.name != ORIGIN]), "size": sum(f.stat().st_size for f in files), "modified": (p / "SKILL.md").stat().st_mtime,
            "plugin": plugins.owner_of_skill(p.name), "source": source if isinstance(source, dict) else {}}


ORIGIN = ".format-skill.json"


def install_from(src: Path, origin: dict) -> dict:
    got = _install(src, src.name)
    (root() / got["name"] / ORIGIN).write_text(json.dumps(origin), encoding="utf-8")
    _publish()
    return get(got["name"])


def list_() -> list[dict]:
    off = _disabled()
    return [_summary(p, off) for p in sorted(root().iterdir()) if p.is_dir() and NAME.match(p.name) and (p / "SKILL.md").is_file()]


def enabled() -> list[dict]:
    return [s for s in list_() if s["enabled"]]


def get(name: str) -> dict:
    p = _folder(name)
    text = (p / "SKILL.md").read_text(encoding="utf-8", errors="replace")
    files = sorted(f.relative_to(p).as_posix() for f in p.rglob("*") if f.is_file())
    return _summary(p, _disabled()) | {"skillMd": text, "fileList": files}


def _publish() -> None:
    events.publish("skills.changed", skills=list_())


def _install(src: Path, fallback: str) -> dict:
    text = (src / "SKILL.md").read_text(encoding="utf-8", errors="replace")
    front, _ = parse(text)
    name = (front.get("name") or fallback or "").strip().lower()
    if not NAME.match(name):
        raise SkillError(f"the skill's name {name!r} must be lowercase letters, digits and hyphens, up to 64; set name: in SKILL.md's frontmatter")
    if not front.get("description"):
        raise SkillError("SKILL.md needs a description: in its frontmatter; it is how Claude knows when to use the skill")
    files = [f for f in src.rglob("*") if f.is_file()]
    if len(files) > MAX_FILES:
        raise SkillError(f"a skill holds at most {MAX_FILES} files")
    dest = root() / name
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest, ignore=shutil.ignore_patterns("__MACOSX", ".DS_Store", ".git"))
    _publish()
    return get(name)


def add_upload(upload_id: str) -> dict:
    meta = uploads.get(upload_id)
    if meta is None:
        raise SkillError(f"no uploaded file {upload_id}", 404)
    if meta["kind"] == "zip":
        base = Path(meta.get("unzipped") or "")
        if not base.is_dir():
            raise SkillError("the zip could not be opened")
        found = sorted((p.parent for p in base.rglob("SKILL.md") if "__MACOSX" not in p.parts), key=lambda p: len(p.parts))
        if not found:
            raise SkillError("the zip has no SKILL.md")
        return _install(found[0], found[0].name if found[0] != base else Path(meta["name"]).stem)
    if Path(meta["name"]).name.upper() == "SKILL.MD" or meta["name"].lower().endswith(".md"):
        return create_from_text(Path(meta["path"]).read_text(encoding="utf-8", errors="replace"))
    raise SkillError("add a skill as a .zip of its folder or as its SKILL.md")


def create_from_text(text: str) -> dict:
    if len(text.encode()) > MAX_SKILL_FILE:
        raise SkillError("SKILL.md is too large")
    front, _ = parse(text)
    name = (front.get("name") or "").strip().lower()
    if not NAME.match(name):
        raise SkillError("SKILL.md needs name: in its frontmatter, lowercase letters, digits and hyphens")
    staging = root() / f".staging-{name}"
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir()
    (staging / "SKILL.md").write_text(text, encoding="utf-8")
    try:
        return _install(staging, name)
    finally:
        shutil.rmtree(staging, ignore_errors=True)


def create(name: str, description: str, body: str) -> dict:
    description = " ".join((description or "").split())
    if not description:
        raise SkillError("a skill needs a description: when should Claude use it?")
    text = f"---\nname: {name}\ndescription: {description}\n---\n\n{(body or '').strip()}\n"
    return create_from_text(text)


def set_enabled(name: str, on: bool) -> dict:
    _folder(name)
    off = _disabled()
    if on:
        off.discard(name)
    else:
        off.add(name)
    _set_disabled(off)
    _publish()
    return get(name)


def delete(name: str) -> None:
    p = _folder(name)
    shutil.rmtree(p)
    off = _disabled()
    if name in off:
        off.discard(name)
        _set_disabled(off)
    _publish()


def load(args: dict) -> tuple[str, bool]:
    name = str(args.get("name") or "").strip()
    try:
        p = _folder(name)
    except SkillError as exc:
        return str(exc), True
    if name in _disabled():
        return f"The skill {name} is turned off", True
    rel = str(args.get("file") or "").strip()
    if rel:
        target = (p / rel).resolve()
        if p.resolve() not in target.parents or not target.is_file():
            return f"No file {rel} in the skill {name}", True
        data = target.read_bytes()[:MAX_SKILL_FILE]
        return f"{name}/{rel}:\n\n" + data.decode("utf-8", errors="replace"), False
    files = sorted(f.relative_to(p).as_posix() for f in p.rglob("*") if f.is_file() and f.name != "SKILL.md")
    text = (p / "SKILL.md").read_text(encoding="utf-8", errors="replace")
    more = ("\n\nFiles in this skill (read one with the skill tool and file):\n" + "\n".join(f"- {f}" for f in files[:200])) if files else ""
    return f"Skill {name}, SKILL.md:\n\n{text}{more}", False


def read_file(name: str, rel: str) -> dict:
    p = _folder(name)
    target = (p / (rel or "")).resolve()
    if p.resolve() not in target.parents or not target.is_file():
        raise SkillError(f"No file {rel!r} in the skill {name}", 404)
    data = target.read_bytes()
    if b"\x00" in data[:8192]:
        return {"name": name, "path": rel, "size": len(data), "text": f"{rel} is a binary file ({len(data)} bytes) and is not shown here.", "binary": True}
    return {"name": name, "path": rel, "size": len(data), "text": data[:MAX_SKILL_FILE].decode("utf-8", errors="replace"), "binary": False}


INVOKE = re.compile(r"(?:^|(?<=[\s(]))/([a-z0-9][a-z0-9-]{0,63}(?::[a-z0-9][a-z0-9-]{0,63})?)(?=$|[\s.,;:!?)])"
                    r"|\b(?:use|run|load|apply|with)\s+(?:the\s+)?/?([a-z0-9][a-z0-9-]{0,63}(?::[a-z0-9][a-z0-9-]{0,63})?)\s+skill\b", re.I)


def _plain(name: str) -> str:
    plugin, _, short = name.partition(":")
    if not short:
        return name
    return short if short.startswith(f"{plugin}-") else f"{plugin}-{short}"


def enabled_names() -> list[str]:
    off = _disabled()
    return [p.name for p in sorted(root().iterdir()) if p.is_dir() and NAME.match(p.name) and p.name not in off and (p / "SKILL.md").is_file()]


def invoked(text: str, names: list[str] | None = None) -> list[str]:
    known = set(enabled_names() if names is None else names)
    found: list[str] = []
    for m in INVOKE.finditer(text or ""):
        name = _plain((m.group(1) or m.group(2) or "").lower())
        if name in known and name not in found:
            found.append(name)
    return found


def invocation_blocks(text: str, names: list[str] | None = None, with_folder: bool = False) -> list[dict]:
    blocks = []
    for name in invoked(text, names):
        p = root() / name
        if with_folder:
            body = f"Its folder is {p}; read the other files it names there with your tools.\n\n" + (p / "SKILL.md").read_text(encoding="utf-8", errors="replace")[:MAX_SKILL_FILE]
        else:
            body, failed = load({"name": name})
            if failed:
                continue
        blocks.append({"type": "text", "text": f"The person invoked the skill {name} for this message: follow it.\n\n{body}"})
    return blocks
