# HASHOUT_LOG · frontend · format

Living log of all comment content, explainers, rationale, TODOs and removed code for the window. Source files stay comment-free (vendored family sheets keep their upstream headers); everything else they would have said lives here, indexed. Read this first, then edit code surgically.

Current build version: v0.2.0
Last updated: 2026-10-11 · the shell: sidebar and rail, chat view, composer and menus, side panel, terminal dock, palette, pages

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
