"""Integration tests cho companion chat message APIs của C3B."""

import os
from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient

pytest.importorskip("sqlalchemy")

from src.itineraries.companion_service import CompanionReplyPayload
from src.main import create_app

IN_CI = os.getenv("CI") == "true"

TRIP_PAYLOAD = {
    "destination": "Hà Nội",
    "tripName": "Trip to Hà Nội",
    "startDate": "2026-05-01",
    "endDate": "2026-05-03",
    "budget": 5000000,
}


class FakeCompanionProvider:
    """Fake provider để integration test không đụng Gemini thật."""

    async def generate_reply(self, **kwargs: object) -> CompanionReplyPayload:
        trip = kwargs["trip"]
        second_day_id = trip.days[1].id if len(trip.days) > 1 else trip.days[0].id
        return CompanionReplyPayload(
            message="Mình đề xuất thêm Văn Miếu vào ngày 2.",
            requires_confirmation=True,
            proposed_operations=[
                {
                    "type": "add_activity",
                    "description": "Thêm Văn Miếu vào ngày 2",
                    "target": {"dayId": second_day_id},
                    "activity": {
                        "name": "Văn Miếu",
                        "time": "14:00",
                        "endTime": "16:00",
                        "location": "58 Quốc Tử Giám, Hà Nội",
                        "description": "Tham quan di tích lịch sử",
                        "type": "attraction",
                        "image": "",
                        "transportation": "taxi",
                        "adultPrice": 70000,
                        "childPrice": 35000,
                        "extraExpenses": [],
                    },
                }
            ],
        )


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    app = create_app(verify_database=False)
    app.state.companion_provider = FakeCompanionProvider()
    with TestClient(app) as c:
        yield c


def _auth_header(token: str = "fake-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _get_auth_token(client: TestClient, email: str, password: str, name: str) -> str:
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


def _create_chat_session(client: TestClient, token: str, trip_id: int) -> dict:
    response = client.post(
        f"/api/v1/itineraries/{trip_id}/chat-sessions",
        headers=_auth_header(token),
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_send_chat_message__no_auth__returns_401(client: TestClient) -> None:
    """POST message không có auth phải bị chặn."""
    response = client.post(
        "/api/v1/itineraries/chat-sessions/1/messages",
        json={"content": "Xin chào"},
    )
    assert response.status_code == 401


def test_list_chat_messages__no_auth__returns_401(client: TestClient) -> None:
    """GET history không có auth phải bị chặn."""
    response = client.get("/api/v1/itineraries/chat-sessions/1/messages")
    assert response.status_code == 401


def test_apply_patch__no_auth__returns_401(client: TestClient) -> None:
    """Confirm proposal không có auth phải bị chặn."""
    response = client.post(
        "/api/v1/itineraries/1/apply-patch",
        json={"assistantMessageId": 1, "action": "apply"},
    )
    assert response.status_code == 401


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_send_chat_message__success__persists_both_messages(client: TestClient) -> None:
    """POST message phải trả reply structured và GET history thấy đủ 2 messages."""
    token = _register_user_and_get_token(client, "companion_send")
    trip = _create_trip(client, token, "Companion Trip")
    session = _create_chat_session(client, token, trip["id"])

    response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Thêm giúp mình một địa điểm lịch sử"},
        headers=_auth_header(token),
    )

    assert response.status_code == 201, response.text
    data = response.json()
    assert data["sessionId"] == session["id"]
    assert data["message"] == "Mình đề xuất thêm Văn Miếu vào ngày 2."
    assert data["requiresConfirmation"] is True
    assert len(data["proposedOperations"]) == 1
    assert data["userMessage"]["role"] == "user"
    assert data["assistantMessage"]["role"] == "assistant"
    assert response.headers["X-RateLimit-Limit"] == "20"

    history = client.get(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        headers=_auth_header(token),
    )
    assert history.status_code == 200, history.text
    history_data = history.json()
    assert history_data["total"] == 2
    assert [item["role"] for item in history_data["items"]] == ["user", "assistant"]


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_send_chat_message__cross_user__returns_403(client: TestClient) -> None:
    """User B không được gửi message vào session của User A."""
    token_a = _register_user_and_get_token(client, "companion_owner_a")
    token_b = _register_user_and_get_token(client, "companion_owner_b")

    trip = _create_trip(client, token_a, "Owner A Trip")
    session = _create_chat_session(client, token_a, trip["id"])

    response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Xin chào"},
        headers=_auth_header(token_b),
    )

    assert response.status_code == 403, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_list_chat_messages__cross_user__returns_403(client: TestClient) -> None:
    """User B không được đọc history của session thuộc trip người khác."""
    token_a = _register_user_and_get_token(client, "companion_history_a")
    token_b = _register_user_and_get_token(client, "companion_history_b")

    trip = _create_trip(client, token_a, "History Owner A Trip")
    session = _create_chat_session(client, token_a, trip["id"])

    send_response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Xin chào"},
        headers=_auth_header(token_a),
    )
    assert send_response.status_code == 201, send_response.text

    response = client.get(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        headers=_auth_header(token_b),
    )

    assert response.status_code == 403, response.text


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_apply_patch__success__persists_itinerary_change(client: TestClient) -> None:
    """Apply proposal phải cập nhật itinerary và đánh dấu message là applied."""
    token = _register_user_and_get_token(client, "companion_apply")
    trip = _create_trip(client, token, "Companion Apply Trip")
    session = _create_chat_session(client, token, trip["id"])

    send_response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Thêm Văn Miếu vào ngày 2 lúc 14:00"},
        headers=_auth_header(token),
    )
    assert send_response.status_code == 201, send_response.text
    assistant_message = send_response.json()["assistantMessage"]

    apply_response = client.post(
        f"/api/v1/itineraries/{trip['id']}/apply-patch",
        json={
            "assistantMessageId": assistant_message["id"],
            "action": "apply",
        },
        headers=_auth_header(token),
    )

    assert apply_response.status_code == 200, apply_response.text
    data = apply_response.json()
    assert data["applied"] is True
    assert data["status"] == "applied"
    assert data["assistantMessage"]["confirmationStatus"] == "applied"
    assert data["trip"]["id"] == trip["id"]
    assert any(
        activity["name"] == "Văn Miếu"
        for day in data["trip"]["days"]
        for activity in day["activities"]
    )


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_apply_patch__cancel__keeps_trip_unchanged(client: TestClient) -> None:
    """Cancel proposal chỉ đổi status message, không mutate itinerary."""
    token = _register_user_and_get_token(client, "companion_cancel")
    trip = _create_trip(client, token, "Companion Cancel Trip")
    session = _create_chat_session(client, token, trip["id"])

    send_response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Thêm Văn Miếu vào ngày 2 lúc 14:00"},
        headers=_auth_header(token),
    )
    assert send_response.status_code == 201, send_response.text
    assistant_message = send_response.json()["assistantMessage"]

    cancel_response = client.post(
        f"/api/v1/itineraries/{trip['id']}/apply-patch",
        json={
            "assistantMessageId": assistant_message["id"],
            "action": "cancel",
        },
        headers=_auth_header(token),
    )

    assert cancel_response.status_code == 200, cancel_response.text
    data = cancel_response.json()
    assert data["applied"] is False
    assert data["status"] == "cancelled"
    assert data["trip"] is None
    assert data["assistantMessage"]["confirmationStatus"] == "cancelled"


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_apply_patch__stale_trip__persists_stale_status(client: TestClient) -> None:
    """Stale proposal phải trả 409 và message row phải được persist thành stale."""
    token = _register_user_and_get_token(client, "companion_stale")
    trip = _create_trip(client, token, "Companion Stale Trip")
    session = _create_chat_session(client, token, trip["id"])

    send_response = client.post(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        json={"content": "Thêm Văn Miếu vào ngày 2 lúc 14:00"},
        headers=_auth_header(token),
    )
    assert send_response.status_code == 201, send_response.text
    assistant_message = send_response.json()["assistantMessage"]

    update_response = client.put(
        f"/api/v1/itineraries/{trip['id']}",
        json={"tripName": "Companion Stale Trip [updated]"},
        headers=_auth_header(token),
    )
    assert update_response.status_code == 200, update_response.text

    apply_response = client.post(
        f"/api/v1/itineraries/{trip['id']}/apply-patch",
        json={
            "assistantMessageId": assistant_message["id"],
            "action": "apply",
        },
        headers=_auth_header(token),
    )

    assert apply_response.status_code == 409, apply_response.text

    history = client.get(
        f"/api/v1/itineraries/chat-sessions/{session['id']}/messages",
        headers=_auth_header(token),
    )
    assert history.status_code == 200, history.text
    message = next(
        item for item in history.json()["items"] if item["id"] == assistant_message["id"]
    )
    assert message["confirmationStatus"] == "stale"
    assert message["resolvedAt"] is not None
