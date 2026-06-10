"""Integration tests for Chat Session REST APIs.

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


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(create_app(verify_database=False)) as c:
        yield c


def _auth_header(token: str = "fake-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


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


# --- Validation tests (no DB needed) ---


def test_create_chat_session__no_auth__returns_401(client: TestClient) -> None:
    """POST /{trip_id}/chat-sessions without auth returns 401."""
    response = client.post("/api/v1/itineraries/1/chat-sessions")
    assert response.status_code == 401


def test_list_chat_sessions__no_auth__returns_401(client: TestClient) -> None:
    """GET /{trip_id}/chat-sessions without auth returns 401."""
    response = client.get("/api/v1/itineraries/1/chat-sessions")
    assert response.status_code == 401


def test_get_chat_session__no_auth__returns_401(client: TestClient) -> None:
    """GET /chat-sessions/{session_id} without auth returns 401."""
    response = client.get("/api/v1/itineraries/chat-sessions/1")
    assert response.status_code == 401


# --- DB-dependent tests ---


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_chat_session__success__returns_201(client: TestClient) -> None:
    """POST /{trip_id}/chat-sessions creates session and returns 201."""
    token = _register_user_and_get_token(client, "chat_create")
    trip = _create_trip(client, token, "Chat Session Trip")

    response = client.post(
        f"/api/v1/itineraries/{trip['id']}/chat-sessions",
        headers=_auth_header(token),
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["tripId"] == trip["id"]
    assert data["userId"] is not None
    assert data["threadId"].startswith("trip-")
    assert data["status"] == "active"
    assert "id" in data
    assert "createdAt" in data
    assert "updatedAt" in data


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_chat_session__not_owner__returns_403(client: TestClient) -> None:
    """User B cannot create chat session on User A's trip."""
    token_a = _register_user_and_get_token(client, "owner_a")
    token_b = _register_user_and_get_token(client, "owner_b")

    trip_a = _create_trip(client, token_a, "Owner A Trip")

    response = client.post(
        f"/api/v1/itineraries/{trip_a['id']}/chat-sessions",
        headers=_auth_header(token_b),
    )

    assert response.status_code == 403, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_chat_session__trip_not_found__returns_404(client: TestClient) -> None:
    """POST to non-existent trip returns 404."""
    token = _register_user_and_get_token(client, "chat_not_found")

    response = client.post(
        "/api/v1/itineraries/99999/chat-sessions",
        headers=_auth_header(token),
    )

    assert response.status_code == 404, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_list_chat_sessions__success__returns_200(client: TestClient) -> None:
    """GET /{trip_id}/chat-sessions returns list with total."""
    token = _register_user_and_get_token(client, "chat_list")
    trip = _create_trip(client, token, "List Sessions Trip")

    # Create 3 sessions
    for i in range(3):
        response = client.post(
            f"/api/v1/itineraries/{trip['id']}/chat-sessions",
            headers=_auth_header(token),
        )
        assert response.status_code == 201, f"Session {i} creation failed"

    response = client.get(
        f"/api/v1/itineraries/{trip['id']}/chat-sessions",
        headers=_auth_header(token),
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert "items" in data
    assert "total" in data
    assert data["total"] == 3
    assert len(data["items"]) == 3


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_list_chat_sessions__pagination__returns_correct_slice(client: TestClient) -> None:
    """GET with skip/limit returns correct slice and total."""
    token = _register_user_and_get_token(client, "chat_pagination")
    trip = _create_trip(client, token, "Pagination Trip")

    # Create 5 sessions
    session_ids = []
    for i in range(5):
        response = client.post(
            f"/api/v1/itineraries/{trip['id']}/chat-sessions",
            headers=_auth_header(token),
        )
        assert response.status_code == 201, f"Session {i} creation failed"
        session_ids.append(response.json()["id"])

    # Get with skip=2, limit=2
    response = client.get(
        f"/api/v1/itineraries/{trip['id']}/chat-sessions?skip=2&limit=2",
        headers=_auth_header(token),
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["total"] == 5
    assert len(data["items"]) == 2
    # Verify we got the correct slice — sessions are ORDER BY created_at DESC
    returned_ids = [item["id"] for item in data["items"]]
    expected_ids = list(reversed(session_ids))[2:4]
    assert returned_ids == expected_ids


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_list_chat_sessions__not_owner__returns_403(client: TestClient) -> None:
    """User B cannot list chat sessions for User A's trip."""
    token_a = _register_user_and_get_token(client, "list_owner_a")
    token_b = _register_user_and_get_token(client, "list_owner_b")

    trip_a = _create_trip(client, token_a, "Owner A List Trip")

    # Create a session as owner A
    client.post(
        f"/api/v1/itineraries/{trip_a['id']}/chat-sessions",
        headers=_auth_header(token_a),
    )

    # User B tries to list
    response = client.get(
        f"/api/v1/itineraries/{trip_a['id']}/chat-sessions",
        headers=_auth_header(token_b),
    )

    assert response.status_code == 403, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_get_chat_session__success__returns_200(client: TestClient) -> None:
    """GET /chat-sessions/{session_id} returns session data."""
    token = _register_user_and_get_token(client, "chat_get")
    trip = _create_trip(client, token, "Get Session Trip")

    create_response = client.post(
        f"/api/v1/itineraries/{trip['id']}/chat-sessions",
        headers=_auth_header(token),
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    response = client.get(
        f"/api/v1/itineraries/chat-sessions/{session_id}",
        headers=_auth_header(token),
    )

    assert response.status_code == 200, response.text
    data = response.json()
    assert data["id"] == session_id
    assert data["tripId"] == trip["id"]
    assert data["threadId"].startswith("trip-")
    assert data["status"] == "active"


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_get_chat_session__not_found__returns_404(client: TestClient) -> None:
    """GET non-existent session returns 404."""
    token = _register_user_and_get_token(client, "chat_get_not_found")

    response = client.get(
        "/api/v1/itineraries/chat-sessions/99999",
        headers=_auth_header(token),
    )

    assert response.status_code == 404, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_get_chat_session__not_owner__returns_403(client: TestClient) -> None:
    """User B cannot get User A's chat session."""
    token_a = _register_user_and_get_token(client, "get_owner_a")
    token_b = _register_user_and_get_token(client, "get_owner_b")

    trip_a = _create_trip(client, token_a, "Owner A Get Trip")

    create_response = client.post(
        f"/api/v1/itineraries/{trip_a['id']}/chat-sessions",
        headers=_auth_header(token_a),
    )
    assert create_response.status_code == 201
    session_id = create_response.json()["id"]

    # User B tries to get the session
    response = client.get(
        f"/api/v1/itineraries/chat-sessions/{session_id}",
        headers=_auth_header(token_b),
    )

    assert response.status_code == 403, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_guest_cannot_create_chat_session__returns_401(client: TestClient) -> None:
    """Unauthenticated guest cannot create chat session (requires auth)."""
    # Note: This test verifies the auth guard, not guest trip + chat session flow
    # which would require generating a guest trip first (via /itineraries/generate)
    response = client.post("/api/v1/itineraries/1/chat-sessions")
    assert response.status_code == 401, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_create_multiple_sessions__all_active(client: TestClient) -> None:
    """Multiple chat sessions can be created for the same trip."""
    token = _register_user_and_get_token(client, "multi_sessions")
    trip = _create_trip(client, token, "Multi Session Trip")

    session_ids = []
    for i in range(3):
        response = client.post(
            f"/api/v1/itineraries/{trip['id']}/chat-sessions",
            headers=_auth_header(token),
        )
        assert response.status_code == 201, f"Session {i} creation failed"
        data = response.json()
        session_ids.append(data["id"])
        assert data["status"] == "active"

    # Verify all sessions are listed
    list_response = client.get(
        f"/api/v1/itineraries/{trip['id']}/chat-sessions",
        headers=_auth_header(token),
    )
    assert list_response.status_code == 200
    assert list_response.json()["total"] == 3
    assert len(list_response.json()["items"]) == 3
