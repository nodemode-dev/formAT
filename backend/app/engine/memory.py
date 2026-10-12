import re
import shutil
from pathlib import Path

from app.core import config
from app.engine import events, store

PREFIX = "/memories"
MAX_FILE = 200_000
MAX_TREE = 2000


class MemoryError_(Exception):
    pass


def root(project_id: str | None = None) -> Path:
    base = config.data_dir() / "memory"
    p = base / "projects" / Path(project_id).name if project_id else base / "general"
    p.mkdir(parents=True, exist_ok=True)
    return p


def scope_of(conversation_id: str) -> str | None:
    c = store.row("SELECT project_id FROM conversations WHERE id = ?", (conversation_id,))
    pid = (c or {}).get("project_id")
    return pid if pid and store.row("SELECT id FROM projects WHERE id = ?", (pid,)) else None


def resolve(base: Path, path: str) -> Path:
    if not isinstance(path, str) or not path.strip():
        raise MemoryError_("Error: path is required")
    if re.search(r"%2e|%2f|%5c", path, re.I) or "\\" in path:
        raise MemoryError_(f"Error: The path {path} is not allowed")
    if path != PREFIX and not path.startswith(PREFIX + "/"):
        raise MemoryError_(f"Error: The path {path} must be under {PREFIX}")
    rel = path[len(PREFIX):].lstrip("/")
    target = (base / rel).resolve()
    b = base.resolve()
    if target != b and b not in target.parents:
        raise MemoryError_(f"Error: The path {path} is outside {PREFIX}")
    return target


def _virtual(base: Path, p: Path) -> str:
    rel = p.resolve().relative_to(base.resolve()).as_posix()
    return PREFIX + ("/" + rel if rel and rel != "." else "")


def _size(n: int) -> str:
    return f"{n}" if n < 1024 else f"{n / 1024:.1f}K" if n < 1024 * 1024 else f"{n / 1024 / 1024:.1f}M"


def _numbered(text: str, start: int = 1) -> str:
    return "\n".join(f"{i:>6}\t{line}" for i, line in enumerate(text.split("\n"), start))


def handle(args: dict, base: Path) -> tuple[str, bool]:
    try:
        return _handle(args, base), False
    except MemoryError_ as exc:
        return str(exc), True


def _handle(args: dict, base: Path) -> str:
    cmd = args.get("command")
    if cmd == "view":
        path = args.get("path") or PREFIX
        target = resolve(base, path)
        if not target.exists():
            raise MemoryError_(f"The path {path} does not exist. Please provide a valid path.")
        if target.is_dir():
            lines = [f"{_size(_dir_size(target))}\t{path}"]
            for p in sorted(target.rglob("*")):
                depth = len(p.relative_to(target).parts)
                if depth > 2 or any(part.startswith(".") or part == "node_modules" for part in p.relative_to(target).parts):
                    continue
                lines.append(f"{_size(_dir_size(p) if p.is_dir() else p.stat().st_size)}\t{_virtual(base, p)}")
                if len(lines) > MAX_TREE:
                    break
            return f"Here're the files and directories up to 2 levels deep in {path}, excluding hidden items and node_modules:\n" + "\n".join(lines)
        text = target.read_text(encoding="utf-8", errors="replace")
        lines = text.split("\n")
        if len(lines) > 999_999:
            raise MemoryError_(f"File {path} exceeds maximum line limit of 999,999 lines.")
        rng = args.get("view_range")
        start = 1
        if isinstance(rng, list) and len(rng) == 2:
            start = max(1, int(rng[0]))
            end = len(lines) if int(rng[1]) == -1 else int(rng[1])
            lines = lines[start - 1:end]
        return f"Here's the content of {path} with line numbers:\n" + _numbered("\n".join(lines), start)
    if cmd == "create":
        path = args.get("path", "")
        target = resolve(base, path)
        text = str(args.get("file_text") or "")
        if len(text.encode()) > MAX_FILE:
            raise MemoryError_(f"Error: a memory file is limited to {MAX_FILE // 1000} KB")
        if target.is_dir():
            raise MemoryError_(f"Error: {path} is a directory")
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(text, encoding="utf-8")
        _changed(base)
        return f"File created successfully at: {path}"
    if cmd == "str_replace":
        path = args.get("path", "")
        target = resolve(base, path)
        if not target.is_file():
            raise MemoryError_(f"Error: The path {path} does not exist. Please provide a valid path.")
        text = target.read_text(encoding="utf-8")
        old, new = str(args.get("old_str") or ""), str(args.get("new_str") or "")
        count = text.count(old) if old else 0
        if count == 0:
            raise MemoryError_(f"No replacement was performed, old_str `{old}` did not appear verbatim in {path}.")
        if count > 1:
            lines = [str(i) for i, line in enumerate(text.split("\n"), 1) if old.split("\n")[0] in line]
            raise MemoryError_(f"No replacement was performed. Multiple occurrences of old_str `{old}` in lines: {', '.join(lines)}. Please ensure it is unique")
        out = text.replace(old, new, 1)
        target.write_text(out, encoding="utf-8")
        _changed(base)
        at = out[:out.find(new) if new else text.find(old)].count("\n")
        snippet = out.split("\n")[max(0, at - 2):at + 3 + new.count("\n")]
        return "The memory file has been edited.\n" + _numbered("\n".join(snippet), max(1, at - 1))
    if cmd == "insert":
        path = args.get("path", "")
        target = resolve(base, path)
        if not target.is_file():
            raise MemoryError_(f"Error: The path {path} does not exist")
        lines = target.read_text(encoding="utf-8").split("\n")
        try:
            at = int(args.get("insert_line"))
        except (TypeError, ValueError):
            at = -1
        if not 0 <= at <= len(lines):
            raise MemoryError_(f"Error: Invalid `insert_line` parameter: {args.get('insert_line')}. It should be within the range of lines of the file: [0, {len(lines)}]")
        lines[at:at] = str(args.get("insert_text") or "").split("\n")
        target.write_text("\n".join(lines), encoding="utf-8")
        _changed(base)
        return f"The file {path} has been edited."
    if cmd == "delete":
        path = args.get("path", "")
        target = resolve(base, path)
        if target == base.resolve():
            raise MemoryError_(f"Error: {PREFIX} itself cannot be deleted")
        if not target.exists():
            raise MemoryError_(f"Error: The path {path} does not exist")
        shutil.rmtree(target) if target.is_dir() else target.unlink()
        _changed(base)
        return f"Successfully deleted {path}"
    if cmd == "rename":
        old_path, new_path = args.get("old_path", ""), args.get("new_path", "")
        src, dst = resolve(base, old_path), resolve(base, new_path)
        if src == base.resolve() or dst == base.resolve():
            raise MemoryError_(f"Error: {PREFIX} itself cannot be renamed")
        if not src.exists():
            raise MemoryError_(f"Error: The path {old_path} does not exist")
        if dst.exists():
            raise MemoryError_(f"Error: The destination {new_path} already exists")
        dst.parent.mkdir(parents=True, exist_ok=True)
        src.rename(dst)
        _changed(base)
        return f"Successfully renamed {old_path} to {new_path}"
    raise MemoryError_(f"Error: unknown command {cmd}; use view, create, str_replace, insert, delete or rename")


def _dir_size(p: Path) -> int:
    return sum(f.stat().st_size for f in p.rglob("*") if f.is_file()) if p.is_dir() else p.stat().st_size


def _changed(base: Path) -> None:
    events.publish("memory.changed", scope=base.name if base.parent.name == "projects" else None)


def files(base: Path) -> list[dict]:
    out = []
    for p in sorted(base.rglob("*")):
        if p.is_file() and not any(part.startswith(".") for part in p.relative_to(base).parts):
            st = p.stat()
            out.append({"path": _virtual(base, p), "size": st.st_size, "modified": st.st_mtime})
    return out
