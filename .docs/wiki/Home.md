# Format developer wiki

For people changing Format. People using it want the manual in [`docs/`](../../docs/README.md).

| Page | Covers |
| --- | --- |
| [Architecture](Architecture.md) | the engine, the window, how they talk, where state lives |
| [Engine](Engine.md) | commands, events, the store, the tool loop, the harness, the optional parts |
| [Window](Window.md) | the shell, views and panes, the zero-flash rules, styles and tokens |
| [Agents and skills](Agents.md) | the MCP server, the agent guide, the two skills, `./format agents` |
| [Checks](Checks.md) | how a change is verified before release |
| [Releasing](Releasing.md) | versions, commits, tags, the hand-back |

Read first, in this order: `CLAUDE.md` (the laws and the layout), then the two living logs `backend/HASHOUT_LOG.md` and `frontend/HASHOUT_LOG.md` (why every file is the way it is), then the page here for the part you are changing. Branching is in [`BRANCHING.md`](../../BRANCHING.md).

## The laws, short

- Single-region hand edits; no sed, patch, git apply or scripted edits of repo files.
- Zero DOM flash or re-render, layout shift 0, checked under 4x CPU and a slow network.
- No visible scrollbars anywhere; everything still scrolls.
- No emoji, no em dash in Markdown, no icon libraries (inline `currentColor` SVG), z-index only through `--z-*` tokens.
- Near-zero comments in code; the rationale goes in the HASHOUT logs.
- `v*.*.*` versions, Conventional Commits as `nodemode-ai <mackin@nodemode.ai>`.
