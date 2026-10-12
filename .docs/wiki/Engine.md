# Engine

Python 3.12, FastAPI, in `backend/app`.

## Adding a command

1. Write the function in the right module with `@command("noun.verb", "Title", {params}, mutates=..., description="...")`. Parameters are JSON-schema-like dicts; `required: True` marks required ones. Raise `CommandError(message, status)` with a message that says what to do next.
2. If the module is new, add it to `COMMAND_MODULES` (and its router, if any, to `ROUTERS`) in `routers/__init__.py`.
3. Add the command to `GUIDE` in `agent_guide.py`: its MCP tool name (verb_noun) and a "Use when" sentence.
4. Run `./format agents sync` to regenerate the skills' tool and command maps.
5. Add the rationale to `backend/HASHOUT_LOG.md`.

## Modules

| Module | Owns |
| --- | --- |
| `core/config.py` | ports, folders, version |
| `engine/commands.py`, `events.py`, `store.py` | the registry, the event bus, SQLite |
| `engine/cmd_chat.py`, `chat.py` | sending, the reply loop, stop, retry, edit, branch, compact, wait |
| `harness/`, `providers/` | building Claude API requests; one adapter per provider |
| `engine/tools.py` | tool definitions, approvals, executors, the per-chat folder |
| `engine/sandbox.py` | bubblewrap or sandbox-exec around bash |
| `engine/artifacts.py`, `documents.py` | artifacts and versions; documents, sheets, decks, exports |
| `engine/projects.py`, `memory.py`, `skills.py`, `connectors.py`, `plugins.py` | projects, memory, skills, MCP connectors, plugins |
| `engine/schedules.py` | scheduled tasks on a scheduler thread |
| `engine/terminal.py` | PTY terminals and the Claude tab |
| `engine/devices.py` | the LAN server, pairing, share links |
| `engine/browser.py` | the built-in browser on its worker thread |
| `engine/voice.py` | transcription |
| `mcp_server.py`, `mcp_stdio.py`, `agent_guide.py` | Format as an MCP server |

## Tools for Claude

A tool is a definition in `tools.DEFINITIONS` (or added conditionally in `tools.definitions`, like the browser), a branch in `tools.run`, and, if it never needs approval, membership of `READ_ONLY`. Tools unsafe for sub-agents go in `AGENT_EXCLUDED`. The window describes each tool's step in `frontend/src/ui/tool-cards.ts` (`describe` and `ICON`).

## Settings

Defaults are in `cmd_settings.DEFAULTS`; booleans are validated in `set_`; names allowed in `toolAllow` and `toolDeny` are `TOOL_NAMES` plus connector tools.

## Threads

The reply loop, the scheduler, terminal readers and the browser worker are threads; anything that touches the event loop goes through `events.publish` (thread-safe) or `run_coroutine_threadsafe` on the loop bound at startup. Playwright's sync API stays on the browser's own worker thread.
