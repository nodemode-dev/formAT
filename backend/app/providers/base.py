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

    def key_tag(self) -> str | None:
        return None

    def upload_file(self, path: str, name: str, mime: str) -> str:
        raise ProviderError(f"{self.name} has no file store", 400)

    def delete_file(self, file_id: str) -> None:
        return None

    def can_compact(self, model: dict) -> bool:
        return False

    def compact(self, request: dict) -> dict:
        raise ProviderError(f"{self.name} has no compaction", 400)

    def accepts(self, model: dict, kind: str) -> bool:
        caps: Any = model.get("capabilities") or {}
        if kind == "image":
            return bool((caps.get("image_input") or {}).get("supported", True))
        if kind == "pdf":
            return bool((caps.get("pdf_input") or {}).get("supported", True))
        return True
