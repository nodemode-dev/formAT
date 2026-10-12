from app.harness import content, prompt

EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"]
KEEP_BLOCKS = {"text", "thinking", "redacted_thinking", "image", "document", "tool_use", "tool_result", "compaction"}
COMPACT_BETA = "compact-2026-09-04"
COMPACT_MAX_TOKENS = 16000


def _is_summary(m: dict) -> bool:
    return any(b.get("type") == "compaction" and b.get("signature") for b in m.get("content") or [])


def since_summary(history: list[dict]) -> list[dict]:
    for i in range(len(history) - 1, -1, -1):
        if _is_summary(history[i]):
            return history[i:]
    return history


def _supported(caps: dict, *path: str) -> bool | None:
    node = caps
    for key in path:
        if not isinstance(node, dict) or key not in node or node[key] is None:
            return None
        node = node[key]
    return bool(node.get("supported")) if isinstance(node, dict) else None


def efforts_for(model: dict) -> list[str]:
    caps = model.get("capabilities") or {}
    if _supported(caps, "effort") is False:
        return []
    if not caps:
        return EFFORT_ORDER[:]
    return [e for e in EFFORT_ORDER if _supported(caps, "effort", e)]


def _effort(model: dict, wanted: str) -> str | None:
    levels = efforts_for(model)
    if not levels:
        return None
    if wanted in levels:
        return wanted
    below = [e for e in EFFORT_ORDER[: EFFORT_ORDER.index(wanted) + 1] if e in levels] if wanted in EFFORT_ORDER else []
    return below[-1] if below else levels[0]


def _thinking(model: dict, show: bool, max_tokens: int) -> dict | None:
    if not show:
        return None
    caps = model.get("capabilities") or {}
    if _supported(caps, "thinking", "types", "adaptive") is not False:
        return {"type": "adaptive", "display": "summarized"}
    if _supported(caps, "thinking", "types", "enabled"):
        return {"type": "enabled", "budget_tokens": max(1024, min(16000, max_tokens // 2))}
    return None


def _max_tokens(model: dict, effort: str | None) -> int:
    want = 64000 if effort in ("high", "xhigh", "max") else 32000
    cap = model.get("max_tokens") or want
    return int(min(want, cap))


def _assistant_block(b: dict) -> dict | None:
    t = b.get("type")
    if t == "text" and not b.get("text"):
        return None
    if t == "compaction":
        return {k: b[k] for k in ("type", "content", "signature") if k in b} if b.get("signature") else None
    if t in ("thinking", "redacted_thinking") and not (b.get("signature") or b.get("data")):
        return None
    return {k: v for k, v in b.items() if v is not None and not (k == "citations" and not v)}


def api_messages(history: list[dict], model: dict, accepts, provider=None) -> list[dict]:
    out: list[dict] = []

    def push(role: str, blocks: list[dict]) -> None:
        if not blocks:
            return
        if out and out[-1]["role"] == role:
            if role == "user" and any(b.get("type") == "tool_result" for b in blocks):
                out[-1]["content"] = blocks + out[-1]["content"]
            else:
                out[-1]["content"].extend(blocks)
        else:
            out.append({"role": role, "content": blocks})

    for m in since_summary(history):
        if m["role"] == "assistant":
            segment: list[dict] = []
            results: list[dict] = []
            for b in m["content"] if (m.get("meta") or {}).get("via") != "claude-code" else [x for x in m["content"] if x.get("type") == "text"]:
                if b.get("type") == "tool_result":
                    results.append({k: b[k] for k in ("type", "tool_use_id", "content", "is_error") if k in b})
                    continue
                if results:
                    push("assistant", segment)
                    push("user", results)
                    segment, results = [], []
                clean = _assistant_block(b)
                if clean:
                    segment.append(clean)
            push("assistant", segment)
            push("user", results)
            continue
        blocks: list[dict] = []
        for fid in (m.get("meta") or {}).get("attachments", []):
            blocks.extend(content.blocks_for(fid, model, accepts, provider))
        blocks.extend(content.comment_blocks((m.get("meta") or {}).get("comments")))
        for b in m["content"]:
            if b.get("type") not in KEEP_BLOCKS or (b["type"] == "text" and not b.get("text")):
                continue
            blocks.append({k: v for k, v in b.items() if k not in ("citations",) or v})
        push("user", blocks)
    return out


def project_blocks(project: dict | None, model: dict, accepts, provider=None) -> list[dict]:
    if not project or not project.get("files"):
        return []
    blocks: list[dict] = [{"type": "text", "text": f"Knowledge files of the project \"{project['name']}\", shared by every chat in it:"}]
    for fid in project["files"]:
        blocks.extend(content.blocks_for(fid, model, accepts, provider))
    return blocks


def build(history: list[dict], model: dict, settings: dict, account: dict, accepts, provider=None, tools: list[dict] | None = None, chat_folder: str | None = None,
          project: dict | None = None) -> dict:
    effort = _effort(model, settings.get("effort", "medium"))
    max_tokens = _max_tokens(model, effort)
    messages = api_messages(history, model, accepts, provider)
    knowledge = project_blocks(project, model, accepts, provider)
    first = next((m for m in messages if m["role"] == "user" and not any(b.get("type") == "tool_result" for b in m["content"])), None)
    if knowledge and first is not None:
        first["content"] = knowledge + first["content"]
    req: dict = {
        "model": model["id"],
        "max_tokens": max_tokens,
        "system": prompt.system_prompt(account, bool(tools), chat_folder, project, any(t.get("name") == "memory" for t in tools or [])),
        "messages": messages,
        "cache_control": {"type": "ephemeral"},
    }
    if settings.get("research"):
        req["system"].append({"type": "text", "text": prompt.RESEARCH})
    if settings.get("output") in prompt.OUTPUTS:
        req["system"].append({"type": "text", "text": prompt.OUTPUTS[settings["output"]]})
    if tools:
        req["tools"] = tools
    if effort:
        req["output_config"] = {"effort": effort}
    thinking = _thinking(model, bool(settings.get("thinking", True)), max_tokens)
    if thinking:
        req["thinking"] = thinking
    betas: list[str] = []
    if any(b.get("type") == "compaction" for msg in req["messages"] for b in msg["content"]):
        betas.append(COMPACT_BETA)
    wanted = {t["mcp_server_name"] for t in tools or [] if t.get("type") == "mcp_toolset"}
    used_mcp = any(b.get("type") in ("mcp_tool_use", "mcp_tool_result") for msg in req["messages"] for b in msg["content"])
    if wanted or used_mcp:
        from app.engine import connectors
        servers = [s for s in connectors.request_parts()[0] if s["name"] in wanted]
        if servers:
            req["mcp_servers"] = servers
        betas.append(connectors.MCP_BETA)
    if betas:
        req["betas"] = betas
    return req


def build_compaction(history: list[dict], model: dict, settings: dict, account: dict, accepts, provider=None, tools: list[dict] | None = None, chat_folder: str | None = None,
                     project: dict | None = None) -> dict:
    req = build(history, model, settings, account, accepts, provider, tools, chat_folder, project)
    req["max_tokens"] = int(min(COMPACT_MAX_TOKENS, model.get("max_tokens") or COMPACT_MAX_TOKENS))
    req["betas"] = [b for b in req.get("betas") or [] if b != COMPACT_BETA]
    if req.get("thinking", {}).get("type") == "enabled":
        req["thinking"]["budget_tokens"] = max(1024, min(req["thinking"]["budget_tokens"], req["max_tokens"] // 2))
    return req
