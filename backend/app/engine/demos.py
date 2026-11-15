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


def _conversation(cid: str) -> dict:
    from app.engine.cmd_conversation import _get
    return _get(cid)


def conversation_of(demo_id: str) -> dict | None:
    found = store.row("SELECT id FROM conversations WHERE demo = ? ORDER BY created LIMIT 1", (demo_id,))
    return _conversation(found["id"]) if found else None


def list_() -> list[dict]:
    done, out = _seeded(), []
    for demo_id in ids():
        try:
            spec = _spec(demo_id)
        except DemoError as exc:
            log.warning("%s", exc)
            continue
        conv = store.row("SELECT id FROM conversations WHERE demo = ? ORDER BY created LIMIT 1", (demo_id,))
        out.append({"id": demo_id, "title": spec["title"].strip(), "artifact": (spec.get("artifact") or {}).get("title") or None,
                    "files": len(spec.get("files") or []), "conversationId": conv["id"] if conv else None, "seeded": demo_id in done})
    return out


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
    return _conversation(cid)


def seed() -> list[str]:
    made: list[str] = []
    try:
        done = set(_seeded())
        for demo_id in ids():
            if demo_id in done:
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
