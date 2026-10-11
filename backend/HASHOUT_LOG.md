# HASHOUT_LOG · backend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the engine. Source files stay comment-free; everything they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.1.0
Last updated: 2026-10-11 · scaffold: registry, events, store, conversation commands

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
    │   ├── cmd_app.py             app.info
    │   └── cmd_conversation.py    conversation.create, list, get, rename, pin, delete
    └── routers/
        ├── __init__.py            router list, startup binds the loop and opens the store
        ├── system.py              GET /api/health
        ├── commands.py            GET /api/commands, GET and POST /api/commands/{id}
        └── stream.py              WS /api/events
```

---

## Table of contents

- [app/core/config.py](#app-core-config)
- [app/engine/commands.py](#app-engine-commands)
- [app/engine/events.py](#app-engine-events)
- [app/engine/store.py](#app-engine-store)
- [app/engine/cmd_conversation.py](#app-engine-cmd-conversation)
- [app/routers/__init__.py](#app-routers-init)
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

---

## app/routers/__init__.py {#app-routers-init}

### app/routers/__init__.py · COMMAND_MODULES
- refers-to: app/routers/__init__.py :: COMMAND_MODULES
- kind: rationale
- logged: v0.1.0 · 2026-10-11

Importing the `cmd_*` modules is what registers their commands; naming them in a tuple makes the import a used name instead of a side-effect import.

---

## app/routers/stream.py {#app-routers-stream}

### app/routers/stream.py · module name
- refers-to: app/routers/stream.py (file)
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

Named `stream`, not `events`: `app/routers/__init__.py` also imports `app.engine.events`, and a sibling module named `events` was shadowed by it, so the router list picked up the engine module and the engine failed to start.
