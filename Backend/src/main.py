"""FastAPI application factory for the MVP2 backend."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import APIRouter, FastAPI
from sqlalchemy import text

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
    api_v1.include_router(itineraries_router)
    api_v1.include_router(shared_router)

    app.include_router(api_v1, prefix="/api/v1")
    return app


app = create_app()
