"""Integration tests for health endpoints."""

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("sqlalchemy")

from src.main import create_app


def test_health_endpoint__root_path__returns_healthy() -> None:
    """Health endpoint should be available without auth."""
    with TestClient(create_app(verify_database=False)) as client:
        response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {"status": "healthy"}
