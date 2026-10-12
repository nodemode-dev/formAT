# Getting started

## What you need

- Node 20.19 or newer (22 recommended) and Python 3.12 or newer.
- git.
- An Anthropic API key from console.anthropic.com. Format sends your messages to the Claude API with that key; usage is billed to your Anthropic account.
- Optional: ffmpeg on the PATH (video and audio previews), Rust stable (the native renderer).

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

## Your API key

Open Settings, API keys and paste the key. It is stored in Format's data folder, readable only by your user. You can instead put `ANTHROPIC_API_KEY=...` in `backend/.env`; a key saved in Settings wins. The models menu lists the models your key can use, read from the API.

## The window at a glance

- **Sidebar** (Mod+B folds it to a narrow rail): New chat, Projects, Artifacts, Scheduled, Customize, More (Terminal, Settings), then your chats grouped by day with pinned chats first. A dot on a chat means Claude is working there, or waiting for you.
- **Conversation** in the middle, with the composer under it.
- **Top bar**: the chat's title (click for rename, pin, move to a project, delete), Background work, the terminal, the built-in browser, the chat's files, and Outputs.
- **Side track** beside the chat: an artifact, the chat's files or the browser, one at a time.
- **Terminal dock** at the bottom (Mod+J).

## Where your data lives

Everything stays on your computer in `backend/data` (chats, artifacts, uploads, settings, memory, skills, plugins, the browser profile) and `backend/workspace` (each chat's own folder for Claude's files). Nothing is sent anywhere except your requests to the Claude API, and web pages Claude or you open.
