# Changelog

## 0.1.0 · 2026-10-11

The scaffold (DEV_PLAN Phase 1).

- Engine: FastAPI on 127.0.0.1:8490 with a command registry (`/api/commands`), a WebSocket event stream (`/api/events`), a SQLite store, and the first commands: `app.info` and `conversation.create`, `list`, `get`, `rename`, `pin`, `delete`.
- CLI: `./format cli list`, `describe`, and any command with `key=value` parameters.
- Window: the family's Studio Dark sheets and theme boot, hidden scrollbars everywhere, and a boot frame that reports the engine, the event stream, the Anthropic key and the command count.
- Native: `native/format-render` on wgpu 30, to the family standard.
- Launcher, install, boot, build, serve, doctor and clean scripts for macOS, Linux and Windows (`.\format.bat`).
