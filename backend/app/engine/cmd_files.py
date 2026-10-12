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
