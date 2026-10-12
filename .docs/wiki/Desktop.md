# Desktop

The desktop app follows formlit and formvis: a Tauri 2 shell in `src-tauri/` and the Python engine frozen by PyInstaller into one sidecar binary, `src-tauri/binaries/format-engine-<target triple>`.

## How it starts

1. The shell opens a small undecorated `splash` window (`frontend/public/splash.html`, copied into `frontend/dist`).
2. It spawns the sidecar with `FORMAT_DESKTOP=1` and `FORMAT_PARENT_PID`, and copies every line it prints to `<app log dir>/engine.log`.
3. `backend/format_engine.py` points `FORMAT_DATA_DIR` at the platform's app-data folder, `FORMAT_DIST` at the bundled window, picks port 8490 or a free one, takes the login shell's PATH (macOS GUI apps get a bare one), starts a thread that exits when the shell's process is gone, and runs uvicorn.
4. The shell waits for uvicorn's `Uvicorn running on http://127.0.0.1:<port>` line, opens the `main` window on that URL and closes the splash. If the engine exits first, it shows the last 40 lines of its output.
5. On quit the shell kills the sidecar.

## What the shell handles

| Concern | Where | Behaviour |
| --- | --- | --- |
| Links to other sites | `on_navigation` | anything that is not the engine's origin opens in the default browser |
| New windows (`target=_blank`, `window.open`) | `on_new_window` | opened in the default browser, never a second webview |
| Downloads and exports | the window and `files.save_download` | in the app the window sends every download to the engine, which saves it to Downloads under the server's name (numbered if taken), reveals it and the window shows a notice; `on_download` in the shell stays as a fallback for downloads started inside an artifact page |
| Microphone | `on_permission_request` | granted to the page; macOS still asks the person once (Info.plist `NSMicrophoneUsageDescription`, entitlement `device.audio-input`) |
| Copy, paste, undo on macOS | Tauri's default macOS menu | kept on |
| Updates | `tauri-plugin-updater` | only when `plugins.updater.pubkey` is set |

The page never calls into the shell (no `remote` capability), so the web build and the app run the same window code.

## Freezing the engine

`setup/freeze_backend` (and `.bat`) runs PyInstaller `--onefile` over `format_engine.py` with `--collect-submodules app` and the libraries that load modules or data dynamically (uvicorn, websockets, anthropic, the MCP server and client, certifi, python-docx and python-pptx templates, ReportLab, openpyxl), plus Playwright with its Node driver and faster-whisper with CTranslate2 and ONNX Runtime when they are installed. The MCP package's CLI is excluded (it needs typer). The result must pass `format-engine --selfcheck` (every command module imports, the window and Office templates are inside) before it is copied into `src-tauri/binaries`. On Linux x86_64 it is about 216 MB.

## Building

`./format desktop build` runs the window build, the freeze and `tauri build`. `.github/workflows/desktop.yml` does it on `macos-latest` (arm64), `macos-15-intel` (x64; GitHub retired `macos-13` in December 2025), `ubuntu-22.04` and `windows-latest`. Without Apple secrets the macOS bundle is signed ad hoc (`signingIdentity "-"`); with them it is signed and notarized. Pushing a `v*.*.*` tag also drafts a release with every bundle.

## Checking it

A Linux build can be installed and run under Xvfb and driven with `xdotool` (see the v0.11.0 entry in BUILD_NOTES). macOS and Windows bundles are checked on those machines.
