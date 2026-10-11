import logging
import threading
import time

from app import providers
from app.engine import events
from app.engine.cmd_account import account
from app.engine.cmd_message import insert, messages_of, update
from app.engine.cmd_settings import current, find_model
from app.harness import request as harness

log = logging.getLogger("format.chat")
RUNS: dict[str, threading.Event] = {}
_lock = threading.Lock()
FLUSH_SECONDS = 0.04
DEFAULT_WINDOW = 200_000


def running(conversation_id: str) -> bool:
    return conversation_id in RUNS


def stop(conversation_id: str) -> bool:
    ev = RUNS.get(conversation_id)
    if ev is None:
        return False
    ev.set()
    return True


def start(conversation_id: str) -> dict:
    with _lock:
        if conversation_id in RUNS:
            raise RuntimeError("A reply is already running in this chat; stop it first")
        cancel = threading.Event()
        RUNS[conversation_id] = cancel
    settings = current()
    model = find_model(settings["model"])
    placeholder = insert(conversation_id, "assistant", [], {"model": model["id"], "status": "streaming"})
    events.publish("message.added", message=placeholder)
    threading.Thread(target=_run, args=(conversation_id, placeholder["id"], model, settings, cancel), name=f"chat-{conversation_id[:8]}", daemon=True).start()
    return placeholder


def _run(conversation_id: str, mid: str, model: dict, settings: dict, cancel: threading.Event) -> None:
    provider = providers.get("anthropic")
    blocks: list[dict] = []
    meta: dict = {"model": model["id"], "status": "streaming", "effort": settings.get("effort")}
    pending: dict[int, str] = {}
    last = time.monotonic()

    def flush() -> None:
        nonlocal last
        for index, text in pending.items():
            events.publish("message.delta", id=mid, conversationId=conversation_id, index=index, kind=blocks[index]["type"], text=text)
        pending.clear()
        last = time.monotonic()

    try:
        history = [m for m in messages_of(conversation_id) if m["id"] != mid]
        req = harness.build(history, model.get("raw") or {"id": model["id"]}, settings, account(), provider.accepts, provider)
        meta["request"] = {k: req[k] for k in ("model", "max_tokens") if k in req} | {"effort": (req.get("output_config") or {}).get("effort"), "thinking": req.get("thinking")}
        for ev in provider.stream(req, cancel):
            if ev.kind == "block_start":
                block = dict(ev.block)
                if block.get("type") == "text":
                    block["text"] = block.get("text", "")
                if block.get("type") == "thinking":
                    block.setdefault("thinking", "")
                while len(blocks) <= ev.index:
                    blocks.append({"type": "text", "text": ""})
                blocks[ev.index] = block
                flush()
                events.publish("message.block", id=mid, conversationId=conversation_id, index=ev.index, block={"type": block.get("type")})
            elif ev.kind in ("text", "thinking"):
                key = "text" if ev.kind == "text" else "thinking"
                blocks[ev.index][key] = blocks[ev.index].get(key, "") + ev.text
                pending[ev.index] = pending.get(ev.index, "") + ev.text
                if time.monotonic() - last > FLUSH_SECONDS:
                    flush()
            elif ev.kind == "signature":
                blocks[ev.index]["signature"] = blocks[ev.index].get("signature", "") + ev.text
            elif ev.kind == "citation":
                blocks[ev.index].setdefault("citations", []).append(ev.data)
            elif ev.kind == "start":
                meta["usage"] = ev.data.get("usage")
            elif ev.kind == "message_delta":
                meta["stopReason"] = ev.data.get("stop_reason")
                meta["usage"] = {**(meta.get("usage") or {}), **{k: v for k, v in (ev.data.get("usage") or {}).items() if v is not None}}
            elif ev.kind == "stopped":
                meta["stopReason"] = "stopped_by_person"
                break
        flush()
        meta["status"] = "stopped" if cancel.is_set() else "done"
    except providers.ProviderError as exc:
        flush()
        meta["status"], meta["error"] = "error", str(exc)
    except Exception as exc:
        log.exception("chat run failed")
        flush()
        meta["status"], meta["error"] = "error", f"{type(exc).__name__}: {exc}"
    finally:
        compact_next = meta.get("status") == "done" and _should_compact(meta, model, settings, provider)
        if compact_next:
            meta["compactNext"] = True
        message = update(mid, blocks, meta)
        if not compact_next:
            RUNS.pop(conversation_id, None)
        events.publish("message.completed", message=message)
        if compact_next:
            try:
                _compact(conversation_id, model, settings, provider, cancel)
            finally:
                RUNS.pop(conversation_id, None)


def _context_used(usage: dict | None) -> int:
    u = usage or {}
    return sum(int(u.get(k) or 0) for k in ("input_tokens", "cache_creation_input_tokens", "cache_read_input_tokens", "output_tokens"))


def _should_compact(meta: dict, model: dict, settings: dict, provider) -> bool:
    if not settings.get("autoCompact", True) or not provider.can_compact(model.get("raw") or {"id": model["id"]}):
        return False
    window = int(model.get("contextWindow") or DEFAULT_WINDOW)
    return _context_used(meta.get("usage")) >= float(settings.get("compactAt", 0.75)) * window


STOP_NOTES = {"max_tokens": "the summary ran past its token limit", "model_context_window_exceeded": "the chat is already too long to summarize",
              "tool_use": "the model called a tool instead of summarizing", "refusal": "the request was declined", "end_turn": "no summary came back"}


def _compact(conversation_id: str, model: dict, settings: dict, provider, cancel: threading.Event) -> dict:
    history = messages_of(conversation_id)
    meta: dict = {"model": model["id"], "status": "streaming", "compaction": True}
    placeholder = insert(conversation_id, "assistant", [], meta)
    events.publish("message.added", message=placeholder)
    blocks: list[dict] = []
    try:
        req = harness.build_compaction(history, model.get("raw") or {"id": model["id"]}, settings, account(), provider.accepts, provider)
        res = provider.compact(req)
        found = [b for b in res["content"] if b.get("type") == "compaction" and b.get("signature")]
        iterations = (res.get("usage") or {}).get("iterations") or []
        meta["summaryUsage"] = iterations[0] if iterations else res.get("usage")
        if cancel.is_set():
            meta["status"] = "stopped"
        elif res["stop_reason"] == "compaction" and found:
            blocks = [{k: found[0][k] for k in ("type", "content", "signature") if k in found[0]}]
            meta["status"] = "done"
            meta["usage"] = {"input_tokens": int((meta["summaryUsage"] or {}).get("output_tokens") or 0)}
        else:
            meta["status"], meta["error"] = "error", f"Earlier messages were not summarized: {STOP_NOTES.get(res['stop_reason'], res['stop_reason'] or 'no summary came back')}."
    except providers.ProviderError as exc:
        meta["status"], meta["error"] = "error", f"Earlier messages were not summarized: {exc}"
    except Exception as exc:
        log.exception("compaction failed")
        meta["status"], meta["error"] = "error", f"Earlier messages were not summarized: {type(exc).__name__}: {exc}"
    message = update(placeholder["id"], blocks, meta)
    events.publish("message.completed", message=message)
    return message


def start_compaction(conversation_id: str) -> dict:
    with _lock:
        if conversation_id in RUNS:
            raise RuntimeError("A reply is already running in this chat; stop it first")
        cancel = threading.Event()
        RUNS[conversation_id] = cancel
    settings = current()
    model = find_model(settings["model"])
    provider = providers.get("anthropic")
    if not provider.can_compact(model.get("raw") or {"id": model["id"]}):
        RUNS.pop(conversation_id, None)
        raise RuntimeError(f"{model['id']} does not support compaction")
    def work() -> None:
        try:
            _compact(conversation_id, model, settings, provider, cancel)
        finally:
            RUNS.pop(conversation_id, None)

    threading.Thread(target=work, name=f"compact-{conversation_id[:8]}", daemon=True).start()
    return {"started": True}
