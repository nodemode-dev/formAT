---
name: terminal-operator
description: "Format's real terminals and CLI: engine PTY sessions, the window's terminal dock with tabs, Restart and the read-only Claude tab, terminal.write and terminal.read for agents, ./format cli, and native terminal snapshots. Load to run commands where the person can watch, or to change the terminal."
---

# Terminal operator

## Purpose

Run commands in shells the person can see, and keep the terminal plumbing (PTY, socket, dock) correct when it changes. Hands back command output or a verified terminal change.

## Preconditions

The engine is running. For build work, `engine-builder` and `ui-builder` are loaded.

## Procedure

1. **Use.** `terminal.open` (cwd, cols, rows, title) returns an id; `terminal.write` types (end with a newline); `terminal.read` returns plain text; `terminal.close` ends it. The dock attaches over `WS /api/terminal/[id]` and replays the scrollback.
2. **CLI.** `./format cli list`, `./format cli describe [id]`, `./format cli [id] key=value` run any command against the live engine, including from inside a Format terminal (the launcher folder is on its PATH).
3. **Restart.** `terminal.restart` swaps the shell in place under a generation guard and sends a full reset; the tab and socket stay.
4. **The Claude tab.** Every bash command Claude runs is mirrored into one read-only session of kind agent; it refuses input and restart.
5. **Snapshots.** With the native renderer built and FORMAT_NATIVE=1, `terminal.snapshot` returns a PNG of the screen; otherwise read text with `terminal.read`.
6. **Window rules.** Tabs append to the left list; + sits with Restart and Hide so arriving tabs push nothing; xterm's DOM scrollbar stays hidden.

## Gate

- A command typed through the API shows in the dock, `terminal.read` returns its output, restart clears and answers, and the dock causes no layout shift.

## Hands back

The output requested, or the verified change.

## Owned resources

- `references/command-map.md` terminal command forms
- `references/architecture.md` the terminal row of the features table
