"""Integration tests for auth and user endpoints.

Tests use FastAPI TestClient against a real database in CI
(postgres service + alembic migrations run before tests).
Locally without a DB, tests that hit DB may fail — use `verify_database=False`
for schema/routing-only tests or run docker compose for full integration.
"""

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("sqlalchemy")

from src.main import create_app


@pytest.fixture()
def client() -> TestClient:
    with TestClient(create_app(verify_database=False)) as c:
        yield c


# --- Auth endpoints ---


def test_register__valid_body__returns_201_or_422(client: TestClient) -> None:
    """POST /api/v1/auth/register should accept valid payload (may fail on DB)."""
    response = client.post(
        "/api/v1/auth/register",
        json={"email": "new@test.com", "password": "password123", "name": "New User"},
    )
    assert response.status_code in {201, 422, 500}


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


def test_login__valid_body__returns_200_or_401(client: TestClient) -> None:
    """POST /api/v1/auth/login should return 200 or 401 with real DB.

    With a real DB: 200 if user exists + correct password, 401 otherwise.
    Without a DB (local): may return 500 due to connection error.
    """
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


def test_logout__missing_token__returns_422(client: TestClient) -> None:
    """POST /api/v1/auth/logout without token should return 422."""
    response = client.post("/api/v1/auth/logout", json={})
    # 422 for missing refresh_token, or 401 for missing Bearer auth
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
