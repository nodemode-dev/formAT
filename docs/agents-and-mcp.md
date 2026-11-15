# Agents and MCP

While FormAT runs it is an MCP server, so coding agents can use it: ask Claude in FormAT, publish artifacts, read chats, run terminals and every other engine command.

| Transport | Address |
| --- | --- |
| Streamable HTTP | `http://127.0.0.1:8490/mcp` |
| stdio | `./format mcp` (a bridge to the running engine) |

Tools are named for agents (`send_message`, `wait_for_reply`, `publish_artifact`, `list_conversations`, `open_in_browser`, `add_plugin` and so on) and each says when to use it. `run_command` runs any command by its id. Chats and artifacts are resources; three prompts cover asking Claude, publishing a page and summarizing a chat.

## Consent

The first time an outside agent calls a tool, FormAT's window asks whether to allow outside agents. Settings, Outside agents changes it later: ask, allowed or blocked.

## Setting up an agent

- **Claude Code**: this repository's `.mcp.json` adds the server (Claude Code asks once before using a project server); `.claude/skills/format-driving` teaches it to use FormAT.
- **Cursor**: `.cursor/mcp.json`.
- **Codex**: `.codex/config.toml` (read once you trust the project) and the skills in `.agents/skills`.
- **Everywhere**: `./format agents install --user` adds FormAT to your user configuration for Codex and Claude Code.

## The command line

Every action is also a command for `./format cli`:

```bash
./format cli list                          # every command
./format cli describe chat.send            # one command's parameters
./format cli chat.send text="Summarize the release notes"
./format cli chat.wait conversationId=...
```
