import os
import shutil
import sys
from pathlib import Path

from app.core import config
from app.engine.commands import command


@command("sandbox.status", "Code sandbox", mutates=False,
         description="Whether Claude's bash commands run sandboxed on this computer (bubblewrap on Linux, sandbox-exec on macOS), whether the sandbox is on (setting sandbox) and whether it allows the network (setting sandboxNetwork).")
def status_command() -> dict:
    from app.engine.cmd_settings import current
    return status(current())


def kind() -> str | None:
    if sys.platform.startswith("linux") and shutil.which("bwrap"):
        return "bubblewrap"
    if sys.platform == "darwin" and shutil.which("sandbox-exec"):
        return "sandbox-exec"
    return None


def status(settings: dict) -> dict:
    k = kind()
    on = bool(settings.get("sandbox", True)) and k is not None
    note = ("Commands run sandboxed with " + k) if on else ("Sandbox off in Settings" if k else
            "No sandbox on this computer: install bubblewrap (Linux) to run Claude's commands sandboxed; macOS uses sandbox-exec, Windows runs them unsandboxed")
    return {"available": k is not None, "kind": k, "on": on, "network": bool(settings.get("sandboxNetwork")), "note": note}


def _hidden() -> list[str]:
    out = []
    home = Path.home()
    if home.is_dir():
        out.append(str(home))
    data = config.data_dir().resolve()
    if not str(data).startswith(str(home) + os.sep):
        out.append(str(data))
    return out


def wrap(argv: list[str], root: Path, network: bool) -> list[str]:
    k = kind()
    folder = str(root.resolve())
    if k == "bubblewrap":
        cmd = ["bwrap", "--ro-bind", "/", "/", "--dev", "/dev", "--proc", "/proc", "--tmpfs", "/tmp"]
        for h in _hidden():
            cmd += ["--tmpfs", h]
        cmd += ["--bind", folder, folder, "--chdir", folder, "--setenv", "HOME", folder, "--setenv", "TMPDIR", "/tmp",
                "--unshare-pid", "--unshare-ipc", "--unshare-uts", "--die-with-parent", "--new-session"]
        if not network:
            cmd.append("--unshare-net")
        return cmd + argv
    if k == "sandbox-exec":
        hidden = "".join(f'(deny file-read* (subpath "{h}"))' for h in _hidden())
        profile = ("(version 1)(allow default)(deny file-write*)"
                   f'(allow file-write* (subpath "{folder}") (subpath "/private/tmp") (subpath "/private/var/folders") (literal "/dev/null") (literal "/dev/tty"))'
                   f'{hidden}(allow file-read* (subpath "{folder}"))' + ("" if network else "(deny network*)"))
        return ["sandbox-exec", "-p", profile] + argv
    return argv
