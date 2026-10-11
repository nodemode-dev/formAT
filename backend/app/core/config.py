import os
from pathlib import Path

from app import __version__

APP_NAME = "Format"
VERSION = __version__
BACKEND_DIR = Path(__file__).resolve().parents[2]
REPO_DIR = BACKEND_DIR.parent
PORT = int(os.environ.get("FORMAT_PORT", "8490"))
FRONTEND_PORT = 5490


def _load_env() -> None:
    env = BACKEND_DIR / ".env"
    if not env.is_file():
        return
    for line in env.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key, value = key.strip(), value.strip().strip('"').strip("'")
        if key and value and key not in os.environ:
            os.environ[key] = value


_load_env()


def data_dir() -> Path:
    root = Path(os.environ.get("FORMAT_DATA_DIR") or BACKEND_DIR / "data")
    root.mkdir(parents=True, exist_ok=True)
    return root


def dist_dir() -> Path | None:
    if os.environ.get("FORMAT_SERVE_DIST") != "1":
        return None
    dist = REPO_DIR / "frontend" / "dist"
    return dist if (dist / "index.html").is_file() else None


def cors_origins() -> list[str]:
    return [f"http://localhost:{FRONTEND_PORT}", f"http://127.0.0.1:{FRONTEND_PORT}",
            f"http://localhost:{FRONTEND_PORT + 1}", f"http://127.0.0.1:{FRONTEND_PORT + 1}",
            "tauri://localhost", "http://tauri.localhost"]


def providers() -> dict[str, bool]:
    return {"anthropic": bool(os.environ.get("ANTHROPIC_API_KEY")), "openai": bool(os.environ.get("OPENAI_API_KEY"))}
