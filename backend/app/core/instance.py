import os
import time
from pathlib import Path

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


def _holder(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8").strip()
    except OSError:
        return ""


def claim(data: Path, wait: float = 3.0) -> None:
    path = data / LOCK_NAME
    key = str(path.resolve())
    if key in _held:
        return
    f = open(path, "a+", encoding="utf-8")
    deadline = time.monotonic() + wait
    while not try_lock(f):
        if time.monotonic() >= deadline:
            f.close()
            pid = _holder(path)
            held = f" (engine process {pid})" if pid.isdigit() else ""
            raise AlreadyRunning(f"FormAT is already running on the data folder {data}{held}. "
                                 "Close the other FormAT first, or start this one with FORMAT_DATA_DIR set to another folder.")
        time.sleep(0.2)
    f.seek(0)
    f.truncate()
    f.write(str(os.getpid()))
    f.flush()
    _held[key] = f
