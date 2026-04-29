"""Shared pytest setup for MVP2 backend tests."""

from pathlib import Path
from sys import path

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

BACKEND_ROOT = Path(__file__).resolve().parents[1]
path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(autouse=True, scope="session")
def _patch_engine_null_pool():
    """Replace the module-level engine with a NullPool variant.

    The default engine uses a connection pool (pool_size=5, max_overflow=10).
    Connections are bound to the event loop that created them.  When
    TestClient (or pytest-asyncio) closes its loop, pooled connections
    become orphaned and raise "Event loop is closed" on process exit.

    NullPool opens a fresh connection per session and closes it
    immediately on session close — no pool, no orphaned connections,
    no cleanup crash.
    """
    from src.core import database
    from src.core.config import get_settings

    settings = get_settings()
    test_engine = create_async_engine(
        settings.database_url,
        echo=settings.debug,
        poolclass=NullPool,
    )
    test_session_factory = async_sessionmaker(test_engine, expire_on_commit=False, autoflush=False)

    original_engine = database.engine
    original_factory = database.AsyncSessionLocal

    database.engine = test_engine
    database.AsyncSessionLocal = test_session_factory

    yield

    database.engine = original_engine
    database.AsyncSessionLocal = original_factory
