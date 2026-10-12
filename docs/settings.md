# Settings

Open Settings from the sidebar (More, Settings), the account menu at the bottom of the sidebar, or the palette.

## Account

| Setting | Does |
| --- | --- |
| What should Claude call you? | your name, shown in the sidebar and given to Claude |
| How Claude should respond | your standing preferences, sent with every chat after Format's own instructions |
| Send with | Enter, or Mod+Enter (then Enter makes a new line) |
| Dictation language | the language code for dictation, for example en-US |

## Tools

| Setting | Default | Does |
| --- | --- | --- |
| Workspace tools (bash, files) | on | Claude may run commands and change files in the chat's folder |
| Web search and fetch | on | Anthropic's web tools (searches are billed by Anthropic) |
| Artifacts can load images and data from the internet | off | otherwise pages load only scripts and fonts from the common CDNs |
| Claude can use the built-in browser | on | offers Claude the browser tool, when the browser is installed |
| Run Claude's commands in a sandbox | on | only the chat's folder is writable; home and Format's data hidden |
| Sandboxed commands can use the network | off | lets sandboxed commands reach the internet |
| Always allowed | | tools you chose Always allow for; remove them here |
| Sub-agents in one reply, Sub-agent model | up to 4, same as the chat | limits for spawn_agent |

## Other devices

Open or close Format to your network, the pairing code and link, and Forget paired devices. See [Other devices](other-devices.md).

## Outside agents

Whether coding agents on this computer may use Format over MCP: Ask me, Allowed or Blocked, and which agents have called. See [Agents and MCP](agents-and-mcp.md).

## Long chats

Summarize long chats automatically, and at what share of the context window (50 to 85 percent).

## API keys

Anthropic (powers chat) and OpenAI (optional: dictation transcription in browsers without speech recognition). Keys are stored in Format's data folder with owner-only permissions and never shown again; Remove falls back to `backend/.env`.

## Memory

The last section of the page, below About: turn memory on, and read, edit or delete Claude's notes, general and per project.

## About

Format's version, the data folder, the number of engine commands, which dictation engines are available, and the native renderer's state.
