import threading
from dataclasses import dataclass, field
from typing import Any, Iterator


class ProviderError(Exception):
    def __init__(self, message: str, status: int = 502):
        super().__init__(message)
        self.status = status


@dataclass
class StreamEvent:
    kind: str
    index: int = 0
    block: dict = field(default_factory=dict)
    text: str = ""
    data: dict = field(default_factory=dict)


class Provider:
    name = "base"

    def configured(self) -> bool:
        raise NotImplementedError

    def list_models(self) -> list[dict]:
        raise NotImplementedError

    def stream(self, request: dict, cancel: threading.Event) -> Iterator[StreamEvent]:
        raise NotImplementedError

    def accepts(self, model: dict, kind: str) -> bool:
        caps: Any = model.get("capabilities") or {}
        if kind == "image":
            return bool((caps.get("image_input") or {}).get("supported", True))
        if kind == "pdf":
            return bool((caps.get("pdf_input") or {}).get("supported", True))
        return True
