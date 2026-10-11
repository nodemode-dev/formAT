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
        req = harness.build(history, model.get("raw") or {"id": model["id"]}, settings, account(), provider.accepts)
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
        message = update(mid, blocks, meta)
        RUNS.pop(conversation_id, None)
        events.publish("message.completed", message=message)
