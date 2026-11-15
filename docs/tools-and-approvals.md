# Tools and approvals

Claude in FormAT can act, not only talk. Each step it takes shows in the reply as a line such as "Ran a command" or "Searched the web", and consecutive steps fold into one summary line ("Searched the web, wrote hello.py, and 1 more step") that opens to show each step, its input and its output.

## What Claude can do

| Tool | Does |
| --- | --- |
| bash | runs a command in the chat's own folder, with live output (also mirrored to the Claude tab in the terminal dock) |
| read, write, edit, glob, grep | reads and changes files in the chat's folder |
| web search, web fetch | Anthropic's web tools: searches and reads pages, with the sources as links |
| browser | uses FormAT's built-in browser (see [The built-in browser](browser.md)) |
| publish_artifact, write_document | makes pages, apps, documents, spreadsheets and slides beside the chat |
| send_file | hands you a file from its folder as a download card |
| task_list | keeps its plan as a checklist |
| ask_user | asks you a multiple-choice question and waits |
| spawn_agent | hands a separate piece of work to a sub-agent |
| memory, skill | its notes across chats, and your skills |
| connector tools | tools from MCP servers you add |

Settings, Tools turns groups off: workspace tools, web tools, the browser.

## Ask, Allow all and Plan

The permission menu in the composer sets how much Claude may do without you:

- **Ask** (default): commands, file changes, the browser and local connector tools wait for an approval card in the reply. Allow once; Allow for this chat (every tool in this chat, any file and any command, runs without asking until you turn it off; other chats still ask); Always allow commands, edits or file writes (that kind of step from now on, in every chat, remembered in Settings, Tools, Always allowed); Allow all (switches the mode to Allow all); or Deny. The permission menu shows Allow for this chat checked while it is on, and the mode button reads Chat allowed; pick it again to turn it off. A denied step is reported to Claude, which carries on without it. Edits show as a diff: removed lines in red with a minus, added lines in green with a plus.
- **Allow all**: everything runs without asking, in every chat, until you change the mode. Switching to it also allows any card already waiting. The mode button turns amber while it is on.
- **Plan**: Claude may read and search but not change anything; it describes what it would do.

Reading files, searching, asking you, keeping a plan and publishing artifacts never need approval.

## The sandbox

With Settings, Tools, Run Claude's commands in a sandbox on (the default), Claude's commands see only the chat's folder as writable; your home folder and FormAT's data are hidden; and there is no network unless you also allow it. Linux uses bubblewrap, macOS sandbox-exec. On Windows commands run unsandboxed, and Settings says so.

## Questions, plans and sub-agents

- A question card shows options as buttons (or checkboxes) and a field for your own answer. The reply waits until you answer.
- Claude's plan appears as a checklist in its step and under Progress in the Outputs panel.
- A sub-agent's steps show nested under its card; its report returns to Claude. Settings, Tools sets how many may run in one reply and their model.
