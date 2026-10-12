# Format architecture

## Contents

- Processes and ports
- The command registry
- Events
- The harness and providers
- The tool loop
- Stores and folders
- Features by module
- The window
- The MCP server and outside agents
- The native crate
- Verification setup

## Processes and ports

The engine is FastAPI on `127.0.0.1:8490` (`FORMAT_PORT`), started by `./format backend` or with the window by `./format`. The window is Vite on `localhost:5490` in development (strict port, `host: false`, `/api` and its WebSockets proxied) and `npm run preview` on 5491 for the built bundle; `./format serve` serves the build from the engine. Data lives in `backend/data` (`FORMAT_DATA_DIR`): `format.db` (SQLite, WAL, schema 7), uploads, chat folders under `workspace/chats/[id]`, memory, skills, snapshots.

## The command registry

`backend/app/engine/commands.py` holds `@command(id, label, params, mutates, description)`. `dispatch(id, params)` validates types, required fields and enums, then calls the function. Every action is one command, and the same object serves `POST /api/commands/[id]` (the window), `./format cli [id] key=value` (`setup/cli.py`), and the MCP server. `catalogue()` lists them; `routers/__init__.py` imports every `cmd_*` module in `COMMAND_MODULES`, which is what registers them. Errors are `CommandError(message, status)`; messages say what to call next.

## Events

`engine/events.py` publishes to every WebSocket on `/api/events`, thread-safe through the bound loop. The window patches state from events (`message.delta`, `message.block`, `message.completed`, `conversation.created`, `artifact.changed`, `schedule.changed`, `terminal.opened`, `agents.consent` and the rest) rather than refetching.

## The harness and providers

`backend/app/harness/` is the only place a Claude API request is built: the system prompt (Format's instructions, the person's preferences, project instructions, skills list), content blocks (images, PDFs, text, zips, Files API uploads of 1 MB or more, comments on files), effort and thinking, prompt caching, compaction blocks, betas, MCP connector fields. `backend/app/providers/` holds one adapter per provider; Anthropic through the official SDK is the main one.

## The tool loop

`engine/chat.py` `_run` streams one reply and, round by round, executes client tools from `engine/tools.py` inside the same assistant message (`tool_result` blocks inline; `harness.api_messages` splits them for the API). Tools: bash, read, write, edit, glob, grep in the chat's folder; web search and fetch passed through to the API; ask_user, task_list, send_file, spawn_agent (sub-agents run inside the parent's call), publish_artifact, memory, skill, and `mcp__[connector]__[tool]` for engine-run connectors. Approvals follow the permission mode (Ask, Auto, Plan) and `toolAllow`; `tools.wait_for_approval` blocks the run until `tool.approve` or `tool.answer`. Every bash command is mirrored into the read-only Claude terminal.

## Stores and folders

Tables: conversations (with `leaf_id` for the visible branch), messages (`parent_id` tree, `meta` JSON with status, usage, tool states, attachments, comments), artifacts and artifact_versions, projects and project_files, connectors, schedules and schedule_runs, meta (schema version). `store.rows`, `store.row`, `store.run` wrap one locked connection.

## Features by module

| Area | Engine | Window |
| --- | --- | --- |
| Chat, branches, compaction | `cmd_chat.py`, `chat.py`, `cmd_message.py` | `chat-view.ts`, `composer.ts`, `markdown.ts` |
| Tools and approvals | `tools.py` | `tool-cards.ts` |
| Artifacts | `artifacts.py`, `cmd_artifact.py`, `routers/files.py` (CSP) | `artifact-panel.ts`, `views.ts` (gallery) |
| Chat files | `cmd_files.py` | `files-pane.ts` |
| Projects | `projects.py`, `cmd_project.py` | `projects-view.ts` |
| Memory, skills | `memory.py`, `skills.py` and their `cmd_` modules | `memory-panel.ts`, `customize-view.ts` |
| Connectors | `connectors.py`, `cmd_connector.py` | `customize-view.ts` |
| Scheduled tasks, background | `schedules.py` | `scheduled-view.ts`, `background-panel.ts` |
| Terminals | `terminal.py`, `cmd_terminal.py`, `routers/terminal_socket.py` | `terminal-dock.ts` |
| Outside agents | `agents.py`, `mcp_server.py`, `routers/mcp_http.py`, `mcp_stdio.py`, `agent_guide.py` | consent sheet in `app.ts`, Settings in `views.ts` |
| Native renderer | `native.py` | About in `views.ts` |

## The window

Vanilla TypeScript and Vite. `app.ts` builds the shell (sidebar, top bar, centre pages, side track, dock) and routes engine events. State is `state/app-state.ts` with small topics (`emit('messages')` and so on). Layout state (sidebar open or rail, side panel, terminal) sits on `documentElement` data attributes set before first paint. Styles: the family's vendored Studio Dark sheets unchanged, plus Format's `ft-*.css`; overlays live in `#overlay-root` at `--z-menu` and above. Lists are keyed maps of nodes moved with `insertBefore` only where order differs; hidden toggles check first; streaming promotes the live tail into the finished block so nothing is re-rendered.

## The MCP server and outside agents

`mcp_server.py` builds a lowlevel MCP server from the catalogue: a tool per command, named and described for agents by `agent_guide.py` (verb_noun names, a sentence on what and one on when, command ids in errors rewritten to tool names), plus `run_command`; resources for chat transcripts and artifact pages; three prompts. It is served at `/mcp` (Streamable HTTP, an explicit route) and over stdio by `./format mcp` (a proxy to the running engine with header `x-format-agent`). `agents.require` applies setting `outsideAgents` (ask, allowed, blocked); ask publishes `agents.consent` and waits for the window. `./format agents sync` regenerates the tool references and the `.agents/skills` mirror.

## The native crate

`native/format-render` (wgpu 30): `Gpu`, `budget`, `native_start` (FORMAT_NATIVE), and a terminal glyph grid (vt100 screen, fontdue atlas from bundled JetBrains Mono, one full-screen shader). Its binary answers `info` and `snapshot` in JSON; the engine's `native.py` calls it for `native.status` and `terminal.snapshot`. A winit window example sits behind the `window` feature. The window's own terminal stays xterm in the browser.

## Verification setup

Checks run outside the repo: a mock of the Anthropic streaming API (scenarios chosen by words in the prompt, such as toolrun or artifactrun), Playwright scripts against the preview on 5491 with 4x CPU throttling and a slowed network, measuring layout shift (with sources), removed nodes, visible scrollbars and page errors, plus API scripts using the MCP Python SDK. The real-API runs are recorded separately in the planning sidecar's BUILD_NOTES.
