# Projects, memory and Customize

## Projects

The Projects page holds projects. Each has:

- **Instructions**, added to every chat in the project.
- **Knowledge files**, given to Claude at the start of each chat in it.
- **Its chats**. New chat in this project starts one; a chat's title menu has Move to project. A crumb in the top bar shows a chat's project.

## Memory

Turn on Memory in Settings. Claude then keeps notes in a local folder that carries across chats: one for chats outside projects and one per project. Settings shows the notes; read, edit or delete them there.

## Customize

The Customize page has three sections, Skills, Connectors and Plugins, chosen by the tabs at the top of its list, each with its count, a search box and its Add actions. On a wide window the list stays on the left and the item you open shows beside it, marked in the list; on a narrower one the item opens as its own page with Back. Each skill and plugin has an Enabled switch in its row and on its page, and the "..." menu on a page holds Delete or Remove, which asks once more before it acts.

### Plugins

A plugin bundles skills, commands and connectors for one kind of work, in the Claude plugin format: a folder with `.claude-plugin/plugin.json`. Add a plugin as a .zip of its folder. Its skills and commands appear under Skills, named after the plugin (`release-notes` in the `demo-kit` plugin becomes `demo-kit-release-notes`), and its MCP servers under Connectors. The plugin's switch turns all of them on or off together; its page lists them with links, and Remove takes them all away. A plugin's hooks and agent definitions are kept but not run.

### Skills

A skill is a folder with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches, through the API or through Claude Code. Name one in a message to load it for that message: type `/` and pick it, start the message with `/name`, or write "use the name skill"; you can also pick one from the + menu. Add, Upload a skill takes a .zip of its folder or its SKILL.md; Add, Write a skill takes a name, when to use it and the instructions. Open a skill to read SKILL.md and every other file in it before you use it, and Try in chat starts a new chat with it picked. The list groups skills you added under Created by you and plugin skills under From plugins; a plugin's skill is removed with its plugin.

### Connectors

A connector is an MCP server that gives Claude more tools. Add custom connector takes a URL or a command. For a URL, choose how you sign in:

- Sign in when needed (the default): Format connects without credentials, and if the server asks, its row shows Sign in.
- Sign in now: the server's sign-in page opens as soon as you add it.
- No sign-in: anyone with the URL can use it; an API key goes in the access token or a request header.

With sign-in, Format registers itself with the server automatically, or uses your own OAuth client (its client ID, and a secret only if the server requires one). The sign-in page opens in your browser; approve there and come back, and the connector connects. If the server stops accepting the sign-in, the row shows Reconnect. Disconnect signs Format out. Under Advanced, Transport picks Streamable HTTP or the older SSE (a URL ending in /sse picks SSE). Where the server goes:

- A public https URL goes to Claude through Anthropic's MCP connector; its tools start on Always allow.
- A server on your computer or network, or one started by a command, runs inside Format; its tools start on Needs approval.

Each row shows Connected, or a Connect button when it is disconnected. Open a connector for its page: a status chip, Disconnect or Connect, and a "..." menu with Reconnect and Remove. Under Tool permissions, set each tool, or All tools at once, to Always allow (runs without a card), Needs approval (asks in the chat first, unless Allow all or Allow for this chat is on) or Blocked (Claude never sees it). A public server with any tool on Needs approval, or with request headers, is run by Format instead of Anthropic so the approval can wait for you. Always allow on a connector's approval card sets that tool to Always allow here.

In a chat, + then Connectors has a switch for each connector: off keeps its tools out of that chat only, and it stays connected for the others. In a new chat the switches apply to the chat your first message starts.
