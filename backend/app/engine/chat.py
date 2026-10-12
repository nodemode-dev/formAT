import json
import logging
import threading
import time

from app import providers
from app.engine import events, projects, tools
from app.engine.cmd_account import account
from app.engine.cmd_message import insert, messages_of, update
from app.engine.cmd_settings import current, find_model
from app.engine.cmd_settings import set_ as set_setting
from app.harness import request as harness

log = logging.getLogger("format.chat")
RUNS: dict[str, threading.Event] = {}
_lock = threading.Lock()
FLUSH_SECONDS = 0.04
DEFAULT_WINDOW = 200_000
MAX_ROUNDS = 40


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

    raw = model.get("raw") or {"id": model["id"]}
    toolset = tools.definitions(settings, raw)
    folder = str(tools.workspace(conversation_id))
    project = projects.context(conversation_id)
    meta["tools"] = {}
    if project:
        meta["project"] = {"id": project["id"], "name": project["name"], "files": len(project["files"])}
    try:
        base_history = [m for m in messages_of(conversation_id) if m["id"] != mid]
        rounds = 0
        while True:
            rounds += 1
            history = base_history + ([{"role": "assistant", "content": blocks, "meta": {}}] if blocks else [])
            req = harness.build(history, raw, settings, account(), provider.accepts, provider, toolset, folder, project)
            if rounds == 1:
                meta["request"] = {k: req[k] for k in ("model", "max_tokens") if k in req} | {"effort": (req.get("output_config") or {}).get("effort"), "thinking": req.get("thinking"), "tools": [t["name"] for t in toolset]}
            base = len(blocks)
            partial: dict[int, str] = {}
            stop_reason = None
            for ev in provider.stream(req, cancel):
                i = base + ev.index
                if ev.kind == "block_start":
                    block = dict(ev.block)
                    if block.get("type") == "text":
                        block["text"] = block.get("text", "")
                    if block.get("type") == "thinking":
                        block.setdefault("thinking", "")
                    while len(blocks) <= i:
                        blocks.append({"type": "text", "text": ""})
                    blocks[i] = block
                    flush()
                    events.publish("message.block", id=mid, conversationId=conversation_id, index=i, block=tool_view(block, meta))
                elif ev.kind in ("text", "thinking"):
                    key = "text" if ev.kind == "text" else "thinking"
                    blocks[i][key] = blocks[i].get(key, "") + ev.text
                    pending[i] = pending.get(i, "") + ev.text
                    if time.monotonic() - last > FLUSH_SECONDS:
                        flush()
                elif ev.kind == "signature":
                    blocks[i]["signature"] = blocks[i].get("signature", "") + ev.text
                elif ev.kind == "citation":
                    blocks[i].setdefault("citations", []).append(ev.data)
                elif ev.kind == "input_json":
                    partial[i] = partial.get(i, "") + ev.text
                elif ev.kind == "block_stop":
                    if i in partial:
                        try:
                            blocks[i]["input"] = json.loads(partial.pop(i) or "{}")
                        except ValueError:
                            blocks[i]["input"] = {}
                        events.publish("message.block", id=mid, conversationId=conversation_id, index=i, block=tool_view(blocks[i], meta))
                elif ev.kind == "start":
                    meta["usage"] = ev.data.get("usage")
                elif ev.kind == "message_delta":
                    stop_reason = ev.data.get("stop_reason")
                    meta["stopReason"] = stop_reason
                    meta["usage"] = {**(meta.get("usage") or {}), **{k: v for k, v in (ev.data.get("usage") or {}).items() if v is not None}}
                elif ev.kind == "stopped":
                    meta["stopReason"] = "stopped_by_person"
                    break
            flush()
            if cancel.is_set():
                break
            if stop_reason == "pause_turn" and rounds < MAX_ROUNDS:
                continue
            if stop_reason != "tool_use":
                break
            calls = [b for b in blocks[base:] if b.get("type") == "tool_use"]
            if not calls:
                break
            for call in calls:
                result = _call_tool(conversation_id, mid, call, blocks, cancel, meta)
                blocks.append(result)
                events.publish("message.block", id=mid, conversationId=conversation_id, index=len(blocks) - 1, block=tool_view(result, meta))
            update(mid, blocks, meta)
            if rounds >= MAX_ROUNDS:
                meta["error"] = f"Stopped after {MAX_ROUNDS} rounds of tool calls; ask Claude to continue."
                break
        meta["status"] = "stopped" if cancel.is_set() else "done"
    except providers.ProviderError as exc:
        flush()
        meta["status"], meta["error"] = "error", str(exc)
    except Exception as exc:
        log.exception("chat run failed")
        flush()
        meta["status"], meta["error"] = "error", f"{type(exc).__name__}: {exc}"
    finally:
        _close_open_calls(blocks, meta)
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


RESULT_TYPES = {"tool_result", "web_search_tool_result", "web_fetch_tool_result", "code_execution_tool_result",
                "bash_code_execution_tool_result", "text_editor_code_execution_tool_result"}


def tool_view(block: dict, meta: dict) -> dict:
    t = block.get("type")
    if t in ("tool_use", "server_tool_use"):
        status = ((meta.get("tools") or {}).get(block.get("id")) or {}).get("status")
        view = {"type": t, "id": block.get("id"), "name": block.get("name"), "input": block.get("input") or {}, "status": status}
        if block.get("id") in (meta.get("answers") or {}):
            view["answer"] = meta["answers"][block["id"]]
        if block.get("name") == "publish_artifact":
            inp = block.get("input") or {}
            view["input"] = {"title": inp.get("title"), "artifact_id": inp.get("artifact_id"), "size": len(inp.get("html") or "")}
            if block.get("id") in (meta.get("artifacts") or {}):
                view["artifact"] = meta["artifacts"][block["id"]]
        return view
    if t in RESULT_TYPES:
        content = block.get("content")
        view: dict = {"type": t, "tool_use_id": block.get("tool_use_id"), "is_error": bool(block.get("is_error"))}
        if isinstance(content, str):
            view["text"] = content[:20_000]
        elif isinstance(content, list) and t == "web_search_tool_result":
            view["results"] = [{k: r.get(k) for k in ("title", "url", "page_age")} for r in content if isinstance(r, dict)][:20]
        elif isinstance(content, dict):
            if content.get("error_code"):
                view["is_error"], view["text"] = True, str(content["error_code"]).replace("_", " ")
            elif t == "web_fetch_tool_result":
                doc = content.get("content") or {}
                view["url"], view["title"] = content.get("url"), doc.get("title")
            else:
                view["text"] = str(content.get("stdout") or content.get("content") or "")[:20_000]
        return view
    return {"type": t}


def _set_status(conversation_id: str, mid: str, meta: dict, tool_use_id: str, status: str) -> None:
    meta.setdefault("tools", {})[tool_use_id] = {"status": status}
    events.publish("message.tool", id=mid, conversationId=conversation_id, toolUseId=tool_use_id, status=status)


def _call_tool(conversation_id: str, mid: str, call: dict, live: list[dict], cancel: threading.Event, meta: dict) -> dict:
    name, tid, args = call.get("name"), call.get("id"), call.get("input") or {}

    def result(text: str, is_error: bool, status: str) -> dict:
        _set_status(conversation_id, mid, meta, tid, status)
        return {"type": "tool_result", "tool_use_id": tid, "content": text, "is_error": is_error}

    if name not in tools.NAMES:
        return result(f"Format has no tool named {name}.", True, "error")
    if cancel.is_set():
        return result("Stopped by the person before this ran.", True, "denied")
    if name == "spawn_agent":
        _set_status(conversation_id, mid, meta, tid, "running")
        text, is_error = _run_agent(conversation_id, mid, call, live, cancel, meta)
        return result(text, is_error, "error" if is_error else "done")
    if name == "ask_user":
        _set_status(conversation_id, mid, meta, tid, "asking")
        update(mid, live, meta)
        events.publish("tool.question", conversationId=conversation_id, messageId=mid, toolUseId=tid, input=args)
        got = tools.wait_for_answer(conversation_id, mid, call, cancel)
        if got is None:
            return result("The person did not answer; the reply was stopped.", True, "denied")
        chosen = got if isinstance(got, list) else [got]
        meta.setdefault("answers", {})[tid] = chosen
        return result("The person answered: " + "; ".join(str(c) for c in chosen), False, "done")
    decision = tools.decision_for(name, current())
    if decision == "plan":
        return result(f"Plan mode is on, so {name} is not available: describe the change or command instead, and the person will switch modes to carry it out.", True, "denied")
    if decision == "deny":
        return result(f"The person does not allow {name} in this workspace.", True, "denied")
    if decision == "ask":
        _set_status(conversation_id, mid, meta, tid, "waiting")
        update(mid, live, meta)
        answer = tools.wait_for_approval(conversation_id, mid, call, cancel)
        if answer == "always":
            allowed = list(current().get("toolAllow") or [])
            if name not in allowed:
                set_setting("toolAllow", allowed + [name])
        elif answer != "allow":
            return result(f"The person declined this {name} call. Do not retry it the same way; say what you would have done instead.", True, "denied")
    _set_status(conversation_id, mid, meta, tid, "running")
    buf: list[str] = []
    last = [time.monotonic()]

    def on_output(text: str) -> None:
        buf.append(text)
        if time.monotonic() - last[0] > 0.08:
            events.publish("tool.output", id=mid, conversationId=conversation_id, toolUseId=tid, text="".join(buf))
            buf.clear()
            last[0] = time.monotonic()

    text, is_error = tools.run(name, args, conversation_id, on_output, cancel, mid)
    if name == "publish_artifact" and not is_error:
        from app.engine import store
        row = store.row("SELECT v.artifact_id, v.version, a.title FROM artifact_versions v JOIN artifacts a ON a.id = v.artifact_id WHERE v.message_id = ? ORDER BY v.created DESC LIMIT 1", (mid,))
        if row:
            info = {"id": row["artifact_id"], "version": row["version"], "title": row["title"]}
            meta.setdefault("artifacts", {})[tid] = info
            events.publish("message.artifact", id=mid, conversationId=conversation_id, toolUseId=tid, artifact=info)
    if name in ("bash", "write", "edit"):
        events.publish("files.changed", conversationId=conversation_id)
    if buf:
        events.publish("tool.output", id=mid, conversationId=conversation_id, toolUseId=tid, text="".join(buf))
    return result(text, is_error, "error" if is_error else "done")


AGENT_ROUNDS = 20
AGENT_PROMPT = """You are a sub-agent: the main Claude in this chat handed you one task, and your final message goes back to it as your report, not to the person. You cannot ask the person questions, and ask_user, task_list, send_file and spawn_agent are not available to you. Work through the task with your tools, then end with a concise report: what you did, what you found, the paths of any files you wrote, and anything left undone."""


def _agent_view(block: dict, meta: dict) -> dict:
    if block.get("type") == "text":
        return {"type": "text", "text": (block.get("text") or "")[:20_000]}
    return tool_view(block, meta)


def _run_agent(conversation_id: str, mid: str, call: dict, live: list[dict], cancel: threading.Event, meta: dict) -> tuple[str, bool]:
    settings = current()
    tid, args = call["id"], call.get("input") or {}
    task = str(args.get("task") or "").strip()
    if not task:
        return "spawn_agent needs a task.", True
    limit = int(settings.get("agentLimit", 4))
    agents = meta.setdefault("agents", {})
    if len(agents) >= limit:
        return f"The limit of {limit} sub-agents for one reply is reached; do this part yourself.", True
    model = find_model(settings.get("agentModel") or settings["model"])
    raw = model.get("raw") or {"id": model["id"]}
    provider = providers.get("anthropic")
    toolset = tools.definitions(settings, raw, agent=True)
    folder = str(tools.workspace(conversation_id))
    record = agents[tid] = {"model": model["id"], "title": str(args.get("title") or "")[:80], "blocks": []}
    blocks: list[dict] = record["blocks"]
    first = {"role": "user", "content": [{"type": "text", "text": task}], "meta": {}}

    def publish(i: int) -> None:
        events.publish("message.block", id=mid, conversationId=conversation_id, index=i, parent=tid, block=_agent_view(blocks[i], meta))

    try:
        for _ in range(AGENT_ROUNDS):
            history = [first] + ([{"role": "assistant", "content": blocks, "meta": {}}] if blocks else [])
            req = harness.build(history, raw, settings, account(), provider.accepts, provider, toolset, folder)
            req["system"] = list(req["system"]) + [{"type": "text", "text": AGENT_PROMPT}]
            base, partial, stop_reason = len(blocks), {}, None
            for ev in provider.stream(req, cancel):
                i = base + ev.index
                if ev.kind == "block_start":
                    block = dict(ev.block)
                    if block.get("type") == "text":
                        block["text"] = block.get("text", "")
                    if block.get("type") == "thinking":
                        block.setdefault("thinking", "")
                    while len(blocks) <= i:
                        blocks.append({"type": "text", "text": ""})
                    blocks[i] = block
                    if block.get("type") in RESULT_TYPES:
                        publish(i)
                elif ev.kind in ("text", "thinking"):
                    key = "text" if ev.kind == "text" else "thinking"
                    blocks[i][key] = blocks[i].get(key, "") + ev.text
                elif ev.kind == "signature":
                    blocks[i]["signature"] = blocks[i].get("signature", "") + ev.text
                elif ev.kind == "citation":
                    blocks[i].setdefault("citations", []).append(ev.data)
                elif ev.kind == "input_json":
                    partial[i] = partial.get(i, "") + ev.text
                elif ev.kind == "block_stop":
                    if i in partial:
                        try:
                            blocks[i]["input"] = json.loads(partial.pop(i) or "{}")
                        except ValueError:
                            blocks[i]["input"] = {}
                    if blocks[i].get("type") in ("text", "tool_use", "server_tool_use"):
                        publish(i)
                elif ev.kind == "message_delta":
                    stop_reason = ev.data.get("stop_reason")
                elif ev.kind == "stopped":
                    break
            if cancel.is_set():
                break
            if stop_reason == "pause_turn":
                continue
            if stop_reason != "tool_use":
                break
            for c in [b for b in blocks[base:] if b.get("type") == "tool_use"]:
                blocks.append(_call_tool(conversation_id, mid, c, live, cancel, meta))
                publish(len(blocks) - 1)
            update(mid, live, meta)
    except providers.ProviderError as exc:
        _close_open_calls(blocks, meta)
        return f"The sub-agent stopped on an API error: {exc}", True
    _close_open_calls(blocks, meta)
    if cancel.is_set():
        return "The sub-agent was stopped by the person.", True
    tail = []
    for b in reversed(blocks):
        if b.get("type") in RESULT_TYPES or b.get("type") == "tool_use":
            break
        if b.get("type") == "text" and b.get("text"):
            tail.append(b["text"])
    report = "\n\n".join(reversed(tail)).strip()
    return (report[:20_000] if report else "The sub-agent finished without writing a report."), False


def _close_open_calls(blocks: list[dict], meta: dict) -> None:
    answered = {b.get("tool_use_id") for b in blocks if b.get("type") in RESULT_TYPES}
    keep: list[dict] = []
    for b in blocks:
        if b.get("type") == "server_tool_use" and b.get("id") not in answered:
            continue
        keep.append(b)
    blocks[:] = keep
    for b in list(blocks):
        if b.get("type") == "tool_use" and b.get("id") not in answered:
            blocks.append({"type": "tool_result", "tool_use_id": b["id"], "content": "Not run: the reply stopped first.", "is_error": True})
            meta.setdefault("tools", {})[b["id"]] = {"status": "denied"}


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
        raw = model.get("raw") or {"id": model["id"]}
        req = harness.build_compaction(history, raw, settings, account(), provider.accepts, provider, tools.definitions(settings, raw), str(tools.workspace(conversation_id)), projects.context(conversation_id))
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
