import mimetypes
import os
from urllib.parse import quote

from app.engine import store, tools, uploads
from app.engine.commands import CommandError, command

LIST_CAP = 2000
READ_CAP = 1_000_000


def kind(name: str) -> str:
    low = name.lower()
    if low.endswith(".svg"):
        return "image"
    if low.endswith((".md", ".markdown")):
        return "markdown"
    if low.endswith((".html", ".htm")):
        return "html"
    k = uploads.kind_of(name, mimetypes.guess_type(name)[0] or "")
    return "code" if k == "text" else k


def _chat(cid: str) -> None:
    if store.row("SELECT id FROM conversations WHERE id = ?", (cid,)) is None:
        raise CommandError(f"No conversation {cid}; conversation.list gives the ids", 404)


@command("files.list", "Files in a chat's folder", {"conversationId": {"type": "string", "required": True}}, mutates=False,
         description="Every file in the chat's own folder (the one Claude's tools work in), as paths relative to it with size, modified time and a preview kind: image, pdf, video, audio, markdown, html, code, zip or binary. Skips .git, node_modules and similar; at most 2000 files.")
def list_(conversationId: str) -> dict:
    _chat(conversationId)
    root = tools.workspace(conversationId)
    out: list[dict] = []
    truncated = False
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = sorted(d for d in dirnames if d not in tools.SKIP_DIRS and not d.startswith("."))
        for name in sorted(filenames):
            if len(out) >= LIST_CAP:
                truncated = True
                break
            full = os.path.join(dirpath, name)
            try:
                st = os.stat(full)
            except OSError:
                continue
            rel = os.path.relpath(full, root).replace(os.sep, "/")
            out.append({"path": rel, "name": name, "size": st.st_size, "modified": st.st_mtime, "kind": kind(name),
                        "url": f"/api/chats/{conversationId}/files/{quote(rel)}"})
        if truncated:
            break
    return {"conversationId": conversationId, "files": out, "truncated": truncated}


@command("files.read", "Read a file from a chat's folder", {"conversationId": {"type": "string", "required": True}, "path": {"type": "string", "required": True}},
         mutates=False, description="The text of one file in the chat's folder, up to 1 MB (longer files are cut and marked truncated), with its kind and size. Binary files are refused; use the file's URL for those.")
def read(conversationId: str, path: str) -> dict:
    _chat(conversationId)
    try:
        full = tools.output_path(conversationId, path)
    except tools.ToolError as exc:
        raise CommandError(f"files.read: {exc}", 403) from None
    if not full.is_file():
        raise CommandError(f"files.read: no file {path}", 404)
    k = kind(full.name)
    if k not in ("code", "markdown", "html"):
        raise CommandError(f"files.read: {path} is a {k} file, not text; open its URL instead", 415)
    raw = full.read_bytes()[:READ_CAP + 1]
    text = raw[:READ_CAP].decode("utf-8", errors="replace")
    st = full.stat()
    return {"path": path, "kind": k, "size": st.st_size, "modified": st.st_mtime, "truncated": len(raw) > READ_CAP, "text": text}


def downloads_dir():
    import shutil
    import subprocess
    import sys
    from pathlib import Path
    home = Path.home()
    if sys.platform.startswith("linux") and shutil.which("xdg-user-dir"):
        try:
            out = subprocess.run(["xdg-user-dir", "DOWNLOAD"], capture_output=True, text=True, timeout=3).stdout.strip()
            if out and Path(out) != home:
                return Path(out)
        except Exception:
            pass
    return home / "Downloads"


def _filename(disposition: str, fallback: str) -> str:
    import re
    from urllib.parse import unquote
    m = re.search(r"filename\*\s*=\s*(?:UTF-8|utf-8)''([^;]+)", disposition or "")
    if m:
        name = unquote(m.group(1).strip().strip('"'))
    else:
        m = re.search(r'filename\s*=\s*"?([^";]+)"?', disposition or "")
        name = m.group(1).strip() if m else fallback
    name = os.path.basename(name.replace("\\", "/")).strip(". ") or "download"
    return name[:200]


def _reveal(path) -> None:
    import subprocess
    import sys
    try:
        if sys.platform == "darwin":
            subprocess.Popen(["open", "-R", str(path)])
        elif os.name == "nt":
            subprocess.Popen(["explorer", "/select,", str(path)])
        else:
            subprocess.Popen(["xdg-open", str(path.parent)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception:
        pass


@command("files.save_download", "Save a download to the Downloads folder",
         {"url": {"type": "string", "required": True, "description": "a path on this engine, starting /api/"},
          "reveal": {"type": "boolean", "description": "show the file in the file manager afterwards, default true"}},
         description="Saves one of the engine's own downloads (an artifact page, an export, a chat file, Download all) into the person's Downloads folder under the server's file name, numbered if taken, and returns where. The desktop app's window uses it for every download.")
def save_download(url: str, reveal: bool = True) -> dict:
    from urllib.parse import urlsplit

    import httpx

    from app.core import config
    parts = urlsplit(url)
    if parts.scheme or parts.netloc or not parts.path.startswith("/api/"):
        raise CommandError("files.save_download: give a path on this engine that starts with /api/")
    target_url = f"http://127.0.0.1:{config.PORT}{parts.path}" + (f"?{parts.query}" if parts.query else "")
    folder = downloads_dir()
    folder.mkdir(parents=True, exist_ok=True)
    try:
        with httpx.stream("GET", target_url, timeout=300) as r:
            if r.status_code != 200:
                raise CommandError(f"files.save_download: the engine answered {r.status_code} for {parts.path}", r.status_code)
            name = _filename(r.headers.get("content-disposition", ""), os.path.basename(parts.path) or "download")
            stem, ext = os.path.splitext(name)
            dest = folder / name
            n = 1
            while dest.exists():
                dest = folder / f"{stem} ({n}){ext}"
                n += 1
            with open(dest, "wb") as fh:
                for chunk in r.iter_bytes():
                    fh.write(chunk)
    except httpx.HTTPError as exc:
        raise CommandError(f"files.save_download: {exc}", 502) from None
    if reveal:
        _reveal(dest)
    return {"path": str(dest), "name": dest.name, "size": dest.stat().st_size, "folder": str(folder)}
