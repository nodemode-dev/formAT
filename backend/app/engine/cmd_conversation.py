import json
import logging
import threading

from app.engine import events, store
from app.engine.commands import CommandError, command

log = logging.getLogger("format.conversation")
ID ={"type": "string", "required": True, "description": "conversation id"}


def _get(cid: str) -> dict:
    found = store.row("SELECT * FROM conversations WHERE id = ?", (cid,))
    if found is None:
        raise CommandError(f"No conversation {cid}; conversation.list gives the ids", 404)
    found["pinned"] = bool(found["pinned"])
    return found


@command("conversation.create", "New chat", {"title": {"type": "string"}, "projectId": {"type": "string"}},
         description="Creates an empty conversation and returns it with its id.")
def create(title: str | None = None, projectId: str | None = None) -> dict:
    cid, t = store.new_id(), store.now()
    store.run("INSERT INTO conversations(id, title, project_id, created, updated) VALUES (?, ?, ?, ?, ?)",
              (cid, (title or "New chat").strip() or "New chat", projectId, t, t))
    conv = _get(cid)
    events.publish("conversation.created", conversation=conv)
    return conv


@command("conversation.list", "Chats", {"query": {"type": "string"}, "limit": {"type": "integer"}}, mutates=False,
         description="Lists conversations, pinned first, then most recently updated; query matches the title or the text of any message.")
def list_(query: str | None = None, limit: int | None = None) -> dict:
    sql, args = "SELECT * FROM conversations", ()
    if query:
        like = f"%{query}%"
        sql += " WHERE title LIKE ? OR id IN (SELECT conversation_id FROM messages WHERE content LIKE ?)"
        args = (like, like)
    sql += " ORDER BY pinned DESC, updated DESC LIMIT ?"
    items = store.rows(sql, args + (max(1, min(int(limit or 200), 1000)),))
    for c in items:
        c["pinned"] = bool(c["pinned"])
    return {"conversations": items, "count": len(items)}


@command("conversation.get", "Open chat", {"id": ID}, mutates=False, description="One conversation and its messages in order.")
def get(id: str) -> dict:
    conv = _get(id)
    from app.engine.cmd_message import messages_of
    conv["messages"] = messages_of(id)
    return conv


@command("conversation.rename", "Rename chat", {"id": ID, "title": {"type": "string", "required": True}})
def rename(id: str, title: str) -> dict:
    _get(id)
    if not title.strip():
        raise CommandError("conversation.rename: title is empty")
    store.run("UPDATE conversations SET title = ?, updated = ? WHERE id = ?", (title.strip(), store.now(), id))
    conv = _get(id)
    events.publish("conversation.updated", conversation=conv)
    return conv


@command("conversation.pin", "Pin chat", {"id": ID, "pinned": {"type": "boolean", "required": True}})
def pin(id: str, pinned: bool) -> dict:
    _get(id)
    store.run("UPDATE conversations SET pinned = ? WHERE id = ?", (1 if pinned else 0, id))
    conv = _get(id)
    events.publish("conversation.updated", conversation=conv)
    return conv


@command("conversation.delete", "Delete chat", {"id": ID},
         description="Deletes a conversation and its messages, and removes its attachments from the Anthropic Files API where they were uploaded. Not undoable.")
def delete(id: str) -> dict:
    _get(id)
    fids = set()
    for r in store.rows("SELECT meta FROM messages WHERE conversation_id = ?", (id,)):
        try:
            fids.update((json.loads(r["meta"] or "{}") or {}).get("attachments") or [])
        except (TypeError, ValueError):
            continue
    store.run("DELETE FROM conversations WHERE id = ?", (id,))
    events.publish("conversation.deleted", id=id)
    if fids:
        threading.Thread(target=_forget_remote, args=(sorted(fids),), name="files-cleanup", daemon=True).start()
    return {"deleted": id}


def _forget_remote(fids: list[str]) -> None:
    from app import providers
    from app.engine import uploads
    provider = providers.get("anthropic")
    for fid in fids:
        meta = uploads.get(fid)
        remote = (meta or {}).get("remote") or {}
        if not remote.get("id") or remote.get("key") != provider.key_tag():
            continue
        try:
            provider.delete_file(remote["id"])
            uploads.remember_remote(fid, None)
        except providers.ProviderError as exc:
            log.warning("could not delete remote file %s: %s", remote["id"], exc)
