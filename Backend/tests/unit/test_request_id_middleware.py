"""Tests for RequestIDMiddleware."""

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from src.main import create_app


@pytest.mark.asyncio
async def test_request_id_echoed_back():
    """X-Request-ID sent by the client is returned unchanged in the response."""
    app = create_app(verify_database=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health", headers={"X-Request-ID": "test-123"})
        assert response.headers.get("X-Request-ID") == "test-123"


@pytest.mark.asyncio
async def test_request_id_generated_if_absent():
    """When no X-Request-ID is sent, the middleware generates a UUID4."""
    app = create_app(verify_database=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/v1/health")
        request_id = response.headers.get("X-Request-ID")
        assert request_id is not None, "X-Request-ID header must be present"
        assert len(request_id) == 36, f"Expected UUID4 (36 chars), got: {request_id!r}"
        # Validate it's a valid UUID
        uuid.UUID(request_id)  # raises ValueError if invalid


@pytest.mark.asyncio
async def test_request_id_unique_per_request():
    """Each request without an X-Request-ID gets a different generated ID."""
    app = create_app(verify_database=False)
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        r1 = await client.get("/api/v1/health")
        r2 = await client.get("/api/v1/health")
        id1 = r1.headers.get("X-Request-ID")
        id2 = r2.headers.get("X-Request-ID")
        assert id1 != id2, "Each request should get a unique request ID"
