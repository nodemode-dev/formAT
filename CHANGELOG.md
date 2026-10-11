# Changelog

## 0.4.1 · 2026-10-11

Tools and approvals (DEV_PLAN Phase 4, second part).

- Claude can ask you a multiple-choice question; pick an option or type your own answer, and the reply continues.
- Claude keeps a plan as a checklist, shown in its step and in Outputs under Progress.
- Files Claude makes and sends appear as file cards with Download, and in Outputs with Download all.
- Outputs now lists what was used in the session: uploads, web searches and pages, commands, file changes.
- Engine: `tool.answer`, `tasks.get`, `outputs.list`; downloads at `/api/chats/{id}/files/{path}` and `/api/chats/{id}/outputs.zip`.
- Fixed: results of steps that do not stream (writing or editing a file) now show in their card.

## 0.4.0 · 2026-10-11

Tools and approvals (DEV_PLAN Phase 4, first part).

- Claude can use tools: run commands (bash) and read, write, edit and search files in the chat's own folder, and search and read the web (Anthropic's web search and web fetch). A reply keeps going through as many rounds of tools as it needs.
- Approvals: in Ask mode commands and file changes wait for you (Allow once, Always allow, Deny); Auto runs them; Plan never does and Claude describes the change instead. A declined call is reported to Claude and the reply continues.
- In the thread: the steps of a reply fold into one line ("Searched the web, wrote hello.py, and 1 more step"); each step opens to its input and output, command output streams live, search results are links.
- Settings: Tools (workspace tools, web tools, the always-allowed list).
- Engine: `tool.approve`, `tool.pending`; settings `webTools`, `workspaceTools`, `toolAllow`, `toolDeny`.
- Fixed: the context meter no longer moves the composer bar when it first appears.

## 0.3.3 · 2026-10-11

Chat on the Claude API (DEV_PLAN Phase 3, last part).

- Large attachments: images and PDFs of 1 MB or more are uploaded once through the Files API and referenced by id on every turn; smaller ones stay inline. Deleting a chat deletes its uploaded files.
- Long chats: when a chat reaches 75 percent of the model's context window (adjustable in Settings, Long chats), Claude summarizes the earlier messages after a reply and continues from the summary (compaction). The summary shows as a divider you can expand; earlier messages stay on screen. Also on demand: Summarize earlier messages in the command palette, or `chat.compact`.
- Engine: `chat.compact`; settings `autoCompact` and `compactAt`.
- Fixed: the context meter beside the model never showed (since 0.3.1).

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
