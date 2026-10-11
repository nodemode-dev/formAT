# Changelog

## 0.3.2 · 2026-10-11

Chat on the Claude API (DEV_PLAN Phase 3, third part).

- Branching conversations: Edit on any message you sent adds a new version and asks again from there; the earlier version and what followed it are kept. A pager under an edited message (previous, n / count, next) switches between versions.
- Engine: `chat.edit` takes `messageId` and branches instead of replacing; new `chat.branch`; `conversation.path` events; schema 3 (`conversations.leaf_id`), with older chats linked into a chain on first open.
- Math in replies with KaTeX: `$...$` and `\(...\)` inline, `$$...$$` and `\[...\]` as blocks. Prices such as "$5 and $10" stay text.
- The parity page regraded for v0.3.2 (38 percent).

## 0.3.1 · 2026-10-11

Chat on the Claude API (DEV_PLAN Phase 3, second part).

- Edit on the most recent message: the text returns to the composer with an editing bar, and sending replaces the message and its reply (`chat.edit`). Branching on edit comes later.
- Search by message text: the palette matches titles at once and, from three characters, message text through the engine, marking those chats "in messages".
- Code blocks coloured by highlight.js (common languages) through Format's `--ft-syn-*` tokens.
- Files pasted into the composer upload like picked ones.
- A context meter beside the model: the last turn's tokens against the model's context window.
- A keyboard shortcut sheet on Mod+/ and in the palette.
- The parity tracker's Format page grades the current build against claude.ai over 50 rows: v0.3.1 at 37 percent.

## 0.3.0 · 2026-10-11

Chat on the Claude API (DEV_PLAN Phase 3, first part).

- The harness: Format's system prompt with the person's name and preferences, every turn as content blocks (thinking passed back with its signature), attachments by kind (images, PDFs, text and code, zips unpacked into the workspace), effort clamped to the model, adaptive thinking with summaries, max tokens by effort, automatic prompt caching.
- Streaming replies rendered as Markdown block by block (headings, lists, tables, code with copy, links), thinking summaries, stop, retry, copy, and a queue above the composer.
- Models and their effort levels from `/v1/models`; a built-in list when no key works.
- Uploads (`POST /api/uploads`) with cards in the composer and chips on the message.
- Settings: account (name, response preferences, send key, dictation language) and API keys saved in Format or read from `backend/.env`.
- Dictation: browser speech recognition, or recording plus engine transcription (local faster-whisper or OpenAI).
- Outputs is a floating card; the terminal dock has Hide.
- Engine commands: `chat.send`, `chat.stop`, `chat.retry`, `chat.wait`, `keys.status`, `keys.set`, `keys.clear`, `account.get`, `account.set`; `models.list` now reads the API.

## 0.2.1 · 2026-10-11

- Narrow windows (760 px and below): the open sidebar is a drawer over the page, the side panel takes the full width, and the main area keeps its column.

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
