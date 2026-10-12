---
name: format-driving
description: "Use when asked to do something in Format (A.T, the Agentic Terminal), the person's local Claude workspace, through its MCP server: ask Claude in Format and wait for the reply, draft text there and save it as an artifact, publish a page, read chats, work in its terminals, schedule prompts, manage projects. Also use when the user mentions Format's window, chats, artifacts or scheduled tasks, or when tools like send_message, wait_for_reply or publish_artifact from the format server are available. Not for changing Format's own source code (that is format-harness) and not for claude.ai."
---

# Driving Format over MCP

Format is a chat and agent workspace on the Claude API that runs on the person's computer: an engine on `127.0.0.1:8490` and a window in their browser. Its MCP server exposes every engine command as a tool. Whatever you do through it appears live in the window the person is looking at, so act like a careful guest in their workspace: say what you are about to do, use the chats and pages they asked for, and leave approvals to them.

The full tool reference, generated from the engine, is `references/tools.md`. Read it when you need a tool beyond the workflows below or its exact parameters. Evaluations for this skill live in `EVALS.json`.

## Before the first call

1. Check that the tools exist. In Claude Code they appear as `mcp__format__send_message` and so on; in other clients as `send_message`. If there are none, Format is not connected: the repo's `.mcp.json` (Claude Code), `.cursor/mcp.json` (Cursor) or `.codex/config.toml` (Codex) adds it, the engine must be running (`./format` in the repo), and Claude Code asks once before using a project server.
2. The first call may wait. Format asks the person in its window whether to let outside agents in. The call returns once they press Allow; if it fails with a message about outside agents, tell the person it is waiting for them in Format (or Settings, Outside agents) and stop. Do not retry in a loop.
3. If a reply fails with a message about a missing key, the person has to add an Anthropic key in Format's Settings, API keys. Call `get_key_status` to confirm, then tell them; never ask them to paste a key to you.

## Core workflows

**Ask Claude in Format.** `send_message` with `text` and no `conversationId` starts a chat and returns `conversationId` and `replyId`. Then `wait_for_reply` with that `conversationId` (default timeout 300 s). The result has `running`, `message` and `text`. If `running` is still true, call it again. To continue the same chat, pass its `conversationId` to `send_message`.

**Draft something in Format and save it as an artifact.** This is the most common request. Ask Format's Claude to write it (`send_message` with the brief, for example "Draft a short reply to the email below declining the meeting, warm and brief" plus the source text), `wait_for_reply`, then `publish_artifact` with that same `conversationId`, a short `title`, and `html`: a complete page that presents the draft (escape the text, wrap paragraphs, inline CSS only). The result carries the artifact `id`, its `version` and a `url`; tell the person the draft is open in that chat and on the Artifacts page. To revise it later, publish again with `artifactId` set, which adds a version instead of a new artifact.

**Put a page you wrote in front of the person.** `create_conversation` with a title (or reuse a chat they named), then `publish_artifact`. Pages run sandboxed, with scripts and fonts allowed from the common CDNs and nothing else from the internet unless the person turned that on.

**Read what happened.** `list_conversations` (optionally `query`) finds chats by title or text; `get_conversation` returns messages with their tool steps; the resource `format://conversation/[id]` is the same chat as Markdown. `list_artifacts` and `get_artifact` read pages.

**Work where the person can watch.** `open_terminal` starts a real shell in the window's terminal dock; `write_terminal` types (end commands with a newline); `read_terminal` returns the output as plain text. Close terminals you opened with `close_terminal`. The Claude tab (`kind` agent in `list_terminals`) is read-only.

**Run something on a schedule.** `create_schedule` with `name`, `prompt` and `cadence` (hourly, daily, weekdays, weekly, once with `runAt`, or manual) and `at` as local HH:MM. Each run is a new chat; `get_schedule` lists runs with their `conversationId`.

**Give chats shared context.** `create_project` with `instructions`; start chats in it with `send_message` `projectId`, or `move_conversation`.

## Rules that keep the person in charge

- Never call `approve_tool_call` or `answer_question` on your own. When a reply is waiting (`list_pending_tool_calls`, or `wait_for_reply` returning with the reply still running), tell the person what Claude in Format is asking and let them answer in the window, or relay their exact answer.
- Do not change settings (`set_setting`), keys, connectors or skills unless the person asked for that change.
- Deleting is final: `delete_conversation`, `delete_artifact`, `delete_project`, `delete_schedule` only on request.
- Pass ids from results; never invent them. Every error names the tool to call next; follow it.
- Keep the person's window calm: publish one artifact per request and add versions rather than many near-duplicates.

## When something goes wrong

| Message contains | What it means and what to do |
| --- | --- |
| outside agents | The person has not allowed or has blocked agents; ask them to choose in Format's window |
| No conversation, No artifact, No project | The id is wrong or was deleted; list again and use an id from the result |
| A reply is still running | Call `wait_for_reply` first, or `stop_reply` if the person wants to stop it |
| no Anthropic key, 401 | The person adds a key in Settings, API keys |
| native renderer is off | `snapshot_terminal` needs `./format native build` and FORMAT_NATIVE=1; use `read_terminal` instead |
| Format has no tool | Your tool list is stale; list tools again, or use `run_command` with the dotted id at the end of a tool's description |
