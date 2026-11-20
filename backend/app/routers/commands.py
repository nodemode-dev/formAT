import logging
from typing import Any

from fastapi import APIRouter, Body, Header, Request
from fastapi.responses import JSONResponse

from app.core import window_key
from app.engine import agents
from app.engine.commands import REGISTRY, CommandError, catalogue, dispatch

router = APIRouter(prefix="/api", tags=["commands"])
log = logging.getLogger("format.commands")


def _run(cid: str, params: dict | None) -> tuple[int, dict]:
    try:
        result = dispatch(cid, params or {})
    except CommandError as exc:
        return exc.status, {"ok": False, "command": cid, "error": str(exc)}
    except Exception as exc:
        log.exception("command %s failed", cid)
        return 500, {"ok": False, "command": cid, "error": f"{type(exc).__name__}: {exc}"}
    return 200, {"ok": True, "command": cid, "result": result}


@router.get("/commands")
def list_commands(group: str | None = None) -> dict:
    items = catalogue()
    if group:
        items = [c for c in items if c["group"] == group]
    return {"commands": items, "count": len(items)}


@router.get("/commands/{cid}")
def describe(cid: str) -> Any:
    spec = REGISTRY.get(cid)
    if spec is None:
        return JSONResponse({"ok": False, "error": f"Unknown command: {cid}"}, status_code=404)
    return {"id": spec.id, "label": spec.label, "group": spec.group, "mutates": spec.mutates, "params": spec.params, "description": spec.description}


@router.post("/commands/{cid}")
def run(request: Request, cid: str, params: dict | None = Body(default=None), x_format_agent: str | None = Header(default=None)) -> Any:
    if x_format_agent or not window_key.is_window(request.scope):
        try:
            agents.require_outside(x_format_agent or "", "stdio" if x_format_agent else "rest", cid, params)
        except CommandError as exc:
            return JSONResponse({"ok": False, "command": cid, "error": str(exc)}, status_code=exc.status)
    status, body = _run(cid, params)
    return body if status == 200 else JSONResponse(body, status_code=status)
