import hashlib
import threading
import time
from typing import Iterator

import anthropic

from app.core import secrets
from app.providers.base import Provider, ProviderError, StreamEvent

FALLBACK_MODELS = [
    {"id": "claude-opus-5-5", "display_name": "Claude Opus 5.5", "line": "opus"},
    {"id": "claude-sonnet-5-5", "display_name": "Claude Sonnet 5.5", "line": "sonnet"},
    {"id": "claude-haiku-5-5", "display_name": "Claude Haiku 5.5", "line": "haiku"},
    {"id": "claude-fable-5-1", "display_name": "Claude Fable 5.1", "line": "fable"},
]
COMPACT_BETA = "compact-2026-09-04"
COMPACTION_MODELS = {"claude-fable-5-1", "claude-mythos-5-1", "claude-fable-5", "claude-mythos-5", "claude-mythos-preview", "claude-opus-5-5",
                     "claude-opus-5", "claude-opus-4-8", "claude-opus-4-7", "claude-opus-4-6", "claude-sonnet-5-5", "claude-sonnet-5",
                     "claude-sonnet-4-6", "claude-haiku-5-5"}


def _api_error(exc: Exception) -> ProviderError:
    if isinstance(exc, anthropic.AuthenticationError):
        return ProviderError("The Anthropic API refused the key (401): check it in Settings > API keys", 401)
    if isinstance(exc, anthropic.BadRequestError):
        return ProviderError(f"The Anthropic API refused the request (400): {exc.message}", 400)
    if isinstance(exc, anthropic.RateLimitError):
        return ProviderError("Rate limited by the Anthropic API (429); try again shortly", 429)
    if isinstance(exc, anthropic.APIConnectionError):
        return ProviderError("Could not reach the Anthropic API; check the network")
    return ProviderError(f"Anthropic API error: {exc}")


class AnthropicProvider(Provider):
    name = "anthropic"

    def __init__(self) -> None:
        self._models: list[dict] | None = None
        self._models_at = 0.0
        self._models_key: str | None = None

    def _client(self) -> anthropic.Anthropic:
        key = secrets.api_key("anthropic")
        if not key:
            raise ProviderError("No Anthropic API key: add one in Settings > API keys, or set ANTHROPIC_API_KEY in backend/.env", 401)
        return anthropic.Anthropic(api_key=key, max_retries=2)

    def configured(self) -> bool:
        return bool(secrets.api_key("anthropic"))

    def list_models(self) -> list[dict]:
        key = secrets.api_key("anthropic")
        if self._models is not None and self._models_key == key and time.time() - self._models_at < 600:
            return self._models
        try:
            page = self._client().models.list(limit=100)
            models = [m.model_dump(mode="json") for m in page.data if getattr(m, "lifecycle", "active") != "retired"]
        except anthropic.AuthenticationError:
            raise ProviderError("The Anthropic API refused the key (401): check it in Settings > API keys", 401) from None
        except anthropic.APIError as exc:
            raise ProviderError(f"Anthropic models list failed: {exc}") from None
        self._models, self._models_at, self._models_key = models, time.time(), key
        return models

    def key_tag(self) -> str | None:
        key = secrets.api_key("anthropic")
        return hashlib.sha256(key.encode()).hexdigest()[:16] if key else None

    def upload_file(self, path: str, name: str, mime: str) -> str:
        try:
            with open(path, "rb") as fh:
                return self._client().files.upload(file=(name, fh, mime)).id
        except anthropic.APIError as exc:
            raise _api_error(exc) from None

    def delete_file(self, file_id: str) -> None:
        try:
            self._client().files.delete(file_id)
        except anthropic.NotFoundError:
            return
        except anthropic.APIError as exc:
            raise _api_error(exc) from None

    def can_compact(self, model: dict) -> bool:
        caps = model.get("capabilities") or {}
        if isinstance(caps.get("compaction"), dict) and "supported" in caps["compaction"]:
            return bool(caps["compaction"]["supported"])
        return model.get("id") in COMPACTION_MODELS

    def compact(self, request: dict) -> dict:
        req = {k: v for k, v in request.items() if k not in ("betas", "stream")}
        betas = [COMPACT_BETA] + [b for b in request.get("betas") or [] if b != COMPACT_BETA]
        try:
            res = self._client().beta.messages.create(betas=betas, compaction={"type": "summarize"}, **req)
        except anthropic.APIError as exc:
            raise _api_error(exc) from None
        return {"stop_reason": res.stop_reason, "content": [b.to_dict() for b in res.content], "usage": res.usage.to_dict()}

    def stream(self, request: dict, cancel: threading.Event) -> Iterator[StreamEvent]:
        client = self._client()
        try:
            opened = client.beta.messages.create(stream=True, **request) if request.get("betas") else client.messages.create(stream=True, **request)
            with opened as events:
                for ev in events:
                    if cancel.is_set():
                        yield StreamEvent("stopped")
                        return
                    t = ev.type
                    if t == "message_start":
                        yield StreamEvent("start", data={"id": ev.message.id, "model": ev.message.model, "usage": ev.message.usage.model_dump(mode="json")})
                    elif t == "content_block_start":
                        yield StreamEvent("block_start", index=ev.index, block=ev.content_block.model_dump(mode="json", exclude_none=True))
                    elif t == "content_block_delta":
                        d = ev.delta
                        if d.type == "text_delta":
                            yield StreamEvent("text", index=ev.index, text=d.text)
                        elif d.type == "thinking_delta":
                            yield StreamEvent("thinking", index=ev.index, text=d.thinking)
                        elif d.type == "signature_delta":
                            yield StreamEvent("signature", index=ev.index, text=d.signature)
                        elif d.type == "input_json_delta":
                            yield StreamEvent("input_json", index=ev.index, text=d.partial_json)
                        elif d.type == "citations_delta":
                            yield StreamEvent("citation", index=ev.index, data=d.citation.model_dump(mode="json"))
                    elif t == "content_block_stop":
                        yield StreamEvent("block_stop", index=ev.index)
                    elif t == "message_delta":
                        yield StreamEvent("message_delta", data={"stop_reason": ev.delta.stop_reason, "usage": ev.usage.model_dump(mode="json")})
                    elif t == "message_stop":
                        yield StreamEvent("stop")
        except anthropic.APIError as exc:
            raise _api_error(exc) from None
