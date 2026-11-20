---
name: connector-keeper
description: "Connectors and skills inside Format plus outside-agent access: MCP servers by URL or command (Anthropic's MCP connector for public https, engine-run sessions for local ones), their tools on and off, Format's own skills on the Customize page, and the consent setting for agents using Format's MCP server. Load to add or change any of these."
---

# Connector keeper

## Purpose

Manage what Claude in Format can reach and who can reach Format. Hands back a connected server, an installed skill, or a verified change.

## Preconditions

None for use. For build work, `engine-builder` and `ui-builder` (Customize page).

## Procedure

1. **Connectors.** `connector.add` (name and url or command), `connector.connect` lists tools, `connector.update` toggles the connector, its tools or its token, `connector.delete`. Public https servers go through the API's MCP connector (beta mcp-client-2025-11-20); everything else runs in the engine with the mcp SDK as client tools named `mcp__[connector]__[tool]`, which ask for approval like commands.
2. **Skills in Format.** SKILL.md folders in `data/skills`: `skill.add` from an upload, `skill.create`, `skill.enable`, `skill.delete`. The system prompt lists the skills that are on and Claude loads one with the `skill` tool.
3. **Outside agents.** Setting `outsideAgents` (ask, allowed, blocked). In ask, every outside call waits up to 120 s for the window's Allow or Block, reads included; the command line counts as an outside agent, and only the window can change the setting (`settings.set outsideAgents` from an outside caller is refused). `agents.status` lists clients seen. The MCP server's names and descriptions come from `backend/app/agent_guide.py`; after changing it run `./format agents sync`.

## Gate

- A test server connects, its tools show on Customize, one tool turned off is absent from the request, and an engine-run call asks in Ask mode.
- For consent changes: a client waits, Allow lets it through, Block refuses with a clear message.

## Hands back

Connector or skill names and state, or the verified change.

## Owned resources

- `references/tool-map.md` connector, skill and agent tools
- `references/architecture.md` the MCP server section
