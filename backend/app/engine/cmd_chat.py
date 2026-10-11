import time

from app.engine import chat, events, store, uploads
from app.engine.cmd_message import insert, messages_of
from app.engine.commands import CommandError, command


@command("chat.send", "Send a message",
         {"text": {"type": "string", "required": True}, "conversationId": {"type": "string", "description": "omit to start a new chat"},
          "attachments": {"type": "array", "items": {"type": "string"}, "description": "file ids from POST /api/uploads"}},
         description="Stores the message (with its attachments) and starts Claude's reply, which streams as message.delta events. Returns the chat id, the user message and the reply's id; read the finished reply with conversation.get or chat.wait.")
def send(text: str, conversationId: str | None = None, attachments: list | None = None) -> dict:
    if not text.strip() and not attachments:
        raise CommandError("chat.send: text is empty")
    files = []
    for fid in attachments or []:
        meta = uploads.get(str(fid))
        if meta is None:
            raise CommandError(f"chat.send: no uploaded file {fid}", 404)
        files.append(uploads.public(meta))
    if conversationId is None:
        title = (text.strip().split("\n")[0] or (files[0]["name"] if files else "New chat"))[:60]
        cid, t = store.new_id(), store.now()
        store.run("INSERT INTO conversations(id, title, created, updated) VALUES (?, ?, ?, ?)", (cid, title, t, t))
        conv = store.row("SELECT * FROM conversations WHERE id = ?", (cid,)) or {}
        conv["pinned"] = bool(conv.get("pinned"))
        events.publish("conversation.created", conversation=conv)
        conversationId = cid
    elif store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it or wait", 409)
    content = [{"type": "text", "text": text}] if text.strip() else []
    user = insert(conversationId, "user", content, {"attachments": [f["id"] for f in files], "files": files})
    events.publish("message.added", message=user)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "message": user, "replyId": reply["id"]}


@command("chat.stop", "Stop the reply", {"conversationId": {"type": "string", "required": True}},
         description="Stops a running reply; what was written so far is kept.")
def stop(conversationId: str) -> dict:
    return {"stopped": chat.stop(conversationId)}


@command("chat.retry", "Retry the last reply", {"conversationId": {"type": "string", "required": True}},
         description="Deletes the last reply (if it is Claude's) and asks again with the same history and current settings.")
def retry(conversationId: str) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat", 409)
    msgs = messages_of(conversationId)
    if not msgs:
        raise CommandError("chat.retry: the chat is empty")
    if msgs[-1]["role"] == "assistant":
        store.run("DELETE FROM messages WHERE id = ?", (msgs[-1]["id"],))
        events.publish("message.deleted", id=msgs[-1]["id"], conversationId=conversationId)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "replyId": reply["id"]}


@command("chat.edit", "Edit the last message",
         {"conversationId": {"type": "string", "required": True}, "text": {"type": "string", "required": True}},
         description="Replaces the most recent message the person sent (keeping its attachments), removes the reply after it, and asks again.")
def edit(conversationId: str, text: str) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it first", 409)
    if not text.strip():
        raise CommandError("chat.edit: text is empty")
    msgs = messages_of(conversationId)
    last_user = next((i for i in range(len(msgs) - 1, -1, -1) if msgs[i]["role"] == "user"), None)
    if last_user is None:
        raise CommandError("chat.edit: there is no message of yours to edit")
    old = msgs[last_user]
    for m in msgs[last_user:]:
        store.run("DELETE FROM messages WHERE id = ?", (m["id"],))
        events.publish("message.deleted", id=m["id"], conversationId=conversationId)
    meta = {k: v for k, v in (old.get("meta") or {}).items() if k in ("attachments", "files")} | {"edited": True}
    user = insert(conversationId, "user", [{"type": "text", "text": text}], meta)
    events.publish("message.added", message=user)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "message": user, "replyId": reply["id"]}


@command("chat.wait", "Wait for the reply", {"conversationId": {"type": "string", "required": True}, "timeout": {"type": "number"}}, mutates=False,
         description="Waits (up to timeout seconds, default 300) for the running reply to finish and returns the last message. For agents and the CLI.")
def wait(conversationId: str, timeout: float | None = None) -> dict:
    deadline = time.time() + min(float(timeout or 300), 3600)
    while chat.running(conversationId) and time.time() < deadline:
        time.sleep(0.25)
    msgs = messages_of(conversationId)
    last = msgs[-1] if msgs else None
    text = "".join(b.get("text", "") for b in (last or {}).get("content", []) if b.get("type") == "text")
    return {"running": chat.running(conversationId), "message": last, "text": text}
