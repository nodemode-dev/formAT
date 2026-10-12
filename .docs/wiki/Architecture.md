# Architecture

```
 window (frontend/, Vite, vanilla TS)          agents (Claude Code, Codex, Cursor)        ./format cli
        |  POST /api/commands/{id}                   |  MCP /mcp or ./format mcp                |
        |  WS /api/events                            |                                          |
        +--------------------------------------------+------------------------------------------+
                                       |
                   engine (backend/, FastAPI on 127.0.0.1:8490)
                   command registry  ->  engine modules  ->  SQLite (WAL) + data/ + workspace/
                                       |
                    Claude API (official SDK, harness/ builds every request)
```

## One command registry

Every action is a function decorated with `@command(id, title, params, description=...)` in `backend/app/engine/` (`cmd_*.py` and the feature modules such as `documents.py`, `devices.py`, `plugins.py`, `browser.py`). The registry serves three surfaces the same way:

- REST: `POST /api/commands/{id}` with a JSON body, answering `{ok, command, result}` or `{ok: false, error}`.
- CLI: `./format cli <id> key=value ...` (`setup/cli.py`).
- MCP: `backend/app/mcp_server.py` makes a tool per command, named by `backend/app/agent_guide.py`.

A module joins the registry by being listed in `COMMAND_MODULES` in `backend/app/routers/__init__.py`.

## Events

Changes are published with `events.publish(type, **fields)` and streamed to every window on `WS /api/events` with a sequence number. The window patches only what changed. Event types follow `noun.verb`: `conversation.created`, `message.delta`, `tool.approval`, `skills.changed`, `plugins.changed`, `browser.frame` and so on.

## State

The engine owns all state:

| Where | Holds |
| --- | --- |
| `data/format.db` (SQLite, WAL, schema 8) | conversations, messages (a tree by `parent_id`), artifacts and versions, projects, connectors, schedules and runs, shares, `meta` key-values (settings, tasks, outputs) |
| `data/` folders | uploads, memory, skills, plugins, exports, snapshots, the browser profile, the pairing secret, saved keys |
| `workspace/chats/<id>` | each chat's own folder for Claude's tools |

The window keeps only view state, and layout state (sidebar, panel, terminal, side track) as data attributes on `documentElement`, set before first paint by the boot script in `index.html`.

## The request path

`chat.send` stores the message and starts `chat._run` on a thread. `_run` asks `harness.build` for the request (system prompt, project instructions, skills list, tools, effort, thinking, caching, compaction), streams the reply through the provider adapter, publishes deltas, and runs tool calls in the same message (`tools.run`), waiting on approvals when the permission mode says so. The whole multi-round reply is one message with `tool_result` blocks inline; `harness.api_messages` splits it for the API.

## Optional parts

| Part | Turned on by | Module |
| --- | --- | --- |
| Local dictation | `./format install-voice` | `engine/voice.py` |
| Built-in browser | `./format install-browser` | `engine/browser.py` |
| Native renderer | `./format native build`, `FORMAT_NATIVE=1` | `engine/native.py`, `native/format-render` |
| Other devices | Settings, Other devices | `engine/devices.py` (second server on 8492) |
