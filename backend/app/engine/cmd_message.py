import json

from app.engine import events, store
from app.engine.commands import CommandError, command


def _parse(m: dict) -> dict:
    try:
        m["content"] = json.loads(m["content"])
    except (TypeError, ValueError):
        m["content"] = [{"type": "text", "text": str(m["content"])}]
    return m


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
    mid, t = store.new_id(), store.now()
    content = json.dumps([{"type": "text", "text": text}])
    store.run("INSERT INTO messages(id, conversation_id, parent_id, role, content, created) VALUES (?, ?, ?, ?, ?, ?)",
              (mid, conversationId, parentId, role or "user", content, t))
    store.run("UPDATE conversations SET updated = ? WHERE id = ?", (t, conversationId))
    message = _parse(store.row("SELECT * FROM messages WHERE id = ?", (mid,)) or {})
    events.publish("message.added", message=message)
    return message
