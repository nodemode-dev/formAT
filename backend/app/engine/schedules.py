import json
import logging
import os
import threading
from datetime import datetime, timedelta

from app.engine import events, store
from app.engine.commands import CommandError, command

log = logging.getLogger("format.schedules")
CADENCES = ["manual", "once", "hourly", "daily", "weekdays", "weekly"]
DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
ID = {"type": "string", "required": True, "description": "scheduled task id from schedule.list"}
FIELDS = {
    "name": {"type": "string", "description": "short name; also the title of each run's chat"},
    "prompt": {"type": "string", "description": "what Claude is asked each time it runs"},
    "cadence": {"type": "string", "enum": CADENCES, "description": "manual (only Run now), once, hourly, daily, weekdays or weekly"},
    "at": {"type": "string", "description": "local time HH:MM (hourly uses the minutes), default 09:00"},
    "weekday": {"type": "integer", "description": "for weekly: 0 Monday to 6 Sunday"},
    "runAt": {"type": "number", "description": "for once: Unix time in seconds"},
    "projectId": {"type": "string", "description": "run inside this project"},
    "enabled": {"type": "boolean"},
}
_stop = threading.Event()
_thread: threading.Thread | None = None


def _clock(at: str) -> tuple[int, int]:
    try:
        h, m = (int(x) for x in str(at).split(":", 1))
    except ValueError:
        raise CommandError(f"at must be HH:MM, not {at!r}") from None
    if not (0 <= h < 24 and 0 <= m < 60):
        raise CommandError(f"at must be HH:MM, not {at!r}")
    return h, m


def next_after(s: dict, after: float) -> float | None:
    cadence = s["cadence"]
    if cadence == "manual":
        return None
    if cadence == "once":
        return s["run_at"] if s.get("run_at") and not s.get("last_run") else None
    h, m = _clock(s["at"])
    base = datetime.fromtimestamp(after)
    if cadence == "hourly":
        t = base.replace(minute=m, second=0, microsecond=0)
        while t.timestamp() <= after:
            t += timedelta(hours=1)
        return t.timestamp()
    t = base.replace(hour=h, minute=m, second=0, microsecond=0)
    for _ in range(9):
        ok = t.timestamp() > after and (cadence == "daily" or (cadence == "weekdays" and t.weekday() < 5) or (cadence == "weekly" and t.weekday() == int(s["weekday"])))
        if ok:
            return t.timestamp()
        t += timedelta(days=1)
    return None


def run_status(cid: str | None) -> str:
    if not cid:
        return "failed"
    from app.engine import chat, tools
    if any(w["conversationId"] == cid for w in tools.pending()):
        return "waiting"
    if chat.running(cid):
        return "running"
    last = store.row("SELECT meta FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created DESC LIMIT 1", (cid,))
    status = json.loads(last["meta"] or "{}").get("status") if last else None
    return {"done": "done", "stopped": "stopped", "error": "failed"}.get(status or "", "done" if status is None and last else "failed")


def _run(r: dict) -> dict:
    exists = r["conversation_id"] and store.row("SELECT id FROM conversations WHERE id = ?", (r["conversation_id"],))
    return {"id": r["id"], "scheduleId": r["schedule_id"], "conversationId": r["conversation_id"] if exists else None, "trigger": r["trigger"], "started": r["started"],
            "error": r["error"], "status": "failed" if r["error"] else run_status(r["conversation_id"]) if exists else "deleted"}


def summary(s: dict) -> dict:
    last = store.row("SELECT * FROM schedule_runs WHERE schedule_id = ? ORDER BY started DESC LIMIT 1", (s["id"],))
    count = store.row("SELECT COUNT(*) AS n FROM schedule_runs WHERE schedule_id = ?", (s["id"],)) or {"n": 0}
    return {"id": s["id"], "name": s["name"], "prompt": s["prompt"], "cadence": s["cadence"], "at": s["at"], "weekday": s["weekday"], "runAt": s["run_at"],
            "projectId": s["project_id"], "enabled": bool(s["enabled"]), "nextRun": s["next_run"] if s["enabled"] else None, "lastRun": s["last_run"],
            "runs": count["n"], "lastStatus": _run(last)["status"] if last else None}


def _get(sid: str) -> dict:
    s = store.row("SELECT * FROM schedules WHERE id = ?", (sid,))
    if s is None:
        raise CommandError(f"No scheduled task {sid}; schedule.list gives the ids", 404)
    return s


def _changed(sid: str) -> dict:
    out = summary(_get(sid))
    events.publish("schedule.changed", schedule=out)
    return out


def fire(sid: str, trigger: str) -> dict:
    from app.engine import cmd_chat
    s = _get(sid)
    rid, t, cid, error = store.new_id(), store.now(), None, ""
    project = s["project_id"] if s["project_id"] and store.row("SELECT id FROM projects WHERE id = ?", (s["project_id"],)) else None
    try:
        cid = cmd_chat.send(text=s["prompt"], projectId=project, title=s["name"])["conversationId"]
    except Exception as exc:
        error = str(exc) or type(exc).__name__
        log.warning("scheduled task %s failed to start: %s", sid, error)
    store.run("INSERT INTO schedule_runs(id, schedule_id, conversation_id, trigger, started, error) VALUES (?, ?, ?, ?, ?, ?)", (rid, sid, cid, trigger, t, error))
    store.run("UPDATE schedules SET last_run = ? WHERE id = ?", (t, sid))
    if trigger == "schedule":
        s = _get(sid)
        store.run("UPDATE schedules SET next_run = ? WHERE id = ?", (next_after(s, max(t, s["next_run"] or t)), sid))
    _changed(sid)
    return _run(store.row("SELECT * FROM schedule_runs WHERE id = ?", (rid,)) or {})


def tick() -> int:
    due = store.rows("SELECT id FROM schedules WHERE enabled = 1 AND next_run IS NOT NULL AND next_run <= ? ORDER BY next_run", (store.now(),))
    for d in due:
        try:
            fire(d["id"], "schedule")
        except Exception:
            log.exception("scheduled task %s", d["id"])
    return len(due)


def _loop() -> None:
    every = max(1.0, float(os.environ.get("FORMAT_SCHEDULER_TICK") or 15))
    while not _stop.wait(every):
        try:
            tick()
        except Exception:
            log.exception("scheduler tick")


def start() -> None:
    global _thread
    if _thread is None or not _thread.is_alive():
        _stop.clear()
        _thread = threading.Thread(target=_loop, name="scheduler", daemon=True)
        _thread.start()


def stop() -> None:
    _stop.set()


def _fields(name, prompt, cadence, at, weekday, runAt, projectId) -> dict:
    out: dict = {}
    if name is not None:
        if not name.strip():
            raise CommandError("name is empty")
        out["name"] = name.strip()[:80]
    if prompt is not None:
        if not prompt.strip():
            raise CommandError("prompt is empty")
        out["prompt"] = prompt
    if cadence is not None:
        if cadence not in CADENCES:
            raise CommandError(f"cadence must be one of {', '.join(CADENCES)}")
        out["cadence"] = cadence
    if at is not None:
        h, m = _clock(at)
        out["at"] = f"{h:02d}:{m:02d}"
    if weekday is not None:
        if not 0 <= int(weekday) <= 6:
            raise CommandError("weekday must be 0 (Monday) to 6 (Sunday)")
        out["weekday"] = int(weekday)
    if runAt is not None:
        out["run_at"] = float(runAt)
    if projectId is not None:
        if projectId and store.row("SELECT id FROM projects WHERE id = ?", (projectId,)) is None:
            raise CommandError(f"No project {projectId}; project.list gives the ids", 404)
        out["project_id"] = projectId or None
    return out


@command("schedule.list", "Scheduled tasks", mutates=False,
         description="Scheduled tasks with their cadence, next and last run and the status of the last run. Times are Unix seconds; at is the engine computer's local time.")
def list_() -> dict:
    items = [summary(s) for s in store.rows("SELECT * FROM schedules ORDER BY created")]
    return {"schedules": items, "count": len(items)}


@command("schedule.get", "Open scheduled task", {"id": ID}, mutates=False, description="One scheduled task and its run history, newest first; each run is a chat.")
def get(id: str) -> dict:
    s = _get(id)
    runs = [_run(r) for r in store.rows("SELECT * FROM schedule_runs WHERE schedule_id = ? ORDER BY started DESC LIMIT 100", (id,))]
    return summary(s) | {"history": runs}


@command("schedule.create", "New scheduled task", FIELDS | {"name": FIELDS["name"] | {"required": True}, "prompt": FIELDS["prompt"] | {"required": True}},
         description="A prompt Claude runs on a schedule while Format is running, each run in a new chat; a run missed while Format was closed runs once when it starts.")
def create(name: str, prompt: str, cadence: str | None = None, at: str | None = None, weekday: int | None = None, runAt: float | None = None,
           projectId: str | None = None, enabled: bool | None = None) -> dict:
    f = {"cadence": "daily", "at": "09:00", "weekday": 0, "run_at": None, "project_id": None} | _fields(name, prompt, cadence, at, weekday, runAt, projectId)
    if f["cadence"] == "once" and not f["run_at"]:
        raise CommandError("cadence once needs runAt")
    sid, t = store.new_id(), store.now()
    on = enabled is not False
    store.run("INSERT INTO schedules(id, name, prompt, cadence, at, weekday, run_at, project_id, enabled, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
              (sid, f["name"], f["prompt"], f["cadence"], f["at"], f["weekday"], f["run_at"], f["project_id"], int(on), t, t))
    store.run("UPDATE schedules SET next_run = ? WHERE id = ?", (next_after(_get(sid), t), sid))
    return _changed(sid)


@command("schedule.update", "Change scheduled task", {"id": ID} | FIELDS, description="Changes any field; the next run is worked out again.")
def update(id: str, name: str | None = None, prompt: str | None = None, cadence: str | None = None, at: str | None = None, weekday: int | None = None,
           runAt: float | None = None, projectId: str | None = None, enabled: bool | None = None) -> dict:
    s = _get(id)
    f = _fields(name, prompt, cadence, at, weekday, runAt, projectId)
    if enabled is not None:
        f["enabled"] = int(bool(enabled))
    if "run_at" in f and (s["cadence"] == "once" or f.get("cadence") == "once"):
        f["last_run"] = None
    if (f.get("cadence") or s["cadence"]) == "once" and not (f.get("run_at") or s["run_at"]):
        raise CommandError("cadence once needs runAt")
    if f:
        store.run(f"UPDATE schedules SET {', '.join(f'{k} = ?' for k in f)}, updated = ? WHERE id = ?", tuple(f.values()) + (store.now(), id))
    store.run("UPDATE schedules SET next_run = ? WHERE id = ?", (next_after(_get(id), store.now()), id))
    return _changed(id)


@command("schedule.delete", "Delete scheduled task", {"id": ID}, description="Deletes the task and its run history; the chats its runs made stay.")
def delete(id: str) -> dict:
    _get(id)
    store.run("DELETE FROM schedules WHERE id = ?", (id,))
    events.publish("schedule.deleted", id=id)
    return {"deleted": id}


@command("background.list", "Background work", mutates=False,
         description="Work running now: each chat with a reply, summary or scheduled run in progress, whether it waits for the person (an approval or a question), and the scheduled task it belongs to.")
def background() -> dict:
    from app.engine import chat, tools
    waiting = {w["conversationId"] for w in tools.pending()}
    items = []
    for cid in list(chat.RUNS):
        conv = store.row("SELECT id, title FROM conversations WHERE id = ?", (cid,))
        if conv is None:
            continue
        msg = store.row("SELECT created FROM messages WHERE conversation_id = ? AND role = 'assistant' ORDER BY created DESC LIMIT 1", (cid,))
        sched = store.row("SELECT s.id, s.name FROM schedule_runs r JOIN schedules s ON s.id = r.schedule_id WHERE r.conversation_id = ?", (cid,))
        items.append({"conversationId": cid, "title": conv["title"], "status": "waiting" if cid in waiting else "running", "started": msg["created"] if msg else None,
                      "schedule": {"id": sched["id"], "name": sched["name"]} if sched else None})
    items.sort(key=lambda i: i["started"] or 0)
    return {"items": items, "count": len(items)}


@command("schedule.run", "Run scheduled task now", {"id": ID}, description="Runs the task once now in a new chat, without moving its schedule. Returns the run with its conversationId.")
def run_now(id: str) -> dict:
    return fire(id, "manual")
