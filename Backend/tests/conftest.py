"""Shared pytest setup for MVP2 backend tests."""

import asyncio
from pathlib import Path
from sys import path

import pytest

BACKEND_ROOT = Path(__file__).resolve().parents[1]
path.insert(0, str(BACKEND_ROOT))


@pytest.fixture(scope="session")
def event_loop_policy():
    """Use default event loop policy for the test session."""
    return asyncio.DefaultEventLoopPolicy()
