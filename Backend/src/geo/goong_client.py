"""Goong Maps REST client.

This module is infrastructure-only: it knows Goong endpoints and response
shapes, but it does not decide how travel data is stored or ranked.
"""

import logging
from typing import Any

from src.etl.base_extractor import BaseExtractor, MaxRetriesExceededError, ProviderErrorResponse

logger = logging.getLogger(__name__)

GOONG_BASE_URL = "https://rsapi.goong.io"


class GoongClient(BaseExtractor):
    """Small async client for Goong REST APIs used by backend ETL."""

    def __init__(self, api_key: str, base_url: str = GOONG_BASE_URL, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")

    async def geocode(self, address: str) -> dict[str, float] | None:
        """Convert an address or place name to latitude/longitude."""
        params = {"address": address, "api_key": self.api_key}
        try:
            data = await self.fetch(f"{self.base_url}/geocode", params=params)
        except MaxRetriesExceededError:
            # Re-raise rate limit exhaustion errors so ETL runner can stop.
            raise
        except ProviderErrorResponse:
            # Re-raise provider errors (API_KEY_MISSING, API_KEY_INVALID, etc.)
            # so ETL runner can classify and stop instead of silently failing.
            raise
        except RuntimeError:
            logger.error("Goong geocode failed for address: %s", address)
            return None

        results = data.get("results", [])
        if not results:
            logger.warning("No Goong geocode results for address: %s", address)
            return None

        location = results[0].get("geometry", {}).get("location", {})
        lat = location.get("lat")
        lng = location.get("lng")
        if lat is None or lng is None:
            return None
        return {"lat": float(lat), "lng": float(lng)}

    async def autocomplete(
        self, input_text: str, location: str | None = None
    ) -> list[dict[str, Any]]:
        """Search for place predictions by text.

        Args:
            input_text: Search text such as "nhà hàng Hà Nội".
            location: Optional "lat,lng" string to bias results.
        """
        params: dict[str, str] = {"input": input_text, "api_key": self.api_key}
        if location:
            params["location"] = location

        try:
            data = await self.fetch(f"{self.base_url}/place/autocomplete", params=params)
        except MaxRetriesExceededError:
            # Re-raise rate limit exhaustion errors so ETL runner can stop.
            raise
        except ProviderErrorResponse:
            # Re-raise provider errors so ETL runner can classify.
            raise
        except RuntimeError:
            logger.error("Goong autocomplete failed for input: %s", input_text)
            return []

        predictions = data.get("predictions", [])
        if isinstance(predictions, list):
            return predictions
        return []

    async def place_detail(self, place_id: str) -> dict[str, Any] | None:
        """Return detail for a Goong place id."""
        params = {"place_id": place_id, "api_key": self.api_key}
        try:
            data = await self.fetch(f"{self.base_url}/place/detail", params=params)
        except MaxRetriesExceededError:
            # Re-raise rate limit exhaustion errors so ETL runner can stop.
            raise
        except ProviderErrorResponse:
            # Re-raise provider errors so ETL runner can classify.
            raise
        except RuntimeError:
            logger.error("Goong place detail failed for place_id: %s", place_id)
            return None

        result = data.get("result")
        return result if isinstance(result, dict) else None
