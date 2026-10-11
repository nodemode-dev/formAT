import json

from app.engine import events, store
from app.engine.commands import CommandError, command

MODELS = [
    {"id": "claude-opus-5-5", "name": "Opus 5.5", "provider": "anthropic", "description": "For complex work and everyday tasks"},
    {"id": "claude-sonnet-5-5", "name": "Sonnet 5.5", "provider": "anthropic", "description": "Fast and capable for most tasks"},
    {"id": "claude-haiku-5-5", "name": "Haiku 5.5", "provider": "anthropic", "description": "Fastest for quick answers"},
    {"id": "claude-fable-5-1", "name": "Fable 5.1", "provider": "anthropic", "description": "The Mythos tier"},
]
EFFORTS = ["low", "medium", "high", "extra", "max"]
DEFAULTS = {"model": "claude-opus-5-5", "effort": "medium", "thinking": True, "permissionMode": "ask"}
CHOICES = {"model": [m["id"] for m in MODELS], "effort": EFFORTS, "permissionMode": ["ask", "auto", "plan"]}


def current() -> dict:
    out = dict(DEFAULTS)
    for r in store.rows("SELECT key, value FROM meta WHERE key LIKE 'setting.%'"):
        out[r["key"][8:]] = json.loads(r["value"])
    return out


@command("models.list", "Models", mutates=False,
         description="Models the picker offers. Until v0.3.0 reads them from the provider, this is a built-in list (source: fixture).")
def models() -> dict:
    return {"models": MODELS, "efforts": EFFORTS, "source": "fixture"}


@command("settings.get", "Settings", mutates=False, description="The chat settings: model, effort, thinking and permission mode.")
def get() -> dict:
    return current()


@command("settings.set", "Change a setting", {"key": {"type": "string", "required": True, "enum": list(DEFAULTS)}, "value": {"required": True}},
         description="Sets one chat setting; model, effort and permissionMode take one of their listed values, thinking takes true or false.")
def set_(key: str, value: object) -> dict:
    if key == "thinking" and not isinstance(value, bool):
        raise CommandError("settings.set: thinking takes true or false")
    if key in CHOICES and value not in CHOICES[key]:
        raise CommandError(f"settings.set: {key} must be one of {', '.join(CHOICES[key])}")
    store.run("INSERT INTO meta(key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (f"setting.{key}", json.dumps(value)))
    settings = current()
    events.publish("settings.changed", settings=settings)
    return settings
