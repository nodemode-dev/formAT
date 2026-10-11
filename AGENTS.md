# AGENTS

Instructions for coding agents (Codex, Cursor, Claude Code) working in this repository. `CLAUDE.md` is the full guide; the essentials:

- Engine first: a feature is a command in `backend/app/engine/cmd_*.py`; the window and the CLI only dispatch. `./format cli list` shows them.
- Boot with `./format`; the engine is `127.0.0.1:8490`, the window `localhost:5490`.
- Read `frontend/HASHOUT_LOG.md` or `backend/HASHOUT_LOG.md` before editing that side, and update it in the same change.
- Edit existing files with single-region hand edits; no scripted or patch-applied edits.
- No visible scrollbars, no layout shift, no re-render of a live container; z-index from `--z-*` tokens only.
- No emoji; no em dash in markdown; no new tests unless the owner asks.
- Commits: Conventional Commits, author `nodemode-ai <mackin@nodemode.ai>`.
