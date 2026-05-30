"""Mock-only tests for Goong provider error propagation.

Tests verify:
1. GoongClient re-raises ProviderErrorResponse (does not swallow it)
2. Generic RuntimeError still returns None/[] per existing contract
3. GoongClient includes api_key in request params

No real HTTP calls to Goong API.
"""

import pytest

from src.etl.base_extractor import ProviderErrorResponse
from src.geo.goong_client import GoongClient


class TestGoongClientProviderError:
    """Verify GoongClient propagates ProviderErrorResponse correctly."""

    @pytest.mark.asyncio
    async def test_geocode_reraises_provider_error(self):
        """GoongClient.geocode should re-raise ProviderErrorResponse."""
        client = GoongClient(api_key="test-key")

        # Replace the fetch method on this instance
        async def fake_fetch(url, *, params=None, headers=None):
            raise ProviderErrorResponse(
                "Provider error 403",
                status_code=403,
                provider_code="API_KEY_MISSING",
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(ProviderErrorResponse) as exc_info:
            await client.geocode("Hà Nội")

        assert exc_info.value.provider_code == "API_KEY_MISSING"

    @pytest.mark.asyncio
    async def test_autocomplete_reraises_provider_error(self):
        """GoongClient.autocomplete should re-raise ProviderErrorResponse."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise ProviderErrorResponse(
                "Provider error 403",
                status_code=403,
                provider_code="API_KEY_INVALID",
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(ProviderErrorResponse) as exc_info:
            await client.autocomplete("nhà hàng Hà Nội")

        assert exc_info.value.provider_code == "API_KEY_INVALID"

    @pytest.mark.asyncio
    async def test_place_detail_reraises_provider_error(self):
        """GoongClient.place_detail should re-raise ProviderErrorResponse."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise ProviderErrorResponse(
                "Provider error 403",
                status_code=403,
                provider_code="API_KEY_MISSING",
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(ProviderErrorResponse) as exc_info:
            await client.place_detail("goong-123")

        assert exc_info.value.provider_code == "API_KEY_MISSING"

    @pytest.mark.asyncio
    async def test_geocode_returns_none_for_generic_runtime_error(self):
        """Generic RuntimeError should still return None per existing contract."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise RuntimeError("HTTP 500 while fetching")

        client.fetch = fake_fetch  # type: ignore[method-assign]

        result = await client.geocode("Hà Nội")
        assert result is None

    @pytest.mark.asyncio
    async def test_autocomplete_returns_empty_list_for_generic_runtime_error(self):
        """Generic RuntimeError should still return [] per existing contract."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise RuntimeError("HTTP 500 while fetching")

        client.fetch = fake_fetch  # type: ignore[method-assign]

        result = await client.autocomplete("nhà hàng Hà Nội")
        assert result == []

    @pytest.mark.asyncio
    async def test_place_detail_returns_none_for_generic_runtime_error(self):
        """Generic RuntimeError should still return None per existing contract."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise RuntimeError("HTTP 500 while fetching")

        client.fetch = fake_fetch  # type: ignore[method-assign]

        result = await client.place_detail("goong-123")
        assert result is None

    @pytest.mark.asyncio
    async def test_geocode_includes_api_key_param(self):
        """GoongClient.geocode should pass api_key to fetch()."""
        client = GoongClient(api_key="test-key-123")
        captured_params = {}

        async def fake_fetch(url, *, params=None, headers=None):
            captured_params["params"] = params
            return {"results": [{"geometry": {"location": {"lat": 21.03, "lng": 105.85}}}]}

        client.fetch = fake_fetch  # type: ignore[method-assign]

        await client.geocode("Hà Nội")

        assert captured_params["params"] == {"address": "Hà Nội", "api_key": "test-key-123"}

    @pytest.mark.asyncio
    async def test_autocomplete_includes_api_key_param(self):
        """GoongClient.autocomplete should pass api_key to fetch()."""
        client = GoongClient(api_key="test-key-456")
        captured_params = {}

        async def fake_fetch(url, *, params=None, headers=None):
            captured_params["params"] = params
            return {"predictions": [{"place_id": "abc", "description": "Test"}]}

        client.fetch = fake_fetch  # type: ignore[method-assign]

        await client.autocomplete("nhà hàng Hà Nội")

        assert captured_params["params"] == {"input": "nhà hàng Hà Nội", "api_key": "test-key-456"}

    @pytest.mark.asyncio
    async def test_place_detail_includes_api_key_param(self):
        """GoongClient.place_detail should pass api_key to fetch()."""
        client = GoongClient(api_key="test-key-789")
        captured_params = {}

        async def fake_fetch(url, *, params=None, headers=None):
            captured_params["params"] = params
            return {"result": {"name": "Test Place"}}

        client.fetch = fake_fetch  # type: ignore[method-assign]

        await client.place_detail("goong-123")

        assert captured_params["params"] == {"place_id": "goong-123", "api_key": "test-key-789"}
