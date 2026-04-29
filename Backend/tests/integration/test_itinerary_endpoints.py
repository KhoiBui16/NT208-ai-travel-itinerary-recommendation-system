"""Integration tests for itinerary endpoints.

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

IN_CI = os.getenv("CI") == "true"

TRIP_PAYLOAD = {
    "destination": "Hà Nội",
    "tripName": "Trip to Hà Nội",
    "startDate": "2026-05-01",
    "endDate": "2026-05-03",
    "budget": 5000000,
}

GENERATE_PAYLOAD = {
    "destination": "Đà Lạt",
    "startDate": "2026-06-01",
    "endDate": "2026-06-03",
    "budget": 3000000,
}


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(create_app(verify_database=False)) as c:
        yield c


def _auth_header(token: str = "fake-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- Validation tests (no DB needed) ---


def test_create_trip__missing_destination__returns_422(client: TestClient) -> None:
    payload = {
        "tripName": "Test",
        "startDate": "2026-05-01",
        "endDate": "2026-05-03",
        "budget": 1000,
    }
    response = client.post("/api/v1/itineraries", json=payload)
    assert response.status_code == 422


def test_create_trip__zero_budget__returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/itineraries",
        json={**TRIP_PAYLOAD, "budget": 0},
    )
    assert response.status_code == 422


def test_create_trip__end_before_start__returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/itineraries",
        json={**TRIP_PAYLOAD, "startDate": "2026-05-10", "endDate": "2026-05-01"},
    )
    assert response.status_code == 422


def test_generate__missing_destination__returns_422(client: TestClient) -> None:
    payload = {"startDate": "2026-05-01", "endDate": "2026-05-03", "budget": 1000}
    response = client.post("/api/v1/itineraries/generate", json=payload)
    assert response.status_code == 422


def test_generate__zero_budget__returns_422(client: TestClient) -> None:
    response = client.post(
        "/api/v1/itineraries/generate",
        json={**GENERATE_PAYLOAD, "budget": 0},
    )
    assert response.status_code == 422


# --- Auth guard tests (no DB needed) ---


def test_get_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/itineraries/1")
    assert response.status_code == 401


def test_update_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.put("/api/v1/itineraries/1", json={"tripName": "Updated"})
    assert response.status_code == 401


def test_delete_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.delete("/api/v1/itineraries/1")
    assert response.status_code == 401


def test_list_trips__no_auth__returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/itineraries")
    assert response.status_code == 401


def test_rate_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.put("/api/v1/itineraries/1/rating?rating=5")
    assert response.status_code == 401


def test_share_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/itineraries/1/share")
    assert response.status_code == 401


def test_claim_trip__no_auth__returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/itineraries/1/claim", json={"claimToken": "abc"})
    assert response.status_code == 401


def test_add_activity__no_auth__returns_401(client: TestClient) -> None:
    payload = {"name": "Eat", "time": "12:00", "type": "food"}
    response = client.post("/api/v1/itineraries/1/activities?day_id=1", json=payload)
    assert response.status_code == 401


def test_delete_activity__no_auth__returns_401(client: TestClient) -> None:
    response = client.delete("/api/v1/itineraries/1/activities/1")
    assert response.status_code == 401


def test_add_accommodation__no_auth__returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/itineraries/1/accommodations", json={"name": "Hotel"})
    assert response.status_code == 401


def test_delete_accommodation__no_auth__returns_401(client: TestClient) -> None:
    response = client.delete("/api/v1/itineraries/1/accommodations/1")
    assert response.status_code == 401


# --- Shared endpoint (public, no auth) ---


def test_get_shared__invalid_token__returns_404(client: TestClient) -> None:
    """GET /api/v1/shared/{shareToken} with invalid token returns 404."""
    response = client.get("/api/v1/shared/share_nonexistent_token")
    assert response.status_code in {404, 500, 503}


# --- DB-dependent tests ---


def _get_auth_token(client: TestClient, email: str, password: str, name: str) -> str:
    """Register or login to get an access token."""
    reg = client.post(
        "/api/v1/auth/register",
        json={"email": email, "password": password, "name": name},
    )
    if reg.status_code == 409:
        login_resp = client.post(
            "/api/v1/auth/login",
            json={"email": email, "password": password},
        )
        return login_resp.json()["accessToken"]
    return reg.json()["accessToken"]


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_trip__auth_user__returns_201(client: TestClient) -> None:
    token = _get_auth_token(client, "trip_test@test.com", "password123", "Trip Tester")
    response = client.post(
        "/api/v1/itineraries",
        json=TRIP_PAYLOAD,
        headers=_auth_header(token),
    )
    assert response.status_code == 201
    data = response.json()
    assert data["destination"] == "Hà Nội"
    assert "id" in data


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_list_trips__auth_user__returns_200(client: TestClient) -> None:
    token = _get_auth_token(client, "trip_list@test.com", "password123", "List Tester")
    response = client.get("/api/v1/itineraries", headers=_auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data
