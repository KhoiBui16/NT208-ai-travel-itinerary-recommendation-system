"""FastAPI application factory for the MVP2 backend."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from sqlalchemy import text

from src.api.v1.router import api_v1_router
from src.core.config import get_settings
from src.core.database import engine
from src.core.logger import configure_logging, get_logger
from src.core.middlewares import setup_middlewares

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
    app.include_router(api_v1_router, prefix="/api/v1")
    return app


app = create_app()
