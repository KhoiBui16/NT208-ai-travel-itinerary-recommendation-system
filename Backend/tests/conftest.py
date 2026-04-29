"""Shared pytest setup for MVP2 backend tests."""

import asyncio
import atexit
from pathlib import Path
from sys import path

BACKEND_ROOT = Path(__file__).resolve().parents[1]
path.insert(0, str(BACKEND_ROOT))


def _dispose_engine() -> None:
    """Dispose the SQLAlchemy async engine to avoid 'Event loop is closed' at exit."""
    try:
        from src.core.database import engine

        loop = asyncio.new_event_loop()
        loop.run_until_complete(engine.dispose())
        loop.close()
    except Exception:
        pass


atexit.register(_dispose_engine)
