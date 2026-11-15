# Window

Vanilla TypeScript and Vite in `frontend/src`. No framework: each view is a class that builds its DOM once and patches it.

## Shape

| File | Owns |
| --- | --- |
| `main.ts` | the boot frame, the engine probe, the event stream |
| `app.ts` | the shell, views, side track (`data-ft-side`: artifact, files, browser), layout toggles, keys, the palette's entries, event dispatch |
| `state/app-state.ts` | the in-memory state and its topics (`conversations`, `messages`, `skills`, `plugins`, ...) |
| `engine-client/` | `run(id, params)` for commands, `EventStream` for events |
| `ui/sidebar.ts`, `composer.ts`, `chat-view.ts`, `tool-cards.ts`, `markdown.ts` | the conversation |
| `ui/artifact-panel.ts`, `doc-view.ts`, `files-pane.ts`, `browser-pane.ts`, `side-panel.ts` | the side track and Outputs |
| `ui/views.ts`, `customize-view.ts`, `projects-view.ts`, `scheduled-view.ts` | pages |
| `ui/commands.ts`, `app-menu.ts`, `menubar.ts`, `native-menu.ts` | the command registry (ids, labels, keys, enabled, checked), FormAT's commands and six menus, the bar in the title row, and the same menus in the macOS menu bar |
| `ui/prefs-window.ts` | the settings window's shell (rail, stacked sections, the wire); its controls are in `views.ts` and `memory-panel.ts` |
| `ui/confirm.ts` | the confirm sheet |
| `demos.ts` | the demo list the window takes from `demo.list` at load (title, blurb, order), and where the demo chats sit in the sidebar and the Help menu |
| `ui/icons-ft.ts` | every icon, inline SVG paths drawn in `currentColor` |
| `styles/` | the family's vendored Studio Dark sheets unchanged, and Format's `ft-*.css` |

## Zero flash, zero shift

- Build elements once; update with `setText` and `setAttr` (they skip writes that change nothing) and toggle `hidden` only when it differs.
- Keyed lists: reuse rows by id, move them with `insertBefore` only when out of place.
- Reserve space for anything that appears later (fixed boxes, `visibility: hidden` slots).
- Swap content only when the new one is ready: iframes double-buffer, browser frames decode off screen first.
- The sidebar holds row moves until the person's next input, so rows never jump under a reader.
- Layout attributes are set before first paint in `index.html`.

## Styles

Colours, spacing, radii and z-index come from tokens (`tokens.css`, `ft-tokens.css`). z-index uses only `--z-*` tokens. Scrollbars are hidden by the family's `scrollbars.css` while everything still scrolls. Narrow windows (760 px or less) turn the sidebar into a drawer and the side track into an overlay.

## Adding a pane or view

Add its class in `ui/`, mount it from `app.ts`, add its CSS (display rules keyed on the `data-ft-*` attribute), a palette entry and a command in `ui/app-menu.ts` (with its keys, if it has a shortcut, and its place in a menu; the keyboard handler, the menus and the shortcuts sheet read the registry). Record the reasoning in `frontend/HASHOUT_LOG.md`.
