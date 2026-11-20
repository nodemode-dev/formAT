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
- **Codex**: `.codex/config.toml` (read once you trust the project) and the skills in `.agents/skills`.
- **Cursor**: `.cursor/mcp.json`.
- **Antigravity** (Google's `agy` program): `.agents/mcp_config.json` in this repository. Antigravity asks you itself before it uses a tool it has no rule for; FormAT's own question is separate.
- **Everywhere**: `./format agents install --user` adds FormAT to your user configuration for Claude Code (when it is installed), Codex and Antigravity (`~/.gemini/config/mcp_config.json`, other servers in that file are kept); Cursor uses this repository's `.cursor/mcp.json`.

FormAT looks for four agent programs on your computer: Claude Code, Codex, Cursor and Antigravity. It finds them however it was started (it also reads the PATH of your login shell), and the `claudecode.status` command says for each whether it runs, where it is and which version. Chats can be answered through Claude Code; the other three use FormAT as an MCP server.

## The command line

Every action is also a command for `./format cli`. The command line is an outside agent (see Consent above): before a script runs these, open Settings, Outside agents in the FormAT window and choose Allowed, or answer Allow when the window asks. A script cannot make that choice itself; until it is Allowed, running a command (`list` and `describe` only read the catalogue) waits for the window, and fails after 120 seconds.

```bash
./format cli list                          # every command
./format cli describe chat.send            # one command's parameters
./format cli chat.send text="Summarize the release notes"
./format cli chat.wait conversationId=...
```
