# Changelog

## 0.10.0 · 2026-10-12

Closing the parity gaps, first part.

- Find in page: Mod+F (or the palette) finds text in the open chat or page, highlights every match, steps through them with Enter and Shift+Enter, and opens a folded tool group when a match is inside it.
- Research: the + menu's Research turns on Research mode for the next messages (a pill beside the microphone turns it off). Claude plans the questions, searches and reads many sources, and writes a cited report; replies show "research" in their footer.
- Sandboxed code: Claude's commands run in a sandbox where only the chat's folder is writable, your home folder and Format's data are hidden, and there is no network unless you allow it (Settings, Tools). Linux uses bubblewrap, macOS sandbox-exec; Windows runs commands unsandboxed and says so.
- Engine: `sandbox.status`; `chat.send` `research`; settings `sandbox` and `sandboxNetwork`. 75 commands.

## 0.9.0 · 2026-10-12

Agent kits (DEV_PLAN Phase 9).

- Format's MCP tools are named for agents: `send_message`, `wait_for_reply`, `publish_artifact`, `list_conversations` and so on, each described by what it does and when to use it, ending with its engine command id. Errors name the tool to call next. The v0.7 names (`chat_send` and the rest) still answer.
- Two skills ship in the repo: `format-driving`, for an agent using a running Format (ask Claude in Format, draft and save artifacts, terminals, schedules), and `format-harness`, the orchestrator for changing and releasing Format with twelve specialists. Both pass the skill validator with no failures or warnings and carry evaluations and trigger tests.
- `./format agents sync` regenerates the tool and command references from the engine and mirrors the skills to `.agents/skills` for Codex; `./format agents install --user` also registers Format with Codex and Claude Code for every folder.
- Codex: the repo now has `.codex/config.toml`, read once you trust the project. AGENTS.md covers the skills and the MCP server.
- In a fresh Claude Code session in this repo, "draft a reply in Format and save it as an artifact" (with the message to reply to) loaded format-driving and called send_message, wait_for_reply and publish_artifact in that order on the first try.

## 0.8.0 · 2026-10-12

The native renderer (DEV_PLAN Phase 8).

- `native/format-render` draws a terminal's screen on the GPU through wgpu (Metal, Vulkan, Direct3D 12 or OpenGL): colours, 256 and true colour, inverse, dim, box drawing and the cursor, in JetBrains Mono. It is optional and off unless you build it (`./format native build`, needs Rust) and start Format with `FORMAT_NATIVE=1`.
- `terminal.snapshot` returns a picture of any terminal's current screen, for agents and checks; `native.status` says whether the renderer is built and on and which GPU it uses (also in Settings, About). `./format native info` prints the adapter and `./format native window` opens the renderer's demo window.
- The terminal in the window stays the browser one: measured under 4x CPU it printed 200,000 lines in about 4 seconds with frames mostly on time, so it does not need replacing.
- Fixed: the files pane's title no longer moves when a preview opens, and the artifact header fix of 0.7.1 no longer touches the files pane.
- Engine: `native.status`, `terminal.snapshot`. 74 commands.

## 0.7.1 · 2026-10-12

Scheduled tasks and background work (DEV_PLAN Phase 7, second part).

- Scheduled: give Claude a prompt to run every hour, every day, on weekdays, every week, once at a set time, or only when you press Run now, optionally inside a project. Each run is a new chat, listed with its status on the task's page; pause, edit and delete tasks there. Runs happen while Format is open; a run missed while it was closed runs once when it opens.
- Background: a button in the top bar counts the chats that are working or waiting for you (amber when one waits) and lists them with their scheduled task, how long they have run, and Stop.
- The terminal dock has a read-only Claude tab where every command Claude runs, and its output, appears live. New terminal (+) moved beside Restart and Hide.
- Chats started in the background (scheduled runs, outside agents) join the sidebar at your next click or key press, so the list never moves while you read it.
- Fixed: the artifact's Preview and Code tabs no longer move when a second version arrives.
- Engine: `schedule.list`, `schedule.get`, `schedule.create`, `schedule.update`, `schedule.delete`, `schedule.run`, `background.list`; `chat.send` `title`; terminals report their kind. 72 commands.

## 0.7.0 · 2026-10-12

Format for coding agents (DEV_PLAN Phase 7, first part).

- Format is an MCP server: while it runs, Claude Code, Codex, Cursor and other agents on this computer reach it at `http://127.0.0.1:8490/mcp`, or start `./format mcp` over stdio. Every engine command is a tool with read-only, destructive and idempotent hints; chats (as Markdown) and artifact pages are resources; three prompts cover asking Claude, publishing a page and summarizing a chat. This repo ships `.mcp.json` for Claude Code and `.cursor/mcp.json` for Cursor; the README has the Codex lines.
- The first time an agent calls, the window asks whether to let outside agents use Format; Settings, Outside agents changes it (Ask me, Allowed, Blocked) and lists the agents seen.
- Agents can publish artifacts into a chat; an open Artifacts page shows them as they arrive.
- The terminal dock has Restart: a fresh shell in the same tab and folder.
- Engine: `agents.status`, `artifact.publish`, `terminal.restart`; setting `outsideAgents`. 65 commands.

## 0.6.2 · 2026-10-12

Connectors (DEV_PLAN Phase 6, last part).

- Connectors: add MCP servers on the Customize page by URL (with a token if needed) or by command. A public https server reaches Claude through Anthropic's MCP connector; a server on your computer or network, or one started by a command, is run by Format and its tools ask before running in Ask mode, with Always allow.
- Each connector's page lists its tools to turn on or off, with Reconnect and Remove; the + menu's Connectors turns connectors on and off.
- Connector calls show as steps in the reply ("Used weather, testlocal connector") and are counted in Outputs.
- Engine: `connector.list`, `connector.add`, `connector.update`, `connector.connect`, `connector.delete`; the MCP Python SDK is a new dependency (run the installer again). 62 commands.

## 0.6.1 · 2026-10-12

Memory and skills (DEV_PLAN Phase 6, second part).

- Memory: turn on Settings, Memory, Let Claude remember across chats, and Claude keeps notes with Anthropic's memory tool that carry from one chat to the next. Chats outside projects share one memory; each project has its own. Read, change, add and delete memory files in Settings.
- Skills: Customize lists your skills (folders with a SKILL.md); add one as a .zip or SKILL.md, or write one there, turn each on or off, and open it to read it. Claude sees the skills that are on and loads one when a task matches; the + menu's Skills puts one in your message.
- Deleting a project now also deletes its memory.
- Engine: the memory tool; `memory.list`, `memory.read`, `memory.write`, `memory.delete`; the skill tool; `skill.list`, `skill.get`, `skill.add`, `skill.create`, `skill.enable`, `skill.delete`; setting `memory`. 57 commands.

## 0.6.0 · 2026-10-12

Projects (DEV_PLAN Phase 6, first part).

- Projects: give a project a name, instructions and knowledge files; every chat in it receives the instructions and the files. The Projects page lists your projects; a project shows its chats, its instructions and its files.
- New chat in this project starts a chat inside it; a project chat shows the project in the top bar, and the title menu's Move to project puts any chat in a project or takes it out. Deleting a project keeps its chats.
- Fixed: a streaming reply in a new, short chat no longer shifts its text slightly as each paragraph finishes.
- Engine: `project.list`, `project.get`, `project.create`, `project.update`, `project.delete`, `project.addFile`, `project.removeFile`, `conversation.move`; `chat.send` `projectId`. 47 commands.

## 0.5.1 · 2026-10-12

Artifacts and outputs (DEV_PLAN Phase 5, last part).

- Files pane: the folder button in the top bar lists every file in the chat's folder and previews images, PDFs, video, audio, Markdown, code and HTML beside the chat. A file card's name, a file in Outputs and a comment card open it too. A file Claude changes while it is open updates in place.
- Comments: hover a block in a Markdown preview, or select text in Markdown or code, and comment on it. Comments join your next message as chips, show above it as cards, and reach Claude with the passage quoted.
- Chats show a dot in the sidebar while a reply runs, and a steady one while an approval or question waits for you.
- Files served from a chat's folder are sandboxed, so an HTML or SVG file opened in a tab cannot run scripts on Format's origin.
- Engine: `files.list`, `files.read`, the `files.changed` event, `chat.send` `comments`, `conversation.list` `activity`. 39 commands.

## 0.5.0 · 2026-10-11

Artifacts (DEV_PLAN Phase 5, first part).

- Claude can publish a page, an app or a small tool as an artifact. It shows in the reply as a card; Open puts it beside the chat, where it runs, and the version picker, Code view, Copy, Download and Pop out sit in its header.
- Revisions are new versions of the same artifact; every card opens the version it published, and an open artifact follows to a new version while you are on the latest.
- Artifacts run sealed off from Format and your files. They load scripts and fonts from the common CDNs; anything else from the internet only with Settings, Tools, Artifacts can load images and data from the internet.
- The Artifacts page lists every artifact with its chat and versions; a row opens it, and its menu goes to the chat or deletes it.
- Engine: `publish_artifact`; `artifact.list`, `artifact.get`, `artifact.delete`; the page at `/api/artifacts/{id}/v/{n}`; setting `artifactNetwork`. 37 commands.

## 0.4.2 · 2026-10-11

Tools and approvals (DEV_PLAN Phase 4, last part).

- Sub-agents: Claude can hand a separable piece of work to a sub-agent with the same folder and tools; its steps show nested under its card, its commands and file changes ask like any other, and its report comes back to Claude.
- Settings, Tools: how many sub-agents one reply may use (Off to 10) and which model they run on.
- Engine: `spawn_agent`; settings `agentLimit`, `agentModel`.

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
