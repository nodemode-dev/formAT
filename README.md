<h1 align="center">Format</h1>
<p align="center"><b>A.T, the Agentic Terminal: the claude.ai way of working, on your own Claude API key, in the form family's Studio Dark design.</b></p>
<p align="center">
<img src="https://img.shields.io/badge/version-0.11.0-f97316" alt="version 0.11.0">
<img src="https://img.shields.io/badge/node-22-339933" alt="node 22">
<img src="https://img.shields.io/badge/python-3.12-3776AB" alt="python 3.12">
<img src="https://img.shields.io/badge/license-Apache--2.0-lightgrey" alt="Apache 2.0 license">
</p>

## What it is

Format is the form family's chat and agent workspace for the Claude API. It follows claude.ai's layout and flow (a sidebar that folds to a mini rail, a centred conversation, a composer with the + menu, model and effort, a collapsible side panel for artifacts and files, a real terminal) and wears the family's design. The Anthropic API is its main engine; OpenAI and Cursor plug in behind the same provider adapter. Every action is one engine command, reachable the same way from the window, the CLI, the terminal and an MCP server for Claude Code, Codex and Cursor.

Format is not affiliated with Anthropic and uses none of its logos, fonts or styles.

**Status.** v0.10 closes the gaps to claude.ai and adds the manual. v0.10.0: find in page (Mod+F), Research mode, and Claude's commands in a sandbox. v0.10.1: documents written section by section with comments, spreadsheets and slides beside the chat, exported to Word, Excel, PowerPoint and PDF, and the Create picker. v0.10.2: share links for artifacts, and other devices: pair your phone with a QR code and carry on there, live. v0.10.3: Claude plugins in Customize, and a built-in browser that Claude can use and you can watch and take over. v0.10.4: the manual in `docs/`, the developer wiki in `.docs/wiki`, and `BRANCHING.md`. v0.10.5: dictation with ElevenLabs Scribe v2 or local Whisper large-v3-turbo, chosen in Settings, Account. v0.11.0: the desktop app for macOS, Windows and Linux. The manual starts at [docs/README.md](docs/README.md). v0.9.0 shipped the agent kits: MCP tools named and described for agents, the `format-driving` and `format-harness` skills for Claude Code and Codex, `./format agents sync|install`, and Codex's project config. v0.8.0 added the optional native renderer: a Rust crate on wgpu that draws a terminal's real screen on the GPU, for `terminal.snapshot` (a picture of any terminal for agents) and a demo window, off unless built and turned on with `FORMAT_NATIVE=1`; the window's terminal stays the browser one, which measured fast enough. v0.7.1 added scheduled tasks (a prompt Claude runs hourly, daily, on weekdays, weekly or once, each run a chat with its history on the Scheduled page), a Background list of everything working or waiting for you, and a read-only Claude tab in the terminal dock where Claude's commands run live. v0.7.0 made Format an MCP server for coding agents (Claude Code, Codex, Cursor) over HTTP and stdio, with a consent prompt in the window, and adds Restart to the terminal dock. v0.6.2 added connectors: MCP servers by URL or command, public ones through Anthropic's MCP connector and local ones run by Format with approvals, with their tools turned on and off on the Customize page. v0.6.1 added memory (Anthropic's memory tool on a local folder, general or per project, editable in Settings) and skills (SKILL.md folders on the Customize page, loaded by Claude when a task matches). v0.6.0 added projects: instructions and knowledge files shared by every chat in a project, a Projects page, and Move to project. v0.5.1 added the files pane: every file in a chat's folder, previewed beside the chat (images, PDFs, video, audio, Markdown, code, HTML), with comments on a block that go to Claude with your next message, and activity dots on chats that are working or waiting for you. v0.5.0 added artifacts: Claude publishes pages, apps and small tools that open beside the chat in a sandbox, with versions, code view, download and pop out, and an Artifacts page that gathers them from every chat. Since v0.4 Claude has tools: commands and files in each chat's own folder, and web search and fetch, with approval cards (Ask, Auto, Plan) and claude.ai's one-line summary of the steps; Claude can ask you questions, keep a plan as a checklist, hand you files as download cards (all gathered in the Outputs panel) and hand work to sub-agents whose steps show nested. It also chats with Claude, branches a conversation when you edit any message (with a pager between versions), summarizes long chats so they keep going (compaction), sends large files once through the Files API, searches chats by their text, colours code and renders math. The engine's harness turns what you type and attach into a Claude API request (system prompt with your preferences, effort, thinking, prompt caching, images, PDFs, code and zips) and streams the reply into a Markdown view that renders each finished block once. Models and their effort levels come from your key's `/v1/models`. Around it: the sidebar that folds to a mini rail (Mod+B), the composer with the + menu, model, effort and permission menus, Stop and a queue, dictation, a floating Outputs card, a terminal dock with real shells (Hide or Mod+J), a command palette (Mod+K), and Settings for your account and API keys.

| Shortcut | Does |
| --- | --- |
| Mod+B | sidebar open or rail |
| Mod+K | command palette |
| Mod+J | terminal dock |
| Mod+. | side panel |
| Mod+Shift+O | new chat |
| Mod+U | add files |

Mod is Cmd on macOS and Ctrl elsewhere. Inside the terminal the shell keeps its own Ctrl keys.

**Stack.** Vanilla TypeScript 7 and Vite 8 · Python 3.12 and FastAPI · Rust (wgpu 30) for the optional native renderer · Tauri 2 for the desktop app, with the engine frozen by PyInstaller.

## Desktop app

Format is also a desktop app for macOS, Windows and Linux (Tauri 2, with the engine frozen inside): open it and it runs, no Python or Node needed. Get the bundles from the desktop workflow on GitHub, or build your own with `./format install-desktop` and `./format desktop build`. See [docs/desktop-app.md](docs/desktop-app.md).

## Quick start

Requirements: Node 20.19 or newer (22 recommended), Python 3.12 or newer, git. ffmpeg on the PATH for video and audio, Rust stable for the native crate.

```bash
./format_oc_install          # engine venv, frontend packages, backend/.env from the example
./format                     # engine on 127.0.0.1:8490, window on http://localhost:5490
./format cli list            # every engine command
./format doctor              # toolchain, installs, key and ports
```

Add your Anthropic key in Settings > API keys (stored in the data folder, owner-only), or put it in `backend/.env` as `ANTHROPIC_API_KEY=...` (the install copies `backend/.env.example` there). A key saved in Settings takes precedence; remove it there to fall back to `.env`.

Dictation transcribes with ElevenLabs Scribe v2 (add an ElevenLabs key), local Whisper large-v3-turbo (`./format install-voice`) or OpenAI, in that order, or the browser's own speech recognition in Chrome, Edge and Safari; Settings, Account picks one.

On Windows run `.\format.bat` from this folder, never a bare `format`: outside this folder that name is Windows' disk formatter.

## Ports

| Service | Address | Notes |
| --- | --- | --- |
| Engine | `127.0.0.1:8490` | FastAPI; `FORMAT_PORT` overrides |
| Window (dev) | `localhost:5490` | Vite, `host: false`, strict port, proxies `/api` and `/api/events` |
| Window (preview) | `localhost:5491` | `npm run preview` of the build |
| Other devices | `0.0.0.0:8492` | only while Settings, Other devices is on; paired devices and `/s/` share links |
| MCP for agents | `127.0.0.1:8490/mcp` | Streamable HTTP; `./format mcp` serves the same over stdio |

## Commands

| Command | Does |
| --- | --- |
| `./format` or `./format boot` | engine and window together |
| `./format install` | engine venv and frontend packages |
| `./format install-voice` | optional local speech to text for dictation: faster-whisper and the Whisper large-v3-turbo model |
| `./format install-browser` | optional built-in browser that Claude can use and you can watch |
| `./format install-desktop` | PyInstaller, the browser and dictation packages, and the Rust and Tauri checks for the desktop app |
| `./format freeze` | freeze the engine into the desktop app's sidecar (`src-tauri/binaries`) |
| `./format desktop dev`, `./format desktop build` | run the desktop app, or bundle it (.app and .dmg, .msi and setup.exe, .deb, .rpm and AppImage) |
| `./format cli chat.send text="..."` then `chat.wait conversationId=...` | chat from the terminal or an agent |
| `./format backend`, `./format frontend` | one side only |
| `./format build`, `./format serve` | build the window, serve it from the engine |
| `./format cli <command> key=value ...` | run any engine command; `list` and `describe <command>` explore them |
| `./format doctor`, `./format clean [--all]` | check, tidy |
| `./format mcp` | Format as an MCP server over stdio, for agents that start servers themselves |
| `./format agents [sync\|install [--user]]` | regenerate the agent tool reference and the `.agents/skills` mirror; install also registers Format with Codex and Claude Code |
| `./format native [build\|info\|window]` | the optional wgpu renderer: build it (needs Rust), show its GPU, open its demo window; start Format with `FORMAT_NATIVE=1` to use it |

## Use Format from coding agents

While Format runs, it is an MCP server at `http://127.0.0.1:8490/mcp` (Streamable HTTP), and `./format mcp` serves the same over stdio. Every engine command is a tool named for agents (`send_message`, `wait_for_reply`, `publish_artifact`, `list_conversations`, ... and `run_command` for any command id), described by what it does and when to use it, with read-only, destructive and idempotent hints; chat transcripts and artifact pages are resources; three prompts cover asking Claude, publishing a page and summarizing a chat. The first time an agent calls a tool, the window asks whether to allow outside agents (Settings, Outside agents, changes it later).

- Claude Code: this repo's `.mcp.json` adds the server (Claude Code asks once before using a project server), and `.claude/skills/` brings two skills: `format-driving` for using Format, `format-harness` for changing it.
- Cursor: this repo's `.cursor/mcp.json`.
- Codex: this repo's `.codex/config.toml`, read once you trust the project, and the skills mirrored in `.agents/skills/`.
- Everywhere: `./format agents install --user` adds Format to `~/.codex/config.toml` and, when Claude Code is installed, to its user scope.

`./format agents sync` regenerates the tool reference (`.claude/skills/format-driving/references/tools.md`) and the `.agents/skills` mirror after a command changes.

## Layout

```
format/
  format, format.bat          launcher
  setup/                      install, boot, build, serve, doctor, clean, cli.py
  backend/app/                engine: core/config, engine/ (commands, events, store, cmd_*), routers/
  frontend/src/               window: app.ts, state/, engine-client/, ui/ (sidebar, composer, chat, panel, terminal, palette), styles
  native/format-render/       Rust crate on wgpu: the terminal glyph grid (terminal.snapshot, demo window), opt-in
```

The living logs `frontend/HASHOUT_LOG.md` and `backend/HASHOUT_LOG.md` explain every file; read them before editing.

## Documentation

- [docs/](docs/README.md): the manual, for people using Format.
- [.docs/wiki](.docs/wiki/Home.md): the developer wiki, for people changing it (architecture, engine, window, checks, releases).
- [BRANCHING.md](BRANCHING.md): branches, tags and how a change reaches `main`.
- [CHANGELOG.md](CHANGELOG.md): what each version changed.

## How it is built

Single-region hand edits only, zero DOM flash or re-render (checked under 4x CPU and a slow network), no visible scrollbar anywhere while everything still scrolls, z-index only through `--z-*` tokens, inline `currentColor` SVG icons, no emoji, near-zero comments with the rationale in the HASHOUT logs, `v*.*.*` versions, Conventional Commits by nodemode-ai.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE.md`.
