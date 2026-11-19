import threading
import time

from app.engine import events
from app.engine.commands import CommandError, command

WAIT_SECONDS = 120
_seen: dict[str, dict] = {}
_lock = threading.Lock()


def _setting() -> str:
    from app.engine.cmd_settings import current
    return current().get("outsideAgents", "ask")


def note(client: str, channel: str) -> None:
    with _lock:
        entry = _seen.setdefault(client, {"name": client, "channel": channel, "first": time.time(), "calls": 0})
        entry["last"] = time.time()
        entry["channel"] = channel
        entry["calls"] += 1


def require(client: str, channel: str) -> None:
    client = (client or "an outside agent").strip()[:80] or "an outside agent"
    note(client, channel)
    state = _setting()
    if state == "allowed":
        return
    if state == "blocked":
        raise CommandError("The person has turned off outside agents in Format's Settings, so this call was refused.", 403)
    events.publish("agents.consent", client=client, channel=channel)
    deadline = time.monotonic() + WAIT_SECONDS
    while time.monotonic() < deadline:
        time.sleep(0.25)
        state = _setting()
        if state == "allowed":
            return
        if state == "blocked":
            raise CommandError("The person chose not to let outside agents use Format.", 403)
    raise CommandError("Format asked the person to allow outside agents and has no answer yet; try again once they allow it in the window.", 403)


def require_outside(client: str, channel: str, cid: str, params: dict | None) -> None:
    require(client, channel)
    if cid == "settings.set" and isinstance(params, dict) and params.get("key") == "outsideAgents":
        raise CommandError("Only the person, in FormAT's window, can change whether outside agents may use FormAT.", 403)


@command("agents.status", "Outside agents", mutates=False,
         description="Whether outside agents (coding agents over MCP) may use Format (outsideAgents: ask, allowed or blocked) and which ones have called since the engine started.")
def status() -> dict:
    with _lock:
        clients = sorted((dict(v) for v in _seen.values()), key=lambda c: -c.get("last", 0))
    return {"outsideAgents": _setting(), "clients": clients}
