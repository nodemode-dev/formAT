import json
import os
import re
import subprocess
import tempfile
import threading
import time
from pathlib import Path

from app.core import config
from app.engine.commands import CommandError, command

CRATE = config.REPO_DIR / "native" / "format-render"
EXE = "format-render.exe" if os.name == "nt" else "format-render"
NAME = re.compile(r"^[0-9a-f]{12}-\d{10,}\.png$")
_info: dict | None = None
_lock = threading.Lock()


def enabled() -> bool:
    return os.environ.get("FORMAT_NATIVE", "").lower() in ("1", "true", "on", "yes")


def binary() -> Path | None:
    for profile in ("release", "debug"):
        p = CRATE / "target" / profile / EXE
        if p.is_file():
            return p
    return None


def snapshots_dir() -> Path:
    d = config.data_dir() / "snapshots"
    d.mkdir(parents=True, exist_ok=True)
    return d


def _run(args: list[str], timeout: float = 30) -> dict:
    exe = binary()
    if exe is None:
        raise CommandError("The native renderer is not built; run ./format native build", 409)
    try:
        out = subprocess.run([str(exe), *args], capture_output=True, text=True, timeout=timeout)
    except subprocess.TimeoutExpired:
        raise CommandError("The native renderer did not answer in time", 504) from None
    line = (out.stdout.strip().splitlines() or ["{}"])[-1]
    try:
        data = json.loads(line)
    except ValueError:
        raise CommandError(f"The native renderer failed: {(out.stderr or out.stdout).strip()[-300:]}", 500) from None
    if not data.get("ok"):
        raise CommandError(f"The native renderer failed: {data.get('error') or 'no GPU adapter'}", 500)
    return data


def info() -> dict:
    global _info
    with _lock:
        if _info is None:
            _info = _run(["info"])
        return _info


def require() -> None:
    if not enabled():
        raise CommandError("The native renderer is off; build it with ./format native build and start Format with FORMAT_NATIVE=1", 409)


def snapshot(ansi: str, cols: int, rows: int, sid: str) -> dict:
    require()
    name = f"{sid[:12]}-{int(time.time() * 1000)}.png"
    out = snapshots_dir() / name
    with tempfile.NamedTemporaryFile("wb", suffix=".ansi", delete=False) as f:
        f.write(ansi.encode("utf-8", errors="replace"))
        src = f.name
    try:
        data = _run(["snapshot", "--in", src, "--out", str(out), "--cols", str(cols), "--rows", str(rows)], timeout=60)
    finally:
        os.unlink(src)
    return {"path": str(out), "url": f"/api/native/snapshots/{name}", "width": data["width"], "height": data["height"],
            "adapter": data["adapter"], "backend": data["backend"], "ms": data["ms"]}


@command("native.status", "Native renderer", mutates=False,
         description="Whether Format's native wgpu renderer is built and turned on (FORMAT_NATIVE=1), and the GPU adapter it uses. It draws terminal screens as images (terminal.snapshot); the window's own terminal stays in the browser.")
def status() -> dict:
    exe = binary()
    out = {"enabled": enabled(), "built": exe is not None, "binary": str(exe) if exe else None, "crate": str(CRATE)}
    if exe is not None and enabled():
        try:
            out |= {k: v for k, v in info().items() if k != "ok"}
        except CommandError as exc:
            out["error"] = str(exc)
    out["enabled"] = enabled()
    return out
