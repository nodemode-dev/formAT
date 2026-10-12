# HASHOUT_LOG · backend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the engine. Source files stay comment-free; everything they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.11.1
Last updated: 2026-10-12 · v0.11.1: ./build_app, one command for the desktop app, and the Rust toolchain fix for macOS

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
    │   ├── artifacts.py           artifact rows and versions: publish, list, get, delete
    │   ├── cmd_artifact.py        artifact.list, artifact.get, artifact.delete
    │   ├── cmd_files.py           files.list, files.read: the chat folder for the files pane
    │   ├── projects.py            projects, their knowledge files, the context a project chat receives
    │   ├── cmd_project.py         project.list, get, create, update, delete, addFile, removeFile; conversation.move
    │   ├── memory.py              the memory tool's six commands on data/memory, general or per project
    │   ├── cmd_memory.py          memory.list, read, write, delete
    │   ├── skills.py              skills in data/skills: parse, install, on and off, the skill tool
    │   ├── cmd_skill.py           skill.list, get, add, create, enable, delete
    │   ├── connectors.py          MCP servers: API route or engine route, sessions, tool calls
    │   ├── cmd_connector.py       connector.list, add, update, connect, delete
    │   ├── agents.py              outside-agent consent (ask, allowed, blocked), agents.status
    │   ├── schedules.py           scheduled tasks, the scheduler thread, run history, background.list
    │   ├── native.py              the optional wgpu renderer: native.status, terminal snapshots through its binary
    │   └── cmd_terminal.py        terminal.open, list, write, read, resize, restart, close
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
---

## app/routers/stream.py {#app-routers-stream}

### app/routers/stream.py · module name
- refers-to: app/routers/stream.py (file)
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

Named `stream`, not `events`: `app/routers/__init__.py` also imports `app.engine.events`, and a sibling module named `events` was shadowed by it, so the router list picked up the engine module and the engine failed to start.
