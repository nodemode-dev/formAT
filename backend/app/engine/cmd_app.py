import platform
import sys

from app.core import config, secrets
from app.engine import store
from app.engine.commands import REGISTRY, command


@command("app.info", "About Format", mutates=False, description="Version, ports, data folder, which provider keys are set, the file saved keys are stored in (keysFile), the .env file read at start when running from source (envFile, null in the packaged app) and how many commands the engine has.")
def info() -> dict:
    return {
        "name": config.APP_NAME,
        "version": config.VERSION,
        "enginePort": config.PORT,
        "frontendPort": config.FRONTEND_PORT,
        "dataDir": str(config.data_dir()),
        "database": str(store.path()),
        "providers": config.providers(),
        "commands": len(REGISTRY),
        "python": platform.python_version(),
        "os": platform.system().lower(),
        "desktop": config.DESKTOP,
        "keysFile": str(secrets.location()),
        "envFile": None if getattr(sys, "frozen", False) else str(config.BACKEND_DIR / ".env"),
    }
