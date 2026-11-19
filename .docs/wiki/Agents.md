# Agents and skills

## The MCP server

`backend/app/mcp_server.py` builds the server from the command registry: one tool per command, named and described from `agent_guide.GUIDE` (verb_noun names with a "Use when" sentence; the description ends with the engine command id), plus `run_command`, chat and artifact resources and three prompts. It is served over Streamable HTTP at `/mcp` (`routers/mcp_http.py`) and over stdio by `./format mcp` (`mcp_stdio.py`, a proxy to the running engine with the header `x-format-agent`). Outside agents pass `agents.require`, which follows the `outsideAgents` setting (ask shows a prompt in the window).

## The skills

| Skill | For |
| --- | --- |
| `.claude/skills/format-driving` | an agent using a running Format: ask Claude, publish artifacts, terminals, schedules |
| `.claude/skills/format-harness` | an agent changing and releasing Format: the orchestrator with twelve specialists and the completion gate |

Their `references/tools.md`, `tool-map.md` and `command-map.md` are generated. After any command change run:

```bash
./format agents sync      # writes agents/manifest.json, regenerates the references and mirrors both skills to .agents/skills for Codex
./format agents sync --check   # changes nothing; exits 1 and names each generated or mirrored file that is out of date
```

`./format agents install --user` registers Format with Codex and Claude Code at user scope.
