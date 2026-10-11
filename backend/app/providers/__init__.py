from app.providers.base import Provider, ProviderError, StreamEvent
from app.providers.anthropic_provider import AnthropicProvider

PROVIDERS: dict[str, Provider] = {"anthropic": AnthropicProvider()}


def get(name: str = "anthropic") -> Provider:
    try:
        return PROVIDERS[name]
    except KeyError:
        raise ProviderError(f"No provider {name}; Format has {', '.join(PROVIDERS)}") from None


__all__ = ["Provider", "ProviderError", "StreamEvent", "PROVIDERS", "get"]
