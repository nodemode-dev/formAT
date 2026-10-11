import fnmatch
import json
import mimetypes
import os
import re
import shutil
import subprocess
import threading
import time
from pathlib import Path

from app.core import config
from app.engine import events

READ_ONLY = {"read", "glob", "grep", "task_list", "send_file", "ask_user", "spawn_agent", "publish_artifact"}
AGENT_EXCLUDED = {"spawn_agent", "ask_user", "send_file", "task_list", "publish_artifact"}
TASK_STATES = ("pending", "in_progress", "completed")
OUTPUT_CAP = 30_000
READ_CAP = 200_000
BASH_TIMEOUT = 120
BASH_TIMEOUT_MAX = 600
WEB_SEARCH = {"type": "web_search_20260318", "name": "web_search"}
WEB_FETCH = {"type": "web_fetch_20260318", "name": "web_fetch"}

DEFINITIONS = [
    {"name": "bash", "description": "Run a shell command in this chat's workspace folder and return its output (stdout and stderr together, the last 30,000 characters). Use it to run scripts, install packages for the project, or inspect the system. Each call is a fresh shell started in the workspace folder.",
     "input_schema": {"type": "object", "properties": {"command": {"type": "string", "description": "The command line to run"},
                                                        "timeout": {"type": "integer", "description": "Seconds before the command is stopped, default 120, at most 600"}},
                      "required": ["command"]}},
    {"name": "read", "description": "Read a text file in the workspace folder, with line numbers. Use offset and limit for long files.",
     "input_schema": {"type": "object", "properties": {"path": {"type": "string", "description": "Path relative to the workspace folder"},
                                                        "offset": {"type": "integer", "description": "First line to read, 1-based"},
                                                        "limit": {"type": "integer", "description": "Number of lines to read"}},
                      "required": ["path"]}},
    {"name": "write", "description": "Create a file in the workspace folder, or replace one entirely. Folders are created as needed.",
     "input_schema": {"type": "object", "properties": {"path": {"type": "string", "description": "Path relative to the workspace folder"},
                                                        "content": {"type": "string", "description": "The whole new content of the file"}},
                      "required": ["path", "content"]}},
    {"name": "edit", "description": "Replace one exact passage in a workspace file. old_string must occur exactly once in the file; include enough surrounding text to make it unique.",
     "input_schema": {"type": "object", "properties": {"path": {"type": "string"}, "old_string": {"type": "string"}, "new_string": {"type": "string"}},
                      "required": ["path", "old_string", "new_string"]}},
    {"name": "glob", "description": "List workspace files matching a glob pattern such as **/*.py, newest first, at most 500.",
     "input_schema": {"type": "object", "properties": {"pattern": {"type": "string"}}, "required": ["pattern"]}},
    {"name": "grep", "description": "Search workspace files for a regular expression and return matching lines as path:line: text, at most 300 matches.",
     "input_schema": {"type": "object", "properties": {"pattern": {"type": "string", "description": "A Python regular expression"},
                                                        "glob": {"type": "string", "description": "Only files matching this glob, for example *.ts"}},
                      "required": ["pattern"]}},
    {"name": "ask_user", "description": "Ask the person a multiple-choice question and wait for the answer. Use it when a choice is genuinely theirs and you cannot settle it from the conversation, not to confirm things you can decide. Give 2 to 4 short, distinct options; the person can also type their own answer.",
     "input_schema": {"type": "object", "properties": {"question": {"type": "string"},
                                                        "options": {"type": "array", "minItems": 2, "maxItems": 4, "items": {"type": "object", "properties": {"label": {"type": "string"}, "description": {"type": "string"}}, "required": ["label"]}},
                                                        "multiSelect": {"type": "boolean", "description": "Allow more than one option"}},
                      "required": ["question", "options"]}},
    {"name": "task_list", "description": "Show the person your plan as a task list and keep it current. Each call replaces the whole list. Use it for work with three or more steps: mark one task in_progress while you work on it and completed as soon as it is done.",
     "input_schema": {"type": "object", "properties": {"tasks": {"type": "array", "items": {"type": "object", "properties": {"title": {"type": "string"}, "status": {"type": "string", "enum": list(TASK_STATES)}}, "required": ["title", "status"]}}},
                      "required": ["tasks"]}},
    {"name": "spawn_agent", "description": "Hand a self-contained part of the work to a sub-agent: another Claude with the same workspace and tools (no questions to the person, no sub-agents of its own) that works through the task and returns a report. Use it for independent research or a separable piece of work; write the task so it stands alone, with every path and fact it needs. Its commands and file changes follow the same approval rules.",
     "input_schema": {"type": "object", "properties": {"task": {"type": "string", "description": "The complete task, standing alone"},
                                                        "title": {"type": "string", "description": "A few words naming the task, shown to the person"}},
                      "required": ["task"]}},
    {"name": "publish_artifact", "description": "Publish a self-contained HTML page (an app, a visualisation, a document, a small tool) that opens in a panel beside the chat for the person to use, copy or download. Put all CSS and JavaScript inline; scripts may load from cdnjs.cloudflare.com, cdn.jsdelivr.net or unpkg.com; the page has no network access otherwise. To revise a page you published, pass its artifact_id: that adds a new version and keeps the earlier ones.",
     "input_schema": {"type": "object", "properties": {"title": {"type": "string", "description": "A short name for the page"},
                                                        "html": {"type": "string", "description": "The complete HTML document"},
                                                        "artifact_id": {"type": "string", "description": "The id of an artifact from this chat to add a version to"}},
                      "required": ["title", "html"]}},
    {"name": "send_file", "description": "Give the person a file from the workspace folder: it appears in the conversation as a file card they can download, and in the Outputs panel. Use it for every file that is a deliverable, after writing it.",
     "input_schema": {"type": "object", "properties": {"path": {"type": "string", "description": "Path relative to the workspace folder"},
                                                        "caption": {"type": "string", "description": "One line of context, optional"}},
                      "required": ["path"]}},
]
NAMES = {d["name"] for d in DEFINITIONS}
SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv"}

_waits: dict[str, dict] = {}
_waits_lock = threading.Lock()


def workspace(conversation_id: str) -> Path:
    p = config.workspace_dir() / "chats" / Path(conversation_id).name
    p.mkdir(parents=True, exist_ok=True)
    return p


def definitions(settings: dict, model: dict, agent: bool = False) -> list[dict]:
    caps = (model.get("capabilities") or {}).get("server_tools") or {}
    out: list[dict] = []
    if settings.get("workspaceTools", True):
        out.extend(d for d in DEFINITIONS if not (agent and d["name"] in AGENT_EXCLUDED) and not (d["name"] == "spawn_agent" and int(settings.get("agentLimit", 4)) <= 0))
    if settings.get("webTools", True):
        if (caps.get("web_search") or {}).get("supported", True):
            out.append(dict(WEB_SEARCH))
        if (caps.get("web_fetch") or {}).get("supported", True):
            out.append(dict(WEB_FETCH))
    return out


def decision_for(name: str, settings: dict) -> str:
    mode = settings.get("permissionMode", "ask")
    if name in READ_ONLY:
        return "allow"
    if mode == "plan":
        return "plan"
    if name in (settings.get("toolDeny") or []):
        return "deny"
    if mode == "auto" or name in (settings.get("toolAllow") or []):
        return "allow"
    return "ask"


def wait_for_approval(conversation_id: str, message_id: str, block: dict, cancel: threading.Event) -> str:
    key = block["id"]
    entry = {"event": threading.Event(), "answer": None, "conversationId": conversation_id, "messageId": message_id,
             "toolUseId": key, "name": block["name"], "input": block.get("input") or {}, "since": time.time()}
    with _waits_lock:
        _waits[key] = entry
    events.publish("tool.approval", conversationId=conversation_id, messageId=message_id, toolUseId=key, name=block["name"], input=entry["input"])
    try:
        while not entry["event"].wait(0.25):
            if cancel.is_set():
                return "deny"
        return entry["answer"] or "deny"
    finally:
        with _waits_lock:
            _waits.pop(key, None)
        events.publish("tool.approval.closed", conversationId=conversation_id, messageId=message_id, toolUseId=key)


def wait_for_answer(conversation_id: str, message_id: str, block: dict, cancel: threading.Event) -> object | None:
    key = block["id"]
    entry = {"event": threading.Event(), "answer": None, "conversationId": conversation_id, "messageId": message_id,
             "toolUseId": key, "name": block["name"], "input": block.get("input") or {}, "since": time.time(), "kind": "question"}
    with _waits_lock:
        _waits[key] = entry
    try:
        while not entry["event"].wait(0.25):
            if cancel.is_set():
                return None
        return entry["answer"]
    finally:
        with _waits_lock:
            _waits.pop(key, None)


def answer(tool_use_id: str, decision: object) -> dict | None:
    with _waits_lock:
        entry = _waits.get(tool_use_id)
    if entry is None:
        return None
    entry["answer"] = decision
    entry["event"].set()
    return entry


def pending(conversation_id: str | None = None) -> list[dict]:
    with _waits_lock:
        items = list(_waits.values())
    return [{k: e[k] for k in ("conversationId", "messageId", "toolUseId", "name", "input", "since")} | {"kind": e.get("kind", "approval")}
            for e in items if conversation_id is None or e["conversationId"] == conversation_id]


def kind_of_wait(tool_use_id: str) -> str | None:
    with _waits_lock:
        e = _waits.get(tool_use_id)
    return e.get("kind", "approval") if e else None


def tasks_of(conversation_id: str) -> list[dict]:
    from app.engine import store
    row = store.row("SELECT value FROM meta WHERE key = ?", (f"tasks.{conversation_id}",))
    try:
        return json.loads(row["value"]) if row else []
    except (TypeError, ValueError):
        return []


def outputs_of(conversation_id: str) -> list[dict]:
    from app.engine import store
    row = store.row("SELECT value FROM meta WHERE key = ?", (f"outputs.{conversation_id}",))
    try:
        return json.loads(row["value"]) if row else []
    except (TypeError, ValueError):
        return []


def _save(key: str, value: object) -> None:
    from app.engine import store
    store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (key, json.dumps(value)))


def output_path(conversation_id: str, rel: str) -> Path:
    return _inside(workspace(conversation_id), rel)


class ToolError(Exception):
    pass


def _inside(root: Path, rel: str) -> Path:
    if not isinstance(rel, str) or not rel.strip():
        raise ToolError("path is empty")
    target = (root / rel).resolve() if not os.path.isabs(rel) else Path(rel).resolve()
    base = root.resolve()
    if target != base and base not in target.parents:
        raise ToolError(f"{rel} is outside the workspace folder; use a path relative to it")
    return target


def _cap(text: str, cap: int = OUTPUT_CAP) -> str:
    if len(text) <= cap:
        return text
    return f"[first {len(text) - cap} characters cut]\n" + text[-cap:]


def _files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            yield Path(dirpath) / f


def run(name: str, args: dict, conversation_id: str, on_output, cancel: threading.Event, message_id: str | None = None) -> tuple[str, bool]:
    root = workspace(conversation_id)
    try:
        if name == "bash":
            return _bash(root, args, on_output, cancel)
        if name == "task_list":
            items = args.get("tasks")
            if not isinstance(items, list) or not items:
                raise ToolError("tasks must be a non-empty list")
            tasks = []
            for t in items[:50]:
                title = str((t or {}).get("title") or "").strip()
                status = (t or {}).get("status")
                if not title or status not in TASK_STATES:
                    raise ToolError("each task needs a title and a status of pending, in_progress or completed")
                tasks.append({"title": title[:200], "status": status})
            _save(f"tasks.{conversation_id}", tasks)
            events.publish("tasks.changed", conversationId=conversation_id, tasks=tasks)
            done = sum(1 for t in tasks if t["status"] == "completed")
            return f"Task list updated: {done} of {len(tasks)} done.", False
        if name == "publish_artifact":
            from app.engine import artifacts
            try:
                a = artifacts.publish(conversation_id, message_id, str(args.get("title") or ""), args.get("html"), args.get("artifact_id") or None)
            except artifacts.ArtifactError as exc:
                raise ToolError(f"Not published: {exc}") from None
            return f"Published \"{a['title']}\" as artifact {a['id']}, version {a['version']}. The person sees it as a card in your reply and opens it beside the chat from there; to revise it, call publish_artifact again with artifact_id {a['id']}.", False
        if name == "send_file":
            path = _inside(root, args.get("path", ""))
            if not path.is_file():
                raise ToolError(f"No file {args.get('path')} in the workspace; write it first")
            rel = str(path.relative_to(root.resolve()))
            item = {"path": rel, "name": path.name, "size": path.stat().st_size, "mime": mimetypes.guess_type(path.name)[0] or "application/octet-stream",
                    "caption": str(args.get("caption") or "")[:300], "messageId": message_id, "at": time.time()}
            outputs = [o for o in outputs_of(conversation_id) if o["path"] != rel] + [item]
            _save(f"outputs.{conversation_id}", outputs)
            events.publish("outputs.changed", conversationId=conversation_id, outputs=outputs)
            return f"Sent {rel} ({item['size']} bytes) to the person; it shows as a file card they can download.", False
        if name == "read":
            path = _inside(root, args.get("path", ""))
            if not path.is_file():
                raise ToolError(f"No file {args.get('path')} in the workspace")
            lines = path.read_text(encoding="utf-8", errors="replace").splitlines()
            start = max(1, int(args.get("offset") or 1))
            count = int(args.get("limit") or 2000)
            chunk = lines[start - 1:start - 1 + count]
            body = "\n".join(f"{i:>6}\t{line}" for i, line in enumerate(chunk, start))
            more = f"\n[{len(lines) - (start - 1 + len(chunk))} more lines]" if start - 1 + len(chunk) < len(lines) else ""
            return _cap(body, READ_CAP) + more or "(empty file)", False
        if name == "write":
            path = _inside(root, args.get("path", ""))
            content = args.get("content")
            if not isinstance(content, str):
                raise ToolError("content must be a string")
            path.parent.mkdir(parents=True, exist_ok=True)
            existed = path.exists()
            path.write_text(content, encoding="utf-8")
            return f"{'Replaced' if existed else 'Created'} {path.relative_to(root.resolve())} ({len(content.encode())} bytes)", False
        if name == "edit":
            path = _inside(root, args.get("path", ""))
            if not path.is_file():
                raise ToolError(f"No file {args.get('path')} in the workspace")
            old, new = args.get("old_string"), args.get("new_string")
            if not isinstance(old, str) or not old or not isinstance(new, str):
                raise ToolError("old_string must be non-empty text and new_string text")
            text = path.read_text(encoding="utf-8")
            hits = text.count(old)
            if hits != 1:
                raise ToolError(f"old_string occurs {hits} times in {args.get('path')}; it must occur exactly once")
            path.write_text(text.replace(old, new, 1), encoding="utf-8")
            return f"Edited {path.relative_to(root.resolve())}: one passage replaced", False
        if name == "glob":
            pattern = str(args.get("pattern") or "*")
            found = [p for p in _files(root) if fnmatch.fnmatch(str(p.relative_to(root)), pattern) or fnmatch.fnmatch(p.name, pattern)]
            found.sort(key=lambda p: p.stat().st_mtime, reverse=True)
            return "\n".join(str(p.relative_to(root)) for p in found[:500]) or "No files match", False
        if name == "grep":
            try:
                rx = re.compile(str(args.get("pattern") or ""))
            except re.error as exc:
                raise ToolError(f"Not a valid regular expression: {exc}") from None
            only = args.get("glob")
            out: list[str] = []
            for p in _files(root):
                if only and not fnmatch.fnmatch(p.name, only):
                    continue
                try:
                    for i, line in enumerate(p.read_text(encoding="utf-8").splitlines(), 1):
                        if rx.search(line):
                            out.append(f"{p.relative_to(root)}:{i}: {line[:300]}")
                            if len(out) >= 300:
                                break
                except (UnicodeDecodeError, OSError):
                    continue
                if len(out) >= 300:
                    break
            return "\n".join(out) or "No matches", False
        raise ToolError(f"Unknown tool {name}")
    except ToolError as exc:
        return str(exc), True
    except OSError as exc:
        return f"{type(exc).__name__}: {exc}", True


def _bash(root: Path, args: dict, on_output, cancel: threading.Event) -> tuple[str, bool]:
    command = args.get("command")
    if not isinstance(command, str) or not command.strip():
        raise ToolError("command is empty")
    timeout = max(1, min(BASH_TIMEOUT_MAX, int(args.get("timeout") or BASH_TIMEOUT)))
    shell = os.environ.get("SHELL") or shutil.which("bash") or "/bin/sh"
    argv = ["cmd.exe", "/c", command] if os.name == "nt" else [shell, "-lc", command]
    env = dict(os.environ, FORMAT_WORKSPACE=str(root))
    proc = subprocess.Popen(argv, cwd=root, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, stdin=subprocess.DEVNULL, env=env,
                            start_new_session=os.name != "nt")
    chunks: list[str] = []
    done = threading.Event()

    def pump() -> None:
        assert proc.stdout is not None
        for raw in iter(lambda: proc.stdout.read1(4096) if hasattr(proc.stdout, "read1") else proc.stdout.read(4096), b""):
            text = raw.decode("utf-8", errors="replace")
            chunks.append(text)
            on_output(text)
        done.set()

    threading.Thread(target=pump, daemon=True).start()
    started, reason = time.monotonic(), None
    while proc.poll() is None:
        if cancel.is_set():
            reason = "stopped"
        elif time.monotonic() - started > timeout:
            reason = f"timed out after {timeout} s"
        if reason:
            _kill(proc)
            break
        time.sleep(0.05)
    done.wait(2)
    output = _cap("".join(chunks))
    code = proc.wait()
    if reason:
        return f"{output}\n[command {reason}]".strip(), True
    return (output if output.strip() else "(no output)") + (f"\n[exit code {code}]" if code else ""), code != 0


def _kill(proc: subprocess.Popen) -> None:
    try:
        if os.name != "nt":
            os.killpg(proc.pid, 15)
        else:
            proc.terminate()
        proc.wait(3)
    except Exception:
        try:
            proc.kill()
        except Exception:
            pass
