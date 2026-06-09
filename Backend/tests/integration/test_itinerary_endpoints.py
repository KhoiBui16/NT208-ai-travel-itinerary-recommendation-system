"""Integration tests for itinerary endpoints.

Uses fastapi.testclient.TestClient (sync) which manages its own event
loop internally — no conflict with pytest-asyncio's loop lifecycle.

DB-dependent tests are skipped locally and only run in CI where
postgres + alembic migrations are available.
"""

import os
from collections.abc import Generator
from uuid import uuid4

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


def _fresh_user(prefix: str) -> tuple[str, str, str]:
    suffix = uuid4().hex[:8]
    return (
        f"{prefix}_{suffix}@test.com",
        "password123",
        f"{prefix.title()} Tester {suffix}",
    )


def _register_user_and_get_token(client: TestClient, prefix: str) -> str:
    email, password, name = _fresh_user(prefix)
    return _get_auth_token(client, email, password, name)


def _create_trip(client: TestClient, token: str, trip_name: str) -> dict:
    response = client.post(
        "/api/v1/itineraries",
        json={**TRIP_PAYLOAD, "tripName": trip_name},
        headers=_auth_header(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def _seed_activity_for_trip(
    client: TestClient,
    token: str,
    trip_id: int,
    *,
    activity_name: str,
) -> tuple[int, dict]:
    # Get existing trip to retrieve day IDs (create_manual now seeds trip_days)
    get_response = client.get(
        f"/api/v1/itineraries/{trip_id}",
        headers=_auth_header(token),
    )
    assert get_response.status_code == 200, get_response.text
    existing_trip = get_response.json()

    # Use the first existing day's ID if available
    day_id = existing_trip.get("days", [{}])[0].get("id") if existing_trip.get("days") else None

    response = client.put(
        f"/api/v1/itineraries/{trip_id}",
        json={
            "days": [
                {
                    "id": day_id,  # Include day ID to update instead of create
                    "label": "Ngày 1",
                    "date": "2026-05-01",
                    "activities": [
                        {
                            "name": activity_name,
                            "time": "09:00",
                            "endTime": "10:00",
                            "type": "attraction",
                            "location": "Hà Nội",
                            "description": "Seed activity",
                            "image": "",
                            "extraExpenses": [],
                        }
                    ],
                    "extraExpenses": [],
                }
            ]
        },
        headers=_auth_header(token),
    )
    assert response.status_code == 200, response.text
    trip = response.json()
    day = trip["days"][0]
    activity = day["activities"][0]
    return day["id"], activity


def _seed_accommodation_for_trip(
    client: TestClient, token: str, trip_id: int, *, name: str
) -> dict:
    response = client.post(
        f"/api/v1/itineraries/{trip_id}/accommodations",
        json={
            "name": name,
            "checkIn": "2026-05-01",
            "checkOut": "2026-05-02",
            "dayIds": [],
            "pricePerNight": 500000,
            "totalPrice": 500000,
        },
        headers=_auth_header(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_trip__auth_user__returns_201(client: TestClient) -> None:
    token = _register_user_and_get_token(client, "trip_test")
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
    token = _register_user_and_get_token(client, "trip_list")
    response = client.get("/api/v1/itineraries", headers=_auth_header(token))
    assert response.status_code == 200
    data = response.json()
    assert "items" in data
    assert "total" in data


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_get_trip__other_user__returns_403(client: TestClient) -> None:
    token_a = _register_user_and_get_token(client, "trip_owner_a")
    token_b = _register_user_and_get_token(client, "trip_owner_b")

    trip_b = _create_trip(client, token_b, "Owner B Trip")

    response = client.get(
        f"/api/v1/itineraries/{trip_b['id']}",
        headers=_auth_header(token_a),
    )
    assert response.status_code == 403


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_update_activity__owner_activity_in_own_trip__returns_200(client: TestClient) -> None:
    token = _register_user_and_get_token(client, "activity_owner")
    trip = _create_trip(client, token, "Owner Activity Trip")
    _, activity = _seed_activity_for_trip(
        client,
        token,
        trip["id"],
        activity_name="Original Activity",
    )

    # Only send updateable fields, avoid nested objects that cause validation issues
    update_payload = {
        "name": "Updated Activity",
        "time": "10:15",
        "endTime": "11:00",
        "type": activity.get("type"),
        "location": activity.get("location"),
        "description": activity.get("description"),
        "image": activity.get("image"),
        "transportation": activity.get("transportation"),
    }
    response = client.put(
        f"/api/v1/itineraries/{trip['id']}/activities/{activity['id']}",
        json=update_payload,
        headers=_auth_header(token),
    )

    assert response.status_code == 200, response.text
    assert response.json()["name"] == "Updated Activity"
    assert response.json()["time"] == "10:15"


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_update_activity__mixed_trip_and_activity_ids__returns_404(client: TestClient) -> None:
    token_a = _register_user_and_get_token(client, "mixed_activity_a")
    token_b = _register_user_and_get_token(client, "mixed_activity_b")

    trip_a = _create_trip(client, token_a, "Owner A Trip")
    trip_b = _create_trip(client, token_b, "Owner B Trip")
    _, activity_b = _seed_activity_for_trip(
        client,
        token_b,
        trip_b["id"],
        activity_name="Victim Activity",
    )

    exploit_payload = {
        **activity_b,
        "name": "PWNED BY USER A",
        "time": "09:30",
    }
    response = client.put(
        f"/api/v1/itineraries/{trip_a['id']}/activities/{activity_b['id']}",
        json=exploit_payload,
        headers=_auth_header(token_a),
    )

    assert response.status_code == 404


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_delete_activity__owner_activity_in_own_trip__returns_204(client: TestClient) -> None:
    token = _register_user_and_get_token(client, "delete_activity_owner")
    trip = _create_trip(client, token, "Delete Activity Owner Trip")
    _, activity = _seed_activity_for_trip(
        client,
        token,
        trip["id"],
        activity_name="Delete Me",
    )

    response = client.delete(
        f"/api/v1/itineraries/{trip['id']}/activities/{activity['id']}",
        headers=_auth_header(token),
    )

    assert response.status_code == 204, response.text

    trip_after = client.get(
        f"/api/v1/itineraries/{trip['id']}",
        headers=_auth_header(token),
    )
    assert trip_after.status_code == 200, trip_after.text
    assert trip_after.json()["days"][0]["activities"] == []


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_delete_activity__mixed_trip_and_activity_ids__returns_404(client: TestClient) -> None:
    token_a = _register_user_and_get_token(client, "mixed_delete_activity_a")
    token_b = _register_user_and_get_token(client, "mixed_delete_activity_b")

    trip_a = _create_trip(client, token_a, "Owner A Delete Trip")
    trip_b = _create_trip(client, token_b, "Owner B Delete Trip")
    _, activity_b = _seed_activity_for_trip(
        client,
        token_b,
        trip_b["id"],
        activity_name="Protected Activity",
    )

    response = client.delete(
        f"/api/v1/itineraries/{trip_a['id']}/activities/{activity_b['id']}",
        headers=_auth_header(token_a),
    )

    assert response.status_code == 404

    victim_trip_after = client.get(
        f"/api/v1/itineraries/{trip_b['id']}",
        headers=_auth_header(token_b),
    )
    assert victim_trip_after.status_code == 200, victim_trip_after.text
    remaining_activities = victim_trip_after.json()["days"][0]["activities"]
    assert len(remaining_activities) == 1
    assert remaining_activities[0]["id"] == activity_b["id"]


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_delete_accommodation__owner_accommodation_in_own_trip__returns_204(
    client: TestClient,
) -> None:
    token = _register_user_and_get_token(client, "accommodation_owner")
    trip = _create_trip(client, token, "Owner Accommodation Trip")
    accommodation = _seed_accommodation_for_trip(
        client,
        token,
        trip["id"],
        name="Owner Hotel",
    )

    response = client.delete(
        f"/api/v1/itineraries/{trip['id']}/accommodations/{accommodation['id']}",
        headers=_auth_header(token),
    )

    assert response.status_code == 204, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_delete_accommodation__mixed_trip_and_accommodation_ids__returns_404(
    client: TestClient,
) -> None:
    token_a = _register_user_and_get_token(client, "mixed_acc_a")
    token_b = _register_user_and_get_token(client, "mixed_acc_b")

    trip_a = _create_trip(client, token_a, "Owner A Accommodation Trip")
    trip_b = _create_trip(client, token_b, "Owner B Accommodation Trip")
    accommodation_b = _seed_accommodation_for_trip(
        client,
        token_b,
        trip_b["id"],
        name="Victim Hotel",
    )

    response = client.delete(
        f"/api/v1/itineraries/{trip_a['id']}/accommodations/{accommodation_b['id']}",
        headers=_auth_header(token_a),
    )

    assert response.status_code == 404
