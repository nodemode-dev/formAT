import json
import logging
import os
import shutil
import subprocess
import threading
import time
from pathlib import Path

from app import providers
from app.engine import events, projects, skills, tools, uploads
from app.engine.cmd_account import account
from app.engine.cmd_message import messages_of, update
from app.engine.cmd_settings import current
from app.engine.cmd_settings import set_ as set_setting
from app.engine.commands import command
from app.harness import content

log = logging.getLogger("format.claude_code")
KEEP_ENV = {"CLAUDE_CODE_OAUTH_TOKEN", "CLAUDE_CODE_USE_BEDROCK", "CLAUDE_CODE_USE_VERTEX", "CLAUDE_CONFIG_DIR"}
CANDIDATES = (".claude/local/claude", ".local/bin/claude", ".npm-global/bin/claude", ".bun/bin/claude", ".volta/bin/claude")
SYSTEM_PATHS = ("/opt/homebrew/bin/claude", "/usr/local/bin/claude", "/usr/bin/claude")
ALLOW_NAMES = {"Bash": "bash", "Write": "write", "Edit": "edit", "MultiEdit": "edit", "NotebookEdit": "edit"}
FILE_TOOLS = {"Bash", "Write", "Edit", "MultiEdit", "NotebookEdit"}
MODES = {"ask": "manual", "auto": "acceptEdits", "plan": "plan"}
FLUSH_SECONDS = 0.04
NOTE = ("You are answering in Format, a chat window on the person's computer, not in a terminal. Your text is shown as Markdown. "
        "Your working directory is this chat's own folder; files you write there appear in the chat's files pane.")
_cache: dict = {"at": 0.0, "value": None}


VIEW_NAMES = {"Bash": "bash", "Read": "read", "Write": "write", "Edit": "edit", "MultiEdit": "edit", "NotebookEdit": "edit", "Glob": "glob", "Grep": "grep",
              "WebSearch": "web_search", "WebFetch": "web_fetch", "Task": "spawn_agent", "Agent": "spawn_agent", "TodoWrite": "task_list", "AskUserQuestion": "ask_user"}


def view_of(name: str, inp: dict) -> tuple[str, dict]:
    short = VIEW_NAMES.get(name)
    if short is None:
        return name, inp
    out = dict(inp)
    if "file_path" in inp or "notebook_path" in inp:
        out["path"] = inp.get("file_path") or inp.get("notebook_path")
    if short == "spawn_agent":
        out["title"], out["task"] = inp.get("description") or "", inp.get("prompt") or ""
    elif short == "task_list":
        out["tasks"] = [{"title": t.get("content") or t.get("subject") or "", "status": t.get("status") or "pending"} for t in inp.get("todos") or [] if isinstance(t, dict)]
    elif short == "ask_user":
        first = (inp.get("questions") or [{}])[0]
        out |= {"question": first.get("question", ""), "options": first.get("options") or [], "multiSelect": bool(first.get("multiSelect"))}
    return short, out


def child_env() -> dict:
    return {k: v for k, v in os.environ.items() if not k.startswith("CLAUDE") or k in KEEP_ENV}


def cli() -> str | None:
    found = os.environ.get("FORMAT_CLAUDE_BIN") or shutil.which("claude")
    if found:
        return found
    home = Path.home()
    for p in [home / c for c in CANDIDATES] + [Path(s) for s in SYSTEM_PATHS]:
        if p.is_file() and os.access(p, os.X_OK):
            return str(p)
    return None


def info(fresh: bool = False) -> dict:
    if not fresh and _cache["value"] is not None and time.time() - _cache["at"] < 60:
        return _cache["value"]
    path, version = cli(), None
    if path:
        try:
            out = subprocess.run([path, "--version"], capture_output=True, text=True, timeout=15, env=child_env())
            version = (out.stdout.strip().split() or [None])[0]
        except (OSError, subprocess.SubprocessError):
            path = None
    _cache["value"], _cache["at"] = {"installed": bool(path), "path": path, "version": version}, time.time()
    return _cache["value"]


def route(settings: dict) -> str:
    choice = settings.get("chatEngine", "auto")
    if choice == "api" or (choice == "auto" and providers.get("anthropic").configured()):
        return "api"
    if info()["installed"]:
        return "claude-code"
    if choice == "claude-code":
        raise providers.ProviderError("Claude Code is not installed: install it from https://claude.com/claude-code, sign in once with `claude`, then send again", 400)
    return "api"


@command("claudecode.status", "Claude Code", mutates=False,
         description="Whether the Claude Code CLI is installed (its path and version) and which engine answers chats now: api (the Anthropic API key) or claude-code (the person's own Claude Code sign-in).")
def status() -> dict:
    found = info(fresh=True)
    try:
        now = route(current())
    except providers.ProviderError:
        now = None
    return found | {"route": now, "chatEngine": current().get("chatEngine", "auto")}


def _previous_session(path: list[dict]) -> str | None:
    for m in reversed(path[:-1]):
        if m["role"] == "assistant":
            return ((m.get("meta") or {}).get("claudeCode") or {}).get("session")
    return None


def _transcript(path: list[dict]) -> str:
    lines = []
    for m in path[:-1]:
        text = "\n".join(b.get("text") or "" for b in m["content"] if b.get("type") == "text").strip()
        if text:
            lines.append(f"{'The person' if m['role'] == 'user' else 'You'}: {text}")
    if not lines:
        return ""
    return "The conversation so far, from before this session:\n\n" + "\n\n".join(lines) + "\n\nThe person's new message follows.\n\n"


def _prompt(path: list[dict], resumed: bool) -> list[dict]:
    last = path[-1]
    meta = last.get("meta") or {}
    parts: list[dict] = []
    lead = "" if resumed else _transcript(path)
    files = []
    for fid in meta.get("attachments", []):
        up = uploads.get(fid)
        if up:
            files.append(f"- {up['name']} ({up['kind']}, {up['size']} bytes): {up.get('unzipped') or up['path']}")
    if files:
        lead += "The person attached these files; read them with your tools:\n" + "\n".join(files) + "\n\n"
    parts.extend(content.comment_blocks(meta.get("comments")))
    parts.extend(skills.invocation_blocks("\n".join(b.get("text") or "" for b in last["content"] if b.get("type") == "text"), with_folder=True))
    for b in last["content"]:
        if b.get("type") == "text" and b.get("text"):
            parts.append({"type": "text", "text": b["text"]})
        elif b.get("type") == "image":
            parts.append(b)
    if lead:
        parts.insert(0, {"type": "text", "text": lead.rstrip()})
    return parts or [{"type": "text", "text": "(empty message)"}]


def _system(conversation_id: str) -> str:
    parts = [NOTE]
    prefs = (account().get("preferences") or "").strip()
    if prefs:
        parts.append("The person's preferences:\n" + prefs)
    project = projects.context(conversation_id)
    if project and (project.get("instructions") or "").strip():
        parts.append(f"Instructions of the project \"{project['name']}\":\n{project['instructions'].strip()}")
    if project and project.get("files"):
        names = [f"- {u['name']}: {u['path']}" for u in (uploads.get(f) for f in project["files"]) if u]
        parts.append("The project's knowledge files, readable with your tools:\n" + "\n".join(names))
    found = skills.enabled()
    if found:
        parts.append("The person's skills installed in Format, each a folder with a SKILL.md: when a task matches a skill's description, read its SKILL.md with your Read tool first and follow it. A message may name one as /name or \"use the name skill\".\n"
                     + "\n".join(f"- {s['name']} ({skills.root() / s['name']}): {s['description']}" for s in found))
    return "\n\n".join(parts)


def _text_of(c) -> str:
    if isinstance(c, str):
        return c
    if isinstance(c, list):
        return "\n".join(str(x.get("text") or "") for x in c if isinstance(x, dict) and x.get("type") == "text")
    return ""


def run(conversation_id: str, mid: str, model: dict, settings: dict, cancel: threading.Event) -> None:
    from app.engine import chat
    blocks: list[dict] = []
    meta: dict = {"model": model["id"], "status": "streaming", "effort": settings.get("effort"), "via": "claude-code", "tools": {}}
    pending: dict[int, str] = {}
    partial: dict[int, str] = {}
    names: dict[str, str] = {}
    last = [time.monotonic()]
    base = [0]
    proc: subprocess.Popen | None = None
    err_tail: list[str] = []

    def flush() -> None:
        for index, text in pending.items():
            events.publish("message.delta", id=mid, conversationId=conversation_id, index=index, kind=blocks[index]["type"], text=text)
        pending.clear()
        last[0] = time.monotonic()

    def publish(i: int) -> None:
        events.publish("message.block", id=mid, conversationId=conversation_id, index=i, block=chat.tool_view(blocks[i], meta))

    def status_of(tid: str, value: str) -> None:
        chat._set_status(conversation_id, mid, meta, tid, value)

    def send(obj: dict) -> None:
        if proc and proc.stdin and not proc.stdin.closed:
            try:
                proc.stdin.write(json.dumps(obj) + "\n")
                proc.stdin.flush()
            except (BrokenPipeError, ValueError):
                pass

    def respond(request_id: str, body: dict) -> None:
        send({"type": "control_response", "response": {"subtype": "success", "request_id": request_id, "response": body}})

    def tool_id_for(req: dict) -> str:
        tid = req.get("tool_use_id")
        if tid:
            return tid
        done = {b.get("tool_use_id") for b in blocks if b.get("type") == "tool_result"}
        for b in reversed(blocks):
            if b.get("type") == "tool_use" and (b.get("ccName") or b.get("name")) == req.get("tool_name") and b.get("id") not in done:
                return b["id"]
        return f"cc_{int(time.time() * 1000)}"

    def ask_questions(tid: str, inp: dict) -> dict | None:
        answers = {}
        for q in inp.get("questions") or []:
            card = {"question": q.get("question", ""), "options": [{"label": o.get("label", ""), "description": o.get("description", "")} for o in q.get("options") or []],
                    "multiSelect": bool(q.get("multiSelect"))}
            status_of(tid, "asking")
            update(mid, blocks, meta)
            events.publish("tool.question", conversationId=conversation_id, messageId=mid, toolUseId=tid, input=card)
            got = tools.wait_for_answer(conversation_id, mid, {"id": tid, "name": "ask_user", "input": card}, cancel)
            if got is None:
                return None
            chosen = got if isinstance(got, list) else [got]
            meta.setdefault("answers", {})[tid] = chosen
            answers[q.get("question", "")] = ", ".join(str(c) for c in chosen)
        return inp | {"answers": answers}

    def can_use(request_id: str, req: dict) -> None:
        name, inp = req.get("tool_name") or "", req.get("input") or {}
        tid = tool_id_for(req)
        mode = current().get("permissionMode", "ask")
        if name == "AskUserQuestion":
            got = ask_questions(tid, inp)
            if got is None:
                return respond(request_id, {"behavior": "deny", "message": "The person did not answer.", "interrupt": cancel.is_set()})
            status_of(tid, "running")
            return respond(request_id, {"behavior": "allow", "updatedInput": got})
        if name == "ExitPlanMode" or mode == "plan":
            status_of(tid, "denied")
            return respond(request_id, {"behavior": "deny", "message": "Plan mode is on in Format: describe the plan and the person will switch modes to carry it out."})
        short = ALLOW_NAMES.get(name, name)
        if mode == "auto" or short in (current().get("toolAllow") or []) or tools.chat_allowed(conversation_id):
            status_of(tid, "running")
            return respond(request_id, {"behavior": "allow", "updatedInput": inp})
        if short in (current().get("toolDeny") or []):
            status_of(tid, "denied")
            return respond(request_id, {"behavior": "deny", "message": f"The person does not allow {name} in Format."})
        status_of(tid, "waiting")
        update(mid, blocks, meta)
        shown, shown_input = view_of(name, inp)
        answer = tools.wait_for_approval(conversation_id, mid, {"id": tid, "name": shown, "input": shown_input}, cancel)
        if answer == "always" and short in ALLOW_NAMES.values():
            allowed = list(current().get("toolAllow") or [])
            if short not in allowed:
                set_setting("toolAllow", allowed + [short])
        if answer in ("allow", "always"):
            status_of(tid, "running")
            return respond(request_id, {"behavior": "allow", "updatedInput": inp})
        status_of(tid, "denied")
        respond(request_id, {"behavior": "deny", "message": f"The person declined this {name} call. Do not retry it the same way; say what you would have done instead.", "interrupt": cancel.is_set()})

    def on_stream(e: dict) -> None:
        t = e.get("type")
        if t == "message_start":
            base[0] = len(blocks)
            meta["usage"] = (e.get("message") or {}).get("usage")
        elif t == "content_block_start":
            i = base[0] + int(e.get("index") or 0)
            block = {k: v for k, v in (e.get("content_block") or {}).items() if k != "caller"}
            if block.get("type") == "text":
                block["text"] = block.get("text", "")
            if block.get("type") == "thinking":
                block.setdefault("thinking", "")
            if block.get("type") == "tool_use":
                original = str(block.get("name") or "")
                names[block.get("id")] = original
                if original in VIEW_NAMES:
                    block |= {"name": VIEW_NAMES[original], "ccName": original}
            while len(blocks) <= i:
                blocks.append({"type": "text", "text": ""})
            blocks[i] = block
            flush()
            publish(i)
        elif t == "content_block_delta":
            i = base[0] + int(e.get("index") or 0)
            d = e.get("delta") or {}
            if i >= len(blocks):
                return
            if d.get("type") in ("text_delta", "thinking_delta"):
                key = "text" if d["type"] == "text_delta" else "thinking"
                piece = d.get(key) or ""
                blocks[i][key] = blocks[i].get(key, "") + piece
                pending[i] = pending.get(i, "") + piece
                if time.monotonic() - last[0] > FLUSH_SECONDS:
                    flush()
            elif d.get("type") == "signature_delta":
                blocks[i]["signature"] = blocks[i].get("signature", "") + (d.get("signature") or "")
            elif d.get("type") == "input_json_delta":
                partial[i] = partial.get(i, "") + (d.get("partial_json") or "")
        elif t == "content_block_stop":
            i = base[0] + int(e.get("index") or 0)
            if i in partial:
                try:
                    raw = json.loads(partial.pop(i) or "{}")
                except ValueError:
                    raw = {}
                shown, shown_input = view_of(blocks[i].get("ccName") or blocks[i].get("name") or "", raw if isinstance(raw, dict) else {})
                blocks[i] |= {"name": shown, "input": shown_input}
                publish(i)
        elif t == "message_delta":
            meta["stopReason"] = (e.get("delta") or {}).get("stop_reason")
            meta["usage"] = {**(meta.get("usage") or {}), **{k: v for k, v in (e.get("usage") or {}).items() if v is not None}}

    def on_agent(parent: str, message: dict) -> None:
        if parent not in meta.setdefault("agents", {}):
            call = next((x for x in blocks if x.get("id") == parent), {})
            meta["agents"][parent] = {"model": model["id"], "title": str((call.get("input") or {}).get("description") or "")[:80], "blocks": []}
        record = meta["agents"][parent]
        for b in message.get("content") or []:
            if not isinstance(b, dict) or b.get("type") not in ("text", "tool_use", "tool_result"):
                continue
            if b["type"] == "tool_result":
                b = {"type": "tool_result", "tool_use_id": b.get("tool_use_id"), "content": _text_of(b.get("content"))[:20_000], "is_error": bool(b.get("is_error"))}
            elif b["type"] == "tool_use":
                shown, shown_input = view_of(str(b.get("name") or ""), b.get("input") or {})
                b = {"type": "tool_use", "id": b.get("id"), "name": shown, "input": shown_input}
            record["blocks"].append(b)
            view = chat._agent_view(b, meta)
            events.publish("message.block", id=mid, conversationId=conversation_id, index=len(record["blocks"]) - 1, parent=parent, block=view)

    def on_results(message: dict) -> None:
        for b in message.get("content") or []:
            if not isinstance(b, dict) or b.get("type") != "tool_result":
                continue
            tid = b.get("tool_use_id")
            result = {"type": "tool_result", "tool_use_id": tid, "content": _text_of(b.get("content"))[:30_000], "is_error": bool(b.get("is_error"))}
            blocks.append(result)
            if (meta["tools"].get(tid) or {}).get("status") != "denied":
                status_of(tid, "error" if result["is_error"] else "done")
            publish(len(blocks) - 1)
            if names.get(tid) in FILE_TOOLS:
                events.publish("files.changed", conversationId=conversation_id)
        update(mid, blocks, meta)

    path = messages_of(conversation_id)
    path = [m for m in path if m["id"] != mid]
    session = _previous_session(path)
    folder = str(tools.workspace(conversation_id))
    found = info()
    args = [found["path"] or "claude", "-p", "--input-format", "stream-json", "--output-format", "stream-json", "--verbose", "--include-partial-messages",
            "--permission-prompt-tool", "stdio", "--model", model["id"], "--permission-mode", MODES.get(settings.get("permissionMode", "ask"), "manual"),
            "--append-system-prompt", _system(conversation_id), "--add-dir", str(uploads.root()), "--add-dir", str(skills.root())]
    if settings.get("effort") in ("low", "medium", "high", "xhigh", "max"):
        args += ["--effort", settings["effort"]]
    from app.engine import connectors
    servers, blocked = connectors.claude_code_servers(settings.get("connectorsOff"))
    if servers:
        args += ["--mcp-config", json.dumps({"mcpServers": servers})]
    if blocked:
        args += ["--disallowedTools", *blocked]
    if session:
        args += ["--resume", session, "--fork-session"]
    meta["claudeCode"] = {"version": found.get("version"), "resumed": session}

    def watch() -> None:
        while proc.poll() is None:
            if cancel.wait(0.3):
                proc.terminate()
                return

    def drain() -> None:
        for line in proc.stderr:
            err_tail.append(line.rstrip())
            del err_tail[:-20]

    try:
        if not found["installed"]:
            raise providers.ProviderError("Claude Code is not installed: install it from https://claude.com/claude-code and sign in once with `claude`")
        proc = subprocess.Popen(args, cwd=folder, env=child_env(), stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, bufsize=1)
        threading.Thread(target=drain, daemon=True).start()
        threading.Thread(target=watch, daemon=True).start()
        send({"type": "control_request", "request_id": "format-init", "request": {"subtype": "initialize", "hooks": None}})
        send({"type": "user", "message": {"role": "user", "content": _prompt(path, bool(session))}, "parent_tool_use_id": None, "session_id": ""})
        result: dict | None = None
        for line in proc.stdout:
            try:
                ev = json.loads(line)
            except ValueError:
                continue
            t = ev.get("type")
            parent = ev.get("parent_tool_use_id")
            if t == "stream_event":
                if not parent:
                    on_stream(ev.get("event") or {})
            elif t == "assistant" and parent:
                on_agent(parent, ev.get("message") or {})
            elif t == "user":
                if parent:
                    on_agent(parent, ev.get("message") or {})
                else:
                    flush()
                    on_results(ev.get("message") or {})
            elif t == "system" and ev.get("subtype") == "init":
                meta["claudeCode"] |= {"session": ev.get("session_id"), "model": ev.get("model")}
            elif t == "system" and ev.get("subtype") == "permission_denied" and ev.get("tool_use_id"):
                status_of(ev["tool_use_id"], "denied")
            elif t == "control_request":
                req = ev.get("request") or {}
                if req.get("subtype") == "can_use_tool":
                    threading.Thread(target=can_use, args=(ev.get("request_id"), req), daemon=True).start()
                else:
                    respond(ev.get("request_id"), {})
            elif t == "result":
                result = ev
                break
        flush()
        if proc.stdin and not proc.stdin.closed:
            proc.stdin.close()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.terminate()
        if cancel.is_set():
            meta["status"], meta["stopReason"] = "stopped", "stopped_by_person"
        elif result is None:
            tail = " ".join(err_tail[-3:]).strip()
            raise providers.ProviderError(f"Claude Code stopped without a reply{': ' + tail if tail else ''}")
        else:
            meta["claudeCode"] |= {"session": result.get("session_id") or meta["claudeCode"].get("session"), "costUsd": result.get("total_cost_usd"), "turns": result.get("num_turns")}
            if result.get("usage"):
                meta["usage"] = result["usage"]
            if result.get("is_error") or result.get("subtype") not in (None, "success"):
                text = str(result.get("result") or result.get("subtype") or "error")
                hint = " Open a terminal, run `claude` and sign in with /login, then send again." if "login" in text.lower() or "api key" in text.lower() else ""
                meta["status"], meta["error"] = "error", f"Claude Code: {text}{hint}"
            else:
                meta["status"] = "done"
    except providers.ProviderError as exc:
        flush()
        meta["status"], meta["error"] = "error", str(exc)
    except Exception as exc:
        log.exception("claude code run failed")
        flush()
        meta["status"], meta["error"] = "error", f"{type(exc).__name__}: {exc}"
    finally:
        if proc and proc.poll() is None:
            proc.terminate()
        chat._close_open_calls(blocks, meta)
        message = update(mid, blocks, meta)
        chat.RUNS.pop(conversation_id, None)
        events.publish("message.completed", message=message)
