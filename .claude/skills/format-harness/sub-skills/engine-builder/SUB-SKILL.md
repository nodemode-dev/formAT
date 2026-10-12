---
name: engine-builder
description: "Building Format's Python engine: adding or changing @command functions, events, the SQLite store and its schema, the tool loop, the harness that builds Claude API requests, providers, routers, the MCP server and agent_guide names, and ./format agents sync. Load before editing anything under backend/."
---

# Engine builder

## Purpose

Change the engine so every door (window, CLI, MCP) gets the change at once and nothing else moves. Hands back the change, its verification, and its HASHOUT entry.

## Preconditions

Read `backend/HASHOUT_LOG.md` for the files you will touch. The mock API and the engine can be restarted (kill only with the anchored pattern `pkill -f "^venv/bin/python -m uvicorn"`).

## Procedure

1. **A feature is a command.** Add `@command(id, label, params, mutates, description)` in the matching `cmd_*.py` (or a feature module listed in `COMMAND_MODULES` in `backend/app/routers/__init__.py`). Params carry type, required, enum and a description; the description says what it returns and what to call next. Raise `CommandError(message, status)` with a message that names the next command.
2. **Name it for agents.** Add the command to `GUIDE` in `backend/app/agent_guide.py`: a verb_noun tool name and one sentence starting "Use when". Then run `./format agents sync`, which regenerates the tool references and the `.agents/skills` mirror.
3. **State and events.** Persist through `store` (bump the schema number in `store.conn` when adding tables, with `CREATE TABLE IF NOT EXISTS` so old databases upgrade in place). Publish an event for every change the window shows.
4. **Requests to Claude.** Only `backend/app/harness/` builds API requests; only `backend/app/providers/` talks to the API.
5. **Edits.** Single-region hand edits; near-zero comments; the rationale goes in the HASHOUT log with refers-to, kind and logged lines.
6. **Verify.** Exercise the command through `POST /api/commands/[id]` against the mock API; for MCP-visible changes, through the MCP Python SDK client over HTTP and stdio.

## Gate

- The command works through REST and the CLI, appears as a tool with its guide name, and the sync output is clean.
- No scripted edit touched a repo file, and the HASHOUT entry exists.

## Hands back

The change, the command output that proves it, and the log entry.

## Owned resources

- `references/architecture.md` the registry, events, harness and tool loop sections
- `references/command-map.md` existing ids, so a new one fits the pattern
