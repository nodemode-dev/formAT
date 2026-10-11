# HASHOUT_LOG · backend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the engine. Source files stay comment-free; everything they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.4.0
Last updated: 2026-10-11 · v0.4.0: the tool loop, workspace tools, web search and fetch, approvals

---

## Org-navi-map

```
backend/
├── requirements.txt               FastAPI, uvicorn, httpx, multipart (formlit's pins)
├── requirements_macos.txt         same pins today; the split exists for macOS-only wheels later
├── .env.example                   ANTHROPIC_API_KEY, OPENAI_API_KEY, FORMAT_PORT, FORMAT_DATA_DIR
├── oc_install(.bat)               venv, pip install, .env from the example
├── boot_backend(.bat)             uvicorn with reload on 127.0.0.1:8490
├── format_engine.py               entry for a frozen engine (desktop sidecar, v0.7.0)
└── app/
    ├── __init__.py                __version__
    ├── main.py                    FastAPI app, CORS, error handler, optional dist mount
    ├── core/config.py             ports, paths, .env loading, provider keys present
    ├── engine/
    │   ├── commands.py            @command registry, parameter checks, dispatch, catalogue
    │   ├── events.py              publish to WebSocket subscribers, thread-safe
    │   ├── store.py               SQLite (WAL): conversations, messages, meta
    │   ├── terminal.py            PTY sessions: spawn, pump thread, scrollback, write, resize, close
    │   ├── cmd_app.py             app.info
    │   ├── cmd_conversation.py    conversation.create, list, get, rename, pin, delete
    │   ├── cmd_message.py         message.add; messages_of for conversation.get
    │   ├── cmd_settings.py        models.list (fixture until v0.3.0), settings.get, settings.set
    │   └── cmd_terminal.py        terminal.open, list, write, read, resize, close
    └── routers/
        ├── __init__.py            router list, startup binds the loop for events and terminals, shutdown closes PTYs
        ├── system.py              GET /api/health
        ├── commands.py            GET /api/commands, GET and POST /api/commands/{id}
        ├── stream.py              WS /api/events
        └── terminal_socket.py     WS /api/terminal/{id}: scrollback, then live output; input and resize in
```

---

## Table of contents

- [app/core/config.py](#app-core-config)
- [app/engine/commands.py](#app-engine-commands)
- [app/engine/events.py](#app-engine-events)
- [app/engine/store.py](#app-engine-store)
- [app/engine/cmd_conversation.py](#app-engine-cmd-conversation)
- [app/engine/cmd_chat.py](#app-engine-cmd-chat)
- [app/engine/cmd_message.py](#app-engine-cmd-message)
- [app/engine/tools.py and the tool loop](#app-engine-tools)
- [app/routers/__init__.py](#app-routers-init)
- [app/engine/terminal.py](#app-engine-terminal)
- [app/engine/cmd_settings.py](#app-engine-cmd-settings)
- [app/routers/stream.py](#app-routers-stream)

---

## app/core/config.py {#app-core-config}

### app/core/config.py · _load_env
- refers-to: app/core/config.py :: _load_env (top)
- kind: rationale
- logged: v0.1.0 · 2026-10-11

A twelve-line `.env` reader instead of python-dotenv as a direct dependency: the file is ours, its grammar is KEY=value, and real environment variables win. Keys never leave the engine; `providers()` reports only whether each is set.

### app/core/config.py · cors_origins
- refers-to: app/core/config.py :: cors_origins
- kind: explainer
- logged: v0.1.0 · 2026-10-11

The dev window (5490), the preview (5491) and the Tauri origins. The engine binds 127.0.0.1 only, so nothing off the machine reaches it.

---

## app/engine/commands.py {#app-engine-commands}

### app/engine/commands.py · command, dispatch
- refers-to: app/engine/commands.py :: command, _check, dispatch
- kind: rationale
- logged: v0.1.0 · 2026-10-11

The family's one-registry pattern (formlit `backend/app/engine/commands.py`), trimmed to what Format needs now: a command is an id, a label, a parameter schema in JSON Schema terms and a function. `_check` refuses unknown parameters and wrong types with a message that says what the command takes, because an agent reading the error must be able to fix its call in one step. The same schema becomes the MCP tool's `inputSchema` in v0.7.0.

---

## app/engine/events.py {#app-engine-events}

### app/engine/events.py · publish
- refers-to: app/engine/events.py :: publish, _deliver
- kind: explainer
- logged: v0.1.0 · 2026-10-11

Commands run in FastAPI's thread pool, so `publish` hands the message to the event loop with `call_soon_threadsafe` when it is called off the loop. A subscriber that falls 2000 messages behind stops receiving rather than growing memory without bound.

---

## app/engine/store.py {#app-engine-store}

### app/engine/store.py · _lock
- refers-to: app/engine/store.py :: _lock
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

An `RLock`, not a `Lock`: `rows` and `run` hold it and call `conn()`, which takes it again on first use. With a plain `Lock` the first write deadlocked the engine (found on the first `conversation.create` of v0.1.0, before it was committed).

### app/engine/store.py · SCHEMA
- refers-to: app/engine/store.py :: SCHEMA
- kind: explainer
- logged: v0.1.0 · 2026-10-11

`messages.parent_id` is there from the start because claude.ai's edit creates a branch (UI_STUDY, Conversation): a conversation is a tree of messages and the window shows one path through it. `content` will hold the provider-neutral JSON content blocks from v0.3.0.

---

## app/engine/cmd_conversation.py {#app-engine-cmd-conversation}

### app/engine/cmd_conversation.py · list_
- refers-to: app/engine/cmd_conversation.py :: list_
- kind: explainer
- logged: v0.1.0 · 2026-10-11

Pinned first, then most recent, matching the sidebar's Pinned group above the day-grouped recents. Search by message content arrives with messages in v0.3.0.

### app/engine/cmd_conversation.py · query
- refers-to: app/engine/cmd_conversation.py :: list_
- kind: warning-context
- logged: v0.3.1 · 2026-10-11

`query` matches the title or `messages.content` with `LIKE`. `content` is the JSON of the content blocks, so a query that is also a JSON key (`text`, `type`, `thinking`) matches nearly every chat; the window only asks from three characters on and marks chats that matched only by content with "in messages". An FTS5 table over the extracted text replaces this when chats grow large (DEV_PLAN Phase 3, remaining).

---

## app/engine/cmd_chat.py {#app-engine-cmd-chat}

### app/engine/cmd_chat.py · edit
- refers-to: app/engine/cmd_chat.py :: edit
- kind: rationale
- logged: v0.3.1 · 2026-10-11

Edit replaces rather than branches: it deletes the person's last message and everything after it (publishing `message.deleted` for each), inserts the new text with the old message's attachments and `edited: true` in `meta`, and starts a reply. claude.ai keeps the old path as a branch; `parent_id` already makes the store a tree, and branch navigation is the remaining half of this row. It refuses with 409 while a reply runs, so a reply can never land after its question was removed.

Superseded in v0.3.2 by the entry below: nothing is deleted any more.

### app/engine/cmd_chat.py · edit and branch
- refers-to: app/engine/cmd_chat.py :: edit, branch, retry, _publish_path
- kind: rationale
- logged: v0.3.2 · 2026-10-11

`chat.edit` inserts the new text as a sibling of the edited message (same parent, or a second root for the first message, passed as `ROOT` so `insert` does not attach it to the leaf), which moves the leaf there and starts a reply; the old version and everything after it stay in the store as a branch. `messageId` may be any of the person's messages on the current path; without it the most recent is edited, as in v0.3.1. `chat.branch` sets the leaf to the newest descendant of the chosen version (`deepest`, following the latest child at each step), which is what claude.ai shows when stepping back to a version. Both publish `conversation.path` with the whole path, because the window cannot work out which nodes to keep from single add and delete events. `chat.retry` still deletes the last reply but now resets the leaf to its parent first, or the new reply would attach to a deleted message. All three refuse with 409 while a reply runs.

---

## app/engine/cmd_message.py {#app-engine-cmd-message}

### app/engine/cmd_message.py · the tree
- refers-to: app/engine/cmd_message.py :: insert, messages_of, leaf_of, set_leaf, deepest, _siblings; app/engine/store.py :: conn (schema 3)
- kind: rationale
- logged: v0.3.2 · 2026-10-11

A chat is a tree of messages and `conversations.leaf_id` names the end of the path on screen. `insert` attaches to the leaf unless told otherwise and becomes the new leaf; `messages_of` walks parents from the leaf (with a seen set, so a damaged row cannot loop) and adds `branch` to each of the person's messages that has siblings. Schema 3 added `leaf_id` and an index on `(conversation_id, parent_id)`; chats from schema 2 had no parents, so the migration links each chat's messages in time order and sets the leaf to the last one, once, inside the first connection.

---

## app/routers/__init__.py {#app-routers-init}

### app/routers/__init__.py · COMMAND_MODULES
- refers-to: app/routers/__init__.py :: COMMAND_MODULES
- kind: rationale
- logged: v0.1.0 · 2026-10-11

Importing the `cmd_*` modules is what registers their commands; naming them in a tuple makes the import a used name instead of a side-effect import.

---

## app/engine/terminal.py {#app-engine-terminal}

### app/engine/terminal.py · the shell and its environment
- refers-to: app/engine/terminal.py :: _shell, _env
- kind: rationale
- logged: v0.2.0 · 2026-10-11

The person's own login shell (`$SHELL -l`, else bash, else sh; `COMSPEC` on Windows) in the workspace folder, with `TERM=xterm-256color`, `FORMAT_TERMINAL=1`, `FORMAT_ENGINE_URL`, and the repo folder first on `PATH` on macOS and Linux so `format cli ...` works inside the terminal. Not on Windows, where `format` must never shadow the disk formatter for other programs.

### app/engine/terminal.py · _pump
- refers-to: app/engine/terminal.py :: _pump, Session.keep
- kind: explainer
- logged: v0.2.0 · 2026-10-11

One reader thread per PTY: output goes into a 256 KB scrollback (replayed to a window that attaches later, so reopening the dock is never blank) and to each attached socket's queue through `call_soon_threadsafe`. `None` on the queue means the shell exited.

### app/engine/cmd_terminal.py · terminal.read
- refers-to: app/engine/cmd_terminal.py :: read, ANSI
- kind: rationale
- logged: v0.2.0 · 2026-10-11

Agents read the terminal as plain text: colour and cursor sequences are removed and line endings normalised. Writes go through `terminal.write`, so an agent's typing appears live in the window's tab.

---

## app/engine/cmd_settings.py {#app-engine-cmd-settings}

### app/engine/cmd_settings.py · MODELS
- refers-to: app/engine/cmd_settings.py :: MODELS
- kind: todo
- logged: v0.2.0 · 2026-10-11

A built-in list (ids claude-opus-5-5, claude-sonnet-5-5, claude-haiku-5-5, claude-fable-5-1) reported as `source: fixture`. v0.3.0 replaces it with the provider's models endpoint and keeps this list only as the offline fallback. Effort levels follow the claude.ai menu: low, medium, high, extra, max.

---

## app/harness and app/providers {#app-harness}

### app/harness/request.py · build
- refers-to: app/harness/request.py :: build, _effort, _thinking, _max_tokens, api_messages
- kind: rationale
- logged: v0.3.0 · 2026-10-11

What the person types becomes a Messages request here and nowhere else. Sources: the effort and thinking pages of the Claude API docs, read 2026-10-11. Effort goes in `output_config.effort` and is clamped to the levels the model's capabilities list (from `/v1/models`), falling back to the nearest lower one. Show thinking sends `thinking: {type: adaptive, display: summarized}` where adaptive is supported, else extended thinking with a budget; with Show thinking off the field is omitted, never `disabled`, because Opus 5.5 answers `disabled` with a 400. `max_tokens` is 64k at high and above, 32k below, capped by the model's own limit. Stored turns are sent back block for block; thinking blocks keep their `signature` unchanged, as the docs require. Top-level `cache_control: {type: ephemeral}` turns on automatic prompt caching.

### app/harness/content.py · attachments
- refers-to: app/harness/content.py :: blocks_for, _zip_blocks
- kind: explainer
- logged: v0.3.0 · 2026-10-11

Images and PDFs go as base64 `image` and `document` blocks when the model accepts them; text and code files are fenced with their name (200k characters); zips are unpacked into the workspace, listed, and their text files inlined to a 400k character budget (60k each), skipping `.git`, `node_modules`, build and venv folders; other media are referenced by their workspace path. Attachments are rebuilt from the workspace on every turn, so the database stores file ids, not bytes.

### app/core/secrets.py · precedence
- refers-to: app/core/secrets.py :: api_key, source
- kind: rationale
- logged: v0.3.0 · 2026-10-11

A key saved in Settings (data folder `secrets.json`, mode 0600, written by a temp file and rename) wins over `backend/.env` and the environment, so a person can switch keys without editing files; removing it falls back to .env. `config.ENV_FILE_KEYS` remembers which variables came from .env, so the window can say where a key comes from.

### app/engine/chat.py · the run thread
- refers-to: app/engine/chat.py :: start, _run, flush
- kind: explainer
- logged: v0.3.0 · 2026-10-11

One thread per running reply. The assistant message is stored empty with status `streaming` first (so the window and agents see it at once), deltas are published in 40 ms batches per block, and the final content blocks, usage, stop reason and status (done, stopped, error) are written once at the end. A stop sets an Event the stream loop checks between events.

### app/engine/voice.py · engines
- refers-to: app/engine/voice.py :: transcribe
- kind: warning-context
- logged: v0.3.0 · 2026-10-11

Local faster-whisper (MIT, optional, `./format install-voice`; model `base` unless `FORMAT_WHISPER_MODEL`) is preferred; otherwise OpenAI's transcription endpoint with `FORMAT_TRANSCRIBE_MODEL` (default `whisper-1`). Neither was run here: no OpenAI key, no network to OpenAI, and the local model downloads on first use. Without either the endpoint answers 503 with how to enable one, which the window shows.

### app/harness/content.py · the Files API
- refers-to: app/harness/content.py :: remote_id, blocks_for, FILES_API_MIN; app/engine/uploads.py :: remember_remote; app/providers/anthropic_provider.py :: upload_file, delete_file, key_tag
- kind: rationale
- logged: v0.3.3 · 2026-10-11

Every turn sends the whole history, so an attached 20 MB PDF would travel as base64 on every request until the chat ends, and a few of them reach the request size limit. From 1 MB, images and PDFs are uploaded once (the Files API is generally available as of 2026-10-11, no beta header; files persist until deleted) and sent as `{"type": "file", "file_id": ...}`. Smaller files stay inline: one request either way, and nothing left in the workspace. The id is cached in the upload's `meta.json` with the provider and a fingerprint of the key (the first 16 hex of its SHA-256), because files belong to the key's workspace: a different key uploads again rather than referencing a file it cannot see. A failed upload is logged and the file goes inline. Ids only ever come from Format's own uploads, never from a person or a model, as Anthropic's page asks.

### app/engine/cmd_conversation.py · deleting remote files
- refers-to: app/engine/cmd_conversation.py :: delete, _forget_remote
- kind: rationale
- logged: v0.3.3 · 2026-10-11

Files stay in the Anthropic workspace until deleted, so deleting a chat deletes the remote copies of its attachments, in a background thread after the chat is gone, skipping files uploaded under another key. A failure is logged; the local copy in the workspace folder is kept, as before.

### app/engine/chat.py · compaction
- refers-to: app/engine/chat.py :: _should_compact, _compact, start_compaction, _context_used; app/harness/request.py :: since_summary, build_compaction, COMPACT_BETA; app/providers/anthropic_provider.py :: compact, can_compact
- kind: rationale
- logged: v0.3.3 · 2026-10-11

On-demand compaction (beta `compact-2026-09-04`, read 2026-10-11), not threshold compaction: Anthropic's page recommends it, it keeps the decision in the engine, and it never pauses a reply. After a reply, the engine adds that reply's input, cache-creation, cache-read and output tokens (what the next request starts from) and compares it with `compactAt` times the model's context window; past it, the same run sends the chat with `compaction: {"type": "summarize"}`, the chat's own system prompt and thinking, and `max_tokens` 16000, and stores the signed block, unchanged, as an assistant message with `meta.compaction`. It runs after the reply rather than before the next question, so the person's next message never waits on it unless they send while it runs (the window queues). The harness then sends the newest summary first and everything after it, with the beta header on each request that carries it (a request without the header fails validation); earlier messages stay in the store and on screen. A summary that does not come back (`stop_reason` other than `compaction`, or an API error) is kept as a message with the reason and contributes nothing to later requests. Images and files before a summary are not carried by it; the Long chats note says so. `can_compact` reads `capabilities.compaction` when the models list has it and otherwise the model list on Anthropic's page.

### app/engine/chat.py · compactNext
- refers-to: app/engine/chat.py :: _run (finally)
- kind: warning-context
- logged: v0.3.3 · 2026-10-11

The decision to compact is made before the reply's `message.completed` is published and is carried on the reply as `meta.compactNext`, and the run stays in `RUNS` until the summary is stored. The window would otherwise take the reply's completion as the end of the run and send its queue into a 409.

---

## app/engine/tools.py and the tool loop {#app-engine-tools}

### app/engine/chat.py · the loop
- refers-to: app/engine/chat.py :: _run, _call_tool, _close_open_calls, tool_view, MAX_ROUNDS
- kind: rationale
- logged: v0.4.0 · 2026-10-11

Sources read 2026-10-11 on platform.claude.com: "Tool use with Claude", "Web search tool" and "Web fetch tool". A reply is one stored message however many rounds it takes: each round streams into the same block list at an offset, and client results are appended as `tool_result` blocks in that list. That keeps one node per reply in the window, one message per reply in the tree (so branching and retry treat a tool run as one reply), and one place to resume from. `harness.api_messages` turns the list back into the alternating assistant and user messages the API needs, results first in each user message. Rounds stop when the stop reason is not `tool_use` (`pause_turn` loops without running anything) or after 40, which is reported on the reply. Inputs arrive as `input_json` deltas and are parsed at `block_stop`; until then the window shows the call as preparing. `_close_open_calls` runs on every exit: a server call without its result is dropped and a client call without one gets "Not run", because a request with an unanswered `tool_use` is rejected and the chat could never continue.

### app/harness/request.py · passing blocks back
- refers-to: app/harness/request.py :: api_messages, _assistant_block
- kind: warning-context
- logged: v0.4.0 · 2026-10-11

Assistant blocks are now sent back as they were received, minus `None` fields and empty citations, instead of through the old allow-list of block types: the web search page requires `encrypted_content` and the results unchanged, and dynamic filtering (the 20260318 tools) adds code-execution blocks the allow-list did not know. Thinking blocks without a signature (a stopped stream) and empty text blocks are still dropped. User messages keep the allow-list.

### app/engine/tools.py · the workspace and approvals
- refers-to: app/engine/tools.py :: workspace, _inside, decision_for, wait_for_approval, answer, run, _bash
- kind: rationale
- logged: v0.4.0 · 2026-10-11

Each chat has its own folder, `workspace/chats/<id>`; `read`, `write`, `edit`, `glob` and `grep` resolve every path and refuse anything outside it. `bash` starts there in a fresh login shell but is not confined: it runs as the person, with their permissions, so in Ask mode it waits for approval, and that approval is the guard. Read-only tools never ask; Plan refuses changes with a message that tells Claude to describe them instead; Auto runs everything not in `toolDeny`. An approval is a `threading.Event` the run waits on in quarter-second steps so Stop still works; `tool.approve` sets it. Always allow writes `toolAllow` through `settings.set`, so it shows in Settings and the CLI. Output is pushed as `tool.output` every 80 ms and the stored result keeps the last 30,000 characters. `edit` is the SEDO shape on purpose: one exact passage, refused when it is missing or not unique.

### app/engine/tools.py · server tools
- refers-to: app/engine/tools.py :: WEB_SEARCH, WEB_FETCH, definitions
- kind: explainer
- logged: v0.4.0 · 2026-10-11

`web_search_20260318` and `web_fetch_20260318`: the current versions, with dynamic filtering (the API provisions the code execution it needs) and no beta header. They are offered unless the model's `capabilities.server_tools` says otherwise or `webTools` is off. Web search is billed by Anthropic per search ($10 per 1,000 on 2026-10-11); the Tools settings say so. Web fetch only fetches URLs that already appeared in the conversation, which is the API's own guard against exfiltration.

---

## app/routers/stream.py {#app-routers-stream}

### app/routers/stream.py · module name
- refers-to: app/routers/stream.py (file)
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

Named `stream`, not `events`: `app/routers/__init__.py` also imports `app.engine.events`, and a sibling module named `events` was shadowed by it, so the router list picked up the engine module and the engine failed to start.
