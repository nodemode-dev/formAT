import json

from app.engine import events, store
from app.engine.commands import CommandError, command


def _parse(m: dict) -> dict:
    try:
        m["content"] = json.loads(m["content"])
    except (TypeError, ValueError):
        m["content"] = [{"type": "text", "text": str(m["content"])}]
    try:
        m["meta"] = json.loads(m.get("meta") or "{}")
    except (TypeError, ValueError):
        m["meta"] = {}
    return m


def insert(conversation_id: str, role: str, content: list[dict], meta: dict | None = None, parent_id: str | None = None) -> dict:
    mid, t = store.new_id(), store.now()
    store.run("INSERT INTO messages(id, conversation_id, parent_id, role, content, created, meta) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (mid, conversation_id, parent_id, role, json.dumps(content), t, json.dumps(meta or {})))
    store.run("UPDATE conversations SET updated = ? WHERE id = ?", (t, conversation_id))
    return _parse(store.row("SELECT * FROM messages WHERE id = ?", (mid,)) or {})


def update(mid: str, content: list[dict], meta: dict) -> dict:
    store.run("UPDATE messages SET content = ?, meta = ? WHERE id = ?", (json.dumps(content), json.dumps(meta), mid))
    return _parse(store.row("SELECT * FROM messages WHERE id = ?", (mid,)) or {})


def messages_of(conversation_id: str) -> list[dict]:
    return [_parse(m) for m in store.rows("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created", (conversation_id,))]


@command("message.add", "Add a message",
         {"conversationId": {"type": "string", "required": True}, "text": {"type": "string", "required": True},
          "role": {"type": "string", "enum": ["user", "assistant"]}, "parentId": {"type": "string"}},
         description="Appends a message to a conversation (role user by default). From v0.3.0 chat.send also asks the model for the reply.")
def add(conversationId: str, text: str, role: str | None = None, parentId: str | None = None) -> dict:
    if store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    if not text.strip():
        raise CommandError("message.add: text is empty")
    message = insert(conversationId, role or "user", [{"type": "text", "text": text}], None, parentId)
    events.publish("message.added", message=message)
    return message
