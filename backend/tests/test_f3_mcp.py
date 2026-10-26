import json
import subprocess
import threading
import time

import pytest

from conftest import BACKEND, MCP_PATH, READ_TOOL, STDIO_CMD, set_policy, tool_catalogue

from app.engine import agents, events


ACCEPT = {"accept": "application/json, text/event-stream"}


def reply_of(r):
    if r.headers.get("content-type", "").startswith("text/event-stream"):
        data = [line[5:].strip() for line in r.text.splitlines() if line.startswith("data:")]
        return json.loads(data[-1])
    return r.json()


def initialize(client, headers=None):
    body = {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "family-test", "version": "1"}}}
    return client.post(MCP_PATH, json=body, headers={**ACCEPT, **(headers or {})})


def session(client):
    r = initialize(client)
    sid = r.headers.get("mcp-session-id")
    headers = {**ACCEPT, **({"mcp-session-id": sid} if sid else {})}
    client.post(MCP_PATH, json={"jsonrpc": "2.0", "method": "notifications/initialized"}, headers=headers)
    return headers


def rpc(client, method, params, headers, rid=3):
    return reply_of(client.post(MCP_PATH, json={"jsonrpc": "2.0", "id": rid, "method": method, "params": params}, headers=headers))


def call(client, name, args, headers):
    return rpc(client, "tools/call", {"name": name, "arguments": args}, headers)["result"]


@pytest.fixture
def policy():
    set_policy("allowed")
    yield set_policy
    set_policy("allowed")


def test_initialize_without_origin_answers(client):
    r = initialize(client)
    assert r.status_code == 200
    result = reply_of(r)["result"]
    assert result["protocolVersion"]
    assert result["serverInfo"]["name"] == "format"
    assert "tools" in result["capabilities"]


def test_initialize_from_a_foreign_origin_is_refused(client):
    assert initialize(client, {"origin": "http://evil.example"}).status_code == 403


def test_tools_list_matches_the_catalogue(client):
    listed = rpc(client, "tools/list", {}, session(client), rid=2)["result"]["tools"]
    catalogue = tool_catalogue()
    assert sorted(t["name"] for t in listed) == sorted(t["name"] for t in catalogue)
    assert "run_command" in {t["name"] for t in listed}
    for tool in listed:
        assert tool["description"].strip()
        assert tool["inputSchema"]["type"] == "object"


def test_read_only_tool_returns_a_valid_result(client, policy):
    name, args = READ_TOOL
    result = call(client, name, args, session(client))
    assert not result.get("isError")
    assert result["content"] and all(c["type"] == "text" for c in result["content"])
    assert json.loads(result["content"][0]["text"])["outsideAgents"] == "allowed"


def test_unknown_method_is_a_jsonrpc_error(client):
    reply = rpc(client, "no/such/method", {}, session(client), rid=4)
    assert reply["error"]["code"] == -32601


def test_blocked_outside_agents_are_refused(client, policy):
    policy("blocked")
    result = call(client, READ_TOOL[0], READ_TOOL[1], session(client))
    assert result["isError"]
    assert "turned off outside agents" in result["content"][0]["text"]


def test_ask_waits_for_the_window_and_refuses_without_an_answer(client, policy, monkeypatch):
    policy("ask")
    monkeypatch.setattr(agents, "WAIT_SECONDS", 1)
    seen = []
    original = events.publish

    def spy(kind, **data):
        seen.append(kind)
        return original(kind, **data)

    monkeypatch.setattr(events, "publish", spy)
    started = time.monotonic()
    result = call(client, READ_TOOL[0], READ_TOOL[1], session(client))
    assert result["isError"] and "no answer yet" in result["content"][0]["text"]
    assert time.monotonic() - started >= 1
    assert "agents.consent" in seen


def test_ask_lets_the_call_through_once_the_person_allows(client, policy, monkeypatch):
    policy("ask")
    monkeypatch.setattr(agents, "WAIT_SECONDS", 10)
    threading.Timer(0.5, lambda: set_policy("allowed")).start()
    result = call(client, READ_TOOL[0], READ_TOOL[1], session(client))
    assert not result.get("isError")


def test_the_stdio_relay_lists_the_same_tools_from_the_running_engine(engine):
    env = dict(engine["env"], FORMAT_ENGINE_URL=engine["base"])
    lines = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "family-test", "version": "1"}}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
    ]
    replies = relay(lines, env, wanted=2)
    assert sorted(t["name"] for t in replies[2]["result"]["tools"]) == sorted(t["name"] for t in tool_catalogue())


def test_the_stdio_relay_says_how_to_start_format_when_no_engine_answers(engine):
    env = dict(engine["env"], FORMAT_ENGINE_URL="http://127.0.0.1:1")
    lines = [
        {"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {"protocolVersion": "2025-11-25", "capabilities": {}, "clientInfo": {"name": "family-test", "version": "1"}}},
        {"jsonrpc": "2.0", "method": "notifications/initialized"},
        {"jsonrpc": "2.0", "id": 2, "method": "tools/list", "params": {}},
    ]
    replies = relay(lines, env, wanted=2)
    assert "start Format with ./format" in replies[2]["error"]["message"]


def relay(lines, env, wanted, timeout=60):
    proc = subprocess.Popen(STDIO_CMD, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, env=env, cwd=BACKEND)
    try:
        for m in lines:
            proc.stdin.write(json.dumps(m) + "\n")
        proc.stdin.flush()
        replies = {}
        deadline = time.monotonic() + timeout
        while wanted not in replies and time.monotonic() < deadline:
            line = proc.stdout.readline()
            if not line:
                break
            if line.strip().startswith("{"):
                m = json.loads(line)
                replies[m.get("id")] = m
        assert wanted in replies, f"no reply {wanted}: {replies} {proc.stderr.read() if proc.poll() is not None else ''}"
        return replies
    finally:
        proc.stdin.close()
        try:
            proc.wait(timeout=10)
        except subprocess.TimeoutExpired:
            proc.kill()
