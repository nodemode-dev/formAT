---
name: tool-operator
description: "The tools Claude uses inside Format chats (bash, read, write, edit, glob, grep, web search and fetch, ask_user, task_list, send_file, spawn_agent, publish_artifact, memory, skill, connector tools), their approval cards and the permission modes Ask, Auto and Plan. Load to use or change them."
---

# Tool operator

## Purpose

Keep Claude's tools useful and safe: the right tool definitions reach the API, approvals hold the run until the person answers, and every result lands inline in the same reply. Hands back working tool behaviour or a change plan.

## Preconditions

For build work, `engine-builder` is loaded; card changes also need `ui-builder`.

## Procedure

1. **Where tools live.** Definitions, the chat folder and executors are in `backend/app/engine/tools.py`; the loop is `chat._run`. A new tool needs a definition, an executor branch in `tools.run`, a card summary in `frontend/src/ui/tool-cards.ts`, and an entry in the harness only if it needs a beta or special block.
2. **Approvals.** In Ask mode, commands and file changes wait (`tool.pending`); `tool.approve` with allow, always (adds to `toolAllow`) or deny. Plan mode never runs them; Auto runs without asking. Agents must not approve on the person's behalf.
3. **Questions.** `ask_user` shows a card; `tool.answer` replies.
4. **Results.** Tool output streams as `tool.output` events into the card; results are capped and stored inline as `tool_result` blocks; bash is mirrored to the Claude terminal; bash, write and edit publish `files.changed`.
5. **Sub-agents.** `spawn_agent` runs inside the parent's call with `agentLimit` and `agentModel`; its transcript is kept in `meta.agents` and shown nested.

## Gate

- The mock scenario for the tool (toolrun, askrun, agentrun or a new one) runs end to end in Ask and Auto modes, a denied call stops only that call, and the cards render without layout shift.

## Hands back

The tool behaviour verified, or the files a tool change touches in order.

## Owned resources

- `references/architecture.md` the tool loop section
- `references/tool-map.md` the commands an agent uses to answer approvals and questions
