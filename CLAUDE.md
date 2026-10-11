# Format

A.T, the Agentic Terminal: a chat and agent workspace on the Claude API with claude.ai's layout and flow, in the form family's Studio Dark design. Vanilla TypeScript and Vite frontend, Python and FastAPI engine, a Rust crate on wgpu where needed, Tauri 2 shell from v0.7.0.

## Repo layout notes

- The engine owns all state. Every action is a command registered with `@command` in `backend/app/engine/cmd_*.py` and dispatched the same way by the window (`POST /api/commands/{id}`), the CLI (`./format cli <id> key=value`) and, from v0.7.0, the MCP server. Changes publish events on `/api/events` (WebSocket); the window patches what changed.
- `frontend/src/styles/` holds the family's vendored Studio Dark sheets unchanged (`tokens.css`, `scrollbars.css`, `fonts.css`, `shell.css`, `dialogs.css`, `light-mode.css`) beside Format's own `ft-*.css` (`ft-` classes). Colours and z-index come from tokens only.
- `native/format-render` is the family-standard wgpu crate; nothing depends on it until a measured need.
- `backend/app/harness/` is the only place a Claude API request is built (system prompt, content blocks, effort, thinking, caching); `backend/app/providers/` holds one adapter per provider. Chat runs through `chat.send`, `chat.stop`, `chat.retry` and `chat.wait`; keys through `keys.set`, `keys.clear`, `keys.status`.
- Terminals are engine PTYs (`backend/app/engine/terminal.py`): the window's dock attaches over `WS /api/terminal/{id}`, and `terminal.write` and `terminal.read` let the CLI and agents use the same shells. Layout state (sidebar, panel, terminal) lives on `documentElement` data attributes set before first paint.
- Planning documents (DEV_PLAN, BUILD_NOTES, UI_STUDY, PARITY_BASELINE, the root HASHOUT_LOG) ship in the planning sidecar zip, not in this tree. The living logs `frontend/HASHOUT_LOG.md` and `backend/HASHOUT_LOG.md` are in the tree: read them before editing.
- On Windows the launcher is `.\format.bat`; a bare `format` outside the repo is the system disk formatter.

## Skills

From v0.9.0: `format-harness` (the orchestrator for using and building Format) and `format-driving` (driving Format over MCP). Until then, follow this file and the HASHOUT logs.

## Laws

Single-region hand edits only (no sed, patch, git apply or scripted edits), zero DOM flash or re-render (verify under 4x CPU and slow network), no visible scrollbars anywhere, no emoji, no em dash in markdown, no icon-library dependencies, z-index only through tokens, near-zero comments with rationale in the HASHOUT logs, `v*.*.*` versions, Conventional Commits as `nodemode-ai <mackin@nodemode.ai>`.
