import json
import os
import threading
from pathlib import Path

from app.core import config

PROVIDERS = {"anthropic": "ANTHROPIC_API_KEY", "openai": "OPENAI_API_KEY", "elevenlabs": "ELEVENLABS_API_KEY"}
_lock = threading.Lock()


def _path() -> Path:
    return config.data_dir() / "secrets.json"


def location() -> Path:
    return _path()


def _read() -> dict:
    p = _path()
    if not p.is_file():
        return {}
    try:
        return json.loads(p.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return {}


def _write(data: dict) -> None:
    p = _path()
    tmp = p.with_suffix(".tmp")
    fd = os.open(tmp, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(data, fh)
    os.replace(tmp, p)
    try:
        os.chmod(p, 0o600)
    except OSError:
        pass


def api_key(provider: str) -> str | None:
    with _lock:
        saved = _read().get(provider)
    if saved:
        return saved
    var = PROVIDERS.get(provider)
    return os.environ.get(var) if var else None


def source(provider: str) -> str | None:
    with _lock:
        if _read().get(provider):
            return "format"
    var = PROVIDERS.get(provider)
    if var and os.environ.get(var):
        return ".env" if var in config.ENV_FILE_KEYS else "environment"
    return None


def save(provider: str, key: str) -> None:
    with _lock:
        data = _read()
        data[provider] = key
        _write(data)


def clear(provider: str) -> None:
    with _lock:
        data = _read()
        data.pop(provider, None)
        _write(data)


def hint(provider: str) -> str | None:
    key = api_key(provider)
    if not key:
        return None
    return f"...{key[-4:]}" if len(key) > 8 else "set"
