import json
import mimetypes
import shutil
import uuid
import zipfile
from pathlib import Path

from app.core import config

TEXT_EXT = {".txt", ".md", ".csv", ".tsv", ".json", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".ts", ".tsx", ".jsx",
            ".py", ".rs", ".go", ".java", ".kt", ".swift", ".c", ".h", ".cpp", ".hpp", ".cs", ".rb", ".php", ".sh", ".bat", ".sql", ".ini",
            ".cfg", ".env.example", ".gitignore", ".svg", ".lua", ".r", ".dart", ".scala", ".vue", ".svelte", ".log"}
IMAGE_MIME = {"image/png", "image/jpeg", "image/gif", "image/webp"}
MAX_ZIP_FILES = 4000


def root() -> Path:
    p = config.workspace_dir() / "uploads"
    p.mkdir(parents=True, exist_ok=True)
    return p


def kind_of(name: str, mime: str) -> str:
    low = name.lower()
    if mime in IMAGE_MIME:
        return "image"
    if mime == "application/pdf" or low.endswith(".pdf"):
        return "pdf"
    if low.endswith((".zip", ".plugin")):
        return "zip"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("text/") or any(low.endswith(e) for e in TEXT_EXT):
        return "text"
    return "binary"


def save(name: str, data: bytes, mime: str | None) -> dict:
    fid = uuid.uuid4().hex[:16]
    safe = Path(name).name.replace("\x00", "") or "file"
    folder = root() / fid
    folder.mkdir(parents=True)
    path = folder / safe
    path.write_bytes(data)
    mime = mime or mimetypes.guess_type(safe)[0] or "application/octet-stream"
    meta = {"id": fid, "name": safe, "mime": mime, "size": len(data), "kind": kind_of(safe, mime), "path": str(path)}
    if meta["kind"] == "zip":
        meta.update(_unzip(path, folder / "unzipped"))
    (folder / "meta.json").write_text(json.dumps(meta), encoding="utf-8")
    return meta


def _unzip(path: Path, dest: Path) -> dict:
    try:
        with zipfile.ZipFile(path) as zf:
            infos = [i for i in zf.infolist() if not i.is_dir()][:MAX_ZIP_FILES]
            dest.mkdir(parents=True, exist_ok=True)
            base = dest.resolve()
            for info in infos:
                target = (dest / info.filename).resolve()
                if not str(target).startswith(str(base)):
                    continue
                target.parent.mkdir(parents=True, exist_ok=True)
                with zf.open(info) as src, open(target, "wb") as out:
                    shutil.copyfileobj(src, out)
        return {"unzipped": str(dest), "entries": len(infos)}
    except zipfile.BadZipFile:
        return {"unzipped": None, "entries": 0, "error": "not a readable zip"}


def get(fid: str) -> dict | None:
    meta = root() / Path(fid).name / "meta.json"
    if not meta.is_file():
        return None
    return json.loads(meta.read_text(encoding="utf-8"))


def remember_remote(fid: str, remote: dict | None) -> None:
    path = root() / Path(fid).name / "meta.json"
    if not path.is_file():
        return
    meta = json.loads(path.read_text(encoding="utf-8"))
    if remote is None:
        meta.pop("remote", None)
    else:
        meta["remote"] = remote
    path.write_text(json.dumps(meta), encoding="utf-8")


def public(meta: dict) -> dict:
    return {k: meta[k] for k in ("id", "name", "mime", "size", "kind") if k in meta} | ({"entries": meta["entries"]} if "entries" in meta else {})
