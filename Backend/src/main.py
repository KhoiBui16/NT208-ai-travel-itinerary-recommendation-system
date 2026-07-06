"""FastAPI application factory for the MVP2 backend."""

import mimetypes
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import APIRouter, FastAPI, HTTPException
from fastapi.responses import FileResponse
from sqlalchemy import text

from src.agent.router import agent_router
from src.auth.router import auth_router, user_router
from src.core.config import DEV_JWT_SECRET, get_settings
from src.core.database import engine
from src.core.logger import configure_logging, get_logger
from src.core.middlewares import setup_middlewares
from src.itineraries.router import router as itineraries_router
from src.itineraries.router import shared_router
from src.places.router import router as places_router

# Minimal health-check router (single endpoint, no domain package needed)
health_router = APIRouter(tags=["health"])


@health_router.get("/health", summary="Health check")
async def health_check() -> dict[str, str]:
    """Return API health status."""
    return {"status": "healthy"}


logger = get_logger(__name__)


# Static image assets — DB stores paths like "/img/destinations/<slug>.jpg" and
# the FE resolves them against the API base. Serve them from Backend/static/img
# with a deterministic placeholder fallback so missing images never 404 while
# real assets are still being collected.
_STATIC_IMG_DIR = Path(__file__).resolve().parent.parent / "static" / "img"
_STATIC_IMG_ROOT = _STATIC_IMG_DIR.resolve()
_STATIC_IMG_PLACEHOLDER = _STATIC_IMG_DIR / "placeholder.svg"
_STATIC_IMG_FALLBACK_EXTENSIONS = (".webp", ".avif", ".jpg", ".jpeg", ".png")

# Register explicit MIME types for modern image formats so FileResponse serves
# .webp/.avif with a correct Content-Type. Python's stdlib mimetypes omits
# .webp on some platforms (verified: CPython 3.12 on Windows returns
# guess_type('x.webp') -> (None, None)); without this Starlette falls back to
# text/plain and the browser shows a broken <img> for the .webp covers.
mimetypes.add_type("image/webp", ".webp")
mimetypes.add_type("image/avif", ".avif")

assets_router = APIRouter(tags=["assets"])


@assets_router.get("/img/{file_path:path}")
async def serve_static_image(file_path: str) -> FileResponse:
    """Serve a static image, falling back to the placeholder when absent."""
    requested = (_STATIC_IMG_DIR / file_path).resolve()
    candidates = [requested]
    candidates.extend(
        requested.with_suffix(extension) for extension in _STATIC_IMG_FALLBACK_EXTENSIONS
    )

    for candidate in candidates:
        try:
            candidate.relative_to(_STATIC_IMG_ROOT)
        except ValueError:
            continue
        if candidate.is_file():
            return FileResponse(candidate)
    if _STATIC_IMG_PLACEHOLDER.is_file():
        return FileResponse(_STATIC_IMG_PLACEHOLDER, media_type="image/svg+xml")
    raise HTTPException(status_code=404)


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    """Verify DB connectivity on startup and dispose connections on shutdown."""
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
        logger.info("database_connection_ok")
    except Exception:
        logger.exception("database_connection_failed")
        raise

    settings = get_settings()
    if settings.jwt_secret_key.get_secret_value() in ("", DEV_JWT_SECRET):
        logger.warning(
            "jwt_secret_key_not_set",
            action='Generate one: python -c "import secrets; print(secrets.token_hex(32))"',
        )

    yield

    await engine.dispose()


def create_app(verify_database: bool = True) -> FastAPI:
    """Create and configure the FastAPI application."""
    settings = get_settings()
    configure_logging(settings.debug)

    app = FastAPI(
        title=settings.app_name,
        version=settings.app_version,
        debug=settings.debug,
        lifespan=lifespan if verify_database else None,
    )
    setup_middlewares(app, settings)

    api_v1 = APIRouter()
    api_v1.include_router(health_router)
    api_v1.include_router(auth_router)
    api_v1.include_router(user_router)
    api_v1.include_router(places_router)
    api_v1.include_router(agent_router)
    api_v1.include_router(itineraries_router)
    api_v1.include_router(shared_router)

    app.include_router(api_v1, prefix="/api/v1")
    # Static image assets are mounted at the app root (not under /api/v1) because
    # DB image paths and the FE already assume origin-relative "/img/..." URLs.
    app.include_router(assets_router)
    return app


app = create_app()
