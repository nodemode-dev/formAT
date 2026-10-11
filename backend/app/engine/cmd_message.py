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


ROOT = object()


def leaf_of(conversation_id: str) -> str | None:
    c = store.row("SELECT leaf_id FROM conversations WHERE id = ?", (conversation_id,))
    return c["leaf_id"] if c else None


def set_leaf(conversation_id: str, mid: str | None) -> None:
    store.run("UPDATE conversations SET leaf_id = ? WHERE id = ?", (mid, conversation_id))


def insert(conversation_id: str, role: str, content: list[dict], meta: dict | None = None, parent_id: object = None) -> dict:
    parent = None if parent_id is ROOT else (parent_id if parent_id is not None else leaf_of(conversation_id))
    mid, t = store.new_id(), store.now()
    store.run("INSERT INTO messages(id, conversation_id, parent_id, role, content, created, meta) VALUES (?, ?, ?, ?, ?, ?, ?)",
              (mid, conversation_id, parent, role, json.dumps(content), t, json.dumps(meta or {})))
    store.run("UPDATE conversations SET updated = ?, leaf_id = ? WHERE id = ?", (t, mid, conversation_id))
    return _parse(store.row("SELECT * FROM messages WHERE id = ?", (mid,)) or {})


def deepest(conversation_id: str, mid: str) -> str:
    while True:
        child = store.row("SELECT id FROM messages WHERE conversation_id = ? AND parent_id = ? ORDER BY created DESC LIMIT 1", (conversation_id, mid))
        if child is None:
            return mid
        mid = child["id"]


def _siblings(conversation_id: str, parent_id: str | None) -> list[str]:
    if parent_id is None:
        return [r["id"] for r in store.rows("SELECT id FROM messages WHERE conversation_id = ? AND parent_id IS NULL ORDER BY created", (conversation_id,))]
    return [r["id"] for r in store.rows("SELECT id FROM messages WHERE conversation_id = ? AND parent_id = ? ORDER BY created", (conversation_id, parent_id))]


def update(mid: str, content: list[dict], meta: dict) -> dict:
    store.run("UPDATE messages SET content = ?, meta = ? WHERE id = ?", (json.dumps(content), json.dumps(meta), mid))
    return _parse(store.row("SELECT * FROM messages WHERE id = ?", (mid,)) or {})


def messages_of(conversation_id: str) -> list[dict]:
    by_id = {m["id"]: m for m in store.rows("SELECT * FROM messages WHERE conversation_id = ?", (conversation_id,))}
    path, mid, seen = [], leaf_of(conversation_id), set()
    while mid and mid in by_id and mid not in seen:
        seen.add(mid)
        path.append(by_id[mid])
        mid = by_id[mid]["parent_id"]
    path.reverse()
    out = []
    for m in path:
        m = _parse(dict(m))
        if m["role"] == "user":
            sib = _siblings(conversation_id, m["parent_id"])
            if len(sib) > 1:
                m["branch"] = {"index": sib.index(m["id"]), "count": len(sib), "ids": sib}
        out.append(m)
    return out


@command("message.add", "Add a message",
         {"conversationId": {"type": "string", "required": True}, "text": {"type": "string", "required": True},
          "role": {"type": "string", "enum": ["user", "assistant"]}, "parentId": {"type": "string"}},
         description="Appends a message to a conversation (role user by default). From v0.3.0 chat.send also asks the model for the reply.")
def add(conversationId: str, text: str, role: str | None = None, parentId: str | None = None) -> dict:
    if store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    if not text.strip():
        raise CommandError("message.add: text is empty")
    if parentId is not None and store.row("SELECT id FROM messages WHERE id = ? AND conversation_id = ?", (parentId, conversationId)) is None:
        raise CommandError(f"message.add: no message {parentId} in this chat", 404)
    message = insert(conversationId, role or "user", [{"type": "text", "text": text}], None, parentId)
    events.publish("message.added", message=message)
    return message
