import json

from app import providers
from app.core import secrets
from app.engine import events, store
from app.engine.commands import CommandError, command

ACCOUNT_DEFAULTS = {"displayName": "", "preferences": "", "sendKey": "enter", "voiceLanguage": "en-US", "voiceEngine": "auto"}
VOICE_ENGINES = ["auto", "browser", "scribe", "local", "openai"]
PROVIDER = {"type": "string", "required": True, "enum": list(secrets.PROVIDERS)}


def account() -> dict:
    row = store.row("SELECT value FROM meta WHERE key = 'account'")
    data = dict(ACCOUNT_DEFAULTS)
    if row:
        data.update(json.loads(row["value"]))
    return data


@command("account.get", "Account", mutates=False, description="The person's profile: display name, response preferences (sent to Claude with every chat), send key, dictation language and dictation engine.")
def get() -> dict:
    return account()


@command("account.set", "Update account",
         {"displayName": {"type": "string"}, "preferences": {"type": "string"}, "sendKey": {"type": "string", "enum": ["enter", "modEnter"]},
          "voiceLanguage": {"type": "string"}, "voiceEngine": {"type": "string", "enum": VOICE_ENGINES}},
         description="Changes any of the profile fields; the rest stay as they are. voiceEngine picks dictation: auto (Format's best engine, else the browser), browser, scribe (ElevenLabs Scribe v2), local (Whisper large-v3-turbo) or openai.")
def set_(displayName: str | None = None, preferences: str | None = None, sendKey: str | None = None, voiceLanguage: str | None = None, voiceEngine: str | None = None) -> dict:
    data = account()
    for k, v in (("displayName", displayName), ("preferences", preferences), ("sendKey", sendKey), ("voiceLanguage", voiceLanguage), ("voiceEngine", voiceEngine)):
        if v is not None:
            data[k] = v.strip() if k != "preferences" else v
    if len(data["preferences"]) > 8000:
        raise CommandError("account.set: preferences are limited to 8000 characters")
    store.run("INSERT INTO meta(key, value) VALUES ('account', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps(data),))
    events.publish("account.changed", account=data)
    return data


def _status() -> dict:
    return {name: {"set": bool(secrets.api_key(name)), "source": secrets.source(name), "hint": secrets.hint(name)} for name in secrets.PROVIDERS}


@command("keys.status", "API keys", mutates=False,
         description="For each provider: whether a key is set, where it comes from (format: saved in Format's data folder; .env: backend/.env; environment) and its last four characters. Keys themselves are never returned.")
def status() -> dict:
    return _status()


@command("keys.set", "Save an API key", {"provider": PROVIDER, "key": {"type": "string", "required": True}},
         description="Saves a provider key in Format's data folder (owner-only file permissions). A saved key takes precedence over backend/.env and the environment.")
def set_key(provider: str, key: str) -> dict:
    key = key.strip()
    if len(key) < 20 or any(c.isspace() for c in key):
        raise CommandError("keys.set: that does not look like an API key")
    secrets.save(provider, key)
    provider_obj = providers.PROVIDERS.get(provider)
    if provider_obj is not None and hasattr(provider_obj, "_models"):
        provider_obj._models = None
    result = _status()
    events.publish("keys.changed", keys=result)
    return result


@command("keys.clear", "Remove a saved API key", {"provider": PROVIDER},
         description="Removes the key saved in Format; a key in backend/.env or the environment is used again if there is one.")
def clear_key(provider: str) -> dict:
    secrets.clear(provider)
    provider_obj = providers.PROVIDERS.get(provider)
    if provider_obj is not None and hasattr(provider_obj, "_models"):
        provider_obj._models = None
    result = _status()
    events.publish("keys.changed", keys=result)
    return result
