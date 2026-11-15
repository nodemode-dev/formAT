import hashlib
import json
import logging
import mimetypes
import shutil
from pathlib import Path

from app.engine import artifacts, cmd_message, events, store, tools

log = logging.getLogger("format.demos")
ROOT = Path(__file__).resolve().parents[1] / "demos"
FORMAT = "format-demo-chat/1"
SEEDED = "demos.seeded"
SHIPPED = "demos.shipped"


class DemoError(Exception):
    pass


def ids() -> list[str]:
    if not ROOT.is_dir():
        return []
    return sorted(p.name for p in ROOT.iterdir() if (p / "chat.json").is_file())


def _spec(demo_id: str) -> dict:
    if demo_id not in ids():
        raise DemoError(f"no demo {demo_id}; the demos are {', '.join(ids()) or 'none'}")
    try:
        spec = json.loads((ROOT / demo_id / "chat.json").read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        raise DemoError(f"demo {demo_id}: chat.json cannot be read: {exc}") from None
    if not isinstance(spec, dict) or spec.get("format") != FORMAT:
        raise DemoError(f"demo {demo_id}: chat.json is not {FORMAT}")
    if not str(spec.get("title") or "").strip() or not isinstance(spec.get("messages"), list) or not spec["messages"]:
        raise DemoError(f"demo {demo_id}: chat.json needs a title and messages")
    return spec


def _file(demo_id: str, rel: str) -> Path:
    base = (ROOT / demo_id / "files").resolve()
    path = (base / rel).resolve()
    if base not in path.parents or not path.is_file():
        raise DemoError(f"demo {demo_id}: no file {rel} in its files folder")
    return path


def _seeded() -> list[str]:
    row = store.row("SELECT value FROM meta WHERE key = ?", (SEEDED,))
    try:
        found = json.loads(row["value"]) if row else []
    except (TypeError, ValueError):
        found = []
    return [x for x in found if isinstance(x, str)] if isinstance(found, list) else []


def _remember(demo_id: str) -> None:
    done = _seeded()
    if demo_id not in done:
        store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (SEEDED, json.dumps(sorted(done + [demo_id]))))


def _shipped_files(demo_id: str) -> list[str]:
    src = ROOT / demo_id / "files"
    return sorted(p.relative_to(src).as_posix() for p in src.rglob("*") if p.is_file()) if src.is_dir() else []


def _digest(demo_id: str, spec: dict) -> str:
    base, art = ROOT / demo_id, spec.get("artifact") or {}
    parts = [("chat.json", base / "chat.json")]
    if art:
        parts.append(("page", base / str(art.get("file") or "artifact.html")))
    parts += [(f"files/{rel}", base / "files" / rel) for rel in _shipped_files(demo_id)]
    h = hashlib.sha256()
    for name, path in parts:
        h.update(name.encode() + b"\0" + path.read_bytes() + b"\0")
    return h.hexdigest()


def _records() -> dict:
    row = store.row("SELECT value FROM meta WHERE key = ?", (SHIPPED,))
    try:
        found = json.loads(row["value"]) if row else {}
    except (TypeError, ValueError):
        found = {}
    return found if isinstance(found, dict) else {}


def _record(demo_id: str, spec: dict) -> None:
    done = _records()
    done[demo_id] = {"digest": _digest(demo_id, spec), "title": spec["title"].strip()[:120], "files": _shipped_files(demo_id)}
    store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (SHIPPED, json.dumps(done)))


def _on_disk(cid: str) -> set[str]:
    root = tools.workspace(cid)
    return {p.relative_to(root).as_posix() for p in root.rglob("*") if p.is_file()}


def _untouched(cid: str, demo_id: str, spec: dict, rec: dict | None) -> bool:
    conv = store.row("SELECT title, leaf_id FROM conversations WHERE id = ?", (cid,))
    if conv is None or conv["title"] != ((rec or {}).get("title") or spec["title"].strip()[:120]):
        return False
    msgs = store.rows("SELECT id, parent_id, role, meta FROM messages WHERE conversation_id = ? ORDER BY created, rowid", (cid,))
    if not msgs or conv["leaf_id"] != msgs[-1]["id"] or msgs[-1]["role"] != "assistant":
        return False
    made: set[str] = set()
    prev = None
    for m in msgs:
        try:
            meta = json.loads(m["meta"] or "{}")
        except (TypeError, ValueError):
            return False
        if m["parent_id"] != prev or not isinstance(meta, dict):
            return False
        if m["role"] == "assistant":
            if meta.get("demo") != demo_id:
                return False
        elif meta:
            return False
        prev = m["id"]
        made |= {str(a.get("id")) for a in (meta.get("artifacts") or {}).values() if isinstance(a, dict)}
    arts = store.rows("SELECT id FROM artifacts WHERE conversation_id = ?", (cid,))
    if {a["id"] for a in arts} != made:
        return False
    if any((store.row("SELECT COUNT(*) AS n FROM artifact_versions WHERE artifact_id = ?", (a["id"],)) or {}).get("n") != 1 for a in arts):
        return False
    return _on_disk(cid) <= set((rec or {}).get("files") or []) | set(_shipped_files(demo_id))


def _current(cid: str, demo_id: str, spec: dict) -> bool:
    if (store.row("SELECT title FROM conversations WHERE id = ?", (cid,)) or {}).get("title") != spec["title"].strip()[:120]:
        return False
    texts = []
    for r in store.rows("SELECT content FROM messages WHERE conversation_id = ? ORDER BY created, rowid", (cid,)):
        try:
            blocks = json.loads(r["content"])
        except (TypeError, ValueError):
            return False
        texts.append(next((b.get("text") for b in reversed(blocks) if isinstance(b, dict) and b.get("type") == "text"), None))
    if texts != [str(m.get("text") or "") for m in spec["messages"]]:
        return False
    art = spec.get("artifact") or {}
    if art:
        page = (ROOT / demo_id / str(art.get("file") or "artifact.html")).read_text(encoding="utf-8")
        got = store.row("SELECT v.content FROM artifact_versions v JOIN artifacts a ON a.id = v.artifact_id WHERE a.conversation_id = ?", (cid,))
        if got is None or got["content"] != page:
            return False
    root = tools.workspace(cid)
    shipped = _shipped_files(demo_id)
    return _on_disk(cid) == set(shipped) and all((root / rel).read_bytes() == (ROOT / demo_id / "files" / rel).read_bytes() for rel in shipped)


def _refresh(demo_id: str, spec: dict, cid: str, rec: dict | None) -> None:
    c = store.conn()
    with store._lock:
        shares = store.rows("SELECT s.token, s.version, s.created FROM shares s JOIN artifacts a ON a.id = s.artifact_id WHERE a.conversation_id = ?", (cid,))
        updated = (store.row("SELECT updated FROM conversations WHERE id = ?", (cid,)) or {}).get("updated") or store.now()
        c.execute("BEGIN")
        try:
            c.execute("UPDATE conversations SET leaf_id = NULL WHERE id = ?", (cid,))
            c.execute("DELETE FROM messages WHERE conversation_id = ?", (cid,))
            c.execute("DELETE FROM artifacts WHERE conversation_id = ?", (cid,))
            c.execute("DELETE FROM meta WHERE key = ?", (f"outputs.{cid}",))
            _build(demo_id, spec, cid)
            fresh = store.row("SELECT id FROM artifacts WHERE conversation_id = ?", (cid,))
            for s in shares if fresh else []:
                c.execute("INSERT INTO shares(token, artifact_id, version, created) VALUES (?, ?, ?, ?)", (s["token"], fresh["id"], s["version"], s["created"]))
            c.execute("UPDATE conversations SET title = ?, updated = ? WHERE id = ?", (spec["title"].strip()[:120], updated, cid))
            c.execute("COMMIT")
        except BaseException:
            c.execute("ROLLBACK")
            raise
    root, keep = tools.workspace(cid), set(_shipped_files(demo_id))
    for rel in set((rec or {}).get("files") or []) - keep:
        (root / rel).unlink(missing_ok=True)


def update_if_stale(demo_id: str) -> bool:
    spec = _spec(demo_id)
    found = store.row("SELECT id FROM conversations WHERE demo = ? ORDER BY created LIMIT 1", (demo_id,))
    if found is None:
        return False
    cid, rec = found["id"], _records().get(demo_id)
    if rec and rec.get("digest") == _digest(demo_id, spec):
        return False
    if not _untouched(cid, demo_id, spec, rec):
        log.info("demo %s changed in the app, but the chat was changed by the person: left as it is", demo_id)
        return False
    if _current(cid, demo_id, spec):
        _record(demo_id, spec)
        return False
    _refresh(demo_id, spec, cid, rec)
    _record(demo_id, spec)
    log.info("demo %s updated to the app's copy", demo_id)
    return True


def _conversation(cid: str) -> dict:
    from app.engine.cmd_conversation import _get
    return _get(cid)


def conversation_of(demo_id: str) -> dict | None:
    found = store.row("SELECT id FROM conversations WHERE demo = ? ORDER BY created LIMIT 1", (demo_id,))
    return _conversation(found["id"]) if found else None


def _about(demo_id: str) -> tuple[str, int]:
    try:
        about = json.loads((ROOT / demo_id / "about.json").read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return "", 1000
    if not isinstance(about, dict):
        return "", 1000
    order = about.get("order")
    return str(about.get("blurb") or "").strip(), order if isinstance(order, int) and not isinstance(order, bool) else 1000


def list_() -> list[dict]:
    done, out = _seeded(), []
    for demo_id in ids():
        try:
            spec = _spec(demo_id)
        except DemoError as exc:
            log.warning("%s", exc)
            continue
        conv = store.row("SELECT id FROM conversations WHERE demo = ? ORDER BY created LIMIT 1", (demo_id,))
        blurb, order = _about(demo_id)
        out.append({"id": demo_id, "title": spec["title"].strip(), "blurb": blurb, "order": order, "artifact": (spec.get("artifact") or {}).get("title") or None,
                    "files": len(spec.get("files") or []), "conversationId": conv["id"] if conv else None, "seeded": demo_id in done})
    return sorted(out, key=lambda d: (d["order"], d["title"].lower(), d["id"]))


def _build(demo_id: str, spec: dict, cid: str) -> None:
    art = spec.get("artifact") or {}
    page = (ROOT / demo_id / str(art.get("file") or "artifact.html")).read_text(encoding="utf-8") if art else ""
    listed = {str(f.get("path")): f for f in spec.get("files") or []}
    for rel in listed:
        _file(demo_id, rel)
    source = ROOT / demo_id / "files"
    if source.is_dir():
        shutil.copytree(source, tools.workspace(cid), dirs_exist_ok=True, copy_function=shutil.copyfile)
    outputs: list[dict] = []
    last = ""
    for m in spec["messages"]:
        text = str(m.get("text") or "")
        if m.get("role") != "assistant":
            cmd_message.insert(cid, "user", [{"type": "text", "text": text}])
            continue
        row = cmd_message.insert(cid, "assistant", [], {"status": "done", "demo": demo_id})
        last = row["id"]
        blocks: list[dict] = []
        meta: dict = {"status": "done", "demo": demo_id, "tools": {}}
        for tid in m.get("artifacts") or []:
            if tid != art.get("toolUseId"):
                raise DemoError(f"demo {demo_id}: a message names artifact {tid}, which chat.json does not define")
            a = artifacts.publish(cid, row["id"], str(art.get("title") or ""), page)
            blocks.append({"type": "tool_use", "id": tid, "name": "publish_artifact", "input": {"title": a["title"], "html": page}})
            blocks.append({"type": "tool_result", "tool_use_id": tid, "is_error": False,
                           "content": f"Published \"{a['title']}\" as artifact {a['id']}, version {a['version']}. The person sees it as a card in your reply and opens it beside the chat from there; to revise it, call publish_artifact again with artifact_id {a['id']}."})
            meta["tools"][tid] = {"status": "done"}
            meta.setdefault("artifacts", {})[tid] = {"id": a["id"], "version": a["version"], "title": a["title"], "kind": "html"}
        for n, rel in enumerate(m.get("files") or []):
            if rel not in listed:
                raise DemoError(f"demo {demo_id}: a message names file {rel}, which chat.json does not list")
            path, caption = _file(demo_id, rel), str(listed[rel].get("caption") or "")[:300]
            size = path.stat().st_size
            outputs.append({"path": rel, "name": path.name, "size": size, "mime": listed[rel].get("mime") or mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                            "caption": caption, "messageId": row["id"], "at": store.now()})
            if not caption:
                continue
            tid = f"toolu_demo_{demo_id.replace('-', '_')}_file_{n}"
            blocks.append({"type": "tool_use", "id": tid, "name": "send_file", "input": {"path": rel, "caption": caption}})
            blocks.append({"type": "tool_result", "tool_use_id": tid, "is_error": False,
                           "content": f"Sent {rel} ({size} bytes) to the person; it shows as a file card they can download."})
            meta["tools"][tid] = {"status": "done"}
        blocks.append({"type": "text", "text": text})
        cmd_message.update(row["id"], blocks, meta)
    sent = {o["path"] for o in outputs}
    for rel, f in listed.items():
        if rel not in sent and last:
            path = _file(demo_id, rel)
            outputs.append({"path": rel, "name": path.name, "size": path.stat().st_size, "mime": f.get("mime") or mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                            "caption": str(f.get("caption") or "")[:300], "messageId": last, "at": store.now()})
    if outputs:
        store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (f"outputs.{cid}", json.dumps(outputs)))


def materialise(demo_id: str) -> dict:
    spec = _spec(demo_id)
    cid, t = store.new_id(), store.now()
    store.run("INSERT INTO conversations(id, title, created, updated) VALUES (?, ?, ?, ?)", (cid, spec["title"].strip()[:120], t, t))
    try:
        _build(demo_id, spec, cid)
        store.run("UPDATE conversations SET demo = ? WHERE id = ?", (demo_id, cid))
    except Exception as exc:
        store.run("DELETE FROM conversations WHERE id = ?", (cid,))
        store.run("DELETE FROM meta WHERE key = ?", (f"outputs.{cid}",))
        shutil.rmtree(store.path().parent / "workspace" / "chats" / cid, ignore_errors=True)
        if isinstance(exc, (DemoError, artifacts.ArtifactError, OSError)):
            raise DemoError(str(exc)) from None
        raise
    _remember(demo_id)
    _record(demo_id, spec)
    return _conversation(cid)


def seed() -> list[str]:
    made: list[str] = []
    try:
        done = set(_seeded())
        for demo_id in ids():
            if demo_id in done:
                try:
                    update_if_stale(demo_id)
                except Exception as exc:
                    log.warning("demo %s was not updated: %s", demo_id, exc)
                continue
            if conversation_of(demo_id) is not None:
                _remember(demo_id)
                continue
            try:
                materialise(demo_id)
                made.append(demo_id)
            except DemoError as exc:
                log.warning("demo %s was not added: %s", demo_id, exc)
    except Exception as exc:
        log.warning("demos were not added: %s", exc)
    return made


def restore(demo_id: str) -> tuple[dict, bool]:
    found = conversation_of(demo_id) if demo_id in ids() else None
    if found is not None:
        _remember(demo_id)
        return found, False
    conv = materialise(demo_id)
    events.publish("conversation.created", conversation=conv)
    return conv, True
