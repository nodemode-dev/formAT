# HASHOUT_LOG · frontend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the window. Source files stay comment-free (vendored family sheets keep their upstream headers); everything else they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.30.1
Last updated: 2026-11-20 · v0.30.1: no window change (the macOS engine list installs keyring; see the engine log's entry for 0.30.1); 2026-11-20 · v0.30.0: no window change (the shell's job object and wait, the Windows engine without a console, the connect command; see the engine log's entries after v0.29.0); 2026-11-19 · v0.29.0: no window change (the engine's start and stop and the shell's failure dialog; see the engine log's entries after v0.28.0); 2026-11-19 · v0.28.0: every command of the window waits for its key before it is sent (src/engine-client/window-key.ts, api.ts), and Settings, Outside agents names Antigravity; 2026-11-19 · v0.27.0: the window sends its key with every write and takes a one-time ticket for the events and terminal sockets (src/engine-client/window-key.ts), and Settings, Outside agents says when the saved choice was reset to Ask; 2026-11-15 · v0.26.3: the review's open list fixed in the window (a stopped engine is noticed within seconds and said on every view, deleting a project, a scheduled task or an artifact asks first, the composer's bottom row wraps in narrow containers, Projects page errors appear on that page, Settings names where keys are kept, View, Menus in Window on macOS applies at once, the demo list comes from `demo.list`, Outputs shows each file's caption and names Download all); v0.26.2: no window change (the desktop updater's address; see the engine log's entry for 0.26.2); v0.26.1: no window change (documents only: each Orrery map's credit line and source page, the community files, the release addresses; see the engine log's entry for 0.26.1); v0.26.0: a menu bar from one command registry (File, Edit, View, Go, Window, Help; in the macOS menu bar through the shell's injected API), settings as a window with a rail and a wire, the family look and the name FormAT, demo chats in their own sidebar group that open with their page beside them and at their start, the family splash and the `app_ready` call, and the review's window fixes (the reload loop at boot, focus after load, a failed send keeps its text, the terminal's toggle key and adopted shells, delete asks first, narrow windows); 2026-10-26 · v0.25.0: the window smoke and the splash mark's jump (v0.25.1 to v0.25.4: no window change beyond the icon and the README); 2026-10-25 · v0.24.5: markdown-it 15.0.3 and Vite 8.3.5; 2026-10-22 · v0.24.1: no window change (checks only, releases by formcompiler, version string); v0.24.0: the app icon redrawn as a smiling chat bubble with a sparkle (every Tauri size, the macOS .icns with its margin and shadow, favicon and splash), assets/icon_src to regenerate it, and the compact build's bloom kept; v0.23.0: attachment tiles with real previews (image, SVG, video frame and length, audio length, first lines of text) in the composer and on sent messages, and a full-screen viewer for every kind; v0.22.0: a run of the API's text blocks renders as one Markdown flow (a cited answer no longer breaks into a paragraph per claim), source chips after cited claims (web, document page, search result) live while streaming, punctuation kept before the chips, the caret only on the reply's last text, redacted thinking shown as nothing, KaTeX's operator and AMS faces preloaded; v0.21.1: a whole-app audit (no overflow, scrollbars or errors in 102 states) and five fixes: opening a chat moves the composer at the click, view tabs no longer reset each other, Skills Discover's empty line waits, a plugin connector chip holds still, Customize's message line keeps its height; v0.21.0: Discover for skills and connectors, Skill with Claude, a confirm for command plugins, private marketplace tokens, .plugin uploads; v0.20.0: Create a plugin (editor) and Create with Claude, /plugin:skill in the / menu; v0.19.0: Plugins with Your plugins and Discover, marketplaces with Check for updates and Sync automatically, a plugin page with Skills, Commands, Connectors and Agents tabs; v0.18.0: connector sign-in in the add form, on rows and pages, and the + menu's connector switches per chat; v0.17.0: Customize's list beside the open item on wide windows, Enabled switches, Delete and Remove in "..." menus with a confirm, skills grouped by where they came from; v0.16.0: a connector's page with status, Disconnect, the "..." menu and tool permissions; v0.15.0: the / menu, Customize with tabs, search, Add and a skill file browser; v0.14.1: zero horizontal overflow in the chat and the app at 360 to 1920 px, the streaming caret off its own line; v0.14.0: Allow for this chat on approval cards and in the permission menu, Always allow named for its kind of step; v0.13.0: files dropped anywhere on the chat, /skill in the composer, Allow all, a pinned follow of the reply, user messages on the right, edits as diffs, a quieter thinking row

---

## Org-navi-map

```
frontend/
├── index.html                     critical style, family theme boot, layout boot, sheets, roots
├── vite.config.ts                 host false, port 5490 strict, preview 5491, /api proxied with WebSockets
├── package.json                   TypeScript 7, Vite 8, Inter, JetBrains Mono, xterm 6 and its fit addon
├── oc_install(.bat), boot_frontend(.bat)
├── public/favicon.svg, favicon.png   FormAT's app icon, as the page icon and as the brand mark in the window
├── public/splash.html             the desktop splash card (formvis's): icon, "Starting FormAT", a bar that fills
└── src/
    ├── main.ts                    entry: App, reveal after fonts and first load, app_ready to the desktop shell; boot frame if the engine is down
    ├── app.ts                     App: shell, layout toggles, views, keys, engine events
    ├── demos.ts                   the demo list the window takes from demo.list (titles, blurbs, order), their sidebar group and order
    ├── version.ts                 VERSION
    ├── state/app-state.ts         conversations, active chat, messages, models, settings, view; topics
    ├── engine-client/
    │   ├── api.ts                 health, run(command, params), EngineError, the "not answering" line
    │   ├── events.ts              EventStream: WebSocket with backoff and state, retryNow
    │   └── watch.ts               watchEngine: tells the app when the engine stops answering and when it is back (0.26.3)
    ├── ui/
    │   ├── dom.ts                 el, esc, q, setText, setAttr, prefs
    │   ├── icons-ft.ts            inline currentColor SVG: the mark and the 20 px UI set
    │   ├── menu.ts                popover menus and submenus in the overlay root
    │   ├── commands.ts            the window's command registry: ids, labels, keys, enabled and checked, key event to command
    │   ├── menubar.ts             the in-window menu bar and its popup menus, keyboard and mnemonics
    │   ├── app-menu.ts            FormAT's commands and its six menus; the one keyboard handler
    │   ├── native-menu.ts         the same menus in the macOS menu bar, through the shell's menu API
    │   ├── prefs-window.ts        the settings window's shell: rail, stacked sections, the wire, drag, focus
    │   ├── confirm.ts             the confirm sheet, and delete-a-chat, -a-project, -a-task and -an-artifact through it
    │   ├── engine-note.ts         the notice at the bottom of every page but the chat while the engine is not answering (0.26.3)
    │   ├── sidebar.ts             sidebar and mini rail, nav, keyed recents, rename in place
    │   ├── composer.ts            the box, attachments, + menu, model and effort, permission mode
    │   ├── chat-view.ts           greeting, thread, note, pinned follow and scroll-to-bottom, file drop zone; composer docked
    │   ├── side-panel.ts          Outputs and Used in this session
    │   ├── terminal-dock.ts       xterm tabs attached to engine PTYs
    │   ├── palette.ts             command palette
    │   ├── tool-cards.ts          tool steps and groups, questions, file and artifact cards
    │   ├── artifact-panel.ts      the artifact beside the chat: two frames, versions, code, links
    │   ├── files-pane.ts          the chat folder's files and their previews, comments on a block
    │   ├── attach-view.ts         attachment tiles (image, video, audio, text previews) and the full-screen viewer
    │   ├── projects-view.ts       the Projects page: tiles, one project with chats, instructions and files
    │   ├── customize-view.ts      Customize: tabs for skills, connectors and plugins with search and Add, the open item beside the list on wide windows; a skill's files in a browser, Try in chat
    │   ├── slash-menu.ts          the / menu above the composer: commands, skills and plugin commands, filtered in place
    │   ├── memory-panel.ts        Settings, Memory: the setting, the scope, the memory files and their editor
    │   ├── scheduled-view.ts      the Scheduled page: tasks, the form, one task with its runs
    │   ├── background-panel.ts    Background: the top-bar badge's popover of running and waiting work
    │   ├── views.ts               Artifacts gallery and Settings pages
    │   └── boot-frame.ts          the engine-down fallback
    └── styles/
        ├── tokens.css ... light-mode.css   family sheets, vendored unchanged from formvis v1.66.1
        ├── ft-tokens.css          Format's layout tokens
        ├── ft-shell.css           grid frame, top bar, buttons, pages, boot frame
        ├── ft-sidebar.css         sidebar and rail
        ├── ft-chat.css            chat, composer, side panel, terminal dock
        ├── ft-overlays.css        menus and the palette
        ├── ft-menubar.css         the menu bar in the title row and its popups
        └── ft-prefs.css           the settings window
```

---

## Table of contents

- [index.html](#index-html)
- [src/main.ts](#src-main)
- [src/ui/boot-frame.ts](#src-ui-boot-frame)
- [src/app.ts and the layout](#src-app)
- [src/ui/sidebar.ts](#src-ui-sidebar)
- [src/ui/composer.ts](#src-ui-composer)
- [src/ui/terminal-dock.ts](#src-ui-terminal-dock)
- [src/ui/palette.ts](#src-ui-palette)
- [src/ui/artifact-panel.ts and the gallery](#src-ui-artifact-panel)
- [src/ui/files-pane.ts, comments and activity](#src-ui-files-pane)
- [src/ui/projects-view.ts](#src-ui-projects-view)
- [src/ui/customize-view.ts and src/ui/memory-panel.ts](#src-ui-customize)
- [src/ui/scheduled-view.ts and src/ui/background-panel.ts](#src-ui-scheduled)
- [Gap closures in the window](#src-gaps)
- [Chat feel: drop, skills, Allow all, follow, sides](#src-chat-feel)
- [src/styles/ft-overlays.css](#src-styles-ft-overlays)
- [src/styles/ft-tokens.css](#src-styles-ft-tokens)
- [tests/window](#tests-window)
- [public/splash.html and the hand-off to the window](#public-splash)
- [The menu bar: commands.ts, menubar.ts, app-menu.ts, native-menu.ts](#src-ui-menubar)
- [src/ui/prefs-window.ts and the settings window](#src-ui-prefs-window)
- [The family look](#family-look)
- [src/demos.ts and demo chats in the window](#src-demos)
- [Review fixes in the window, 0.26.0](#review-0-26-0)
- [The review's open list, fixed in the window, 0.26.3](#open-items-0-26-3)

---

## index.html {#index-html}

### index.html · panels.css left out
- refers-to: index.html :: stylesheet links
- kind: warning-context
- logged: v0.1.0 · 2026-10-11

formvis's `panels.css` was vendored and then removed before the first commit: it carries three raw `z-index` values (`.cv-dock-split` 2, the properties column 4, `.cv-props-resize` 5), against the one-scale rule, and Format uses none of its classes yet. When v0.2.0 needs the dock's collapse styles, they are written in `ft-` sheets on `--z-*` tokens rather than vendored with raw numbers.

### index.html · order of the head
- refers-to: index.html :: head
- kind: rationale
- logged: v0.1.0 · 2026-10-11

Critical inline style first (page background, `#app` hidden until `app-ready`), then the family theme boot (sets the profile's tokens on `documentElement` before first paint), then `scrollbars.css` before every other sheet so no element can paint a bar even for one frame, then the family sheets, Format's sheets and the light layer last. The theme boot block is the family's `theme-boot.js` v1.0.0 as formlit carries it, unchanged, so a theme chosen in any family app (`nodemode_ui_settings`) carries over.

---

## src/main.ts {#src-main}

### src/main.ts · reveal
- refers-to: src/main.ts :: document.fonts.ready
- kind: rationale
- logged: v0.1.0 · 2026-10-11

The frame is mounted once and revealed when the fonts are ready, so the first visible frame is already in Inter; status values arrive later into cells whose height is reserved. Verified v0.1.0 under 4x CPU, 400 ms latency and 500 kbit/s with the cache off, on the production build: one background colour from the first frame, the card's rectangle identical from the first visible frame to the last, cumulative layout shift 0, no element with a visible scrollbar.

---

## src/ui/boot-frame.ts {#src-ui-boot-frame}

### src/ui/boot-frame.ts · set
- refers-to: src/ui/boot-frame.ts :: set
- kind: rationale
- logged: v0.1.0 · 2026-10-11

Each status cell keeps its own Text node and dot; `set` writes `data-state` and `Text.data` only when they differ. Nothing is rebuilt after mount. From v0.2.0 it is the fallback `main.ts` mounts when the engine does not answer the first load; it reloads the page when the event stream connects.

---

## src/app.ts and the layout {#src-app}

### index.html, src/app.ts · layout before first paint
- refers-to: index.html :: second inline script; src/app.ts :: toggle
- kind: rationale
- logged: v0.2.0 · 2026-10-11

The sidebar (open or rail), the side panel and the terminal dock are three attributes on `documentElement` (`data-ft-sidebar`, `data-ft-panel`, `data-ft-term`), set from localStorage by an inline script before any stylesheet, so a reload paints the remembered layout in its first frame. CSS grid tracks read the attributes; `toggle` changes one attribute and the stored preference, nothing else. Panels stay mounted when closed (zero-width track, `visibility: hidden`) so opening one never rebuilds it and the terminal keeps its session.

### src/styles/ft-shell.css · narrow windows
- refers-to: src/styles/ft-shell.css :: @media (max-width: 760px)
- kind: rationale
- logged: v0.2.1 · 2026-10-11

At 760 px and below the open sidebar becomes a drawer over the page (fixed, `--z-companion`) while the grid keeps a rail-wide first column, the side panel takes the whole body, and the composer's notice hides. `.ft-main` is pinned to grid column 2: once the sidebar left the grid, auto-placement had put the main area into the 52 px column. Checked at 360, 768, 1024 and 1920 px with the sidebar open and as a rail, panel and terminal open: no visible scrollbar, no horizontal page overflow, no page errors.

### src/ui/markdown.ts · StreamRenderer
- refers-to: src/ui/markdown.ts :: splitBlocks, StreamRenderer.set
- kind: rationale
- logged: v0.3.0 · 2026-10-11

A streaming reply is split into blocks at blank lines outside code fences. Every finished block is rendered once with markdown-it into its own element and never touched again; only the tail element is re-rendered as text arrives, and when the reply finishes the tail element is kept and renamed to a block rather than replaced. The check counts removed `.ft-md-block`, `.ft-msg` and `.ft-thinking` nodes in the thread while a reply streams: 0. Raw HTML in Markdown is off (`html: false`); links open in a new tab with `noopener`. A list interrupted by a blank line becomes two lists (numbering continues because markdown-it keeps the start number).

### src/ui/markdown.ts · the tail becomes the block
- refers-to: src/ui/markdown.ts :: StreamRenderer.set
- kind: warning-context
- logged: v0.6.0 · 2026-10-12

Until v0.6.0 a finished block was inserted as a new element before the tail, so the tail element moved down by the block's height each time; in a short chat that is not scrolled, the browser counted it as a layout shift (about 0.01 per reply, found by the v0.6.0 check, which watches the whole window rather than a scrolled thread). Now the tail element itself becomes the finished block (re-rendered only if its source differs from what it already shows) and a new empty tail is added after it: nothing already on screen moves, and new elements are not shifts.

### src/ui/chat-view.ts · TextRun, one flow per run of text blocks
- refers-to: src/ui/chat-view.ts :: TextRun (part, source), ensurePart (the text branch, redacted_thinking), plainText, applyCitation; src/app.ts :: message.citation
- kind: rationale
- logged: v0.22.0 · 2026-10-18

The Messages API returns a cited answer as many text blocks, each claim its own block with a `citations` list and the words between them in plain blocks ("Based on the search results, " then "Claude Shannon was born on April 30, 1916" then ", and"); platform.claude.com/docs/en/build-with-claude/citations and the web search tool page show the shape. Until v0.22.0 every text block got its own StreamRenderer, so a cited answer broke into one paragraph per claim, and the citations were dropped although the web search page says citations must be shown when API output is displayed to users. Now adjacent text blocks (no tool, result or thinking block between them) share one TextRun and one StreamRenderer: the run joins their text in order and puts a private-use marker (`n`) after each cited block's text, before its trailing whitespace, so the chip lands at the end of its claim whether the citation arrives before or after the text (the citations page's stream shows it after). When the next block starts with punctuation (`.,;:!?)]`), the marker moves after it, so a sentence ends "theory." and then its chips, never "theory [chips] ." with the period wrapping alone. Copy takes each run's plain text (no markers), runs joined by a blank line. Redacted thinking (`redacted_thinking`, encrypted `data` with no readable text, per platform.claude.com/docs/en/build-with-claude/thinking) shows nothing; it used to print "redacted thinking" as a bare note. `message.citation` events (engine, backend log) carry each citation as it streams; a reload paints the same chips from the stored blocks.

### src/ui/markdown.ts · source chips
- refers-to: src/ui/markdown.ts :: citeMark, host, chip, chips, renderMarkdown (cites), tex and the fence rule (markers stripped), StreamRenderer.set (cites, re-render of a changed finished block, the tail recreated after a finish)
- kind: rationale
- logged: v0.22.0 · 2026-10-18

markdown-it renders the run's source with the markers in it; `renderMarkdown` then swaps each marker for a `.ft-cites` group built from that block's citations. A web citation (`web_search_result_location`, or a `search_result_location` whose source is a URL) is a link named by its host; a document citation (`char_location`, `page_location`, `content_block_location`) is a label with the document's title cut to 22 characters and its page or pages. Each chip's title holds the source's title and the quoted passage. Sources are de-duplicated by link or label; two chips show and the rest fold into "+N", whose title lists them. Markers inside code fences and math are removed, never rendered. StreamRenderer.set gained one exception to "a finished block is never touched again": a finished block is re-rendered when its own source changed, which happens only when a citation lands after its paragraph closed (a cited block ending in a blank line); the check compares strings, so unchanged blocks are left alone. Because the run calls set with `finished` once per member, set also recreates the tail if a finish removed it and turns a finished tail back into a tail if more text comes.

### src/ui/markdown.ts · KaTeX faces loaded up front
- refers-to: src/ui/markdown.ts :: the document.fonts.load list
- kind: warning-context
- logged: v0.22.0 · 2026-10-18

An inline `\sum` is drawn in KaTeX_Size1, which was not in the preload list: when it arrived, the formula narrowed and the chip after it moved (a horizontal layout shift under 0.00005, found by the v0.22.0 check). KaTeX_Size1, KaTeX_Size2 (display operators) and KaTeX_AMS (blackboard and other AMS symbols) now load with the other faces; the shift is gone. At exactly 390 px the v0.22.0 check also flags KaTeX's `.vlist-s` (an empty 2 px table cell KaTeX adds for WebKit) ending 1 to 2 px past the column when a subscript sits at a line's end; nothing is drawn there and nothing scrolls. It is left as it is, since the macOS app runs on WebKit, which that cell is for.

### src/styles/ft-chat.css · source chips and the caret's run
- refers-to: src/styles/ft-chat.css :: .ft-cites, .ft-md .ft-cite (and :last-child, a:hover), the caret rule's `.ft-msg-blocks > .ft-md:last-child`
- kind: rationale
- logged: v0.22.0 · 2026-10-18

A chip is an inline-block pill at 0.74em with line-height 1.5 and `vertical-align: middle`, so it stays inside the line's strut: measured paragraph height over line-height is a whole number on every line with chips (1, 3, 2, 3, 1 in the check). Its width is capped at min(20em, 100%) with an ellipsis, so no chip can widen a column. The streaming caret is drawn only in the reply's last Markdown root: a reply with text, then a search, then more text used to show two carets, one on the paragraph before the search. While a tool group is the last thing in the reply there is no caret; the group shows the progress.

### Checks · v0.22.0 and the chat-feel check's two entries
- refers-to: the v0.22.0 check (scratch, outside the repo) and the v0.13.0 chat-feel check
- kind: explainer
- logged: v0.22.0 · 2026-10-18

The v0.22.0 check streams a web search answer from the API stand-in (a search, its results, eleven text blocks, citations after the text, one block's citation before it, a cited block ending in a blank line, a PDF page citation with a long title, three sources on one claim, inline math) at 1280 px under 4x CPU and a slow network: chips while streaming, one caret, no `.ft-md`, `.ft-md-block`, `.ft-msg`, `.ft-thinking` or `.ft-tool` removed, no layout shift, no errors, Copy as clean prose, the same paragraphs and chips after a reload, and at 1920, 1280, 760, 390 and 360 px no scroll and nothing past the column (the 390 px KaTeX cell above aside). The v0.13.0 chat-feel check gives the same result on v0.21.1 and v0.22.0, with two entries that come from the script itself: 0.0079 when it opens every `<details>` from code (what is pushed below the viewport counts) and 0.0245 when it dispatches a synthetic drop (the chip row grows the composer). Neither is input to the browser; a real click or drop is, so a person's own action is not reported. The v0.21.1 whole-app audit, rerun on v0.22.0: no overflow, visible scrollbar or error in any state at any of its six widths; its only shifts are the greeting and composer gliding down as the terminal dock hides, which the script does with a click from code at the start of each width. Hidden with a real Ctrl+J and a real click on Hide, all 13 entries of that glide carry `hadRecentInput`, so the browser does not count them.

### src/ui/attach-view.ts · attachment tiles and the viewer
- refers-to: src/ui/attach-view.ts :: guessKind, kindLabel, preview, head, Viewer (open, close, step, show, drop), openViewer; src/ui/composer.ts :: Pending (blob, local), addFiles, submit (revoke), shown, renderFiles, renderCard (kindLabel); src/ui/chat-view.ts :: node (the user message's .ft-msg-file tiles); src/ui/files-pane.ts :: LANG (exported); src/ui/icons-ft.ts :: play, wave; backend app/routers/files.py :: upload_file
- kind: rationale
- logged: v0.23.0 · 2026-10-18

The owner, on the macOS app built from v0.22.0, after dropping a file into it: attachments should show a preview thumbnail and open full screen, for images, video, audio and text, as on claude.ai. Until then a sent message showed a name chip and the composer a card with the name and type. Now both use the same 112 px tile (`--ft-attach-card`, unchanged), with `preview()` adding one absolutely placed layer inside it, so nothing the tile holds can change its size: a picture (`object-fit: cover`) for images and SVG; a video's frame at 0.1 s (`#t=0.1`, `preload="metadata"`, muted) with a play mark and its length; a waveform and length for audio (read from a detached `<audio>` that is emptied once it has the metadata); the first six lines of a text or code file in 9 px mono under a fade, read from the first kilobyte (a `Range` request for a sent file, `Blob.slice` for one still in the composer). PDFs, zips and other files keep the name and type. In the composer the preview comes from an object URL of the local file the moment it is added, before the upload ends, so the tile never swaps its picture; the URL is revoked when the file is removed or sent, and the sent message reads from `GET /api/uploads/{id}` (backend log). Composer and message labels come from one `kindLabel` (SVG, MD, PY, LOG, ZIP 2), where the composer used to print the engine's kind (TEXT).

A click (or Enter or Space on a composer tile) opens the viewer on that message's or composer's files: images fit the window and a click toggles their natural size, video and audio play with controls, a PDF opens in an iframe, Markdown renders through renderMarkdown, code is highlighted with the files pane's language map (up to 300 KB), other text shows as preformatted text, the first 2 MB of anything longer with a note, and a zip or unknown file says there is no preview. It builds each file's layer hidden, waits for it to be ready (image decoded, media metadata, frame load), then swaps it for the old one, as the files pane does, so stepping between files never shows an empty or half-drawn stage; media in a removed layer is paused. Arrow keys step (not while a video, audio, iframe or document has focus), Esc closes, the close button takes focus on open and focus returns to the tile on close; download links to `?download=1`, or to the object URL for a file not yet sent.

The viewer mounts on `body`, not `#overlay-root`: that root is `position: fixed` with `z-index: var(--z-menu)` (200), which makes it a stacking context, so a full-screen layer inside it stayed under the sidebar drawer (`--z-companion`, 800) at 760 px and below, found by the check's screenshot at 390 px. On `body` the viewer's `--z-overlay` applies, and the check now finds the viewer at both edges, the bottom and the top-left corner at every width.

Checked (scratch script outside the repo) at 1280 px under 4x CPU and a slow network with nine files (PNG, SVG, WebM, WAV, Markdown, Python, a 3.8 MB log, PDF, zip): every tile 112 by 112, pictures decoded, the video frame ready with 0:04, the audio 0:07, six lines of text; the viewer opened each kind from the composer and from the sent message with one layer at a time, Esc closed it with focus back on the tile; a `Range` request answered 206 with the cache header, a `../` path 404; no layout shift while tiles loaded or the message arrived; at 1920, 1280, 760, 390 and 360 px no page overflow and nothing past the window with the viewer open or closed. The v0.13.0 chat-feel check (its drop included) and the v0.14.1 overflow check are unchanged.

### src/ui/markdown.ts · syntax colours
- refers-to: src/ui/markdown.ts :: fence renderer; src/styles/ft-tokens.css :: --ft-syn-*
- kind: rationale
- logged: v0.3.1 · 2026-10-11

highlight.js 11.12 (BSD-3-Clause), `lib/common` only (about 35 languages), runs inside the fence renderer, so a code block is coloured once when its block finishes and never again; the streaming tail shows plain text until its fence closes. Only a named language is highlighted (no auto-detection, which is slow and guesses wrong on short snippets). Its classes map to `--ft-syn-*` tokens drawn from the family's handle and status colours, so no highlight.js theme sheet is loaded. Those colours are tuned for Studio Dark; a light-theme pass on them is open (`--ft-syn-type` is the one raw value, a sky blue the family has no token for).

### src/ui/markdown.ts · math
- refers-to: src/ui/markdown.ts :: math_inline, math_block, tex, splitBlocks
- kind: rationale
- logged: v0.3.2 · 2026-10-11

KaTeX 0.18.9 (MIT) renders `$...$` and `\(...\)` inline and `$$...$$` and `\[...\]` as blocks, through two markdown-it rules written here instead of a plugin (the maintained plugin pins KaTeX 0.16). Each finished block is rendered once like any other; while streaming, `splitBlocks` treats an open `$$` or `\[` like an open code fence so a formula with blank lines is not split in two. A `$` directly before a digit or a space never opens math, and a closing `$` must follow a non-space and not precede a digit, so prices like "$5 and $10" stay text; the first build read "$5 and $10, while the area is $\pi r^2$" as one formula and the check caught it. Errors render as KaTeX's own red source (`throwOnError: false`), `trust` is off. KaTeX's sheet has no z-index; its faces use `font-display: block`, so the three main faces are requested at start and are ready before the first formula arrives.

### src/ui/markdown.ts · version pin
- refers-to: frontend/package.json :: katex
- kind: warning-context
- logged: v0.3.2 · 2026-10-11

KaTeX 0.19.0 was ten days old on 2026-10-11; 0.18.9 (published 2026-09-23) is pinned exactly instead.

### src/app.ts · claimNext
- refers-to: src/app.ts :: send, onEvent (conversation.created)
- kind: rationale
- logged: v0.3.0 · 2026-10-11

`chat.send` without a chat id creates the chat in the engine, and its events can arrive before the HTTP reply. The window sets `claimNext` before sending; the next `conversation.created` becomes the active chat with an empty message list, so the user message, the reply placeholder and the first deltas all land in the view instead of being dropped.

### src/ui/chat-view.ts · finishView
- refers-to: src/ui/chat-view.ts :: finishView
- kind: warning-context
- logged: v0.3.0 · 2026-10-11

The action row shows when the reply is not streaming: `if (actions.hidden !== streaming) actions.hidden = streaming`. The first version compared with `===` and the row never appeared after a reply; the chat check caught it before commit.

### src/ui/composer.ts · uploads and the queue
- refers-to: src/ui/composer.ts :: addFiles, upload, renderFiles, submit, renderQueue
- kind: explainer
- logged: v0.3.0 · 2026-10-11

Files upload on pick (`POST /api/uploads`); each card is keyed and patched (uploading, kind, ZIP with its entry count, or FAILED with the reason as its tooltip). Send waits until uploads finish. While a reply runs, Send with an empty box becomes Stop, and Send with text queues the message above the composer; the queue sends its next message when `message.completed` arrives, and Send now stops the running reply so the queue moves. The queue row is small and re-rendered as a whole when it changes.

### src/ui/dictation.ts · two paths
- refers-to: src/ui/dictation.ts :: start, transcribe
- kind: rationale
- logged: v0.3.0 · 2026-10-11

Chromium-based browsers and Safari have speech recognition built in (`SpeechRecognition` or `webkitSpeechRecognition`), so text arrives with no engine work. Firefox has none, so there the microphone records with `MediaRecorder` and the engine transcribes (local faster-whisper after `./format install-voice`, or OpenAI with an OpenAI key). Recognised text is inserted at the cursor.

### src/ui/dictation.ts · choosing the engine
- refers-to: src/ui/dictation.ts :: engines, start, transcribe; src/ui/composer.ts :: the Dictation constructor (engine getter); src/ui/views.ts :: voiceEngine select, ElevenLabs key row, fillVoice; src/app.ts :: keys.changed refreshes the About line; src/state/app-state.ts :: Account.voiceEngine, VoiceEngines
- kind: rationale
- logged: v0.10.5 · 2026-10-12

From v0.10.5 the account's Dictation engine decides. Browser uses the built-in recognizer. Scribe, local or openai always record and send that engine as the preferred one (the engine still falls through to the others on failure). Automatic asks `/api/voice` (cached 15 seconds) and records whenever Format has any engine set up, because Scribe v2 and Whisper large-v3-turbo are more accurate than the browser's recognizer and keep the audio away from the browser vendor; it uses the browser only when Format has none. The microphone's tooltip names the engine while recording. Saving a key refreshes Settings, About's dictation line, which was otherwise filled only at load.
### src/ui/views.ts · About credit
- refers-to: src/ui/views.ts :: SettingsView (the About section)
- kind: rationale
- logged: v0.24.4 · 2026-10-24

Format's Home has no credit line, so by the owner's choice the credit "by nodemode.ai" is the first line of Settings > About, an `ft-set-note` under the heading. It is part of the Settings template, built once with the view, so it is there before the section is ever shown and nothing below it moves later. It is marked translate="no": the owner's domain reads the same in every language.

### src/ui/views.ts · API keys
- refers-to: src/ui/views.ts :: SettingsView
- kind: explainer
- logged: v0.3.0 · 2026-10-11

Keys are written with `keys.set` and never read back; each row shows only whether a key is set, its last four characters and where it comes from (saved in Format, backend/.env, the environment). Remove appears only for a key saved in Format, because a .env key is the person's file to edit.

### src/styles/ft-chat.css · Outputs floats
- refers-to: src/styles/ft-chat.css :: .ft-panel
- kind: rationale
- logged: v0.3.0 · 2026-10-11

Outputs is a card positioned over the body at `--z-companion`, as in claude.ai's screenshots, so opening it never narrows the conversation. It fades and lifts in with opacity and transform only, and stays mounted when closed. The full file viewer of Phase 5 will be the column; this card lists what the chat made.

### src/app.ts · openChat
- refers-to: src/app.ts :: openChat, send
- kind: rationale
- logged: v0.2.0 · 2026-10-11

The conversation is fetched before `activeId` changes, then active and messages are emitted together, so the view never shows the empty greeting between two chats.

### src/app.ts · keys
- refers-to: src/app.ts :: keys
- kind: explainer
- logged: v0.2.0 · 2026-10-11

Mod+B sidebar (as claude.ai), Mod+K palette (first row New chat, as claude.ai's), Mod+J terminal, Mod+. side panel, Mod+Shift+O new chat, Mod+U add files. The listener is on bubbling `keydown`, so inside the terminal the shell keeps Ctrl+B, Ctrl+K and Ctrl+J (readline); on macOS the Cmd shortcuts still reach the app.

### src/app.ts · updateContext
- refers-to: src/app.ts :: updateContext; src/ui/composer.ts :: setContext
- kind: rationale
- logged: v0.3.1 · 2026-10-11

The meter beside the model is the last reply's `usage` (input, cache creation, cache read and output tokens) over the model's `contextWindow` from `/v1/models`: that sum is what the next turn starts from. It hides when there is no usage or no window, shows at least 1 percent, and turns to the warning colour at 80 percent. It runs on `messages`, `active` and `settings`, and on `message.completed`, because a finished reply patches its message in place rather than emitting `messages`; the first build missed that and the check caught the meter not moving.

### src/ui/composer.ts · setContext
- refers-to: src/ui/composer.ts :: setContext
- kind: warning-context
- logged: v0.3.3 · 2026-10-11

From v0.3.1 to v0.3.2 the meter never showed: `setContext` toggled `hidden` only when `hidden === !text`, which is the case where nothing should change. Its text was right, and the v0.3.1 check read the text of the hidden element and passed. Found while checking compaction in v0.3.3; the checks now require the element to be visible. The pattern in this codebase is `if (el.hidden !== want) el.hidden = want`, or the equivalent early return.

### src/ui/composer.ts · the meter's box
- refers-to: src/ui/composer.ts :: setContext; src/styles/ft-chat.css :: .ft-context
- kind: warning-context
- logged: v0.4.0 · 2026-10-11

Once the meter could show (v0.3.3), its first appearance in a new chat widened the right side of the composer bar and moved the model and mode buttons 70 px (layout shift 0.0004, found by layout-shift attribution in the v0.4.0 check). The meter keeps a 12-character box at all times and is hidden with `visibility` through `is-empty`.

### src/ui/tool-cards.ts · cards and the summary line
- refers-to: src/ui/tool-cards.ts :: ToolCard, ToolGroup, describe, resultView; src/ui/chat-view.ts :: ensurePart, applyBlock, toolStatus, toolOutput
- kind: rationale
- logged: v0.4.0 · 2026-10-11

claude.ai folds a run of tool calls into one line ("Used Clock, read 8 pages, and 21 more steps, 1 failed", UI_STUDY); Format does the same: consecutive tool blocks in a reply join one `details` group whose summary names the first two steps, counts the rest and the failures, and is closed by default. A text or thinking block ends the group, so a reply reads text, steps, text. The group opens itself only when a call waits for approval, because the approval must be seen; nothing closes on its own, so the thread never moves under the reader. Each card is created once per `tool_use` id and updated in place: the title and input when the input finishes, the state from `message.tool`, output appended to one Text node from `tool.output`, the result or links when the result block arrives (matched by `tool_use_id`, the result block itself draws nothing). The state label has a fixed 9em box so changing it does not move the line. Reloaded chats build the same cards from the stored blocks through `resultView`, which mirrors the engine's `tool_view`.

### src/ui/tool-cards.ts · question, plan and file cards
- refers-to: src/ui/tool-cards.ts :: ToolCard (buildQuestion, sendAnswer, setAnswer), FileCard, taskListHtml; src/ui/chat-view.ts :: ensurePart (send_file), applyStatuses
- kind: rationale
- logged: v0.4.1 · 2026-10-11

The question card is part of its step card, shown outside the step's `details` while the status is `asking`, and its group opens for it as for an approval. A single-choice option answers on one tap; several-choice uses checkboxes and Send; the own-answer field always sends. Afterwards the step line carries the answer, from the live view or from `meta.answers` on reload. A sent file is not a step: it gets its own card in the reply, as claude.ai shows file cards, ending the step group before it. Its size comes from the result text ("(35 bytes)") so no extra request is made. The plan's checklist is the same markup in the step and in the Outputs panel.

### src/ui/side-panel.ts · Outputs
- refers-to: src/ui/side-panel.ts :: setTasks, setOutputs; src/app.ts :: refreshOutputs
- kind: explainer
- logged: v0.4.1 · 2026-10-11

Progress, Files (Download each, Download all as a zip) and Used in this session. Each list is rebuilt only when its HTML changes, which happens on events, not while streaming. `refreshOutputs` drops a reply that arrives after the chat changed (a sequence number), so a slow answer cannot paint another chat's files.

### src/ui/chat-view.ts · nested steps
- refers-to: src/ui/chat-view.ts :: nested, applyBlock (parent), applyStatuses (meta.agents); src/ui/tool-cards.ts :: agentBox, agentSteps, agentText
- kind: rationale
- logged: v0.4.2 · 2026-10-11

A block with a `parent` belongs to the sub-agent started by that call: its steps go into a group inside the parent card's agent box (outside the card's `details`, so the sub-agent's progress shows without opening anything) and its text into a paragraph keyed by index. Nested cards are registered in the same `cards` map, so statuses, live output and approvals reach them by id with no extra routing. A nested approval opens the outer group too. The callback that does so must not read the card before its constructor returns: the card calls back during construction, and the first build threw there and left the whole reply empty.

### src/ui · hidden toggles, checked by hand
- refers-to: src/ui/tool-cards.ts :: setResult; src/ui/side-panel.ts :: setOutputs
- kind: warning-context
- logged: v0.4.1 · 2026-10-11

Two more inverted `hidden` checks were found in v0.4.1 (a step's result that was not streamed never showed; the Files empty note stayed beside a file), the same mistake as the context meter in v0.3.3. Every toggle in `src/ui` was then read by hand. The two correct shapes: `if (el.hidden !== want) el.hidden = want`, or `if (el.hidden === show) el.hidden = !show`.

### src/ui/chat-view.ts · summaries
- refers-to: src/ui/chat-view.ts :: node (compaction), paintCompaction, complete; src/app.ts :: message.completed (compactNext), compactNow
- kind: rationale
- logged: v0.3.3 · 2026-10-11

A message with `meta.compaction` is drawn as a divider, not a reply: a centred line with its state (summarizing, summarized, stopped, or the engine's reason) and the summary text behind a closed `details`. Messages above it stay on screen, as claude.ai keeps the visible conversation when it compacts; only the API request starts from the summary. `paintCompaction` patches the label, the text and the `details` visibility; the node is never rebuilt. A reply that arrives with `meta.compactNext` does not end the busy state or release the queue, because the engine is still writing the summary in the same run and a queued send would get 409; the summary's own `message.completed` does both, whether it succeeded or not.

### src/ui/views.ts · Long chats
- refers-to: src/ui/views.ts :: fillChats
- kind: explainer
- logged: v0.3.3 · 2026-10-11

The checkbox and the threshold menu write through `settings.set` on change and are filled from `settings.changed`, so the CLI and the window stay in step. A threshold set from the CLI that is not one of the four menu values is added as an option rather than shown wrong. The menu is disabled while automatic summaries are off.

### src/app.ts · shortcuts
- refers-to: src/app.ts :: shortcuts
- kind: explainer
- logged: v0.3.1 · 2026-10-11

The sheet is built once on first open into `#overlay-root` and toggled with `hidden` after that. Mod+/ toggles it, Esc or a click on the scrim closes it. The list is the same set `keys` handles, plus Enter and Shift+Enter in the composer.

---

## src/ui/sidebar.ts {#src-ui-sidebar}

### src/ui/sidebar.ts · renderList
- refers-to: src/ui/sidebar.ts :: renderList, row, head
- kind: rationale
- logged: v0.2.0 · 2026-10-11

Rows and group heads (Pinned, Today, Yesterday, Previous 7 days, Older) are cached by id and moved into order with `insertBefore` only where the order differs; a title change is a `setText`. A new chat inserts one row; nothing else is touched.

### src/ui/sidebar.ts · rows from background work wait for input
- refers-to: src/ui/sidebar.ts :: renderList (quiet, moves, deferred), the capture listeners for pointerdown and keydown
- kind: rationale
- logged: v0.7.1 · 2026-10-12

A chat started in the background (a scheduled run, an outside agent, the CLI) would insert a row at the top of Today and push every row below it down while the person is reading: a layout shift with no input behind it (measured at 0.0025 in verify_071 before this). When the list would insert or reorder rows, more than 450 ms after the last click or key press, for a chat that is not the one just opened, and the list is visible, the order change is held and applied on the next pointerdown or keydown, inside the input's grace window. Titles, activity dots and removals still apply at once, and a chat the person just started (the active one) is inserted immediately. Meanwhile the Background badge counts the new work, and a scheduled run also shows on its task's page.

### src/ui/sidebar.ts · rail
- refers-to: src/styles/ft-sidebar.css :: data-ft-sidebar="rail"
- kind: explainer
- logged: v0.2.0 · 2026-10-11

The rail is the same DOM: `.ft-label` elements hide, the search field becomes an icon, nav rows become square buttons with their titles as tooltips, recents hide and the account avatar stays at the foot (claude.ai's order, UI_STUDY § Left sidebar).

---

## src/ui/composer.ts {#src-ui-composer}

### src/ui/composer.ts and state/app-state.ts · who answers
- refers-to: src/state/app-state.ts :: route, Settings.chatEngine; src/ui/composer.ts :: renderSettings, modelMenu (Answer through); src/ui/sidebar.ts :: setKey; src/ui/chat-view.ts :: showNote
- kind: rationale
- logged: v0.12.0 · 2026-10-12

`route()` mirrors the engine's `claude_code.route` from what the window already holds: the Anthropic key's status, `keys['claude-code'].set` (Claude Code found by the engine) and the `chatEngine` setting. It decides the composer line, the sidebar's account line and the no-reply note, so a person without a key who has Claude Code is not told to add one. The window does not run anything differently: the engine picks the route on `chat.send`, and Claude Code's tools arrive already named as Format's (`bash`, `edit`, `read`), so the cards, the approval card and the question card are the existing ones. Answer through appears in the model menu only when Claude Code is found. The sidebar line also listens to `settings`, since changing Answer through changes it without a keys event.

### src/ui/composer.ts · attachments
- refers-to: src/ui/composer.ts :: renderFiles
- kind: todo
- logged: v0.2.0 · 2026-10-11

The attachment row is rebuilt with `replaceChildren` when the file list changes (a user action, cards only). v0.3.0 uploads through the engine and keys each card by its file id, patching instead. Files picked in v0.2.0 are shown, not sent.

### src/ui/composer.ts · model and effort
- refers-to: src/ui/composer.ts :: modelMenu, renderSettings
- kind: explainer
- logged: v0.2.0 · 2026-10-11

The menu follows claude.ai's model menu (UI_STUDY § Composer): current model with its description, Effort with a submenu (an explainer, Low, Medium marked Recommended, High, Extra, Max marked as most usage), then More models. Format adds Extended thinking as a row. Choices go through `settings.set`; the button patches its two spans when `settings.changed` arrives.

### src/ui/composer.ts · startEdit
- refers-to: src/ui/composer.ts :: startEdit, submit; src/ui/chat-view.ts :: edit button
- kind: rationale
- logged: v0.3.1 · 2026-10-11

Edit sits only on the most recent user message, because `chat.edit` replaces that message and its reply; claude.ai branches on edit, which needs the message tree navigation of a later release. Edit puts the text back in the box and shows the editing bar; Send then calls `chat.edit`, Cancel or an empty send leaves editing. The engine deletes the old pair with `message.deleted` events and adds the new message, so the view removes two nodes and appends, as on any send.

Superseded in v0.3.2: Edit is on every message the person sent and `startEdit` carries that message's id; sending adds a new version (see chat-view.ts · version pager).

### src/ui/chat-view.ts · version pager
- refers-to: src/ui/chat-view.ts :: node (user), render; src/app.ts :: conversation.path
- kind: rationale
- logged: v0.3.2 · 2026-10-11

A message with more than one version carries `branch` (index, count, ids) from the engine and shows previous, "n / count" and next under the bubble, as claude.ai does after an edit. A step calls `chat.branch` with the neighbouring id; the engine answers with `conversation.path`, the window replaces its message list, and the keyed render keeps every node still on the path, removes the ones that left and creates the ones that arrived, so switching versions never redraws the shared start of the chat. The pager's count and buttons are patched in `render`, not rebuilt. While a reply runs, Edit and the pager buttons are disabled; Edit is hidden with `visibility`, not `display`, so the row under the bubble keeps its 28 px and the thread does not move when a reply starts or ends.


### src/ui/composer.ts · paste
- refers-to: src/ui/composer.ts :: paste listener
- kind: explainer
- logged: v0.3.1 · 2026-10-11

Pasted files (screenshots from the clipboard included) go through `addFiles` like picked ones. Pasted text without files is left to the browser.

---

## src/ui/terminal-dock.ts {#src-ui-terminal-dock}

### src/ui/terminal-dock.ts · attach
- refers-to: src/ui/terminal-dock.ts :: open, connect, fitActive
- kind: explainer
- logged: v0.2.0 · 2026-10-11

`terminal.open` starts a PTY in the engine; the tab attaches to `WS /api/terminal/{id}`, gets the scrollback replayed, sends keystrokes as `{type: input}` and its size as `{type: resize}` whenever the fit addon changes the cell grid (a ResizeObserver on the stage). Tabs stay mounted; switching toggles `hidden`. Colours come from the theme tokens at open time.

### src/ui/terminal-dock.ts · Restart
- refers-to: src/ui/terminal-dock.ts :: restart
- kind: explainer
- logged: v0.7.0 · 2026-10-12

Restart acts on the active tab and keeps the tab, its xterm and its socket: `terminal.restart` swaps the shell in the engine, which sends `ESC c`, and xterm resets itself in that one write, so nothing is removed or rebuilt in the DOM. The size is sent again afterwards so the new shell matches the grid even if the window was resized while the old one was busy.

### src/app.ts · outside-agent consent
- refers-to: src/app.ts :: consent, onEvent (agents.consent, settings.changed); src/ui/views.ts :: SettingsView.fillOutside
- kind: rationale
- logged: v0.7.0 · 2026-10-12

`agents.consent` opens one sheet in `#overlay-root` (built once, then only its text changes and `hidden` toggles) naming the agent and the channel; Allow and Block set `outsideAgents`, which is what the waiting call in the engine polls, so the agent continues without another round trip. Allow takes focus so Enter answers. When the setting changes elsewhere (Settings, the CLI, another window) the sheet closes itself. Settings, Outside agents holds the same choice and the agents seen since the engine started; the section sits before Long chats and its text line only changes inside a hidden page or in place, so it shifts nothing.

### src/styles/ft-chat.css · xterm scrollbar
- refers-to: src/styles/ft-chat.css :: .ft-term .xterm .xterm-scrollable-element > .scrollbar
- kind: warning-context
- logged: v0.2.0 · 2026-10-11

xterm 6 draws its own scrollbar as DOM elements (VS Code's), which the universal scrollbar sheet cannot reach because it is not a native bar. It is hidden explicitly; wheel and keyboard scrolling still work. The shell check counts any visible `.scrollbar` element as a failure.

xterm's own sheet (imported from the package, not in `src/styles`) sets small z-index values (up to 11) on its layers inside `.xterm`. They only order the terminal's internal layers; every Format overlay sits in `#overlay-root` at `--z-menu` (200) or above, so nothing of xterm's can cover a menu or the palette.

---

## src/ui/palette.ts {#src-ui-palette}

### src/ui/palette.ts · render
- refers-to: src/ui/palette.ts :: render
- kind: todo
- logged: v0.2.0 · 2026-10-11

The result list is re-rendered per keystroke inside the open overlay (not a live part of the page). It is small and bounded at 50 rows; keyed rows come with full-text search in v0.3.0.

### src/ui/palette.ts · content search
- refers-to: src/ui/palette.ts :: search
- kind: rationale
- logged: v0.3.1 · 2026-10-11

Titles are matched in the window at once from the chats already loaded. From three characters on, `conversation.list` with `query` also asks the engine, which matches message text; chats found only that way join the list in their sidebar order with the hint "in messages". The engine call waits 180 ms after the last keystroke, and a reply that arrives after a newer keystroke is dropped, so results never jump back to an older query.

---

## src/ui/artifact-panel.ts and the gallery {#src-ui-artifact-panel}

### src/ui/artifact-panel.ts · opens on click, not by itself
- refers-to: src/ui/tool-cards.ts :: ArtifactCard; src/app.ts :: openArtifact, closeArtifact; src/styles/ft-shell.css :: :root[data-ft-artifact="open"] .ft-body
- kind: rationale
- logged: v0.5.0 · 2026-10-11

claude.ai opens a new artifact beside the chat on its own. Here that would narrow the chat column and reflow the text while the person is reading it, a layout shift without input, so the reply shows an artifact card (title, Version n, Open) and the panel opens when the card is clicked. Each card opens the version it published; the panel's version picker reaches the others. The panel is a second grid track of `.ft-body` (`--ft-panel-w`, at least `--ft-panel-min-w`), set by `data-ft-side="artifact"` on the root (from v0.5.1 the same track holds the files pane, `data-ft-side="files"`; v0.5.0 used `data-ft-artifact="open"`); at 760 px and below it covers the body instead (`--z-companion`). The attribute is set only after the first page has loaded, so the panel never appears empty. It is not remembered across reloads, and it closes when another chat or another view is opened, as on claude.ai.

### src/ui/artifact-panel.ts · two frames
- refers-to: src/ui/artifact-panel.ts :: load, show, frames, front
- kind: rationale
- logged: v0.5.0 · 2026-10-11

Changing an iframe's `src` blanks it until the new page paints. The panel keeps two frames on top of each other; a new version loads into the hidden one, and only its `load` event swaps visibility, after which the old frame is emptied. The header (title, picker, links) is painted after the swap too, so it always describes the page on screen. When the open artifact gets a new version (`artifact.changed`) and the person was on the latest, the panel follows to the new one the same way; on an older version it stays and only the picker gains the new entry.

### src/ui/artifact-panel.ts · sandbox
- refers-to: src/ui/artifact-panel.ts :: SANDBOX; backend app/routers/files.py :: artifact_csp
- kind: warning-context
- logged: v0.5.0 · 2026-10-11

The frames carry `sandbox="allow-scripts allow-popups allow-modals allow-downloads"` and never `allow-same-origin`: with both scripts and same-origin a page could reach `/api/commands` and remove its own sandbox. The engine's CSP sandboxes the page again for Pop out, where there is no frame. The canvas behind a page is `--ft-artifact-canvas` (white) because a page without its own background expects one, the way a browser tab shows it. Code view highlights with highlight.js as XML up to 300 KB and shows plain text above that.

### src/ui/views.ts · ArtifactsView
- refers-to: src/ui/views.ts :: ArtifactsView; src/app.ts :: openFromGallery
- kind: explainer
- logged: v0.5.0 · 2026-10-11

The Artifacts page lists every artifact, newest first, with its chat, version count and last change (time today, date before). It is loaded at start and refreshed on `artifact.changed`, `artifact.deleted`, a deleted chat and each visit, and replaced only when its markup changes. A row opens its chat and then the panel on the latest version; its menu also goes to the chat or deletes the artifact.

---

## src/ui/projects-view.ts {#src-ui-projects-view}

### src/ui/projects-view.ts · the Projects page
- refers-to: src/ui/projects-view.ts :: ProjectsView; src/app.ts :: setDraftProject, openProject, renderTitle (crumb), titleMenu (Move to project)
- kind: rationale
- logged: v0.6.0 · 2026-10-12

One page with two modes, the list of project tiles and one project, so the sidebar's Projects entry keeps one view. A project shows its chats on the left and its instructions and knowledge files on the right, as claude.ai lays it out. Instructions save on a button, not as you type, because every save changes what the next reply in each chat receives; a "Not saved" note keeps unsaved text from being overwritten when the project refreshes. Files upload through `/api/uploads` and then `project.addFile`, the same uploads chats use, and can be dropped on the page. Delete asks once in place ("Delete? Its chats are kept") rather than in a dialog. Tiles and chat rows are keyed elements updated in place; only the files list is rebuilt when it changes, as in Outputs.

New chat in this project sets a draft project: the empty chat shows "New chat in <project>" above the greeting (its space is always reserved, so showing it moves nothing), the top bar shows the project as a crumb, and the first message passes `projectId`. The draft clears on any other new chat, on opening a chat, and with the chip's close button. The crumb on a project chat opens the project; the title menu's Move to project puts a chat in a project or takes it out.

---

## src/ui/customize-view.ts and src/ui/memory-panel.ts {#src-ui-customize}

### src/app.ts, chat-view.ts, customize-view.ts · a whole-app audit and its four fixes
- refers-to: src/app.ts :: openChat (prepareOpen and renderTitle before the fetch, emit active on failure), renderTitle (opening); src/ui/chat-view.ts :: prepareOpen; src/ui/customize-view.ts :: the plugin view listener and setPluginView (only .ft-pl-view[data-plv]), setSkillView (render before the fetch), skillOffersLoaded, renderSkillOffers (the empty line), paintPlugin (ft-pl-srvstate), the message title observer in the constructor; src/styles/ft-shell.css :: .ft-pl-srv, .ft-pl-srvstate, .ft-customize .ft-proj-msg
- kind: rationale
- logged: v0.21.1 · 2026-10-18

With Phase 11 closed and the claude.ai screens still out of reach, this pass audited the whole window against the laws instead: 17 states (a long chat, the + menu, the palette, Projects, Artifacts, Scheduled, Settings, every Customize list, Discover view and page, the terminal dock) at 1920, 1280, 1100, 760, 390 and 360 px under 4x CPU, measuring overflow past the edge (allowing for clipping ancestors), visible scrollbars (an element whose scrollbar takes space while it scrolls), console and page errors, and layout shifts. Overflow, scrollbars and errors: none in any of the 102 states. It found four faults. Opening a chat from the sidebar on a slow network moved the composer from the greeting to the bottom only when `conversation.get` answered (about 680 ms after the click, a 0.0725 shift outside the input window); `openChat` now drops `is-empty` and sets the title at the click, so the move counts as the click's, and on a failed fetch re-renders the current chat. The Plugins view tabs' listener was bound to every `.ft-pl-view`, which the Skills and Connectors view tabs share for their look, so clicking Discover under Skills or Connectors also switched Plugins back to Your plugins and cleared every tab's highlight; both the listener and `setPluginView` now take only `[data-plv]`. Skills Discover showed "No skills to discover yet." and then the Anthropic button before the offers arrived, moving the line (0.0002); the line now waits for the first answer and the button's state renders at once from the known marketplaces. A plugin connector's chip moved right when its Add button disappeared (0.0003); the buttons and chip now sit in one right-aligned cell with the chip last and at least 96 px wide. The shifts the audit still lists all come from its own synthetic clicks on Hide; with real clicks and keys the terminal dock's open and close are all within the input window (checked separately). A fifth came from rerunning the v0.19.0 check after the others: the message line above each Customize list grew from one line to two when a reply's text was longer ("Added notes-kit: 2 skills, 1 connector to add on its page."), moving the list 0.0021 well after the click. In Customize the message line is now always two lines tall (18 px lines, clamped with an ellipsis), and a MutationObserver copies its text into its title so a clamped message can still be read in full; the v0.19.0 check then ran with no shift at all, the first time. The connector cell under a plugin also keeps at least 190 px, so its own box no longer moves when Add goes away.

### src/ui/customize-view.ts · Discover for skills and connectors, Skill with Claude, the command confirm, private marketplaces
- refers-to: src/ui/customize-view.ts :: CustomizeHooks.skillChat, the skills section (ft-sk-view, ft-sk-yours, ft-sk-discover, ft-sk-anthropic, ft-sk-offers), setSkillView, refreshSkillOffers, renderSkillOffers, render (four groups and groupOf), the skill page's Edit with Claude (ft-cz-edit), the connectors section (ft-cn-view, ft-cn-yours, ft-cn-discover, ft-cn-cats, ft-cn-dir), setConnectorView, refreshDirectory, renderDirectory, the directory click (sign-in tab, token entries to the form), the marketplace form's token (ft-pl-mtoken), the offers click (Run and add), the picker (.plugin); src/ui/composer.ts :: output skill, startSkill; src/ui/tool-cards.ts :: save_skill; src/app.ts :: the skillChat hook; src/state/app-state.ts :: SkillSummary.source, MarketOffer.command, MarketplaceInfo.private; src/styles/ft-shell.css :: .ft-sk-discover, .ft-cn-discover, .ft-cn-cats, .ft-cn-cat, the hidden rules
- kind: rationale
- logged: v0.21.0 · 2026-10-18

The last Phase 11 gaps, per claude.com/docs/connectors/getting-started (Discover with search and categories), claude.com/docs/plugins/overview and the marketplace reference (read 2026-10-18). Skills and Connectors gain the same Your and Discover views Plugins has. Skills Discover lists skills from the added marketplaces with Add, Added or Replace and the marketplace (or Anthropic) and plugin under the description, and offers Add Anthropic's skills marketplace (anthropics/skills) until it is added; Your skills groups them Created by you, From Anthropic and partners, From marketplaces, From plugins. Skills Add gains Create with Claude, and a skill page (not a plugin's) gains Edit with Claude: both start a chat whose pill reads Skill with Claude, typed "Help me create a skill that " or "Edit the name skill: ", and Claude's card reads "Allow Claude to save the name skill to Format?". Connectors Discover has category chips (All first) and the directory's rows with the category, how it signs in and a Docs link to the maker's page; Connect adds it and, for one that signs in, opens the server's page in a tab opened within the click; a server that needs a key opens Add custom connector filled in with No sign-in and the token field focused. A plugin with a command source asks first: its row shows the command and its button reads Run and add. Add marketplace takes an optional GitHub access token. Upload plugin takes .plugin too. Verified under 4x CPU and a slow network: the confirm then install; the .plugin upload; the token field; 19 skill offers from anthropics/skills, pdf Added and grouped under From Anthropic and partners; Edit with Claude's composer and card, the skill saved; 24 directory rows, 8 chips, a category leaving 3, DeepWiki connected live with 3 tools; no layout shift, no page errors, nothing past the edge at 390 and 360 px. The v0.15.0 to v0.20.0 checks passed again; the v0.19.0 check once showed a 0.0021 shift on the Discover pane that a rerun with timestamps did not reproduce (only its known 0.0003 chip change), so it is noted here, not fixed.

### src/ui/customize-view.ts, composer.ts, tool-cards.ts · Create a plugin, Create with Claude, /plugin:skill
- refers-to: src/ui/customize-view.ts :: CustomizeHooks.createPlugin, the Add menu (Create with Claude, Create a plugin), the editor (ft-pl-cform, fileRow, openEditor, the save handler), the plugin "..." menu (Edit files for created plugins), paintPlugin (created in Format); src/ui/composer.ts :: output 'plugin', startPlugin, setOutput, slashItems (/plugin:short labels), the slash token pattern, addPick (pill shown as plugin:short); src/ui/tool-cards.ts :: describe (add_plugin), the ask text, ALWAYS_WORD; src/app.ts :: the createPlugin hook; src/state/app-state.ts :: origin created; src/styles/ft-shell.css :: .ft-pl-cform, .ft-pl-cfiles, .ft-pl-cf, .ft-pl-cf-head, .ft-pl-cbody
- kind: rationale
- logged: v0.20.0 · 2026-10-18

Per claude.com/docs/plugins/overview (read 2026-10-18). Add gains Create with Claude and Create a plugin under a divider. Create a plugin opens an editor in the list column: name, description, a line on where skills, commands and .mcp.json go, and file cards (a path and a monospace text area each, removable), starting with a SKILL.md template; Add file appends a card. Saving runs `plugin.create` and opens the plugin's page. A plugin made here has Edit files in its "..." menu, which loads `plugin.files` into the same editor with the name read-only and the button reading Save changes (on a narrow window it returns to the list first, since the editor lives there). Create with Claude starts a new chat with the composer's output set to plugin (its pill reads Create a plugin) and "Help me create a plugin that " typed, the cursor at the end. Claude's `add_plugin` card reads "Allow Claude to add the my-kit plugin to Format?", its step "Added a plugin to Format", and Always allow reads "Always allow adding plugins". In the / menu a plugin's skills and commands read `/plugin:name` (for example `/demo-kit:ship`), so typing the plugin's name and a colon narrows to it; the trigger pattern now accepts one colon, and a picked plugin skill's pill shows the same name. Verified under 4x CPU and a slow network: "/" listed every plugin item with a colon; "/demo-kit:" showed review and ship, "sh" left ship, Enter made the pill demo-kit:ship; the editor saved weekly with Skills 1 and Commands 1 and "created in Format", Edit files loaded both files read-only by name and saved a new description; Create with Claude filled the composer and its pill, and the chat's second card asked to add my-kit, which then appeared installed; no layout shift, no page errors; the editor fit at 390 and 360 px.

### src/ui/customize-view.ts · Your plugins and Discover, marketplaces, a plugin's tabs
- refers-to: src/ui/customize-view.ts :: the plugins section (ft-pl-views, ft-pl-addmenu, ft-pl-mform, ft-pl-yours, ft-pl-discover, ft-pl-offers, ft-pl-markets), the plugin page (ft-pl-tabs, ft-pl-pane, ft-pl-cmds, ft-pl-conns rows, ft-pl-agents), wirePlugins, setPluginView, setPluginTab, renderMarkets (offerRows, marketRows), paintPlugin (servers state from state.connectors), the connectors listener; src/state/app-state.ts :: MarketOffer, MarketplaceInfo, PluginSummary (commandSkills, servers, agents, hooks, origin), the marketplaces topic; src/app.ts :: marketplace.list at start, marketplaces.changed; src/styles/ft-shell.css :: .ft-pl-views, .ft-pl-view, .ft-pl-discover, .ft-pl-market, .ft-pl-mactions, .ft-pl-offer, .ft-pl-srv, .ft-pl-tabs, .ft-pl-tab, .ft-pl-pane
- kind: rationale
- logged: v0.19.0 · 2026-10-18

Per claude.com/docs/plugins/overview (read 2026-10-18): the Plugins page has Your plugins and Discover; Add offers Add marketplace and Upload plugin (claude.ai takes .zip or .plugin; Format's uploads unpack .zip only, so the picker and its line say .zip); a marketplace has Check for updates and, for a repository, Sync automatically; a plugin's page lists each kind of part on its own tab, and its Connectors tab shows Connected, Not connected or Not added with a way to add or connect each. Discover lists every plugin the added marketplaces offer (keyed by marketplace and name), with the marketplace, version and category under the description, and Add, Added, Update or Replace (a plugin of that name installed from elsewhere); under it the marketplaces, each with Sync automatically (repositories only), Check for updates, and a "..." menu whose Remove asks once more. Adding a marketplace switches to Discover. The plugin page's tabs are Skills, Commands (as /name, opening the skill page, with a note that in chat a command loads as a skill), Connectors and Agents, each with its count; the Agents note says they run in Cowork and Claude Code, not in Format's chat, and mentions hooks when present. A connector row's state is worked out in the window from the live connector list (by `connectorId`), so it turns Connected when `connectors.changed` arrives without waiting for a plugin event; that was a defect found in the check, where the chip stayed Not connected after the engine had connected it. The marketplace rows put the "..." in the first line and the switch and buttons on the second, and an offer's meta sits under its description, since the list column is 300 to 400 px wide (the check's first screenshot had the name broken over two lines and the "..." alone on a third). Verified under 4x CPU and a slow network: Add, Add marketplace with a scratch repository, Discover selected with three offers; Add on notes-kit turned to Added; the npm entry's refusal shown; the page's by-line named the marketplace and the tabs counted one of each; Add on the connector, then Connected; a pushed 1.1.0 and Check for updates said Updated notes-kit with the connector still connected; Sync automatically reached the engine; Remove with its plugins emptied Discover; no page errors; nothing past the edge at 1920, 900, 390 and 360 px; layout shift 0.0003 from the connector chip's text changing when the engine's status arrived after the click.

### src/ui/customize-view.ts, composer.ts, menu.ts · signing in, and connectors per chat
- refers-to: src/ui/customize-view.ts :: signIn, the add form (ft-cn-auth, ft-cn-client, ft-cn-own, ft-cn-adv, ft-cn-auth-note), wireConnectors (auth, client, notes, syncKind, the add handler, rowconnect and power on needs_auth), startSignIn, lost, chipText, stateText, renderConnectors (Sign in or Reconnect on the row), paintConnector (how, power); src/ui/composer.ts :: draftOff, takeDraftConnectorsOff, connectorsOff, toggleConnector, plusMenu (Connectors); src/ui/menu.ts :: MenuItem.toggle, menuitemcheckbox, the click that keeps the menu open; src/app.ts :: send (connectorsOff); src/state/app-state.ts :: Conversation.connectors_off, ConnectorInfo (auth, transport, oauthClient, signedIn); src/styles/ft-shell.css :: .ft-cn-set, .ft-cn-own, .ft-cn-adv, .ft-cn-chip[data-s="needs_auth"]; src/styles/ft-overlays.css :: .ft-menu-switch
- kind: rationale
- logged: v0.18.0 · 2026-10-18

Per claude.com/docs/connectors/custom/add-unlisted and /getting-started (read 2026-10-18). Add custom connector gains Authentication (Sign in when needed, the default; Sign in now; No sign-in) with a line saying what each does, OAuth client (Register automatically or Use your own OAuth client, with Client ID and a secret only if the server requires one), and Advanced, Transport (automatic, Streamable HTTP or SSE). The access token field shows only with No sign-in, since sign-in owns the Authorization header. Sign in now opens the server's page as soon as the connector is added; Sign in when needed connects and, if the server asks, the row shows Sign in (or Reconnect when a sign-in stopped working) in place of its chip, and the page's main button reads the same. `signIn` opens a blank tab inside the click and points it at the URL once `connector.signin` answers, so the browser does not block it as a pop-up; after approval the engine's callback page says to come back, and the row turns Connected by itself from `connectors.changed`. The page's line says how it signs in (signed in with your OAuth client, or with a client Format registered) and SSE when set. The + menu's Connectors are now on or off for this chat, as claude.ai's are, drawn as switches (`toggle` on a menu item: role menuitemcheckbox, aria-checked flipped in place, the menu stays open so several can be set); a note at the top says whether they apply to this chat or the one you are about to start. In a new chat the choices are a draft passed to `chat.send` as `connectorsOff` and cleared after; a disconnected connector offers Customize, and one waiting for sign-in offers Sign in. Verified under 4x CPU and a slow network: the draft switch flipped and the menu stayed open; the new chat was created with notes off and its request carried no notes tool; in that chat the switch read off, turning it on reached the engine and read on when reopened; a fresh chat's draft read on again; the form's sections showed and hid by choice; Sign in now with own-client opened the server's page, Approve led to the engine's Signed in page, and the connector listed whoami and echo with the chip Connected; a needed connector's row showed Sign in with no chip, then Connected after approval; no page errors; at 390 and 360 px both menus and the form fit with nothing past the edge. Layout shift: 0.0066 from rows inserted when the check added connectors through the engine while the list was open, and 0.0001 twice from a row's chip and button swapping, neither from input in the window.

### src/ui/customize-view.ts · the list beside the page, switches, "..." menus, skill groups
- refers-to: src/ui/customize-view.ts :: the skill and plugin page heads (ft-cz-on, ft-pl-on as ft-switch, ft-cz-more, ft-pl-more, ft-cz-delete, ft-pl-delete as ft-danger-btn), ft-cz-pick, setDetail, open, openConnector, openPlugin, showList, remove, render (skHeads, ft-cz-group, the keyed seq), counts, filterSection; src/styles/ft-shell.css :: .ft-customize input.ft-switch, .ft-switch-label, .ft-danger-btn, .ft-cz-row.is-selected, .ft-cz-group, .ft-cz-pick, the 1099 px and 1100 px rules, .ft-cz-name, .ft-field.ft-check input:not(.ft-switch), the 480 px rule (.ft-sk-list .ft-cz-row-meta)
- kind: rationale
- logged: v0.17.0 · 2026-10-18

The owner said the UI and its interactions were still not right. The documented shape stays (a full page with Skills, Connectors and Plugins lists, each with search, an Add menu and a page per item, per UI_STUDY's changelog note of 2026-09-17), and how it is used changes. From 1100 px the page is two columns: the list (300 to 400 px) and the open item beside it, each scrolling on its own, so picking another item never leaves the list; with nothing open the right column shows a dashed "Pick a skill, connector or plugin" pane, and the Back links are hidden there since the list is in view. Under 1100 px it stays page to page with Back. `setDetail(kind)` is the one place that sets `data-detail` on the root and marks the open row (`is-selected`, `aria-current`), each only when it changes; `counts()` re-applies it after every render so a keyed re-render keeps the mark. On and off are switches (`role="switch"`, a 30 by 18 track drawn on the checkbox itself) in the rows and in each page head, labelled Enabled. Delete and Remove moved into a "..." menu on the skill and plugin pages, like the connector page; the menu shows a red confirm button ("Delete? This cannot be undone", "Remove with its skills and connectors?") and only that button acts, so `remove()` no longer arms itself. A plugin's skill shows Delete disabled with a note to remove the plugin. Skills are grouped Created by you, then From plugins (labels keyed in `skHeads`, placed only when the group changes, hidden by search when their group has no match). Two defects found in the check and fixed: `.ft-field.ft-check input` sized the head switch to 16 px (its specificity tied and it came later), so it now skips `.ft-switch`; and `.ft-cz-name` at `flex: 1` shrank to a column of letters beside the buttons, so it now has a 14rem basis and the buttons wrap under it. Verified under 4x CPU and a slow network at 1280: list and page side by side (list at x 312, page at 736), the open row marked and moved on a second pick, the head switch turned the skill off and on in the engine, both "..." menus showed their confirm, groups in order, a tab change closed the page; no layout shift, no page errors; at 1920, 1100, 900, 760, 390 and 360 px nothing past the edge, below 1100 the list hidden while a page is open and Back bringing it back; a plugin's skill showed Delete disabled with its note, and search for "ship" left only the From plugins label. At 360 px a plugin skill's name broke into three lines beside its meta, so under 480 px a skill row's meta (plugin, file count) is hidden; both stay on the skill's page. The v0.13.0 to v0.16.0 window checks passed again (with Ask set before each, since the v0.13.0 check leaves Allow all on). The claude.ai screens themselves were not available (the built-in browser was signed out), so spacing and wording are unconfirmed against them.

### src/ui/customize-view.ts · a connector's page: status, Disconnect, the "..." menu, tool permissions
- refers-to: src/ui/customize-view.ts :: the connector page template (ft-cn-chip, ft-cn-power, ft-cn-delete, ft-cn-more, ft-cn-perm-head, ft-cn-perm, ft-cn-perm-note), the add form (ft-cn-headers), wireConnectors (power, more, delete, the change listener on the page, headers parsing), powerConnector, chipText, stateText, renderConnectors (ft-cn-rowstate, ft-cn-rowconnect), openConnector, paintConnector; src/state/app-state.ts :: ConnectorInfo (headerNames, defaultPermission, tools.permission), ToolPermission; src/styles/ft-shell.css :: .ft-cn-tool, select.ft-cn-perm, .ft-cn-perm-head, .ft-cn-perm-all, .ft-cn-perm-note, .ft-cn-chip, .ft-cn-rowstate, the 480 px rule
- kind: rationale
- logged: v0.16.0 · 2026-10-18

Per claude.com/docs/connectors/getting-started: a connector page has Tool permissions (Always allow, Needs approval, Blocked, per tool or for a group), Disconnect (the row then shows Connect), a "..." menu with Remove, and Reconnect when access is lost. The page head now has a status chip (Connected, Connected through Anthropic, Connecting, Needs reconnecting, Disconnected), a Disconnect or Connect button, and a "..." menu with Reconnect and Remove; Remove shows a confirm button beside it rather than deleting at once. The tools are a list of rows with a select each, and an All tools select above them that reads Mixed when they differ; a note under the heading says what the permissions do on this connector's route (Needs approval on a public server moves it to the engine, and back when nothing needs approval). A list row shows its chip while connected and a Connect button while disconnected (it turns the connector on and connects it), in place of the on and off checkbox. The add form gains request headers, one `Name: value` per line, for servers reached by URL. The tool rows are rebuilt only when the connector's tool names change (keyed by id and names); permission changes set each select's value in place. Verified under 4x CPU and a slow network: the row read Connected; the selects showed ask for a local server and changed the engine; All tools read Mixed; Disconnect, then the row's Connect, then Connected; the "..." menu and the confirm; layout shift none; no page errors; at 390 px nothing past the edge, All tools on one line. Still to come in Phase 11: the custom connector's sign-in choices with OAuth, and connectors on or off per chat from the + menu.

### src/ui/customize-view.ts · claude.ai's shape: tabs, search, Add, the file browser
- refers-to: src/ui/customize-view.ts :: CustomizeHooks (tryInChat), the template (ft-cz-tabs, data-sec, ft-cz-search, ft-cz-add, ft-sk-list, ft-cz-try, ft-cz-browser, ft-cz-tree, ft-cz-viewer), showTab, filterSection, counts, showFile, open (the tree), render, renderPlugins and renderConnectors (counts); src/app.ts :: CustomizeView hooks; src/styles/ft-shell.css :: .ft-customize .ft-cz-main:not([hidden]), .ft-cz-tabs, .ft-cz-tab, .ft-cz-count, .ft-cz-actions .ft-cz-search, .ft-cz-browser, .ft-cz-tree*, .ft-cz-viewer*, .ft-cz-raw, the 900 and 480 px rules
- kind: rationale
- logged: v0.15.0 · 2026-10-18

Sources read 2026-10-18 (through a research agent): claude.com/docs/skills/overview (Customize > Skills, Your skills, a switch on the skill page, SKILL.md and files readable before turning a skill on, plugin skills labelled with their plugin), claude.com/docs/connectors/getting-started and /custom/add-unlisted (Your connectors, Add custom connector), claude.com/docs/plugins/overview (Your plugins, Upload plugin). Customize was three stacked lists; it is now a left column of Skills, Connectors and Plugins with counts (top tabs under 900 px) and one section at a time (`data-tab` on the page, sections keep their DOM), each with a search box that hides rows in place and claude.ai's Add actions: Upload a skill and Write a skill under Add, Add custom connector, Upload plugin. A skill's page lists SKILL.md and every other file; picking one shows it in the viewer (SKILL.md and other .md rendered, anything else as wrapped text, through `skill.read`), and Try in chat opens a new chat with the skill's pill in the composer. Found and fixed while doing it: `this.list` took the first `.ft-cz-list` on the page, the Plugins list since v0.10.3 put Plugins first, so skill rows were inserted into the Plugins list; it is now `.ft-sk-list`. The page's new grid rule first beat `.ft-cz-main[hidden]`, so a skill's page showed under the list; the rule now applies only `:not([hidden])`. Verified under 4x CPU and a slow network: counts Skills 4, Plugins 1; the search found release-notes; tabs hid the other sections; the skill page replaced the list and showed SKILL.md then references/guide.md; Try in chat opened the chat with the test-skill pill; layout shift none with real typing; no page errors.
Still to come for parity (DEV_PLAN Phase 11): Discover tabs (skills directory, the connector directory, plugin marketplaces by Git URL or owner/repo), per-tool connector permissions (Always allow, Needs approval, Blocked), Disconnect and the custom connector's sign-in options, plugin pages with a tab per component and Check for updates.

### src/ui/customize-view.ts · skills
- refers-to: src/ui/customize-view.ts :: CustomizeView; src/ui/composer.ts :: plusMenu (Skills), useSkill; src/ui/tool-cards.ts :: describe (skill)
- kind: rationale
- logged: v0.6.1 · 2026-10-12

Customize lists the installed skills as keyed rows with an on/off box, and opens one skill on the same page (its description, file chips and SKILL.md rendered without its frontmatter). Skills arrive as a .zip of the folder or a SKILL.md, through the button or dropped on the page, or are written in a form that becomes SKILL.md. Delete asks once in place. The + menu's Skills submenu lists the skills that are on; picking one puts "Use the <name> skill." at the start of the message, which is plain text the person can see and change, rather than a hidden flag; the system prompt already lists every skill, so the name is enough for Claude to load it. Connectors keep a note until v0.6.2.

### src/ui/customize-view.ts · connectors
- refers-to: src/ui/customize-view.ts :: wireConnectors, renderConnectors, paintConnector; src/ui/composer.ts :: plusMenu (Connectors); src/ui/tool-cards.ts :: connectorParts, ToolCard (remote)
- kind: rationale
- logged: v0.6.2 · 2026-10-12

Connectors sit under Skills on Customize: keyed rows with the name, a state line, a badge for where the calls run ("Anthropic" for a public https server sent through the API's MCP connector, "Engine" for one the engine runs), and an on/off box. Add connector takes a name and either a URL with an optional token or a command, then connects at once and reports the tool count or the error. A connector's page lists its tools with a box each (turning one off removes it from Claude's tools, or becomes an `enabled: false` config for the API), Reconnect, and Remove, asking once. A public server whose tools cannot be listed from this computer still works through Anthropic; its page says so rather than calling it failed. The + menu's Connectors turns each on or off in place. In a reply, an engine-run call (`mcp__<connector>__<tool>`) and an API call (`mcp_tool_use`, whose name is rebuilt the same way from `server_name`) both read "Used <tool>" with "<connector> connector" beside it; engine-run calls ask "Allow Claude to use <tool> from the <connector> connector?", and their input shows as JSON. Outputs counts connector calls.

### src/ui/memory-panel.ts · memory in Settings
- refers-to: src/ui/memory-panel.ts :: MemoryPanel; src/app.ts (appended after About)
- kind: rationale
- logged: v0.6.1 · 2026-10-12

The Memory section turns the memory setting on and off and shows one memory at a time, chosen by Memory of (chats outside projects, or a project). Its file list is the last thing on the Settings page, and the New and editor controls sit above it: the list changes when Claude writes memory or the scope changes, often more than half a second after any click, and anything below it would count as a layout shift (the first version, placed before API keys, measured 0.0006). Changing the scope and deleting remove rows at once, in the same input, and the empty note follows from the list. Files open in an editor with their path fixed; a new file takes a path under /memories.

---

## src/ui/files-pane.ts, comments and activity {#src-ui-files-pane}

### src/ui/files-pane.ts · one side track, two panes
- refers-to: src/app.ts :: side, setSide, closeSide, openFiles, toggleFiles; src/styles/ft-shell.css :: :root[data-ft-side]
- kind: rationale
- logged: v0.5.1 · 2026-10-12

The files pane and the artifact panel share the second track of `.ft-body`; `data-ft-side` names which one shows, so opening one replaces the other without a second reflow of the chat column. Both are placed with `grid-column: 2` (and `1` in the narrow overlay, where an absolutely placed grid item would otherwise sit in an empty implicit column). The pane is tied to one chat: switching chats closes it, and closing it pauses any playing video or audio, since a hidden media element keeps playing. It opens from the folder button in the top bar, the palette, a file card's name, a file in Outputs, and a comment card in a sent message.

### src/ui/files-pane.ts · previews without a blank
- refers-to: src/ui/files-pane.ts :: open, settle, .ft-fv-layer
- kind: rationale
- logged: v0.5.1 · 2026-10-12

Each preview is built as a new layer inside the view, hidden (`is-loading`) until it is ready (an image decoded, a frame loaded, media metadata read, or text fetched and rendered, with a 4 s ceiling), and only then are the older layers removed. So moving between files, and a file that changes on disk while open (`files.changed` after bash, write and edit, compared by size and modified time), never shows an empty pane. Images get `?v=` with the modified time so the browser does not show a stale copy. HTML files preview in a frame with an empty `sandbox` attribute and the engine's sandbox CSP, so their scripts do not run; PDFs use the browser's viewer, which a sandbox would block, and are served without the CSP for that reason. Markdown renders with the chat's renderer; code is highlighted by extension up to 300 KB; text is read through `files.read` (1 MB cap, marked when cut).

### src/ui/files-pane.ts · comments on a block
- refers-to: src/ui/files-pane.ts :: hoverBlock, onSelection, startComment, addComment; src/ui/composer.ts :: addComment, dropComments; src/ui/chat-view.ts :: .ft-comment-card
- kind: rationale
- logged: v0.5.1 · 2026-10-12

In a Markdown preview, hovering a top-level block offers Comment for that block; in Markdown and code, selecting text offers Comment for the selection. The comment form quotes the passage and adds the comment to the composer as a chip, like an attachment, rather than sending at once: several comments can go with one message and the person can still write. They are sent as `chat.send` `comments` and shown above the message as cards that reopen the file. The button keeps the selection by cancelling its own mousedown. Comments belong to the chat whose files they quote, so switching chats drops unsent ones.

### src/ui/sidebar.ts · activity dots
- refers-to: src/ui/sidebar.ts :: paintActivity, markActivity; src/app.ts :: setWaiting; src/state/app-state.ts :: waiting
- kind: explainer
- logged: v0.5.1 · 2026-10-12

A chat row shows a dot while its reply runs (pulsing accent) and a steady warning dot while an approval or question waits. Running comes from `message.added` and `message.completed`; waiting from `message.tool` statuses `waiting` and `asking`, kept per chat as a set of tool ids so parallel waits clear correctly. At start `conversation.list`'s `activity` seeds both (a waiting chat whose ids are unknown gets the placeholder `*`, cleared by its next status). The dot sits where the row's More button appears and hides on hover and on the active row, so it never shifts the title.

---

## src/ui/scheduled-view.ts and src/ui/background-panel.ts {#src-ui-scheduled}

### src/ui/scheduled-view.ts · the Scheduled page
- refers-to: src/ui/scheduled-view.ts :: ScheduledView (renderList, open, renderHistory, save, syncFields)
- kind: explainer
- logged: v0.7.1 · 2026-10-12

The page replaces the v0.2 placeholder. The list is keyed rows (name, cadence in words, next run and the last run's status in one left-aligned text block, so a status change never moves anything, and a checkbox to pause); New task opens one form shared with Edit, whose time, day and date fields show for the cadences that use them. A task's page has Run now, Edit, Pause or Resume, Delete (asks once in place), the prompt, and its runs as keyed rows that open their chat. `schedule.changed` and `schedule.deleted` patch the list; a finished reply in a run's chat refreshes the open task, which also polls every 4 s while a run is running or waiting. The page uses its own `ft-sch-` classes, not the Projects page's: a shared `.ft-proj-list` made the Projects check find two lists (the same lesson as `.ft-saved` in v0.6.0).

### src/ui/background-panel.ts · Background
- refers-to: src/ui/background-panel.ts :: BackgroundPanel; src/app.ts :: paintBadge
- kind: explainer
- logged: v0.7.1 · 2026-10-12

The top-bar button carries a badge with the number of chats working or waiting, painted from the window's own running and waiting sets (the same ones behind the activity dots), amber when anything waits. The popover lists them from `background.list` (title, Working or Waiting for you, the scheduled task, elapsed time), keyed by chat, with Stop; a row opens its chat. The badge sits absolutely inside the fixed-size button and is hidden by `:empty`, so it never changes the top bar's layout.

### src/ui/terminal-dock.ts · the Claude tab
- refers-to: src/ui/terminal-dock.ts :: ensure, adopt, mount, select
- kind: explainer
- logged: v0.7.1 · 2026-10-12

The engine's read-only agent terminal is adopted as a tab when `terminal.opened` arrives with kind agent, or from `terminal.list` when the dock opens, without taking focus or the active tab; its xterm has stdin off and the cursor hidden, and Restart is disabled while it is selected. Opening the dock still makes a shell if none exists. New terminal (+) moved to the right-hand group beside Restart and Hide: tabs are appended to the left-hand list, and with + after them each new tab pushed it sideways, a small shift (0.0001) whenever a tab arrived without a click.

### src/styles/ft-shell.css · artifact header
- refers-to: src/styles/ft-shell.css :: .ft-art-title, .ft-art-spacer
- kind: warning-context
- logged: v0.7.1 · 2026-10-12

The title now takes the free space (`flex: 1 1 0`) and the spacer is a fixed gap (v0.8.0: scoped to `.ft-art > .ft-art-head`, because the files pane borrows the same header classes and its title moved with the general rule), so when the version picker appears with a second version it takes room from the title and the Preview and Code tabs stay put. Before, the picker pushed the tabs right (0.0006, the intermittent shift noted in v0.7.0's verify_050).

---

### src/styles/ft-shell.css · the files pane's back slot
- refers-to: src/styles/ft-shell.css :: .ft-files-back[hidden]; src/ui/files-pane.ts :: toggle
- kind: warning-context
- logged: v0.8.0 · 2026-10-12

A preview swaps in only after its file has loaded (no blank frame), so the back button appeared then, after the click's grace window, and pushed the title right by its width (a shift of up to 0.0001 in verify_051 once shift sources were recorded). The button now keeps its slot while hidden (`visibility: hidden` instead of `display: none`), so the title sits in the same place in the list and in a preview.

### src/ui/views.ts · Native renderer in About
- refers-to: src/ui/views.ts :: SettingsView.fill
- kind: explainer
- logged: v0.8.0 · 2026-10-12

About gains one fact, filled once from `native.status` at start: not built, built and off, on with the adapter and backend, or on with the probe's error. The terminal in the window is unchanged; the native renderer serves `terminal.snapshot` and the desktop shell to come.

---

## Gap closures in the window {#src-gaps}

### src/ui/find-bar.ts · find in page without touching the DOM
- refers-to: src/ui/find-bar.ts :: FindBar; src/app.ts :: keys (Mod+F), the palette entry; src/styles/ft-overlays.css :: .ft-find, ::highlight
- kind: rationale
- logged: v0.10.0 · 2026-10-12

Mod+F opens a find bar over the current view (the chat thread, or the open page). Matches are Range objects painted with the CSS Custom Highlight API (`ft-find` for all, `ft-find-current` for the current one), so the thread's DOM is never wrapped in mark elements, split or re-rendered: the check counted 0 mutations in the thread while finding. Text in hidden or unrendered elements is skipped; a match inside a closed details group (the tool steps) is counted and the group opens when that match becomes current, the way the browser's own find opens details. The current match is scrolled to a third of the way down when it is off screen (scrolling is not a layout shift). Up to 2,000 matches; the bar closes on Esc, on a view change and on a chat change, clearing the highlights.

### src/ui/composer.ts · the Research pill
- refers-to: src/ui/composer.ts :: setResearch, researchOn; src/app.ts :: send
- kind: explainer
- logged: v0.10.0 · 2026-10-12

The + menu's Research item now turns Research mode on for the messages that follow; a pill beside the microphone shows it and turns it off when clicked. Each send carries `research: true` while it is on, and the reply's footer reads "model · research". The pill appears only through the person's own click, so it moves nothing without input.

### src/ui/doc-view.ts · documents, slides and sheets beside the chat
- refers-to: src/ui/doc-view.ts :: DocView, kindLabel, exportsFor; src/ui/artifact-panel.ts :: show, the export menu; src/ui/chat-view.ts :: write_document cards; src/ui/tool-cards.ts :: write_document steps; src/ui/composer.ts :: setOutput (Create picker)
- kind: rationale
- logged: v0.10.1 · 2026-10-12

HTML pages stay in the sandboxed double-buffered iframes; documents, slides and spreadsheets render natively in the panel from their source, because comments need the window and the source is plain text Format controls. Sections and slides are keyed by position and re-rendered only when their own source changed, so a document growing section by section updates in place; spreadsheet cells are patched with `setText`. Each document section has a Comment button that opens a note box and adds a comment chip to the composer. Slides show one at a time with previous, next, arrow keys and Present (fullscreen); spreadsheets show a grid with row numbers and right-aligned numbers. The download button becomes an Export menu (Word, PDF, Markdown; Excel, CSV; PowerPoint, PDF). In the chat, the first `write_document` call is an artifact card (opening it shows the latest version) and later section writes are steps in the tool group; a `write_document` block arriving without its input yet is held until the input arrives, so the right element is created once. The + menu's Create submenu sets a one-message pill (Document, Spreadsheet, Slides) that sends `output` and clears after sending.

### src/ui/artifact-panel.ts · Share
- refers-to: src/ui/artifact-panel.ts :: shareMenu, .ft-art-share; src/ui/icons-ft.ts :: share; src/styles/ft-overlays.css :: .ft-menu-note (overflow-wrap)
- kind: explainer
- logged: v0.10.2 · 2026-10-12

The Share button makes or reuses the artifact's link (`artifact.share`) and opens a menu: a note on who can open it (anyone on the network while other devices are open, otherwise only this computer), the link itself, Copy link, Open link and Stop sharing. Menu notes wrap anywhere so a long link stays inside the menu.

### src/ui/views.ts · Settings, Other devices
- refers-to: src/ui/views.ts :: refreshDevices, toggleDevices, paintDevices, #ft-set-devices; src/ui/icons-ft.ts :: devices; src/styles/ft-shell.css :: .ft-dev-*
- kind: explainer
- logged: v0.10.2 · 2026-10-12

One button opens or closes Format to other devices on the network; while open the section shows the pairing QR (inline SVG from the engine), the pair link and any other addresses, and Forget paired devices unpairs everything. The pairing box keeps its reserved size whether shown or not changes only through the person's click, so nothing moves without input.

### src/app.ts · phones and the first socket open
- refers-to: src/app.ts :: load (stream.onState), setView; index.html :: the layout boot script
- kind: rationale
- logged: v0.10.2 · 2026-10-12

The chat list is fetched before the event socket opens, so a chat created in between (another device sending at that moment) would be missing until reload; on the socket's first open the list is read once more and only the missing chats are added. On a phone-width window (760 px or less) the sidebar is an overlay drawer, so it starts closed whatever the stored preference says and closes when a view or chat is chosen, as claude.ai's mobile layout does; the boot script decides it before first paint. A chat arriving from another device while the sidebar is visible still waits for the person's next touch or key before rows move (sidebar.ts renderList).

### src/ui/browser-pane.ts · the Browser pane
- refers-to: src/ui/browser-pane.ts :: BrowserPane, update, loadFrame, flushTyping; src/app.ts :: toggleBrowser, setSide ('browser'), browser.frame events, .ft-browser-toggle; src/styles/ft-shell.css :: .ft-br-*, .ft-browser-dot
- kind: rationale
- logged: v0.10.3 · 2026-10-12

The pane shares the side track with artifacts and files. It shows the engine's latest frame in an image with a fixed 16:10 box, so a new frame never changes size; each frame is fetched as a blob, decoded off screen and only then swapped in, so there is no blank or half-drawn image between frames. The person uses the page directly: a click is sent as a fraction of the image (`click_at`), the wheel scrolls (at most four steps a second), printable keys are batched for 150 ms and typed, and Enter, Tab, arrows and the like are pressed. The address bar follows the page unless it has focus. The pane does not open by itself when Claude browses: the globe in the top bar shows a dot while the browser is open, and Claude's steps read "Opened a page in the browser", "Typed in the browser" in the tool group.

### src/ui/browser-pane.ts · sized to the pane, and Install
- refers-to: src/ui/browser-pane.ts :: fit, show (ResizeObserver), the click handler, update (Install the browser); src/styles/ft-shell.css :: .ft-br-frame, .ft-br-body, .ft-br-install; frontend/public/splash.html
- kind: rationale
- logged: v0.11.0 · 2026-10-12

From v0.11.0 the frame fills the pane's body (absolutely placed, `object-fit: contain` at the top left) and the pane tells the engine its CSS size, debounced 200 ms, whenever the body changes size; the engine draws at that size at twice the density, so text is as sharp as the rest of the window and the image never changes the layout (the body's size comes from the grid, not the image). Clicks map through the image's natural size, so a frame from before a resize still lands where it shows. When the engine has Playwright but no Chromium (the desktop app's first run), the empty pane says so and offers Install the browser, then shows the download until it ends. `public/splash.html` is the desktop app's splash, shipped in `dist` like the favicon.

### src/styles/ft-shell.css · light frames inside a dark window
- refers-to: src/styles/ft-shell.css :: .ft-art-frame, .ft-fv-frame (color-scheme: light)
- kind: warning-context
- logged: v0.11.0 · 2026-10-12

The window is `color-scheme: dark`. Chromium paints a white canvas under an iframe whose page does not declare a colour scheme, so artifact and HTML previews without a background of their own looked like a browser tab; WebKit (the desktop app on Linux, and Safari's engine on macOS) instead let the frame inherit the dark scheme, and such pages showed black text on the dark panel. Both frames now declare `color-scheme: light` on the iframe element, which WebKit applies to the framed page; found by running the Linux desktop build, checked there and in Chromium.

### src/ui/save.ts · downloads in the desktop app
- refers-to: src/ui/save.ts :: setDesktop, save, interceptDownloads, notify; src/app.ts :: load (setDesktop from app.info), interceptDownloads; src/ui/artifact-panel.ts :: the Export menu (save), data-own-click; src/styles/ft-overlays.css :: #toast-root, .ft-toast
- kind: rationale
- logged: v0.11.0 · 2026-10-12

When `app.info` says the engine runs in the desktop app, a capture-phase click listener takes over every same-origin `/api/` link that is a download (a `download` attribute, `?download=1`, or an `/export/` path) and calls `files.save_download` instead, then shows "Saved <name> to Downloads" in a toast in the family's `#toast-root` (fades by opacity, so nothing moves). The Export menu calls `save()` directly because its links are never in the document. The artifact panel's Download button opens the Export menu for documents, sheets and decks, so it carries `data-own-click` there and the listener leaves it alone. In the web build `save()` is the plain anchor click it was before and the listener does nothing.
### src/ui/customize-view.ts · Plugins
- refers-to: src/ui/customize-view.ts :: wirePlugins, renderPlugins, openPlugin, paintPlugin; src/ui/icons-ft.ts :: plugin
- kind: explainer
- logged: v0.10.3 · 2026-10-12

Plugins come first in Customize, as on claude.ai: a row per plugin with its part counts and an On switch, Add a plugin (a .zip), and a page per plugin with version, author, description and its skills and connectors as links to their own pages. Skills that came from a plugin show the plugin's name in their row.

---

## Chat feel: drop, skills, Allow all, follow, sides {#src-chat-feel}

The owner's v0.12.0 screenshot (the desktop app on the Claude Code route, an approval card waiting on every edit) asked for six things: file drag and drop, skills that activate, a chat that reads like claude.ai, a switch to stop approving each request, a reply that is followed to the bottom, and the person's messages and Claude's on their own sides.

### src/ui/chat-view.ts · follow, pinned
- refers-to: src/ui/chat-view.ts :: pinned, autoTop, follow, the scroll, wheel, touchmove and keydown listeners, the ResizeObserver, render (switching, new user message), applyDelta, applyBlock, toolOutput
- kind: rationale
- logged: v0.13.0 · 2026-10-18

Before: each change measured `nearBottom()` (within 48 px) first and scrolled after, so anything that grew the thread outside those call sites (an approval card opening, a code block highlighting, an image, the tail turning into a finished block) left the view more than 48 px short and the follow stopped for good. Now `pinned` says whether the person is following. It turns off only on the person's own input (wheel up, touch drag, ArrowUp, PageUp, Home, or a scroll that lands away from the bottom and was not ours: `autoTop` holds the offset `follow()` last set, so our own scroll events are told apart) and turns back on when they reach the bottom, press the arrow button, send a message or open another chat. A ResizeObserver on the thread and the scroller calls `follow()`, which runs after layout and before paint, so growth from any source is followed in the same frame with no visible jump. The old `stick` captures at each call site are gone; those sites call `follow()`, which is a no-op when not pinned. Measured under 4x CPU and a slow network: 0 px from the bottom at every sample while a long reply streamed and when the approval card opened; a wheel up of 700 px stayed put while the reply went on; with the observer stubbed out for comparison the gap reached 83 px.

### src/ui/chat-view.ts · the drop zone
- refers-to: src/ui/chat-view.ts :: dropZone, the dragenter, dragover, dragleave and drop listeners on root, the window dragover and drop guards; src/ui/composer.ts :: addFiles (now public); src-tauri/src/main.rs :: open_main (disable_drag_drop_handler)
- kind: rationale
- logged: v0.13.0 · 2026-10-18

Files dropped anywhere on the chat (thread, greeting or composer) go through `composer.addFiles`, the same path as the picker and paste, then the composer takes focus. An overlay card (`.ft-drop`, absolute over `.ft-center`, `--z-temp`, `pointer-events: none`) shows while files are over the chat; a depth counter over dragenter and dragleave hides it when the drag leaves. Only drags carrying `Files` are touched, so text drags inside the page behave as before. The composer's own drop listener still runs first; it calls `preventDefault`, and the chat's listener skips an event already handled, so a file is never added twice. Two window listeners stop the webview from navigating to a file dropped outside every zone. In the desktop app, Tauri's native drag-drop handler took file drops before the page saw them (docs.rs, tauri 2.12.4, WebviewWindowBuilder::disable_drag_drop_handler: required for HTML5 drag and drop on Windows; react-dropzone's Tauri guide: the native layer intercepts OS file drops before the webview), so the main window now disables it; nothing in the shell listened to Tauri's drag-drop events.

### src/ui/slash-menu.ts and composer.ts · the / menu
- refers-to: src/ui/slash-menu.ts :: SlashMenu (setItems, open, filter, key, mark, pick); src/ui/composer.ts :: slash, picks, pickRow, slashToken, slashItems, syncSlash, pickSlash, addPick, removePick, renderPicks, useSkill, submit (the /name prefix), renderRunning (typed); src/ui/chat-view.ts :: node (user: skillNames, .ft-msg-skills); src/styles/ft-chat.css :: .ft-slash*, .ft-skill-pill, .ft-msg-skill, .ft-composer (position relative)
- kind: rationale
- logged: v0.15.0 · 2026-10-18

The owner asked for a real / command menu like claude.ai's. Sources read 2026-10-18 (through a research agent): claude.com/docs/plugins/overview (typing / lists skills with the plugin each came from; plugin commands in the same menu; filtering by the plugin name), claude.com/docs/cowork/changelog of 15 Oct 2026 (Enter selects the highlighted item; a / word after other words opens it), support.claude.com articles 16761823 (/deep-research) and 13837440 (plugins in chat). Not documented anywhere found: arrow, Tab and Escape behaviour, grouping, and whether a pick becomes a chip; Format's choices for those are its own.
The menu is its own module, mounted once inside the composer and anchored by `bottom: 100%`, so it opens upward and filtering, which only toggles `hidden` on keyed rows and group labels, shrinks it from the top while its bottom edge stays put (measured: bottom 349 px at 370 px and at 183 px tall). Its list height is capped on open to the room above the composer, so in a new chat (composer mid-screen) it never runs under the top bar. It opens for a `/word` at the caret after the start or a space, anywhere in the message; groups are Commands (files, Research, document, spreadsheet, slides, Summarize earlier messages, Manage skills), Skills, and one group per plugin; the search text includes the group, so typing a plugin's name lists its commands. Up and Down move (wrapping), Enter or Tab picks, Escape closes; pointer down on the menu keeps the caret in the input, so blur does not close it before the click lands. A skill pick removes the typed `/word` and adds a pill to the bar (Backspace at the start of an empty input removes the last); on send the pills become a leading `/name /name`, which the engine already loads for that turn, and the person's message shows them as chips above the bubble, with Edit keeping them. The + menu's Skills now adds the same pill instead of the sentence "Use the name skill." A message of only pills can be sent.

### src/ui/composer.ts · /skill
- refers-to: src/ui/composer.ts :: slash, slashMenu, pickSlash, the input and keydown listeners
- kind: removed-code
- logged: v0.13.0 · 2026-10-18, replaced v0.15.0 · 2026-10-18

Replaced in v0.15.0 by the / menu above: the v0.13.0 menu opened only for a lone `/` at the start, used the shared dropdown, was not filtered and wrote `/name ` into the text. Its code (`slashMenu`, `pickSlash`, the `/^\/[a-z0-9-]*$/` checks in the input and keydown listeners) is gone; the history is in v0.13.0's commit.

Typing `/` into an empty composer opens a Skills menu of the enabled skills above the input; clicking one, or Enter on a prefix (`/dev` then Enter), makes the message start `/name `. ArrowDown, ArrowUp or Tab moves focus into the menu. Typing anything that is not a `/name` prefix closes it. The menu is opened once, never rebuilt per keystroke, so it cannot flicker; it is not filtered as you type for the same reason (hiding rows would move a menu placed above its anchor). The engine treats `/name` and "use the name skill" as an invocation (see backend log, Skills invoked by name). The + menu's Skills still inserts "Use the name skill.", which the engine also recognises.

### src/ui/composer.ts · Allow all
- refers-to: src/ui/composer.ts :: MODES (auto), renderSettings (modeBtn data-mode); src/ui/tool-cards.ts :: Approve, the ask row (data-d all); src/app.ts :: ChatHooks.approve
- kind: rationale
- logged: v0.13.0 · 2026-10-18

The `auto` permission mode already ran every tool without asking on both routes (`tools.decision_for`, `claude_code.can_use`), but it was labelled Auto, "Runs tools you have allowed without asking", so it read as the Always allow list. It is now Allow all, "Runs every tool without asking, and allows anything already waiting", and the mode button turns the warning colour while it is on. Every approval card gains Allow all beside Always allow: it sets `permissionMode` to `auto`, and the engine then allows every approval already waiting, this card included, so parallel calls do not each need a click. Always allow keeps its meaning (this tool from now on, setting `toolAllow`).

### src/ui/tool-cards.ts and composer.ts · Allow for this chat
- refers-to: src/ui/tool-cards.ts :: Approve ('chat'), the ask row (data-d chat), ALWAYS_WORD, setStatus (the Always allow label); src/app.ts :: ChatHooks.approve; src/ui/composer.ts :: modeMenu, renderSettings (chatOn, data-mode chat), the active and conversations listeners; src/state/app-state.ts :: Conversation.allow_all; src/styles/ft-chat.css :: .ft-mode[data-mode="chat"]
- kind: rationale
- logged: v0.14.0 · 2026-10-18

The owner read Always allow on "Allow Claude to edit main.py?" as allowing that one file, and wanted one switch for the whole chat. Approval cards now read Allow once, Allow for this chat, Always allow [commands, edits, file writes, the browser, or the connector tool; plain Always allow for anything else, since only those persist], Allow all, Deny. Allow for this chat calls `conversation.allowAll` on the active chat, which also lets the waiting card run. The permission menu gains a checked Allow for this chat item under the three modes, to see it and turn it off. The mode button says Chat allowed, amber, while the mode is Ask and the open chat is allowed; it listens to `active` and `conversations` so switching chats updates it. Checked under 4x CPU and a slow network: the write and the following edit ran after one click, a new chat still asked and read Ask, the first chat read Chat allowed again and turned off from the menu; layout shift only the zero-value caret entry; no page errors.

### src/ui/tool-cards.ts · edits as a diff
- refers-to: src/ui/tool-cards.ts :: diffShown, diffHtml, ToolCard.update (edit branch)
- kind: explainer
- logged: v0.13.0 · 2026-10-18

An edit's detail showed the old and the new passage as two plain paragraphs, which read as two versions of the same line with nothing saying which was which. It now shows the old lines with a `-` on a red wash and the new lines with a `+` on a green wash (Claude Code's MultiEdit `edits` list as one pair after another). The markup is set only when the input changes (`diffShown` remembers it per card), so a streaming input or a status change does not rebuild it.

### src/styles/ft-chat.css · sides, thinking, diff, drop, mode
- refers-to: src/styles/ft-chat.css :: .ft-msg.is-user (justify-self end, justify-items end), .ft-thinking and its summary and body, .ft-diff-*, .ft-drop, .ft-drop-card, .ft-mode[data-mode="auto"]
- kind: explainer
- logged: v0.13.0 · 2026-10-18

The person's messages sit on the right of the column, bubble, files and comments aligned to the right edge, text inside the bubble still left-aligned; Claude's replies stay full width from the left, as on claude.ai. Thinking is a quiet "Thinking" row with the same chevron as the tool summary, the text under a hairline on expand, instead of a bordered box between every step.

### src/styles/ft-chat.css · the streaming caret's line
- refers-to: src/styles/ft-chat.css :: .ft-msg.is-streaming .ft-md-tail > :is(p, h1-h6):last-child::after, and the last li of a last ul or ol
- kind: rationale
- logged: v0.13.0 · 2026-10-18, fixed v0.14.1 · 2026-10-18

When a streamed text block ended in a code block (or a list, a table, a quote), the caret, drawn as `::after` of the tail's last child, landed on a line of its own under that block; when the block finished the line went and what followed moved up (layout shift 0.0005, `.ft-tools` up 25 px, 50 ms after the caret drew). The caret is now drawn only where it sits inline at the end of text: a last paragraph or heading, or the last item of a last list when that item holds no nested block. While a code block or table streams there is no caret; the growing block shows the progress. Measured after: the 0.0005 entry is gone.

### src/styles/ft-chat.css · zero horizontal overflow
- refers-to: src/styles/ft-chat.css :: .ft-chat-scroll (overflow-x hidden), .ft-chat, .ft-thread, .ft-msg.is-assistant, .ft-msg.is-compaction, .ft-msg-blocks, .ft-tools, .ft-tools-text, .ft-tools-list, .ft-tool, .ft-tool-d, .ft-tool-body, .ft-agent, .ft-panel (grid-template-columns minmax(0, 1fr), min-width 0, the panel's width capped), .ft-tool-ask-text (flex-basis 100%), .ft-code pre, .ft-tool-input.is-diff, .ft-thinking-body, .ft-md table (wrap anywhere), .ft-composer-bar (minmax(0, auto)), .ft-bar-left, .ft-bar-right, .ft-model-name, .ft-model-effort, the 480 px rule
- kind: rationale
- logged: v0.14.1 · 2026-10-18

The owner's screenshots (v0.14.0, Claude Code route): a long `date; cd nodeform && for f in ...` command ran past the column, the approval row with five buttons ran off the window, and the whole thread scrolled sideways. Cause: every grid in the thread had an implicit `auto` column, and an `auto` track takes the min-content width of its widest item. A tool head is a flex row whose command text is `nowrap` (ellipsis), so its min-content is the whole command; that set the width of `.ft-tool`, the tool list, the group, `.ft-msg-blocks` and the reply, so every paragraph of that reply grew with it and `.ft-chat-scroll` (overflow-y auto, so overflow-x auto too) scrolled sideways. Measured before: the chat could scroll 698 px sideways at 760 px wide and 1022 px at 390 px; the approval row was 1359 px wide; 174 elements past the column. Now every grid on the path declares `minmax(0, 1fr)` and its items `min-width: 0`, so content is laid out to the column and long text breaks: commands ellipsize in the head and wrap in the body, diffs, code blocks, thinking and table cells wrap anywhere (code blocks wrap instead of scrolling, since scrollbars are hidden and a clipped line looked like overflow). The approval question takes its own line and the buttons wrap under it. `overflow-x: hidden` on the scroller is the backstop. The same `auto`-column pattern made the app wider than a phone screen: `.ft-chat` took the composer bar's min-content (326 px), so at 390 and 360 px the composer, thread and top-bar icons were clipped on the right; `.ft-chat` now has a `minmax(0, 1fr)` column, the bar's right group shrinks with ellipsis, and below 480 px the context meter and the effort label are not shown (effort stays in the model menu). The Outputs panel's fixed 304 px width (ft-chat.css loads after ft-shell.css's narrow override) is capped to the space available. Measured after, under 4x CPU and a slow network with a long command, a 220-character URL, 200-character inline code, a nine-column table, a 300-character code line and a 260-character unbroken word in one reply: at 1920, 1280, 760, 390 and 360 px, sideways scroll 0 (a forced scrollLeft of 500 stays 0), 0 elements past the column, the approval row 627 px in a 640 px column (247 px in 260 px at 360), the app exactly the window's width; the earlier checks (follow, sides, `/skill`, Allow all, diff, drop, Allow for this chat) unchanged; no page errors.

---

## src/styles/ft-overlays.css {#src-styles-ft-overlays}

### src/styles/ft-overlays.css · menu background
- refers-to: src/styles/ft-tokens.css :: --ft-menu-bg
- kind: warning-context
- logged: v0.2.0 · 2026-10-11

The family's `--surface-raised` mixes 70 percent and 8 percent, which `color-mix` turns into a colour at 78 percent opacity; menus drawn with it let the composer show through. `--ft-menu-bg` mixes 92 and 8 for an opaque surface.

### src/styles/ft-overlays.css · stacking
- refers-to: src/styles/ft-overlays.css :: .ft-menu, .ft-palette-scrim
- kind: explainer
- logged: v0.2.0 · 2026-10-11

Menus use `--z-menu`, the palette `--z-modal`; both live in `#overlay-root`, a direct child of `body`.

---

## src/styles/ft-tokens.css {#src-styles-ft-tokens}

### src/styles/ft-tokens.css · layout sizes
- refers-to: src/styles/ft-tokens.css :: --ft-sidebar-w, --ft-column-w, --ft-composer-w, --ft-panel-w
- kind: explainer
- logged: v0.1.0 · 2026-10-11

Starting values from the owner's claude.ai screenshots (planning sidecar `UI_STUDY.md` § Measurements): the sidebar is 16.8 percent of the window, the text column about 32.5 percent, the composer about 36.5 percent, the open file panel about 41 percent. At a 1728 px wide window those shares give roughly 290, 560, 630 and 710 px; the tokens round toward the family's 4 px grid and are tuned side by side with the screenshots in v0.2.0.

---

## assets/format_icon.svg {#assets-format-icon}

### assets/format_icon.svg · the app icon as a smiling AI chat bubble
- refers-to: assets/format_icon.svg, format_icon.png, format_icon_macos.png; public/favicon.svg, public/splash.html; src-tauri/icons/*; assets/icon_src/
- kind: rationale
- logged: v0.24.0 · 2026-10-20

The orange `>_` frame was the last icon outside the redrawn Form family. At the owner's direction the mark follows a chat-bubble-with-smile-and-sparkle reference but is drawn our own way: a thick ring bubble in the family paint (blue, violet, pink, amber) with a darker extruded edge and a tail at the bottom left, a raised half-moon smile in the same paint, and a white four-point sparkle with an amber glow in the ring's open gap at the top right, plus a smaller second sparkle. The ring ends are trimmed so neither sparkle touches the bubble (about 20 px clear at 1024, measured from rendered masks by assets/icon_src/clear.py). It sits on the family tile with its bloom, rim and drop shadow. The macOS .icns uses the 824 px tile inside a 1024 canvas with a 100 px margin; .ico, the PNGs and the Square*Logo set stay full bleed. Sizes 64 px and below use a heavier ring and a single larger sparkle set further out, with no smile outline. favicon.svg and the splash share a filter-free build with a rounded-rect tile. assets/icon_src/ regenerates every file (python3 gen.py, node render.mjs, python3 build.py).

### assets/icon_src/compact.py · keep the bloom in the compact build
- refers-to: assets/icon_src/compact.py :: compact; public/favicon.svg; public/splash.html
- kind: gotcha
- logged: v0.24.0 · 2026-10-20

The compact build drops the root svg's fixed `width="1024" height="1024"` so the favicon and the splash scale to their box. The bloom rect carries the same pair, and stripping every occurrence left it with no size, so the bloom never painted. Only the first occurrence (the root element) is removed.

## package.json · dependency pins {#package-json}

### package.json · markdown-it 15.0.3 and Vite 8.3.5, zero npm audit findings
- refers-to: package.json :: `dependencies.markdown-it`, `devDependencies.vite`; package-lock.json (written by `npm install`, not by hand)
- kind: rationale
- logged: v0.24.5 · 2026-10-25

Family rule from `FAMILY_DEV_PLAN.md` v0.4.x Phase 2b (formai_dev sidecar): every frontend installs with zero `npm audit` findings. Two were open. markdown-it 15.0.2 is in the shipped bundle (`src/ui/markdown.ts`) and carries a quadratic-time parse of inline HTML and of multi-line link reference definitions; 15.0.3 fixes both (ledger FB-002). Vite 8.3.0 brings a `launch-editor` with two command-injection advisories in the dev server (ledger FB-004); 8.3.5 clears them. Checked in the running window against the engine, Chromium at 1440 by 900, 4x CPU, 150 ms latency and about 1.6 Mbps, hard reload: layout shift 0, no page or console error; `renderMarkdown` imported in that page renders a heading, emphasis, escaped inline HTML, a reference link, a fenced block with its copy head, a list and KaTeX as before, and a 20000-tag input finishes inside 194 ms under the throttle.

## tests/window {#tests-window}

### test_window.py · F7, the window smoke
- refers-to: tests/window/test_window.py :: ENGINE_ENV, PAGES, IGNORED_REQUESTS
- kind: decision
- logged: 0.25.0 · 2026-10-26

FAMILY_TEST_PLAN section 4, F7: the built window (`npm run build`, `frontend/dist`) is served by the engine and opened in Chromium (Playwright 1.63.0, development only) at 4x CPU slowdown and 150 ms latency at about 1.6 Mbps. It must have a title, no request refused (403) or failed or answered 4xx or 5xx, no console or page error, and layout shift 0 after load, network idle and a 3 s settle. The engine starts on a free port with a temporary data folder and HOME, `FORMAT_SERVE_DIST=1` and `FORMAT_DIST` pointing at the build (the engine serves nothing from dist otherwise), and every `FORMAT_` variable of the caller cleared. The three provider keys are set to empty strings: the engine reads `backend/.env` only for keys absent from the environment, so an empty value keeps both the file and the caller's keys out, no provider is configured, and the page can reach no model provider or other network host. Pages: `/` (the window) and `/splash.html` (the desktop splash window, a separate document in `public/`). `IGNORED_REQUESTS` is empty: the window with no provider and an empty data folder makes no request that fails by design.

### public/splash.html · the mark no longer jumps when the line under it arrives
- refers-to: public/splash.html :: body, svg, p
- kind: fix
- logged: 0.25.0 · 2026-10-26 · ledger FB-119 (S3)

The splash was a flex column of the mark, a 16 px gap and the line "Starting the Format engine", centred as a stack. The mark is a large inline SVG, so Chromium sometimes painted once after it and before the `p` was parsed: the mark was centred alone at y 418 and moved up 16 px to y 402 when the line arrived (layout shift 4.39e-5, node SVG, seen in 4 of 30 loads at 4x CPU on a loaded machine, 0 of 30 after). The mark and the line are now absolutely placed (`top: calc(50% - 48px)` for the mark, `calc(50% + 32px)` for the line) at the spots the centred stack reached with a one-line caption, so nothing depends on the line being in the document yet and the look is the same to within a pixel. The F7 script now names the shifting nodes in its failure.

A run that failed once with `Page.goto: Page crashed` (renderer gone, a 386 s run with the machine's load average near 19) is the browser dying under memory pressure, not a request or a shift; it is not retried or ignored in the test.

## public/splash.html and the hand-off to the window {#public-splash}

### public/splash.html · the splash is formvis's card
- refers-to: public/splash.html (whole file); src-tauri/tauri.conf.json :: app.windows[0]
- kind: decision
- logged: v0.26.0 · 2026-11-15

The owner asked for the family's splash, so the page is formvis's card with FormAT's icon and words: a 360 by 200 transparent window, a rounded dark card (`#0a0a0a`, 1 px border, radius 16), the 72 px app icon, the line "Starting FormAT" and one bar. The bar is a single element whose `scaleX` runs from 0.04 to 0.92 over 2.6 s, the same length as the shell's minimum splash time, so it reads as progress without knowing any. `window.formatSplashDone()` freezes the bar where it is and lets it run to full in 0.2 s; the shell calls it just before the window appears (backend log, src-tauri/src/reveal.rs). The page has no theme read, no font file and no script besides that function, so it paints in one frame; the card is a column anchored from its top edge (`padding-top: calc(50vh - 64px)`) with fixed heights for the icon and the line, so a part that arrives later cannot move one above it (the 0.25.0 jump), and the window smoke still measures layout shift 0 on it. The old inline SVG mark and its 5 KB comment are gone: the icon is `favicon.png`. The content of this file is owner-approved; change it only on request.

### src/main.ts · the page tells the shell when it can be seen
- refers-to: src/main.ts :: reveal; src-tauri/tauri.conf.json :: app.withGlobalTauri; src-tauri/capabilities/default.json
- kind: decision
- logged: v0.26.0 · 2026-11-15

`reveal()` adds `app-ready` and then, one animation frame later, calls the shell command `app_ready` through `window.__TAURI__.core.invoke`. One frame later because the shell shows the window at that call, and the frame is what puts the first real content on screen. The call goes through the global the shell injects (`withGlobalTauri`) and not through `@tauri-apps/api`, because the job rule is no new npm package and the window must also run in a plain browser, where the global is absent and the call is skipped. The engine-down frame calls `reveal()` as well, so a failed first load still ends the splash; if no call ever comes the shell shows the window by itself after 20 s.

## The menu bar: commands.ts, menubar.ts, app-menu.ts, native-menu.ts {#src-ui-menubar}

### src/ui/commands.ts · one registry instead of three lists
- refers-to: src/ui/commands.ts :: Commands, comboOf, formatKeys; src/ui/app-menu.ts :: mountMenus; src/app.ts :: keys, shortcuts, the palette's list
- kind: decision
- logged: v0.26.0 · 2026-11-15

Before this the window had three hand-kept lists of the same actions: the palette's array, the `keys` handler in `app.ts` and the rows of the shortcuts sheet (plus the manual). A menu bar would have been a fourth. `Commands` is formvis's registry shape: a command has an id, a label, optional keys, `enabled`, `checked` and `run`; `forEvent` turns a key event into a command (by `code` for letters and digits, so layouts do not move shortcuts, and by character for punctuation such as `,` and `/`). The menus, the keyboard handler, the palette hints and the shortcuts sheet all read it, so a shortcut is written once. `Mod` is Cmd on macOS and Ctrl elsewhere; `formatKeys` prints it for the platform. Any element with `data-cmd="<id>"` runs that command on click, which is how the brand mark in the sidebar became Home.

### src/ui/menubar.ts, src/ui/app-menu.ts · File, Edit, View, Go, Window, Help in the title row
- refers-to: src/ui/menubar.ts :: MenuBar, PopupMenu; src/ui/app-menu.ts :: the `menus` array, textField, edit, paste, dialogOpen; src/styles/ft-menubar.css
- kind: decision
- logged: v0.26.0 · 2026-11-15

The bar is built like formvis's: six buttons in the title row, each opening a popup in `#overlay-root` (so it takes `--z-menu` like every other menu), with ticks for `checked`, greyed rows for `enabled` false, key hints, and one level of submenu (File, Settings and Help, Demos). Keyboard: F10 opens the first menu, Alt alone shows the mnemonics and Alt plus a first letter opens that menu (not on macOS, where Alt types characters), arrows move, Escape steps back. The bar ignores those keys while a dialog is open (`dialogOpen`: palette, sheets, the viewer, settings) and while the terminal has focus, so a shell keeps Alt and F10. Popups are built once and patched: `setItems` rebuilds only when the item list itself changes, and opening refreshes ticks and disabled states in place.

Edit holds Undo, Redo, Cut, Copy, Paste and Select All because a menu bar without them reads as broken; they act on the field that had focus before the menu took it (`lastFocus`, recorded on `focusin` outside the bar), through `document.execCommand`, with `navigator.clipboard.readText` as the fallback for Paste. They are disabled when no text field is the target and never act on the terminal. Window, Minimize and Maximize and File, Close Window need the desktop shell and are disabled in a browser.

Shortcuts added with the bar: Alt+Mod+H Home, Mod+, Settings, and Shift+Mod+J and Shift+Mod+K as second keys for the terminal and the palette. Checked with `scratch/formAT/menubar/probe.py` (80 checks: every menu by click and by keyboard, every item, ticks, each shortcut once, terminal focus) at 4x CPU; layout shift 0 with the bar in the row.

### src/ui/native-menu.ts · the macOS menu bar, without a package
- refers-to: src/ui/native-menu.ts :: NativeMenus, accelerator, OS_ITEMS, wantsNativeMenus; index.html :: the layout boot's `has-native-menus` line; src-tauri/capabilities/default.json
- kind: decision
- logged: v0.26.0 · 2026-11-15

On macOS the menus belong in the system menu bar. The page builds them itself from the same `menus` array and registry, through the shell's JavaScript menu API (`Menu`, `Submenu`, `MenuItem`, `CheckMenuItem`, `PredefinedMenuItem`). It reaches that API as `window.__TAURI__.menu`, the global the shell injects, because no npm package may be added on this job and `@tauri-apps/api` would be one; the interfaces at the top of the file are the few shapes used, typed by hand. The page is served by the engine on `http://127.0.0.1:<port>`, which is a remote origin to Tauri, so the capability file lists that address and the window permissions (minimize, toggle maximize, close) the menus need; `core:default` carries the menu permissions.

Undo, Redo, Cut, Copy, Paste, Select All, Minimize, Zoom and Close Window are the system's own predefined items (`OS_ITEMS`), so they act on whatever has focus, including the web view's fields; the window's keyboard handler never takes those keys itself (`OS_ITEMS` is skipped in `key`), so the system's or the browser's own editing applies. An application menu (About FormAT, Settings, Hide, Quit) comes first, as macOS expects. An accelerator the system refuses is retried without one, so one bad key cannot lose the whole menu. Enabled and checked states are pushed after input events and after `view`, `active` and `conversations` changes, coalesced to one pass per 150 ms.

No flash: the layout boot in `index.html` adds `has-native-menus` to `<html>` before first paint when the page is in the desktop shell on macOS, which hides the in-window bar, so the bar never shows and then disappears. If building the native menu fails, the class is removed and the in-window bar is there instead. View, Menus in Window stores `format.menusInWindow`; it is read at the next start.

Not verified on a Mac: there is none here. `scratch/formAT/menubar/native_mock.py` loads the page as macOS with a stand-in for `window.__TAURI__.menu` that records calls, and prints the tree the page asks for (also the fallback when the API is missing and a refused accelerator). It is a stand-in, not Tauri.

### src/ui/terminal-dock.ts, src/app.ts · the terminal hands one key back
- refers-to: src/ui/terminal-dock.ts :: constructor (appKey), mount (attachCustomKeyEventHandler); src/app.ts :: the TerminalDock construction
- kind: fix
- logged: v0.26.0 · 2026-11-15

Mod+J opened the dock and moved focus into the shell, and then the same key could not hide it: xterm handles a key and stops it before the document's handler sees it. The dock now takes a predicate and passes it to xterm's custom key handler; for a matching event xterm does nothing and the event reaches the app. The predicate asks the registry whether the event is the terminal toggle, so a rebound key follows. Only that command is handed back: Ctrl+B, Ctrl+K and the rest are real shell keys and stay with the shell, as the manual says. Seen before and after with `scratch/formAT/bugpass/t4.py`.

## src/ui/prefs-window.ts and the settings window {#src-ui-prefs-window}

### src/ui/prefs-window.ts · settings are a window over the app
- refers-to: src/ui/prefs-window.ts :: PrefsWindow (add, arrange, show, close, drawWire, queueSpy); src/ui/views.ts :: SettingsView; src/ui/memory-panel.ts; src/styles/ft-prefs.css; src/app.ts :: openSettings
- kind: decision
- logged: v0.26.0 · 2026-11-15

Settings were one page about 2,930 px tall with no way to move around it. They are now formvis's Preferences layout: a scrim, a floating rail of categories on the left, a frame on the right with every section stacked in one scrolling column, and a wire drawn from the active category to the frame. `PrefsWindow` is only the shell (`add(name, icon, ...content)`, `arrange(names)`, `show(section)`, `close()`); the controls stay where they were, in `SettingsView` and `MemoryPanel`, which find them with the same selectors under `prefs.pages`. Section identity is the English name in `data-section`. Order: Account, API keys, Tools, Long chats, Memory, Voice, Other devices, Outside agents, About, which also settles the old mismatch where Memory was drawn after About.

The view `settings` is gone from the page set: Settings no longer replaces what you were looking at, it opens over it, and closing returns focus to where it was. It closes by Done, the close button, Escape and a click on the scrim. Tab stays inside. A section's heading folds it; the button under the rail folds the rail to icons (`format.prefsRailCollapsed`); the frame drags by its title bar (`format.prefsSpot`).

### src/ui/prefs-window.ts · the wire is drawn in the same task as show
- refers-to: src/ui/prefs-window.ts :: show, drawWire, queueWire
- kind: rationale
- logged: v0.26.0 · 2026-11-15

`show` un-hides the scrim, scrolls to the asked section and calls `drawWire()` at once, before returning, instead of waiting for an animation frame. A wire drawn a frame later is a window that appears with no wire and gains one, which is a visible flash at 4x CPU. Later changes (scroll, fold, resize, drag) go through `queueWire`, one draw per frame, and `drawWire` writes the path only when its `d` string differs. The scroll spy picks the section nearest the top edge and is muted for a moment after a click on the rail, so the rail does not flicker through the sections the scroll passes. Checked with `scratch/formAT/prefs/probe1.py` to `probe3.py`: the wire path is read in the same task as the key event that opens the window; every entry point, the four ways to close, focus return, Tab containment, one change per control type, reload, resize while open, a short window and 390 px; layout shift 0 and the page behind unchanged.

## The family look {#family-look}

### src/styles/ft-*.css, src/ui/sidebar.ts, src/ui/boot-frame.ts · the window wears the family's tokens and name
- refers-to: src/styles/ft-tokens.css, ft-shell.css, ft-sidebar.css, ft-chat.css, ft-overlays.css, ft-menubar.css, ft-prefs.css; src/ui/sidebar.ts :: the wordmark; src/ui/boot-frame.ts; src/app.ts :: renderTitle
- kind: decision
- logged: v0.26.0 · 2026-11-15

A pass to make the window read as a member of the family, with no change to where things are. The top bar is the family title row, 40 px (`--cv-titlebar-h`) instead of 44, and the sidebar head is the same row, flush to the top, so the two line up. The brand is the app icon (`favicon.png`) with the word FormAT, in the sidebar, the engine-down frame and the page title; the old terminal-prompt mark is no longer drawn, which ends the "two marks" mismatch. Switches, the segmented control, buttons and menus take the family's sizes and tokens. Raw values in the `ft-` sheets were replaced by tokens where a token exists (counts of raw px, hex and ms values: chat 146 to 119, overlays 75 to 57, shell 182 to 158, prefs 67 to 59); what is left is 1 px borders, glyph boxes, layout widths and the 15 px reading size. No raw colour remains except `#000` inside two mask gradients, and no raw z-index. `--ft-sidebar-bg`, which mixed 28% black into the background and turned the light profile's sidebar a muddy grey, is gone; the sidebar and the title row take the surface tokens.

Measured with `scratch/formAT/look/tour.py` and `compare.py`: 57 views shot before and after with the rectangle of every visible `ft-` element. The differences are the ones meant (the 4 px of the title row and what follows from it, the rail's icons 8 px lower so they no longer jump when the sidebar folds, label sizes 14 to 13 px, switch and segmented sizes); every other rectangle is identical, layout shift is 0 in every view, and there are no console errors.

The engine-down frame's text was stale ("Scaffold build", a key "set in backend/.env"); it now says the window is waiting for its engine and opens by itself.

## src/demos.ts and demo chats in the window {#src-demos}

### src/demos.ts, src/ui/sidebar.ts, src/ui/palette.ts · demos are ordinary chats with a mark
- refers-to: src/demos.ts :: DEMOS, demosFirst, demoPage, demoConversation; src/ui/sidebar.ts :: renderList; src/ui/palette.ts; src/ui/app-menu.ts :: Help, Demos; src/app.ts :: renderTitle (the Demo tag), openDemo
- kind: decision
- logged: v0.26.0 · 2026-11-15

The engine seeds the demo chats (backend log, app/engine/demos.py); the window only needs to place them. A conversation carries `demo`, the demo's id. The sidebar lists demos in their own group, Demos, after Pinned and before the date groups, in the order of `DEMOS` (Aurora page, Orrery page, Ferry dashboard), so a first run shows them and a person's own chats still sort by date under them; a pinned demo moves to Pinned like any chat. The title row shows a small Demo tag and the palette marks them. Help, Demos has one command per demo: it opens the chat, and asks the engine to restore it first (`demo.restore`) when the person deleted it. A demo can be renamed, pinned, deleted and, with a key, continued.

`DEMOS` in the window repeats the ids, titles and blurbs so the menu exists before the engine has answered and so a deleted demo still has a menu item; the engine's `demo.list` is the truth for what is bundled.

Superseded in 0.26.3: the window no longer keeps that list. `DEMOS` is gone; the list comes from `demo.list` at load (see "The demo list comes from the engine" below).

### src/app.ts · a demo opens with its page already beside it
- refers-to: src/app.ts :: openListed; src/ui/artifact-panel.ts :: show
- kind: rationale
- logged: v0.26.0 · 2026-11-15

A click on a demo opens the side track for the artifact at the click, before the conversation has arrived, and loads the page into it while the chat loads. Two reasons. The page's frame then has its final size when the page first runs: a page that measures itself at load (the aurora canvases, the dashboard's layout, the Orrery's WebGL surface) would otherwise start in a zero-width frame and resize a moment later. And the chat column takes its narrow width once, instead of rendering wide and reflowing when the panel opens. If the page cannot be shown the side track closes again. Below 760 px there is no room for both, so a demo opens as a plain chat with its card. Measured with `scratch/formAT/demo-bundle/frameprobe.py`: the frame sizes a demo goes through while opening and every layout shift of the frame and the window (none).

### src/ui/chat-view.ts · a demo opens at its start
- refers-to: src/ui/chat-view.ts :: render (fromStart)
- kind: fix
- logged: v0.26.0 · 2026-11-15

A chat opens pinned to its end, which is right for a chat in progress and wrong for a recorded one: a demo showed the last paragraph of the reply first. When the chat being switched to is a demo and its last message is still the recorded reply, the view starts at the top and is not pinned. Once the person adds a message of their own the usual rule applies again.

## Review fixes in the window, 0.26.0 {#review-0-26-0}

### src/main.ts · a failing boot command no longer reloads the window forever
- refers-to: src/main.ts :: bootFallback, probe
- kind: fix
- logged: v0.26.0 · 2026-11-15

The engine-down frame reloads the page when the event socket opens, on the reasoning that an open socket means the engine is back. But the frame is shown whenever `app.load()` fails, and with one boot command failing while the engine is otherwise fine the socket opens at once: reproduced with `models.list` answering 500, 6 reloads in 6 s, without end. The reload now happens at most once in 15 s (the time of the last one is kept in `sessionStorage`); a later attempt is scheduled, so a passing failure still recovers. The frame's engine row also printed `127.0.0.1:8490` whatever the port; it prints `location.host`, since the desktop engine takes a free port when 8490 is busy.

### src/main.ts · the composer has focus after load
- refers-to: src/main.ts :: the `ready.then` success branch
- kind: fix
- logged: v0.26.0 · 2026-11-15

After a load or reload focus stayed on `body`, although every later return to the chat focused the composer. Nothing can take focus while `#app` is hidden, so the call has to come after `reveal()`: the success branch now calls `app.setView('chat')`, which is the path that already focuses the composer.

### src/ui/composer.ts, src/app.ts, src/engine-client/api.ts · a send that fails keeps the text
- refers-to: src/ui/composer.ts :: submit; src/app.ts :: send (returns whether it was sent); src/engine-client/api.ts :: run
- kind: fix
- logged: v0.26.0 · 2026-11-15

The composer cleared itself before the send and the send hook swallowed its error, so with the engine gone a typed message vanished and the line under the box said "Failed to fetch". `send` now returns false on failure and `submit` puts the text back if the box is still empty. A request that cannot reach the engine at all is reported as "FormAT's engine is not answering. Try again in a moment." for every command, in place of the browser's own wording. Attachments are not restored. Seen with `scratch/formAT/bugpass/t11.py`: engine killed under an open window, send, engine back, send again.

### src/ui/terminal-dock.ts · a reload adopts the shells that are running
- refers-to: src/ui/terminal-dock.ts :: ensure
- kind: fix
- logged: v0.26.0 · 2026-11-15

`ensure` adopted only the read-only Claude session from `terminal.list` and opened a new shell when it had none of its own, so every reload left the previous shell alive in the engine, unreachable, and showed "Terminal 2". It now mounts every live shell the engine lists; the engine already replays a session's scrollback on attach, so the tab comes back with its screen. A second window, or a paired device, shows the same shells for the same reason.

### src/ui/confirm.ts, src/ui/sidebar.ts, src/app.ts · deleting a chat asks first
- refers-to: src/ui/confirm.ts :: confirmSheet, deleteChat (new file); src/ui/sidebar.ts :: rowMenu; src/app.ts :: titleMenu
- kind: fix
- logged: v0.26.0 · 2026-11-15

Delete in a chat's row menu and in the title menu removed the chat at once, with no way back; with demo chats in the sidebar that is one click from losing them. Both now open a small sheet naming the chat, with Cancel focused, Escape and a click outside cancelling. It reuses the consent sheet's classes, so there is no new CSS and it counts as an open dialog for the menu bar. For a demo it adds that Help, Demos brings it back. Project, task and artifact deletes still do not ask; that is left open.

Superseded in 0.26.3: project, task and artifact deletes ask too, through the same sheet (see "Deleting a project, a scheduled task or an artifact asks first" below).

### src/styles/ft-shell.css, src/app.ts · narrow windows
- refers-to: src/styles/ft-shell.css :: .ft-title-btn (min-width); src/app.ts :: the `(max-width: 760px)` listener at the end of the constructor
- kind: fix
- logged: v0.26.0 · 2026-11-15

At 390 px a chat with a long title pushed the Files and Outputs buttons past the right edge, out of reach. The title button is a flex item whose automatic minimum width is its content's, and its text is `nowrap`, so it could not shrink below the whole title; `min-width: 0` lets it shrink and the text ends in an ellipsis. This was true before the menu bar and worse with the Demo tag. Second: the rule that turns an open sidebar into the rail below 760 px ran only at boot and on a change of view, so dragging a wide window narrow left the sidebar lying over the chat; a media-query listener now applies it at the moment the width crosses.

## The review's open list, fixed in the window, 0.26.3 {#open-items-0-26-3}

### src/engine-client/watch.ts, events.ts, api.ts, src/app.ts, src/ui/composer.ts, src/ui/engine-note.ts, src/styles/ft-overlays.css · a stopped engine is noticed within seconds, said on every view, and recovered from
- refers-to: src/engine-client/watch.ts :: watchEngine; src/engine-client/events.ts :: retryNow; src/engine-client/api.ts :: NOT_ANSWERING; src/app.ts :: load (the `watchEngine` call); src/ui/composer.ts :: setOffline, settle; src/ui/engine-note.ts; src/styles/ft-overlays.css :: .ft-engine-note
- kind: fix
- logged: v0.26.3 · 2026-11-15

Cause. The window learned that the engine had died only when the next command failed ("FormAT's engine is not answering"), so with the engine gone it showed nothing until the person tried something. The event socket knows at once, but a closed socket also happens for harmless reasons (a reload, a sleeping laptop, a proxy), so it is not trusted alone.

Detection. When the socket reports `closed`, `watchEngine` asks `/api/health` (no cache, 2 s timeout) once; only if that fails and the socket has not reopened is the engine "down". While down it asks every 2 s and, when the engine answers, calls `retryNow()`, because the socket's own retry waits 400 ms doubled each time up to 8 s and would otherwise leave the notice up for that long after the engine is back. When the socket opens, the state is "up" again. One shared string, `NOT_ANSWERING`, is used by the failed-command error, the composer and the notice.

What shows. On the chat view the line under the message box (`setOffline`: it is shown like a flash, and when the six-second flash ends `settle` puts it back instead of the usual settings line, so it stays until the engine is back). On every other view a small notice at the bottom centre (`EngineNote`): a fixed `<p role="status" aria-live="polite">` on `--z-toast` with `pointer-events: none`, always in the document and shown by opacity and visibility, so nothing is inserted, nothing moves and nothing is covered for a click; its class is toggled only when the value differs. It is hidden on the chat view because the composer's line says it there. A reduced-motion setting turns its transition off.

Recovery. When the engine is back the window lists the conversations again and clears the "running" and "waiting" marks of any chat the engine no longer reports as active (a restarted engine ended those replies), and reloads the open chat if its own mark was stale, so a reply that died with the engine does not show as streaming for ever. Seen by the desktop task's probe (`scratch/formAT/turn5-desktop/probe_engine_down.py`) with Chrome at 4x CPU throttle: the engine killed under the window, the notice 31 ms later, the notice gone 1.1 s after the engine answered again, layout shift 0 and the composer's boxes identical before and after.

### src/ui/confirm.ts, projects-view.ts, scheduled-view.ts, views.ts, src/styles/ft-shell.css · deleting a project, a scheduled task or an artifact asks first
- refers-to: src/ui/confirm.ts :: askDeleteProject, askDeleteSchedule, askDeleteArtifact; src/ui/projects-view.ts :: remove; src/ui/scheduled-view.ts :: remove; src/ui/views.ts :: ArtifactsView.remove; src/styles/ft-shell.css
- kind: fix
- logged: v0.26.3 · 2026-11-15

The 0.26.0 entry above says these deletes did not ask. More exactly: an artifact in the Artifacts page's row menu was deleted at once; a project and a scheduled task used a two-click button (the first click changed the button's own text to "Delete? Its chats are kept" or "Delete this task?" and armed it, the second deleted), which names nothing, can be left armed while the person moves on (the project's armed state was cleared only when its page was drawn fresh), and swaps the text inside a fixed button. All three now open the confirm sheet that chat deletes use, naming the project, task or artifact and saying what is deleted with it and what is kept (a project's chats are kept and leave the project, a task's earlier chats are kept, an artifact's chat is kept), with Cancel focused and Escape or a click outside cancelling. The armed-button code and its two `[data-armed]` rules are removed. Seen in the window at 1440x900, 1280x800 and 1000x700 with a screenshot of each sheet.

### src/ui/projects-view.ts, src/styles/ft-shell.css, src/app.ts · errors on the Projects page appear on that page
- refers-to: src/ui/projects-view.ts :: say, hush, create; src/styles/ft-shell.css :: .ft-proj-toast; src/app.ts :: openProject
- kind: fix
- logged: v0.26.3 · 2026-11-15

Failures on the Projects page (opening a project, saving its edit, removing or adding a file, deleting it) were handed to the composer's line, which is not on that page, so nothing was seen. The page now has its own `ft-proj-toast` (`role="alert"`, danger border, on the raised token): a wrapper that is sticky at the top of the page with zero height, so it takes no room and does not move the list, holds a paragraph positioned in the page's top padding. `say` sets its text and title (the full message for a long one), shows it, and hides it after 8 s or when the list is shown again; `hidden` is toggled only when it differs. The `showError` hook is removed from `ProjectsHooks`. In `create`, the `try` used to wrap opening the new project too, so a failure to open it was printed under the name field as if the name were wrong; only `project.create` is inside it now and an opening failure goes to the toast. Seen with the engine failing `project.update`, `project.removeFile` and an upload, at three window sizes and with the page scrolled, the toast staying in view.

### src/ui/composer.ts, src/styles/ft-chat.css · the composer's bottom row fits narrow containers
- refers-to: src/ui/composer.ts :: the `.ft-composer-bar` markup (`.ft-bar-row`); src/styles/ft-chat.css :: .ft-composer-bar, .ft-bar-row, the container queries
- kind: fix
- logged: v0.26.3 · 2026-11-15

Cause. The row was one grid, left group, no-key line, right group (model, effort, mode), which fits when the chat column is wide. At 1000x700 with the sidebar and the side track both open, and at the window's minimum size (960x620), the column is narrow, the right group clipped the model name and the no-key line was cut with an ellipsis. The window's width is not what matters here, the column's is, so the bar is a size container (`container-type: inline-size` on `.ft-composer-bar`, which keeps the padding) and the grid moved down one level into a new `.ft-bar-row`, because an element cannot be queried by its own size. Below a container width of 669 px the row becomes a wrapping flex row: the left group takes what it needs, the right group sits at the right end, and the notice drops to a line of its own (clamped to two lines, with a fixed line height and a minimum height of one line, so the row's height does not depend on how much the text needs). Below 359 px the effort label is hidden and two lines are reserved. The same wrapping applies when the left group holds a visible pill or skill picks (the `:has()` rules, inside `:where()` so they add no specificity), since those widen the left group at any width. Below a viewport width of 760 px the notice is hidden. The breakpoints are container widths, not viewport widths. No element is added or removed when the window resizes. Seen at 1440x900, 1280x800 and 1000x700, with and without a chat open, and while opening the Orrery demo's side track (a frame-by-frame record of the bar's and the notice's boxes showed no jump).

### src/ui/side-panel.ts, src/styles/ft-chat.css · Outputs shows each file's caption and names Download all
- refers-to: src/ui/side-panel.ts :: setOutputs; src/styles/ft-chat.css :: .ft-panel-file, .ft-panel-file-main, .ft-panel-file-note
- kind: fix
- logged: v0.26.3 · 2026-11-15

A file's caption (the demos give each file one, such as "Source, credit and terms for every surface map in the Orrery") was only a tooltip. It is now a muted line under the file's name, at most three lines, so the Orrery's two documents and the ferry demo's package say what they are. A row's `height` became `min-height` so a caption can grow it; rows are rebuilt only when their markup differs, as before. The Download all link says "Download all N as one zip" ("Download as one zip" for one file) and its tooltip says that a zip in the list stays inside it, matching the file the engine now names "<chat title> - all files.zip" (backend log).

### src/ui/views.ts · Settings, API keys says where keys are kept
- refers-to: src/ui/views.ts :: SettingsView (`.ft-keys-note`, `InfoLike.keysFile`, `InfoLike.envFile`)
- kind: fix
- logged: v0.26.3 · 2026-11-15

The paragraph told everyone to keep keys in `backend/.env`, a path that means nothing in the desktop app. It is now built from `app.info`: it names the file the saved keys are in (`keysFile`); where `envFile` is set (running from source) it says a saved key wins over `backend/.env` and removing it goes back to that file; where it is null (the desktop app) it says FormAT then uses a key from the environment it was started from (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY` or `ELEVENLABS_API_KEY`). The note's HTML is written only when it differs from what is there (`data-v`), and the path is escaped.

### src/ui/native-menu.ts, src/ui/app-menu.ts · View, Menus in Window applies at once on macOS
- refers-to: src/ui/native-menu.ts :: NativeMenus.apply, release; src/ui/app-menu.ts :: menus-in-window, mountMenus
- kind: fix
- logged: v0.26.3 · 2026-11-15

The command only stored the choice and said it took effect at the next start. `NativeMenus` is now created before the commands are registered, so the command can reach it, and the command calls `apply()`: when the choice is "in the window" it runs `release()`, which drops the root's `has-native-menus` class (the in-window bar shows) and gives the system menu bar Tauri's default menu (`Menu.default().setAsAppMenu()`); when it is "in the system bar" it runs `build()` as before. A change that arrives while one is being built is run afterwards, as `build()` already did. Written against the shape of Tauri's menu API and checked in the browser against a stand-in that records calls; never run on a Mac.

### src/demos.ts, src/ui/app-menu.ts, src/app.ts · the demo list comes from the engine
- refers-to: src/demos.ts :: demoList, setDemoList; src/ui/app-menu.ts :: setDemos, the Help menu; src/app.ts :: load
- kind: decision
- logged: v0.26.3 · 2026-11-15

The window kept its own copy of each demo's id, title and blurb. `load` now reads `demo.list` with the other boot commands (a failure gives an empty list and does not stop the load) and calls `setDemos`, which stores the list and registers one command per demo: only when the list differs from the one registered, so a repeat load does not rebuild the macOS menu bar. The Help menu shows its Demos submenu only when the list is not empty. The sidebar's order of demos and the palette follow the same list. Adding a demo is now a folder with an `about.json` and nothing in the window.

### src/engine-client/window-key.ts, api.ts, events.ts, src/main.ts, src/ui/terminal-dock.ts, composer.ts, dictation.ts, projects-view.ts, customize-view.ts · the window sends its key
- refers-to: src/engine-client/window-key.ts `loadWindowKey`, `keyHeaders`, `socketTicket`; src/engine-client/api.ts `run`; src/engine-client/events.ts `connect`, `open`; src/main.ts boot; src/ui/terminal-dock.ts `connect`, `attach`; the four `/api/uploads` and `/api/voice/transcribe` fetches
- kind: decision
- logged: unreleased · 2026-11-18

The engine now refuses writes without the window key (backend HASHOUT, same date). `loadWindowKey` runs once before `app.load`: the packaged global `__FORMAT_WINDOW_KEY` first (read once, then deleted), then the key kept in sessionStorage (`format-window-key`) if it still gets a socket ticket, and only then the development bootstrap `POST /api/window/key`, so a reload does not ask the bootstrap again. `run` and every raw POST fetch send `X-Format-Window-Key`; the events socket and each terminal tab fetch a one-time ticket before they open (`?ticket=`), and a tab closed while its ticket is pending never opens a socket. A paired device has no key and is let through by the engine's pairing check. Nothing visible changes and no node is rebuilt.

### src/ui/views.ts, src/state/app-state.ts, src/styles/ft-prefs.css · Settings, Outside agents says when the saved choice was reset to Ask
- refers-to: src/ui/views.ts :: the Outside agents section, `fillOutside`; src/state/app-state.ts :: `Settings.sealBroken`; src/styles/ft-prefs.css `.ft-seal-say`
- kind: feature
- logged: unreleased · 2026-11-18

The engine reports `sealBroken` (backend/app/core/seal.py) when the stored `outsideAgents` is "allowed" and its seal is missing or does not match, and then reads the choice as Ask. The first launch after the update that added the seal is such a case for everyone who had chosen Allowed (there is no seal yet), and so is a hand edit of the settings file; the window said nothing. The Access group of Settings, Outside agents, now ends with one note, filled by `fillOutside` from the settings the window already holds: "The saved outside agents choice was changed outside FormAT or saved by an older version, so it is back to Ask." It names both causes, because on the first launch after the update nothing was changed outside; the other apps' sentence names only the edit. The note reuses `ft-set-note` and has a reserved line (`min-height` of one line plus the dialog's 2px padding), so nothing moves when it fills or empties. Seen: engine from source with a stand-in keyring and a stored Allowed without a seal; the page (Vite dev server, headless Chrome) showed Ask in the select and the sentence; choosing Allowed in the window sealed it and removed the sentence; the select, the Seen row and the note had the same top and height with and without the text; no page errors; `tsc --noEmit` exit 0. Only English; this app has no language files.

### src/engine-client/window-key.ts, api.ts · every command of the window waits for its key
- refers-to: src/engine-client/window-key.ts `loadWindowKey`, `claim`, `windowHeaders`, `socketTicket`, `ticket`, `settled`; src/engine-client/api.ts `run`; src/main.ts boot; src/ui/views.ts `refreshDevices`, `fillOutside`, `fillTools`
- kind: fix
- logged: unreleased · 2026-11-19

src/main.ts builds the views (`new App(host)`) before it calls `loadWindowKey`, and the Settings view asks `devices.status`, `agents.status` and `sandbox.status` in its constructor. Those three requests therefore left before the window held its key, with no key header, and the engine refused them with 403: the owner's window check (`frontend/tests/window`, the page loaded with a slowed CPU and network) reported them as "requests refused by the guard", and a person's Settings page started without those three answers until its next refresh. The cause is the order, not the guard, so the guard and its open list are unchanged. Now the key module holds one promise, `settled`, resolved when `loadWindowKey` has finished whichever way it ends (the old body is `claim`; `loadWindowKey` wraps it in try/finally). `run` awaits `windowHeaders()`, which waits for `settled` and then gives the key header, so a command asked at any moment of the start goes out after the key is known and carries it. `socketTicket` waits the same way; `claim` uses the inner `ticket` so that it does not wait for itself. `keyHeaders` stays synchronous for the upload and dictation fetches, which a person can only reach after the window is shown, and the window is shown after `loadWindowKey`. If `loadWindowKey` were never called nothing would be sent; src/main.ts calls it on every start, in the same statement as before. Seen, in a scratch copy of the repository with `npm ci`, `npm run build` (tsc and vite, exit 0) and the engine from source: `python -m pytest frontend/tests/window -q -p no:cacheprovider` before the change failed on `/` with exactly those three 403 answers (1 failed, 1 passed) and after it passed (2 passed), with Playwright 1.65.2 driving the Chromium headless shell that is on the build machine (an older build than that Playwright version asks for, reached through a link). Not seen: the packaged desktop window, Windows, macOS.

### src/ui/views.ts · Settings, Outside agents names Antigravity
- refers-to: src/ui/views.ts :: the Outside agents note
- kind: decision
- logged: v0.28.0 · 2026-11-19

The note under Settings, Outside agents listed "Claude Code, Codex, Cursor and other agents"; the family now offers four agent programs, so it reads "Claude Code, Codex, Cursor, Antigravity and other agents". One word in a sentence that already wraps; no element added. The window has no list or picker of agent programs (the terminal dock opens the person's shell and Claude's read-only tab, and chat chooses between the API key and Claude Code), so there was nothing else to extend: the four programs are reported by the engine's `claudecode.status` under `programs`, and nothing in the window shows that list yet. `tsc --noEmit` exit 0 in a scratch copy. Not looked at in a browser.
