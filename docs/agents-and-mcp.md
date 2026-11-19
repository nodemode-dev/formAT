# Agents and MCP

While FormAT runs it is an MCP server, so coding agents can use it: ask Claude in FormAT, publish artifacts, read chats, run terminals and every other engine command.

| Transport | Address |
| --- | --- |
| Streamable HTTP | `http://127.0.0.1:8490/mcp` |
| stdio | `./format mcp` (a bridge to the running engine) |

Tools are named for agents (`send_message`, `wait_for_reply`, `publish_artifact`, `list_conversations`, `open_in_browser`, `add_plugin` and so on) and each says when to use it. `run_command` runs any command by its id. Chats and artifacts are resources; three prompts cover asking Claude, publishing a page and summarizing a chat.

## Consent

FormAT's window asks before an outside agent does anything. The choice is in Settings, Outside agents, and has three values: **Ask me** (the default), **Allowed** and **Blocked**.

- Under Ask me, every call from an outside agent waits, reads included, and the window asks: "Let outside agents use FormAT?" with Allow and Block. The answer applies to every agent on this computer until you change it in Settings. A call that gets no answer for 120 seconds fails; the agent can try again once you have answered.
- Under Blocked, every call from an outside agent is refused.
- Only the window can change the choice. An agent that asks for it to be changed, over MCP or with `settings.set`, is refused.
- The command line counts as an outside agent: `./format cli ...`, and any other command call to the engine that does not come from the FormAT window, follow the same choice.
- If the saved choice is edited by hand, or was saved by an older version, FormAT reads it as Ask me and says so in Settings.

## Setting up an agent

- **Claude Code**: this repository's `.mcp.json` adds the server (Claude Code asks once before using a project server); `.claude/skills/format-driving` teaches it to use FormAT.
- **Cursor**: `.cursor/mcp.json`.
- **Codex**: `.codex/config.toml` (read once you trust the project) and the skills in `.agents/skills`.
- **Everywhere**: `./format agents install --user` adds FormAT to your user configuration for Codex and Claude Code.

## The command line

Every action is also a command for `./format cli`. The command line is an outside agent (see Consent above): before a script runs these, open Settings, Outside agents in the FormAT window and choose Allowed, or answer Allow when the window asks. A script cannot make that choice itself; until it is Allowed, running a command (`list` and `describe` only read the catalogue) waits for the window, and fails after 120 seconds.

```bash
./format cli list                          # every command
./format cli describe chat.send            # one command's parameters
./format cli chat.send text="Summarize the release notes"
./format cli chat.wait conversationId=...
```
