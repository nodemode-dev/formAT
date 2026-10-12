---
name: format-harness
description: "Use when changing Format's code or docs in this repo (engine commands, the tool loop, artifacts, projects, memory, skills, connectors, scheduled tasks, the window, the terminal, the native renderer), when releasing a Format version, or when using Format's own features from inside the repo. Format (A.T, the Agentic Terminal) is the claude.ai-style chat and agent workspace here: a FastAPI engine with one command registry, a vanilla TypeScript window, an MCP server, PTY terminals and an optional wgpu crate. Routes to twelve specialists and enforces the repo's laws: single-region hand edits, zero layout shift, hidden scrollbars, HASHOUT logs. Not for an outside agent that only drives a running Format (that is format-driving)."
---

# Format harness

Format reproduces claude.ai's way of working on the person's own Claude API key: a sidebar with chats, projects, artifacts, scheduled tasks and customize; a composer with models, effort and permission modes; tools with approval cards; artifacts beside the chat; real terminals; and an MCP server so other agents can use all of it. Everything is one engine command. This pack is how you use it and how you build it without breaking the rules it was built under.

## How this pack is laid out

```
format-harness/
  SKILL.md                     this orchestrator
  EVALS.json                   evaluations and trigger tests for the pack
  references/architecture.md   engine, commands, events, tool loop, stores, window, MCP, native
  references/tool-map.md       every MCP tool, its command and its file (generated)
  references/command-map.md    every engine command in REST, CLI and MCP form (generated)
  sub-skills/[name]/SUB-SKILL.md   twelve specialists, listed below
```

Paths inside a sub-skill resolve from this pack's root, so `references/architecture.md` is always the file above. The two generated references are rewritten by `./format agents sync`; never edit them by hand.

## Routing

Start with `sub-skills/harness-director/SUB-SKILL.md` for anything that changes the repo or spans more than one area: it decides whether the request is use or build, picks specialists, keeps the ledger and runs the gate. Load a specialist directly only for a narrow question in its area.

| The request is about | Load |
| --- | --- |
| Anything broad, any code change, anything unclear | `harness-director` |
| Sending, branching, retrying, models, effort, attachments, compaction | `chat-operator` |
| Claude's tools in a chat, approvals, permission modes, sub-agents | `tool-operator` |
| The terminal dock, PTYs, the CLI, the Claude tab | `terminal-operator` |
| Publishing, versioning, the gallery, the artifact panel, the files pane | `artifact-publisher` |
| Projects, knowledge files, memory | `project-keeper` |
| MCP connectors, local servers, skills inside Format, outside-agent consent | `connector-keeper` |
| Task lists, sub-agents, scheduled tasks, Background | `task-runner` |
| Python engine code: commands, stores, the tool loop, the MCP server | `engine-builder` |
| Window code: TypeScript, CSS, tokens, zero shift, hidden scrollbars | `ui-builder` |
| The Rust crate, wgpu, native snapshots, the desktop bridge to come | `native-render-builder` |
| Versions, commits, tags, CHANGELOG, parity tracker, the two zips | `release-keeper` |

## The laws

These come from the owner and hold for every change. The reasons matter, because they decide the cases nobody listed.

- **Single-region hand edits.** Change an existing file with one targeted edit per region, by hand. No sed, patch, git apply, codemods or scripted rewrites of repo files. A reviewer must be able to see exactly what changed and why, and a scripted edit hides intent.
- **Zero DOM flash, flicker or re-render.** Keyed rendering, `setText` and attribute toggles that check before writing, double-buffered frames for previews. Layout shift is measured under 4x CPU and a slowed network and must be 0. Content that arrives without input must not move what the person is reading.
- **No visible scrollbars, everything still scrolls.** The family scrollbar sheet hides them; xterm's DOM bar is hidden explicitly.
- **Tokens only.** Colours and z-index come from tokens (`--z-*`); no raw z-index, no raw colours in Format's own sheets.
- **No emoji, no em dash in markdown, no icon libraries** (inline currentColor SVG from `icons-ft.ts`).
- **Near-zero comments.** Rationale goes in `frontend/HASHOUT_LOG.md` or `backend/HASHOUT_LOG.md`, in the same change. Read the log for a side before editing it.
- **No self-written tests.** Verification is by running the app (scratch scripts outside the repo, the mock API), not by adding test files to the repo.
- **Engine first.** A feature is a command; the window, CLI and MCP only dispatch it.
- **Versions `v*.*.*`, Conventional Commits** as `nodemode-ai` with the session trailers (see `release-keeper`).

## Using Format from here

The engine runs on `127.0.0.1:8490` (`./format` boots engine and window). From a shell: `./format cli list`, `./format cli chat.send text="..."` then `./format cli chat.wait conversationId=...`. From an agent: the MCP tools in `references/tool-map.md`. Outside agents need the person's consent in the window the first time.

## Completion gate

Nothing is done until the director's gate holds: the change works in the running app under throttling with layout shift 0 and no page errors, the earlier checks still pass, the HASHOUT log for each touched side has its entry, `./format agents sync` ran if a command changed, and the release steps ran if a version was cut. `EVALS.json` holds the pack's evaluations.
