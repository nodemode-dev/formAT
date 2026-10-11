from app.harness import content, prompt

EFFORT_ORDER = ["low", "medium", "high", "xhigh", "max"]
KEEP_BLOCKS = {"text", "thinking", "redacted_thinking", "image", "document", "tool_use", "tool_result"}


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


def api_messages(history: list[dict], model: dict, accepts) -> list[dict]:
    out: list[dict] = []
    for m in history:
        blocks: list[dict] = []
        if m["role"] == "user":
            for fid in (m.get("meta") or {}).get("attachments", []):
                blocks.extend(content.blocks_for(fid, model, accepts))
        for b in m["content"]:
            if b.get("type") not in KEEP_BLOCKS:
                continue
            if b["type"] == "text" and not b.get("text"):
                continue
            clean = {k: v for k, v in b.items() if k not in ("citations",) or v}
            blocks.append(clean)
        if not blocks:
            continue
        if out and out[-1]["role"] == m["role"]:
            out[-1]["content"].extend(blocks)
        else:
            out.append({"role": m["role"], "content": blocks})
    return out


def build(history: list[dict], model: dict, settings: dict, account: dict, accepts) -> dict:
    effort = _effort(model, settings.get("effort", "medium"))
    max_tokens = _max_tokens(model, effort)
    req: dict = {
        "model": model["id"],
        "max_tokens": max_tokens,
        "system": prompt.system_prompt(account),
        "messages": api_messages(history, model, accepts),
        "cache_control": {"type": "ephemeral"},
    }
    if effort:
        req["output_config"] = {"effort": effort}
    thinking = _thinking(model, bool(settings.get("thinking", True)), max_tokens)
    if thinking:
        req["thinking"] = thinking
    return req
