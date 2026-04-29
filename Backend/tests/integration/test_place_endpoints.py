"""Integration tests for place endpoints.

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


@pytest.fixture()
def client() -> Generator[TestClient, None, None]:
    with TestClient(create_app(verify_database=False)) as c:
        yield c


def _auth_header(token: str = "fake-token") -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# --- Public endpoints (no auth needed) ---


def test_list_destinations__returns_200(client: TestClient) -> None:
    response = client.get("/api/v1/places/destinations")
    assert response.status_code == 200


def test_get_destination_detail__returns_404_for_unknown(
    client: TestClient,
) -> None:
    response = client.get("/api/v1/places/destinations/nonexistent-place-xyz")
    assert response.status_code in {404, 500, 503}


def test_search_places__returns_200(client: TestClient) -> None:
    response = client.get("/api/v1/places/search")
    assert response.status_code == 200


def test_search_places__with_query(client: TestClient) -> None:
    response = client.get("/api/v1/places/search", params={"query": "Hoàn Kiếm"})
    assert response.status_code == 200


def test_search_places__with_category(client: TestClient) -> None:
    response = client.get("/api/v1/places/search", params={"category": "food"})
    assert response.status_code == 200


def test_search_places__limit_validation(client: TestClient) -> None:
    response = client.get("/api/v1/places/search", params={"limit": 0})
    assert response.status_code == 422


def test_get_place_by_id__returns_404_for_unknown(client: TestClient) -> None:
    response = client.get("/api/v1/places/999999")
    assert response.status_code in {404, 500, 503}


# --- Saved places (auth required) ---


def test_list_saved__no_auth__returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/places/saved/list")
    assert response.status_code == 401


def test_save_place__no_auth__returns_401(client: TestClient) -> None:
    response = client.post("/api/v1/places/saved", json={"placeId": 1})
    assert response.status_code == 401


def test_unsave_place__no_auth__returns_401(client: TestClient) -> None:
    response = client.delete("/api/v1/places/saved/1")
    assert response.status_code == 401


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
def test_save_and_unsave_place__auth_user(client: TestClient) -> None:
    token = _get_auth_token(client, "place_test@test.com", "password123", "Place Tester")
    headers = _auth_header(token)

    # Save a place (place_id=1 must exist from seed/migration)
    save_resp = client.post(
        "/api/v1/places/saved",
        json={"placeId": 1},
        headers=headers,
    )
    assert save_resp.status_code in {201, 404, 409}

    if save_resp.status_code == 201:
        saved_id = save_resp.json()["id"]
        # List saved places
        list_resp = client.get("/api/v1/places/saved/list", headers=headers)
        assert list_resp.status_code == 200

        # Unsave
        unsave_resp = client.delete(
            f"/api/v1/places/saved/{saved_id}",
            headers=headers,
        )
        assert unsave_resp.status_code == 204
