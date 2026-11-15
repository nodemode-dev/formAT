# Projects, memory and Customize

## Projects

The Projects page holds projects. Each has:

- **Instructions**, added to every chat in the project.
- **Knowledge files**, given to Claude at the start of each chat in it.
- **Its chats**. New chat in this project starts one; a chat's title menu has Move to project. A crumb in the top bar shows a chat's project.

Deleting a project asks first. Its instructions, its list of files and its memory go with it; its chats are kept and leave the project. A failure on this page, such as a file that did not upload, is shown at the top of the page.

## Memory

Turn on Memory in Settings. Claude then keeps notes in a local folder that carries across chats: one for chats outside projects and one per project. Settings shows the notes; read, edit or delete them there.

## Customize

The Customize page has three sections, Skills, Connectors and Plugins, chosen by the tabs at the top of its list, each with its count, a search box and its Add actions. On a wide window the list stays on the left and the item you open shows beside it, marked in the list; on a narrower one the item opens as its own page with Back. Each skill and plugin has an Enabled switch in its row and on its page, and the "..." menu on a page holds Delete or Remove, which asks once more before it acts.

### Plugins

A plugin bundles skills, commands, connectors and agents for one kind of work, in the Claude plugin format: a folder with `.claude-plugin/plugin.json`. The Plugins section has Your plugins and Discover.

- Add, then Add marketplace, takes a marketplace: a Git repository (a URL, or `owner/repo` for GitHub, with `@branch` to pin one) or a folder with `.claude-plugin/marketplace.json`. For a private GitHub repository, give an access token that can read it (your own git sign-in and SSH keys work too). Its plugins appear in Discover; select Add on one to install it. Only add marketplaces you trust: their plugins are not reviewed. Names reserved for Anthropic's own marketplaces are refused unless the repository is Anthropic's.
- A plugin can come from a folder in the marketplace, another Git repository, a zip download or an npm package. A plugin made by a command on your computer shows the command first, and Run and add runs it.
- Under Discover, each marketplace has Check for updates (it pulls the latest catalog and updates the plugins you installed from it), Sync automatically (checks every hour while FormAT runs, for repositories), and Remove in its "..." menu, which also removes its plugins.
- Add, then Upload plugin, takes a .zip or .plugin of a plugin folder.
- Add, then Create a plugin, opens an editor: a name, a description and the plugin's files (a skill is skills/name/SKILL.md, a command is commands/name.md). A plugin made this way has Edit files in its "..." menu.
- Add, then Create with Claude, starts a chat where Claude asks what the plugin should do, writes its files in the chat folder and, when you approve its card, adds it to FormAT. Ask for changes in the same chat and approve again to replace it.

In a message, type `/` and the plugin's name with a colon, such as `/demo-kit:`, to see only that plugin's skills and commands; `/demo-kit:ship` in a message loads that skill.

A plugin's skills and commands appear under Skills, named after the plugin (`release-notes` in the `demo-kit` plugin becomes `demo-kit-release-notes`). Adding a plugin adds none of its connectors: its page's Connectors tab shows each as Connected, Not connected or Not added, with Add or Connect. Its page also has Skills, Commands and Agents tabs. The plugin's switch turns its skills and connectors on or off together, and Remove takes them all away. A plugin's agents and hooks are kept but not run in chat.

### Skills

A skill is a folder with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches, through the API or through Claude Code. Name one in a message to load it for that message: type `/` and pick it, start the message with `/name`, or write "use the name skill"; you can also pick one from the + menu. Add, Upload a skill takes a .zip of its folder or its SKILL.md; Add, Write a skill takes a name, when to use it and the instructions. Open a skill to read SKILL.md and every other file in it before you use it, and Try in chat starts a new chat with it picked. Add, Create with Claude starts a chat where Claude writes a skill with you, and a skill's Edit with Claude starts one that changes it; Claude saves it when you approve its card. Discover lists the skills your marketplaces offer, each added on its own (Add Anthropic's skills marketplace brings in anthropics/skills). The list groups skills under Created by you, From Anthropic and partners, From marketplaces and From plugins; a plugin's skill is removed with its plugin.

### Connectors

A connector is an MCP server that gives Claude more tools. Discover lists remote servers their makers publish, by category, each with a link to the maker's page where its URL comes from; Connect adds one and opens its sign-in page when it has one (a server that needs a key opens the custom form instead). They are not reviewed by Anthropic or FormAT. Connectors also reach Claude Code when FormAT answers through it. Add custom connector takes a URL or a command. For a URL, choose how you sign in:

- Sign in when needed (the default): FormAT connects without credentials, and if the server asks, its row shows Sign in.
- Sign in now: the server's sign-in page opens as soon as you add it.
- No sign-in: anyone with the URL can use it; an API key goes in the access token or a request header.

With sign-in, FormAT registers itself with the server automatically, or uses your own OAuth client (its client ID, and a secret only if the server requires one). The sign-in page opens in your browser; approve there and come back, and the connector connects. If the server stops accepting the sign-in, the row shows Reconnect. Disconnect signs FormAT out. Under Advanced, Transport picks Streamable HTTP or the older SSE (a URL ending in /sse picks SSE). Where the server goes:

- A public https URL goes to Claude through Anthropic's MCP connector; its tools start on Always allow.
- A server on your computer or network, or one started by a command, runs inside FormAT; its tools start on Needs approval.

Each row shows Connected, or a Connect button when it is disconnected. Open a connector for its page: a status chip, Disconnect or Connect, and a "..." menu with Reconnect and Remove. Under Tool permissions, set each tool, or All tools at once, to Always allow (runs without a card), Needs approval (asks in the chat first, unless Allow all or Allow for this chat is on) or Blocked (Claude never sees it). A public server with any tool on Needs approval, or with request headers, is run by FormAT instead of Anthropic so the approval can wait for you. Always allow on a connector's approval card sets that tool to Always allow here.

In a chat, + then Connectors has a switch for each connector: off keeps its tools out of that chat only, and it stays connected for the others. In a new chat the switches apply to the chat your first message starts.
