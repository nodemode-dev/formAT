from app.engine import artifacts
from app.engine.commands import CommandError, command


@command("artifact.list", "Artifacts", {"conversationId": {"type": "string", "description": "omit for every chat"}}, mutates=False,
         description="Artifacts Claude published, newest first, in one chat or all chats, with their title, chat, version count and latest version.")
def list_(conversationId: str | None = None) -> dict:
    return {"artifacts": artifacts.list_(conversationId)}


@command("artifact.get", "Open an artifact", {"id": {"type": "string", "required": True}, "version": {"type": "integer", "description": "omit for the latest"}}, mutates=False,
         description="One artifact with its versions and the source of one version (the latest unless version is given), plus the URL the window shows it from.")
def get(id: str, version: int | None = None) -> dict:
    a = artifacts.get(id)
    if a is None:
        raise CommandError(f"No artifact {id}; artifact.list gives the ids", 404)
    v = artifacts.version(id, version)
    if v is None:
        raise CommandError(f"Artifact {id} has no version {version}", 404)
    return a | {"version": v["version"], "messageId": v["message_id"], "content": v["content"], "versionsList": artifacts.versions(id),
                "url": f"/api/artifacts/{id}/v/{v['version']}"}


@command("artifact.delete", "Delete an artifact", {"id": {"type": "string", "required": True}},
         description="Deletes an artifact and all its versions. Not undoable.")
def delete(id: str) -> dict:
    if not artifacts.delete(id):
        raise CommandError(f"No artifact {id}", 404)
    return {"deleted": id}
