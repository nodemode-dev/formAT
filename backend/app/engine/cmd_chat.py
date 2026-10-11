import time

from app.engine import chat, events, store, uploads
from app.engine.cmd_message import ROOT, deepest, insert, messages_of, set_leaf
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
        set_leaf(conversationId, msgs[-1]["parent_id"])
        events.publish("message.deleted", id=msgs[-1]["id"], conversationId=conversationId)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "replyId": reply["id"]}


def _publish_path(conversationId: str) -> list[dict]:
    msgs = messages_of(conversationId)
    events.publish("conversation.path", conversationId=conversationId, messages=msgs)
    return msgs


@command("chat.edit", "Edit a message",
         {"conversationId": {"type": "string", "required": True}, "text": {"type": "string", "required": True},
          "messageId": {"type": "string", "description": "one of the person's messages on the current path; omit for the most recent"}},
         description="Adds the edited text as a new version of one of the person's messages (keeping its attachments) and asks again from there. The earlier version and everything after it stay as a branch; chat.branch switches between versions.")
def edit(conversationId: str, text: str, messageId: str | None = None) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it first", 409)
    if not text.strip():
        raise CommandError("chat.edit: text is empty")
    msgs = messages_of(conversationId)
    users = [m for m in msgs if m["role"] == "user"]
    old = next((m for m in users if m["id"] == messageId), None) if messageId else (users[-1] if users else None)
    if old is None:
        raise CommandError("chat.edit: no message of yours with that id on the current path" if messageId else "chat.edit: there is no message of yours to edit", 404 if messageId else 400)
    meta = {k: v for k, v in (old.get("meta") or {}).items() if k in ("attachments", "files")} | {"edited": True}
    user = insert(conversationId, "user", [{"type": "text", "text": text}], meta, old["parent_id"] if old["parent_id"] else ROOT)
    _publish_path(conversationId)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "message": user, "replyId": reply["id"]}


@command("chat.branch", "Show another version",
         {"conversationId": {"type": "string", "required": True}, "messageId": {"type": "string", "required": True, "description": "a version from a message's branch ids"}},
         description="Switches the chat to another version of an edited message and the newest conversation that follows it. Returns the messages on the new path.")
def branch(conversationId: str, messageId: str) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it first", 409)
    if store.row("SELECT id FROM messages WHERE id = ? AND conversation_id = ?", (messageId, conversationId)) is None:
        raise CommandError(f"chat.branch: no message {messageId} in this chat", 404)
    set_leaf(conversationId, deepest(conversationId, messageId))
    return {"conversationId": conversationId, "messages": _publish_path(conversationId)}


@command("chat.compact", "Summarize earlier messages", {"conversationId": {"type": "string", "required": True}},
         description="Asks Claude to summarize the chat so far (the API's compaction). The summary is kept as a message on the path and later turns start from it instead of the full history; the earlier messages stay visible. Runs like a reply: chat.wait waits for it. Also runs on its own after a reply once the chat passes compactAt of the context window, unless autoCompact is off.")
def compact(conversationId: str) -> dict:
    if store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    msgs = messages_of(conversationId)
    if not any(m["role"] == "assistant" and m["content"] and not (m.get("meta") or {}).get("compaction") for m in msgs):
        raise CommandError("chat.compact: there is nothing to summarize yet")
    if msgs and (msgs[-1].get("meta") or {}).get("compaction") and msgs[-1]["content"]:
        raise CommandError("chat.compact: the chat was just summarized")
    try:
        chat.start_compaction(conversationId)
    except RuntimeError as exc:
        raise CommandError(str(exc), 409) from None
    return {"conversationId": conversationId, "started": True}


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
