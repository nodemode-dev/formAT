import logging
import mimetypes
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.routing import Route

from app.core import config
from app.core.local_guard import LocalGuard
from app.routers import ROUTERS, mcp_http, shutdown, startup

mimetypes.add_type("text/javascript", ".js")
mimetypes.add_type("text/javascript", ".mjs")
mimetypes.add_type("text/css", ".css")


@asynccontextmanager
async def lifespan(_: FastAPI):
    await startup()
    async with mcp_http.running():
        yield
    await shutdown()


app = FastAPI(title=config.APP_NAME, version=config.VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.cors_origins(), allow_methods=["*"], allow_headers=["*"])
app.add_middleware(LocalGuard, origins=config.cors_origins())
for router in ROUTERS:
    app.include_router(router)
app.router.routes.append(Route("/mcp", endpoint=mcp_http.Endpoint(), methods=["GET", "POST", "DELETE"]))


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger("format").exception("unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse({"ok": False, "error": f"{type(exc).__name__}: {exc}"}, status_code=500)


_dist = config.dist_dir()
if _dist is not None:
    if (_dist / "favicon.png").is_file() and not (_dist / "favicon.ico").is_file():
        @app.get("/favicon.ico", include_in_schema=False)
        def _favicon() -> FileResponse:
            return FileResponse(_dist / "favicon.png", media_type="image/png")

    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
