import asyncio

import pytest

from _format import run

from app.engine import devices
from app.engine.commands import dispatch

PAGE = "<!doctype html><title>t</title><p id=x>artifact body</p>"


def _directives(csp):
    return {d.split(" ", 1)[0]: d.split(" ", 1)[1] if " " in d else "" for d in (p.strip() for p in csp.split(";")) if d}


@pytest.fixture
def artifact(client):
    cid = run(client, "conversation.create", {"title": "artifacts"})["id"]
    a = run(client, "artifact.publish", {"conversationId": cid, "title": "Page", "html": PAGE})
    return a.get("id") or a["artifact"]["id"]


def test_an_artifact_is_served_sandboxed_and_never_same_origin(client, artifact):
    r = client.get(f"/api/artifacts/{artifact}/v/1")
    assert r.status_code == 200
    assert "artifact body" in r.text
    csp = _directives(r.headers["content-security-policy"])
    assert csp["sandbox"].split() == ["allow-scripts", "allow-popups", "allow-modals", "allow-downloads"]
    assert "allow-same-origin" not in r.headers["content-security-policy"]
    assert csp["default-src"] == "'none'"
    assert csp["connect-src"] == "'none'"
    assert csp["form-action"] == "'none'" and csp["base-uri"] == "'none'"
    assert r.headers["x-content-type-options"] == "nosniff"


def test_network_for_artifacts_opens_only_https_when_turned_on(client, artifact):
    dispatch("settings.set", {"key": "artifactNetwork", "value": True})
    try:
        csp = _directives(client.get(f"/api/artifacts/{artifact}/v/1").headers["content-security-policy"])
        assert csp["connect-src"] == "https:"
        assert "allow-same-origin" not in csp["sandbox"]
    finally:
        dispatch("settings.set", {"key": "artifactNetwork", "value": False})


def test_a_share_link_opens_with_its_token_and_nothing_else(client, artifact):
    shared = run(client, "artifact.share", {"id": artifact})
    token = shared["token"]
    r = client.get(f"/s/{token}")
    assert r.status_code == 200 and "artifact body" in r.text
    csp = _directives(r.headers["content-security-policy"])
    assert csp["frame-ancestors"] == "'none'"
    assert "allow-same-origin" not in r.headers["content-security-policy"]
    for wrong in (token[:-1], token + "x", "", "a" * len(token)):
        assert client.get(f"/s/{wrong}").status_code in (404, 410), wrong
    run(client, "artifact.unshare", {"id": artifact})
    assert client.get(f"/s/{token}").status_code == 410


class _Recorder:
    def __init__(self):
        self.called = False

    async def __call__(self, scope, receive, send):
        self.called = True
        await send({"type": "http.response.start", "status": 200, "headers": []})
        await send({"type": "http.response.body", "body": b"inside"})


def _through_gate(path, cookie=None, query=b"", kind="http"):
    api = _Recorder()
    gate = devices.Gate(api, None)
    sent = []
    headers = [(b"cookie", cookie.encode())] if cookie else []

    async def receive():
        return {"type": "http.request" if kind == "http" else "websocket.connect"}

    async def send(message):
        sent.append(message)

    asyncio.run(gate({"type": kind, "path": path, "query_string": query, "headers": headers}, receive, send))
    return api.called, sent


def test_the_devices_server_refuses_a_request_without_its_cookie(client):
    secret = devices._secret()
    for cookie in (None, "format_pair=wrong", f"other={secret}", "format_pair="):
        called, sent = _through_gate("/api/commands", cookie)
        assert not called, cookie
        assert sent[0]["status"] == 401
    called, sent = _through_gate("/api/commands", None, kind="websocket")
    assert not called and sent[0] == {"type": "websocket.close", "code": 4401}


def test_the_devices_server_lets_a_paired_device_in(client):
    called, _ = _through_gate("/api/commands", f"{devices.COOKIE}={devices._secret()}")
    assert called


def test_pairing_needs_the_code_and_sets_the_cookie(client):
    secret = devices._secret()
    called, sent = _through_gate("/pair", query=f"code={secret}".encode())
    assert not called and sent[0]["status"] == 303
    cookie = dict(sent[0]["headers"])[b"set-cookie"].decode()
    assert cookie.startswith(f"{devices.COOKIE}={secret};") and "HttpOnly" in cookie
    called, sent = _through_gate("/pair", query=b"code=guess")
    assert not called and sent[0]["status"] == 401


def test_share_links_pass_the_gate_without_pairing(client):
    called, _ = _through_gate("/s/anything")
    assert called


def test_forgetting_devices_changes_the_code(client):
    before = devices._secret()
    run(client, "devices.forget")
    after = devices._secret()
    assert after != before
    called, _ = _through_gate("/api/commands", f"{devices.COOKIE}={before}")
    assert not called
