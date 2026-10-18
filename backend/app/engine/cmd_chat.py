import json
import time

from app.engine import chat, events, store, tools, uploads
from app.engine.cmd_message import ROOT, deepest, insert, messages_of, set_leaf
from app.engine.commands import CommandError, command


@command("chat.send", "Send a message",
         {"text": {"type": "string", "required": True}, "conversationId": {"type": "string", "description": "omit to start a new chat"},
          "attachments": {"type": "array", "items": {"type": "string"}, "description": "file ids from POST /api/uploads"},
          "comments": {"type": "array", "items": {"type": "object"}, "description": "comments on files in the chat's folder: {path, quote, note}, up to 20"},
          "projectId": {"type": "string", "description": "with no conversationId: start the new chat inside this project"},
          "title": {"type": "string", "description": "with no conversationId: the new chat's title (default: the first line of text)"},
          "connectorsOff": {"type": "array", "items": {"type": "string"}, "description": "with no conversationId: connector ids turned off for the new chat (the toggles under + then Connectors before the first message)"},
          "research": {"type": "boolean", "description": "Research mode for this message: Claude plans, searches and reads many sources, and writes a cited report (web tools on, high effort)"},
          "output": {"type": "string", "enum": ["doc", "sheet", "deck"], "description": "Ask for the answer as a document, spreadsheet or slide deck beside the chat (the composer's Create picker)"}},
         description="Stores the message (with its attachments and comments on the chat's files) and starts Claude's reply, which streams as message.delta events. Returns the chat id, the user message and the reply's id; read the finished reply with conversation.get or chat.wait.")
def send(text: str, conversationId: str | None = None, attachments: list | None = None, comments: list | None = None, projectId: str | None = None, title: str | None = None,
         research: bool | None = None, output: str | None = None, connectorsOff: list | None = None) -> dict:
    notes = _comments(comments)
    if connectorsOff is not None and (not isinstance(connectorsOff, list) or any(not isinstance(x, str) for x in connectorsOff)):
        raise CommandError("chat.send: connectorsOff takes a list of connector ids")
    if projectId and store.row("SELECT id FROM projects WHERE id = ?", (projectId,)) is None:
        raise CommandError(f"No project {projectId}; project.list gives the ids", 404)
    if not text.strip() and not attachments and not notes:
        raise CommandError("chat.send: text is empty")
    if notes and conversationId is None:
        raise CommandError("chat.send: comments refer to a chat's files; pass its conversationId")
    files = []
    for fid in attachments or []:
        meta = uploads.get(str(fid))
        if meta is None:
            raise CommandError(f"chat.send: no uploaded file {fid}", 404)
        files.append(uploads.public(meta))
    if conversationId is None:
        title = ((title or "").strip() or text.strip().split("\n")[0] or (files[0]["name"] if files else "New chat"))[:60]
        cid, t = store.new_id(), store.now()
        known = {r["id"] for r in store.rows("SELECT id FROM connectors")}
        off = sorted({x for x in connectorsOff or [] if x in known})
        store.run("INSERT INTO conversations(id, title, project_id, created, updated, connectors_off) VALUES (?, ?, ?, ?, ?, ?)", (cid, title, projectId or None, t, t, json.dumps(off)))
        conv = store.row("SELECT * FROM conversations WHERE id = ?", (cid,)) or {}
        conv["pinned"] = bool(conv.get("pinned"))
        conv["allow_all"] = bool(conv.get("allow_all"))
        conv["connectors_off"] = off
        events.publish("conversation.created", conversation=conv)
        if projectId:
            from app.engine import projects
            events.publish("project.changed", project=projects.summary(store.row("SELECT * FROM projects WHERE id = ?", (projectId,)) or {}))
        conversationId = cid
    elif store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it or wait", 409)
    content = [{"type": "text", "text": text}] if text.strip() else []
    meta = {"attachments": [f["id"] for f in files], "files": files} | ({"comments": notes} if notes else {}) | ({"research": True} if research else {}) | ({"output": output} if output else {})
    user = insert(conversationId, "user", content, meta)
    events.publish("message.added", message=user)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "message": user, "replyId": reply["id"]}


def _comments(raw: list | None) -> list[dict]:
    if not raw:
        return []
    if not isinstance(raw, list) or len(raw) > 20:
        raise CommandError("chat.send: comments takes a list of up to 20 {path, quote, note}")
    out = []
    for c in raw:
        if not isinstance(c, dict) or not isinstance(c.get("note"), str) or not c["note"].strip() or not isinstance(c.get("path"), str) or not c["path"].strip():
            raise CommandError("chat.send: each comment needs a path and a note")
        out.append({"path": c["path"].strip()[:500], "quote": str(c.get("quote") or "")[:2000], "note": c["note"].strip()[:4000]})
    return out


@command("chat.stop", "Stop the reply", {"conversationId": {"type": "string", "required": True}},
         description="Stops a running reply; what was written so far is kept.")
def stop(conversationId: str) -> dict:
    return {"stopped": chat.stop(conversationId)}


@command("chat.retry", "Retry the last reply", {"conversationId": {"type": "string", "required": True}},
         description="Deletes the last reply (if it is Claude's) and asks again with the same history and current settings.")
def retry(conversationId: str) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat", 409)
    msgs = messages_of(conversationId)
    if not msgs:
        raise CommandError("chat.retry: the chat is empty")
    if msgs[-1]["role"] == "assistant":
        store.run("DELETE FROM messages WHERE id = ?", (msgs[-1]["id"],))
        set_leaf(conversationId, msgs[-1]["parent_id"])
        events.publish("message.deleted", id=msgs[-1]["id"], conversationId=conversationId)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "replyId": reply["id"]}


def _publish_path(conversationId: str) -> list[dict]:
    msgs = messages_of(conversationId)
    events.publish("conversation.path", conversationId=conversationId, messages=msgs)
    return msgs


@command("chat.edit", "Edit a message",
         {"conversationId": {"type": "string", "required": True}, "text": {"type": "string", "required": True},
          "messageId": {"type": "string", "description": "one of the person's messages on the current path; omit for the most recent"}},
         description="Adds the edited text as a new version of one of the person's messages (keeping its attachments) and asks again from there. The earlier version and everything after it stay as a branch; chat.branch switches between versions.")
def edit(conversationId: str, text: str, messageId: str | None = None) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it first", 409)
    if not text.strip():
        raise CommandError("chat.edit: text is empty")
    msgs = messages_of(conversationId)
    users = [m for m in msgs if m["role"] == "user"]
    old = next((m for m in users if m["id"] == messageId), None) if messageId else (users[-1] if users else None)
    if old is None:
        raise CommandError("chat.edit: no message of yours with that id on the current path" if messageId else "chat.edit: there is no message of yours to edit", 404 if messageId else 400)
    meta = {k: v for k, v in (old.get("meta") or {}).items() if k in ("attachments", "files", "comments")} | {"edited": True}
    user = insert(conversationId, "user", [{"type": "text", "text": text}], meta, old["parent_id"] if old["parent_id"] else ROOT)
    _publish_path(conversationId)
    reply = chat.start(conversationId)
    return {"conversationId": conversationId, "message": user, "replyId": reply["id"]}


@command("chat.branch", "Show another version",
         {"conversationId": {"type": "string", "required": True}, "messageId": {"type": "string", "required": True, "description": "a version from a message's branch ids"}},
         description="Switches the chat to another version of an edited message and the newest conversation that follows it. Returns the messages on the new path.")
def branch(conversationId: str, messageId: str) -> dict:
    if chat.running(conversationId):
        raise CommandError("A reply is still running in this chat; chat.stop it first", 409)
    if store.row("SELECT id FROM messages WHERE id = ? AND conversation_id = ?", (messageId, conversationId)) is None:
        raise CommandError(f"chat.branch: no message {messageId} in this chat", 404)
    set_leaf(conversationId, deepest(conversationId, messageId))
    return {"conversationId": conversationId, "messages": _publish_path(conversationId)}


@command("tool.approve", "Answer a tool approval",
         {"toolUseId": {"type": "string", "required": True}, "decision": {"type": "string", "required": True, "enum": ["allow", "always", "deny"]}},
         description="Answers a waiting approval card: allow runs this call, always also allows the tool from now on (setting toolAllow), deny declines it and Claude is told so. tool.pending lists what is waiting.")
def approve(toolUseId: str, decision: str) -> dict:
    if decision not in ("allow", "always", "deny"):
        raise CommandError("tool.approve: decision is allow, always or deny")
    if tools.kind_of_wait(toolUseId) == "question":
        raise CommandError("tool.approve: that is a question; answer it with tool.answer", 409)
    entry = tools.answer(toolUseId, decision)
    if entry is None:
        raise CommandError(f"tool.approve: nothing is waiting for {toolUseId}; tool.pending lists what is", 404)
    return {"toolUseId": toolUseId, "decision": decision, "name": entry["name"]}


@command("tool.answer", "Answer Claude's question",
         {"toolUseId": {"type": "string", "required": True}, "answer": {"required": True, "description": "the chosen option label, a list of labels when the question allows several, or your own text"}},
         description="Answers a waiting question card (ask_user). tool.pending lists waiting questions with kind question.")
def answer_question(toolUseId: str, answer: object) -> dict:
    if tools.kind_of_wait(toolUseId) != "question":
        raise CommandError(f"tool.answer: no question is waiting for {toolUseId}; tool.pending lists what is", 404)
    if isinstance(answer, list):
        picked = [str(a).strip()[:500] for a in answer if str(a).strip()]
        if not picked:
            raise CommandError("tool.answer: the answer is empty")
        value: object = picked
    else:
        value = str(answer or "").strip()[:2000]
        if not value:
            raise CommandError("tool.answer: the answer is empty")
    tools.answer(toolUseId, value)
    return {"toolUseId": toolUseId, "answer": value}


@command("tasks.get", "Task list", {"conversationId": {"type": "string", "required": True}}, mutates=False,
         description="The chat's task list as Claude last set it with task_list: titles with pending, in_progress or completed.")
def tasks_get(conversationId: str) -> dict:
    return {"conversationId": conversationId, "tasks": tools.tasks_of(conversationId)}


@command("outputs.list", "Outputs", {"conversationId": {"type": "string", "required": True}}, mutates=False,
         description="Files Claude sent in this chat (send_file) with their download paths, and what was used in the session: uploads, web searches and fetches, commands, files changed.")
def outputs_list(conversationId: str) -> dict:
    used = {"uploads": 0, "web_search": 0, "web_fetch": 0, "bash": 0, "files": 0, "connectors": 0}
    for m in messages_of(conversationId):
        used["uploads"] += len((m.get("meta") or {}).get("attachments") or [])
        for b in m["content"]:
            n = b.get("name")
            if b.get("type") == "mcp_tool_use" or (b.get("type") == "tool_use" and str(n).startswith("mcp__")):
                used["connectors"] += 1
            elif b.get("type") in ("tool_use", "server_tool_use") and n:
                if n in ("web_search", "web_fetch", "bash"):
                    used[n] += 1
                elif n in ("write", "edit"):
                    used["files"] += 1
    files = [o | {"url": f"/api/chats/{conversationId}/files/{o['path']}"} for o in tools.outputs_of(conversationId)]
    return {"conversationId": conversationId, "files": files, "used": used, "zip": f"/api/chats/{conversationId}/outputs.zip" if files else None}


@command("tool.pending", "Waiting approvals", {"conversationId": {"type": "string"}}, mutates=False,
         description="Tool calls waiting for approval, in one chat or all chats, with the tool name and its input.")
def pending_approvals(conversationId: str | None = None) -> dict:
    return {"pending": tools.pending(conversationId)}


@command("chat.compact", "Summarize earlier messages", {"conversationId": {"type": "string", "required": True}},
         description="Asks Claude to summarize the chat so far (the API's compaction). The summary is kept as a message on the path and later turns start from it instead of the full history; the earlier messages stay visible. Runs like a reply: chat.wait waits for it. Also runs on its own after a reply once the chat passes compactAt of the context window, unless autoCompact is off.")
def compact(conversationId: str) -> dict:
    if store.row("SELECT id FROM conversations WHERE id = ?", (conversationId,)) is None:
        raise CommandError(f"No conversation {conversationId}; conversation.list gives the ids", 404)
    msgs = messages_of(conversationId)
    if not any(m["role"] == "assistant" and m["content"] and not (m.get("meta") or {}).get("compaction") for m in msgs):
        raise CommandError("chat.compact: there is nothing to summarize yet")
    if msgs and (msgs[-1].get("meta") or {}).get("compaction") and msgs[-1]["content"]:
        raise CommandError("chat.compact: the chat was just summarized")
    try:
        chat.start_compaction(conversationId)
    except RuntimeError as exc:
        raise CommandError(str(exc), 409) from None
    return {"conversationId": conversationId, "started": True}


@command("chat.wait", "Wait for the reply", {"conversationId": {"type": "string", "required": True}, "timeout": {"type": "number"}}, mutates=False,
         description="Waits (up to timeout seconds, default 300) for the running reply to finish and returns the last message. For agents and the CLI.")
def wait(conversationId: str, timeout: float | None = None) -> dict:
    deadline = time.time() + min(float(timeout or 300), 3600)
    while chat.running(conversationId) and time.time() < deadline:
        time.sleep(0.25)
    msgs = messages_of(conversationId)
    last = msgs[-1] if msgs else None
    text = "".join(b.get("text", "") for b in (last or {}).get("content", []) if b.get("type") == "text")
    return {"running": chat.running(conversationId), "message": last, "text": text}
