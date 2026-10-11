# HASHOUT_LOG · backend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the engine. Source files stay comment-free; everything they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.3.1
Last updated: 2026-10-11 · v0.3.1: chat.edit and search by message text

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

---

## app/routers/stream.py {#app-routers-stream}

### app/routers/stream.py · module name
- refers-to: app/routers/stream.py (file)
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

Named `stream`, not `events`: `app/routers/__init__.py` also imports `app.engine.events`, and a sibling module named `events` was shadowed by it, so the router list picked up the engine module and the engine failed to start.
