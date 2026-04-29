"""Async database engine and session management.

Provides:
  - Base: SQLAlchemy DeclarativeBase for all ORM models.
  - engine: Async engine connected to the configured database_url.
  - AsyncSessionLocal: Session factory bound to the engine.
  - get_db(): FastAPI dependency that yields an AsyncSession per request.

Usage in endpoints:
    async def my_endpoint(db: AsyncSession = Depends(get_db)):
        result = await db.execute(select(User))
"""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)
from sqlalchemy.orm import DeclarativeBase

from src.core.config import get_settings


class Base(DeclarativeBase):
    """SQLAlchemy declarative base for all ORM models.

    All models in src/models/ inherit from this class.
    Alembic reads Base.metadata to discover tables for migrations.
    """


def get_async_engine(database_url: str | None = None) -> AsyncEngine:
    """Create an async SQLAlchemy engine.

    Args:
        database_url: Override URL. If None, reads from settings.database_url.

    Returns:
        AsyncEngine with connection pool (5 base, 10 overflow) and pre-ping enabled.
    """
    settings = get_settings()
    return create_async_engine(
        database_url or settings.database_url,
        echo=settings.debug,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )


def get_session_factory(engine: AsyncEngine) -> async_sessionmaker[AsyncSession]:
    """Create an AsyncSession factory bound to the given engine.

    Args:
        engine: The async engine to bind sessions to.

    Returns:
        async_sessionmaker with expire_on_commit=False and autoflush=False
        to support lazy-loaded relationships and explicit flush control.
    """
    return async_sessionmaker(engine, expire_on_commit=False, autoflush=False)


# Module-level singletons — created once at import time
engine = get_async_engine()
AsyncSessionLocal = get_session_factory(engine)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield a database session for FastAPI dependencies.

    Used as Depends(get_db) in endpoint functions. The session is
    automatically closed when the request completes.

    Yields:
        AsyncSession bound to the application engine.
    """
    async with AsyncSessionLocal() as session:
        yield session
