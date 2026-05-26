"""Integration tests for agent endpoints (EP-30)."""

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


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def test_suggest_alternatives__no_auth__returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/agent/suggest/1")
    assert response.status_code == 401


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


@pytest.mark.skipif(not IN_CI, reason="Requires running DB — runs in CI with postgres service")
def test_suggest_alternatives__unknown_activity__returns_404(client: TestClient) -> None:
    token = _get_auth_token(client, "suggest_404@test.com", "password123", "Suggest Tester")
    response = client.get(
        "/api/v1/agent/suggest/999999999",
        headers=_auth_header(token),
    )
    assert response.status_code == 404
