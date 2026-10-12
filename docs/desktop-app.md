# The desktop app

Format runs as a desktop app on macOS, Windows and Linux. The app is the same Format as the web window: it starts Format's engine itself, opens the window on it, and stops the engine when you quit. Nothing else needs installing: Python, the engine, the window, the built-in browser's package and local dictation are inside the app.

## Getting the app

| Platform | File |
| --- | --- |
| macOS (Apple silicon or Intel) | `Format_<version>_aarch64.dmg` or `Format_<version>_x64.dmg`: open it and drag Format to Applications |
| Windows | `Format_<version>_x64-setup.exe` or the `.msi` |
| Linux | `Format_<version>_amd64.deb`, `Format-<version>-1.x86_64.rpm` or `Format_<version>_amd64.AppImage` |

The files come from the desktop build on GitHub (pushing a `v*.*.*` tag builds all four platforms; Actions, desktop, lists them under Artifacts and the draft release), or from building it yourself (below).

### macOS: the first launch

Builds without an Apple Developer ID are signed ad hoc, not notarized, so macOS warns the first time. Either right-click Format in Applications and choose Open, then Open again, or run once:

```bash
xattr -dr com.apple.quarantine /Applications/Format.app
```

With the `APPLE_*` secrets set in the repository, the build signs and notarizes the app and the warning goes away.

## Where things are

| | macOS | Windows | Linux |
| --- | --- | --- | --- |
| Chats, settings, keys, memory, skills, plugins | `~/Library/Application Support/Format` | `%APPDATA%\Format` | `~/.local/share/format` |
| Engine log | `~/Library/Logs/ai.nodemode.format/engine.log` | `%LOCALAPPDATA%\ai.nodemode.format\logs\engine.log` | `~/.local/share/ai.nodemode.format/logs/engine.log` |
| The built-in browser's Chromium | `~/Library/Caches/ms-playwright` | `%LOCALAPPDATA%\ms-playwright` | `~/.cache/ms-playwright` |
| Local dictation model | `~/.cache/huggingface` | `%USERPROFILE%\.cache\huggingface` | `~/.cache/huggingface` |

The desktop app keeps its own data, separate from a Format you run from the repository with `./format`.

## What is different in the app

- **Port.** The engine listens on `127.0.0.1:8490` when that port is free (so agents' MCP settings keep working), otherwise on a free port. Other devices still use 8492.
- **Links.** Links to other sites, Open link and Open in a new tab open in your default browser.
- **Downloads.** Downloads and exports are saved to your Downloads folder and shown there.
- **Microphone.** The first dictation asks for microphone access (macOS asks once, in System Settings, Privacy and Security, Microphone).
- **Your tools.** On macOS the engine takes your login shell's PATH, so Homebrew tools, `node` and `npx` are found by terminals, Claude's commands and connectors.
- **The built-in browser.** Its package is inside the app; the first time, the Browser pane offers Install the browser, which downloads Chromium once (about 150 MB).
- **Local dictation.** faster-whisper is inside the app; the large-v3-turbo model downloads on the first local dictation (about 1.6 GB). An ElevenLabs key (Scribe v2) needs no download.

## Building it yourself

You need what `./format install` needs, plus Rust (rustup.rs). On Linux also the webview libraries (`./format install-desktop` prints the apt line).

```bash
./format install            # once
./format install-desktop    # once: PyInstaller, the browser and dictation packages, Rust and Tauri checks
./format desktop build      # the frozen engine, then the bundles in src-tauri/target/release/bundle
./format desktop dev        # or run the app without bundling
```

On Windows use `.\format.bat install`, `.\format.bat install-desktop` and `.\format.bat desktop build`. A build makes the app for the machine it runs on; the GitHub workflow makes all four.
