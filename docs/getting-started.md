# Getting started

## What you need

- Node 20.19 or newer (22 recommended) and Python 3.12 or newer.
- git.
- An Anthropic API key from console.anthropic.com, or Claude Code signed in to your Claude plan. With a key, FormAT sends your messages to the Claude API and usage is billed to your Anthropic account. Without one, FormAT answers through Claude Code (see below).
- Optional: ffmpeg on the PATH (video and audio previews), Rust stable (the native renderer).

## The desktop app, or from source

The quickest way in is the desktop app for macOS, Windows or Linux: install it and open it, nothing else needed. See [The desktop app](desktop-app.md). The rest of this page runs FormAT from the repository.

## Install and start

```bash
./format_oc_install     # creates backend/venv, installs the frontend packages, copies backend/.env.example to backend/.env
./format                # engine on 127.0.0.1:8490, window on http://localhost:5490
./format doctor         # checks the toolchain, the installs, the key and the ports
```

On Windows run `.\format_oc_install.bat` and `.\format.bat` from the repository folder. Never type a bare `format` outside it: that is Windows' disk formatter.

Two optional parts install separately:

| Command | Adds |
| --- | --- |
| `./format install-voice` | local speech to text for the microphone (faster-whisper with Whisper large-v3-turbo, about 1.6 GB, downloaded during the install) |
| `./format install-browser` | the built-in browser (Playwright and Chromium) |

## No API key: Claude Code

If Claude Code is installed (the `claude` command) and you have signed in to it once, FormAT needs no key: each reply runs through Claude Code on your Claude plan, in the chat's own folder, and streams into the chat like any other reply. The line under the composer says "through Claude Code", and so does the account line at the bottom of the sidebar.

- Claude Code's tools show as FormAT's cards (Ran a command, Edited a file, Read a file), and Ask, Allow all and Plan work the same way: in Ask, a command or file change waits for Allow once, Always allow, Allow all or Deny; Allow all allows them; Plan blocks them. FormAT's skills are offered to Claude Code too. Claude Code's questions arrive as FormAT's question card, and its sub-agents show nested.
- Each reply continues the chat's Claude Code session, so Claude remembers the chat. Editing an earlier message branches from the session at that point.
- To choose, open the model menu, Answer through: Automatic (your API key when one is set, otherwise Claude Code), Anthropic API key, or Claude Code. The menu item appears once FormAT finds Claude Code.
- If a reply says Claude Code is not signed in, run `claude` in a terminal (FormAT's terminal dock works), sign in with `/login`, then retry.
- FormAT looks for `claude` on your PATH and in its usual install folders; set `FORMAT_CLAUDE_BIN` to its full path if it lives elsewhere.

FormAT's own tools (artifacts, documents, memory, the built-in browser) belong to the API path; through Claude Code, Claude uses Claude Code's tools.

## Your API key

Open Settings, API keys and paste the key. It is stored in FormAT's data folder, readable only by your user. You can instead put `ANTHROPIC_API_KEY=...` in `backend/.env`; a key saved in Settings wins. The models menu lists the models your key can use, read from the API.

## The window at a glance

- **Sidebar** (Mod+B folds it to a narrow rail): New chat, Projects, Artifacts, Scheduled, Customize, More (Terminal, Settings), then your chats grouped by day with pinned chats first. A dot on a chat means Claude is working there, or waiting for you.
- **Conversation** in the middle, with the composer under it.
- **Menus**: File, Edit, View, Go, Window and Help, in the top bar on Windows, Linux and in a browser, and in the system menu bar on macOS. Every command with a shortcut shows it there; Help has the shortcuts list and the demo chats.
- **Top bar**: the chat's title (click for rename, pin, move to a project, delete; delete asks first), Background work, the terminal, the built-in browser, the chat's files, and Outputs.
- **Side track** beside the chat: an artifact, the chat's files or the browser, one at a time.
- **Terminal dock** at the bottom (Mod+J).

## Demo chats

FormAT starts with three recorded chats under **Demos** in the sidebar: Aurora page, Orrery page and Ferry dashboard. Opening one needs no API key and sends nothing: you read the conversation, its page runs beside it, Orrery page lists the credit line, source page and terms of each of its 26 NASA surface maps in Outputs, and Ferry dashboard lists its files there (a zip you can import into form.md, and each file in it). They are ordinary chats: with a key you can continue one, and you can rename, pin or delete them. A deleted demo stays deleted; Help, Demos brings it back and opens it. The pages are drawn in code and the ferry data is invented.

## Where your data lives

Everything stays on your computer in `backend/data` (chats, artifacts, uploads, settings, memory, skills, plugins, the browser profile) and `backend/data/workspace` (each chat's own folder for Claude's files). Nothing is sent anywhere except your requests to the Claude API, and web pages Claude or you open.
