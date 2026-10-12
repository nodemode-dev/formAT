from app.engine import memory, store
from app.engine.commands import CommandError, command

SCOPE = {"type": "string", "description": "a project id for that project's memory; omit for the general memory every chat outside a project shares"}


def _base(projectId: str | None):
    if projectId and store.row("SELECT id FROM projects WHERE id = ?", (projectId,)) is None:
        raise CommandError(f"No project {projectId}; project.list gives the ids", 404)
    return memory.root(projectId or None)


def _do(base, args: dict) -> str:
    text, is_error = memory.handle(args, base)
    if is_error:
        raise CommandError(f"memory: {text}", 404 if "does not exist" in text else 400)
    return text


@command("memory.list", "Memory", {"projectId": SCOPE}, mutates=False,
         description="The files in Claude's memory (the memory tool's /memories folder), general or for one project, with size and modified time.")
def list_(projectId: str | None = None) -> dict:
    return {"projectId": projectId or None, "files": memory.files(_base(projectId))}


@command("memory.read", "Read a memory file", {"path": {"type": "string", "required": True, "description": "a /memories/... path"}, "projectId": SCOPE}, mutates=False,
         description="The text of one memory file.")
def read(path: str, projectId: str | None = None) -> dict:
    base = _base(projectId)
    try:
        target = memory.resolve(base, path)
    except memory.MemoryError_ as exc:
        raise CommandError(f"memory.read: {exc}") from None
    if not target.is_file():
        raise CommandError(f"memory.read: no file {path}", 404)
    return {"path": path, "text": target.read_text(encoding="utf-8", errors="replace")}


@command("memory.write", "Write a memory file", {"path": {"type": "string", "required": True}, "text": {"type": "string", "required": True}, "projectId": SCOPE},
         description="Creates or replaces one memory file; Claude reads it the next time it checks its memory.")
def write(path: str, text: str, projectId: str | None = None) -> dict:
    base = _base(projectId)
    try:
        target = memory.resolve(base, path)
    except memory.MemoryError_ as exc:
        raise CommandError(f"memory.write: {exc}") from None
    if target.is_dir() or target == base.resolve():
        raise CommandError(f"memory.write: {path} is a folder")
    _do(base, {"command": "create", "path": path, "file_text": text})
    return {"path": path, "size": len(text.encode())}


@command("memory.delete", "Delete a memory file", {"path": {"type": "string", "required": True}, "projectId": SCOPE},
         description="Deletes one memory file or folder. Not undoable.")
def delete(path: str, projectId: str | None = None) -> dict:
    _do(_base(projectId), {"command": "delete", "path": path})
    return {"deleted": path}
