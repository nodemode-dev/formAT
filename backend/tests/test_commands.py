import json
import subprocess
import sys
import urllib.request

from conftest import BACKEND, MCP_PATH, REPO, set_policy

from app.engine.commands import REGISTRY, catalogue


def _window(base, cid, params):
    req = urllib.request.Request(f"{base}/api/commands/{cid}", data=json.dumps(params).encode(), method="POST", headers={"content-type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            return r.status, json.loads(r.read())
    except urllib.error.HTTPError as exc:
        return exc.code, json.loads(exc.read())


def _cli(base, cid, params):
    args = [sys.executable, str(REPO / "setup" / "cli.py"), cid, "--json", json.dumps(params)]
    proc = subprocess.run(args, capture_output=True, text=True, timeout=60, env={**__import__("os").environ, "FORMAT_ENGINE_URL": base}, cwd=REPO)
    return proc.returncode, proc.stdout


def _mcp(client, cid, params):
    from test_f3_mcp import call, session

    return call(client, "run_command", {"id": cid, "params": params}, session(client))


def test_every_command_is_in_the_catalogue_with_a_description():
    listed = {c["id"] for c in catalogue()}
    assert listed == set(REGISTRY)
    for c in catalogue():
        assert c["description"].strip() and c["group"] == c["id"].split(".")[0]


def test_the_window_route_the_cli_and_mcp_return_the_same_result(client, engine):
    set_policy("allowed")
    base = engine["base"]
    status, window = _window(base, "settings.set", {"key": "effort", "value": "high"})
    assert status == 200 and window["ok"]
    code, out = _cli(base, "settings.get", {})
    assert code == 0, out
    from_cli = json.loads(out)
    status, from_window = _window(base, "settings.get", {})
    assert from_window["result"] == from_cli.get("result", from_cli)
    assert from_window["result"]["effort"] == "high"
    local = client.post("/api/commands/settings.get", json={}).json()["result"]
    mcp = _mcp(client, "settings.get", {})
    assert not mcp.get("isError")
    assert json.loads(mcp["content"][0]["text"]) == local


def test_a_bad_call_fails_the_same_way_everywhere(client, engine):
    set_policy("allowed")
    status, window = _window(engine["base"], "settings.set", {"key": "effort", "value": "loud"})
    assert status == 400 and not window["ok"]
    message = window["error"]
    code, out = _cli(engine["base"], "settings.set", {"key": "effort", "value": "loud"})
    assert message in out
    mcp = _mcp(client, "settings.set", {"key": "effort", "value": "loud"})
    assert mcp["isError"] and message.split(": ", 1)[1] in mcp["content"][0]["text"]
    status, unknown = _window(engine["base"], "settings.set", {"key": "effort", "value": "low", "extra": 1})
    assert status == 400 and "unknown parameter extra" in unknown["error"]
    status, missing = _window(engine["base"], "no.such.command", {})
    assert status == 404


def test_an_outside_agent_header_on_the_window_route_goes_through_consent(client):
    set_policy("blocked")
    try:
        r = client.post("/api/commands/settings.get", json={}, headers={"x-format-agent": "some agent"})
        assert r.status_code == 403 and "turned off outside agents" in r.json()["error"]
        assert client.post("/api/commands/settings.get", json={}).status_code == 200
    finally:
        set_policy("allowed")
