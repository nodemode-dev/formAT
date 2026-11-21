from conftest import set_policy

from app.core import window_key
from app.engine.cmd_settings import current
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


PUBLIC_READS = {"/api/health", "/api/commands", "/api/commands/{cid}", "/api/voice", "/api/connectors/oauth/callback"}
ID_READS = {"/api/uploads/{fid}", "/api/chats/{cid}/files/{rel}", "/api/chats/{cid}/outputs.zip", "/api/artifacts/{aid}/v/{number}", "/api/artifacts/{aid}/v/{number}/source",
            "/api/artifacts/{aid}/v/{number}/export/{fmt}", "/api/native/snapshots/{name}", "/s/{token}"}


def test_the_open_lists_are_exactly_the_named_routes():
    assert set(window_key.OPEN) == {"/mcp", "/api/window/key"}
    assert window_key.OPEN_PREFIXES == ("/api/commands/",)
    assert set(window_key.PRIVATE_READS) == {"/api/browser/frame"}


def test_every_read_route_is_public_addressed_by_a_random_id_or_refused_without_the_window_key(app, bare):
    reads = {path for path, item in app.openapi()["paths"].items() if "get" in item}
    assert reads - PUBLIC_READS - ID_READS == set(window_key.PRIVATE_READS), f"read routes not classified: {sorted(reads - PUBLIC_READS - ID_READS - set(window_key.PRIVATE_READS))}"
    for path in window_key.PRIVATE_READS:
        r = bare.get(path)
        assert r.status_code == 403 and r.json()["detail"] == window_key.REFUSED, path
        r = bare.get(path, headers={window_key.HEADER: "not-the-key"})
        assert r.status_code == 403 and window_key.KEY not in r.text, path


def test_the_window_reads_the_built_in_browser_frame_with_its_key(client, bare):
    assert client.get("/api/browser/frame").status_code in (200, 204)
    assert bare.get("/api/health").status_code == 200


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
    monkeypatch.delenv("SHELL", raising=False)
    out, failed = tools.run("bash", {"command": "env; echo done-$((40 + 2))"}, "bash-env-check", lambda _: None, threading.Event())
    assert not failed and "done-42" in out
    assert "MARKER-SECRET" not in out and "FORMAT_WINDOW_KEY" not in out
    assert "PATH=" in out and "FORMAT_WORKSPACE=" in out


def test_a_stored_allowed_without_a_seal_reads_as_ask_and_says_so(app):
    import json

    import keyring
    from keyring.backend import KeyringBackend

    from app.core import seal
    from app.engine import store

    class Stand(KeyringBackend):
        priority = 1
        memory: dict = {}

        def get_password(self, service, username):
            return self.memory.get((service, username))

        def set_password(self, service, username, password):
            self.memory[(service, username)] = password

        def delete_password(self, service, username):
            self.memory.pop((service, username), None)

    before = keyring.get_keyring()
    keyring.set_keyring(Stand())
    seal.reset()
    try:
        store.run("DELETE FROM meta WHERE key = 'setting.seal'")
        store.run("INSERT INTO meta(key, value) VALUES ('setting.outsideAgents', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value", (json.dumps("allowed"),))
        first = current()
        assert first["outsideAgents"] == "ask" and first["sealBroken"] is True
        set_policy("allowed")
        again = current()
        assert again["outsideAgents"] == "allowed" and again["sealBroken"] is False
    finally:
        keyring.set_keyring(before)
        seal.reset()
        store.run("DELETE FROM meta WHERE key = 'setting.seal'")
        set_policy("allowed")


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
