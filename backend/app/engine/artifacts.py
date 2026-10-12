from app.engine import events, store

MAX_BYTES = 2_000_000


class ArtifactError(Exception):
    pass


def _summary(a: dict) -> dict:
    count = store.row("SELECT COUNT(*) AS n, MAX(version) AS v FROM artifact_versions WHERE artifact_id = ?", (a["id"],)) or {}
    return {"id": a["id"], "conversationId": a["conversation_id"], "title": a["title"], "kind": a["kind"],
            "created": a["created"], "updated": a["updated"], "versions": count.get("n") or 0, "latest": count.get("v") or 0}


def get(artifact_id: str) -> dict | None:
    a = store.row("SELECT * FROM artifacts WHERE id = ?", (artifact_id,))
    return _summary(a) if a else None


def version(artifact_id: str, number: int | None = None) -> dict | None:
    if number is None:
        return store.row("SELECT * FROM artifact_versions WHERE artifact_id = ? ORDER BY version DESC LIMIT 1", (artifact_id,))
    return store.row("SELECT * FROM artifact_versions WHERE artifact_id = ? AND version = ?", (artifact_id, int(number)))


def versions(artifact_id: str) -> list[dict]:
    return store.rows("SELECT version, message_id AS messageId, created, LENGTH(content) AS size FROM artifact_versions WHERE artifact_id = ? ORDER BY version",
                      (artifact_id,))


def list_(conversation_id: str | None = None) -> list[dict]:
    if conversation_id:
        rows = store.rows("SELECT * FROM artifacts WHERE conversation_id = ? ORDER BY updated DESC", (conversation_id,))
    else:
        rows = store.rows("SELECT * FROM artifacts ORDER BY updated DESC LIMIT 500")
    titles = {c["id"]: c["title"] for c in store.rows("SELECT id, title FROM conversations")}
    return [_summary(a) | {"chatTitle": titles.get(a["conversation_id"], "")} for a in rows]


def publish(conversation_id: str, message_id: str | None, title: str, content: str, artifact_id: str | None = None, kind: str = "html") -> dict:
    title = (title or "").strip()[:120]
    if not isinstance(content, str) or not content.strip():
        raise ArtifactError("the page is empty")
    if len(content.encode()) > MAX_BYTES:
        raise ArtifactError(f"the page is larger than {MAX_BYTES // 1_000_000} MB; keep it to one self-contained HTML file")
    now = store.now()
    if artifact_id:
        a = store.row("SELECT * FROM artifacts WHERE id = ? AND conversation_id = ?", (artifact_id, conversation_id))
        if a is None:
            raise ArtifactError(f"no artifact {artifact_id} in this chat; omit artifact_id to publish a new one")
        number = (store.row("SELECT MAX(version) AS v FROM artifact_versions WHERE artifact_id = ?", (artifact_id,)) or {}).get("v") or 0
        number += 1
        store.run("UPDATE artifacts SET updated = ?, title = ? WHERE id = ?", (now, title or a["title"], artifact_id))
    else:
        if not title:
            raise ArtifactError("a new artifact needs a title")
        artifact_id, number = store.new_id(), 1
        store.run("INSERT INTO artifacts(id, conversation_id, title, kind, created, updated) VALUES (?, ?, ?, ?, ?, ?)",
                  (artifact_id, conversation_id, title, kind, now, now))
    store.run("INSERT INTO artifact_versions(artifact_id, version, message_id, content, created) VALUES (?, ?, ?, ?, ?)",
              (artifact_id, number, message_id, content, now))
    summary = get(artifact_id) or {}
    events.publish("artifact.changed", artifact=summary, version=number)
    return summary | {"version": number}


def delete(artifact_id: str) -> bool:
    a = store.row("SELECT conversation_id FROM artifacts WHERE id = ?", (artifact_id,))
    if a is None:
        return False
    store.run("DELETE FROM artifact_versions WHERE artifact_id = ?", (artifact_id,))
    store.run("DELETE FROM artifacts WHERE id = ?", (artifact_id,))
    events.publish("artifact.deleted", id=artifact_id, conversationId=a["conversation_id"])
    return True
