---
name: harness-director
description: "Entry point of the format-harness pack: classifies a request as use (operate a running Format) or build (change the repo), picks the specialists, keeps the ledger and runs the completion gate. Load first for anything broad or any code change."
---

# Harness director

## Purpose

Turn a request into a short plan, route it to the right specialists, and refuse to call the work done until the gate holds. Hands back the ledger and the gate evidence.

## Preconditions

None. Read `references/architecture.md` once per session before routing a build request, because the specialists assume its vocabulary.

## Procedure

1. **Classify.** Use: the person wants Format to do something (a chat, a page, a schedule). Route to the operator specialists, or to the separate format-driving skill when acting as an outside agent over MCP. Build: the repo changes. Route to `engine-builder`, `ui-builder` or `native-render-builder`, plus the feature specialist whose area it is.
2. **Locate.** For each area, name the files from the table in `references/architecture.md` and read the matching HASHOUT log section before touching anything.
3. **Order the work engine first.** A feature is a command before it is a button: command, events, then the window, then `./format agents sync`, then docs.
4. **Keep the ledger.** One line per step: what changed, which file, which check proves it. Update it as you go rather than reconstructing it at the end.
5. **Run the gate.** Below. If any line fails, the work is running, not done.
6. **Hand off to `release-keeper`** when the person asked for a version.

## Gate

- The change works in the running app: the scenario was exercised against the engine (the mock API is fine) and, for window changes, in the browser under 4x CPU and a slowed network with layout shift 0, no visible scrollbars and no page errors.
- The earlier checks still pass.
- Each touched side's HASHOUT log has an entry with refers-to, kind and logged lines.
- If a command was added, renamed or re-described: `./format agents sync` ran and its output is clean.
- No rule slip: no scripted edits of repo files, no emoji, no em dash in markdown, no raw z-index, no new test files.

## Hands back

The ledger, the gate evidence (numbers, not adjectives), and the next step if one is real.

## Owned resources

- `references/architecture.md` the map every routing decision starts from
- `EVALS.json` the pack's evaluations, used to check routing itself
