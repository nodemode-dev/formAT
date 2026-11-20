# Changelog

## 0.29.0 · 2026-11-19

- An engine left behind no longer keeps FormAT from starting. The engine is the helper program behind the window, and only one can use FormAT's data folder at a time. If an earlier engine of this version is still there although its app has gone, the next start ends it and opens; before, the app showed "FormAT is already running on the data folder" until that engine was ended by hand. An engine whose app is open is never ended: a second engine on the same folder is refused with the same sentence as before, which now also names the first engine's process. An engine left by 0.28.0 or older is treated as one whose app is open.
- The engine leaves when its app has gone, however the app ended, as it did before. It now asks every two seconds, where it asked every half second.
- The engine keeps a log of its own: `Logs/format-engine.log` in FormAT's data folder, started before anything else it does, so a start that fails leaves a line there. A Windows build without a console also keeps its errors, in `Logs/format-engine-errors.log`.
- Opening the engine's program by itself, for example with a double click in the install folder, opens FormAT and starts no engine that nobody sees; if FormAT is not found beside it, it says "format-engine is a part of FormAT and serves nothing on its own. Open FormAT instead." To run a packaged engine by itself on purpose, set `FORMAT_NO_SHELL=1`.
- A data folder that cannot be made is said in one sentence, where it was a page of error text.
- When the engine fails to start, the app shows its message while the small loading window is still on screen, and closes only after you have answered it. If the main window cannot be opened, the app now says so; before, it ended without a word.
- Not in this version: on Windows, the system itself ending the engine together with the app (the family's job object), a limit on how long the app waits for the engine's address, and the Windows build without a console, which stays off. Until then an app ended by force is covered by the engine's own check.
- Not checked for this version: nothing was run on Windows or macOS, and no packaged engine was built. The desktop app was not compiled on the build machine, so the release build is the first compile of its changed file. No real agent program was run.
- Engine: no new commands (still 114; 115 MCP tools with `run_command`). One new file shared by the Form family, `backend/app/core/startup.py`, copied from FormTools with its names changed.

## 0.28.0 · 2026-11-19

- Antigravity (Google's `agy` program) joins Claude Code, Codex and Cursor as the fourth agent program FormAT knows. This repository carries `.agents/mcp_config.json` for it beside the files for the other three, and `./format agents install --user` also adds FormAT to Antigravity's own file, `~/.gemini/config/mcp_config.json`, keeping every other server listed there. If that file already has an entry named `format` that FormAT did not write, it is left alone and you are told.
- FormAT finds the agent programs however it was started. The desktop app starts with a short list of folders to search, so a Claude Code installed in your own folders could be reported as not installed. FormAT now also looks in the usual install folders and at the folders your login shell searches. To point it at a particular copy, set `FORMAT_CLAUDE_BIN` (or `FORMAT_CODEX_BIN`, `FORMAT_CURSOR_BIN`, `FORMAT_ANTIGRAVITY_BIN`) to its path.
- The `claudecode.status` command (the `get_claude_code_status` tool) also reports, under `programs`, each of the four agent programs: whether it runs, where it is, its version and the sentence to show. Its existing fields are unchanged.
- The window no longer has status requests refused while it starts. On a slow start, three requests of the Settings page (Other devices, the agents seen, the sandbox note) went out before the window was ready to identify itself and were refused; every command of the window now waits until it is.
- The desktop engine starts when it has nowhere to write its log, which is how a Windows app without a console starts its helper programs. This fault stopped the engine of another Form app at start for a tester; FormAT's engine now cannot stop for that reason.
- Documents: the README, the manual and the agent files name the four agent programs and say where Antigravity's files are.
- Not checked for this version: nothing was run on Windows or macOS, and the real Claude Code, Codex, Cursor and Antigravity programs were not run (stand-in programs only). Nobody has yet seen a real Antigravity read the two files above.
- Engine: no new commands (still 114; 115 MCP tools with `run_command`). One new file shared by the Form family, the finder for the agent programs, which `./format agents sync` checks against its recorded hash.

## 0.27.0 · 2026-11-19

- Only the FormAT window can change things without asking. Everything else that calls the engine on this computer is an outside agent: a coding agent over MCP, `./format mcp`, `./format cli` and any other program. Their calls follow the choice in Settings, Outside agents: Ask me (the default), Allowed or Blocked. Other devices works as before: a paired phone or computer is the window.
- Under Ask me the window asks before every call from an outside agent, reads included, with Allow and Block, and the answer holds for every agent on this computer until you change it in Settings. A call that gets no answer within 120 seconds fails and can be tried again. Under Blocked every such call is refused. Only the window can change the choice; an agent or a command that asks for it to be changed is refused.
- The command line now counts as an outside agent. Under Ask me, a script that uses `./format cli` waits for your answer in the window the first time; choose Allowed in Settings, Outside agents before running scripts unattended.
- The saved Outside agents choice is protected with a key kept in the system keychain. If the saved choice was changed outside FormAT, or was saved by an older version, FormAT reads it as Ask me, and Settings, Outside agents says so. If you had chosen Allowed before this version, you are asked once more after updating: choose Allowed again in the window. On a computer with no keychain that FormAT can use, the saved choice stands as it is.
- The engine's live updates and its terminal connections open only for the window and for paired devices, and uploads and dictation are accepted only from them. Changes sent from outside the window that do not go through the outside-agents choice are refused.
- Commands Claude runs with the bash tool no longer receive FormAT's API keys or anything else from the engine's environment beyond a short list of ordinary variables (the path, your home folder, your language and time zone, the terminal type and the like). Proxy variables are not on that list: behind a proxy, set it in the command or in your login profile.
- Terminal tabs no longer receive FormAT's API keys, FormAT's own `FORMAT_*` settings or other variables from the engine whose names look like secrets (API key, token, secret, password, credential, cookie). The rest of your shell environment in a terminal tab is unchanged, and whatever your login profile sets is still there.
- The desktop app gives its engine as long as it needs to start, as before. Once the engine is up it has 10 seconds to hand the window what it needs; if that does not happen, the app shows the "engine failed to start" message with the place of its log, where it would otherwise have waited with no window.
- MCP: `resources/list` answers with the refusal when an outside agent's call is refused, where it used to answer with an empty list.
- `./format agents sync` also writes `agents/manifest.json`, which says what FormAT offers agents (its tools, which of them only read, its skills, how to connect). `./format agents sync --check` changes nothing, names the agent files that are out of date and exits 1 when there are any.
- Documents: the manual, the README and the agent files say how outside agents are asked and what the bash tool and terminal tabs receive. The README's providers box says what FormAT uses: chat on the Anthropic API or through Claude Code, dictation with ElevenLabs Scribe, OpenAI or local Whisper.
- Engine: no new commands (still 114; 115 MCP tools with `run_command`). New dependency in the engine: `keyring` 25.7.0 (MIT), which keeps the key that protects the Outside agents choice in the system keychain.

## 0.26.3 · 2026-11-15

- The desktop app tidies up after itself. On macOS and Linux, quitting removes the folder the engine unpacks into the temporary folder, where it used to leave one per launch; at every start the engine also removes such folders left by a crash or by an older version, and keeps any that belong to a FormAT that is still running or to another program. On Windows quitting is unchanged, and the clean-up at the next start is new there too.
- FormAT runs once. Opening the desktop app while it is already open brings the open window forward instead of starting a second one, and a second engine on the same data folder refuses to start and says which folder is in use.
- If the desktop app cannot start its engine at all, it now shows a message with the place of its log and then closes, where it used to close without a word.
- The window notices a stopped engine within a second or two. The line under the message box says so, every other page shows a notice at the bottom, and both go away by themselves when the engine is back. A chat that was shown as working when the engine stopped is no longer shown as working.
- Deleting a project, a scheduled task or an artifact asks first, with a sheet that says what is deleted and what is kept, like deleting a chat. Errors on the Projects page now appear on that page.
- The bottom row of the message box fits narrow windows: at 1000 by 700 with the sidebar and a side panel open, the model name is no longer cut off and the line about the missing key wraps onto two lines.
- Settings, API keys says where your keys are kept, and talks about `backend/.env` only when you run FormAT from the source. On macOS, View, Menus in Window takes effect at once.
- Turning on Other devices no longer silences the engine's log, and the log never holds a pairing code or a share link's token: the line for such a request stays, with the secret replaced by `<redacted>`. A chat can no longer get stuck on "A reply is already running" after a reply or a summary failed to start.
- On Windows, `.\format.bat` now has `build`, `serve`, `doctor`, `clean`, `install-voice` and `install-browser`, as `./format` does, and the script that packs the engine no longer runs two options together.
- Demo chats: the list in the Help menu comes from the engine. A demo you have not changed is brought up to date with the app's copy at the next start; one you renamed, continued or added files to stays as you left it, and deleting it and restoring it from Help, Demos gives the new copy.
- The Orrery page has a Credits button listing the credit line and the source page of each of its 26 NASA maps. Every figure on the page is now quoted from a NASA page or marked as converted or computed, and the new file `FIGURES.md` in Outputs gives the page and the date behind each one; 49 entries changed to match NASA's words. The page's source and its build script are in `tools/demos/orrery`.
- Outputs shows each file's description under its name, and Download all saves one zip named after the chat ("<chat title> - all files.zip"), so it is not mistaken for a zip that is one of the files.
- Engine: `app.info` also returns `keysFile` and `envFile`, and `demo.list` also returns each demo's `blurb` and `order` (still 114 commands). New dependency in the desktop shell: `tauri-plugin-single-instance` 2.5.5 (Apache-2.0 or MIT).

## 0.26.2 · 2026-11-15

- The desktop app's updater looks for new versions at `nodemode-dev/formcompiler`, where formcompiler publishes them, instead of the old `nodemode-ai` address. The updater's signing key is unchanged.

## 0.26.1 · 2026-11-15

- The Orrery's credits are complete: the file that comes with the Orrery page (CREDITS.md in Outputs) and `NOTICE.md` now give, for each of the 26 NASA surface maps, the credit line and the source page as NASA Science states them, what the page says the map is, and the terms. They also say plainly that not every map is a photograph: Venus is a radar map with gaps filled in, and the Saturn, Neptune and Titan textures are artists' or concept textures. If your sidebar already holds the Orrery chat it keeps the earlier credits file; delete the chat and choose Help, Demos to bring it back with the new one.
- `NOTICE.md` also records that the Sun, Mercury, Uranus, the rings and Earth's clouds in the Orrery are drawn by the page's own code and are FormAT's own work under the Apache License 2.0.
- The repository has a code of conduct (`CODE_OF_CONDUCT.md`), a contributing guide (`CONTRIBUTING.md`) and a security policy (`SECURITY.md`), which says how to report a vulnerability privately. The README links them.
- The README's clone line names the repository as it is, `formAT`, and the docs and the release skill give formcompiler's address as `nodemode-dev/formcompiler`.

## 0.26.0 · 2026-11-15

- FormAT has menus: File, Edit, View, Go, Window and Help, in the window's top bar on Windows, Linux and in a browser, and in the system menu bar on macOS. Every command is there with its shortcut, and F10 or Alt with a menu's first letter opens the bar from the keyboard. New shortcuts: Mod+, for Settings and Alt+Mod+H for Home; the icon and name at the top of the sidebar also go Home.
- Settings open as a window over what you were doing, not as a page: a list of sections on the left, the sections stacked on the right, and a line joining the one you are in. It folds, drags and closes with Escape, and puts you back where you were.
- Three demo chats are in the sidebar from the first start and open without an API key: Aurora page (the northern lights over a lake, following the pointer), Orrery page (a 3D solar system with NASA surface maps, fly-ins, moons and checked figures) and Ferry dashboard (an invented ferry operator's season, with its data as a package you can import into form.md). They are ordinary chats: rename, pin, delete or continue them, and Help, Demos brings a deleted one back.
- The desktop app starts behind the family's splash, a card with a bar that fills, and shows its window whole once the page has drawn.
- The window wears the family's look: the title row, the app icon and the name FormAT, and the family's switches, buttons and menus. Nothing moved.
- Other devices works again: since 0.24.6 a paired phone or computer loaded the window and was then refused every action.
- Deleting a chat asks first, and also removes the chat's folder of files.
- The terminal: the shortcut that opens the dock (Mod+J) now also hides it from inside the shell, and reloading the window keeps the shells that were running, with their output, where it used to start a new one each time.
- A message that cannot be sent because the engine is not answering stays in the composer, with a plain note saying so.
- The window no longer reloads without end when one thing fails while it starts, and the composer is ready to type in as soon as the window opens.
- Narrow windows: a long chat title no longer pushes the Files and Outputs buttons off the edge, and making a wide window narrow folds the sidebar to its rail.
- The engine stops promptly when asked to, where it used to hang once a window had connected.
- The desktop build: the macOS build script finds the app under its new name, and the Windows script that packs the engine no longer has two options run together. If the engine cannot start, the message saying so is shown before the app closes.
- macOS: the manual says how to open a build that is signed but not notarized (System Settings, Privacy and Security, Open Anyway on macOS 15).
- The engine, the desktop dialogs and the macOS permission prompts say FormAT, like the window.
- Engine: two new commands, `demo.list` and `demo.restore` (114 in all). `conversation.delete` also stops a running reply and removes the chat's folder; `conversation.list` always includes the demo chats; `conversation.create` refuses a project that does not exist.

## 0.25.4 · 2026-11-03

- The README is rewritten to the Form family layout with real screenshots in `docs/images/`.

## 0.25.3 · 2026-11-03

- The app has a new unified icon on the desktop, the web favicon and the splash, and the compiled desktop app is named FormAT.
- The repository lists @gbarnai as a co-owner in `.github/CODEOWNERS`.

## 0.25.2 · 2026-10-31

- The Windows desktop app no longer opens to a blank window on PCs where an installer set the `.js` file type to `text/plain` in the registry: the engine now serves scripts and stylesheets with their real types.
- On Linux, the .deb and .rpm recommend GStreamer's base, good and libav plugins and the AppImage carries the base and good ones, so video and audio previews play on a fresh install.

## 0.25.1 · 2026-10-30

- The Windows desktop build passes its arguments on: `.\format.bat desktop build --config <file>` reaches `tauri build`, so the Windows installer carries the updater settings and signature like the macOS and Linux bundles.
- The Windows build of the LGPL FFmpeg behind local dictation runs as a script of its own in MSYS2, uses Visual Studio's linker rather than MSYS2's `link`, syncs pacman's package list first, and stops with an error at the first step that fails. The configure line is unchanged.
- Batch files check out with Windows line endings (`.gitattributes`).

## 0.25.0 · 2026-10-26

- A test opens the built window in a browser under a slow processor and network and checks that it loads with no layout shift, no error and no refused or failed request; it runs on every change.
- The desktop splash window's mark no longer moves up a few pixels when its line of text appears.

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
