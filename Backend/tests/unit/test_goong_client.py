"""Unit tests for Goong REST client endpoint parsing."""

import pytest

from src.geo.goong_client import GoongClient


@pytest.mark.asyncio
async def test_goong_client__autocomplete_uses_lowercase_endpoint(monkeypatch):
    seen: dict[str, object] = {}
    client = GoongClient(api_key="test-key")

    async def fake_fetch(url: str, params: dict | None = None, headers: dict | None = None):
        seen["url"] = url
        seen["params"] = params
        seen["headers"] = headers
        return {"predictions": [{"place_id": "abc", "description": "Hà Nội"}]}

    monkeypatch.setattr(client, "fetch", fake_fetch)

    result = await client.autocomplete("nhà hàng Hà Nội", location="21.0,105.8")

    assert result[0]["place_id"] == "abc"
    assert seen["url"] == "https://rsapi.goong.io/place/autocomplete"
    assert seen["params"] == {
        "input": "nhà hàng Hà Nội",
        "location": "21.0,105.8",
        "api_key": "test-key",
    }


@pytest.mark.asyncio
async def test_goong_client__place_detail_parses_result(monkeypatch):
    client = GoongClient(api_key="test-key")

    async def fake_fetch(url: str, params: dict | None = None, headers: dict | None = None):
        return {"result": {"name": "Văn Miếu"}}

    monkeypatch.setattr(client, "fetch", fake_fetch)

    result = await client.place_detail("goong-id")

    assert result == {"name": "Văn Miếu"}


@pytest.mark.asyncio
async def test_goong_client__geocode_parses_coordinates(monkeypatch):
    client = GoongClient(api_key="test-key")

    async def fake_fetch(url: str, params: dict | None = None, headers: dict | None = None):
        return {"results": [{"geometry": {"location": {"lat": 21.03, "lng": 105.85}}}]}

    monkeypatch.setattr(client, "fetch", fake_fetch)

    result = await client.geocode("Hà Nội")

    assert result == {"lat": 21.03, "lng": 105.85}


@pytest.mark.asyncio
async def test_goong_client__geocode_runtime_error_returns_none(monkeypatch):
    client = GoongClient(api_key="test-key")

    async def fake_fetch(url: str, params: dict | None = None, headers: dict | None = None):
        raise RuntimeError("HTTP 403 while fetching https://rsapi.goong.io/geocode")

    monkeypatch.setattr(client, "fetch", fake_fetch)

    result = await client.geocode("Hà Nội")

    assert result is None
