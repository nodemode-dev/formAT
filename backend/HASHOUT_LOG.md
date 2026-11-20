# HASHOUT_LOG · backend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the engine. Source files stay comment-free; everything they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.30.1
Last updated: 2026-11-20 · v0.30.1: the macOS engine list installs keyring (backend/requirements_macos.txt), and tests/test_requirements_lists.py keeps it beside requirements.txt and the freeze scripts; 2026-11-20 · v0.30.0: on Windows the engine ends with its app (src-tauri/src/win_job.rs, a job object that takes the engine by its process id) and is built with no console window unless FORMAT_ENGINE_WINDOWED is 0 (setup/freeze_backend.bat, setup/freeze_backend), the shell waits at most 90 seconds for the engine's address (src-tauri/src/engine_start.rs), an ended engine not yet collected counts as gone where there is no /proc (app/core/startup.py :: finished), and the connect command names the four agent programs in order (setup/agents.py); 2026-11-19 · v0.29.0: the engine starts and stops cleanly beside its app (app/core/startup.py copied from FormTools with its names changed, the record in engine.lock and the replacing of a holder whose shell is gone in app/core/instance.py, the engine's own log, the started-alone branch and the watch on the shell in format_engine.py), and in the shell a failed start shows its dialog before the loading window is hidden, also when the main window cannot be built (src-tauri/src/main.rs); 2026-11-19 · v0.28.0: the family's finder for the agent programs (app/engine/agent_lookup.py, copied unchanged, its hash recorded in setup/agents.py), claudecode.status reporting Claude Code, Codex, Cursor and Antigravity, `./format agents install` covering Antigravity, a test run that finds only stand-in agent programs, and an entry script that starts without output streams; 2026-11-19 · v0.27.0: only the FormAT window changes things without asking (a key made at each launch in app/core/window_key.py, every call without it following the Outside agents choice, the choice sealed in app/core/seal.py and read as Ask when its seal is missing or does not match, one-time tickets for the events and terminal sockets, resources/list raising a refusal as an error), the shell's wait for the engine corrected (no limit on the start, 10 seconds for the key once the address is known), the bash tool's shell and terminal tabs no longer given the engine's secrets, `./format agents sync --check` and agents/manifest.json; 2026-11-15 · v0.26.3: the review's open list fixed (the engine's unpack folder removed at quit and swept at start, one engine per data folder in app/core/instance.py and one shell per user, a dialog when the engine cannot be spawned, Other devices no longer silencing the engine log while pairing codes and share tokens are blanked from every access line, chat.start and compaction clearing their running mark on every failure, `app.info` naming the keys file and the .env file, Download all named for the chat, demos listed from each folder's about.json and refreshed in place when untouched, the Orrery's Credits panel and FIGURES.md with its source in tools/demos/orrery, format.bat's missing commands, freeze_backend.bat's missing space); v0.26.2: no engine change (the desktop updater's endpoint in src-tauri/tauri.conf.json is nodemode-dev/formcompiler); v0.26.1: no engine change (the Orrery's attached CREDITS.md and its chat.json entry now carry each map's own credit line, source page and terms, as NOTICE.md does; CODE_OF_CONDUCT.md, CONTRIBUTING.md and SECURITY.md; formcompiler's address in current docs and skills is nodemode-dev/formcompiler, and the README clones formAT); v0.26.0: demo chats seeded as ordinary records from app/demos (`demo.list`, `demo.restore`, the `demo` column, three demos including the Orrery with NASA maps), the splash hand-off in the shell (src-tauri/src/reveal.rs, the `app_ready` command and its generated permission, the remote capability), and the review's fixes (the events socket that hung shutdown, Other devices through the local guard, chat delete cleaning up, /favicon.ico, the name FormAT where people see it, the engine-failure dialog, build_app's names, the Windows freeze line); v0.25.3 and v0.25.4: no engine change (the icon, the product name FormAT in tauri.conf.json, the README); 2026-10-31 · v0.25.2: .js, .mjs and .css keep their types on Windows (app/main.py) and the Linux packages pull in the media plugins (src-tauri/tauri.conf.json); 2026-10-30 · v0.25.1: no engine change (`format.bat desktop build` passes its arguments to `tauri build`, and the Windows LGPL FFmpeg build runs in its own MSYS2 script with MSVC's linker first); v0.24.3: the desktop freeze takes reportlab's modules only, and voice ships PyAV 18.1.0 built from source against an LGPL FFmpeg 8.0.3 (`setup/build_lgpl_av`, checked by `setup/check_lgpl_av.py`; the PyPI wheel links GPL x264 and x265, and `av` 19 had also dropped the `metadata_errors` argument faster-whisper 1.2.1 passes, so voice was broken on an unpinned install); v0.24.1: no engine change (checks only, releases by formcompiler, version string); v0.24.0: no engine change (the app icon only); v0.23.0: GET /api/uploads/{id} serves an attachment back to the window (ranges, immutable cache, sandboxing CSP); v0.22.0: message.citation sent as each citation streams; v0.21.0: archive, npm and command plugin sources, private marketplaces, .plugin uploads, skills Discover and Skill with Claude, the connector directory, connectors on the Claude Code route; v0.20.0: plugin.create and plugin.files, Create with Claude (output plugin and the add_plugin tool), /plugin:skill invocation; v0.19.0: plugin marketplaces (add, Check for updates, Sync automatically, remove), plugin.install from a marketplace, a plugin's connectors added on request; v0.18.0: signing in to a connector (OAuth with PKCE, registration or your own client, refresh, SSE transport) and connectors on or off per chat; v0.16.0: connector tool permissions (Always allow, Needs approval, Blocked) and request headers; v0.15.0: skill.read for the Customize file viewer; v0.14.0: Allow for this chat (conversations.allow_all, conversation.allowAll) on both routes; v0.13.0: skills invoked by name, Allow all answers what is waiting

---

## Org-navi-map

```
backend/
├── requirements.txt               FastAPI, uvicorn, httpx, multipart (formlit's pins)
├── requirements_macos.txt         what macOS installs (oc_install): every line of requirements.txt that is not Windows-only, same pins (tests/test_requirements_lists.py); the split exists for macOS-only wheels later
├── .env.example                   ANTHROPIC_API_KEY, OPENAI_API_KEY, FORMAT_PORT, FORMAT_DATA_DIR
├── oc_install(.bat)               venv, pip install, .env from the example
├── boot_backend(.bat)             uvicorn with reload on 127.0.0.1:8490
├── format_engine.py               entry for a frozen engine (desktop sidecar, v0.7.0)
└── app/
    ├── __init__.py                __version__
    ├── main.py                    FastAPI app, CORS, error handler, optional dist mount
    ├── core/config.py             ports, paths, .env loading, provider keys present
    ├── core/instance.py           one engine per data folder: an OS lock on engine.lock (0.26.3)
    ├── core/startup.py            the family's start and stop pattern, copied from FormTools with its names changed
    ├── engine/
    │   ├── commands.py            @command registry, parameter checks, dispatch, catalogue
    │   ├── events.py              publish to WebSocket subscribers, thread-safe
    │   ├── store.py               SQLite (WAL): conversations, messages, meta
    │   ├── terminal.py            PTY sessions: spawn, pump thread, scrollback, write, resize, close
    │   ├── cmd_app.py             app.info
    │   ├── cmd_conversation.py    conversation.create, list, get, rename, pin, delete
    │   ├── cmd_message.py         message.add; messages_of for conversation.get
    │   ├── cmd_settings.py        models.list (fixture until v0.3.0), settings.get, settings.set
    │   ├── artifacts.py           artifact rows and versions: publish, list, get, delete
    │   ├── cmd_artifact.py        artifact.list, artifact.get, artifact.delete
    │   ├── cmd_files.py           files.list, files.read: the chat folder for the files pane
    │   ├── projects.py            projects, their knowledge files, the context a project chat receives
    │   ├── cmd_project.py         project.list, get, create, update, delete, addFile, removeFile; conversation.move
    │   ├── memory.py              the memory tool's six commands on data/memory, general or per project
    │   ├── cmd_memory.py          memory.list, read, write, delete
    │   ├── skills.py              skills in data/skills: parse, install, on and off, the skill tool
    │   ├── cmd_skill.py           skill.list, get, add, create, enable, delete
    │   ├── connectors.py          MCP servers: API route or engine route, sessions, tool calls, per-chat off
    │   ├── oauth.py               connector sign-in: discovery, registration, PKCE, tokens and refresh
    │   ├── marketplaces.py        plugin marketplaces: clone, catalog, install (folder, git, archive, npm, command), update, sync, remove; skills Discover
    │   ├── connector_directory.py the connector directory: remote MCP servers with the URL from each maker's page
    │   ├── cmd_connector.py       connector.list, add, update, connect, delete
    │   ├── agents.py              outside-agent consent (ask, allowed, blocked), agents.status
    │   ├── schedules.py           scheduled tasks, the scheduler thread, run history, background.list
    │   ├── native.py              the optional wgpu renderer: native.status, terminal snapshots through its binary
    │   ├── cmd_terminal.py        terminal.open, list, write, read, resize, restart, close
    │   ├── demos.py               the demo chats: read app/demos, seed once, restore, list
    │   └── cmd_demo.py            demo.list, demo.restore
    ├── demos/                     the bundled demo chats, one folder each: chat.json, about.json (order, blurb), artifact.html, files/
    │   ├── northern-light/        Aurora page (the page Northern Light)
    │   ├── solar-system/          Orrery page (the page Orrery; files/CREDITS.md and FIGURES.md; built from tools/demos/orrery)
    │   └── harbour-ferries/       Ferry dashboard (the page Harbour Ferries, season 2026; files/ holds the form.md package and its zip)
    ├── mcp_server.py              Format as an MCP server: a tool per command, resources, prompts
    ├── agent_guide.py             agent-facing tool names (verb_noun) and when-sentences; id rewriting in errors
    ├── mcp_stdio.py               ./format mcp: the same server over stdio, proxied to the running engine
    └── routers/
        ├── mcp_http.py            Streamable HTTP MCP at /mcp
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
- [app/engine/artifacts.py and serving](#app-engine-artifacts)
- [app/engine/cmd_files.py, comments and activity](#app-engine-cmd-files)
- [app/engine/projects.py](#app-engine-projects)
- [app/engine/memory.py and app/engine/skills.py](#app-engine-memory-skills)
- [app/engine/connectors.py](#app-engine-connectors)
- [app/mcp_server.py and outside agents](#app-mcp-server)
- [app/engine/schedules.py and the Claude terminal](#app-engine-schedules)
- [native/format-render and app/engine/native.py](#native)
- [Gap closures: research, sandbox and the rest](#gaps)
- [app/routers/__init__.py](#app-routers-init)
- [app/engine/terminal.py](#app-engine-terminal)
- [app/engine/cmd_settings.py](#app-engine-cmd-settings)
- [Skills invoked by name and Allow all](#skills-invoked)
- [app/routers/stream.py](#app-routers-stream)
- [app/main.py](#app-main)
- [src-tauri/tauri.conf.json](#src-tauri-conf)
- [tests](#tests)
- [app/engine/demos.py, cmd_demo.py and app/demos](#app-engine-demos)
- [src-tauri/src/reveal.rs and the splash hand-off](#src-tauri-reveal)
- [Review fixes in the engine, the shell and the build, 0.26.0](#review-0-26-0)
- [Credits, community files and release addresses, 0.26.1](#notice-0-26-1)
- [The review's open list, fixed in the engine, the shell, the build and the demos, 0.26.3](#open-items-0-26-3)

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

### app/engine/voice.py · a model that cannot load
- refers-to: app/engine/voice.py :: _local, transcribe
- kind: warning-context
- logged: v0.10.4 · 2026-10-12

`./format install-voice` was run at v0.10.4 and installed faster-whisper 1.2.1 and its dependencies, but the first transcription could not fetch the `base` model: the build workspace's proxy refuses huggingface.co (ProxyError 403). Loading the model used to raise straight through as a 500; it is now a VoiceError naming the model, the cause and the two remedies (network, or `FORMAT_WHISPER_MODEL` pointing at a model folder), answered as 503 and shown in the composer. When an OpenAI key is also set, a local failure falls through to OpenAI. A transcription on a machine that can download the model is still owed.

### app/engine/voice.py · Scribe v2 and large-v3-turbo
- refers-to: app/engine/voice.py :: engines, _scribe, local_model_name, scribe_model_name, transcribe; app/routers/files.py :: transcribe (engine, run_in_threadpool); app/core/secrets.py :: PROVIDERS (elevenlabs); app/engine/cmd_account.py :: voiceEngine; setup/install_voice; backend/.env.example
- kind: explainer
- logged: v0.10.5 · 2026-10-12

Three engines, tried in order: ElevenLabs Scribe v2 (`POST /v1/speech-to-text`, header `xi-api-key`, form `model_id=scribe_v2`, the audio as `file`, `language_code` from the dictation language, `tag_audio_events=false` and `timestamps_granularity=none` because only the text is used; the transcript is `text`), local faster-whisper with `large-v3-turbo` (int8; the distilled-decoder Whisper large-v3, close to large-v3's accuracy at a fraction of the decode time, about 1.6 GB), then OpenAI. Scribe v2 comes first because it is the most accurate where a key is present; the local model comes before OpenAI because nothing leaves the computer. `engines()` reports which are set up and the order; `transcribe` takes an optional preferred engine (the account's `voiceEngine`), puts it first, and falls through on any VoiceError, joining the failures when all fail. The route runs transcription in the thread pool: a large-v3-turbo decode on CPU takes seconds, and running it inline blocked the event loop (every window's events and commands) for that long. `FORMAT_WHISPER_MODEL`, `FORMAT_SCRIBE_MODEL` and `FORMAT_ELEVENLABS_URL` override the model names and the endpoint (the last for a test stand-in). `./format install-voice` now downloads the model during the install and says plainly when it cannot. An `.env` copied from an older example still names `base`; that is respected as an explicit choice.

Verified at v0.10.5 against a local stand-in for the ElevenLabs endpoint (the real one, and Hugging Face for the local model, are refused by the build workspace's network): the request carried scribe_v2, the key, `language_code=en` and the recorded webm/opus; asking for local fell through to Scribe with the download failure; local alone answers 503 in 0.3 s with the remedy while the engine keeps answering. No transcription by a real model has run here.

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

### app/engine/chat.py · citations as they stream
- refers-to: app/engine/chat.py :: _run (the citation branch: flush, then message.citation)
- kind: rationale
- logged: v0.22.0 · 2026-10-18

A `citations_delta` (platform.claude.com/docs/en/build-with-claude/citations, Streaming) was stored on its text block but never sent, so the window could show sources only after a reload, and did not show them at all. `_run` now publishes `message.citation` with the conversation, the reply id, the block index and the citation without `encrypted_index` (an opaque value the API needs back on the next turn, which stays in the stored block; the window has no use for it). Pending text is flushed first, so the window always has the block's text before its citation. Sub-agents keep their citations in their stored blocks only, since their text shows as a plain progress note in the card.

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

### app/engine/tools.py · ask_user, task_list, send_file
- refers-to: app/engine/tools.py :: wait_for_answer, kind_of_wait, tasks_of, outputs_of, output_path, run (task_list, send_file); app/engine/chat.py :: _call_tool (ask_user); app/engine/cmd_chat.py :: answer_question, tasks_get, outputs_list
- kind: rationale
- logged: v0.4.1 · 2026-10-11

The three tools that make the work visible, from the plan's tool list (DEV_PLAN, Architecture decisions). `ask_user` shares the wait machinery with approvals but is a different kind of wait, so `tool.approve` refuses it and `tool.answer` refuses an approval; the answer is stored in `meta.answers` because the stored `tool_use` block must stay exactly as the model sent it. `task_list` replaces the whole list on each call (simplest for the model to keep right) and is stored in the `meta` table under `tasks.<chat>`. `send_file` only registers a file that already exists in the chat's folder, under `outputs.<chat>`; downloads go through `/api/chats/{id}/files/{path}`, which resolves the path inside the folder the same way the tools do (`../` answers 403). None of the three asks for approval or is blocked by Plan mode: they read or show, they never change the person's files. Their storage is per chat and is not removed with the chat yet.

### app/engine/chat.py · sub-agents
- refers-to: app/engine/chat.py :: _run_agent, _agent_view, AGENT_PROMPT, AGENT_ROUNDS; app/engine/tools.py :: AGENT_EXCLUDED, definitions (agent)
- kind: rationale
- logged: v0.4.2 · 2026-10-11

A sub-agent is a second loop inside the parent's `spawn_agent` call, not a chat in the sidebar: its history starts from the task alone, which keeps it cheap and focused, and the task description tells Claude to write tasks that stand alone. It shares the chat's folder and the parent's message for statuses and approvals, so its waiting calls appear and are answered exactly like the parent's; it cannot ask questions, keep the plan, send files or start sub-agents, because those speak to the person and only the main Claude does that. It does not stream text deltas: each block is published once at `block_stop` with `parent` set, which is enough to follow it and cheaper than a second delta stream. Its blocks live in `meta.agents[tool_use_id]`, saved with the parent at each round. The report is its last text after its last tool call. Sub-agents run one after another within a reply (the loop runs parallel calls in order); `agentLimit` caps them per reply and 0 removes the tool; `agentModel` lets them run on a faster model.

---

## app/engine/artifacts.py and serving {#app-engine-artifacts}

### app/engine/artifacts.py · storage and versions
- refers-to: app/engine/store.py :: SCHEMA (artifacts, artifact_versions); app/engine/artifacts.py :: publish, list_, get, version, versions, delete; app/engine/cmd_artifact.py; app/engine/chat.py :: _call_tool (publish_artifact), tool_view (publish_artifact)
- kind: rationale
- logged: v0.5.0 · 2026-10-11

An artifact is a row per page and a row per version; a version is never changed, a revision is a new row with the next number, so every card in the thread keeps opening exactly what it published. Publishing with `artifact_id` is confined to the same chat, so a model cannot write into another chat's page. Each version keeps the message that made it; `_call_tool` finds the version by that message after the tool runs and stores `{id, version, title}` in `meta.artifacts` under the call id, then publishes `message.artifact`, so the window's card learns its artifact without parsing the result text. `tool_view` trims the HTML out of the `publish_artifact` input sent to the window (only title, artifact_id and size): a 2 MB page would otherwise travel in every `message.block` and every `conversation.get`. The cap is 2 MB per version. Schema version 4. The tool is read-only for approvals because it touches nothing on disk, and sub-agents cannot use it because only the main Claude speaks to the person.

### app/routers/files.py · the artifact page and its CSP
- refers-to: app/routers/files.py :: artifact_csp, artifact_page; app/engine/cmd_settings.py :: artifactNetwork
- kind: warning-context
- logged: v0.5.0 · 2026-10-11

`GET /api/artifacts/{id}/v/{n}` serves a version as its own HTML document with a Content-Security-Policy that carries a `sandbox` directive. The directive is the important part: the window's iframe is also sandboxed without `allow-same-origin`, but a page opened in a new tab (Pop out) has no iframe, and without the header it would run on the engine's own origin with access to `/api/commands`. With it, the page gets an opaque origin wherever it is opened. `connect-src 'none'` blocks fetch and WebSocket unless `artifactNetwork` is on (then https only); scripts, styles and fonts may come from cdnjs, jsdelivr, unpkg and Google Fonts, as claude.ai allows. `frame-ancestors 'self'` keeps other sites from framing it; `form-action 'none'` and `base-uri 'none'` close the remaining exits. `?download=1` sends it as an attachment named after the title and version.

### app/routers/files.py · attachments served back
- refers-to: app/routers/files.py :: upload_file
- kind: rationale
- logged: v0.23.0 · 2026-10-18

The window had no way to read back a file the person attached, so a sent message could only show a name chip. `GET /api/uploads/{id}` now serves the stored file under its own MIME type, inline (`?download=1` for a download named as uploaded). The id must be alphanumeric and `uploads.get` takes only its last path segment, so it cannot leave the uploads folder (a `../` probe answers 404). Uploads never change, so the response is `cache-control: private, max-age=31536000, immutable` and a thumbnail is fetched once. Starlette 1.8's FileResponse answers `Range` with 206, which video in WebKit (the macOS app) needs to play and seek, and which the window uses to read only the first kilobyte of a text file for its tile. Like chat files, everything but a PDF carries a `sandbox` CSP and `nosniff`, so an SVG or HTML file opened in its own tab runs nothing on the engine's origin.

---

## app/engine/projects.py {#app-engine-projects}

### app/engine/projects.py · projects and their context
- refers-to: app/engine/store.py :: SCHEMA (projects, project_files); app/engine/projects.py; app/engine/cmd_project.py; app/harness/prompt.py :: PROJECT; app/harness/request.py :: project_blocks, build; app/engine/chat.py :: _run (project)
- kind: rationale
- logged: v0.6.0 · 2026-10-12

A project is a row with a name, a description (for the person, never sent) and instructions; its knowledge files are uploads (the same store chat attachments use), linked in `project_files`, at most 50. `conversations.project_id` existed since v0.1.0 and is now used. Schema 5. A chat's project is read at the start of each reply (`projects.context`), so edits to instructions or files, and moving a chat, take effect on the next reply. The instructions go in the system prompt after Format's own text, marked as the person's; the files go at the start of the first user turn as the same blocks an attachment would make (text fenced inline, images and PDFs as blocks, large ones once through the Files API). Placing them in the first turn rather than the system prompt keeps images and PDFs possible and lets the top-level cache breakpoint cover them, so they are paid for once per cache lifetime. Sub-agents do not receive the project, only their task. Deleting a project keeps its chats, which move out (`chatsMoved` in the result); `project.changed` carries chat and file counts so the window's tiles stay right.

---

## app/engine/memory.py and app/engine/skills.py {#app-engine-memory-skills}

### app/engine/memory.py · the memory tool
- refers-to: app/engine/memory.py :: handle, resolve, root, scope_of; app/engine/tools.py :: MEMORY, definitions, run (memory); app/engine/cmd_memory.py; app/harness/prompt.py :: MEMORY_GENERAL, MEMORY_PROJECT
- kind: rationale
- logged: v0.6.1 · 2026-10-12

Anthropic's memory tool (`memory_20250818`, read on platform.claude.com 2026-10-12: no beta header, no input schema, six commands, results and error texts given) is a client tool: Claude asks, Format runs the command. Format follows the documented reference behaviour, including `create` refusing nothing (it overwrites, which the page allows) and `delete` and `rename` refusing the root. `/memories` maps to `data/memory/general` for chats outside projects and `data/memory/projects/<id>` for a project's chats, decided per reply from the chat's project; deleting the project deletes that folder. Paths are checked as the page asks: under `/memories`, resolved inside the folder, with `..`, encoded `%2e`/`%2f`/`%5c` and backslashes refused. The API adds its own memory protocol to the system prompt when the tool is present ("ALWAYS VIEW YOUR MEMORY DIRECTORY BEFORE DOING ANYTHING ELSE"), which costs a round per reply; that is why the setting defaults to off. Format adds one paragraph saying which memory the chat has and what belongs in it. Memory calls need no approval (they never touch the person's files) and sub-agents do not get the tool.

### app/engine/skills.py · skills
- refers-to: app/engine/skills.py; app/engine/cmd_skill.py; app/engine/tools.py :: SKILL; app/harness/prompt.py :: SKILLS
- kind: rationale
- logged: v0.6.1 · 2026-10-12

A skill is a folder in `data/skills` with a SKILL.md whose frontmatter has `name` (lowercase, digits, hyphens, up to 64) and `description`, the format Claude Code and claude.ai use. Every skill that is on is listed by name and description in the system prompt (progressive disclosure: the body loads only when needed) and a `skill` tool returns the SKILL.md with its file list, or one file inside the folder, confined to it. A .zip upload installs the shallowest folder holding a SKILL.md (the folder name is the fallback name); a lone SKILL.md or a written skill installs through a staging folder. The list takes only valid names, since `skills.changed` is published while the staging folder exists. On and off is a list in the `meta` table. Skills run on the person's computer through Format's own tools; the Skills API with code execution containers is not used.

---

## app/engine/connectors.py {#app-engine-connectors}

### app/engine/connectors.py · two routes for MCP servers
- refers-to: app/engine/connectors.py :: route, request_parts, call, _Manager; app/harness/request.py :: build (mcp_servers, betas); app/engine/tools.py :: definitions, run (mcp__); app/engine/chat.py :: tool_view (mcp_tool_use, mcp_tool_result)
- kind: rationale
- logged: v0.6.2 · 2026-10-12

Anthropic's MCP connector (read on platform.claude.com 2026-10-12: beta `mcp-client-2025-11-20`, `mcp_servers` entries of type url with name and optional `authorization_token`, one `mcp_toolset` per server in `tools` with per-tool `configs`, results as `mcp_tool_use` and `mcp_tool_result` blocks, tool calls only, https and public servers only, local stdio not supported; `mcp-client-2025-04-04` deprecated; a newer `mcp-client-2026-09-15` adds tool-list pinning and is not used yet) reaches only public https servers, and Anthropic's servers make the calls, so there is no approval step. So a connector takes one of two routes. A public https URL goes to the API: the toolset's configs carry the tools the person turned off, and any request whose history holds MCP blocks keeps the beta. Everything else (a URL on this computer or a private network, and every command) is run by the engine with the MCP Python SDK (`mcp` 2.3.0, `Client` over Streamable HTTP with an `httpx2` client for the token, or over stdio), and its tools are offered to Claude as ordinary client tools named `mcp__<connector>__<tool>` (64 characters at most), which go through the same approval as bash: Ask holds them, Always allow adds the name to `toolAllow`, Plan refuses them. The engine also lists a public server's tools for the window when it can reach it; when it cannot (a proxy, as in the build workspace), the connector still works through the API.

### app/engine/connectors.py · sessions
- refers-to: app/engine/connectors.py :: _Manager, connect, call
- kind: warning-context
- logged: v0.6.2 · 2026-10-12

The engine's tools run in worker threads, and the MCP SDK is async. One background thread runs an event loop for all connectors; each connector keeps one session (and, for a command, one server process) open across calls, so a stateful server stays consistent (checked with a counter that went 1 then 2 across two chats). A session is replaced when the URL, command, token or environment changes, dropped when the connector is turned off or removed, and dropped and marked error when a call fails; the next call or Reconnect opens a new one. Calls time out after 120 s, connecting after 30 s. Text results are joined; images and other content are named, not sent; results are cut at 30,000 characters.

---

## app/engine/cmd_files.py, comments and activity {#app-engine-cmd-files}

### app/engine/cmd_files.py · the chat folder as files
- refers-to: app/engine/cmd_files.py :: list_, read, kind; app/engine/chat.py :: _call_tool (files.changed); app/routers/files.py :: chat_file
- kind: rationale
- logged: v0.5.1 · 2026-10-12

`files.list` walks the chat's own folder (the one the tools work in), skipping `tools.SKIP_DIRS` and dot folders, up to 2000 files, and classes each by name into a preview kind; `.svg` counts as an image because an `<img>` never runs its scripts. `files.read` reads text kinds only, cut at 1 MB. Paths go through `tools.output_path`, the same confinement the tools use (a symlink out of the folder resolves outside and is refused). There is no watcher: `files.changed` is published after every bash, write and edit call, which are the only ways the engine changes the folder; a change from the person's own terminal shows on the next listing. Every file served from `/api/chats/{id}/files/` carries `nosniff`, `no-referrer` and, except PDFs, `sandbox; default-src 'none'` with images, media and inline styles allowed: an HTML or SVG file opened inline in a tab would otherwise run on the engine's origin. PDFs are left without it because the browser's PDF viewer does not run in a sandboxed document.

### app/engine/cmd_chat.py · comments on files
- refers-to: app/engine/cmd_chat.py :: send, _comments, edit; app/harness/content.py :: comment_blocks; app/harness/request.py :: api_messages
- kind: rationale
- logged: v0.5.1 · 2026-10-12

A comment is `{path, quote, note}` on a file of the chat; up to 20 go with one message in `meta.comments`, and a message may be comments alone. They stay structured in the store (the window draws them as cards) and become one text block only when the request is built, placed after attachments and before the typed text, quoting the passage line by line so Claude can find it. A new chat cannot carry comments, since it has no files yet. `chat.edit` keeps them with the attachments.

### app/engine/cmd_conversation.py · activity
- refers-to: app/engine/cmd_conversation.py :: list_
- kind: explainer
- logged: v0.5.1 · 2026-10-12

`conversation.list` adds `activity` to each chat: `waiting` when `tools.pending` has an approval or question for it, `running` while `chat.running`, otherwise null. It is computed at listing time from in-memory state, so it is lost with the engine like the runs themselves; the window keeps it current from events after that.

---

## app/mcp_server.py, routers/mcp_http.py, mcp_stdio.py, engine/agents.py {#app-mcp-server}

### app/mcp_server.py · one tool per command
- refers-to: app/mcp_server.py :: build, list_tools, call_tool
- kind: rationale
- logged: v0.7.0 · 2026-10-12

The registry already describes every command (label, description, typed params, `mutates`), so the server is generated from it rather than hand-listed: a tool per command, named with `.` turned into `_` because several MCP clients reject dots in tool names, plus `run_command` for an id by string. Annotations come from `mutates` and the verb: not mutating is read-only and idempotent; delete, clear, removeFile, stop and close are destructive; setters, renames, pins, moves and waits are idempotent; `chat.*` is open-world because it reaches the Anthropic API. Results are the command's JSON as text, capped at 60k characters so one transcript cannot flood an agent's context; errors come back with `isError` rather than a protocol error, so the agent sees the message. Resources expose what an agent most wants to read without a tool call: a chat as Markdown (`format://conversation/{id}`) and an artifact's latest HTML (`format://artifact/{id}`), the 50 most recent of each listed, both also as templates. The lowlevel `Server` is used, not FastMCP, because the tool list is dynamic.

### app/agent_guide.py · names and when-sentences for agents
- refers-to: app/agent_guide.py :: GUIDE, tool_name, command_of, when, for_agents; app/mcp_server.py :: describe, call_tool, INSTRUCTIONS
- kind: rationale
- logged: v0.9.0 · 2026-10-12

From v0.9.0 tools are named verb_noun (`send_message`, `wait_for_reply`, `publish_artifact`, `list_conversations`), because agents choose tools by reading a name as an action, and `chat_send` or `conversation_list` read as nouns. The names and one "Use when" sentence per command live in one table in `agent_guide.py` rather than in each `@command`, so the CLI's dotted ids stay the engine's vocabulary and the agent vocabulary is reviewed in one place; a command missing from the table falls back to the dotted id with underscores, and so do the v0.7 names, which still answer. Each description is the command's description with dotted ids rewritten to tool names, the when-sentence, and the command id in parentheses (for `run_command` and the CLI). Error messages get the same rewrite, so "conversation.list gives the ids" reaches an agent as "list_conversations gives the ids". `setup/agents.py` builds the generated references from the same table.

### setup/agents.py · ./format agents
- refers-to: setup/agents.py :: sync, install, tools_md, tool_map_md, command_map_md; format, format.bat :: agents
- kind: explainer
- logged: v0.9.0 · 2026-10-12

`sync` imports the registry without starting the engine and writes three generated references (`.claude/skills/format-driving/references/tools.md`, `format-harness/references/tool-map.md`, `command-map.md`), each with a contents list and no tag-shaped text, so the skill validator passes; then it replaces `.agents/skills` with a copy of `.claude/skills`, because Codex reads skills from `.agents/skills` and a symlink would not survive Windows checkouts or zips. Files are rewritten only when their text changed. `install` runs sync, reports the three project configs, and with `--user` appends Format to `~/.codex/config.toml` (once) and registers it at Claude Code's user scope when the `claude` command exists; nothing outside the repo changes without `--user`.

### app/routers/mcp_http.py · Streamable HTTP at /mcp
- refers-to: app/routers/mcp_http.py :: Endpoint, running; app/main.py :: lifespan, routes
- kind: warning-context
- logged: v0.7.0 · 2026-10-12

`app.mount("/mcp", ...)` answered `/mcp` with a 307 to `/mcp/`, which Claude Code and Cursor do not follow for POST. The server is added as an explicit `Route("/mcp")` whose ASGI endpoint rewrites the path to `/` for the SDK's app, and the session manager's task group runs inside the engine's lifespan. It binds to the engine's own 127.0.0.1 listener, so only this computer can reach it. Calls run the command in a thread, since commands are synchronous and some (chat.wait) block.

### app/mcp_stdio.py · ./format mcp
- refers-to: app/mcp_stdio.py :: main; format, format.bat :: mcp
- kind: rationale
- logged: v0.7.0 · 2026-10-12

Agents that only start servers themselves (Codex) get a stdio server that proxies to the running engine's REST API (`FORMAT_ENGINE_URL`, default 127.0.0.1:8490) instead of opening the store itself: one process owns SQLite, events reach the window, and a chat started by an agent streams on screen. The catalogue is read from `GET /api/commands` at start. Each call carries `x-format-agent: <client name>` so the engine applies the same consent as over HTTP.

### app/engine/agents.py · consent for outside agents
- refers-to: app/engine/agents.py :: require, status; app/engine/cmd_settings.py :: outsideAgents; app/routers/commands.py :: run
- kind: rationale
- logged: v0.7.0 · 2026-10-12

Setting `outsideAgents` is ask, allowed or blocked, default ask. In ask, the first call publishes `agents.consent` and holds for up to 120 s, polling the setting, so the agent's call simply succeeds once the person presses Allow in the window; Block or no answer refuses with a sentence the agent can relay. The choice is one setting for every outside agent rather than per client, because client names are self-reported and cannot be trusted to tell agents apart. REST calls from the window carry no header and are never gated. `agents.status` lists the clients seen since start (name, channel, last call), kept in memory only.

### app/engine/cmd_artifact.py · artifact.publish
- refers-to: app/engine/cmd_artifact.py :: publish_
- kind: explainer
- logged: v0.7.0 · 2026-10-12

The same `artifacts.publish` Claude's tool uses, without a message id, so a page an agent publishes lands in a chat's gallery, opens in the window and gets versions when `artifactId` is passed again. It publishes `artifact.changed`, so an open Artifacts page updates live.

### app/engine/terminal.py · restart and the generation guard
- refers-to: app/engine/terminal.py :: restart, _pump, Session.gen; app/routers/terminal_socket.py :: outbound
- kind: rationale
- logged: v0.7.0 · 2026-10-12

Restart keeps the session id, title, folder and attached sockets and swaps the PTY underneath. Each pump thread carries the generation it was started with and drops output, and its exit, once the session's generation has moved on; without that, the old shell's last bytes or its EOF would arrive after the new shell's prompt and mark the tab exited. Scrollback is cleared and `ESC c` (full reset) is sent to attached terminals so xterm clears itself in one write. The socket's sender now keeps listening after an exit, so a tab whose shell had exited comes back on restart without reconnecting. The size is kept from the last resize so the new shell starts at the window's dimensions.

---

## app/engine/schedules.py and the Claude terminal {#app-engine-schedules}

### app/engine/schedules.py · the scheduler
- refers-to: app/engine/schedules.py :: next_after, tick, fire, start; app/routers/__init__.py :: startup, shutdown
- kind: rationale
- logged: v0.7.1 · 2026-10-12

A scheduled task is a row with a cadence (manual, once, hourly, daily, weekdays, weekly), a local time `at` and, for weekly, a weekday; `next_run` is stored, so the loop is a single indexed query every 15 s (`FORMAT_SCHEDULER_TICK` shortens it for checks). Times are the engine computer's local time through `datetime.fromtimestamp`, which follows daylight saving changes. A run is `chat.send` with the task's prompt, project and name as the chat title, so a run is an ordinary chat: it streams in the window, shows activity dots, can be continued, and is listed in `schedule_runs` with its trigger (schedule or manual) and any error that stopped it starting. Missed runs are not replayed one by one: on start the first tick finds `next_run` in the past, runs once and moves `next_run` past now, which is what a person who closed the laptop overnight expects. Once tasks clear `next_run` after their run. Run now does not move the schedule. Runs follow the person's permission mode; nothing is approved on their behalf, so a run that needs an approval or an answer waits and shows as waiting in Background and on the task's page.

### app/engine/schedules.py · run status and background.list
- refers-to: app/engine/schedules.py :: run_status, _run, background
- kind: explainer
- logged: v0.7.1 · 2026-10-12

A run's status is read, not stored: waiting when `tools.pending` has an item for its chat, running while `chat.running`, otherwise the last assistant message's status (done, stopped, error as failed); a chat deleted since shows as deleted. `background.list` is the same reading over `chat.RUNS` (replies, summaries and runs alike), with the scheduled task a chat belongs to.

### app/engine/terminal.py, app/engine/chat.py · the Claude terminal
- refers-to: app/engine/terminal.py :: agent_session, agent_write; app/engine/chat.py :: _mirror, the bash branch of the tool executor; app/engine/cmd_terminal.py :: write, restart
- kind: rationale
- logged: v0.7.1 · 2026-10-12

Every bash command Claude runs is mirrored into one read-only terminal session of kind `agent`, titled Claude: the command after an orange prompt, its output as it streams, and the exit line. It has no PTY (`proc` is None), so write, resize and restart are refused or skipped for it, and it rides the same scrollback, socket and events as a shell, which is why the dock can show it without new plumbing. One tab for all chats, not one per chat, keeps the dock from filling with a tab for every chat that ever ran a command; a bold line with the chat's title and folder marks each switch between chats. Two chats running commands at the same moment interleave their output in that tab; the cards in each chat stay separate. Newlines become CRLF so xterm returns to the first column.

---

## native/format-render and app/engine/native.py {#native}

### native/format-render · what the native renderer is for
- refers-to: native/format-render/src/lib.rs :: native_start, native_force, Gpu; src/budget.rs; src/grid.rs; src/grid.wgsl; src/bin/format-render.rs; examples/window.rs
- kind: rationale
- logged: v0.8.0 · 2026-10-12

Open question 4 set the rule: a Rust engine where it is needed, scaffolded to the family standard and used on measured need. The measurement came first: in the window under 4x CPU, the DOM terminal (xterm 6) printed 200,000 lines in 4.2 s with a median frame of 16.7 ms, a 95th percentile of 67 ms and two long tasks (203 ms in all), so the browser terminal does not need replacing and stays the only terminal in the window. The crate therefore does the planned first job, the terminal glyph grid, where the browser cannot: drawing a terminal's real screen (colours, inverse, dim, 256 and true colour, box drawing, the cursor) as an image for agents and checks, and in a native window for the desktop shell to come. The grid is one full-screen triangle: the fragment shader finds its cell, reads glyph slot and packed colours from an Rgba32Uint cell texture, and the coverage from an R8 glyph atlas rasterized with fontdue from the bundled JetBrains Mono (OFL, licence beside it); textures and textureLoad only, no storage buffers, so the OpenGL backend (Mesa llvmpipe here) runs it like Metal, Vulkan and Direct3D 12 do. vt100 parses the PTY's bytes into the screen. Limits start from the WebGL2 defaults raised to the adapter's resolution limits. `native_start` returns nothing unless FORMAT_NATIVE is 1, true, on or yes; `native_force` is for the CLI's own probes. Pins: wgpu 30.0.1, pollster 1.0.1, fontdue 0.9.4, vt100 0.16.2, png 0.18.1, winit 0.30 behind the window feature.

### app/engine/native.py · the engine side
- refers-to: app/engine/native.py :: enabled, binary, info, snapshot, status; app/engine/cmd_terminal.py :: snapshot; app/routers/files.py :: native_snapshot; format, format.bat :: native
- kind: rationale
- logged: v0.8.0 · 2026-10-12

The engine runs the crate's binary (`target/release/format-render`, else debug) as a subprocess with JSON on stdout, so Python needs no bindings and a crash in a GPU driver cannot take the engine down. `native.status` reports built, enabled and, when on, the adapter (probed once and cached). `terminal.snapshot` writes the session's scrollback to a temporary file, renders it at the session's size into `data/snapshots/<id>-<ms>.png`, and returns the path and `/api/native/snapshots/<name>`, which serves only names of that exact shape. With FORMAT_NATIVE unset nothing runs: the window and every other command behave as before, `terminal.snapshot` answers 409 with how to turn it on, and Settings, About says built, off. `./format native build|info|window` builds the crate, prints its adapter, or opens the demo window.

---

## Gap closures: research, sandbox and the rest {#gaps}

### app/harness/prompt.py, app/engine/chat.py · Research mode
- refers-to: app/harness/prompt.py :: RESEARCH; app/harness/request.py :: build; app/engine/chat.py :: start, _run; app/engine/cmd_chat.py :: send (research)
- kind: rationale
- logged: v0.10.0 · 2026-10-12

Research is a property of one user message (`meta.research`), set by `chat.send research`, so the toggle in the window can stay on across messages and agents can ask for it per call. When the reply starts, `chat.start` reads it from the path's last user message and runs that reply with web tools forced on and effort raised to high (lowered by `_effort` to what the model supports), and the harness appends the RESEARCH instruction block: plan the questions, search several times, fetch primary sources, use sub-agents for independent threads, finish with a cited report and a Sources list, publish long reports. The reply's meta records `research` so the window can label it. It is a mode of the normal tool loop rather than a separate agent, which keeps approvals, cards, compaction and stop working unchanged.

### app/engine/sandbox.py · sandboxed code
- refers-to: app/engine/sandbox.py :: kind, status, wrap, status_command; app/engine/tools.py :: _bash, definitions; app/engine/cmd_settings.py :: sandbox, sandboxNetwork
- kind: rationale
- logged: v0.10.0 · 2026-10-12

Claude's bash runs inside an OS sandbox when one is available and setting `sandbox` is on (default on). Linux uses bubblewrap: the whole filesystem read-only, a fresh /tmp, the person's home folder and Format's data folder replaced by empty tmpfs mounts (so keys, other chats and personal files are not readable), only the chat's own folder bound writable and used as HOME, separate pid, ipc and uts namespaces, killed with the parent, and no network unless `sandboxNetwork` is on. macOS uses sandbox-exec with a profile that denies writes outside the chat folder and temp, denies reads of the home and data folders, and denies network likewise (written from Apple's profile language, not run here). Windows has no equivalent and runs commands unsandboxed, which `sandbox.status` and Settings say. The bash tool's description tells Claude about the sandbox so it reports a failed install instead of retrying it. Verified on Linux: writes inside the folder work, the repo is read-only, the home and data folders are empty, the network fails without the setting and works with it.

### app/engine/documents.py · documents, spreadsheets and slides
- refers-to: app/engine/documents.py :: write, merge, split_doc, split_deck, render_export, standalone_html, export, write_command; app/engine/tools.py :: write_document; app/engine/artifacts.py :: publish (kind); app/routers/files.py :: artifact_page, artifact_source, artifact_export; app/harness/prompt.py :: OUTPUTS; app/harness/content.py :: comment_blocks
- kind: rationale
- logged: v0.10.1 · 2026-10-12

Documents, spreadsheets and decks are artifacts with a kind (doc, sheet, deck) and a plain-text source: Markdown with one `##` heading per section, CSV with a header row, Markdown slides separated by `---` lines. Plain text keeps versions, diffs, the code view and Claude's own editing simple, and every richer format is rendered from it. Claude writes them with the `write_document` tool; with `artifact_id` and `section` it replaces one section (matched by heading, case-insensitive) or one slide (by number or title), or appends it when missing, so a long document is built outline first and then section by section, each call a new version the person watches arrive. Exports are generated on request from the source: docx with python-docx, xlsx with openpyxl (numbers become numbers, the header bold), pptx with python-pptx (16:9, Studio Dark colours, title, accent bar, bullets), and PDF with reportlab (A4 flowing document, or 16:9 slide pages), all MIT or BSD licensed and pinned in both requirements files. The artifact page URL serves a standalone read-only HTML rendering for these kinds, so pop-out, share and agents see something sensible. The composer's Create picker sends `output` with the message; the reply then carries the matching OUTPUTS instruction. A comment on a section arrives as `artifact:[id]#[heading]` and `comment_blocks` tells Claude which artifact and section it is about and how to revise it.

### app/engine/documents.py · export and write for agents
- refers-to: app/engine/documents.py :: export, write_command; app/agent_guide.py :: export_artifact, write_document
- kind: explainer
- logged: v0.10.1 · 2026-10-12

`artifact.export` writes the file into `data/exports` and returns its path and the download URL; `artifact.write` is the same write as Claude's tool for agents and the CLI.

### app/engine/devices.py · other devices and share links
- refers-to: app/engine/devices.py :: Gate, _serve, _start, _launch, stop_server, bind, lan_addresses, base_url, _paired, _secret, status, start, stop, forget, share, unshare, shares, shared_page; app/engine/store.py :: shares (schema 8); app/routers/__init__.py :: startup, shutdown
- kind: explainer
- logged: v0.10.2 · 2026-10-12

The engine itself stays on 127.0.0.1. Opening to other devices starts a second uvicorn server inside the engine's own event loop (scheduled with `run_coroutine_threadsafe` on the loop bound at startup, signal capture disabled so it never takes over Ctrl+C) on 0.0.0.0:8492, wrapping the same FastAPI app in `Gate`. Gate lets `/s/` share links and the favicon through to anyone, turns `/pair?code=` with the right secret into a one-year HttpOnly SameSite=Lax cookie and a redirect, and refuses everything else without that cookie (a 401 page, or a WebSocket close before accept, which uvicorn answers with 403). Paired devices get the built window from `frontend/dist` and the full API and event stream, so a chat started on the computer continues on the phone live and the other way round. The secret lives in `data/pairing.json` (mode 600); `devices.forget` replaces it, which unpairs every device at once. The pairing QR is an inline SVG from segno (BSD-3, pinned in both requirements files), so no image service is involved. One pairing secret for all devices instead of per-device tokens: a home network with one person's phone and laptop is the case, and Forget is the revocation. Turning it off stops the server; nothing listens on the network unless the person turned it on.

Share links: `artifact.share` makes (or reuses) an unguessable token per artifact in the `shares` table; `/s/{token}` serves the latest version with the artifact CSP plus `frame-ancestors 'none'`, read-only, and `artifact.unshare` revokes it so the link answers 410. The URL uses the LAN address while other devices are open, otherwise 127.0.0.1, and the window says which.

### app/engine/devices.py · testing behind a proxy
- refers-to: app/engine/devices.py :: Gate
- kind: warning-context
- logged: v0.10.2 · 2026-10-12

A client that honours HTTPS_PROXY sends `ws://` to the LAN address through the proxy, and a corporate or sandbox proxy refuses it with its own 403 (header `X-Proxy-Error`). That is the proxy, not Gate: clear the proxy variables, or launch the browser with `--no-proxy-server`, when checking a paired device.

### app/engine/plugins.py · Claude plugins
- refers-to: app/engine/plugins.py :: install, set_enabled, owner_of_skill, plugin_list, plugin_get, plugin_add, plugin_enable, plugin_delete; app/engine/skills.py :: _summary (plugin)
- kind: explainer
- logged: v0.10.3 · 2026-10-12

A plugin is the Claude plugin folder format: `.claude-plugin/plugin.json` (name, description, version, author) with `skills/<name>/SKILL.md`, `commands/*.md` and `.mcp.json` (or `mcpServers` in plugin.json, inline or as a path). Format copies the folder into `data/plugins/<name>` and installs its parts into the systems it already has, so nothing new runs at request time: each skill becomes a Format skill named `<plugin>-<skill>` (the namespacing Claude Code shows as plugin:skill, with a hyphen because skill names are lowercase letters, digits and hyphens), each command becomes a skill whose description is the command's (Format has no slash commands; Claude loads it by description or the person picks it from the + menu), and each MCP server becomes a connector (stdio servers as a command with `${CLAUDE_PLUGIN_ROOT}` expanded to the installed folder and their env; URL servers with a Bearer token taken from an Authorization header). What a plugin added is recorded in `.format-plugin.json` inside its folder, so turning the plugin off turns those skills and connectors off together, and removing it removes them; re-adding a plugin of the same name replaces it cleanly. A failed install rolls back whatever it had added. Hooks and agents folders are kept on disk but not run: Format has no hook points or agent definitions of that shape, and running a plugin's hook scripts automatically would execute code the person never looked at.

### app/engine/browser.py · the built-in browser
- refers-to: app/engine/browser.py :: _worker, _do, act, tool, DEFINITION, SNAPSHOT_JS, frame, status, open_, act_, close, stop; app/engine/tools.py :: definitions, run (browser); app/engine/cmd_settings.py :: browserTools, TOOL_NAMES; setup/install_browser; backend/requirements_browser.txt
- kind: explainer
- logged: v0.10.3 · 2026-10-12

One headless Chromium (Playwright, Apache-2.0, optional through `./format install-browser`) in a persistent profile at `data/browser`, so sign-ins made in it stay in Format and apart from the person's own browser. Playwright's sync API must stay on the thread that started it, so a single worker thread owns the browser and every call (Claude's tool, the pane, the CLI) is a job on its queue; after each job the worker takes a JPEG of the page and publishes `browser.frame` with a sequence number, and the window fetches `/api/browser/frame`. Claude gets text, not pixels: each action returns the title, URL, the visible interactive elements numbered with a `data-ft-ref` attribute, and the page text (12,000 characters), and click, type and select take a ref from the latest snapshot. That keeps replies small and avoids storing screenshots in the chat. The tool is offered only when Playwright is importable and the setting `browserTools` is on, never to sub-agents (one shared page), and it asks before running in Ask mode like bash ("Always allow" adds browser to toolAllow). If Chromium is missing the worker reports how to install it and exits, so the next call tries again after an install.

### app/engine/browser.py · install and size for the app
- refers-to: app/engine/browser.py :: browsers_dir, installed, _install_job, install, act_ (resize), act (resize, click_at), _worker (device_scale_factor)
- kind: explainer
- logged: v0.11.0 · 2026-10-12

The desktop app carries Playwright's package and its Node driver but not Chromium (about 150 MB per platform, and Playwright keeps one shared copy per user anyway). `installed()` looks for a `chromium*` folder where Playwright keeps browsers (`PLAYWRIGHT_BROWSERS_PATH`, else the per-OS cache folder), and `browser.install` runs the bundled driver's `install chromium` on a thread, publishing `installing` and then the result, so the pane can offer Install the browser and show progress. The page used to be drawn at a fixed 1280 by 800 and shrunk into a pane half that wide, which made text unreadable; now the pane reports its own size (`resize`, remembered without starting the browser and applied to a running page), the context draws at device scale 2, and `click_at` maps by the current viewport. Claude's snapshots are unaffected.

### format_engine.py and src-tauri · the desktop app
- refers-to: backend/format_engine.py :: app_data_dir, free_port, adopt_login_path, watch_parent, prepare_env, selfcheck, main; app/core/config.py :: DESKTOP, frontend_dist, dist_dir; app/engine/devices.py :: _dist; src-tauri/src/main.rs; src-tauri/tauri.conf.json; src-tauri/Info.plist; src-tauri/entitlements.plist; setup/freeze_backend(.bat), desktop_build(.bat), desktop_dev(.bat), install_desktop(.bat); .github/workflows/desktop.yml
- kind: explainer
- logged: v0.11.0 · 2026-10-12

Modelled on formlit 0.5.0 and formvis 1.66.1: Tauri 2 (2.12.3 here), a splash window, the engine as a PyInstaller onefile sidecar whose uvicorn start line carries the port, a main window on that URL, the sidecar killed on exit, the updater dormant until a public key is set, and the same four-runner workflow with `macos-15-intel` in place of the retired `macos-13`. What Format adds: the data folder moves to the platform's app-data folder (a frozen app's own folder is temporary and read-only); port 8490 is kept when free so agents' MCP settings and the docs stay true; a macOS GUI app starts with a bare PATH, so the engine asks the login shell for it (terminals, Claude's bash and command connectors need node, npx and Homebrew tools); the engine also exits on its own when the shell's process is gone, because a killed shell skips its exit hook; the engine's output goes to `engine.log` in the app's log folder, which is what a bug report will need. Format's window does a few things a bare webview does not: downloads and exports (`on_download` saves into Downloads under the server's name and reveals the file), pop-outs and Open link (`on_new_window` and `on_navigation` send other origins to the default browser instead of opening a second webview), and dictation (`on_permission_request` grants the microphone; Info.plist and the audio-input entitlement let macOS ask). The page has no `remote` capability and never calls Tauri, so the web build and the app are the same code. `--collect-submodules app` covers every lazy import; mcp's CLI is excluded because it needs typer; Playwright and faster-whisper are collected only when installed, so a lean freeze still works; the freeze refuses to copy a binary that fails `--selfcheck`.

### app/engine/claude_code.py · answering through Claude Code
- refers-to: app/engine/claude_code.py :: child_env, cli, info, route, status, view_of, run; app/engine/chat.py :: start; app/harness/request.py :: api_messages; app/engine/cmd_account.py :: _status; app/engine/cmd_settings.py :: chatEngine
- kind: rationale
- logged: v0.12.0 · 2026-10-12

The owner wants Format to work with no API key by acting as a middleman to Claude Code. This reverses DEV_PLAN's "API key only" non-goal by the owner's decision. Format never reads Claude Code's credentials or speaks to claude.ai: it runs the person's installed `claude` CLI in headless mode, so the sign-in, plan limits and tools stay Claude Code's. One run per reply: `claude -p --input-format stream-json --output-format stream-json --verbose --include-partial-messages --permission-prompt-tool stdio` in the chat's folder, the model and effort from Format's settings, Format's preferences and project instructions in `--append-system-prompt`, attachments named by path with the uploads folder in `--add-dir`. The `stream_event` lines are raw Messages API events, so they map onto Format's blocks the way the Anthropic adapter's do; `user` lines carry tool results; lines with `parent_tool_use_id` are a sub-agent's and go to `meta.agents` like `spawn_agent`'s. Permission prompts arrive as `control_request` `can_use_tool` on stdout and are answered with `control_response` on stdin: Ask uses Format's approval wait and card, Auto allows, Plan denies; `AskUserQuestion` goes through Format's question card and returns `answers`. Without `--permission-prompt-tool stdio` Claude Code 2.1.296 denied silently in print mode (checked). Sessions: the reply stores `claudeCode.session`; the next reply resumes the session of the assistant message before it with `--fork-session`, so every reply has its own session and an edit higher up branches from the right point; a chat that began on the API gets its earlier text as a transcript instead. Tool names are stored as Format's (`Bash` as `bash`, `file_path` also as `path`, `ccName` kept) so the cards and reloads need nothing new; `api_messages` sends only the text of these replies if the chat later moves to the API, since the tools differ. The child environment drops `CLAUDE*` variables except the auth and provider ones, so an engine started from inside a Claude Code session does not join that session. Stop terminates the process; a pending approval is answered as denied.
- Checked here against a stand-in for the Messages API (scratch `mock_cc_api.py`, Claude Code 2.1.296 with `ANTHROPIC_BASE_URL`): first reply, a resumed and forked second reply, an approval allowed in the window (file written in the chat's folder), Stop during an approval (process gone, no file), Auto and Plan, and the window under 4x CPU and a slow network with layout shift 0. Not checked: a real Claude plan sign-in on the owner's Mac.

### app/engine/cmd_files.py · files.save_download
- refers-to: app/engine/cmd_files.py :: downloads_dir, _filename, _reveal, save_download; app/engine/cmd_app.py :: info (desktop)
- kind: rationale
- logged: v0.11.0 · 2026-10-12

In the desktop app the window does not hand downloads to the webview: it asks the engine to fetch the engine's own URL (only paths under `/api/`) and write it to the Downloads folder under the server's `Content-Disposition` name, numbered if taken, then reveal it in the file manager. Running the Linux build showed why: WebKitGTK saved downloads itself, ignoring the destination Tauri's download hook sets (the hook was never called), so files landed in the app's working folder; macOS's WKWebView and Windows' WebView2 each have their own download plumbing that could not be checked from here. One engine path behaves the same on all three and is checked here end to end. The Downloads folder is the XDG one on Linux when set, else `~/Downloads`. The command is safe to call from the CLI or an agent too. Commands run in FastAPI's thread pool, so the engine requesting itself does not block its own event loop.

### build_app and setup/lib.sh · one command for the desktop app
- refers-to: build_app (file); setup/lib.sh :: ft_rust_env, ft_rust_fresh, ft_venv_python; setup/freeze_backend, desktop_build, desktop_dev, install_desktop; format :: desktop build; src-tauri/Cargo.toml :: profile.release.build-override
- kind: rationale
- logged: v0.11.1 · 2026-10-12

The owner's first macOS build stopped twice. Run from `setup/`, `desktop_build` said to run `./format install-desktop`, which is not in that folder; after that, cargo compiled `phf_macros` and then could not load it (`E0463 can't find crate for phf_macros`, rustc 1.97.1 while rustup's stable is newer, so most likely Homebrew's `rust` on PATH). A proc macro is a dylib that one rustc builds and the next rustc loads, so anything that splits the two (two Rust installs on PATH, a `RUSTC_WRAPPER` cache such as sccache, a target folder from another compiler, a stripped dylib) fails exactly this way. `build_app` is the one entry the owner asked for: it runs from its own folder, so the folder you call it from does not matter; it uses rustup's stable everywhere (`~/.cargo/bin` first, `RUSTUP_TOOLCHAIN`, the environment overrides cleared, and a stop if `rustc` and `cargo` still come from different folders); it stamps the compiler into `target/.format-rustc` and cleans the target when that changes, and cleans and retries once on a Rust compile error. Proc macros and build scripts are no longer stripped. The macOS disk image is made with `hdiutil` from the built `.app`, since Tauri's `bundle_dmg.sh` scripts Finder and fails without Automation permission in a plain terminal. The app is copied to Applications with its quarantine flag cleared, so the ad-hoc signed build opens without the warning. The exact cause on that Mac could not be reproduced here; the script removes every split it can see and leaves `build_app.log` for the next report.

### format.bat · desktop build passes its arguments on
- refers-to: format.bat :: desktop (label); setup/desktop_build.bat
- kind: rationale
- logged: v0.25.1 · 2026-10-30

formcompiler builds the Windows release with `call .\format.bat desktop build %FORMCOMPILER_CONFIG_ARG%`, where the argument is `--config <file>` carrying the updater settings (createUpdaterArtifacts, pubkey, endpoints). `format.bat` used to call `setup\desktop_build.bat` with no arguments, so the Windows installer was built without updater artifacts and left out of `latest.json`. The `desktop` branch is now a label: anything but `build` runs `desktop_dev.bat`; `build` calls `desktop_build.bat %2` to `%9` (after the launcher's one `shift`, `%1` is `build`), and that script hands `%*` to `tauri.cmd build`. Eight slots cover `--config <file> --target <triple>` with room to spare. A label rather than a parenthesised block, because cmd expands `%2` inside a block when it parses it, and a `)` in a forwarded path would close the block. `goto :eof` keeps the build's errorlevel, so a failed build still fails the caller.

### setup/build_lgpl_av.bat and setup/build_lgpl_ffmpeg_msys2 · the Windows FFmpeg build
- refers-to: setup/build_lgpl_av.bat (file); setup/build_lgpl_ffmpeg_msys2 (file); NOTICE.md :: FFmpeg source paragraph
- kind: rationale
- logged: v0.25.1 · 2026-10-30

The Windows FFmpeg step used to be one `bash -lc "..."` line inside a parenthesised `if` block. cmd does not know `\"`, so each `\"` flipped its quote state and left `$(cygpath ...)`, `$(sha256sum $f | cut ...)` and their `)` and `|` unquoted inside the block: the block closed early and the line could not run as written. The MSYS2 half is now its own bash script, `setup/build_lgpl_ffmpeg_msys2`, and the batch file hands it every value through the environment (FFMPEG_VERSION, FFMPEG_SHA256, LGPL_FFMPEG_PREFIX, LGPL_FFMPEG_WORK, LGPL_MSVC_BIN), so nothing needs quoting across the two shells; the script refuses to run when one is missing.

MSYS2 is found at `MSYS2_ROOT` (default `C:\msys64`, where windows-latest has it). The variable that held bash's path was called `MSYS`, which is the MSYS2 runtime's own options variable; it is now `MSYS_BASH`. The shell starts as a login shell with `MSYS2_PATH_TYPE=inherit` (so MSVC's INCLUDE, LIB and PATH from vcvars or the runner come through) and `CHERE_INVOKING=1`. MSYS2's `/usr/bin/link.exe` (coreutils `link`) comes before the inherited Windows PATH and would be run by FFmpeg's `--toolchain=msvc` as the linker; FFmpeg's Windows notes say to put MSVC's folder first. The batch file takes the folder of the first `cl.exe` on PATH (link.exe sits beside it in every MSVC toolset folder, and the batch file checks that), and the script puts that folder first on PATH, then runs `link` with no arguments and stops unless its banner says Microsoft. pacman syncs its database first (`pacman -Sy --noconfirm --needed make diffutils nasm pkgconf`); a plain `-S` on a runner image with an old database fails with 404s for packages the mirrors have replaced. Not `-Syu`: a full upgrade can replace msys2-runtime under the running shell. The script runs under `set -euo pipefail`, checks for cl, nasm, make, pkg-config, curl, tar and sha256sum, removes a tarball whose checksum is wrong so the next run downloads it again, prints the last 40 lines of `ffbuild/config.log` when configure fails, and the batch file stops with exit 1 on any failure and again if no headers were installed. The configure flags are the ones the batch file had, unchanged.
---

## Skills invoked by name and Allow all {#skills-invoked}

### app/engine/skills.py · INVOKE, enabled_names, invoked, invocation_blocks
- refers-to: app/engine/skills.py :: INVOKE, enabled_names, invoked, invocation_blocks
- kind: rationale
- logged: v0.13.0 · 2026-10-18

A skill named in a message is loaded for that message rather than left to Claude's judgement: `/name` (at the start or after a space or parenthesis, ending at a space, punctuation or the end) and "use, run, load, apply or with the name skill" both count, for enabled skills only, so a path such as `/usr/bin` or a skill that is off or missing is ignored. `invocation_blocks` returns one text block per invoked skill, "The person invoked the skill name for this message: follow it." followed by its SKILL.md (through `load`, so the file list says to read more with the skill tool), or, for Claude Code, the folder path and SKILL.md. `enabled_names` lists folder names without reading every SKILL.md, since the API path calls it on every request.

### app/harness/request.py · api_messages, invoked skills
- refers-to: app/harness/request.py :: api_messages (names, the user branch)
- kind: explainer
- logged: v0.13.0 · 2026-10-18

Each user turn gets its invoked skills' blocks after its attachments and comments and before its text, the same place comment blocks go. The blocks are rebuilt from the current skill files on every request, like attachments, so earlier turns stay the same request to request and keep the prompt cache, unless a skill is edited or turned off. Checked against a stand-in for the Messages API: `/test-skill write the file please` reached the API as the invocation block with the SKILL.md, then the person's text; the system prompt still lists the skill.

### app/engine/claude_code.py · skills on the Claude Code route
- refers-to: app/engine/claude_code.py :: _system (skills), _prompt (invocation blocks), run (args, --add-dir skills root)
- kind: rationale
- logged: v0.13.0 · 2026-10-18

Before: chats answered through Claude Code never heard of Format's skills (the API path lists them in `prompt.system_prompt`; `_system` here did not), so "Use the dev-rules skill" in Format did nothing unless Claude Code happened to have a skill of that name itself. Now the appended system prompt lists every enabled skill with its folder and description and says to read the SKILL.md with Read first; an invoked skill's SKILL.md and folder go at the start of the turn; and the skills folder is passed with `--add-dir` so reading it needs no approval. Checked by calling `_system` and `_prompt` with a seeded skill; a full Claude Code session against a live model was not run here.

### Closing the Phase 11 gaps: plugin sources, private marketplaces, skills Discover, Skill with Claude, the connector directory, connectors on the Claude Code route
- refers-to: app/engine/marketplaces.py :: RESERVED, ARCHIVE_CAP, _git (token), _clone (token), _github, _archive, _npm, _command, add (token, owner/repo@ref, reserved names), install (archive, npm, command with confirm, the marketplace token for github sources), update (token, command sources skipped), _official, skill_offers, install_skill, the commands marketplace.add (token), plugin.install (confirm), skill.discover, skill.installFrom; app/engine/uploads.py :: kind_of (.plugin); app/engine/skills.py :: parse (block scalars), ORIGIN, install_from, _summary (source); app/engine/tools.py :: SAVE_SKILL, definitions (output skill), run (save_skill); app/engine/chat.py :: start (skill mode); app/engine/cmd_chat.py :: send (output skill); app/harness/prompt.py :: OUTPUTS["skill"]; app/engine/connector_directory.py :: DIRECTORY; app/engine/cmd_connector.py :: directory (connector.directory); app/engine/connectors.py :: claude_code_servers; app/engine/claude_code.py :: run (--mcp-config, --disallowedTools); app/agent_guide.py :: list_connector_directory, discover_skills, install_skill_from_marketplace
- kind: rationale
- logged: v0.21.0 · 2026-10-18

The owner asked to close every open gap. Sources read 2026-10-18: code.claude.com/docs/en/plugins/marketplace-reference (source types and fields, reserved names), claude.com/docs/plugins/overview (.plugin uploads, private repositories), code.claude.com/docs/en/cli-reference (--mcp-config takes JSON strings, --disallowedTools takes tool names). Plugin sources now cover the reference's list: `archive` downloads an https zip (loopback, link-local, private and metadata hosts refused, 100 MB cap, `sha256` checked when given, plugin root at the top or one down); `npm` runs `npm pack` with scripts ignored and unpacks `package/` (git, file, alias and http specs and non-https registries refused, as the reference does); `command` runs the entry's command through the shell from the home folder only after the person confirms it (`plugin.install` confirm; without it the engine answers 409 with the command), checks printable ASCII, 500 characters, no run of four spaces, one absolute path printed, a plugin folder that is not home or above it, and copies it (link mode is treated as copy). A `.plugin` upload is unpacked as the zip it is. Private repositories: `marketplace.add` takes a GitHub token, sent as an `http.extraHeader` basic header on clone and fetch and on the marketplace's github plugin sources, kept in the registry and never returned (marketplace.list shows `private` only); git's own credential helpers and SSH keys work too, since only prompts are off. `owner/repo@ref` pins a ref. Reserved marketplace names (the official, community and directory names, the Claude Code internal ones, another spelling of one, and `claudeai-`) are refused unless the repository is under github.com/anthropics. Skills Discover lists every skill folder of every marketplace plugin kept in the marketplace (skills/*/SKILL.md and an entry's `skills` paths); `skill.installFrom` installs one on its own with a `.format-skill.json` naming its marketplace and whether it is official, which groups it under From Anthropic and partners or From marketplaces. SKILL.md descriptions written as YAML block scalars (`description: >`) no longer show the `>`. Create with Claude and Edit with Claude for skills use output skill: the skill prompt and a `save_skill` tool that installs a folder from the chat workspace after approval and refuses to replace a plugin's skill. The connector directory is `connector_directory.py` (a module, so the frozen engine carries it): 24 remote servers whose URLs a research pass read on each maker's own page, spot-checked here for Linear and DeepWiki; Figma was left out because its page limits the server to catalogued clients, and Box, HubSpot, Canva and Plaid because they need an admin or a registered client first. On the Claude Code route the chat's connectors now reach Claude Code through `--mcp-config` (command servers with their env, URL servers with type http or sse and their headers and bearer), with Blocked tools passed to `--disallowedTools`; a connector off for the chat or waiting for sign-in is left out, and the tool names match Format's, so `can_use` applies the same permissions. Checked: the reserved name refused; the command entry needed a confirm and then installed; the archive over http refused; npm fetched is-number and then said it was no plugin; anthropics/skills cloned through the network with 19 skills offered, pdf installed as official; Edit with Claude saved tidy-notes through its card; the directory listed 24 with 7 categories and DeepWiki connected for real with 3 tools; the Claude Code server config was built from rows in Python (Claude Code is not installed here, so a live session was not run).

### app/engine/plugins.py, tools.py, skills.py · Create a plugin, Create with Claude, plugin:skill
- refers-to: app/engine/plugins.py :: MAX_EDIT_BYTES, files_of (plugin.files), create (plugin.create); app/engine/tools.py :: ADD_PLUGIN, NAMES, definitions (output plugin), run (add_plugin); app/engine/chat.py :: start (plugin mode from any user message's output); app/engine/cmd_chat.py :: send (output plugin); app/harness/prompt.py :: OUTPUTS["plugin"]; app/engine/skills.py :: INVOKE, _plain, invoked; app/agent_guide.py :: create_plugin, get_plugin_files
- kind: rationale
- logged: v0.20.0 · 2026-10-18

claude.com/docs/plugins/overview (read 2026-10-18): Add has Create with Claude (a conversation where Claude builds the plugin with you) and Create a plugin (an editor where you write its files), and in the / menu you can type `plugin-name:skill-name` to narrow to a plugin's skill. `plugin.create` writes plugin.json from the name, description and version (keeping any other fields an earlier version had), writes each `{path, content}` (no `..`, nothing under .claude-plugin, at most 200 files and 1 MB), and installs it with origin created; the same name replaces it and keeps its connectors and on or off state, as every reinstall now does. `plugin.files` returns the text files for the editor (plugin.json and the state file left out, files over 200 KB skipped). Create with Claude is a chat whose first message carries output plugin: from then on every reply in that chat gets the plugin instructions in the system prompt and an `add_plugin` client tool, which installs a folder from the chat's workspace after the person approves its card (it is not read-only, so Ask, Allow for this chat and Plan apply as for any change). The mode is read from any user message on the path, since the composer clears the Create picker after each send. `/demo-kit:ship` and "use the demo-kit:ship skill" now load `demo-kit-ship`: `_plain` turns `plugin:short` into the installed name (`plugin-short`, or `short` when it already starts with the plugin's name). Checked: the API request for "/demo-kit:ship the release please" carried the ship skill's SKILL.md; the editor created and then edited a plugin; a `../` path was refused; a Create with Claude chat ran its bash card, then "Allow Claude to add the my-kit plugin to Format?", after which my-kit was installed with origin created and the request had offered add_plugin. `./format agents sync`: 109 commands; the diff was the two new commands and chat.send's output description.

### app/engine/marketplaces.py and plugins.py · marketplaces, Discover, and a plugin's parts
- refers-to: app/engine/marketplaces.py :: root, _registry, _write, _git, _url, _clone, _catalog, _local, _offers, add, install, update, set_sync, remove, _sync_loop, start, the commands marketplace.list, marketplace.add, marketplace.update, marketplace.sync, marketplace.remove, plugin.install; app/engine/plugins.py :: _server_view, summary (commandSkills, servers, agents, hooks, origin), _remove_parts (keep_connectors), install (origin, kept state, servers listed not added), add_connector (plugin.addConnector); app/routers/__init__.py :: COMMAND_MODULES, startup (marketplaces.start); app/agent_guide.py :: the seven new entries
- kind: rationale
- logged: v0.19.0 · 2026-10-18

Per claude.com/docs/plugins/overview and code.claude.com/docs/en/plugins/create-marketplace (read 2026-10-18). A marketplace is a Git repository (or, for development, a folder; Claude Code takes local paths the same way) with `.claude-plugin/marketplace.json` holding a name, an owner and a plugins list. `marketplace.add` takes a repository URL, `owner/repo` (GitHub) or a folder; a repository is cloned with depth 1 into `data/marketplaces/<name>` (through a `.incoming-` folder, so a failed clone or a bad catalog leaves nothing), recorded in `registry.json` beside it. Nothing installs until `plugin.install`, which takes a relative source inside the marketplace (with `metadata.pluginRoot` for bare names; `..` refused) or clones a `github`, `url` or `git-subdir` source (with `ref` or `sha`); `archive`, `npm` and `command` sources answer that Format does not install them. The plugin's state records its origin. `marketplace.update` (Check for updates) fetches and resets to the remote head, then reinstalls each plugin installed from that marketplace whose catalog version differs from the installed one; a reinstall keeps the plugin's on or off state and the connectors already added (`_remove_parts(keep_connectors=True)` and the carried `serverIds`). Sync automatically, for repositories only, is a daemon thread started with the engine that runs the update hourly. `marketplace.remove` uninstalls the plugins installed from it, as Claude Code's `marketplace remove` does. Per the plugins page, adding a plugin no longer adds its connectors: its MCP servers are listed in `servers`, each Connected, Not connected or Not added, and `plugin.addConnector` adds one; plugins installed before keep the connectors they added, listed from `connectors`. `summary` also lists `commandSkills`, `agents` (agents/*.md, not run in chat) and `hooks`. Git runs with `GIT_TERMINAL_PROMPT=0` and a 120 s limit, so a private repository fails with git's message instead of waiting on a prompt; GitHub sign-in for private repositories is not built. Checked through the engine and the window against scratch Git repositories (a marketplace with a relative plugin, a `url` plugin in its own repository, and an npm entry): add, the duplicate and nonsense sources refused, both installs, the npm refusal, Add on the plugin's connector then Connected, a pushed 1.1.0 with a new skill picked up by Check for updates with the connector kept, Sync automatically saved, and Remove uninstalling. `./format agents sync` regenerated the references (107 commands); the diff was the seven new commands and the three plugin descriptions.

### app/engine/oauth.py, connectors.py, routers/system.py · signing in to a connector
- refers-to: app/engine/oauth.py :: redirect_uri, _resource_meta, _server_meta, begin, _token, finish, access_token (_refresh_lock), sign_out; app/engine/connectors.py :: AUTHS, add (auth, oauth_client, client_id, client_secret, transport), public (auth, transport, oauthClient, signedIn), update (Disconnect signs out), signin, _refused, connect (needs_auth), request_parts (authorization_token from the sign-in), Manager._bearer, _key, _client (SSE); app/engine/store.py :: connect (auth, oauth, transport columns); app/engine/cmd_connector.py :: add, signin (connector.signin); app/routers/system.py :: oauth_callback, PAGE; app/agent_guide.py :: sign_in_connector
- kind: rationale
- logged: v0.18.0 · 2026-10-18

claude.com/docs/connectors/custom/add-unlisted (read 2026-10-18) gives the custom connector's settings: Authentication (Sign in now, Sign in when needed, No sign-in, with an API key going under Request headers), OAuth client (Use Claude's published identity, Register automatically, Use your own OAuth client with a client ID and a secret only if required), Request headers, and Advanced, Transport (a URL ending in /sse picks SSE). Format offers all of them except Claude's published identity, which is a Client ID Metadata Document Anthropic hosts for Claude; Format has no hosted identity, so Register automatically is its default. `auth` is none, needed or now; `oauth` holds the client and the tokens; `transport` is http or sse (in-place migrations, defaults none, {} and http, so existing connectors behave as before). The flow follows the MCP authorization spec: an unauthenticated POST to the server reads `resource_metadata` from the 401's WWW-Authenticate (RFC 9728), falling back to the well-known paths; the authorization server's metadata comes from RFC 8414 or OpenID paths (falling back to /authorize, /token, /register on the origin, as the 2025-03-26 spec did); Register automatically posts an RFC 7591 registration with `token_endpoint_auth_method` none and the engine's callback, kept until the callback changes; PKCE S256, a random state and the RFC 8707 `resource` go on the authorize URL with the scopes the server lists. `connector.signin` returns that URL for the window to open; the server sends the browser to `GET /api/connectors/oauth/callback` on the engine's own port, which exchanges the code (client_secret_post, or Basic when that is all the server takes), stores the tokens, answers with a small page, and connects in a thread. A state is single use and lives 15 minutes. `access_token` re-reads the row under a lock before refreshing, since rotating refresh tokens make a refresh from a stale row fail (found in the check: a connect refreshed twice from one snapshot and the second was refused); it refreshes 60 s before expiry, or at expiry for tokens that live two minutes or less, and signs out when the refresh is refused. `connect` probes with one POST first: Sign in now with no token, or a 401, sets `needs_auth` (with "The server no longer accepts the sign-in" when a token was refused, which the window shows as Reconnect) instead of a raw connection error. Disconnect signs out, as claude.ai's does. On the API route the access token is the MCP connector's `authorization_token`; a server still waiting for sign-in is left out. Tokens sit in the local database like the existing bearer token. Checked against a scratch OAuth server with an MCP endpoint (oauth_mcp.py: RFC 9728 and 8414 metadata, RFC 7591 registration, PKCE, rotating refresh tokens, a pre-registered confidential client) under 4x CPU and a slow network: needed connected to needs_auth; the authorize URL carried PKCE S256, state, resource and the engine callback; the callback page said Signed in and the connector listed whoami and echo; with two-second tokens a reconnect refreshed and connected; a used state answered 400; Disconnect signed out and Connect then asked to sign in; a token or an Authorization header with sign-in, and an own client with no ID, were refused. The API route's server entry carried the signed-in token and dropped a server waiting for sign-in (rows built in Python, since no public OAuth server was reachable from here).

### app/engine/connectors.py, cmd_conversation.py, cmd_chat.py · connectors on or off per chat
- refers-to: app/engine/store.py :: connect (conversations.connectors_off); app/engine/connectors.py :: chat_off, request_parts (chat_off_ids), resolve_call, call (conversation_id); app/engine/chat.py :: start (settings connectorsOff); app/engine/tools.py :: definitions, run; app/harness/request.py :: build (mcp_servers); app/engine/cmd_conversation.py :: _get, list_, set_connector (conversation.setConnector); app/engine/cmd_chat.py :: send (connectorsOff); app/agent_guide.py :: set_connector_in_conversation
- kind: rationale
- logged: v0.18.0 · 2026-10-18

claude.ai turns each connector on or off for one conversation from + then Connectors, and the connector stays connected (claude.com/docs/connectors/getting-started and /custom/add-unlisted, read 2026-10-18). `conversations.connectors_off` lists the connector ids off in that chat; `chat.start` reads it into the run's settings as `connectorsOff`, so the tool list, the API's `mcp_servers` and toolsets, and a direct call all skip those connectors (a call that comes anyway answers that the tool is off for this chat). A new chat has no row until its first message, so the window keeps the toggles as a draft and `chat.send` takes `connectorsOff` when it creates the chat; unknown ids are dropped. Checked with the stand-in: a chat started with notes off sent no notes tool and its forced call answered "turned off for this chat"; after `conversation.setConnector` on, the tool was sent and the call answered "echo: hi". `./format agents sync` regenerated the references (100 commands); the diff was the two new commands and chat.send's and connector.add's new parameters.

### app/engine/connectors.py · tool permissions: Always allow, Needs approval, Blocked
- refers-to: app/engine/connectors.py :: PERMS, _remote, _perms, default_perm, perm_of, route, public (permission, defaultPermission, headerNames), add (headers), update (tool_permissions), request_parts, resolve_call, permission_for, allow_by_name, Manager._key and _client (headers); app/engine/store.py :: connect (tool_perms and headers columns); app/engine/cmd_connector.py :: add (headers), update (toolPermissions); app/engine/tools.py :: decision_for (mcp__); app/engine/chat.py :: _call_tool (always on a connector tool); app/agent_guide.py :: update_connector
- kind: rationale
- logged: v0.16.0 · 2026-10-18

claude.ai's connector page sets each tool, or a group, to Always allow, Needs approval or Blocked (claude.com/docs/connectors/getting-started). A connector now keeps a map tool to allow, ask or block in `tool_perms`; the old `disabled_tools` list still reads as block until a permission is set, and setting any permission clears it. The default keeps what each route did before: a public https server, which Anthropic's MCP connector runs with no card, defaults to allow; a local or private one, whose calls came through Format's approval cards, defaults to ask. Blocked tools are left out of every request (configs enabled false on the API route, left out of the client tools on the local one) and refused if called anyway. Always allow decides allow in `decision_for` before the mode, so it holds in Ask; Needs approval falls through to the usual rule (ask, unless Allow all, Allow for this chat or the old global toolAllow). Anthropic's MCP connector runs a server's tools on Anthropic's side, where no card can wait, so a public server with any tool on Needs approval, or with request headers (the API's connector takes only a bearer token), is routed to the engine instead, which reaches the same URL through the MCP SDK with the token and headers; with every tool on allow or block it goes back through Anthropic. Always allow on an approval card for a connector tool now sets that tool's permission on its connector rather than adding `mcp__...` to the global list. `toolPermissions` takes `*` for every listed tool. Checked: the routing rules from rows built in Python (public default api and allow; one ask local; allow and block api; headers local; a legacy disabled tool block; localhost local and ask), and through the window against a local MCP server (notes_mcp.py on the mcp 2.x `MCPServer`, which replaced FastMCP): tools default to ask; selects reach the engine; an allowed call ran with no card; a blocked call was refused with no card; a Needs approval call showed a card whose Always allow set the tool to allow on the connector and left toolAllow empty.

### app/engine/skills.py and cmd_skill.py · skill.read
- refers-to: app/engine/skills.py :: read_file; app/engine/cmd_skill.py :: read (skill.read); app/agent_guide.py :: GUIDE (read_skill_file)
- kind: explainer
- logged: v0.15.0 · 2026-10-18

The Customize skill page reads any file of a skill, not only SKILL.md, as claude.ai lets a person read a skill's SKILL.md and files before turning it on (claude.com/docs/skills/overview). `read_file` resolves the path inside the skill's folder and refuses anything outside it (`../` answers 404, checked), returns up to 400 KB as text, and names a binary file instead of decoding it (a NUL byte in the first 8 KB). It is read-only and needs no approval. `./format agents sync` regenerated the references (98 commands); the diff was only the new command's entries.

### app/engine/cmd_conversation.py, tools.py, store.py · Allow for this chat
- refers-to: app/engine/store.py :: connect (allow_all column migration); app/engine/cmd_conversation.py :: _get, list_, allow_all (conversation.allowAll); app/engine/tools.py :: chat_allowed, decision_for (conversation_id), allow_waiting (conversation_id); app/engine/chat.py :: _call_tool; app/engine/claude_code.py :: can_use; app/agent_guide.py :: GUIDE (allow_all_in_conversation)
- kind: rationale
- logged: v0.14.0 · 2026-10-18

The owner wanted an always-allow for one whole chat, not one kind of step (Always allow, global per tool) and not every chat (Allow all). `conversations.allow_all` (added by an in-place migration, default 0, no schema bump since nothing else reads it) is the flag; `conversation.allowAll` sets it, publishes `conversation.updated`, and when turning it on answers the approvals already waiting in that chat only. Both routes consult it after Plan and the deny list: `decision_for` takes the conversation id (the API tool loop passes it), and Claude Code's `can_use` checks `chat_allowed`. Plan still wins, so a chat cannot change files while the mode is Plan. Sub-agents inherit it because they run inside the parent's `_call_tool`. `./format agents sync` regenerated the agent references (97 commands); its diff was reviewed: only the new command's six entries.

### app/engine/tools.py and cmd_settings.py · Allow all answers what is waiting
- refers-to: app/engine/tools.py :: allow_waiting; app/engine/cmd_settings.py :: set_ (permissionMode auto)
- kind: explainer
- logged: v0.13.0 · 2026-10-18

Setting `permissionMode` to `auto` (the window's Allow all) also answers every approval already waiting with allow, on both routes, since both wait through `tools.wait_for_approval`. Questions (`kind` question) are left alone. The window's Allow all button on an approval card is just this setting, so one click lets that call and any parallel ones run and stops later cards. Checked in the window against the stand-in: a write waiting in Ask, Allow all, the write and the following edit ran with no second card.

---

## app/routers/stream.py {#app-routers-stream}

### app/routers/stream.py · module name
- refers-to: app/routers/stream.py (file)
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

Named `stream`, not `events`: `app/routers/__init__.py` also imports `app.engine.events`, and a sibling module named `events` was shadowed by it, so the router list picked up the engine module and the engine failed to start.

## app/core/local_guard.py {#app-core-local-guard}

### app/core/local_guard.py, main.py · only this computer's own window and agents reach the engine
- refers-to: app/core/local_guard.py (LocalGuard, new); app/main.py (the middleware, after CORS)
- kind: fix
- logged: v0.24.6 · 2026-10-25

The family stabilization plan's Phase 3a (`FAMILY_DEV_PLAN.md` v0.4.2, formai_dev sidecar), ledger FB-031, raised from S1 to S0 once reproduced. The engine had CORS only. CORS decides what a page may read, not what runs, and it does not apply to websockets at all. Reproduced on the engine before the change: a DNS-rebinding page (a hostile name resolving to 127.0.0.1, so its requests carry that name as Host and are same-origin to the browser) called `terminal.list` and read every terminal's id; a page on any origin then attached to `WS /api/terminal/{id}` and typed into the shell, which ran `echo PWNED_$((6*7))` and answered PWNED_42. That is a shell for any web page while Format runs.

LocalGuard, a pure ASGI middleware in front of every route, websocket and `/mcp` (the design of formpdf 0.56.3's and formcel 0.40.2's), refuses a Host that is not 127.0.0.1, localhost or ::1, and an Origin that is neither in `config.cors_origins()` (the dev window and preview on 5490 and 5491 as localhost and 127.0.0.1, and the Tauri origins) nor exactly the engine's own origin, compared on parsed scheme, host and port. The desktop window loads from `http://127.0.0.1:<port>/` with a port chosen at launch, so "own origin" follows the request's Host. Requests with no Origin (`./format cli`, `mcp_stdio.py`, outside agents over HTTP) pass once the Host is local; outside agents still meet `agents.require`. Refusals answer 403, websockets close 4403 before accept, which the terminal dock already treats as a refused attach.

Checked on the engine: rebinding `terminal.list`, an `evil.example` Origin and a `null` Origin answer 403; the terminal websocket refuses `evil.example` and `localhost.evil.com` and runs commands for the engine's own origin, the dev origin and no Origin; the engine's own origin, `localhost:5490`, `tauri://localhost`, no Origin and MCP `initialize` answer 200. The built window served by the engine (FORMAT_SERVE_DIST, the desktop path) in Chromium at 1440 by 900, 4x CPU, 150 ms latency and about 1.6 Mbps, hard reload, three runs: layout shift 0, no page or console error, no failed request, `/api/events` accepted, 162 requests answered and none refused.

### app/core/local_guard.py · LocalGuard refuses cross-site requests that carry no Origin
- refers-to: app/core/local_guard.py (LocalGuard._permitted)
- kind: fix
- logged: v0.24.7 · 2026-10-25

The family agent-stack standard, rule G4 (`AGENT_STACK_STANDARD.md` v0.2.0, owner decision D4, ledger FB-035, formai_dev sidecar; the design of formpdf 0.56.4). The entry above let a request with no Origin through once its Host was local, so a web page could still make the engine answer a GET by pointing an `<img>` or a link at `http://127.0.0.1:<port>/...`: browsers send no Origin on those, and any GET route with a side effect would run.

Browsers label every request with `Sec-Fetch-Site`, and only a page on another site gets `cross-site`. So a request with no Origin is now refused when that header says `cross-site` (trimmed, case-insensitive). A request that carries an Origin is still decided by the Origin rule alone, and `same-site` is kept on purpose: a dev window on `localhost:5490` loading straight from `localhost:8490` is same-site, and no outside page can be same-site with localhost. `./format cli`, `mcp_stdio.py` and Claude Code's MCP client send neither header and pass as before.

Checked against the running engine: no Origin with `cross-site` 403; `same-site`, `same-origin`, `none`, no header at all, and `cross-site` with the allowed dev Origin 200; foreign Host and an `evil.example` Origin still 403. In Chromium, a page served from `http://127.0.0.2:9901` with an `<img>` and a clicked link pointing at `/api/health` got 403 for both, shown in the engine log. The built window served by the engine (FORMAT_SERVE_DIST) in Chromium at 4x CPU, 150 ms latency and about 1.6 Mbps, two shift runs and one throttle run: layout shift 0, no errors, 0 refusals from the window in about 166 requests. `/mcp` `initialize` with no Origin 200; `mcp_stdio.py` initializes and lists 113 tools.

## app/main.py {#app-main}

### app/main.py · .js, .mjs and .css keep their types on Windows (v0.25.2)
- refers-to: app/main.py :: the three mimetypes.add_type calls after the last import
- kind: rationale
- logged: v0.25.2 · 2026-10-31

Python's `mimetypes` takes file types from the Windows registry (`HKEY_CLASSES_ROOT\.js`, value `Content Type`) over its own table, and some installers and editors set `.js` to `text/plain`. On those PCs the engine served the built window's scripts as `text/plain`, WebView2 refused every module script under strict MIME checking, and the desktop window stayed blank; macOS, Linux, dev mode (Vite serves the page) and Windows PCs with the default value never showed it. The three calls pin `.js` and `.mjs` to `text/javascript` and `.css` to `text/css`, which covers `StaticFiles`, `FileResponse` and any direct `guess_type`. They sit after the last import, not above the imports: a module that re-reads the registry while importing cannot undo them, and no import follows a statement (E402). They look redundant off Windows; keep them. Repro on a Windows PC: `reg add "HKCU\Software\Classes\.js" /v "Content Type" /d "text/plain" /f`, then launch the rebuilt app; restore with `/d "text/javascript"`. Checked here: with the table poisoned to `text/plain` for js, mjs and css through `mimetypes.init(files=...)`, the three calls return `text/javascript`, `text/javascript` and `text/css`; `py_compile` passes. Not yet run on a Windows PC.

## src-tauri/tauri.conf.json {#src-tauri-conf}

### src-tauri/tauri.conf.json · the Linux packages pull in the media plugins (v0.25.2)
- refers-to: src-tauri/tauri.conf.json :: bundle.linux (deb.recommends, rpm.recommends, appimage.bundleMediaFramework); formcompiler apps/format.json :: toolchain.linux_packages
- kind: rationale
- logged: v0.25.2 · 2026-10-31

The window previews video and audio (`frontend/src/ui/attach-view.ts`, `files-pane.ts`) in WebKitGTK on Linux, which decodes with GStreamer. The config now follows formdeck: the deb recommends `gstreamer1.0-plugins-base`, `gstreamer1.0-plugins-good` and `gstreamer1.0-libav`, the rpm recommends `gstreamer1-plugins-base` and `gstreamer1-plugins-good`, and the AppImage bundles the media framework. formcompiler installs the base and good sets on the Linux runner so the AppImage step finds them. apt and dnf install recommends by default; `dpkg -i` and `--no-install-recommends` skip them. On Ubuntu 24.04 `libwebkit2gtk-4.1-0` already depends on base and good but only suggests `gstreamer1.0-libav` (the H.264 and AAC decoders), so the deb recommends it. The AppImage carries base and good only, since libav would copy the runner's own FFmpeg into the app. Checked: the config parses and formcompiler's `registry.py check` passes; no Linux build was run here.

## tests {#tests}

### backend/tests · the family suite, observing Format without changing it
- refers-to: tests/conftest.py (the family block), tests/_format.py :: FakeProvider, fake, run, wait_done, wait_until
- kind: decision
- logged: 0.24.9 · 2026-10-26

FAMILY_TEST_PLAN v0.3.0 P1 for Format, under the owner rule that the tests observe Format and change none of its shapes. `conftest.py` is the family template with Format's block (port 8490, `/api/health` for health and version, `/api/events` as the websocket, the seven version sites, the MCP tool list from `mcp_server.to_tools`); it points `FORMAT_DATA_DIR` and HOME at a temporary folder for the whole session. `test_f1_guard.py`, `test_f4_versions.py` and `test_f9_release_profiles.py` are the templates unchanged. F3 and F5 are Format's own files because Format writes no `engine.json` and has no `/api/version`: the relay is found through `FORMAT_ENGINE_URL`, and the health route reports the version. Format's MCP answers over server-sent events, so `test_f3_mcp.py` reads the last `data:` line, sends `accept: application/json, text/event-stream`, and keeps the relay's stdin open until its reply arrives (closing it at once ends the stdio server before a call to the engine returns, which reads as "Connection closed"). Every MCP call passes `agents.require`, read-only ones too, so those tests set `outsideAgents` to allowed and put it back.

`_format.py` swaps `providers.PROVIDERS["anthropic"]` for `FakeProvider`, which plays scripted stream events, records every request `harness.build` made and every Files API upload, and never reaches the network; the `fake` fixture sets chatEngine api and the test model, and stops any reply left running. Covered: the request (system prompt blocks, the top-level cache mark, the user turn), attachments of 1 MB or more uploaded once and sent by file id while smaller ones go inline, a stored compaction block starting the next request with its beta; the chat tree (the leaf follows each reply, edit makes a sibling and the next request carries only the new path, branch switches back, retry replaces the reply); approvals (a changing tool waits with nothing run until allow, deny tells Claude, always adds toolAllow, stop denies, plan mode refuses); the artifact CSP (sandbox without allow-same-origin, default-src and connect-src none until artifactNetwork); share links by token only and revoked by unshare; the devices Gate called directly with ASGI scopes (no cookie, a wrong one or a websocket refused; the pairing code sets the cookie; `/s/` passes; forget rotates the code); the same command through the window route, `setup/cli.py` and MCP `run_command`, with the same result and the same refusal; and the migrations, run in a subprocess on a schema 1 file (empty and populated, the parent chain and leaf filled in) and a schema 7 file with a branch and a connector, each opening as schema 8 with every row kept. SCHEMA_1 is the text of `store.py` at ba4f99d; SCHEMA_7_EXTRA adds what a68d3eb's file had beyond it.

## app/engine/demos.py, cmd_demo.py and app/demos {#app-engine-demos}

### app/engine/demos.py · demo chats are seeded as ordinary records
- refers-to: app/engine/demos.py :: ids, _spec, _build, materialise, seed, restore, list_, _seeded, _remember; app/engine/cmd_demo.py :: demo.list, demo.restore; app/routers/__init__.py :: startup; app/engine/store.py :: conn (the `demo` column); app/agent_guide.py :: GUIDE
- kind: decision
- logged: v0.26.0 · 2026-11-15

A new user with no API key opened an empty window. The app now ships recorded chats that open and run without a key. They are not a special kind of thing: at start the engine reads each folder under `app/demos` and writes the same rows a real reply would have left, so everything that works on a chat (open, artifact panel, Outputs, files, rename, pin, delete, continue with a key, MCP resources) works on a demo with no second code path in the window.

From `chat.json` (`format-demo-chat/1`): the conversation with `demo = <folder name>`; the user message as one text block; one assistant message whose content is the `publish_artifact` tool_use with the page as input and its tool_result in the engine's own wording, then a `send_file` tool_use and result for each listed file that has a caption, then the text (the reply says "the card above", so the tool blocks come first); `meta` with status done, the demo id, the tools as done and the `artifacts` map the window reads for the card. No `model` is recorded, so the window shows none: nothing was run. The artifact goes through `artifacts.publish` with the message id, the `files/` folder is copied into the chat's own folder, and every listed file becomes an `outputs.<conversation id>` item with its size read from disk.

`demo` is a new nullable column on `conversations`, added by the same column check as the others; the schema number stays 8, since an old engine reading the file ignores a column it does not know and `test_migrations` (a current database opened again changes nothing) holds. The meta row `demos.seeded` lists the demo ids already added once. That is what makes a deleted demo stay deleted: `seed()` skips an id in that list, so only a demo never seen in this data folder is added at start. `demo.restore` returns the demo's conversation and makes it again only when it is gone; Help, Demos in the window calls it. A demo that fails to build removes its half-made chat, outputs row and folder, logs a warning and does not stop the engine; it is tried again at the next start because it was never remembered. Seeding publishes no events (no window is connected yet) and runs before the scheduler starts.

Two commands, `demo.list` and `demo.restore`, with their MCP names in `GUIDE` (`list_demos`, `restore_demo`); the registry holds 114 commands. Checked on a fresh data folder and on one made by the 0.25.4 engine (three chats, one pinned): the old rows are byte-identical after the first start with demos, restarts change nothing (`scratch/formAT/demo-bundle/dbsum.py`), nothing is written to HOME (`test_f5_boot`), and the window smoke still loads with no failed request.

### setup/freeze_backend(.bat), format_engine.py · the demos travel in the frozen engine
- refers-to: setup/freeze_backend, setup/freeze_backend.bat :: `--add-data ...app/demos`; format_engine.py :: selfcheck (`demos_bundled`)
- kind: rationale
- logged: v0.26.0 · 2026-11-15

`app/demos` is data, not Python, so PyInstaller's `--collect-submodules app` does not take it; both freeze scripts add it with `--add-data` at `app/demos`, the place `demos.ROOT` resolves to under `sys._MEIPASS` (`Path(__file__).parents[1] / "demos"`). The selfcheck reports `demos_bundled` and fails the freeze when it is 0, so a build without demos cannot be packaged: `build_app` runs under `set -euo pipefail` and stops when `setup/freeze_backend` does. The `--add-data` path was proved with a small one-file PyInstaller freeze in a scratch venv (`scratch/formAT/demo-bundle/freeze/`); the real engine was not frozen here.

The Windows script got the flag without a space after its closing quote (`...app\demos"--collect-submodules app`), which makes one malformed argument and turns `app` into a second script to freeze. Found by reading in the review and fixed; not run, there is no Windows here.

### app/engine/cmd_conversation.py · demos are always in the list
- refers-to: app/engine/cmd_conversation.py :: list_
- kind: fix
- logged: v0.26.0 · 2026-11-15

`conversation.list` returns the 200 most recent chats, and the sidebar is filled from it, so a demo older than a person's 200 newest chats dropped out of its own group. With no query and no explicit limit the list now appends the demo chats it did not already hold (at most the number of demos). A caller that passes `limit` gets exactly that many, as before. Checked with 205 chats: 202 returned, the demos among them and in the sidebar.

### app/demos/solar-system · the Orrery
- refers-to: app/demos/solar-system/artifact.html, chat.json, files/CREDITS.md; NOTICE.md :: the demo chats paragraphs
- kind: decision
- logged: v0.26.0 · 2026-11-15

The third demo is a 3D model of the solar system in raw WebGL 1, one self-contained page of 950,640 bytes (the artifact limit is 2 MB), about 865 KB of it surface maps embedded as `data:` JPEGs. The owner rejected a first 2D version. It runs inside the artifact sandbox unchanged: the CSP allows `data:` images, and uploading them as WebGL textures works without `allow-same-origin` (tested with the real header, including the `sandbox` directive); there are no requests and no storage. When WebGL is missing or the context is lost it draws a 2D canvas version.

The photographic maps (Venus, Earth, Mars, Jupiter, Saturn, Neptune and twenty moons) come from NASA's repository `nasa/NASA-3D-Resources`, whose README says its assets are free and without copyright; they are downscaled, in places edited, and credited in `NOTICE.md` and in `files/CREDITS.md`, which the chat lists as an output so the credit is one click from the page. Mercury, Uranus, the Sun, the rings and Earth's clouds are generated in code; the Moon's far side is invented and the page says so. NASA's name identifies the maps and implies no endorsement.

Every figure in the information panel, the notes, the tour captions and the motion periods was checked against NASA's planetary fact sheets and NASA Science pages (`scratch/formAT/demos/solar-system/FIGURES.md`: 184 rows, 39 changed). The check read the pages through a fetch tool that returns a model's summary, not the raw page, so a quoted sentence is that reading. Left unverified or only computed: the light travel times (arithmetic from source distances), the sentence that the tilt and not the distance makes the seasons, Mercury's three-to-two spin and similar ratios (computed from source numbers), Jupiter's moon count (115 on NASA Science, 95 on the fact sheet; the page shows 115), and the short taglines. Sizes and distances are compressed and orbits are circles in one plane; the reply text says so.

The shipped page carries no test hooks: the source template marks test code and the build leaves it out. The source, the build scripts and the texture preparation are in `scratch/formAT/demos/_work/orrery/`, not in the repo; edit the template, never the built file, and change the recorded reply when the page changes. Measured only on a software renderer (no GPU here): 2 to 19 frames a second depending on size under 4x CPU, with the page stepping its resolution down; on a GPU it runs at full resolution, not measured. It draws nothing while the document is hidden and opens paused under reduced motion.

The other two pages (Northern Light, canvas; Harbour Ferries, inline SVG and a canvas chart) are drawn in code with no image or data from anyone else. Harbour Ferries is an invented operator; its form.md package (3 pages, 5 CSV databases, 5 route pages, and the same tree zipped) was imported into a real form.md build to prove it: 8 pages, 175 rows, 0 warnings. The content of all three demos is owner-approved.

## src-tauri/src/reveal.rs and the splash hand-off {#src-tauri-reveal}

### src-tauri/src/reveal.rs, main.rs · the window appears whole, once the page has drawn
- refers-to: src-tauri/src/reveal.rs (new file) :: mark_launch, conceal, app_ready, show_main, set_seen, round_splash, close_splash, SPLASH_MIN, FALLBACK, BAR_FINISH, BUILD_VISIBLE, BACKGROUND; src-tauri/src/main.rs :: main, open_main; src-tauri/tauri.conf.json :: the splash window (`visible: false`)
- kind: decision
- logged: v0.26.0 · 2026-11-15

Before this the shell opened the main window and closed the splash in the same tick, as soon as the engine printed its port, so the window could be seen before the page had painted. The hand-off is now formvis's, by the owner's wish that the family starts the same way. The module was taken from FormWeb's copy of formvis's `reveal.rs` with the one line that places formvis's traffic lights removed (FormAT has a normal title bar), the splash function renamed `formatSplashDone` and the background set to the page's own dark (`rgb(11, 11, 12)`), so no white frame can show.

Order: `mark_launch()` is the first statement of `main`, so the minimum counts from process start. The splash window is declared hidden and `round_splash` shows it in `setup` (on macOS after making the window non-opaque and masking its content layer to the card's 16 px radius, since the web view otherwise painted a square behind the rounded card). When the engine's port is known the main window is built: visible at once on Windows and Linux as before, hidden on macOS, where `conceal` then puts it on screen at alpha 0 and deaf to the mouse, because a hidden window's web view stops its animation frames and the page renders through them. When the page calls `app_ready` (frontend log, src/main.ts), `show_main` runs once: it waits out the rest of the 2.6 s minimum, tells the splash to finish its bar, waits 220 ms for that, shows and focuses the main window, and only then closes the splash, so there is always a window on screen. If the page never calls, a thread started by `conceal` calls `show_main` after 20 s: a page that failed to load must not leave the person with only a splash. The engine-down frame calls `app_ready` like the real page.

macOS needs `objc2` and `objc2-app-kit` for the alpha and the layer mask; they are dependencies for the macOS target only (`Cargo.toml`, `Cargo.lock`), the same two crates and features formvis uses.

### src-tauri/build.rs, capabilities/default.json · the page may call one command
- refers-to: src-tauri/build.rs :: APP_COMMANDS; src-tauri/capabilities/default.json :: remote, permissions; src-tauri/tauri.conf.json :: app.withGlobalTauri; .gitignore :: src-tauri/permissions/autogenerated/
- kind: rationale
- logged: v0.26.0 · 2026-11-15

The main window loads `http://127.0.0.1:<port>/` from the engine. To Tauri that is a remote origin, and a remote origin can call nothing unless a capability names its address and the permission. An app's own command has no permission until the build step is told about it, so `build.rs` now declares `app_ready` in the app manifest (`AppManifest::commands`), which makes Tauri generate `allow-app-ready` (under `permissions/autogenerated/`, ignored by git); the capability lists `http://127.0.0.1:*` as remote and grants that permission, `core:default` (which carries the menu permissions the macOS menu bar needs) and the three window permissions behind Minimize, Zoom and Close Window. `withGlobalTauri` puts the API on `window.__TAURI__`, since the page may not import a package for it. The earlier description, "Nothing in the page calls into the shell", is no longer true and was replaced.

### src-tauri · what was and was not verified
- refers-to: src-tauri (the crate)
- kind: warning-context
- logged: v0.26.0 · 2026-11-15

The crate cannot be built or run on the build machine: the WebKitGTK development libraries are not installed and there is no Mac. Every Rust change in this version was type-checked only: `cargo check` for Linux and `cargo check --target aarch64-apple-darwin`, the second with zig as the C compiler and archiver for the crates that compile C (`tools/shellcheck.sh`), both exit 0, nothing linked. So the splash timing, the alpha-0 window, the rounded splash, the native menu bar and the engine-failure dialog have not been seen on a real build of this version. The behaviour is the reference's (formvis and formdeck ship it); the first desktop build should be watched for: the splash closing and the window appearing, also when the engine fails and when the page shows the engine-down frame.

## Review fixes in the engine, the shell and the build, 0.26.0 {#review-0-26-0}

### app/routers/stream.py · the engine no longer hangs on SIGTERM
- refers-to: app/routers/stream.py :: stream (outbound task, the receive loop)
- kind: fix
- logged: v0.26.0 · 2026-11-15

Once any window had connected, `kill <engine>` printed "Waiting for background tasks to complete" and never returned (reproduced every time with one `/api/events` client, open or already closed: `scratch/formAT/bugpass/sigterm.py`). The handler only ever awaited its queue and sent; it never read the socket. A handler that does not read does not learn that the peer left or that the server is shutting down, so it sat in `queue.get()` until the next event, and uvicorn waits for such tasks without limit. It also meant every closed window left a subscriber behind until the next event. The handler now sends from a task of its own and spends its life in `receive_text()`, which ends on disconnect and on shutdown; then the sender is cancelled and the queue unsubscribed. After: exit in 0.16 s with a client connected, 1.4 to 2.2 s with a real browser attached. This matters beyond scripts: a shutdown that hangs also hangs anything that waits for the engine to stop.

### app/core/local_guard.py, app/engine/devices.py · Other devices works again
- refers-to: app/core/local_guard.py :: LocalGuard._permitted (paired), __call__; app/engine/devices.py :: Gate.inner, Gate.__call__
- kind: fix
- logged: v0.26.0 · 2026-11-15

Since 0.24.6 a paired phone got the window's files and then a 403 for every command: the second server (port 8492) hands its requests to the same app, and `LocalGuard` refuses any Host that is not loopback. The guard was added after the feature, and the test for the gate used a stand-in for the inner app, so nothing saw the two meet. The fix keeps both checks and lets them agree: `Gate.inner`, which runs only after the gate has checked the pairing cookie (or for a share link), passes a copy of the ASGI scope with `format.paired` set, and the guard skips the loopback-Host rule for a scope that carries it. The flag lives in the scope, which only code inside the process can write; no header or URL can set it. It relaxes the Host rule alone: the Origin rule still applies to a paired device, so a request with a foreign Origin or a `cross-site` fetch is still refused (checked: own origin 200, `evil.example` 403, cross-site with no Origin 403, unpaired 401, a rebinding Host on the loopback port still 403).

The gate's exception for share links was any path beginning `/s/`; it is now `/s/<token>` with no further slash, so the open door is exactly the share route. Seen working in a real browser on the LAN address at 390 px: the page, commands and the event socket (`scratch/formAT/bugpass/lan.py`).

### app/engine/cmd_conversation.py, cmd_project.py · deleting, moving and creating chats
- refers-to: app/engine/cmd_conversation.py :: delete, create; app/engine/cmd_project.py :: move
- kind: fix
- logged: v0.26.0 · 2026-11-15

`conversation.delete` removed the rows and left the chat's folder (`workspace/chats/<id>`) and its `outputs.<id>` and `tasks.<id>` meta rows for ever, and a reply still running kept writing. It now stops the reply, deletes the two meta rows and removes the folder; the id comes from the row just read and only its last path part is used, and `rmtree` refuses a symlink. The command's description says so, which is why the agent references were regenerated. `conversation.move` built its event from the raw row, so `connectors_off` reached the window as a JSON string and a chat's switched-off connectors showed as on until a reload; it uses the same reader as the other commands now. `conversation.create` accepted a `projectId` that does not exist and stored it; it answers 404 like `chat.send`.

### app/main.py · /favicon.ico
- refers-to: app/main.py :: the `_favicon` route before the dist mount
- kind: fix
- logged: v0.26.0 · 2026-11-15

A page without an icon link makes a browser ask for `/favicon.ico`; the splash page is one, its content is fixed, and the 404 showed as a console error on a first visit. When the built window is served and holds `favicon.png` but no `favicon.ico`, the engine answers that path with the PNG.

### app/core/config.py and friends · the name a person sees is FormAT
- refers-to: app/core/config.py :: APP_NAME; app/routers/system.py :: PAGE, oauth_callback; app/engine/devices.py :: the unpaired page; app/engine/oauth.py :: client_name, two errors; app/engine/marketplaces.py, native.py :: errors; src-tauri/src/main.rs :: the update and failure dialogs; src-tauri/Info.plist; src-tauri/tauri.conf.json :: longDescription
- kind: decision
- logged: v0.26.0 · 2026-11-15

The window says FormAT; the engine and the shell still said Format in what they show people: the health and `app.info` name, the sign-in pages that open in a browser tab, the page an unpaired device gets, the client name a connector's sign-in screen shows, a few error sentences, the update and engine-failure dialogs, the two macOS permission prompts and the package description. Those changed. Left alone on purpose: identifiers, the `format` command, `FORMAT_` variables, the data folders (`Application Support/Format`, `%APPDATA%\Format`, `~/.local/share/format`, so existing data is found), command descriptions and everything written for the model or for agents.

### src-tauri/src/main.rs · the engine-failure dialog cannot be lost
- refers-to: src-tauri/src/main.rs :: the `port.is_none()` branch
- kind: fix
- logged: v0.26.0 · 2026-11-15

When the engine exits before printing its port the shell closed the splash and then showed a dialog. The splash is the only window at that moment, and closing the last window asks the app to exit, so the dialog raced the exit. The splash is now hidden, not closed, before the dialog; the process exits after it as before. Type-checked only.

### build_app · the macOS build names its output from the config
- refers-to: build_app :: the `product` variable and every use of it
- kind: fix
- logged: v0.26.0 · 2026-11-15

`productName` became FormAT in 0.25.3 and the script still looked for `Format.app`, named the disk image and its volume `Format`, and installed `Format.app`. On a case-sensitive volume the build stopped with "the build finished but ... is missing"; on the usual case-insensitive one it went on and shipped the old spelling. The name is read from `tauri.conf.json` once, like the version beside it. Not run: no Mac.

### Signing without notarization · what was read
- refers-to: src-tauri/entitlements.plist; src-tauri/Info.plist; src-tauri/tauri.conf.json :: bundle.macOS, bundle.externalBin; setup/freeze_backend
- kind: warning-context
- logged: v0.26.0 · 2026-11-15

The owner may ship a macOS build signed with a Developer ID and not notarized. Nothing in the tree should stop such a build from starting; this is from reading, not from a Mac. Tauri signs every external binary with the app's entitlements file and the hardened runtime, inside out, before the app (read in Tauri's sources on GitHub `dev`: the bundler's macOS `app.rs` and `sign.rs`, and `tauri-macos-sign`; the pinned CLI is 2.12.2 and was not read itself). So the one-file engine carries `com.apple.security.cs.disable-library-validation`, which it needs because PyInstaller signs the libraries inside it ad hoc and the engine loads them from its unpack folder. `src-tauri/Info.plist` is merged into the bundle's by name, so the microphone and local-network texts are there, and `audio-input` is in the entitlements. Processes the engine starts (shells, the browser driver, the optional renderer) run under their own signatures, not the app's hardened runtime. Notarization changes only what Gatekeeper says at first launch: on macOS 15 the person must allow the app in System Settings, Privacy and Security (the manual says how). formdeck ships the same shape.

### Left open by the review
- refers-to: src-tauri/src/main.rs :: kill_backend; format_engine.py; app/engine/devices.py :: _serve; app/engine/chat.py :: start
- kind: warning-context
- logged: v0.26.0 · 2026-11-15

Seen and not fixed, with the reason. The shell kills the one-file engine outright on quit, so its launcher cannot delete its unpack folder (`_MEI...` in the temp folder): one folder per launch stays behind. formvis met this (5.3 GB on the owner's Mac) and sweeps stale folders at start (`sweep_stale_unpacks` in its engine entry); not ported, because it cannot be checked without a frozen build. There is no single-instance guard: a second launch on Windows or Linux starts a second engine on the same data folder (two schedulers). Opening to other devices lowers the shared uvicorn log level to warning, so the engine log goes quiet afterwards; the simple fixes would either log the pairing code or silence the main access log. `chat.start` marks a chat as running before it has started the thread, and only one of the possible failures in between clears the mark. A failed spawn of the engine aborts the shell with no dialog.

Superseded in 0.26.3: every item in this entry was worked on there (see "The review's open list" below). The log-level item is fixed in the way this entry feared, the main access log stays, and the pairing code would have reached it; a log filter in the same release blanks it (see "Pairing codes and share tokens never reach a log" below).

## Credits, community files and release addresses, 0.26.1 {#notice-0-26-1}

### app/demos/solar-system/files/CREDITS.md, chat.json, NOTICE.md · each map's own credit
- refers-to: app/demos/solar-system/files/CREDITS.md; app/demos/solar-system/chat.json :: files[0] (size, caption); NOTICE.md :: Demo chats, Images used by the demo chats
- kind: decision
- logged: v0.26.1 · 2026-11-15

The 0.26.0 record gave all 26 maps one credit line, "NASA (NASA 3D Resources)", taken from the repository README, which credits no individual file. Every map is also published on NASA Science's 3D Resources catalogue (`science.nasa.gov/3d-resources/`), and each page there has its own credit line (Earth "USGS & NASA/Jet Propulsion Laboratory", Jupiter "JPL & Caltech", Neptune "Don Davis & JPL/Caltech", the Moon "Johnson Space Center"). A credit line is a statement by the source, so each is now read from its page (15 November 2026) and copied exactly as given, with the page's address and its own words about what the map is. Where a page gives no credit line (Venus, Saturn, Titan and the six Saturn moons) none is invented: the table says "none on the page" and puts JPL's map table (`maps.jpl.nasa.gov/tmaps/`), which lists an owner for each map, beside it as a separate fact. The evidence for every row is in `scratch/turn3-pictures/EVIDENCE.md`: each embedded map was matched to its source file by grayscale correlation (0.97 to 1.00 for the unedited ones, 0.75 to 0.99 under the mask for the edited ones; the Moon is projected) and each source file's size equals the size its page lists.

The status is the source's own, not a reading of ours: NASA's media guidelines say NASA content "generally are not subject to copyright in the United States" and that "NASA should be acknowledged as the source of the material", and no map page states a licence of its own. "Free and without copyright" (the README) and "NASA Open Source Agreement Version 1.3" (the repository's `meta.json`) stay quoted as what those files say, not as the terms of the maps. Maps whose credit names the USGS add that the USGS states its own content is in the US public domain. The old text called the maps photographic; that was wrong for Venus (a radar map with filled gaps) and for the Saturn, Neptune and Titan textures (artist's or concept textures, which their pages call "Fictional"), and the text now says so.

Two quirks of the NASA pages are written down so nobody trusts them: the Miranda page names its download `Uranus - Ariel.jpg`, and the Oberon page shows Ariel's file size. The repository files are `Uranus - Miranda.jpg` (313.74 KB) and `Uranus - Oberon.jpg` (50.01 KB), and the embedded maps were compared with those. `chat.json` lists CREDITS.md with its size (4331 became 12861, the file's real byte count) and a caption that now says "source, credit and terms"; the engine takes the size from the file at seeding, so the number is only for the reader of the JSON. `artifact.html` was not touched.

A demo is seeded once. A chat made by 0.26.0 keeps the CREDITS.md it was given, and `demo.restore` returns that chat as it is; deleting the demo and restoring it builds it again from the folder, with the new file. The docs say so.

### NOTICE.md · own work and the demo pictures
- refers-to: NOTICE.md :: Demo chats
- kind: decision
- logged: v0.26.1 · 2026-11-15

Every demo picture in the family was checked at its source this turn. FormAT has the least to record: Northern Light and Harbour Ferries use no picture, and the Orrery's Sun, Mercury, Uranus, both ring systems and Earth's clouds are drawn by the page's own code, so those are own work and the notice now says so (own work, Apache-2.0). The only pictures from anyone else are the 26 NASA maps. The Hubble Ultra Deep Field that the other apps carry (corrected there from "public domain" to CC BY 4.0) is not in FormAT.

### CODE_OF_CONDUCT.md, CONTRIBUTING.md, SECURITY.md · the family's community files
- refers-to: CODE_OF_CONDUCT.md; CONTRIBUTING.md; SECURITY.md; README.md :: Contributing
- kind: rationale
- logged: v0.26.1 · 2026-11-15

formvis and formdeck each have these three files at the root and FormAT had none. They follow the family's shape and say FormAT's own things. CONTRIBUTING.md lists the checks CI runs (the window's packages, type check and build, engine compile and tests, the window smoke), the folders, the rule that a command is added in `cmd_*.py` and then to `GUIDE` with `./format agents sync`, the NOTICE.md row before any new dependency, binary, model, font or data file, who maintains it, how changes land (only a maintainer pushes to `main`) and that no contributor push starts a release; its patent and trademark rules repeat the ones in `CLAUDE.md`. SECURITY.md reports through GitHub's private vulnerability reporting and lists what counts by FormAT's real surfaces: the loopback engine on 8490, Other devices on 8492 (pairing and share links), the MCP server, approvals and Claude's tools, the terminal dock, artifact sandboxing, plugins, skills and connectors, provider keys, and files and downloads. Its supported-versions row reads "0.26.x (latest release)", so a patch release does not touch it; a minor release must. The README's Contributing line and its Repository section link all three.

### README.md, BRANCHING.md, .docs/wiki, docs/desktop-app.md, release-keeper · the release addresses
- refers-to: README.md :: Run it from source; BRANCHING.md :: Releases; .docs/wiki/Releasing.md; .docs/wiki/Desktop.md; docs/desktop-app.md; .claude/skills and .agents/skills format-harness/sub-skills/release-keeper/SUB-SKILL.md :: Compile branch
- kind: fix
- logged: v0.26.1 · 2026-11-15

Five current docs and both copies of the release-keeper skill still named formcompiler as `nodemode-ai/formcompiler`; it lives at `nodemode-dev/formcompiler` (the README and CONTRIBUTING.md already said so), and an agent following the skill would look for the compile branch's builder in the wrong place. The two skill copies stay identical. The README's clone line said `nodemode-dev/format.git` and then `cd format`; the repository is `formAT`, so the line is `git@github.com:nodemode-dev/formAT.git` and `cd formAT` (GitHub accepts either case of the name, but a clone of `formAT.git` lands in `formAT/`, so the `cd` had to change with it). CHANGELOG history is not edited: 0.25.x entries keep the address they were written with. Not changed, because it is configuration and not documentation: `src-tauri/tauri.conf.json` has the updater endpoint `https://github.com/nodemode-ai/formcompiler/releases/download/format-updates/latest.json`. It decides where installed apps look for updates, so it was left for the owner to decide whether it should move.

### src-tauri/tauri.conf.json · the updater endpoint
- refers-to: src-tauri/tauri.conf.json :: plugins.updater.endpoints
- kind: fix
- logged: v0.26.2 · 2026-11-15

The owner decided the updater should look where formcompiler lives: `https://github.com/nodemode-dev/formcompiler/releases/download/format-updates/latest.json`. Only the organisation in the address changed; the `format-updates` release name, the `latest.json` file and the updater's public key are as they were, so an installed 0.26.x app checks the new address once it runs 0.26.2. Apps older than 0.26.2 still ask the `nodemode-ai` address, which GitHub redirects only if formcompiler was moved there by a transfer.

## The review's open list, fixed in the engine, the shell, the build and the demos, 0.26.3 {#open-items-0-26-3}

### src-tauri/src/main.rs, backend/format_engine.py · the engine's unpack folder is removed at quit and swept at start
- refers-to: src-tauri/src/main.rs :: kill_backend; backend/format_engine.py :: watch_parent, unpack_dir, hold_unpack, sweep_stale_unpacks, launcher_alive
- kind: fix
- logged: v0.26.3 · 2026-11-15

Cause. The frozen engine is a PyInstaller one-file program: a launcher unpacks the engine into a folder in the temp directory (`_MEI` and the launcher's process id as 8 hex digits, then random characters) and deletes it when it exits normally. The shell stopped the sidecar with `child.kill()`, which is SIGKILL on the launcher, so the launcher never reached its cleanup and one folder stayed behind per launch. formvis met the same thing (5.3 GB on the owner's Mac).

Quit. On macOS and Linux `kill_backend` now sends the launcher SIGTERM first (the shell plugin's child only offers `kill()`, so the shell runs `kill -TERM <pid>`, which needs no new crate) and checks with `kill -0` every 50 ms for up to 1.5 s; the launcher passes the signal on, uvicorn stops, the launcher removes its folder and exits. Only if it is still there after 1.5 s does `kill()` follow. The lock on the shell's backend slot is taken with `.ok()` so a poisoned mutex cannot panic the exit. On Windows the shell still kills outright (there is no SIGTERM there).

Launcher killed. If the launcher dies without cleaning up (SIGKILL, a crash), the server's parent watch sees its parent id change within 0.5 s, removes its own unpack folder (`shutil.rmtree`, only on POSIX and only when the folder's name starts with `_MEI`) and exits. A server cannot delete its own folder on Windows while its files are loaded, so there it does not try.

Sweep at start. Each engine locks a marker file, `.format-engine-running`, inside its own unpack folder for as long as it lives (`hold_unpack`, the same OS lock as `engine.lock`). In a background thread (`sweep_stale_unpacks`, so start is not slowed) it lists its siblings named `_MEI<8 hex>...` and removes one only when all of these hold: it is not its own, the process id in its name is no longer a live process (`launcher_alive`: `kill -0` on POSIX, `OpenProcess` and `GetExitCodeProcess` on Windows), and nobody holds the marker's lock. A folder without a marker (made by an older FormAT) is removed only if it also has `frontend_dist` and `app/demos`, so another program's PyInstaller folder, which looks the same by name, is left alone. The lock is the check that matters: a process id can be reused, and a lock dies with its holder.

Seen on Linux with the frozen engine (the repo's freeze script, `scratch/formAT/turn5-desktop/probe_unpack.py`): launcher SIGKILLed, the server removed its folder in 0.6 s; launcher SIGTERMed, it exited in 0.7 s and the folder was gone; after a crash the stale folder was removed by the next engine within 3 s while a running engine's folder (527 files) was untouched and still answering; a folder shaped like an older FormAT's was removed and another program's was kept. Through the debug Linux shell under Xvfb, File, Close Window ended the shell with exit 0, the engine log ended in a graceful shutdown and no `_MEI` folder remained. Not seen on macOS (same POSIX path, never run) or on Windows (the kill and the sweep's Windows branches were read, not run).

### backend/app/core/instance.py, app/routers/__init__.py, format_engine.py · one engine per data folder
- refers-to: app/core/instance.py :: claim, try_lock, AlreadyRunning; app/routers/__init__.py :: startup; format_engine.py :: main
- kind: decision
- logged: v0.26.3 · 2026-11-15

Two engines on one data folder run two schedulers and write the same SQLite file and chat folders. `claim` takes an exclusive lock on `engine.lock` in the data folder (`flock` on POSIX, `msvcrt.locking` on Windows) and writes its process id into it. A lock, not the file's existence, so a crash or `kill -9` leaves nothing to clean: the system releases it when the process ends, and the pid in the file is only for the message. It waits up to 3 s before giving up, because a restart right after a quit can meet the old engine still shutting down. If it cannot get the lock it prints "FormAT is already running on the data folder ... (engine process N). Close the other FormAT first, or start this one with FORMAT_DATA_DIR set to another folder." and exits with 2: the frozen entry returns 2 before uvicorn starts, and an engine started from source does the same from `startup()` with `os._exit(2)`. `_held` keeps the file open for the life of the process and makes a second `claim` in the same process a no-op, which is why the frozen entry and `startup()` can both call it. Seen with two source engines on one folder and with a restart after a normal stop and after `kill -9` (`scratch/formAT/turn5-desktop/probe_two_engines.sh`), and with a second frozen engine on a running one's folder (exit 2 with the message, the first still answering). Not seen on Windows.

### src-tauri/src/main.rs, Cargo.toml, Cargo.lock, NOTICE.md · one shell per user, and a dialog when the engine cannot be spawned
- refers-to: src-tauri/src/main.rs :: focus_running, engine_failed, engine_log_path, setup; src-tauri/Cargo.toml; src-tauri/Cargo.lock; NOTICE.md :: Dependencies
- kind: decision
- logged: v0.26.3 · 2026-11-15

One shell. The engine lock stops a second engine, but a second launch of the app still opened a second splash and window and then failed in the engine. `tauri-plugin-single-instance` 2.5.5 (Apache-2.0 OR MIT) makes the second process exit at once and calls back in the first, which unminimises, shows and focuses the splash if it is still up and the main window otherwise (`focus_running`). It is registered first, as the plugin's own documentation requires. It needed no new crate beyond itself: `serde`, `serde_json`, `tauri`, `thiserror`, `tokio`, `tracing`, `windows-sys` 0.61.2 and `zbus` were already in `Cargo.lock`, so the lock gained one package entry and one dependency line, and the NOTICE.md row says so. Seen on Linux with the debug shell under Xvfb: the second launch exits 0 in 0.4 s and the count of engine processes stays at two (launcher and server). Not run on macOS or Windows.

A dialog. A sidecar that could not be spawned (a missing or damaged binary) ended in `.expect(...)`, a panic with no window and no message in a GUI app. The spawn error is now written to `engine.log`, and `engine_failed` hides the splash, shows an error dialog with the message and the log's path, stops any backend and exits with 1. The dialog is shown from the async runtime and not from the setup callback: a blocking dialog on the main thread would stop the event loop that draws it. The existing "engine exited before it printed its address" dialog goes through the same function, so it now names the log too. Seen on Linux with an unspawnable sidecar: the dialog with the log path, `engine.log` holding the error line, and OK ending the shell with 1 within 0.1 s. Not run on macOS or Windows.

### backend/app/engine/devices.py · Other devices no longer silences the engine's log
- refers-to: app/engine/devices.py :: _serve
- kind: fix
- logged: v0.26.3 · 2026-11-15

Cause. The listener for other devices is a second uvicorn server in the same process, built with `log_level="warning"`. `uvicorn.Config` applies its level to the `uvicorn`, `uvicorn.error` and `uvicorn.access` loggers, which are shared, so starting the second server turned the main server's access lines off too and `engine.log` went quiet until the engine was restarted. It is now built with `log_config=None, log_level=None`, which leaves the loggers as the main server configured them. Seen with two probes, one against the code before this change and one after (`scratch/formAT/turn5-desktop/probe_loglevel.sh`): access lines for the same call 1 then 1 before, 1 then 4 after.

The 0.26.0 entry above feared that this fix would log the pairing code, and the first version of it did: see the next entry.

### backend/app/engine/devices.py · pairing codes and share tokens never reach a log
- refers-to: app/engine/devices.py :: _SECRET_IN_URL, _blank, _Redact, redact_logs, _serve
- kind: fix
- logged: v0.26.3 · 2026-11-15

Cause. A device pairs by opening `/pair?code=<secret>` on port 8492, and uvicorn's access line for a request holds the whole address. Once the listener stopped silencing the shared loggers (the entry above), `engine.log` held the pairing secret, which is also the value of the `format_pair` cookie that keeps a paired device in for a year, until Forget paired devices. A share link, `/s/<token>`, is opened by anyone without pairing, on 8492 and on the main port, and its token was in the log the same way. The log is a file of the person's own account, but the manual says where it is and the failure dialog shows its last lines, so it is a file people open and may attach to a report. A probe on the tree before this fix (`scratch/formAT/turn5-release/paircode_probe.sh`) found the pairing secret once in the log after one pairing request.

Fix. A `logging.Filter` (`_Redact`) is added to the `uvicorn.access` and `uvicorn.error` loggers, once, when `devices.py` is imported and again when the listener is built (`redact_logs` skips a logger that already has it). It blanks, in the record's message and in each string argument, the whole query string of `/pair` (`/pair?<redacted>`), the value of any `code=` parameter, and the token of any `/s/<token>` path (`/s/<redacted>`). Those are the only secrets the 8492 listener reads from an address: `Gate` takes the pairing code from the `code` parameter of `/pair`, the cookie travels in a header that uvicorn does not log, and the share token is the one path segment after `/s/`. The filter keeps the structure of a record's arguments, because uvicorn's access formatter unpacks five of them (a first version that replaced the arguments with a plain message made the formatter fail). It changes no level and no handler, and it filters the shared loggers, so it covers the main listener's lines too. An access line stays in the log with the value blanked, for example `"GET /pair?<redacted> HTTP/1.1" 303 See Other`.

Seen with `paircode_probe.sh` on an engine run from source: after Other devices was turned on, a pairing request (right code and wrong code), a request with the cookie, and a share link opened on 8492 and on 8490, the pairing secret and the share token each appear 0 times in `engine.log`; each of those requests has its access line with the value blanked; the main listener's own access lines from before and after `devices.start` are all there; no logging error. The frozen engine was not rebuilt for this fix, so the filter's order against the frozen entry's own logger set-up was not seen there; the filter is also installed when the listener is built, after uvicorn has configured its loggers.

### backend/app/engine/chat.py · chat.start and chat.start_compaction clear the running mark on every failure
- refers-to: app/engine/chat.py :: start, start_compaction
- kind: fix
- logged: v0.26.3 · 2026-11-15

Both functions put the chat in `RUNS` (the mark that makes the next send answer "A reply is already running in this chat; stop it first") and then did work that can fail: reading settings, finding the model, reading the path, inserting the placeholder message, starting the thread. Only one failure, a provider error from `claude_code.route`, removed the mark, so any other left the chat unable to start a reply until the engine restarted. Now everything after the mark is inside one `try`; on any `BaseException` the mark is removed if it is still this run's own (`RUNS.get(id) is cancel`, so a newer run is never cleared), a placeholder message that already exists is completed with status `error` and "The reply could not start: ..." so the window does not keep showing a reply that is streaming, and the error is raised again (a provider error still as a `RuntimeError` with its own text). `start_compaction` has the same shape, with its thread started inside the `try`. Seen with a probe that forces each failure in turn (`scratch/formAT/turn5-desktop/probe_chat_start.py`): run against the code before, every case left the mark; run against the working tree, none did.

### backend/app/engine/cmd_app.py, app/core/secrets.py · app.info says where keys are kept
- refers-to: app/engine/cmd_app.py :: info; app/core/secrets.py :: location; frontend/src/ui/views.ts :: SettingsView
- kind: decision
- logged: v0.26.3 · 2026-11-15

Settings, API keys told every reader to use `backend/.env`, which does not exist in the desktop app. `app.info` now returns `keysFile` (the saved-keys file, from `secrets.location()`) and `envFile` (`backend/.env`, or null in a frozen engine, which never reads one), and the window builds the note from them. The command's description changed, so `./format agents sync` regenerated the tool reference in both skill trees.

### backend/app/routers/files.py, app/engine/tools.py · Download all is named for what it is
- refers-to: app/routers/files.py :: outputs_zip; app/engine/tools.py :: outputs_zip_name; frontend/src/ui/side-panel.ts :: setOutputs
- kind: fix
- logged: v0.26.3 · 2026-11-15

Download all always saved `outputs.zip`. The ferry demo lists its own package zip first, so two different archives looked alike. The download is now "<chat title> - all files.zip": the title with path and device characters (`\ / : * ? " < > |` and control characters) turned into spaces, trimmed, at most 80 characters, "Chat" when empty. The header carries an ASCII `filename` (the characters of the name that are ASCII and not a quote or backslash; `outputs.zip` if that leaves only the "- all files.zip" tail) and a `filename*` in UTF-8 for the full name. The window says "Download all N as one zip" with a note that a zip in the list stays inside it. The desktop shell saves downloads under the server's file name, so the name carries over.

### backend/app/engine/demos.py, cmd_demo.py, app/demos/*/about.json · the list comes from the folders, and an untouched demo follows the app
- refers-to: app/engine/demos.py :: _digest, _untouched, _current, _refresh, update_if_stale, _about, list_, seed; app/engine/cmd_demo.py :: list_; app/demos/<id>/about.json; frontend/src/demos.ts
- kind: decision
- logged: v0.26.3 · 2026-11-15

Two problems. A demo was written once per data folder, so a better page, reply or file reached only new data folders (0.26.1's corrected CREDITS.md was the example), and the window repeated each demo's title and blurb in `demos.ts`, so a new demo meant a change in two places.

List. Each demo folder has an `about.json` with `order` (an integer) and `blurb`. `demo.list` returns both with each demo, sorted by order, then title, then id; a missing or broken file gives no blurb and order 1000, and the demo is still listed. The window reads the list at load.

Refresh. At each start `seed()` calls `update_if_stale` for each demo already seeded. The meta key `demos.shipped` records, per demo, a SHA-256 digest of `chat.json`, the page and every file under `files/` (names and bytes), the title it was made with and the file list. If the record equals the current digest nothing happens. Otherwise the chat is refreshed only if it is untouched: its title is the recorded one; its messages are one unbranched line ending in the recorded assistant reply; the user messages carry no meta and each assistant message's meta names the demo; its artifacts are exactly those its messages made, each with one version; and its folder holds no file beyond those the demo shipped now or before. A chat the person renamed, continued, branched, edited or put files in is left as it is and a line is logged; deleting it and `demo.restore` builds the new one. If the chat already equals the app's copy (the first start after upgrading from a version with no record, when nothing changed) the record is just written. A refresh runs in one transaction on the same conversation row, so its id, pin, project and place in the list stay: messages, artifacts and the outputs record are deleted and built again from the folder, share links are re-pointed at the new artifact with the same token, version and date, and files the old copy shipped and the new one does not are removed. A failure rolls back and is logged as a warning without stopping the start. The wiki's Architecture page describes the same rules.

### backend/app/demos/solar-system, tools/demos/orrery, NOTICE.md · the Orrery's credits are on its page, every figure has its page, and the source is in the repo
- refers-to: app/demos/solar-system/artifact.html; app/demos/solar-system/chat.json; app/demos/solar-system/files/CREDITS.md and FIGURES.md; tools/demos/orrery/; NOTICE.md :: Demo chats
- kind: decision
- logged: v0.26.3 · 2026-11-15

Credits. The page had no credit text; the credit lines were in `NOTICE.md` and the attached `CREDITS.md` only. It now has a Credits button at the top left, opening a panel that lists the credit line and a link to the source page of each of the 26 maps (the same text as `NOTICE.md` and `CREDITS.md`, which must be changed together with the `MAPS` list in the template), says which parts the page draws itself and where its figures come from. It is a dialog that is not modal (`aria-modal` false): Escape and a click outside close it, Tab stays inside it, keys pressed while focus is in it do not reach the page's own shortcuts, it fades in without moving anything, and with reduced motion it does not fade.

Figures. The earlier notes admitted that some figures were computed and that two NASA pages gave different moon counts for Jupiter. Every figure and sentence of fact on the page was re-read against NASA's fact sheets and NASA Science pages on 15 November 2026 and is now either quoted from a NASA page or rounded from a fact-sheet value, or is listed in "Computed or converted, still on the page" in the new `files/FIGURES.md` with what it was computed from (diameters are twice the fact sheet's mean radius, hours turned into days, counts of what the page draws). `FIGURES.md` gives for each row the value shown, NASA's words, the page and whether the row changed: 49 rows did, for example the Sun's diameter (1,391,400 km, was 1,392,700), its age (about 4.5 billion years, was 4.6), the light time to Earth ("about eight minutes" as NASA writes it, was a computed "a little over eight minutes"), Saturn's rings (up to 282,000 km from the planet, was 270,000 km across) and Mercury's note. Jupiter's moons: NASA's moons page (last updated 21 September 2026) says 115, its fact sheet (2023) says 95, and the page shows 115 and says why. The file is listed in the chat's Outputs, and `chat.json` and `CREDITS.md` point to it (the sizes in `chat.json`, 13404 and 40652, are the files' byte counts, which the engine reads again when it seeds).

Limit. The pages were read with a fetch tool that returns a summary written by a small model, not the raw page, so a quoted sentence is that tool's reading of the page; `FIGURES.md` says so in its first paragraph and lists what was only partly checked (the Sun's age, three moon diameters, one page that could not be fetched, the taglines).

Source. The page used to be built from a template and scripts kept outside the repo. `tools/demos/orrery/` now holds `orrery.template.html`, `textures.json` (the 26 maps as data URIs), `build.py` (writes `artifact.html`, leaves out the blocks marked as test hooks and asserts that no `window.__` name is left) and `prep_textures.py` (makes `textures.json` from a clone of NASA's repository at the commit named in `NOTICE.md`; with Pillow 12.3.0 it reproduces the file byte for byte), with a README. `artifact.html` is built output: change the template and run the build. The reply in `chat.json` now mentions the Credits button and `FIGURES.md`. Nothing is added to `NOTICE.md` beyond the sentence about the Credits panel, `FIGURES.md` and the source folder, because no new picture, font or script from anyone else is used.

### format.bat, setup/*.bat · the Windows launcher has the commands the shell launcher has
- refers-to: format.bat; setup/build_frontend.bat; setup/serve.bat; setup/doctor.bat; setup/clean.bat; setup/install_voice.bat; setup/install_browser.bat; setup/freeze_backend.bat
- kind: fix
- logged: v0.26.3 · 2026-11-15

`./format` has `build`, `serve`, `doctor`, `clean`, `install-voice` and `install-browser`, and the manual names them, but `format.bat` answered only to the others. Each is now a small batch file in `setup/` that does what its POSIX sibling does, using the venv's `Scripts\python.exe`, and `format.bat` routes to it (`build` runs the existing `setup\build_frontend.bat`; `clean` passes `--all` through). `doctor.bat` checks Node (20.19 or later, 22.12 or later, or 23 and up), npm, Python 3.12 or later, the engine venv, the window's packages, a key in `backend\.env`, git, ffmpeg, Rust, and whether ports 5490 and `FORMAT_PORT` (8490) are free (a PowerShell TCP connect), prints ok, warn or FAIL lines and exits 1 only when a FAIL line was printed. `install_voice.bat` downloads the model named by `FORMAT_WHISPER_MODEL` (large-v3-turbo by default) and says what to do if the download fails. `serve.bat` runs uvicorn with `FORMAT_SERVE_DIST=1` on `FORMAT_PORT`. Separately, `freeze_backend.bat` had `--collect-submodules app--collect-submodules uvicorn` (a missing space), which handed PyInstaller one malformed option in place of two; it is fixed. None of this has been run on Windows: there is no Windows here, and a batch file cannot be syntax-checked on Linux.

### backend/app/core/window_key.py, app/core/seal.py, app/routers/*, app/engine/agents.py, cmd_settings.py, format_engine.py · only the FormAT window changes things without asking
- refers-to: app/core/window_key.py; app/core/seal.py; app/main.py; app/routers/system.py, commands.py, mcp_http.py, stream.py, terminal_socket.py; app/engine/agents.py `require_outside`; app/engine/cmd_settings.py `current`, `set_`; app/mcp_server.py `list_resources`; format_engine.py `main`; src-tauri/src/main.rs; tests/conftest.py `client`, `bare`; tests/test_commands.py `_window`
- kind: decision
- logged: unreleased · 2026-11-18

Key. The engine makes a per-launch key (`secrets.token_urlsafe(32)`, memory only, compared with `hmac.compare_digest`). `WindowKeyGuard` (added once in main.py, inside LocalGuard) refuses every request whose method is not GET, HEAD or OPTIONS without header `X-Format-Window-Key`, 403 "Only the FormAT window can do this". Open list: `/mcp` (outside agents, consent applies), `/api/window/key` (the development bootstrap), and the prefix `/api/commands/`, whose router treats a keyless call, or any call carrying `x-format-agent`, as an outside agent: `agents.require_outside` follows the stored choice (ask, allowed, blocked) and refuses `settings.set outsideAgents` to every outside caller, so `./format cli` and the stdio bridge (`./format mcp`, app/mcp_stdio.py) keep working under consent and can never change the choice. Before this, a call without the agent header skipped consent.

Other devices. The LAN listener's Gate (engine/devices.py) marks a request whose pairing cookie matches with the scope flag `format.paired`. A paired request counts as the window (`window_key.is_window`): the paired phone or computer is the person, it loads the same page and cannot hold the key, and the listener only runs after the window turns it on. The bootstrap answers 404 to a paired request so a phone never takes or spends the key.

Getting the key. Packaged: the shell starts the engine with `FORMAT_WINDOW_KEY_STDOUT=1`; format_engine.py writes `format-window-key: <key>` to stdout, flushed, before uvicorn starts, and the bootstrap answers 404. The shell reads it, keeps it out of engine.log, waits at most 10 seconds from the start for it (otherwise the existing "engine failed to start" dialog), and gives it to the page in one initialization script only for its own origin. From source: `POST /api/window/key` answers once, then 409 and `STATE["secondClaim"]`.

Sockets. `/api/events` and `/api/terminal/{id}` accept only a paired client or a one-time ticket from `POST /api/window/ticket` (needs the key, lives 30 seconds, spent on use); without it they close with 4403 before accepting.

Seal. `outsideAgents` is sealed: `setting.seal` in the meta table holds HMAC-SHA256 over the canonical JSON of the sealed fields, with a 32-byte key kept in the keychain (`keyring`, service FormAT, account settings-seal), written by `settings.set` when the choice changes. `current()` reports `seal` (ok, unsealed, broken, unavailable) and `sealBroken`; a stored `allowed` without a matching seal reads as `ask`. `keyring` is imported lazily inside a try: with no keychain the stored value stands and `seal` is `unavailable`, and the engine starts. There is no `claudeBin` setting (the Claude Code path comes from FORMAT_CLAUDE_BIN only) and no in-app agent token: Claude Code runs as the engine's own hidden child per reply.

resources/list. It used to answer an empty list on every failure, so a consent refusal looked like no resources; it now raises the refusal as an error.

Tests. The session `client` sends the key because every existing test that writes stands in for the window; `bare` has none. `_window` in test_commands.py claims its engine's key through the bootstrap, because the subprocess engine there is a window run from source.

### src-tauri/src/main.rs · the engine gets as long to start as before; the 10 seconds cover only the key
- refers-to: src-tauri/src/main.rs `main` (the reading loop in `setup`), `KEY_WAIT`
- kind: fix
- logged: unreleased · 2026-11-19

The previous entry's shell counted `KEY_WAIT` (10 seconds) from the spawn, so a slow first start of a packaged engine (cold disk, antivirus scan, unpacking) would have ended in "engine failed to start" on a healthy app; on origin/main there was no limit on the start. Now the loop waits on `rx.recv()` without a limit until the address line ("Uvicorn running on") has arrived, as it did before, and `address_at` records when it did. Only while the address is known and the key is not does it poll with `try_recv` and 20 ms sleeps, and when 10 seconds have passed since the address it takes the existing failure path. The engine writes the key line to stdout, flushed, before uvicorn starts, so normally the key is already in the pipe (measured from source with `FORMAT_WINDOW_KEY_STDOUT=1`: key line at 5.6 s, address on stderr at 6.1 s); the 10 seconds only cover a line read out of order or an engine too old to print a key. An engine that exits before its address still takes the failure path at once. After the window has opened, nothing in the loop can show the failure dialog. A key line that came after the address used to `continue` past the check that opens the window, so the window waited for some later engine line that might never come; the key line now becomes an empty line (kept out of engine.log and out of the failure dialog's tail) and the open check runs on it. The shell cannot be compiled here; the loop was copied into a scratch crate with tokio 1.53.2 (the pinned version) and run against fake event streams: key then address (window at once), address then 11 seconds of nothing (failure at 10.0 s), 25 seconds of nothing then key and address (window at 25 s), address then key 3 s later (window at 3 s; before the late-key change, no window), exit before address (failure at once), exit after the window opened (no failure).

### backend/app/engine/tools.py · the bash tool's shell gets a named, minimal environment
- refers-to: app/engine/tools.py `BASH_ENV`, `BASH_ENV_WINDOWS`, `bash_env`, `_bash`; tests/test_window_key.py `test_the_bash_tool_gives_its_shell_no_secret_from_the_engine`
- kind: fix
- logged: unreleased · 2026-11-19

`_bash` used to hand its child `dict(os.environ)`, so every key the engine holds (API keys loaded from .env, FORMAT_WINDOW_KEY_STDOUT, tokens of the person's shell) reached any command Claude ran. The child now gets only the names a shell needs: PATH, HOME, USER, LOGNAME, SHELL, LANG, LANGUAGE, LC_*, TERM (dumb when the engine has none, since output goes to a pipe), COLORTERM, TZ, TMPDIR, plus PWD and FORMAT_WORKSPACE set to the chat's folder; on Windows also the system variables a process needs (SYSTEMROOT, WINDIR, COMSPEC, PATHEXT, TEMP, TMP, USERPROFILE, APPDATA, LOCALAPPDATA, PROGRAMDATA, the Program Files names, PROCESSOR_* and the like). Proxy variables are left out because they can carry credentials; behind a proxy a command sets them itself. `bash -lc` still reads the login profile, so what the person's profile sets is there. The plain terminal tabs (engine/terminal.py) and the Claude Code child (claude_code.py, which needs the API key) are not changed. Seen: with marker values in ANTHROPIC_API_KEY, OPENAI_API_KEY, GITHUB_TOKEN, AWS_SECRET_ACCESS_KEY and FORMAT_WINDOW_KEY_STDOUT, the tool's `env` printed none of them (236 engine variables, 8 passed), and pwd, python3, git and ls worked.

### setup/agents.py · ./format agents sync --check
- refers-to: setup/agents.py `generated`, `tree`, `check`, `sync`, `main`; format, format.bat (usage); .docs/wiki/Agents.md, Releasing.md
- kind: feature
- logged: unreleased · 2026-11-19

`./format agents sync --check` changes nothing: it builds the three generated references in memory and compares them with the files, compares `.agents/skills` with `.claude/skills` file by file (a file missing, extra or different on either side counts), prints each out-of-date path and exits 1, or prints that the agent files are up to date and exits 0. It reads like formpath's check. `sync` uses the same `generated()` list, so the two cannot disagree on what is generated. Counts, from source: 114 commands in the registry, and 115 MCP tools (`mcp_server.to_tools(catalogue())`: one per command plus `run_command`). The only live document that states a number is README.md (114 engine commands), which is right; the generated references state none.

### agents/manifest.json · what the app offers agents
- refers-to: setup/agents.py `manifest_text`, `skill_entries`, `check`, `sync`, `DOCK`, `APP`; app/engine/agents.py `EXEMPT`, `require_outside`; tests/test_agent_manifest.py
- kind: feature
- logged: unreleased · 2026-11-18

formadaptor reads `agents/manifest.json` at each released tag to build the family spec (docs/SPEC.md, "The agent manifest"; its checker is `scripts/manifest.py check`). `./format agents sync` now writes it and `sync --check` lists it among the out-of-date files and exits 1, so it cannot drift from the code. Every field is read, none typed except the dock. `app` is `format`, the file name of this app's entry in formcompiler apps/ (the repository is formAT, the registry entry is `format.json`). `mcp.tools` is `mcp_server.to_tools(catalogue())`, the very call the server's `tools/list` makes (stdio and http share it), so the 114 commands plus `run_command` give 115. `mcp.read_only` is the tools whose `read_only_hint` annotation is true (42), the annotation the server sends. `mcp.approval_gated` is every tool whose command is not in `agents.EXEMPT`: the gate (`require_outside`, called for every call that arrives on /mcp, on the stdio bridge's REST calls and on any keyless REST call) asks under the `ask` setting before a read as much as before a change, there is no read exemption, so all 115 are gated (`run_command` too, since the command it runs goes through the same call). `EXEMPT` is a new empty frozenset that `require_outside` honours; it is the place where a command would be taken out of the gate, and the manifest follows it. `mcp.transports` is `stdio` when `backend/app/mcp_stdio.py` exists (`./format mcp`) and `http` when the engine's app routes include `/mcp`. `skills` reads `.claude/skills`: format-driving (no sub-skills) and format-harness (12). `extensions` is null: FormAT hosts no form.ext extensions (no host API in the engine or the page). `dock` is the one declared value, `DOCK` in setup/agents.py, because it cannot be read from the page's code: the schema describes `present` as "the app has the family's agent dock", and FormAT has not; it has its own terminal dock (`frontend/src/ui/terminal-dock.ts`, a bottom panel toggled with the terminal key, whose tabs are the person's shells named Terminal 1, 2 and so on plus one read-only tab per chat for Claude's commands, and which has no position choice and no chat or claude tab), so `present` is false with no positions and no tabs. The truth lives in terminal-dock.ts and app/engine/terminal.py (`agent_session`); it will change in a later session. The importing of `app.main` for the route check creates no data folder (checked with an empty FORMAT_DATA_DIR). Run: sync wrote the file; formadaptor's checker accepted it; `--check` exited 0; in a copy outside the tree an `EXEMPT` entry and a renamed tool each made `--check` exit 1 naming agents/manifest.json; the engine from source on 29900 answered `tools/list` with the same 115 names in the same order and the same 42 read-only names. Counts: 115 tools, 42 read-only, 115 approval-gated, 2 skills (12 sub-skills). Documents: README states 114 engine commands, which is right; no document states 115, 42 or the skill counts; the wiki Agents.md and the usage line of `./format` now name the manifest.

### backend/app/engine/terminal.py · terminal tabs get the person's environment without the engine's secrets
- refers-to: app/engine/terminal.py `SECRET_NAME`, `engine_own_names`, `_env`; app/core/config.py `ENV_FILE_KEYS`; app/core/secrets.py `PROVIDERS`; app/core/window_key.py `STDOUT_ENV`; tests/test_window_key.py `test_a_terminal_tab_gets_the_persons_environment_without_the_engines_secrets`
- kind: fix
- logged: unreleased · 2026-11-18

`_env` used to hand every terminal `dict(os.environ)`, so a plain terminal tab could print the engine's provider keys, FORMAT_WINDOW_KEY_STDOUT and anything the engine's launcher had exported. A terminal is the person's own interactive shell (`-l`, their PATH, their tools), so it is not given the minimal environment of the bash tool (`bash_env`, an allow list); it gets the engine's environment minus a deny list. Chosen: deny list, because an allow list would take from the person the variables a shell is expected to have (SSH_AUTH_SOCK, NVM_DIR, VIRTUAL_ENV, JAVA_HOME, their own exports), which is the one thing the terminal is for. What a deny list cannot do is stop a secret under a name nobody listed, so the list is built from what the engine itself knows rather than typed once: the three provider variables (`secrets.PROVIDERS`), every name the engine loaded from backend/.env (`config.ENV_FILE_KEYS`, filled by the loader, so a key added to .env later is dropped with no edit here), the window key variable (`window_key.STDOUT_ENV`), every `FORMAT_*` name present (the engine's own settings and anything it set for itself: FORMAT_PORT, FORMAT_DATA_DIR, FORMAT_DESKTOP, FORMAT_PARENT_PID, FORMAT_DIST), and any name containing API_KEY, ACCESS_KEY, AUTH_KEY, PRIVATE_KEY, WINDOW_KEY, SECRET, TOKEN, PASSWORD, PASSWD, PASSPHRASE, CREDENTIAL or COOKIE (case-insensitive, with or without the underscore between words). FORMAT_TERMINAL and FORMAT_ENGINE_URL are set after the filter, as before, and `./format cli` reads the latter. Residual: a secret exported under a name that matches none of the above, and that the engine did not itself read or load, still reaches a terminal; and a variable of the person's own that matches the pattern (a GITHUB_TOKEN exported before launching the engine) no longer reaches it either, though a login shell reads the person's profile again and sets it if the profile does. The Claude Code route's child (`claude_code.child_env`) still passes the engine's environment minus CLAUDE* names; not changed here. Seen: engine from source on 29901 with FORMAT_WINDOW_KEY_STDOUT=1 and markers in ANTHROPIC_API_KEY, OPENAI_API_KEY, ELEVENLABS_API_KEY, MY_TOKEN, DB_PASSWORD, CLAUDE_CODE_OAUTH_TOKEN, ZZ_ORDINARY and ZZ_ODDNAME; a terminal opened with the key (terminal.open), attached over /api/terminal/{id} with a one-time ticket, `env | sort` printed 0 lines matching token, secret, api key, password or cookie and none of the first six markers, still had HOME, PATH, TERM, COLORTERM, FORMAT_TERMINAL, FORMAT_ENGINE_URL, ZZ_ORDINARY and (the limit above) ZZ_ODDNAME. Before the change the whole engine environment was handed over (the code was `dict(os.environ)`).

### backend/app/engine/agent_lookup.py, claude_code.py, setup/agents.py, .agents/mcp_config.json · the family's finder, four agent programs, Antigravity
- refers-to: app/engine/agent_lookup.py (whole file, version 1.0.1); app/engine/claude_code.py `PROGRAMS`, `OVERRIDES`, `child_env`, `located`, `cli`, `_answer`, `info`, `programs`, `status`, `run`; setup/agents.py `LOOKUP`, `LOOKUP_HASHES`, `lookup_problems`, `check`, `sync`, `install_antigravity`, `install`; .agents/mcp_config.json
- kind: feature
- logged: v0.28.0 · 2026-11-19

`app/engine/agent_lookup.py` is the Form family's finder for the agent programs, copied unchanged from FormVis (version 1.0.1, SHA-256 62667f9b68b7d101e1896ce617240424e33b7e498c560bc79d45f0ab26c77d51). It is never edited here: it changes only as a whole new version, and `setup/agents.py` holds the hash of each version (`LOOKUP_HASHES`, 1.0.0 and 1.0.1); `lookup_problems` reads `VERSION` from the file, hashes its bytes and names a file that was edited in place or is missing, and both `agents sync` and `agents sync --check` exit 1 on it. FormAT keeps engine code in app/engine, so the file lives there and not in a services folder. The finder looks, in order, at the override variable, the engine's PATH, the known install folders, and the person's shell PATH read once, then runs `--version` in the child environment, so a program is found however FormAT was started (a desktop app starts with a short PATH). Before, `cli` was `FORMAT_CLAUDE_BIN`, then `which("claude")`, then five folders under the home folder and three system paths; `CANDIDATES` and `SYSTEM_PATHS` are gone. FormAT has no path setting, so `find` gets no `setting` and the sentence ends "or set FORMAT_CLAUDE_BIN to its path" (`FORMAT_CODEX_BIN`, `FORMAT_CURSOR_BIN`, `FORMAT_ANTIGRAVITY_BIN` for the others). `child_env(path)` is now the finder's one environment (the program's folder first on PATH, CLAUDE* names other than `KEEP_ENV` left out, as before); the Claude Code chat run starts through `agent_lookup.start_argv` (the person's login shell on macOS and Linux) and refuses with the finder's sentence when the program is missing or does not start. `info` keeps its name, its 60 second cache and its three old fields (`installed`, `path`, `version`) and adds `finding` (runs, broken, missing), `how`, `looked`, `error`, `said`, `install`; `installed` is true only when `--version` ran. `claudecode.status` adds `programs`: the same answer for claude, codex, cursor and antigravity, each with `title` and `signedIn` (always null: only a failed run can tell). Claude Code is asked afresh on every status call as before; the other three use the finder's own keeping (a missing or broken answer is asked again after 60 seconds), so one status call does not start the login shell three more times. FormAT starts only Claude Code (chat); its terminal tabs are the person's shell and start no agent program, so there is no Codex, Cursor or Antigravity tab to add and none was added. `./format agents install` lists a fourth project file, `.agents/mcp_config.json` (Antigravity's workspace file, `serverUrl` to the engine's /mcp), and `--user` also writes `~/.gemini/config/mcp_config.json`: only the entry `format` (the launcher and `mcp`, like the Codex entry), every other server and key kept, written to a part file and renamed, not touched when already right, an entry named `format` that FormAT did not write left alone and said, an older `~/.gemini/antigravity-cli/mcp_config.json` left alone and said. Claude Code's user scope is now registered through the finder (`find`, `check`, `run`) and not a bare `which`. Seen on Linux with stand-in programs in a made-up home (engine PATH `/usr/bin:/bin:/usr/sbin:/sbin`, a stand-in login shell): `claudecode.status` reported all four as runs with path, version 1.2.3 and how=folder, and each stand-in was started once with `--version`; `agents install --user` wrote the Antigravity file beside an existing server and key (both kept), said "already lists Format" on the second run, and the stand-in claude received `mcp add --scope user --transport http format http://127.0.0.1:8490/mcp`; `agents sync --check` exit 0 (tools.md regenerated by `agents sync` for the new status description). Not run: the real Claude Code, Codex, Cursor or Antigravity (no real `agy` install has been seen, and nobody has checked that Antigravity accepts these two files); Windows; macOS; a frozen engine; a chat through the stand-in.

### backend/tests/conftest.py, tests/test_agent_lookup.py · the tests find only stand-in agent programs
- refers-to: tests/conftest.py `AGENT_STAND_INS`, `AGENT_CALLS`, `AGENT_SHELL`, `only_stand_in_agent_programs`, `pytest_sessionfinish`, `pytest_terminal_summary`; tests/test_agent_lookup.py
- kind: decision
- logged: v0.28.0 · 2026-11-19

The build machine has a real `claude` that a login shell finds, and the finder asks the login shell. So the whole test run is closed off, the way FormPath's conftest does it: the sandbox gets a `bin` folder with stand-ins named claude, codex, cursor-agent, agent and agy (each writes one line per start to `agent-calls.log` in the sandbox and answers `--version`), PATH becomes that folder plus `/usr/bin:/bin:/usr/sbin:/sbin`, SHELL becomes a stand-in shell that runs the script it is given with /bin/sh and reads no profile, the six variables the finder reads for install folders (`NPM_CONFIG_PREFIX`, `npm_config_prefix`, `PNPM_HOME`, `VOLTA_HOME`, `BUN_INSTALL`, `NVM_SYMLINK`) are removed, and an autouse fixture empties `agent_lookup.system_folders` so the machine's own `/usr/local/bin` and the like stay out. The engine a test starts as a process inherits the same environment. The stand-in shell takes any flag group ending in `c` (`-c`, `-lc`, `-ilc`) because the bash tool starts `$SHELL -lc`; FormPath's version, which reads `-l`, `-i` and `-c` one by one, made `test_the_bash_tool_gives_its_shell_no_secret_from_the_engine` fail here. The run ends with one line: how many times a stand-in was started and with what. Measured before the change with a decoy folder of my own first on PATH: the suite as it was (105 tests) started no agent program at all. The new file tests what was seen working: the hash record, the check's two sentences, the four programs in `claudecode.status` (found on PATH, version 0.0.0, started only with `--version`), the Antigravity file written beside other entries and left alone when it is not FormAT's, and the project file. Not on Windows: the stand-ins are shell scripts, so the guard is skipped there and the two tests that need them return at once.

### backend/format_engine.py · the engine starts without output streams
- refers-to: format_engine.py, the first lines
- kind: fix
- logged: v0.28.0 · 2026-11-19

A program built without a console on Windows starts with `sys.stdin`, `sys.stdout` and `sys.stderr` set to `None`, and anything that writes to them (uvicorn's log, a `print`, the window key line) raises. A tester's engine of another Form app stopped at start for this reason. `format_engine.py` is the file the packaging freezes as the engine (setup/freeze_backend), so its first lines, before any other import, replace each stream that is `None` with one opened on the null device, as FormWeb's entry does. Seen on Linux: `python format_engine.py >&- 2>&-` (both output streams closed, own port and data folder) answered `/api/health` with 200 and stayed up; started normally it printed its log as before (uvicorn's start lines and the health request). Not run on Windows, and not as a frozen engine.

### backend/app/core/startup.py, app/core/instance.py, format_engine.py · the engine starts and stops cleanly beside its app, the family's pattern fitted to FormAT's own lock
- refers-to: startup.py (whole file), instance.py :: holder, claim, release, format_engine.py :: start_log, watch_shell, serve, main
- kind: feature
- logged: unreleased, after v0.28.0 · 2026-11-19

`app/core/startup.py` is FormTools's file of the same name (its `origin/main`), copied with only the names at its top changed: `APP`, `NAMES` (`format`, the shell's `mainBinaryName`, and `FormAT`), `SHELL_ENV` `FORMAT_SHELL_PID`, `ALONE_ENV` `FORMAT_NO_SHELL`, `ERRORS_NAME` `format-engine-errors.log`. `PLACES` is unchanged: FormAT's engine is a sidecar beside the app's program in all three install layouts, which `.` covers.

What FormAT kept. Its lock stays an operating system lock on `engine.lock` (`instance.try_lock`, which the unpack folder marks also use), held for the life of the engine and waited on for 3 seconds. A lock of that kind cannot go stale, so the rows of the family's table that deal with a file nobody stands behind (no file, a damaged file, the engine's own id, an id nobody has, an id that was reused) are all one case here: a file nobody holds is taken whatever it says. `startup.claim` is therefore not called; `instance.claim` uses `startup.holder`, `startup.end`, `startup.created` and `startup.number`. What changed is what the holder writes and what a refused engine does. The holder writes the family's record (`pid`, `started`, `born`, `shell`, `shellBorn`) in place of the bare process id, with one space in front of it: on Windows the lock is on the file's first byte, which no other program can read, so `holder` reads the whole file first and, when that is refused, from the second byte, and from the second byte it accepts only a record. An engine that cannot take the file after the wait reads the record: when the holder's recorded shell is alive, or the holder recorded no shell (a development run), or the record cannot be read or names a process whose start time is not the recorded one, it refuses with the sentence FormAT already had and exit code 2, and ends nothing; when the recorded shell is gone it ends the holder (`startup.end`: SIGTERM, five seconds, SIGKILL; on Windows `taskkill /T /F`) and takes the file. A released engine wrote a bare process id with no time, so the table's last row applies to it: it is obeyed and never ended. That costs little here, because a released FormAT engine already leaves within half a second of its shell (`FORMAT_PARENT_PID`); only one that hangs is left, and that one needs the launcher's cleanup. `instance.release` empties the file and closes it; the file is never removed, because removing a file others may be waiting on would let two engines each hold a different file of the same name. After SIGTERM uvicorn ends the process by the signal, so the record can stay in the file: harmless, since the lock itself is gone with the process.

The watch. `watch_parent` and its own liveness test are gone; `watch_shell` gives `startup.watch` the process in `FORMAT_SHELL_PID`, else the one in `FORMAT_PARENT_PID` (the variable the released shell sets, still honoured), and `leave` logs a line, removes a one-file engine's unpack folder as before, releases the lock and exits 0. The old watch also left when its direct parent changed (a one-file engine's bootloader); that is kept by a second `startup.watch` on that parent when it is not the shell. The question is now asked every 2 seconds, not every half second.

Started alone. A frozen engine with neither variable set and without `FORMAT_NO_SHELL=1` opens the app beside it and exits 0, or says "format-engine is a part of FormAT and serves nothing on its own. Open FormAT instead." and exits 4; no lock is taken and nothing is served. `--selfcheck` is decided before any of this, so `setup/freeze_backend` is unaffected. Anything else that starts a frozen engine by itself must set `FORMAT_NO_SHELL=1` or `FORMAT_PARENT_PID`.

The log. FormAT's engine had no log file of its own (the shell keeps what the engine prints in its own `engine.log`). `start_log` now writes `Logs/format-engine.log` in the data folder (1 MB, two older files kept) for the `format` loggers, before the lock is asked for, and `startup.keep_errors` points an absent standard error at `Logs/format-engine-errors.log`. Because a logger with a handler no longer reaches Python's last-resort handler, a second handler keeps warnings and errors going to standard error as before; the lines the entry also prints itself (a refusal, the started-alone sentence, the error that ends the engine) carry `log_only` so they are not printed twice. A data folder that cannot be made is one sentence and exit code 5.

Seen on Linux with stand-in shells (`sleep 300`), own ports and data folders, the decoy agent programs first on PATH: a second engine exited 2 with the sentence while the first one's shell lived, the first kept answering `/api/health`, and the log held the refusal; when the stand-in shell ended the engine exited 0 within half a second to two seconds and the file was empty, under either variable; an engine stopped with `kill -STOP` whose shell was gone was replaced after 9.7 seconds (the 3 second wait, 5 seconds, SIGKILL; its exit was 137) and the log named it; files holding `not json at all`, `[1, 2]`, `{"pid": "x"}`, nothing and `424242` were taken; a record naming an unrelated `sleep` that held nothing was taken and the `sleep` kept running; the released engine (an archive of `origin/main`) holding the folder was obeyed by a new engine with a shell and by one without (exit 2 both times), kept serving, left when its own stand-in shell ended, and the new engine then took the folder; with all three streams closed the engine answered and both log files existed; the entry run with `sys.frozen` set and a stand-in app beside it exited 0, the stand-in ran in its own folder, no lock was taken and the port did not answer; with no app near it exited 4 with the sentence; with `FORMAT_NO_SHELL=1` it served; a data folder under a plain file gave the sentence and exit 5.

Not run: Windows and macOS, a really frozen engine, and every Windows line of `startup.py` (`_kernel`, `_open_windows`, `_alive_windows`, `_created_windows`, `_end_windows`, the handle branch of `watch`, `SetDllDirectoryW` and the detached flags in `open_app`). That a second program on Windows can read the record from the second byte while the first byte is locked has not been seen. `backend/tests/test_startup.py` was written from these behaviours.

### src-tauri/src/main.rs · a failed start says its sentence while a window is still there, and the shell's process id stays under the name it has
- refers-to: src-tauri/src/main.rs :: engine_failed, open_main (the `Err` arm of `built`), setup (the engine's start, unchanged); backend/tests/test_startup.py :: test_a_frozen_engine_started_by_the_released_app_serves_and_opens_nothing
- kind: fix
- logged: unreleased, after v0.28.0 · 2026-11-19

The two small things the engine's new start needs from the shell. Not compiled: the desktop shell cannot be built on the build machine. Not run on any system. Each line was read against what the file already uses (`tauri_plugin_dialog`'s `message` and `blocking_show`, `engine_failed`'s own signature, `tauri::Error` printed with `{err}`).

The shell's process id. The shell already starts the engine with `FORMAT_PARENT_PID` set to its own process id, and the engine reads that variable where `FORMAT_SHELL_PID` is absent (`format_engine.py :: serve`, `shell = startup.shell_pid() or parent_pid()`), records it in the lock, watches it, and takes the started-alone branch only when both are absent. So an engine of this version under the released shell, and under this one, is not taken for one started alone, and no line was added to the shell. Seen on Linux: the entry run with `sys.frozen` set, a stand-in app beside it and only `FORMAT_PARENT_PID` naming a stand-in shell served `/api/health`, wrote that shell into the lock, did not start the stand-in app, and left with exit 0 when the stand-in shell ended. The test named above was written from that.

The order. `engine_failed` hid the loading window, then showed its dialog (0.26.0 had already changed a close to a hide, see "the engine-failure dialog cannot be lost"). It now shows the dialog first and hides the loading window only after the dialog returns, the family's order: the sentence is on screen while the app still has a visible window. The path that still closed the last window without a word was a main window that fails to build: `open_main` closed the loading window and said nothing, and with no window left the app ends. That arm now calls `engine_failed` with "FormAT could not open its window" and the error, so it takes the same path: the dialog, then the loading window hidden, the engine stopped, exit code 1. `reveal::close_splash` is still used by `reveal::show_main`.

Held, the rest of the family's shell side: the Windows job object (`win_job.rs`; FormAT starts its engine through tauri-plugin-shell, which gives a process id and no `std::process::Child`, so it needs a `hold_pid` or the start moved to `std::process::Command`), `engine_start.rs`, and a limit on the wait for the engine's address, which has none. FormAT's failure dialog already carries the engine's last 40 lines, its exit code and the place of the shell's `engine.log`, so the engine's refusal of a second copy is read there in the engine's own words. Until the job object is in, an engine whose shell is ended by force is covered by the engine's own watch.

### backend/app/core/startup.py · a process that has ended but was not yet collected counts as gone where there is no /proc
- refers-to: app/core/startup.py :: finished, gone_by; backend/tests/test_startup.py :: test_a_process_that_ended_and_was_not_collected_counts_as_gone_where_there_is_no_proc, test_a_holder_whose_shell_is_gone_is_replaced_where_there_is_no_proc
- kind: fix
- logged: v0.30.0 · 2026-11-20

What was seen, in another app of the family. FormCut's macOS check failed with "could not stop an engine that was left running": `end` had ended the holder, but `gone_by` kept seeing it. `_alive_posix` asks `kill(pid, 0)`, which still answers for a process that has ended and whose parent has not collected it, and it tells such a process apart only by reading `/proc`, which macOS does not have. FormAT's `instance.claim` calls the same `startup.end` before it takes the lock of a holder whose shell is gone, so the same wait would run out here and the start would be refused with the "already running" sentence.

The change, FormCut's, carried by hand. `finished(pid)` asks `ps -o stat= -p <pid>` where there is no `/proc` (never on Windows, never on Linux) and answers true for a state that starts with `Z`. `gone_by` stops waiting when the process is not alive or is finished. `alive` itself is unchanged, so the two second watch on the shell starts no program.

Seen on Linux with `PROC` pointed at a folder that does not exist: both tests fail before the change (the second with the "already running" sentence naming the ended holder) and pass after it; with `/proc` back, `finished` answers false and the old reading still sees the ended process as gone. Not run on macOS.

### src-tauri/src/win_job.rs, engine_start.rs and main.rs · the engine ends with the app on Windows, and the wait for its address has a limit
- refers-to: src-tauri/src/win_job.rs :: hold_pid, end; src-tauri/src/engine_start.rs :: ADDRESS_WAIT, KEY_WAIT, overdue, sentence, message, SHELL_ENV; src-tauri/src/main.rs :: kill_backend, the setup's start and its wait loop; src-tauri/Cargo.toml and Cargo.lock :: windows-sys 0.61.2 under the Windows target
- kind: fix
- logged: v0.30.0 · 2026-11-20

What was held in 0.29.0 and is now in. FormAT still starts its engine through tauri-plugin-shell, so it takes FormVis's way: the start is not moved, and `win_job::hold_pid` opens the started process by its id and puts it in a job object that ends every process in it when the app's last handle to the job closes, so the engine ends with the app however the app ends (a crash, Task Manager). `kill_backend` ends the job first on Windows, then asks the plugin to kill the process as before. Only `windows-sys` is new, Windows only, at 0.61.2, the version 26 packages of the lock already use; the lock's one new line was proved by `cargo update --workspace` on a scratch copy with the old lock, whose diff with ours is empty.

The wait. Before, the shell waited for the engine's address without limit (0.27.0 had taken the old limit away because it was too short for a first start) and gave the key 10 seconds once the address was known. `engine_start::overdue` now gives the address 90 seconds from the start (the owner's decision for the family) and keeps the key's 10 seconds; while the window is not open the loop reads the plugin's channel without blocking, stops at once when the channel is closed, and ends the wait with a `Failure::TimedOut` that names how long it waited and for what.

The dialog keeps what FormAT's had: the engine's last 40 lines (the window key never among them), "engine exited" with its exit code, and the place of the shell's `engine.log`, which `engine_failed` adds. What came from the family's `engine_start.rs` is only what was missing: the sentence for a wait that ran out, "The engine wrote nothing before that." when it said nothing, and the busy sentence for exit code 2, the code the engine ends with when another copy holds its data folder. Any other end keeps "The FormAT engine failed to start. Please relaunch the app."

The variable. The shell still gives the engine its process id in `FORMAT_PARENT_PID` (`SHELL_ENV`), the name `format_engine.py` reads for its watch on the shell; it was not renamed to the family's `*_SHELL_PID`.

Proved here: the two files compile for x86_64-pc-windows-msvc in a scratch crate with no warning; `cargo test` there passes the 4 tests of `engine_start.rs` and 4 tests of the wait loop as written in `main.rs` (a closed channel ends the wait at once and keeps what was sent, a late line within the limit is read, a silent engine runs into the address limit, an engine that gave its address and no key runs into the key limit). The shell itself was not built and nothing ran on Windows.

### setup/freeze_backend.bat and setup/freeze_backend · the Windows engine is built with no console window unless FORMAT_ENGINE_WINDOWED is 0
- refers-to: setup/freeze_backend.bat :: the line after the winpty check; setup/freeze_backend :: the line after the ptyprocess check; format_engine.py :: the stream lines at its top
- kind: change
- logged: v0.30.0 · 2026-11-20

By the owner's decision for every app of the family, a Windows engine is packaged with no console window, as FormWeb's is. FormAT's freeze scripts had no switch, so the switch is new and on by default: a Windows build gives PyInstaller `--noconsole` unless `FORMAT_ENGINE_WINDOWED=0`. Unset, empty, `1` or anything else that is not `0`: no console. The batch file adds the flag to `OPTIONAL`, which already carries the extra modules, so the long PyInstaller line is untouched; the shell script adds it only where `ft_os` says windows (an MSYS or Git Bash build), so macOS and Linux builds do not change.

The entry file already replaces a missing stdin, stdout or stderr with the null device before anything else runs (wave 4), so `--selfcheck` and the start-up's own lines still work when a windowed engine has no streams; when the shell starts it, the plugin's pipes are its streams and the address and the window key still reach the shell. `--selfcheck` at the end of the batch file still returns its exit code. To get the old console build for a look at the engine's words, set `FORMAT_ENGINE_WINDOWED=0`. Checked with `bash -n` and, for the batch file, by reading; no Windows build has shown it.

### setup/agents.py :: install and docs/agents-and-mcp.md · the connect command and the setup wording name the four programs in the family's order
- refers-to: setup/agents.py :: install (the project file list and the line about --user); docs/agents-and-mcp.md :: Setting up an agent
- kind: change
- logged: v0.30.0 · 2026-11-20

`./format agents install` listed its project files as Claude Code, Cursor, Codex, Antigravity, and its line about `--user` named Codex, Antigravity and Claude Code and left Cursor out. Both now go Claude Code, Codex, Cursor, Antigravity, the order the family uses, and the `--user` line says that Cursor uses this folder's `.cursor/mcp.json` (the command writes no user file for Cursor). The setup guide's list and its "Everywhere" line follow the same order. The window's own sentence (Settings, Outside agents) already named all four in that order and is unchanged; FormAT carries no other language. Program paths: FormAT keeps no Preferences field or stored value for where Claude Code is; the place can only be given by `FORMAT_CLAUDE_BIN`, and `FORMAT_CODEX_BIN`, `FORMAT_CURSOR_BIN` and `FORMAT_ANTIGRAVITY_BIN` already exist beside it (app/engine/claude_code.py :: OVERRIDES), so there is nothing to add. Seen: the command's printed list with `sync` left out, and `sync --check` up to date.

### backend/requirements_macos.txt and tests/test_requirements_lists.py · macOS installs keyring
- refers-to: backend/requirements_macos.txt :: keyring==25.7.0; backend/oc_install :: the darwin branch; setup/freeze_backend and setup/freeze_backend.bat :: --collect-submodules keyring --copy-metadata keyring; backend/tests/test_requirements_lists.py; app/core/seal.py :: _load
- kind: fix
- logged: v0.30.1 · 2026-11-20

What failed. Both macOS builds of the 0.30.0 release run stopped at the freeze: PyInstaller's spec ran `copy_metadata('keyring')` and raised `PackageNotFoundError: No package metadata was found for keyring`. 0.27.0 added `keyring==25.7.0` to `requirements.txt` (for the seal in app/core/seal.py) and the freeze scripts name it, but `requirements_macos.txt` is a separate list kept by hand, `oc_install` installs from it when `OSTYPE` is darwin, and it never got the line. Linux (`oc_install`'s other branch) and Windows (`oc_install.bat`) install from `requirements.txt`, so they passed.

The change. `keyring==25.7.0` is in `requirements_macos.txt`, in the same place as in `requirements.txt`. Its own needs on macOS are the three jaraco packages, which pip brings; its macOS keychain backend needs no other package (`SecretStorage` and `jeepney` are for Linux, `pywin32-ctypes` for Windows).

Every install path, read on each system. `./format install` and `format_oc_install` run `setup/install_all`, which runs `backend/oc_install`: macOS from `requirements_macos.txt`, Linux from `requirements.txt`; `format.bat install` runs `setup/install_all.bat`, which runs `oc_install.bat`: `requirements.txt`. `install_desktop`, `install_voice` and `install_browser` (and their `.bat` twins) install `requirements_desktop.txt`, `requirements_voice.txt` and `requirements_browser.txt` on every system alike: there is no macOS twin of these three and no macOS branch, and what the freeze scripts take from them (playwright, faster_whisper, ctranslate2, onnxruntime, tokenizers, winpty) is taken only when installed. `build_app` and formcompiler's macOS setup both go through `./format install` and `./format install-desktop`. With the line in, every third-party module the engine imports (fastapi, starlette, uvicorn, httpx, httpx2, anyio, anthropic, mcp, mcp_types, python-docx, python-pptx, openpyxl, reportlab, segno, keyring, ptyprocess) comes from the list each system installs or from what its packages require, and the optional ones (playwright, faster_whisper, winpty) are imported only when present.

The test. `test_requirements_lists.py` reads both lists: every requirement of `requirements.txt` whose marker is not `sys_platform == "win32"` must be in `requirements_macos.txt` with the same extras and pin (markers aside: the macOS list needs none). It reads both freeze scripts for every name given to `--copy-metadata`, `--collect-submodules`, `--collect-data` and `--hidden-import` (the engine's own `app` aside), finds the distribution of each module from the installed metadata (docx is python-docx, multipart is python-multipart), and wants each in both lists; websockets and certifi come with uvicorn[standard] and httpx, and a fourth test proves from the installed metadata that they still do. Seen: with the test copied into a copy of origin/main, the first and third tests fail, naming keyring; on this branch all four pass.

What a person running the engine from source on macOS saw from 0.27.0 to 0.30.0: no error. `_load` imports keyring inside its try, so the import failed quietly, the seal was `unavailable`, the engine started, and the Outside agents choice stood as saved with no seal. Now keyring is there, the choice is sealed in the macOS keychain, and a saved Allowed that has no seal yet reads as Ask, with the window's sentence, until it is chosen again (read in `effective` and seen on Linux with a stand-in keychain in test_window_key.py; not run on a Mac).
