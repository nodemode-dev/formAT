import json
from collections.abc import Awaitable, Callable
from typing import Any

import mcp_types as types
from mcp.server import Server
from mcp.server.caching import CacheHint

from app.agent_guide import command_of, for_agents, tool_name, when
from app.core import config

Caller = Callable[[str, dict, str], Awaitable[Any]]
Catalogue = Callable[[], Awaitable[list[dict]]]
RESULT_CAP = 60_000
DESTRUCTIVE = ("delete", "clear", "removeFile", "stop", "close")
IDEMPOTENT = ("get", "list", "read", "status", "set", "update", "rename", "pin", "enable", "move", "connect", "wait", "pending", "info")

INSTRUCTIONS = """Format is the person's local chat and agent workspace on the Claude API. Every tool here is one Format engine command, the same ones its window uses, so what you do appears live in the person's open window. To talk to Claude in Format: send_message (omit conversationId to start a chat), then wait_for_reply with the conversationId it returned. To put a page in front of the person: publish_artifact into a chat (create_conversation first if there is none). list_conversations and get_conversation read chats; run_command runs any command by its dotted id with params. Ids come back in every result; pass them on rather than guessing. Never approve tool calls or answer Claude's questions for the person unless they told you to. Resources hold chat transcripts (format://conversation/{id}) and artifact pages (format://artifact/{id})."""

PROMPTS = [
    ("ask_claude_in_format", "Ask Claude something in a new Format chat and bring back the reply", [("question", "What to ask", True)]),
    ("publish_page", "Make a page and publish it as an artifact the person sees in Format", [("description", "What the page should show or do", True), ("chat", "An existing conversation id, or empty for a new chat", False)]),
    ("summarize_chat", "Read one Format chat and summarize where it stands", [("conversationId", "The chat's id, from list_conversations", True)]),
]


def describe(c: dict) -> str:
    return f"{for_agents(c['description'])} {when(c['id'])} (Format command {c['id']})".replace("  ", " ")[:2000]


def _schema(params: dict[str, dict]) -> dict:
    props: dict = {}
    required = []
    for name, spec in params.items():
        p = {k: v for k, v in spec.items() if k in ("type", "description", "enum", "items")}
        props[name] = p or {}
        if spec.get("required"):
            required.append(name)
    out: dict = {"type": "object", "properties": props}
    if required:
        out["required"] = required
    return out


def to_tools(catalogue: list[dict]) -> list[types.Tool]:
    tools = []
    for c in catalogue:
        verb = c["id"].split(".")[-1]
        tools.append(types.Tool(
            name=tool_name(c["id"]), title=c["label"],
            description=describe(c),
            input_schema=_schema(c.get("params") or {}),
            annotations=types.ToolAnnotations(title=c["label"], read_only_hint=not c["mutates"],
                                              destructive_hint=c["mutates"] and verb.startswith(DESTRUCTIVE),
                                              idempotent_hint=(not c["mutates"]) or verb.startswith(IDEMPOTENT), open_world_hint=c["id"].startswith("chat.")),
        ))
    tools.append(types.Tool(
        name="run_command", title="Run any Format command",
        description="Runs one Format engine command by its dotted id (for example chat.send, the command behind send_message) with its params object. Use only for a command no other tool here covers; every tool's description ends with its command id.",
        input_schema={"type": "object", "properties": {"id": {"type": "string", "description": "The dotted command id, shown at the end of each tool's description"},
                                                         "params": {"type": "object", "description": "The command's parameters"}}, "required": ["id"]},
        annotations=types.ToolAnnotations(title="Run any Format command", read_only_hint=False, destructive_hint=True, idempotent_hint=False),
    ))
    return tools


def _text(result: Any) -> str:
    text = result if isinstance(result, str) else json.dumps(result, indent=1, ensure_ascii=False, default=str)
    return text if len(text) <= RESULT_CAP else text[:RESULT_CAP] + f"\n[cut at {RESULT_CAP} characters]"


def transcript(conv: dict) -> str:
    lines = [f"# {conv.get('title', 'Chat')}", ""]
    for m in conv.get("messages") or []:
        lines.append(f"## {'You' if m['role'] == 'user' else 'Claude'}")
        for b in m.get("content") or []:
            t = b.get("type")
            if t == "text" and b.get("text"):
                lines.append(b["text"])
            elif t in ("tool_use", "server_tool_use", "mcp_tool_use"):
                lines.append(f"[{b.get('name')} {json.dumps(b.get('input') or {}, ensure_ascii=False)[:300]}]")
        for c in (m.get("meta") or {}).get("comments") or []:
            lines.append(f"[comment on {c.get('path')}: {c.get('note')}]")
        lines.append("")
    return "\n".join(lines)


def build(call: Caller, catalogue: Catalogue) -> Server:
    def client_of(ctx) -> str:
        try:
            info = ctx.session.client_params.client_info
            return f"{info.name} {info.version}".strip()
        except AttributeError:
            meta = ctx.meta or {}
            info = (meta.get("io.modelcontextprotocol/clientInfo") if isinstance(meta, dict) else None) or {}
            return str(info.get("name") or "an outside agent")

    async def list_tools(ctx, params) -> types.ListToolsResult:
        return types.ListToolsResult(tools=to_tools(await catalogue()))

    async def call_tool(ctx, params: types.CallToolRequestParams) -> types.CallToolResult:
        args = dict(params.arguments or {})
        if params.name == "run_command":
            cid, cparams = str(args.get("id") or ""), args.get("params") or {}
        else:
            cid, cparams = command_of(params.name, [c["id"] for c in await catalogue()]), args
        if not cid:
            return types.CallToolResult(content=[types.TextContent(type="text", text=f"Format has no tool {params.name}; list the tools again, or use run_command with a dotted command id")], is_error=True)
        try:
            result = await call(cid, cparams, client_of(ctx))
        except Exception as exc:
            return types.CallToolResult(content=[types.TextContent(type="text", text=for_agents(str(exc)))], is_error=True)
        return types.CallToolResult(content=[types.TextContent(type="text", text=_text(result))])

    async def list_resources(ctx, params) -> types.ListResourcesResult:
        out: list[types.Resource] = []
        try:
            convs = (await call("conversation.list", {"limit": 50}, client_of(ctx)))["conversations"]
            arts = (await call("artifact.list", {}, client_of(ctx)))["artifacts"][:50]
        except Exception as exc:
            raise ValueError(for_agents(str(exc))) from None
        out += [types.Resource(uri=f"format://conversation/{c['id']}", name=c["title"], title=c["title"], mime_type="text/markdown",
                               description="Transcript of a Format chat") for c in convs]
        out += [types.Resource(uri=f"format://artifact/{a['id']}", name=a["title"], title=a["title"], mime_type="text/html",
                               description=f"Artifact page, version {a['latest']}, from the chat {a.get('chatTitle', '')}") for a in arts]
        return types.ListResourcesResult(resources=out)

    async def list_templates(ctx, params) -> types.ListResourceTemplatesResult:
        return types.ListResourceTemplatesResult(resource_templates=[
            types.ResourceTemplate(uri_template="format://conversation/{id}", name="conversation", title="Chat transcript", mime_type="text/markdown"),
            types.ResourceTemplate(uri_template="format://artifact/{id}", name="artifact", title="Artifact page (latest version)", mime_type="text/html"),
        ])

    async def read_resource(ctx, params: types.ReadResourceRequestParams) -> types.ReadResourceResult:
        uri = str(params.uri)
        kind, _, rid = uri.removeprefix("format://").partition("/")
        if kind == "conversation":
            conv = await call("conversation.get", {"id": rid}, client_of(ctx))
            return types.ReadResourceResult(contents=[types.TextResourceContents(uri=uri, mime_type="text/markdown", text=transcript(conv))])
        if kind == "artifact":
            a = await call("artifact.get", {"id": rid}, client_of(ctx))
            return types.ReadResourceResult(contents=[types.TextResourceContents(uri=uri, mime_type="text/html", text=a["content"])])
        raise ValueError(f"Format has no resource {uri}")

    async def list_prompts(ctx, params) -> types.ListPromptsResult:
        return types.ListPromptsResult(prompts=[types.Prompt(name=n, title=d, description=d, arguments=[types.PromptArgument(name=a, description=ad, required=r) for a, ad, r in args])
                                                for n, d, args in PROMPTS])

    async def get_prompt(ctx, params: types.GetPromptRequestParams) -> types.GetPromptResult:
        a = dict(params.arguments or {})
        if params.name == "ask_claude_in_format":
            text = f"Use Format's tools: call send_message with text set to the question below and no conversationId, then wait_for_reply with the conversationId it returns, and report Claude's reply.\n\nQuestion: {a.get('question', '')}"
        elif params.name == "publish_page":
            chat = a.get("chat") or ""
            where = f"into the chat {chat}" if chat else "into a new chat (create one with create_conversation, title it after the page)"
            text = f"Write one self-contained HTML page (inline CSS and JavaScript) that does this: {a.get('description', '')}. Then publish it with publish_artifact {where}, with a short title. Tell the person it is in Format's Artifacts page."
        elif params.name == "summarize_chat":
            text = f"Read the Format chat {a.get('conversationId', '')} with get_conversation (or the resource format://conversation/{a.get('conversationId', '')}) and summarize what was asked, what Claude did and what is still open."
        else:
            raise ValueError(f"Format has no prompt {params.name}")
        return types.GetPromptResult(description=next((d for n, d, _ in PROMPTS if n == params.name), ""),
                                     messages=[types.PromptMessage(role="user", content=types.TextContent(type="text", text=text))])

    return Server(
        "format", version=config.VERSION, title="Format", description="A.T, the Agentic Terminal: chats, artifacts, projects and tools on the Claude API",
        instructions=INSTRUCTIONS,
        cache_hints={"tools/list": CacheHint(ttl_ms=300_000, scope="private"), "prompts/list": CacheHint(ttl_ms=300_000, scope="private"),
                     "resources/templates/list": CacheHint(ttl_ms=300_000, scope="private"), "resources/list": CacheHint(ttl_ms=5_000, scope="private"),
                     "resources/read": CacheHint(ttl_ms=0, scope="private")},
        on_list_tools=list_tools, on_call_tool=call_tool, on_list_resources=list_resources, on_list_resource_templates=list_templates,
        on_read_resource=read_resource, on_list_prompts=list_prompts, on_get_prompt=get_prompt,
    )
