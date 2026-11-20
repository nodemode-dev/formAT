import json
import os
import time
from pathlib import Path

from app.core import startup

LOCK_NAME = "engine.lock"
_held: dict[str, object] = {}


class AlreadyRunning(RuntimeError):
    pass


def try_lock(f) -> bool:
    try:
        if os.name == "nt":
            import msvcrt
            f.seek(0)
            msvcrt.locking(f.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl
            fcntl.flock(f.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        return False
    return True


def _read(path: Path, skip: int):
    try:
        with open(path, "rb") as f:
            f.seek(skip)
            return json.loads(f.read().decode("utf-8"))
    except (OSError, ValueError):
        return None


def holder(path: Path) -> dict:
    found = _read(path, 0)
    if found is None:
        found = _read(path, 1)
        return found if isinstance(found, dict) else {}
    if isinstance(found, dict):
        return found
    return {"pid": found} if startup.number(found) else {}


def _wait(f, seconds: float) -> bool:
    deadline = time.monotonic() + seconds
    while not try_lock(f):
        if time.monotonic() >= deadline:
            return False
        time.sleep(0.2)
    return True


def claim(data: Path, shell: int = 0, wait: float = 3.0) -> int:
    path = data / LOCK_NAME
    key = str(path.resolve())
    if key in _held:
        return 0
    f = open(path, "a+", encoding="utf-8")
    replaced = 0
    if not _wait(f, wait):
        lock = holder(path)
        pid = startup.number(lock.get("pid"))
        if pid and startup.holder(lock, shell > 0) == startup.LEFTOVER and startup.end(pid) and _wait(f, wait):
            replaced = pid
        else:
            f.close()
            held = f" (engine process {pid})" if pid else ""
            raise AlreadyRunning(f"FormAT is already running on the data folder {data}{held}. "
                                 "Close the other FormAT first, or start this one with FORMAT_DATA_DIR set to another folder.")
    record = {"pid": os.getpid(), "started": int(startup.STARTED), "born": startup.created(os.getpid()), "shell": shell, "shellBorn": startup.created(shell)}
    f.seek(0)
    f.truncate()
    f.write(" " + json.dumps(record))
    f.flush()
    _held[key] = f
    return replaced


def release(data: Path) -> None:
    f = _held.pop(str((data / LOCK_NAME).resolve()), None)
    if f is None:
        return
    try:
        f.seek(0)
        f.truncate()
        f.close()
    except OSError:
        pass
