"""Goong Maps API extractor for geocoding and place search.

Uses Goong Places API (Vietnam-focused) for:
- AutoComplete: search places by name
- Detail: get place details by place_id
- Geocode: get lat/lng from address string
"""

import logging

from src.etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)

GOONG_BASE_URL = "https://rsapi.goong.io"


class GoongExtractor(BaseExtractor):
    """Goong Maps API client for geocoding and place search."""

    def __init__(self, api_key: str, **kwargs: object) -> None:
        super().__init__(**kwargs)
        self.api_key = api_key

    async def geocode(self, address: str) -> dict | None:
        """Geocode an address string to lat/lng coordinates.

        Args:
            address: Address or place name to geocode.

        Returns:
            Dict with "lat" and "lng" keys, or None if no results.
        """
        params = {"address": address, "api_key": self.api_key}
        try:
            data = await self.fetch(f"{GOONG_BASE_URL}/geocode", params=params)
            results = data.get("results", [])
            if not results:
                logger.warning("No geocode results for: %s", address)
                return None
            loc = results[0]["geometry"]["location"]
            return {"lat": loc["lat"], "lng": loc["lng"]}
        except RuntimeError:
            logger.error("Geocode failed for: %s", address)
            return None

    async def autocomplete(self, input_text: str, location: str | None = None) -> list[dict]:
        """Search places by name using Goong AutoComplete.

        Args:
            input_text: Search query (place name).
            location: Optional bias location (lat,lng format).

        Returns:
            List of place prediction dicts.
        """
        params: dict = {"input": input_text, "api_key": self.api_key}
        if location:
            params["location"] = location

        try:
            data = await self.fetch(f"{GOONG_BASE_URL}/Place/AutoComplete", params=params)
            return data.get("predictions", [])
        except RuntimeError:
            logger.error("AutoComplete failed for: %s", input_text)
            return []

    async def place_detail(self, place_id: str) -> dict | None:
        """Get place details by Goong place_id.

        Args:
            place_id: Goong place identifier.

        Returns:
            Dict with place details, or None if not found.
        """
        params = {"place_id": place_id, "api_key": self.api_key}
        try:
            data = await self.fetch(f"{GOONG_BASE_URL}/Place/Detail", params=params)
            return data.get("result")
        except RuntimeError:
            logger.error("Place detail failed for: %s", place_id)
            return None
