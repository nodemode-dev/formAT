---
name: ui-builder
description: "Building Format's window: vanilla TypeScript views and panels in frontend/src, the claude.ai flow, the family's Studio Dark tokens, the sidebar and its rail, overlays, and the zero-flash, zero-shift, hidden-scrollbar rules with their throttled checks. Load before editing anything under frontend/."
---

# UI builder

## Purpose

Change the window so it matches claude.ai's flow in the family's design and never flashes, re-renders a live container, or moves content without input. Hands back the change with its throttled measurements.

## Preconditions

Read `frontend/HASHOUT_LOG.md` for the files you will touch. The engine command behind the change exists first (`engine-builder`).

## Procedure

1. **Structure.** A view is a class with a root built once by `el()`; state comes from `AppState` topics and engine events routed in `app.ts`. Add classes with a feature prefix of your own (the Scheduled page uses `ft-sch-`): borrowing another page's classes has broken checks twice.
2. **Patch, never rebuild.** Keyed maps of nodes moved with `insertBefore` only where order differs; `setText` and `setAttr` check first; `hidden` toggles check first; previews double-buffer and swap after load.
3. **No shift without input.** Late content goes where it pushes nothing: at the end of a list, in a reserved slot, or in a hidden page. A slot that appears later keeps its space (`visibility: hidden`). The sidebar holds background inserts until the next input.
4. **Tokens.** Colours and sizes from tokens; z-index only from `--z-*`; overlays in `#overlay-root`; icons from `icons-ft.ts`; scrollbars hidden by the family sheet.
5. **Build.** `npx tsc --noEmit -p .` and `npm run build`, then the preview on 5491.
6. **Measure.** A Playwright run under 4x CPU and a slowed network that records layout shift with its sources, removed nodes of the live containers, visible scrollbars, overflow at 360 to 1920 px, and page errors.

## Gate

- Layout shift 0 (with sources recorded), no unexpected removed nodes, no visible scrollbars, no overflow, no page errors, and the earlier window checks still pass.

## Hands back

The change, the numbers, and screenshots.

## Owned resources

- `references/architecture.md` the window section
