# Desktop

The desktop app follows formlit and formvis: a Tauri 2 shell in `src-tauri/` and the Python engine frozen by PyInstaller into one sidecar binary, `src-tauri/binaries/format-engine-<target triple>`.

## How it starts

1. The shell shows a small undecorated `splash` window (`frontend/public/splash.html`, copied into `frontend/dist`): the family's card, with a bar that fills over the 2.6 s the splash stays at least.
2. It spawns the sidecar with `FORMAT_DESKTOP=1` and `FORMAT_PARENT_PID`, and copies every line it prints to `<app log dir>/engine.log`.
3. `backend/format_engine.py` points `FORMAT_DATA_DIR` at the platform's app-data folder, `FORMAT_DIST` at the bundled window, picks port 8490 or a free one, starts its own log (`Logs/format-engine.log` in the data folder; with no standard error, as in a Windows app without a console, errors go to `Logs/format-engine-errors.log`), reads the shell's process id from `FORMAT_SHELL_PID` or, where that is absent, `FORMAT_PARENT_PID` (a frozen engine that finds neither, and no `FORMAT_NO_SHELL=1`, was started by itself: it opens the app beside it and exits with 0, or says "format-engine is a part of FormAT and serves nothing on its own. Open FormAT instead." and exits with 4), takes the data folder (an OS lock on `engine.lock` there, `backend/app/core/instance.py`, in which the holder records its own process and its shell's; a second engine on the same folder waits 3 s, then ends and replaces a holder whose recorded shell is gone, and otherwise prints "FormAT is already running on the data folder ..." and exits with 2; `startup()` takes the same lock for engines started from source; a data folder that cannot be made is one sentence and exit code 5), locks a marker file in its own one-file unpack folder and, in the background, removes the `_MEI<launcher pid as 8 hex digits>...` folders beside it whose launcher is gone and whose marker nobody holds (or, without a marker, that are shaped like an older FormAT's: `frontend_dist` and `app/demos`), takes the login shell's PATH (macOS GUI apps get a bare one), starts a watch that ends the engine within about 2 s of the shell's process or the launcher going (`backend/app/core/startup.py`; it removes its own unpack folder first on macOS and Linux), and runs uvicorn.
4. The shell waits for uvicorn's `Uvicorn running on http://127.0.0.1:<port>` line and builds the `main` window on that URL, unseen (on macOS on screen at alpha 0, so the page keeps rendering). If the engine exits first, the sidecar cannot be spawned at all, or the `main` window cannot be built, it shows an error dialog with the last 40 lines of the engine's output (or the error) and the path of `engine.log`, and only after the dialog returns hides the splash, stops the engine and exits with 1.
5. When the page has drawn it calls the shell command `app_ready` (`frontend/src/main.ts`). The shell (`src-tauri/src/reveal.rs`) waits out the rest of the 2.6 s, lets the splash finish its bar, shows the window whole and closes the splash. If the page never calls, the window is shown after 20 s.
6. On quit the shell sends the sidecar SIGTERM on macOS and Linux (the one-file launcher passes it to the server, which stops, and then removes its unpack folder) and kills it only if it is still there after 1.5 s; on Windows it kills it.

## What the shell handles

| Concern | Where | Behaviour |
| --- | --- | --- |
| Links to other sites | `on_navigation` | anything that is not the engine's origin opens in the default browser |
| New windows (`target=_blank`, `window.open`) | `on_new_window` | opened in the default browser, never a second webview |
| Downloads and exports | the window and `files.save_download` | in the app the window sends every download to the engine, which saves it to Downloads under the server's name (numbered if taken), reveals it and the window shows a notice; `on_download` in the shell stays as a fallback for downloads started inside an artifact page |
| Microphone | `on_permission_request` | granted to the page; macOS still asks the person once (Info.plist `NSMicrophoneUsageDescription`, entitlement `device.audio-input`) |
| Menus on macOS | the page, through `window.__TAURI__.menu` (`frontend/src/ui/native-menu.ts`) | File, Edit, View, Go, Window and Help in the system menu bar, built from the window's command registry; Copy, Paste, Undo and the like are the system's own items. On Windows and Linux the same menus are a bar in the window's title row |
| Updates | `tauri-plugin-updater` | only when `plugins.updater.pubkey` is set |
| A second launch | `tauri-plugin-single-instance`, registered first | the second process exits at once; the running one shows and focuses its splash or main window |

The page calls into the shell in two places only, both through the injected global `window.__TAURI__` (no npm package): `app_ready` and, on macOS, the menu and window APIs. The page is a remote origin to Tauri (`http://127.0.0.1:<port>`), so `src-tauri/capabilities/default.json` lists that address and the permissions, and `build.rs` declares `app_ready` so its permission is generated. In a browser the global is absent and the same window code runs without it.

## Freezing the engine

`setup/freeze_backend` (and `.bat`) runs PyInstaller `--onefile` over `format_engine.py` with `--collect-submodules app` and the libraries that load modules or data dynamically (uvicorn, websockets, anthropic, the MCP server and client, certifi, python-docx and python-pptx templates, ReportLab, openpyxl), plus Playwright with its Node driver and faster-whisper with CTranslate2 and ONNX Runtime when they are installed. The MCP package's CLI is excluded (it needs typer). The result must pass `format-engine --selfcheck` (every command module imports, the window and Office templates are inside) before it is copied into `src-tauri/binaries`. On Linux x86_64 it is about 216 MB.

## Building

`./build_app` at the root (also `./format desktop build`) is the one entry on macOS and Linux: tool checks, rustup's stable compiler (installed if missing), `setup/install_all`, `setup/install_desktop`, the window build, the freeze and `tauri build --bundles app` (macOS, then its own `hdiutil` disk image and the copy to Applications) or `--bundles deb` (Linux, `FORMAT_BUNDLES` to change). `ft_rust_env` in `setup/lib.sh` puts `~/.cargo/bin` first and clears `RUSTC`, wrappers, `RUSTFLAGS` and target overrides; `ft_rust_fresh` cleans `src-tauri/target` when the compiler differs from the one stamped in `target/.format-rustc`. Proc macros and build scripts are not stripped (`profile.release.build-override`). `setup/desktop_build` stays as the bare build without installs. Format builds nothing in this repository: `.github/workflows/ci.yml` only runs checks. The signed bundles for macOS, Linux and Windows are built by formcompiler (`nodemode-dev/formcompiler`), which holds the signing secrets and the updater key; a local build without them is signed ad hoc (`signingIdentity "-"`). The updater reads `https://github.com/nodemode-ai/formcompiler/releases/download/format-updates/latest.json`.

## Checking it

A Linux build can be installed and run under Xvfb and driven with `xdotool` (see the v0.11.0 entry in BUILD_NOTES). macOS and Windows bundles are checked on those machines.
