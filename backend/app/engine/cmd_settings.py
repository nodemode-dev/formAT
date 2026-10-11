import json

from app import providers
from app.engine import events, store
from app.engine.commands import CommandError, command
from app.harness.request import EFFORT_ORDER, efforts_for
from app.providers.anthropic_provider import FALLBACK_MODELS

LINE_NOTE = {"opus": "For complex work and everyday tasks", "sonnet": "Fast and capable for most tasks", "haiku": "Fastest for quick answers",
             "fable": "The Mythos tier, with extra safeguards", "mythos": "The Mythos tier"}
EFFORTS = EFFORT_ORDER
DEFAULTS = {"model": "claude-opus-5-5", "effort": "medium", "thinking": True, "permissionMode": "ask", "autoCompact": True, "compactAt": 0.75,
            "webTools": True, "workspaceTools": True, "toolAllow": [], "toolDeny": [], "agentModel": "", "agentLimit": 4}
TOOL_NAMES = ["bash", "write", "edit"]
CHOICES = {"effort": EFFORTS, "permissionMode": ["ask", "auto", "plan"]}


def _shape(m: dict) -> dict:
    name = m.get("display_name") or m["id"]
    short = name[7:] if name.startswith("Claude ") else name
    return {"id": m["id"], "name": short, "displayName": name, "provider": "anthropic", "line": m.get("line"),
            "description": LINE_NOTE.get(m.get("line") or "", ""), "efforts": efforts_for(m),
            "maxTokens": m.get("max_tokens"), "contextWindow": m.get("max_input_tokens"), "raw": m}


def model_records() -> tuple[list[dict], str, str | None]:
    try:
        return [_shape(m) for m in providers.get("anthropic").list_models()], "anthropic", None
    except providers.ProviderError as exc:
        return [_shape(m) for m in FALLBACK_MODELS], "fallback", str(exc)


def find_model(model_id: str) -> dict:
    models, _, _ = model_records()
    for m in models:
        if m["id"] == model_id:
            return m
    return _shape({"id": model_id, "display_name": model_id})


def current() -> dict:
    out = dict(DEFAULTS)
    for r in store.rows("SELECT key, value FROM meta WHERE key LIKE 'setting.%'"):
        out[r["key"][8:]] = json.loads(r["value"])
    return out


@command("models.list", "Models", mutates=False,
         description="Models from the Anthropic models endpoint with the effort levels each supports (cached 10 minutes); without a working key, a built-in list marked source fallback with the reason.")
def models() -> dict:
    items, source, error = model_records()
    for m in items:
        m.pop("raw", None)
    return {"models": items, "efforts": EFFORTS, "source": source, "error": error}


@command("settings.get", "Settings", mutates=False, description="The chat settings: model, effort, thinking, permission mode, autoCompact and compactAt.")
def get() -> dict:
    return current()


@command("settings.set", "Change a setting", {"key": {"type": "string", "required": True, "enum": list(DEFAULTS)}, "value": {"required": True}},
         description="Sets one chat setting: model takes a model id from models.list, effort one of low, medium, high, xhigh, max, permissionMode ask, auto or plan, thinking (show Claude's thinking) true or false, autoCompact (summarize long chats) true or false, compactAt the share of the context window that triggers it, 0.05 to 0.95, webTools (web search and fetch) and workspaceTools (bash and files in the chat's folder) true or false, toolAllow and toolDeny lists of bash, write, edit, agentModel the sub-agents' model id (empty for the chat's model), agentLimit the most sub-agents in one reply, 0 to 10.")
def set_(key: str, value: object) -> dict:
    if key in ("thinking", "autoCompact", "webTools", "workspaceTools") and not isinstance(value, bool):
        raise CommandError(f"settings.set: {key} takes true or false")
    if key == "agentModel" and not isinstance(value, str):
        raise CommandError("settings.set: agentModel takes a model id from models.list, or an empty string for the chat's model")
    if key == "agentLimit" and (isinstance(value, bool) or not isinstance(value, int) or not 0 <= value <= 10):
        raise CommandError("settings.set: agentLimit takes a whole number from 0 (no sub-agents) to 10")
    if key in ("toolAllow", "toolDeny") and (not isinstance(value, list) or any(v not in TOOL_NAMES for v in value)):
        raise CommandError(f"settings.set: {key} takes a list of tool names from {', '.join(TOOL_NAMES)}")
    if key == "compactAt" and (isinstance(value, bool) or not isinstance(value, (int, float)) or not 0.05 <= float(value) <= 0.95):
        raise CommandError("settings.set: compactAt takes a number from 0.05 to 0.95")
    if key == "model" and (not isinstance(value, str) or not value.strip()):
        raise CommandError("settings.set: model takes a model id from models.list")
    if key in CHOICES and value not in CHOICES[key]:
        raise CommandError(f"settings.set: {key} must be one of {', '.join(CHOICES[key])}")
    store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (f"setting.{key}", json.dumps(value)))
    settings = current()
    events.publish("settings.changed", settings=settings)
    return settings
