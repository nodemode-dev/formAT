from fastapi import APIRouter

from app.core import config

router = APIRouter(prefix="/api", tags=["system"])


@router.get("/health")
def health() -> dict:
    return {"ok": True, "name": config.APP_NAME, "version": config.VERSION}
