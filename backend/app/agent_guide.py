import re

GUIDE: dict[str, tuple[str, str]] = {
    "account.get": ("get_account", "Use when you need the person's name or how they like Claude to answer."),
    "account.set": ("update_account", "Use when the person asks to change their name, response preferences, send key or dictation language."),
    "agents.status": ("get_agent_access", "Use when a call was refused and you need to know whether outside agents are allowed."),
    "app.info": ("get_app_info", "Use first when you need the version, the data folder or whether an Anthropic key is set."),
    "artifact.delete": ("delete_artifact", "Use only when the person asks to remove a page; it cannot be undone."),
    "artifact.export": ("export_artifact", "Use when the person wants a file: a document as Word, PDF or Markdown, a spreadsheet as Excel or CSV, slides as PowerPoint or PDF."),
    "artifact.write": ("write_document", "Use to create or revise a document, spreadsheet or slide deck in a chat; pass section to change one part."),
    "artifact.get":("get_artifact", "Use when you need a published page's HTML or its version list, for example before publishing a new version."),
    "artifact.list": ("list_artifacts", "Use when looking for a page published earlier, in one chat or across chats."),
    "artifact.publish": ("publish_artifact", "Use when you want to show the person a page, app or document: it appears in that chat and on the Artifacts page; pass artifactId to add a version."),
    "background.list": ("list_background_work", "Use when you need to know what is still running or waiting for the person before starting more work."),
    "chat.branch": ("switch_branch", "Use when the person wants to go back to another version of an edited message."),
    "chat.compact": ("compact_chat", "Use when a long chat is near its context limit and should continue from a summary."),
    "chat.edit": ("edit_message", "Use when a message the person sent should be changed and answered again, keeping the old version as a branch."),
    "chat.retry": ("retry_reply", "Use when Claude's last reply failed or should be asked again unchanged."),
    "chat.send": ("send_message", "Use to ask Claude something in Format: omit conversationId to start a new chat, then call wait_for_reply with the conversationId it returns."),
    "chat.stop": ("stop_reply", "Use when a running reply should end now; what was written stays."),
    "chat.wait": ("wait_for_reply", "Use right after send_message, retry_reply or edit_message to get Claude's finished reply text."),
    "connector.add": ("add_connector", "Use when the person wants Claude in Format to reach another MCP server, by URL or by command."),
    "connector.connect": ("connect_connector", "Use after add_connector, or when a connector shows an error, to (re)connect and list its tools."),
    "connector.delete": ("delete_connector", "Use only when the person asks to remove a connector."),
    "connector.list": ("list_connectors", "Use to see which MCP servers Format's Claude can use and whether they are connected."),
    "connector.update": ("update_connector", "Use to turn a connector or some of its tools on or off, or to replace its token."),
    "conversation.create": ("create_conversation", "Use when you need an empty chat to publish into before anything is said; send_message without conversationId also creates one."),
    "conversation.delete": ("delete_conversation", "Use only when the person asks to delete a chat; it cannot be undone."),
    "conversation.get": ("get_conversation", "Use to read a chat's messages, tool steps and status by its id."),
    "conversation.list": ("list_conversations", "Use to find a chat by title or by words in its messages, or to get recent chat ids."),
    "conversation.move": ("move_conversation", "Use when a chat should get a project's instructions and files, or leave its project."),
    "conversation.pin": ("pin_conversation", "Use when the person wants a chat kept at the top of the sidebar, or unpinned."),
    "conversation.rename": ("rename_conversation", "Use when a chat's title should change."),
    "files.list": ("list_chat_files", "Use to see the files Claude wrote or changed in a chat's own folder."),
    "files.read": ("read_chat_file", "Use to read one file from a chat's folder, for example code Claude wrote there."),
    "keys.clear": ("clear_key", "Use only when the person asks to remove a saved API key."),
    "keys.set": ("set_key", "Use only with a key the person gave you for this purpose; keys are never shown back."),
    "keys.status": ("get_key_status", "Use when a reply fails for lack of a key, to see which provider keys are set and where from."),
    "memory.delete": ("delete_memory_file", "Use only when the person asks Claude to forget something stored in memory."),
    "memory.list": ("list_memory", "Use to see what Claude remembers across chats, in general or for one project."),
    "memory.read": ("read_memory_file", "Use to read one memory file listed by list_memory."),
    "memory.write": ("write_memory_file", "Use when the person wants Claude in Format to remember something for later chats."),
    "message.add": ("add_message", "Use only to record a message without asking Claude; to get an answer use send_message."),
    "models.list": ("list_models", "Use before set_setting model, to pick a model id and its effort levels."),
    "native.status": ("get_native_status", "Use before snapshot_terminal, to see whether the native renderer is built and on."),
    "outputs.list": ("list_outputs", "Use to get the files Claude handed over in a chat and their download paths."),
    "project.addFile": ("add_project_file", "Use after uploading a file, to give every chat in a project that file as knowledge."),
    "project.create": ("create_project", "Use when several chats should share instructions and knowledge files."),
    "project.delete": ("delete_project", "Use only when the person asks to delete a project; its chats are kept."),
    "project.get": ("get_project", "Use to read a project's instructions, files and chats by its id."),
    "project.list": ("list_projects", "Use to find a project id by name."),
    "project.removeFile": ("remove_project_file", "Use when a knowledge file should stop going to the project's chats."),
    "project.update": ("update_project", "Use to rename a project or change its description or instructions."),
    "sandbox.status": ("get_sandbox_status", "Use when a command Claude ran in Format failed on files outside its folder or on the network, to see whether the sandbox caused it."),
    "schedule.create":("create_schedule", "Use when the person wants Claude to run a prompt every hour, day, weekday or week, or once later."),
    "schedule.delete": ("delete_schedule", "Use only when the person asks to delete a scheduled task; its chats stay."),
    "schedule.get": ("get_schedule", "Use to see a scheduled task and its runs, each with its conversationId."),
    "schedule.list": ("list_schedules", "Use to find scheduled tasks and when they run next."),
    "schedule.run": ("run_schedule", "Use to run a scheduled task now; then wait_for_reply on the run's conversationId."),
    "schedule.update": ("update_schedule", "Use to change, pause (enabled false) or resume a scheduled task."),
    "settings.get": ("get_settings", "Use to see the current model, effort, thinking and permission mode before sending."),
    "settings.set": ("set_setting", "Use when the person asks for another model, effort, permission mode or tool setting; it applies to all chats."),
    "skill.add": ("add_skill", "Use after uploading a skill's .zip or SKILL.md, to install it in Format."),
    "skill.create": ("create_skill", "Use to write a new skill for Format's Claude from a name, a description and instructions."),
    "skill.delete": ("delete_skill", "Use only when the person asks to remove a skill."),
    "skill.enable": ("enable_skill", "Use to turn a skill on or off for Format's Claude."),
    "skill.get": ("get_skill", "Use to read a skill's SKILL.md and its files."),
    "skill.list": ("list_skills", "Use to see which skills Format's Claude can load."),
    "tasks.get": ("get_task_list", "Use to see the plan Claude keeps for a chat and how far it got."),
    "terminal.close": ("close_terminal", "Use when a terminal you opened is no longer needed."),
    "terminal.list": ("list_terminals", "Use to find terminal ids, including the read-only Claude tab."),
    "terminal.open": ("open_terminal", "Use when you need a shell the person can watch live in Format's terminal dock."),
    "terminal.read": ("read_terminal", "Use after write_terminal, to read what the command printed."),
    "terminal.resize": ("resize_terminal", "Use rarely; the window keeps terminal sizes in step itself."),
    "terminal.restart": ("restart_terminal", "Use when a shell is stuck; the tab stays and its output is cleared."),
    "terminal.snapshot": ("snapshot_terminal", "Use when a program's screen layout matters more than its text; needs the native renderer."),
    "terminal.write": ("write_terminal", "Use to type a command into a terminal (end it with a newline), then read_terminal."),
    "tool.answer": ("answer_question", "Use only when the person tells you how to answer a question card Claude asked."),
    "tool.approve": ("approve_tool_call", "Use only when the person tells you to allow or deny a waiting tool call; never approve on your own."),
    "tool.pending": ("list_pending_tool_calls", "Use when a reply is waiting, to see which approval or question holds it."),
}

_BY_NAME = {name: cid for cid, (name, _) in GUIDE.items()}
_ID = re.compile(r"\b[a-z]+\.[a-z][A-Za-z]*\b")


def tool_name(cid: str) -> str:
    return GUIDE[cid][0] if cid in GUIDE else cid.replace(".", "_")


def command_of(name: str, known: list[str]) -> str:
    if name in _BY_NAME and _BY_NAME[name] in known:
        return _BY_NAME[name]
    return next((c for c in known if c.replace(".", "_") == name), "")


def when(cid: str) -> str:
    return GUIDE[cid][1] if cid in GUIDE else ""


def for_agents(text: str) -> str:
    return _ID.sub(lambda m: tool_name(m.group(0)) if m.group(0) in GUIDE else m.group(0), text)
