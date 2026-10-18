# Projects, memory and Customize

## Projects

The Projects page holds projects. Each has:

- **Instructions**, added to every chat in the project.
- **Knowledge files**, given to Claude at the start of each chat in it.
- **Its chats**. New chat in this project starts one; a chat's title menu has Move to project. A crumb in the top bar shows a chat's project.

## Memory

Turn on Memory in Settings. Claude then keeps notes in a local folder that carries across chats: one for chats outside projects and one per project. Settings shows the notes; read, edit or delete them there.

## Customize

The Customize page has three sections, Skills, Connectors and Plugins, chosen in the column on its left (tabs along the top on a narrow window), each with its count, a search box and its Add actions.

### Plugins

A plugin bundles skills, commands and connectors for one kind of work, in the Claude plugin format: a folder with `.claude-plugin/plugin.json`. Add a plugin as a .zip of its folder. Its skills and commands appear under Skills, named after the plugin (`release-notes` in the `demo-kit` plugin becomes `demo-kit-release-notes`), and its MCP servers under Connectors. The plugin's switch turns all of them on or off together; its page lists them with links, and Remove takes them all away. A plugin's hooks and agent definitions are kept but not run.

### Skills

A skill is a folder with a SKILL.md whose name and description tell Claude when to use it. Claude sees every skill that is on and loads one when a task matches, through the API or through Claude Code. Name one in a message to load it for that message: type `/` and pick it, start the message with `/name`, or write "use the name skill"; you can also pick one from the + menu. Add, Upload a skill takes a .zip of its folder or its SKILL.md; Add, Write a skill takes a name, when to use it and the instructions. Open a skill to read SKILL.md and every other file in it before you use it, and Try in chat starts a new chat with it picked.

### Connectors

A connector is an MCP server that gives Claude more tools. Add one by URL or by command:

- A public https URL goes to Claude through Anthropic's MCP connector.
- A server on your computer or network, or one started by a command, runs inside Format; its tools ask before running in Ask mode.

Open a connector to reconnect it or turn single tools on and off. The + menu turns connectors on and off for chats.
