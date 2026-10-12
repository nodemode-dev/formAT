from app.engine import events, projects, store
from app.engine.commands import CommandError, command

PID = {"type": "string", "required": True, "description": "project id"}


def _do(fn, *args, **kwargs):
    try:
        return fn(*args, **kwargs)
    except projects.ProjectError as exc:
        raise CommandError(str(exc), exc.status) from None


@command("project.list", "Projects", mutates=False, description="Projects, most recently active first, with their chat and file counts and instructions.")
def list_() -> dict:
    return {"projects": projects.list_()}


@command("project.get", "Open a project", {"id": PID}, mutates=False,
         description="One project with its instructions, its knowledge files (fileList) and its chats (chatList).")
def get(id: str) -> dict:
    return _do(projects.get, id)


@command("project.create", "New project", {"name": {"type": "string", "required": True}, "description": {"type": "string"}},
         description="Creates a project. Chats started in it share its instructions and knowledge files.")
def create(name: str, description: str | None = None) -> dict:
    return _do(projects.create, name, description or "")


@command("project.update", "Change a project", {"id": PID, "name": {"type": "string"}, "description": {"type": "string"}, "instructions": {"type": "string"}},
         description="Renames a project or changes its description or its instructions (sent with every chat in it, up to 20,000 characters). Omitted fields stay.")
def update(id: str, name: str | None = None, description: str | None = None, instructions: str | None = None) -> dict:
    return _do(projects.update, id, name, description, instructions)


@command("project.delete", "Delete a project", {"id": PID},
         description="Deletes a project and its list of knowledge files. Its chats are kept and move out of the project.")
def delete(id: str) -> dict:
    moved = _do(projects.delete, id)
    for cid in moved:
        conv = store.row("SELECT * FROM conversations WHERE id = ?", (cid,))
        if conv:
            conv["pinned"] = bool(conv["pinned"])
            events.publish("conversation.updated", conversation=conv)
    return {"deleted": id, "chatsMoved": len(moved)}


@command("project.addFile", "Add a knowledge file", {"id": PID, "uploadId": {"type": "string", "required": True, "description": "a file id from POST /api/uploads"}},
         description="Adds an uploaded file to the project's knowledge, which every chat in the project receives (text inline, images and PDFs as blocks). At most 50 files.")
def add_file(id: str, uploadId: str) -> dict:
    return _do(projects.add_file, id, uploadId)


@command("project.removeFile", "Remove a knowledge file", {"id": PID, "uploadId": {"type": "string", "required": True}},
         description="Removes a file from the project's knowledge.")
def remove_file(id: str, uploadId: str) -> dict:
    return _do(projects.remove_file, id, uploadId)


@command("conversation.move", "Move a chat to a project", {"id": {"type": "string", "required": True}, "projectId": {"type": "string", "description": "omit or empty to take the chat out of its project"}},
         description="Puts a chat in a project, or takes it out; its next reply uses the project's instructions and files.")
def move(id: str, projectId: str | None = None) -> dict:
    old = store.row("SELECT project_id FROM conversations WHERE id = ?", (id,))
    if old is None:
        raise CommandError(f"No conversation {id}; conversation.list gives the ids", 404)
    if projectId:
        _do(projects.get, projectId)
    store.run("UPDATE conversations SET project_id = ? WHERE id = ?", (projectId or None, id))
    conv = store.row("SELECT * FROM conversations WHERE id = ?", (id,)) or {}
    conv["pinned"] = bool(conv.get("pinned"))
    events.publish("conversation.updated", conversation=conv)
    for pid in {old["project_id"], projectId} - {None, ""}:
        p = store.row("SELECT * FROM projects WHERE id = ?", (pid,))
        if p:
            events.publish("project.changed", project=projects.summary(p))
    return conv
