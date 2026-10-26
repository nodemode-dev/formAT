# Changelog

## 0.24.9 · 2026-10-26

- A test suite checks the engine's guard, its MCP server and relay, the request it sends to the API, chat branches, edits and retries, tool approvals, artifact pages and share links, the other-devices gate, commands from the window, the command line and MCP, and opening older databases; it runs on every change. Nothing in the app changes.

## 0.24.8 · 2026-10-26

- The desktop release build keeps its symbols, since macOS builds fail on a stripped binary.

## 0.24.7 · 2026-10-25

- A web page can no longer reach the engine through an image or a link.

## 0.24.6 · 2026-10-25

- The engine answers only this computer's own Format window and agents. A web page open in a browser can no longer reach Format's terminals, chats or files.

## 0.24.5 · 2026-10-25

- The window installs with no known vulnerable dependency: markdown-it 15.0.3 (a slow parse of some inline HTML and link definitions) and Vite 8.3.5 for the dev server.

## 0.24.4 · 2026-10-24

- The copyright holder in LICENSE, NOTICE.md and the README is NodeAgentc, Inc.
- Settings > About carries the credit "by nodemode.ai".

## 0.24.3 · 2026-10-23

- Local dictation in the desktop app uses PyAV 18.1.0 built against an LGPL FFmpeg 8.0.3 instead of the PyPI wheel, which carries GPL codecs; `av` is pinned, which also fixes dictation on installs that had picked up `av` 19.
- The desktop engine leaves out reportlab's font folder, and the installers carry LICENSE and NOTICE.md.
- NOTICE.md lists everything the desktop release bundles: faster-whisper, CTranslate2, onnxruntime, PyAV and its FFmpeg (with the source offer), Playwright's driver, KaTeX's fonts, certifi, the Pillow libraries and the desktop shell crates.

## 0.24.2 · 2026-10-23

The README, the desktop bundle's description and the agent notes describe Format by its features instead of as claude.ai's layout; the trademark notice is unchanged. No change to the app itself.

## 0.24.1 · 2026-10-22

Checks and releases move to GitHub Actions and formcompiler.

- The repository's GitHub Actions now run basic checks (frontend, backend and scripts) on main, on pull requests and on `compile_vX.Y.Z` branches.
- Releases are built by formcompiler (`nodemode-ai/formcompiler`) and published on its release page as `format-vX.Y.Z`.
- The updater now reads formcompiler's `format-updates` feed.
- Engine: no change. There is no change to the app itself.

## 0.24.0 · 2026-10-20

A new app icon.

- The orange terminal frame is gone. Format's icon is now a smiling chat bubble with a sparkle, in the form family's blue, violet, pink and amber on the dark tile, in the Dock, the taskbar, the browser tab and the starting screen.
- On macOS the icon sits inside the standard margin with a soft shadow, like the system's own apps; small sizes use a heavier, simpler mark so it stays readable at 16 px.
- Engine: no change.

## 0.23.0 · 2026-10-18

Attachments you can see.

- Files you add show as tiles, in the composer at once and above your message once sent: a picture for images and SVG, a video's first frame and length, a waveform and length for audio, the first lines of text and code, and the name and type for PDFs, zips and other files.
- Click a tile to open it full screen: images fit the window (click for full size), video and audio play, Markdown renders, code is coloured, PDFs open in their own viewer, and long text shows its first 2 MB. The arrow keys move between a message's files, Esc closes, and the download button saves the original.
- The composer labels files the same way the sent message does (SVG, MD, PY, ZIP 2).

## 0.22.0 · 2026-10-18

Cited answers, drawn the way the Claude API writes them.

- An answer from a web search or an attached document is no longer broken into a paragraph per claim: the API sends each claim as its own text block, and Format now joins them into one flow.
- Each claim backed by a source ends in a chip: the site's name (a link) or the document's title and page. Hover it for the source's title and the quoted passage. More than two sources fold into "+N". Chips appear while the reply streams; Copy leaves them out.
- Redacted thinking no longer prints a bare "redacted thinking" note.
- The streaming caret shows only on the reply's last text, not also on a paragraph before a search.
- An inline sum or integral in math no longer nudges what follows it when its font arrives.

## 0.21.1 · 2026-10-18

Fixes from a whole-app audit: every view at 1920, 1280, 1100, 760, 390 and 360 px had no overflow, no visible scrollbars and no errors.

- Opening a chat on a slow connection moved the composer late, after the chat loaded; it now moves at the click.
- Clicking Your or Discover under Skills or Connectors also reset Plugins to Your plugins and cleared every tab's highlight.
- Skills Discover no longer shows "No skills to discover yet." before its skills arrive.
- A plugin connector's status no longer shifts when its Add button goes away.
- In Customize, a longer status message no longer pushes the list down: the message line is two lines tall, and hovering a cut-off message shows all of it.

## 0.21.0 · 2026-10-18

The rest of skills, connectors and plugins.

- Skills: Your skills and Discover. Discover lists the skills your marketplaces offer, added one at a time, with Add Anthropic's skills marketplace (anthropics/skills). Skills group under Created by you, From Anthropic and partners, From marketplaces and From plugins.
- Skills: Add, Create with Claude and a skill's Edit with Claude start a chat where Claude writes or changes the skill and saves it when you approve.
- Connectors: Your connectors and Discover, a directory of 24 remote servers by category, each with a link to the maker's page its URL came from. Connect adds it and opens its sign-in.
- Connectors reach Claude Code too when Format answers through it, with Blocked tools kept out.
- Plugins: zip-download, npm and command sources (a command is shown and runs only after Run and add); private GitHub marketplaces with an access token; `owner/repo@branch`; .plugin uploads; Anthropic's reserved marketplace names refused unless the repository is Anthropic's.
- Fixed: a SKILL.md description written as a YAML block showed a leading ">".
- Engine: `skill.discover`, `skill.installFrom`, `connector.directory`; `marketplace.add` `token`, `plugin.install` `confirm`, `chat.send` `output` `skill`; Claude's `save_skill` tool in those chats. 112 commands.

## 0.20.0 · 2026-10-18

Make your own plugins.

- Add, then Create a plugin: an editor with a name, a description and the plugin's files. Plugins made here have Edit files in their "..." menu.
- Add, then Create with Claude: a new chat where Claude writes the plugin in the chat folder and adds it to Format when you approve its card; ask for changes and approve again to replace it.
- In the / menu a plugin's skills and commands read `/plugin:name`; type the plugin's name and a colon to narrow to it. `/plugin:name` in a message loads that skill.
- Engine: `plugin.create`, `plugin.files`; `chat.send` `output` `plugin`; Claude's `add_plugin` tool in those chats. 109 commands.

## 0.19.0 · 2026-10-18

Plugins from marketplaces.

- Plugins has Your plugins and Discover. Add, then Add marketplace, takes a Git repository (URL or owner/repo) or a folder with .claude-plugin/marketplace.json; Discover lists its plugins with Add.
- Each marketplace has Check for updates (updates the plugins installed from it, keeping their connectors and on or off state), Sync automatically for repositories (hourly while Format runs), and Remove in its "..." menu, which removes its plugins too.
- A plugin's page has Skills, Commands, Connectors and Agents tabs. Adding a plugin no longer adds its connectors: each shows Connected, Not connected or Not added, with Add or Connect.
- Plugins come from a folder in the marketplace or from github, url and git-subdir sources; archive, npm and command sources are not installed.
- Engine: `marketplace.list`, `marketplace.add`, `marketplace.update`, `marketplace.sync`, `marketplace.remove`, `plugin.install`, `plugin.addConnector`; plugins report `servers`, `commandSkills`, `agents`, `hooks` and `origin`. 107 commands.

## 0.18.0 · 2026-10-18

Connector sign-in, and connectors per chat.

- Add custom connector has Authentication: Sign in when needed (the default), Sign in now, or No sign-in. With sign-in, Format registers itself with the server or uses your own OAuth client ID and secret, opens the server's sign-in page in your browser, and connects when you approve.
- A connector waiting for sign-in shows Sign in on its row and page; one whose sign-in stopped working shows Reconnect. Tokens refresh on their own; Disconnect signs out.
- Advanced, Transport: Streamable HTTP or SSE (a URL ending in /sse picks SSE).
- + then Connectors has a switch per connector for this chat only; in a new chat the switches apply to the chat your first message starts.
- Engine: `connector.signin`, `conversation.setConnector`; `connector.add` `auth`, `oauthClient`, `clientId`, `clientSecret`, `transport`; `chat.send` `connectorsOff`; the callback `GET /api/connectors/oauth/callback`. 100 commands.

## 0.17.0 · 2026-10-18

Customize, reworked for use.

- On a window 1100 px or wider the list stays on the left and the skill, connector or plugin you open shows beside it, with its row marked; each side scrolls on its own. With nothing open, the right side says to pick one. Narrower windows keep a page per item with Back.
- Skills and plugins have Enabled switches in their rows and on their pages.
- Delete (skills) and Remove (plugins) moved into the page's "..." menu, like connectors, and ask once more with a red button before they act. A plugin's skill points you to its plugin.
- Skills are grouped: Created by you, then From plugins; search hides a group with no matches.
- Fixed: a long skill name no longer squeezes into a column of letters beside the page's buttons.

## 0.16.0 · 2026-10-18

Connector pages like claude.ai's.

- Each connector tool is Always allow, Needs approval or Blocked, set one by one or for all tools on the connector's page. Always allow runs it with no card, Needs approval asks in the chat, Blocked keeps it from Claude. Public servers start on Always allow, local ones on Needs approval; old turned-off tools become Blocked.
- A public server with a tool on Needs approval, or with request headers, is run by Format so the approval can wait for you.
- Always allow on a connector's approval card sets that tool to Always allow on its connector.
- A connector's page has a status chip, Disconnect or Connect, and a "..." menu with Reconnect and Remove; a disconnected row shows Connect.
- Add custom connector takes request headers.
- Engine: `connector.update` `toolPermissions`, `connector.add` `headers`; connectors report each tool's `permission`.

## 0.15.0 · 2026-10-18

The / menu and Customize, closer to claude.ai.

- Type / anywhere in a message for the command menu: commands (add files, Research, a document, spreadsheet or slides, Summarize earlier messages, Manage skills), your skills, and each plugin's commands under its name. It filters as you type, including by plugin name; Up and Down, Enter or Tab, Escape.
- A picked skill is a pill in the composer and a chip on the sent message, and loads for that turn. The + menu's Skills adds the same pill.
- Customize has a column of Skills, Connectors and Plugins with counts, a search box and Add actions in each (Upload a skill, Write a skill, Add custom connector, Upload plugin).
- A skill's page lists SKILL.md and every other file beside a viewer, and Try in chat starts a chat with it picked.
- Fixed: skills were listed inside the Plugins section once a plugin was installed.
- Engine: `skill.read` (name, path). 98 commands.

## 0.14.1 · 2026-10-18

Zero overflow.

- A long command no longer makes the step, the approval card and the rest of the reply wider than the chat, and the chat never scrolls sideways. Commands, paths, links, code lines, diffs and table cells wrap; the approval question takes its own line and its buttons wrap under it.
- On phone-width screens the app is exactly the screen's width: the composer's model and mode shrink, and the context meter and effort label are hidden under 480 px. The Outputs panel fits narrow screens.
- The streaming caret no longer takes a line of its own under a code block, so nothing moves when a reply finishes.

## 0.14.0 · 2026-10-18

Allow for this chat.

- Approval cards have Allow for this chat: every tool in that chat (any file, any command, through the API or Claude Code) runs without asking until you turn it off, while other chats keep asking. Approvals already waiting in the chat run at once.
- The permission menu shows Allow for this chat, checked while it is on, to turn it off; the mode button reads Chat allowed in amber.
- Always allow now names what it remembers (commands, edits, file writes, the browser, a connector tool), so it no longer reads as one file.
- Engine: `conversation.allowAll` (`id`, `on`); conversations carry `allow_all`. 97 commands.

## 0.13.0 · 2026-10-18

A chat that reads and behaves like claude.ai.

- Drag files from your desktop and drop them anywhere on the chat; a card shows while they are over it. In the desktop app, Tauri's own drop handler is off so the page receives them.
- Type `/` in an empty message to pick a skill; a message that starts with `/name` or says "use the name skill" loads that skill for the turn, through the API and through Claude Code. Chats answered through Claude Code now see Format's skills.
- Auto is now Allow all (it always ran every tool), shown amber when on. Approval cards gain Allow all, which switches to it and lets anything already waiting run.
- The reply is followed to the bottom while it streams, approval cards and highlighted code included; scroll up and it stays put.
- Your messages sit on the right; edits show as a red and green diff; thinking is a quiet row instead of a box.
- Engine: `tools.allow_waiting`; `settings.set` `permissionMode` `auto` allows waiting approvals; `skills.invoked` and `skills.invocation_blocks`.

## 0.12.0 · 2026-10-12

No API key needed: Format answers through Claude Code.

- With no Anthropic API key set and Claude Code installed and signed in, Format runs each reply through Claude Code on your Claude plan, in the chat's own folder, streaming text, thinking and tool steps into the chat. The composer and the sidebar say "through Claude Code".
- Claude Code's tools show as Format's cards; Ask, Auto and Plan apply (in Ask, its commands and file changes wait for Allow once, Always allow or Deny in the chat); its questions use Format's question card; its sub-agents show nested; Stop ends the run.
- Each reply continues the chat's Claude Code session, and editing an earlier message branches from that point.
- The model menu has Answer through: Automatic, Anthropic API key or Claude Code.
- Engine: `claudecode.status`; `settings.set` `chatEngine` (auto, api, claude-code); `keys.status` reports `claude-code`; `FORMAT_CLAUDE_BIN`. 96 commands.

## 0.11.1 · 2026-10-12

One command builds the desktop app.

- `./build_app` in the Format folder builds the desktop app start to finish on macOS and Linux: it checks Python, Node and the Xcode command line tools, installs Rust with rustup if needed, installs the engine, the window and the desktop packages, freezes the engine and builds the app. On macOS it also makes the `.dmg` and installs Format.app in Applications, ready to open. `--open`, `--no-install`, `--install` (Linux) and `--clean`; everything is logged to `build_app.log`. `./format desktop build` runs the same thing.
- Fixed: the macOS build stopping with `can't find crate for phf_macros`. Builds now always use rustup's stable Rust, even with Homebrew's `rust` installed, ignore Rust wrapper and flag overrides from the environment, clean old build output when the compiler changes, and retry once after a Rust compile error.
- Setup messages no longer point at commands in another folder.

## 0.11.0 · 2026-10-12

The desktop app.

- Format is a desktop app for macOS (Apple silicon and Intel), Windows and Linux, built on Tauri 2 the way formlit and formvis are: a splash while the engine starts, then the Format window. Python, the engine, the window, the built-in browser's package and local dictation are inside the app. Data lives in the platform's app-data folder; the engine's log is in the app's log folder.
- In the app, links to other sites and Open link open in your default browser, downloads and exports go to your Downloads folder with a short "Saved" notice, the microphone asks once, and on macOS your login shell's PATH is used so Homebrew tools and `npx` are found.
- The Browser pane offers Install the browser when Chromium is missing (the desktop app's first run), and the page is now drawn at the pane's own size, sharp on high-density screens, instead of a shrunken 1280 px page.
- Artifact pages and HTML previews without a background of their own now show on white in Safari's engine (the desktop app on macOS and Linux) as they already did in Chrome; they showed dark text on the dark panel.
- `./format install-desktop`, `./format freeze`, `./format desktop dev|build` (and the `.bat` forms on Windows). A GitHub workflow builds all four platforms on a `v*.*.*` tag and drafts a release; unsigned macOS builds are signed ad hoc.
- Engine: `browser.install`; `browser.act` `resize`; `browser.status` reports `installed` and `installing`; `files.save_download`; `app.info` `desktop`; `FORMAT_DESKTOP`, `FORMAT_DIST`. 95 commands.

## 0.10.5 · 2026-10-12

Dictation on stronger speech models.

- Settings, Account has a Dictation engine: Automatic, ElevenLabs Scribe v2, local Whisper large-v3-turbo, OpenAI, or the browser's speech recognition. Automatic uses Scribe v2, then local Whisper, then OpenAI, whichever is set up, and falls through to the next if one fails; the browser only when Format has none. The microphone's tooltip names the engine.
- Settings, API keys has an ElevenLabs key for Scribe v2.
- Local dictation now uses Whisper large-v3-turbo, and `./format install-voice` downloads it during the install (about 1.6 GB) instead of on the first dictation. If your `backend/.env` still sets `FORMAT_WHISPER_MODEL=base` from an older example, change it to `large-v3-turbo` or remove the line.
- Transcription no longer holds up the rest of Format while it runs.
- Engine: `/api/voice/transcribe` takes `engine`; `/api/voice` lists the engines in order with their models; `account.set` `voiceEngine`; `keys.set` takes `elevenlabs`; `FORMAT_SCRIBE_MODEL`, `FORMAT_ELEVENLABS_URL`.

## 0.10.4 · 2026-10-12

Phase 10: the parity grade and the docs.

- The manual, in `docs/`: getting started, chatting, tools and approvals, artifacts and documents, projects, memory and Customize, the built-in browser, other devices, the terminal and scheduled tasks, agents and MCP, settings, shortcuts and troubleshooting.
- The developer wiki, in `.docs/wiki`: architecture, the engine, the window, agents and skills, checks and releasing. `BRANCHING.md` says how changes reach `main`.
- README: the ports table now lists the other-devices listener and the MCP endpoint, and links the docs.
- Dictation: when the local speech model cannot be downloaded or loaded, Format now says so (with what to do) instead of failing with a server error, and uses OpenAI instead when that key is set.

## 0.10.3 · 2026-10-12

Closing the parity gaps, fourth part: plugins and the built-in browser.

- Plugins: Customize now starts with Plugins. Add a Claude plugin as a .zip of its folder; its skills and commands appear under Skills (named after the plugin) and its MCP servers under Connectors. Turn a plugin on or off as a whole, open it to see its parts, or remove it with everything it added.
- Built-in browser: the globe in the top bar opens a Browser pane beside the chat. Type a URL, click and type on the page, scroll, go back. Claude can use the same browser (it asks first in Ask mode) when a task needs clicking through a site or filling a form, and you watch it happen in the pane. Sign-ins made there stay in Format. Install it with `./format install-browser`; Settings, Tools can turn Claude's use of it off.
- Engine: `plugin.list`, `plugin.get`, `plugin.add`, `plugin.enable`, `plugin.delete`, `browser.status`, `browser.open`, `browser.act`, `browser.close`; Claude's `browser` tool; setting `browserTools`. 93 commands.

## 0.10.2 · 2026-10-12

Closing the parity gaps, third part: share links and other devices.

- Share: the artifact panel's Share button makes a read-only link to the latest version, with Copy link, Open link and Stop sharing. A stopped link answers "no longer shared".
- Other devices (Settings): open Format to your network, scan the code with your phone (or open the link on another computer) and carry on there. Paired devices see the same chats live, both ways; unpaired ones get a "not paired" page. Forget paired devices unpairs them all; closing stops listening. Format listens on the network only while this is on.
- On a phone-width window the sidebar starts closed and closes when you pick a chat.
- Engine: `devices.status`, `devices.start`, `devices.stop`, `devices.forget`, `artifact.share`, `artifact.unshare`, `artifact.shares`; schema 8 (shares). New dependency segno for the pairing code (run the installer again). 84 commands.

## 0.10.1 · 2026-10-12

Closing the parity gaps, second part: documents, spreadsheets and slides.

- The + menu has Create: Document, Spreadsheet or Slides for the next message. Claude answers with that artifact beside the chat.
- Documents are written section by section (an outline first, then each section) and update in place as you watch. Hover a section and Comment on it; the comment goes to Claude with your next message, which revises that section.
- Slides show one at a time with arrows, keyboard and Present (fullscreen). Spreadsheets show as a grid.
- Export from the panel: documents to Word, PDF or Markdown; spreadsheets to Excel or CSV; slides to PowerPoint or PDF.
- Engine: Claude's `write_document` tool; `artifact.write`, `artifact.export`; `chat.send` `output`. New dependencies python-pptx, python-docx, openpyxl, reportlab (run the installer again). 77 commands.

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
