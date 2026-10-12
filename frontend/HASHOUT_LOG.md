# HASHOUT_LOG · frontend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the window. Source files stay comment-free (vendored family sheets keep their upstream headers); everything else they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.6.2
Last updated: 2026-10-12 · v0.6.2: connectors on Customize and in the + menu, connector steps and approvals

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
    │   ├── tool-cards.ts          tool steps and groups, questions, file and artifact cards
    │   ├── artifact-panel.ts      the artifact beside the chat: two frames, versions, code, links
    │   ├── files-pane.ts          the chat folder's files and their previews, comments on a block
    │   ├── projects-view.ts       the Projects page: tiles, one project with chats, instructions and files
    │   ├── customize-view.ts      Customize: skills (list, on and off, add, write, one skill), connectors (add, tools, reconnect)
    │   ├── memory-panel.ts        Settings, Memory: the setting, the scope, the memory files and their editor
    │   ├── views.ts               Artifacts gallery; Scheduled and Settings pages
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
- [src/ui/artifact-panel.ts and the gallery](#src-ui-artifact-panel)
- [src/ui/files-pane.ts, comments and activity](#src-ui-files-pane)
- [src/ui/projects-view.ts](#src-ui-projects-view)
- [src/ui/customize-view.ts and src/ui/memory-panel.ts](#src-ui-customize)
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

### src/ui/markdown.ts · the tail becomes the block
- refers-to: src/ui/markdown.ts :: StreamRenderer.set
- kind: warning-context
- logged: v0.6.0 · 2026-10-12

Until v0.6.0 a finished block was inserted as a new element before the tail, so the tail element moved down by the block's height each time; in a short chat that is not scrolled, the browser counted it as a layout shift (about 0.01 per reply, found by the v0.6.0 check, which watches the whole window rather than a scrolled thread). Now the tail element itself becomes the finished block (re-rendered only if its source differs from what it already shows) and a new empty tail is added after it: nothing already on screen moves, and new elements are not shifts.

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
