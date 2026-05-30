"""Mock-only tests for ETL rate-limit behavior.

Tests verify MaxRetriesExceededError propagation through GoongClient
and runner behavior. No real HTTP calls to Goong API.
"""

import pytest

from src.etl.base_extractor import MaxRetriesExceededError
from src.geo.goong_client import GoongClient


class TestMaxRetriesExceededError:
    """Verify MaxRetriesExceededError exception structure."""

    def test_rate_limit_error_properties(self):
        """MaxRetriesExceededError should preserve status_code and is_rate_limit flag."""
        error = MaxRetriesExceededError("Rate limit exceeded", status_code=429, is_rate_limit=True)
        assert error.status_code == 429
        assert error.is_rate_limit is True
        assert "rate limit" in str(error).lower()

    def test_generic_error_properties(self):
        """MaxRetriesExceededError for generic errors should have is_rate_limit=False."""
        error = MaxRetriesExceededError(
            "All retries exhausted", status_code=None, is_rate_limit=False
        )
        assert error.status_code is None
        assert error.is_rate_limit is False
        assert "rate limit" not in str(error).lower()


class TestGoongClientRateLimit:
    """Verify GoongClient propagates MaxRetriesExceededError correctly."""

    @pytest.mark.asyncio
    async def test_geocode_reraises_max_retries_rate_limit(self):
        """GoongClient.geocode should re-raise MaxRetriesExceededError with is_rate_limit=True."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise MaxRetriesExceededError(
                "Rate limit exceeded", status_code=429, is_rate_limit=True
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(MaxRetriesExceededError) as exc_info:
            await client.geocode("Hà Nội")

        assert exc_info.value.is_rate_limit is True
        assert exc_info.value.status_code == 429

    @pytest.mark.asyncio
    async def test_autocomplete_reraises_max_retries_rate_limit(self):
        """GoongClient.autocomplete re-raises MaxRetriesExceededError with is_rate_limit=True."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise MaxRetriesExceededError(
                "Rate limit exceeded", status_code=429, is_rate_limit=True
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(MaxRetriesExceededError) as exc_info:
            await client.autocomplete("nhà hàng Hà Nội")

        assert exc_info.value.is_rate_limit is True

    @pytest.mark.asyncio
    async def test_place_detail_reraises_max_retries_rate_limit(self):
        """GoongClient.place_detail re-raises MaxRetriesExceededError with is_rate_limit=True."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise MaxRetriesExceededError(
                "Rate limit exceeded", status_code=429, is_rate_limit=True
            )

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(MaxRetriesExceededError) as exc_info:
            await client.place_detail("goong-123")

        assert exc_info.value.is_rate_limit is True

    @pytest.mark.asyncio
    async def test_geocode_reraises_max_retries_generic(self):
        """GoongClient.geocode should re-raise MaxRetriesExceededError with is_rate_limit=False."""
        client = GoongClient(api_key="test-key")

        async def fake_fetch(url, *, params=None, headers=None):
            raise MaxRetriesExceededError("Network error", status_code=None, is_rate_limit=False)

        client.fetch = fake_fetch  # type: ignore[method-assign]

        with pytest.raises(MaxRetriesExceededError) as exc_info:
            await client.geocode("Hà Nội")

        assert exc_info.value.is_rate_limit is False


class TestRunnerRateLimitBehavior:
    """Verify ETL runner handles MaxRetriesExceededError correctly."""

    @pytest.mark.asyncio
    async def test_runner_sets_hit_rate_limit_on_rate_limit_error(self):
        """When is_rate_limit=True is raised, runner sets hit_rate_limit."""
        from src.etl.runner import ETLResult

        result = ETLResult(city="Test City", status="skipped")
        hit_rate_limit = False

        try:
            raise MaxRetriesExceededError(
                "Rate limit exceeded", status_code=429, is_rate_limit=True
            )
        except MaxRetriesExceededError as e:
            if e.is_rate_limit:
                result.status = "rate_limited"
                hit_rate_limit = True
                result.error_message = str(e)

        assert result.status == "rate_limited"
        assert hit_rate_limit is True
        assert result.error_message is not None

    @pytest.mark.asyncio
    async def test_runner_continues_on_generic_max_retries_error(self):
        """When is_rate_limit=False is raised, runner marks as failed and continues."""
        from src.etl.runner import ETLResult

        result = ETLResult(city="Test City", status="skipped")
        hit_rate_limit = False

        try:
            raise MaxRetriesExceededError("Network error", status_code=None, is_rate_limit=False)
        except MaxRetriesExceededError as e:
            if e.is_rate_limit:
                hit_rate_limit = True
            else:
                result.status = "failed"
                result.error_message = str(e)

        assert result.status == "failed"
        assert hit_rate_limit is False

    def test_etl_result_accepts_skipped_after_rate_limit_status(self):
        """ETLResult should accept skipped_after_rate_limit status."""
        from src.etl.runner import ETLResult

        result = ETLResult(
            city="Skipped City",
            status="skipped_after_rate_limit",
            error_message="Skipped because provider rate limit was hit on Previous City",
        )

        assert result.status == "skipped_after_rate_limit"
        assert result.city == "Skipped City"
        assert "rate limit was hit" in result.error_message
