from conftest import set_policy

from app.core import window_key
from app.engine.commands import catalogue

OPEN = {("POST", "/api/window/key")}


def test_every_write_route_refuses_a_call_without_the_window_key(app, bare):
    found = []
    for path, item in app.openapi()["paths"].items():
        for method in item:
            if method.upper() in ("GET", "HEAD", "OPTIONS") or path == "/api/commands/{cid}" or (method.upper(), path) in OPEN:
                continue
            r = bare.request(method.upper(), path.replace("{", "x").replace("}", ""))
            if r.status_code != 403:
                found.append(f"{method.upper()} {path} {r.status_code}")
    assert found == []


def test_a_command_without_the_window_key_is_an_outside_agent(bare, client):
    set_policy("blocked")
    try:
        answered = [c["id"] for c in catalogue() if bare.post(f"/api/commands/{c['id']}", json={}).status_code != 403]
        assert answered == []
        assert client.post("/api/commands/settings.get", json={}).status_code == 200
    finally:
        set_policy("allowed")


def test_an_outside_caller_cannot_change_the_outside_agent_choice(bare):
    set_policy("allowed")
    r = bare.post("/api/commands/settings.set", json={"key": "outsideAgents", "value": "blocked"})
    assert r.status_code == 403 and "window" in r.json()["error"]


def test_a_socket_ticket_needs_the_key_and_is_spent_once(bare, client):
    assert bare.post("/api/window/ticket").status_code == 403
    ticket = client.post("/api/window/ticket").json()["ticket"]
    assert window_key.spend(ticket) and not window_key.spend(ticket)


def test_the_bash_tool_gives_its_shell_no_secret_from_the_engine(app, monkeypatch):
    import threading

    from app.engine import tools
    monkeypatch.setenv("ANTHROPIC_API_KEY", "MARKER-SECRET-1")
    monkeypatch.setenv("FORMAT_WINDOW_KEY_STDOUT", "1")
    monkeypatch.setenv("SOME_SERVICE_TOKEN", "MARKER-SECRET-2")
    out, failed = tools.run("bash", {"command": "env; echo done-$((40 + 2))"}, "bash-env-check", lambda _: None, threading.Event())
    assert not failed and "done-42" in out
    assert "MARKER-SECRET" not in out and "FORMAT_WINDOW_KEY" not in out
    assert "PATH=" in out and "FORMAT_WORKSPACE=" in out


def test_a_terminal_tab_gets_the_persons_environment_without_the_engines_secrets(app, monkeypatch):
    from app.core import config
    from app.engine import terminal
    for name in ("ANTHROPIC_API_KEY", "OPENAI_API_KEY", "ELEVENLABS_API_KEY", "FORMAT_WINDOW_KEY_STDOUT", "MY_TOKEN", "DB_PASSWORD", "LOADED_FROM_ENV_FILE", "FORMAT_PORT"):
        monkeypatch.setenv(name, "MARKER-SECRET")
    monkeypatch.setattr(config, "ENV_FILE_KEYS", {*config.ENV_FILE_KEYS, "LOADED_FROM_ENV_FILE"})
    monkeypatch.setenv("PERSONS_OWN_SETTING", "kept")
    env = terminal._env()
    assert "MARKER-SECRET" not in "".join(env.values())
    assert env["PERSONS_OWN_SETTING"] == "kept" and env["PATH"] and env["TERM"] == "xterm-256color"
    assert env["FORMAT_TERMINAL"] == "1" and env["FORMAT_ENGINE_URL"].startswith("http://127.0.0.1:")
