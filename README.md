<h1 align="center">Format</h1>
<p align="center"><b>A.T, the Agentic Terminal: the claude.ai way of working, on your own Claude API key, in the form family's Studio Dark design.</b></p>
<p align="center">
<img src="https://img.shields.io/badge/version-0.3.3-f97316" alt="version 0.3.3">
<img src="https://img.shields.io/badge/node-22-339933" alt="node 22">
<img src="https://img.shields.io/badge/python-3.12-3776AB" alt="python 3.12">
<img src="https://img.shields.io/badge/license-Apache--2.0-lightgrey" alt="Apache 2.0 license">
</p>

## What it is

Format is the form family's chat and agent workspace for the Claude API. It follows claude.ai's layout and flow (a sidebar that folds to a mini rail, a centred conversation, a composer with the + menu, model and effort, a collapsible side panel for artifacts and files, a real terminal) and wears the family's design. The Anthropic API is its main engine; OpenAI and Cursor plug in behind the same provider adapter. Every action is one engine command, reachable the same way from the window, the CLI, the terminal and an MCP server for Claude Code, Codex and Cursor.

Format is not affiliated with Anthropic and uses none of its logos, fonts or styles.

**Status.** v0.3.3 chats with Claude, branches a conversation when you edit any message (with a pager between versions), summarizes long chats so they keep going (compaction), sends large files once through the Files API, searches chats by their text, colours code and renders math. The engine's harness turns what you type and attach into a Claude API request (system prompt with your preferences, effort, thinking, prompt caching, images, PDFs, code and zips) and streams the reply into a Markdown view that renders each finished block once. Models and their effort levels come from your key's `/v1/models`. Around it: the sidebar that folds to a mini rail (Mod+B), the composer with the + menu, model, effort and permission menus, Stop and a queue, dictation, a floating Outputs card, a terminal dock with real shells (Hide or Mod+J), a command palette (Mod+K), and Settings for your account and API keys. Tools, artifacts and projects follow (see the roadmap in the planning sidecar).

| Shortcut | Does |
| --- | --- |
| Mod+B | sidebar open or rail |
| Mod+K | command palette |
| Mod+J | terminal dock |
| Mod+. | side panel |
| Mod+Shift+O | new chat |
| Mod+U | add files |

Mod is Cmd on macOS and Ctrl elsewhere. Inside the terminal the shell keeps its own Ctrl keys.

**Stack.** Vanilla TypeScript 7 and Vite 8 · Python 3.12 and FastAPI · Rust (wgpu) for the native crate · Tauri 2 for the desktop app from v0.7.0.

## Quick start

Requirements: Node 20.19 or newer (22 recommended), Python 3.12 or newer, git. ffmpeg on the PATH for video and audio, Rust stable for the native crate.

```bash
./format_oc_install          # engine venv, frontend packages, backend/.env from the example
./format                     # engine on 127.0.0.1:8490, window on http://localhost:5490
./format cli list            # every engine command
./format doctor              # toolchain, installs, key and ports
```

Add your Anthropic key in Settings > API keys (stored in the data folder, owner-only), or put it in `backend/.env` as `ANTHROPIC_API_KEY=...` (the install copies `backend/.env.example` there). A key saved in Settings takes precedence; remove it there to fall back to `.env`.

Dictation uses the browser's speech recognition in Chrome, Edge and Safari. In Firefox it records and the engine transcribes: run `./format install-voice` for local transcription, or add an OpenAI key.

On Windows run `.\format.bat` from this folder, never a bare `format`: outside this folder that name is Windows' disk formatter.

## Ports

| Service | Address | Notes |
| --- | --- | --- |
| Engine | `127.0.0.1:8490` | FastAPI; `FORMAT_PORT` overrides |
| Window (dev) | `localhost:5490` | Vite, `host: false`, strict port, proxies `/api` and `/api/events` |
| Window (preview) | `localhost:5491` | `npm run preview` of the build |

## Commands

| Command | Does |
| --- | --- |
| `./format` or `./format boot` | engine and window together |
| `./format install` | engine venv and frontend packages |
| `./format install-voice` | optional local speech to text for dictation |
| `./format cli chat.send text="..."` then `chat.wait conversationId=...` | chat from the terminal or an agent |
| `./format backend`, `./format frontend` | one side only |
| `./format build`, `./format serve` | build the window, serve it from the engine |
| `./format cli <command> key=value ...` | run any engine command; `list` and `describe <command>` explore them |
| `./format doctor`, `./format clean [--all]` | check, tidy |

## Layout

```
format/
  format, format.bat          launcher
  setup/                      install, boot, build, serve, doctor, clean, cli.py
  backend/app/                engine: core/config, engine/ (commands, events, store, cmd_*), routers/
  frontend/src/               window: app.ts, state/, engine-client/, ui/ (sidebar, composer, chat, panel, terminal, palette), styles
  native/format-render/       Rust crate on wgpu, used where the engine measures a need
```

The living logs `frontend/HASHOUT_LOG.md` and `backend/HASHOUT_LOG.md` explain every file; read them before editing.

## How it is built

Single-region hand edits only, zero DOM flash or re-render (checked under 4x CPU and a slow network), no visible scrollbar anywhere while everything still scrolls, z-index only through `--z-*` tokens, inline `currentColor` SVG icons, no emoji, near-zero comments with the rationale in the HASHOUT logs, `v*.*.*` versions, Conventional Commits by nodemode-ai.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE.md`.
