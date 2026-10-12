import json
import os
import socket
import subprocess
import sys
import threading
import time
from pathlib import Path

APP_DIR_NAME = "Format"


def resource_dir() -> str:
    return getattr(sys, "_MEIPASS", os.path.dirname(os.path.abspath(__file__)))


def app_data_dir() -> Path:
    home = Path.home()
    if sys.platform == "darwin":
        return home / "Library" / "Application Support" / APP_DIR_NAME
    if os.name == "nt":
        return Path(os.environ.get("APPDATA") or home / "AppData" / "Roaming") / APP_DIR_NAME
    return Path(os.environ.get("XDG_DATA_HOME") or home / ".local" / "share") / APP_DIR_NAME.lower()


def free_port(preferred: int) -> int:
    for candidate in (preferred, 0):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", candidate))
            except OSError:
                continue
            return s.getsockname()[1]
    return 0


def login_shell() -> str:
    if os.name == "nt":
        return os.environ.get("COMSPEC", "cmd.exe")
    shell = os.environ.get("SHELL")
    if not shell:
        try:
            import pwd
            shell = pwd.getpwuid(os.getuid()).pw_shell
        except Exception:
            shell = "/bin/sh"
    return shell or "/bin/sh"


def adopt_login_path() -> None:
    if os.name == "nt":
        return
    shell = login_shell()
    os.environ.setdefault("SHELL", shell)
    try:
        out = subprocess.run([shell, "-ilc", 'printf "__FORMAT_PATH__%s" "$PATH"'], capture_output=True, text=True, timeout=8,
                             stdin=subprocess.DEVNULL)
        path = out.stdout.rsplit("__FORMAT_PATH__", 1)[-1].strip()
    except Exception:
        path = ""
    extra = ["/opt/homebrew/bin", "/usr/local/bin", "/usr/bin", "/bin", "/usr/sbin", "/sbin"]
    parts = [p for p in (path or os.environ.get("PATH", "")).split(os.pathsep) if p]
    parts += [p for p in extra if p not in parts and os.path.isdir(p)]
    os.environ["PATH"] = os.pathsep.join(parts)


def watch_parent() -> None:
    parent = int(os.environ.get("FORMAT_PARENT_PID") or 0)
    if not parent:
        return
    launcher = os.getppid() if os.name != "nt" else 0

    def alive(pid: int) -> bool:
        if os.name == "nt":
            import ctypes
            handle = ctypes.windll.kernel32.OpenProcess(0x1000, False, pid)
            if not handle:
                return False
            code = ctypes.c_ulong()
            ctypes.windll.kernel32.GetExitCodeProcess(handle, ctypes.byref(code))
            ctypes.windll.kernel32.CloseHandle(handle)
            return code.value == 259
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return False
        except PermissionError:
            return True
        return True

    def loop() -> None:
        while alive(parent) and (not launcher or os.getppid() == launcher):
            time.sleep(0.5)
        os._exit(0)

    threading.Thread(target=loop, name="format-parent-watch", daemon=True).start()


def prepare_env() -> None:
    bundled = os.path.join(resource_dir(), "frontend_dist")
    if os.path.isdir(bundled):
        os.environ.setdefault("FORMAT_DIST", bundled)
    os.environ.setdefault("FORMAT_DESKTOP", "1")
    data = Path(os.environ.get("FORMAT_DATA_DIR") or app_data_dir())
    data.mkdir(parents=True, exist_ok=True)
    os.environ["FORMAT_DATA_DIR"] = str(data)
    os.environ["FORMAT_PORT"] = str(free_port(int(os.environ.get("FORMAT_PORT") or 8490)))


def selfcheck() -> int:
    import importlib

    info: dict = {"python": sys.version.split()[0], "frozen": bool(getattr(sys, "frozen", False))}
    for name in ("fastapi", "uvicorn", "anthropic", "mcp", "httpx", "segno", "docx", "pptx", "openpyxl", "reportlab", "ptyprocess"):
        try:
            module = importlib.import_module(name)
            info[name] = getattr(module, "__version__", "ok")
        except Exception as exc:
            info[name] = f"missing: {exc}"
    for name in ("playwright", "faster_whisper"):
        try:
            module = importlib.import_module(name)
            info[name] = getattr(module, "__version__", "ok")
        except Exception as exc:
            info[name] = f"not bundled: {type(exc).__name__}"
    try:
        from playwright._impl._driver import compute_driver_executable
        driver = compute_driver_executable()
        info["playwright_driver"] = all(Path(p).exists() for p in (driver if isinstance(driver, tuple) else (driver,)))
    except Exception as exc:
        info["playwright_driver"] = f"no: {type(exc).__name__}"
    from app import __version__
    info["format"] = __version__
    info["dist_bundled"] = os.path.isfile(os.path.join(resource_dir(), "frontend_dist", "index.html"))
    from app.routers import COMMAND_MODULES
    info["command_modules"] = len(COMMAND_MODULES)
    from app.engine.commands import REGISTRY
    info["commands"] = len(REGISTRY)
    try:
        from docx import Document
        from pptx import Presentation
        Document()
        Presentation()
        info["office_templates"] = True
    except Exception as exc:
        info["office_templates"] = f"no: {exc}"
    print(json.dumps(info))
    required = ("fastapi", "uvicorn", "anthropic", "mcp", "segno", "docx", "pptx", "openpyxl", "reportlab")
    ok = info["dist_bundled"] and info["office_templates"] is True and not any(str(info[k]).startswith("missing") for k in required)
    return 0 if ok else 1


def main() -> int:
    if "--selfcheck" in sys.argv:
        prepare_env()
        return selfcheck()
    prepare_env()
    adopt_login_path()
    watch_parent()
    import uvicorn

    from app.main import app as fastapi_app

    uvicorn.run(fastapi_app, host="127.0.0.1", port=int(os.environ["FORMAT_PORT"]), log_level="info")
    return 0


if __name__ == "__main__":
    import multiprocessing
    multiprocessing.freeze_support()
    sys.exit(main())
