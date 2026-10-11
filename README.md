<h1 align="center">Format</h1>
<p align="center"><b>A.T, the Agentic Terminal: the claude.ai way of working, on your own Claude API key, in the form family's Studio Dark design.</b></p>
<p align="center">
<img src="https://img.shields.io/badge/version-0.1.0-f97316" alt="version 0.1.0">
<img src="https://img.shields.io/badge/node-22-339933" alt="node 22">
<img src="https://img.shields.io/badge/python-3.12-3776AB" alt="python 3.12">
<img src="https://img.shields.io/badge/license-Apache--2.0-lightgrey" alt="Apache 2.0 license">
</p>

## What it is

Format is the form family's chat and agent workspace for the Claude API. It follows claude.ai's layout and flow (a sidebar that folds to a mini rail, a centred conversation, a composer with the + menu, model and effort, a collapsible side panel for artifacts and files, a real terminal) and wears the family's design. The Anthropic API is its main engine; OpenAI and Cursor plug in behind the same provider adapter. Every action is one engine command, reachable the same way from the window, the CLI, the terminal and an MCP server for Claude Code, Codex and Cursor.

Format is not affiliated with Anthropic and uses none of its logos, fonts or styles.

**Status.** v0.1.0 is the scaffold: the engine with its command registry, event stream and conversation store, the CLI, and a boot window that reports the engine's state. The shell arrives in v0.2.0 and chat on the Claude API in v0.3.0 (see the roadmap in the planning sidecar).

**Stack.** Vanilla TypeScript 7 and Vite 8 · Python 3.12 and FastAPI · Rust (wgpu) for the native crate · Tauri 2 for the desktop app from v0.7.0.

## Quick start

Requirements: Node 20.19 or newer (22 recommended), Python 3.12 or newer, git. ffmpeg on the PATH for video and audio, Rust stable for the native crate.

```bash
./format_oc_install          # engine venv, frontend packages, backend/.env from the example
./format                     # engine on 127.0.0.1:8490, window on http://localhost:5490
./format cli list            # every engine command
./format doctor              # toolchain, installs, key and ports
```

Put your key in `backend/.env` as `ANTHROPIC_API_KEY=...` (chat uses it from v0.3.0).

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
  frontend/src/               window: styles (family sheets plus ft-*), engine-client/, ui/
  native/format-render/       Rust crate on wgpu, used where the engine measures a need
```

The living logs `frontend/HASHOUT_LOG.md` and `backend/HASHOUT_LOG.md` explain every file; read them before editing.

## How it is built

Single-region hand edits only, zero DOM flash or re-render (checked under 4x CPU and a slow network), no visible scrollbar anywhere while everything still scrolls, z-index only through `--z-*` tokens, inline `currentColor` SVG icons, no emoji, near-zero comments with the rationale in the HASHOUT logs, `v*.*.*` versions, Conventional Commits by nodemode-ai.

## Licence

Apache-2.0. See `LICENSE` and `NOTICE.md`.
