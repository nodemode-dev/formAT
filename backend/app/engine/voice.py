import os
import tempfile

import httpx

from app.core import secrets

OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions"
_local_model = None


class VoiceError(Exception):
    pass


def engines() -> dict:
    import importlib.util
    local = importlib.util.find_spec("faster_whisper") is not None
    return {"local": local, "openai": bool(secrets.api_key("openai"))}


def _local(path: str, language: str | None) -> str:
    global _local_model
    from faster_whisper import WhisperModel
    if _local_model is None:
        _local_model = WhisperModel(os.environ.get("FORMAT_WHISPER_MODEL", "base"), device="auto", compute_type="int8")
    segments, _ = _local_model.transcribe(path, language=(language or "").split("-")[0] or None, vad_filter=True)
    return " ".join(s.text.strip() for s in segments).strip()


def _openai(data: bytes, filename: str, mime: str, language: str | None) -> str:
    key = secrets.api_key("openai")
    model = os.environ.get("FORMAT_TRANSCRIBE_MODEL", "whisper-1")
    form = {"model": model}
    if language:
        form["language"] = language.split("-")[0]
    try:
        r = httpx.post(OPENAI_URL, headers={"Authorization": f"Bearer {key}"}, data=form, files={"file": (filename, data, mime)}, timeout=120)
    except httpx.HTTPError as exc:
        raise VoiceError(f"Could not reach OpenAI for transcription: {exc}") from None
    if r.status_code != 200:
        raise VoiceError(f"OpenAI transcription failed ({r.status_code}): {r.text[:200]}")
    return str(r.json().get("text", "")).strip()


def transcribe(data: bytes, filename: str, mime: str, language: str | None) -> dict:
    available = engines()
    if available["local"]:
        suffix = os.path.splitext(filename)[1] or ".webm"
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as fh:
            fh.write(data)
            path = fh.name
        try:
            return {"text": _local(path, language), "engine": "local"}
        finally:
            os.unlink(path)
    if available["openai"]:
        return {"text": _openai(data, filename, mime, language), "engine": "openai"}
    raise VoiceError("No transcription engine: install the local one with ./format install-voice, or add an OpenAI key in Settings > API keys")
