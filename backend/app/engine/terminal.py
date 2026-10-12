import asyncio
import os
import shutil
import threading
import uuid
from collections import deque

from app.core import config
from app.engine import events

if os.name == "nt":
    from winpty import PtyProcess
else:
    from ptyprocess import PtyProcessUnicode as PtyProcess

SCROLLBACK = 256 * 1024


class Session:
    def __init__(self, sid: str, title: str, cwd: str, proc) -> None:
        self.id = sid
        self.title = title
        self.cwd = cwd
        self.proc = proc
        self.chunks: deque[str] = deque()
        self.size = 0
        self.alive = True
        self.subscribers: set[asyncio.Queue] = set()
        self.lock = threading.Lock()
        self.gen = 0
        self.cols = 100
        self.rows = 30

    def describe(self) -> dict:
        return {"id": self.id, "title": self.title, "cwd": self.cwd, "alive": self.alive}

    def keep(self, text: str) -> None:
        with self.lock:
            self.chunks.append(text)
            self.size += len(text)
            while self.size > SCROLLBACK and len(self.chunks) > 1:
                self.size -= len(self.chunks.popleft())

    def scrollback(self) -> str:
        with self.lock:
            return "".join(self.chunks)


SESSIONS: dict[str, Session] = {}
_loop: asyncio.AbstractEventLoop | None = None


def bind(loop: asyncio.AbstractEventLoop) -> None:
    global _loop
    _loop = loop


def _shell() -> list[str]:
    if os.name == "nt":
        return [os.environ.get("COMSPEC", "cmd.exe")]
    shell = os.environ.get("SHELL") or shutil.which("bash") or "/bin/sh"
    return [shell, "-l"]


def _env() -> dict:
    env = dict(os.environ)
    env["TERM"] = "xterm-256color"
    env["COLORTERM"] = "truecolor"
    env["FORMAT_TERMINAL"] = "1"
    env["FORMAT_ENGINE_URL"] = f"http://127.0.0.1:{config.PORT}"
    if os.name != "nt":
        env["PATH"] = str(config.REPO_DIR) + os.pathsep + env.get("PATH", "")
    return env


def _deliver(session: Session, text: str | None) -> None:
    for q in list(session.subscribers):
        if q.qsize() < 4000:
            q.put_nowait(text)


def _pump(session: Session, proc=None, gen: int = 0) -> None:
    proc = proc or session.proc
    while True:
        try:
            text = proc.read(65536)
        except EOFError:
            break
        except OSError:
            break
        if not text:
            continue
        if session.gen != gen:
            return
        session.keep(text)
        if _loop is not None and not _loop.is_closed():
            _loop.call_soon_threadsafe(_deliver, session, text)
    if session.gen != gen:
        return
    session.alive = False
    if _loop is not None and not _loop.is_closed():
        _loop.call_soon_threadsafe(_deliver, session, None)
    events.publish("terminal.exited", terminal=session.describe())


def open_session(cwd: str | None = None, cols: int = 100, rows: int = 30, title: str | None = None) -> Session:
    where = cwd or str(config.workspace_dir())
    if not os.path.isdir(where):
        raise FileNotFoundError(f"No folder {where}")
    proc = PtyProcess.spawn(_shell(), cwd=where, env=_env(), dimensions=(max(4, rows), max(10, cols)))
    sid = uuid.uuid4().hex[:12]
    session = Session(sid, title or f"Terminal {len(SESSIONS) + 1}", where, proc)
    session.cols, session.rows = max(10, cols), max(4, rows)
    SESSIONS[sid] = session
    threading.Thread(target=_pump, args=(session, proc, 0), name=f"pty-{sid}", daemon=True).start()
    events.publish("terminal.opened", terminal=session.describe())
    return session


def restart(sid: str) -> Session:
    session = get(sid)
    old = session.proc
    session.gen += 1
    gen = session.gen
    try:
        old.terminate(force=True)
    except Exception:
        pass
    proc = PtyProcess.spawn(_shell(), cwd=session.cwd if os.path.isdir(session.cwd) else str(config.workspace_dir()), env=_env(),
                            dimensions=(session.rows, session.cols))
    with session.lock:
        session.chunks.clear()
        session.size = 0
    session.proc = proc
    session.alive = True
    if _loop is not None and not _loop.is_closed():
        _loop.call_soon_threadsafe(_deliver, session, "\x1bc")
    threading.Thread(target=_pump, args=(session, proc, gen), name=f"pty-{sid}-{gen}", daemon=True).start()
    events.publish("terminal.restarted", terminal=session.describe())
    return session


def write(sid: str, data: str) -> None:
    get(sid).proc.write(data)


def resize(sid: str, cols: int, rows: int) -> None:
    session = get(sid)
    session.cols, session.rows = max(10, cols), max(4, rows)
    if session.alive:
        session.proc.setwinsize(max(4, rows), max(10, cols))


def close(sid: str) -> None:
    session = SESSIONS.pop(sid, None)
    if session is None:
        return
    try:
        session.proc.terminate(force=True)
    except Exception:
        pass
    events.publish("terminal.closed", id=sid)


def get(sid: str) -> Session:
    session = SESSIONS.get(sid)
    if session is None:
        raise KeyError(sid)
    return session


def close_all() -> None:
    for sid in list(SESSIONS):
        close(sid)
