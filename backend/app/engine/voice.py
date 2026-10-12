import os
import tempfile

import httpx

from app.core import secrets

OPENAI_URL = "https://api.openai.com/v1/audio/transcriptions"
ORDER = ("scribe", "local", "openai")
LABELS = {"scribe": "ElevenLabs Scribe v2", "local": "local Whisper", "openai": "OpenAI"}
_local_model = None


class VoiceError(Exception):
    pass


def local_model_name() -> str:
    return os.environ.get("FORMAT_WHISPER_MODEL") or "large-v3-turbo"


def scribe_model_name() -> str:
    return os.environ.get("FORMAT_SCRIBE_MODEL") or "scribe_v2"


def engines() -> dict:
    import importlib.util
    local = importlib.util.find_spec("faster_whisper") is not None
    have = {"scribe": bool(secrets.api_key("elevenlabs")), "local": local, "openai": bool(secrets.api_key("openai"))}
    return have | {"localModel": local_model_name(), "scribeModel": scribe_model_name(), "order": [e for e in ORDER if have[e]]}


def _scribe(data: bytes, filename: str, mime: str, language: str | None) -> str:
    url = (os.environ.get("FORMAT_ELEVENLABS_URL") or "https://api.elevenlabs.io").rstrip("/") + "/v1/speech-to-text"
    form = {"model_id": scribe_model_name(), "tag_audio_events": "false", "timestamps_granularity": "none"}
    if language:
        form["language_code"] = language.split("-")[0]
    try:
        r = httpx.post(url, headers={"xi-api-key": secrets.api_key("elevenlabs") or ""}, data=form, files={"file": (filename, data, mime)}, timeout=180)
    except httpx.HTTPError as exc:
        raise VoiceError(f"Could not reach ElevenLabs for transcription: {exc}") from None
    if r.status_code != 200:
        raise VoiceError(f"ElevenLabs transcription failed ({r.status_code}): {r.text[:200]}")
    return str(r.json().get("text", "")).strip()


def _local(path: str, language: str | None) -> str:
    global _local_model
    from faster_whisper import WhisperModel
    if _local_model is None:
        name = local_model_name()
        try:
            _local_model = WhisperModel(name, device="auto", compute_type="int8")
        except Exception as exc:
            raise VoiceError(f"The local speech model {name} could not be loaded ({type(exc).__name__}: {str(exc).splitlines()[0][:160]}). "
                             "It downloads from Hugging Face on first use; check the network, or set FORMAT_WHISPER_MODEL to a model folder on this computer") from None
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


def _run_local(data: bytes, filename: str, language: str | None) -> str:
    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as fh:
        fh.write(data)
        path = fh.name
    try:
        return _local(path, language)
    finally:
        os.unlink(path)


def transcribe(data: bytes, filename: str, mime: str, language: str | None, prefer: str | None = None) -> dict:
    order = engines()["order"]
    if prefer in order:
        order = [prefer] + [e for e in order if e != prefer]
    if not order:
        raise VoiceError("No transcription engine: add an ElevenLabs key (Scribe v2) or an OpenAI key in Settings > API keys, or install local Whisper with ./format install-voice")
    failures = []
    for engine in order:
        try:
            if engine == "scribe":
                text = _scribe(data, filename, mime, language)
            elif engine == "local":
                text = _run_local(data, filename, language)
            else:
                text = _openai(data, filename, mime, language)
            return {"text": text, "engine": engine, "model": scribe_model_name() if engine == "scribe" else local_model_name() if engine == "local" else os.environ.get("FORMAT_TRANSCRIBE_MODEL", "whisper-1")}
        except VoiceError as exc:
            failures.append(f"{LABELS[engine]}: {exc}")
    raise VoiceError(" | ".join(failures))
