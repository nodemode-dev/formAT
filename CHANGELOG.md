# Changelog

## 0.2.0 · 2026-10-11

The shell (DEV_PLAN Phase 2).

- Sidebar with New chat, Projects, Artifacts, Scheduled, Customize and More, Pinned and day-grouped recents (rename, pin, delete in place), folding to a mini rail with Mod+B and remembered across reloads.
- Chat view: the greeting and a centred composer when empty, the composer docked under the thread in a conversation, scroll-to-bottom.
- Composer: + menu (files, Skills, Connectors, Research), model menu with Effort (Low to Max), Extended thinking and More models, permission mode (Ask, Auto, Plan), attachment cards. Sent messages are stored; replies arrive in v0.3.0.
- Outputs side panel and a terminal dock with tabs running real login shells (xterm 6 over engine PTYs), both collapsible.
- Command palette (Mod+K) and Projects, Artifacts, Scheduled, Customize and Settings pages.
- Engine: `terminal.open`, `list`, `write`, `read`, `resize`, `close`; `message.add`; `models.list`; `settings.get` and `settings.set`.

## 0.1.0 · 2026-10-11

The scaffold (DEV_PLAN Phase 1).

- Engine: FastAPI on 127.0.0.1:8490 with a command registry (`/api/commands`), a WebSocket event stream (`/api/events`), a SQLite store, and the first commands: `app.info` and `conversation.create`, `list`, `get`, `rename`, `pin`, `delete`.
- CLI: `./format cli list`, `describe`, and any command with `key=value` parameters.
- Window: the family's Studio Dark sheets and theme boot, hidden scrollbars everywhere, and a boot frame that reports the engine, the event stream, the Anthropic key and the command count.
- Native: `native/format-render` on wgpu 30, to the family standard.
- Launcher, install, boot, build, serve, doctor and clean scripts for macOS, Linux and Windows (`.\format.bat`).
