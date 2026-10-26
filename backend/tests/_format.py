import copy
import threading
import time

import pytest

from app import providers
from app.engine import chat
from app.engine.commands import dispatch
from app.providers.base import Provider, StreamEvent

MODEL = {"id": "test-model", "display_name": "Test Model", "max_tokens": 32000, "max_input_tokens": 200000, "capabilities": {}}


def text_reply(text="ok"):
    return [StreamEvent("start", data={"usage": {"input_tokens": 10, "output_tokens": 0}}),
            StreamEvent("block_start", index=0, block={"type": "text", "text": ""}),
            StreamEvent("text", index=0, text=text),
            StreamEvent("block_stop", index=0),
            StreamEvent("message_delta", data={"stop_reason": "end_turn", "usage": {"output_tokens": 2}})]


def tool_reply(tool_id, name, input_json):
    return [StreamEvent("start", data={"usage": {"input_tokens": 10, "output_tokens": 0}}),
            StreamEvent("block_start", index=0, block={"type": "tool_use", "id": tool_id, "name": name, "input": {}}),
            StreamEvent("input_json", index=0, text=input_json),
            StreamEvent("block_stop", index=0),
            StreamEvent("message_delta", data={"stop_reason": "tool_use", "usage": {"output_tokens": 5}})]


class FakeProvider(Provider):
    name = "anthropic"

    def __init__(self):
        self.requests = []
        self.uploads = []
        self.script = []
        self.lock = threading.Lock()

    def configured(self):
        return True

    def list_models(self):
        return [MODEL]

    def key_tag(self):
        return "fake-key"

    def upload_file(self, path, name, mime):
        self.uploads.append({"path": path, "name": name, "mime": mime})
        return f"file_fake_{len(self.uploads)}"

    def stream(self, request, cancel):
        with self.lock:
            self.requests.append(copy.deepcopy(request))
            events = self.script.pop(0) if self.script else text_reply()
        yield from events


@pytest.fixture
def fake(monkeypatch, client):
    p = FakeProvider()
    monkeypatch.setitem(providers.PROVIDERS, "anthropic", p)
    for key, value in (("chatEngine", "api"), ("model", MODEL["id"]), ("autoCompact", False), ("permissionMode", "ask"), ("webTools", False), ("memory", False), ("browserTools", False)):
        dispatch("settings.set", {"key": key, "value": value})
    yield p
    deadline = time.monotonic() + 10
    while chat.RUNS and time.monotonic() < deadline:
        for cid in list(chat.RUNS):
            chat.stop(cid)
        time.sleep(0.05)


def run(client, cid, params=None):
    r = client.post(f"/api/commands/{cid}", json=params or {})
    body = r.json()
    assert r.status_code == 200 and body.get("ok"), f"{cid}: {r.status_code} {body}"
    return body["result"]


def wait_done(conversation_id, timeout=20):
    return dispatch("chat.wait", {"conversationId": conversation_id, "timeout": timeout})


def wait_until(check, timeout=10):
    deadline = time.monotonic() + timeout
    while time.monotonic() < deadline:
        value = check()
        if value:
            return value
        time.sleep(0.05)
    raise AssertionError("the condition never held")
