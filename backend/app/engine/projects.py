from app.engine import events, store, uploads

MAX_FILES = 50
MAX_INSTRUCTIONS = 20_000


class ProjectError(Exception):
    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def _row(pid: str) -> dict:
    p = store.row("SELECT * FROM projects WHERE id = ?", (pid,))
    if p is None:
        raise ProjectError(f"No project {pid}; project.list gives the ids", 404)
    return p


def files(pid: str) -> list[dict]:
    out = []
    for r in store.rows("SELECT upload_id, added FROM project_files WHERE project_id = ? ORDER BY added", (pid,)):
        meta = uploads.get(r["upload_id"])
        out.append((uploads.public(meta) if meta else {"id": r["upload_id"], "name": "(missing file)", "kind": "missing", "size": 0}) | {"added": r["added"]})
    return out


def summary(p: dict) -> dict:
    n = (store.row("SELECT COUNT(*) AS n, MAX(updated) AS u FROM conversations WHERE project_id = ?", (p["id"],)) or {})
    f = (store.row("SELECT COUNT(*) AS n FROM project_files WHERE project_id = ?", (p["id"],)) or {})
    return {"id": p["id"], "name": p["name"], "description": p["description"], "instructions": p["instructions"], "created": p["created"],
            "updated": max(p["updated"], n.get("u") or 0), "chats": n.get("n") or 0, "files": f.get("n") or 0}


def list_() -> list[dict]:
    return sorted((summary(p) for p in store.rows("SELECT * FROM projects")), key=lambda s: -s["updated"])


def get(pid: str) -> dict:
    p = summary(_row(pid))
    chats = store.rows("SELECT id, title, pinned, updated FROM conversations WHERE project_id = ? ORDER BY updated DESC", (pid,))
    for c in chats:
        c["pinned"] = bool(c["pinned"])
    return p | {"fileList": files(pid), "chatList": chats}


def _publish(pid: str) -> dict:
    s = summary(_row(pid))
    events.publish("project.changed", project=s)
    return s


def create(name: str, description: str = "") -> dict:
    name = (name or "").strip()[:120]
    if not name:
        raise ProjectError("a project needs a name")
    pid, t = store.new_id(), store.now()
    store.run("INSERT INTO projects(id, name, description, instructions, created, updated) VALUES (?, ?, ?, '', ?, ?)",
              (pid, name, (description or "").strip()[:2000], t, t))
    return _publish(pid)


def update(pid: str, name: str | None = None, description: str | None = None, instructions: str | None = None) -> dict:
    p = _row(pid)
    if name is not None and not name.strip():
        raise ProjectError("a project needs a name")
    if instructions is not None and len(instructions) > MAX_INSTRUCTIONS:
        raise ProjectError(f"instructions are limited to {MAX_INSTRUCTIONS} characters")
    store.run("UPDATE projects SET name = ?, description = ?, instructions = ?, updated = ? WHERE id = ?",
              ((name or p["name"]).strip()[:120], p["description"] if description is None else description.strip()[:2000],
               p["instructions"] if instructions is None else instructions, store.now(), pid))
    return _publish(pid)


def delete(pid: str) -> list[str]:
    _row(pid)
    moved = [r["id"] for r in store.rows("SELECT id FROM conversations WHERE project_id = ?", (pid,))]
    store.run("UPDATE conversations SET project_id = NULL WHERE project_id = ?", (pid,))
    store.run("DELETE FROM projects WHERE id = ?", (pid,))
    events.publish("project.deleted", id=pid)
    return moved


def add_file(pid: str, upload_id: str) -> dict:
    _row(pid)
    if uploads.get(upload_id) is None:
        raise ProjectError(f"no uploaded file {upload_id}; upload it with POST /api/uploads first", 404)
    count = (store.row("SELECT COUNT(*) AS n FROM project_files WHERE project_id = ?", (pid,)) or {}).get("n") or 0
    if count >= MAX_FILES:
        raise ProjectError(f"a project holds at most {MAX_FILES} files")
    store.run("INSERT OR IGNORE INTO project_files(project_id, upload_id, added) VALUES (?, ?, ?)", (pid, upload_id, store.now()))
    store.run("UPDATE projects SET updated = ? WHERE id = ?", (store.now(), pid))
    return _publish(pid)


def remove_file(pid: str, upload_id: str) -> dict:
    _row(pid)
    store.run("DELETE FROM project_files WHERE project_id = ? AND upload_id = ?", (pid, upload_id))
    store.run("UPDATE projects SET updated = ? WHERE id = ?", (store.now(), pid))
    return _publish(pid)


def context(conversation_id: str) -> dict | None:
    c = store.row("SELECT project_id FROM conversations WHERE id = ?", (conversation_id,))
    pid = (c or {}).get("project_id")
    p = store.row("SELECT * FROM projects WHERE id = ?", (pid,)) if pid else None
    if p is None:
        return None
    ids = [r["upload_id"] for r in store.rows("SELECT upload_id FROM project_files WHERE project_id = ? ORDER BY added", (pid,))]
    return {"id": pid, "name": p["name"], "instructions": p["instructions"], "files": ids}
