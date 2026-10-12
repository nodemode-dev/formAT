import platform

from app.core import config
from app.engine import store
from app.engine.commands import REGISTRY, command


@command("app.info", "About Format", mutates=False, description="Version, ports, data folder, which provider keys are set and how many commands the engine has.")
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
    }
