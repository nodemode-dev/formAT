import base64
from pathlib import Path

from app.engine import uploads

TEXT_LIMIT = 200_000
ZIP_TEXT_LIMIT = 400_000
ZIP_FILE_LIMIT = 60_000
SKIP_DIRS = {".git", "node_modules", "__pycache__", "venv", ".venv", "dist", "build", "target"}


def _read_text(path: Path, limit: int) -> tuple[str, bool]:
    raw = path.read_bytes()[: limit + 1]
    text = raw.decode("utf-8", errors="replace")
    return text[:limit], len(raw) > limit


def _fence(name: str, text: str) -> str:
    ticks = "````" if "```" in text else "```"
    return f"{ticks}{name}\n{text}\n{ticks}"


def _zip_blocks(meta: dict) -> list[dict]:
    dest = meta.get("unzipped")
    if not dest:
        return [{"type": "text", "text": f"[Attached zip {meta['name']} could not be opened: {meta.get('error', 'unknown error')}]"}]
    root = Path(dest)
    files = sorted(p for p in root.rglob("*") if p.is_file() and not (set(p.relative_to(root).parts) & SKIP_DIRS))
    tree = "\n".join(str(p.relative_to(root)) for p in files[:1500])
    parts = [f"Attached zip {meta['name']}: {meta.get('entries', len(files))} files, unpacked in the workspace at {dest}.\n\nFile list:\n{tree}"]
    budget = ZIP_TEXT_LIMIT
    for p in files:
        if budget <= 0:
            parts.append("[More files are in the workspace folder; the inline budget is used up.]")
            break
        if uploads.kind_of(p.name, "") != "text":
            continue
        text, cut = _read_text(p, min(ZIP_FILE_LIMIT, budget))
        budget -= len(text)
        parts.append(_fence(str(p.relative_to(root)), text) + ("\n[truncated]" if cut else ""))
    return [{"type": "text", "text": "\n\n".join(parts)}]


def blocks_for(file_id: str, model: dict, accepts) -> list[dict]:
    meta = uploads.get(file_id)
    if meta is None:
        return [{"type": "text", "text": f"[Attachment {file_id} is no longer available]"}]
    path, kind, name = Path(meta["path"]), meta["kind"], meta["name"]
    if kind == "image" and accepts(model, "image"):
        data = base64.standard_b64encode(path.read_bytes()).decode()
        return [{"type": "image", "source": {"type": "base64", "media_type": meta["mime"], "data": data}}]
    if kind == "pdf" and accepts(model, "pdf"):
        data = base64.standard_b64encode(path.read_bytes()).decode()
        return [{"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": data}, "title": name}]
    if kind == "text":
        text, cut = _read_text(path, TEXT_LIMIT)
        return [{"type": "text", "text": f"Attached file {name}:\n\n" + _fence(name, text) + ("\n[truncated]" if cut else "")}]
    if kind == "zip":
        return _zip_blocks(meta)
    return [{"type": "text", "text": f"[Attached {kind} file {name} ({meta['size']} bytes), saved in the workspace at {path}. Its contents are not sent inline.]"}]
