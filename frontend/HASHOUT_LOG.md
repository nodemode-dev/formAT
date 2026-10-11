# HASHOUT_LOG · frontend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the window. Source files stay comment-free (vendored family sheets keep their upstream headers); everything else they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.3.2
Last updated: 2026-10-11 · v0.3.2: version pager after edits, edit on any message, math with KaTeX

---

## Org-navi-map

```
frontend/
├── index.html                     critical style, family theme boot, layout boot, sheets, roots
├── vite.config.ts                 host false, port 5490 strict, preview 5491, /api proxied with WebSockets
├── package.json                   TypeScript 7, Vite 8, Inter, JetBrains Mono, xterm 6 and its fit addon
├── oc_install(.bat), boot_frontend(.bat)
├── public/favicon.svg             Format's mark
└── src/
    ├── main.ts                    entry: App, reveal after fonts and first load; boot frame if the engine is down
    ├── app.ts                     App: shell, layout toggles, views, keys, engine events
    ├── version.ts                 VERSION
    ├── state/app-state.ts         conversations, active chat, messages, models, settings, view; topics
    ├── engine-client/
    │   ├── api.ts                 health, run(command, params), EngineError
    │   └── events.ts              EventStream: WebSocket with backoff and state
    ├── ui/
    │   ├── dom.ts                 el, esc, q, setText, setAttr, prefs
    │   ├── icons-ft.ts            inline currentColor SVG: the mark and the 20 px UI set
    │   ├── menu.ts                popover menus and submenus in the overlay root
    │   ├── sidebar.ts             sidebar and mini rail, nav, keyed recents, rename in place
    │   ├── composer.ts            the box, attachments, + menu, model and effort, permission mode
    │   ├── chat-view.ts           greeting, thread, note, scroll-to-bottom; composer docked
    │   ├── side-panel.ts          Outputs and Used in this session
    │   ├── terminal-dock.ts       xterm tabs attached to engine PTYs
    │   ├── palette.ts             command palette
    │   ├── views.ts               Projects, Artifacts, Scheduled, Customize, Settings pages
    │   └── boot-frame.ts          the engine-down fallback
    └── styles/
        ├── tokens.css ... light-mode.css   family sheets, vendored unchanged from formvis v1.66.1
        ├── ft-tokens.css          Format's layout tokens
        ├── ft-shell.css           grid frame, top bar, buttons, pages, boot frame
        ├── ft-sidebar.css         sidebar and rail
        ├── ft-chat.css            chat, composer, side panel, terminal dock
        └── ft-overlays.css        menus and the palette
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
- [src/styles/ft-overlays.css](#src-styles-ft-overlays)
- [src/styles/ft-tokens.css](#src-styles-ft-tokens)

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

### src/ui/sidebar.ts · rail
- refers-to: src/styles/ft-sidebar.css :: data-ft-sidebar="rail"
- kind: explainer
- logged: v0.2.0 · 2026-10-11

The rail is the same DOM: `.ft-label` elements hide, the search field becomes an icon, nav rows become square buttons with their titles as tooltips, recents hide and the account avatar stays at the foot (claude.ai's order, UI_STUDY § Left sidebar).

---

## src/ui/composer.ts {#src-ui-composer}

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
