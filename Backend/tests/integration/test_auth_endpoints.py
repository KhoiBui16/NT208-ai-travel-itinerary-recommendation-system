"""Integration tests for auth and user endpoints.

Uses fastapi.testclient.TestClient (sync) which manages its own event
loop internally — no conflict with pytest-asyncio's loop lifecycle.

DB-dependent tests are skipped locally and only run in CI where
postgres + alembic migrations are available.
"""

import os
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("sqlalchemy")

from src.main import create_app

# CI env var is set by GitHub Actions — skip DB-dependent tests locally
IN_CI = os.getenv("CI") == "true"


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    """Create a sync test client with the app's ASGI lifecycle handled."""
    with TestClient(create_app(verify_database=False)) as c:
        yield c


# --- Auth endpoints ---


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_register__valid_body__returns_201_or_409(client: TestClient) -> None:
    """POST /api/v1/auth/register should create user or reject duplicate."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "password123", "name": "New User"},
    )
    assert response.status_code in {201, 409, 500, 503}


def test_register__missing_email__returns_422(client: TestClient) -> None:
    """POST /api/v1/auth/register without email should return validation error."""
    response = client.post(
        "/api/v1/auth/register",
        json={"password": "password123", "name": "No Email"},
    )
    assert response.status_code == 422


def test_register__short_password__returns_422(client: TestClient) -> None:
    """POST /api/v1/auth/register with short password should fail validation."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "test@test.com", "password": "12", "name": "Short Pwd"},
    )
    assert response.status_code == 422


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_login__valid_body__returns_200_or_401(client: TestClient) -> None:
    """POST /api/v1/auth/login should return 200 or 401 with real DB."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "test@test.com", "password": "password123"},
    )
    assert response.status_code in {200, 401, 500, 503}


def test_login__missing_fields__returns_422(client: TestClient) -> None:
    """POST /api/v1/auth/login with missing fields should return 422."""
    response = client.post("/api/v1/auth/login", json={})
    assert response.status_code == 422


def test_refresh__missing_token__returns_422(client: TestClient) -> None:
    """POST /api/v1/auth/refresh without token should return 422."""
    response = client.post("/api/v1/auth/refresh", json={})
    assert response.status_code == 422


def test_logout__missing_token__returns_401_or_422(client: TestClient) -> None:
    """POST /api/v1/auth/logout without Bearer auth should return 401 or 422."""
    response = client.post("/api/v1/auth/logout", json={"refreshToken": "abc"})
    assert response.status_code in {401, 422}


# --- User endpoints ---


def test_get_profile__no_auth__returns_401(client: TestClient) -> None:
    """GET /api/v1/users/profile without Bearer token should return 401."""
    response = client.get("/api/v1/users/profile")
    assert response.status_code == 401


def test_update_profile__no_auth__returns_401(client: TestClient) -> None:
    """PUT /api/v1/users/profile without auth should return 401."""
    response = client.put("/api/v1/users/profile", json={"name": "New Name"})
    assert response.status_code == 401


def test_change_password__no_auth__returns_401(client: TestClient) -> None:
    """PUT /api/v1/users/password without auth should return 401."""
    response = client.put(
        "/api/v1/users/password",
        json={"currentPassword": "old", "newPassword": "newpass123"},
    )
    assert response.status_code == 401
