import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.routing import Route

from app.core import config
from app.routers import ROUTERS, mcp_http, shutdown, startup


@asynccontextmanager
async def lifespan(_: FastAPI):
    await startup()
    async with mcp_http.running():
        yield
    await shutdown()


app = FastAPI(title=config.APP_NAME, version=config.VERSION, lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=config.cors_origins(), allow_methods=["*"], allow_headers=["*"])
for router in ROUTERS:
    app.include_router(router)
app.router.routes.append(Route("/mcp", endpoint=mcp_http.Endpoint(), methods=["GET", "POST", "DELETE"]))


@app.exception_handler(Exception)
async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
    logging.getLogger("format").exception("unhandled error on %s %s", request.method, request.url.path, exc_info=exc)
    return JSONResponse({"ok": False, "error": f"{type(exc).__name__}: {exc}"}, status_code=500)


_dist = config.dist_dir()
if _dist is not None:
    app.mount("/", StaticFiles(directory=str(_dist), html=True), name="frontend")
