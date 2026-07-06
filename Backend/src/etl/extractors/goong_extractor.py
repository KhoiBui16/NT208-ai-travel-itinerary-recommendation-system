"""Goong Maps extractor for Vietnam-focused place data.

The extractor turns Goong Autocomplete + Place Detail responses into raw POI
records consumed by ETL transformers. It keeps OSM-compatible field names
(`lat`, `lng`) so existing transformer/loader code can stay simple.
"""

import logging
from typing import Any

from src.geo.goong_client import GoongClient

logger = logging.getLogger(__name__)

GOONG_CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "food": (
        "nhà hàng {city}",
        "quán ăn {city}",
        "cafe {city}",
    ),
    "attraction": (
        "địa điểm du lịch {city}",
        "bảo tàng {city}",
        "di tích {city}",
    ),
    "nature": (
        "công viên {city}",
        "vườn hoa {city}",
        "khu sinh thái {city}",
    ),
    "entertainment": (
        "khu vui chơi {city}",
        "rạp chiếu phim {city}",
        "nhà hát {city}",
    ),
    "shopping": (
        "chợ {city}",
        "trung tâm thương mại {city}",
        "phố mua sắm {city}",
    ),
}


class GoongExtractor:
    """High-level Goong ETL extractor."""

    def __init__(self, api_key: str, client: GoongClient | None = None) -> None:
        self.client = client or GoongClient(api_key=api_key)

    async def geocode(self, address: str) -> dict[str, float] | None:
        """Geocode an address string to lat/lng coordinates."""
        return await self.client.geocode(address)

    async def autocomplete(
        self, input_text: str, location: str | None = None
    ) -> list[dict[str, Any]]:
        """Search places by name using Goong Autocomplete."""
        return await self.client.autocomplete(input_text, location=location)

    async def place_detail(self, place_id: str) -> dict[str, Any] | None:
        """Get place details by Goong place_id."""
        return await self.client.place_detail(place_id)

    async def extract_pois(self, city: str, max_items: int = 75) -> list[dict[str, Any]]:
        """Extract POIs for a city using Goong Autocomplete + Place Detail.

        Uses inter-request delays to avoid hitting Goong rate limits:
        - 1.5s between keyword searches
        - 0.5s between place detail calls
        These delays are conservative to stay within Goong free tier quota.
        """
        import asyncio as _asyncio

        location = await self._city_bias_location(city)
        pois: list[dict[str, Any]] = []
        seen_place_ids: set[str] = set()

        for category, keywords in GOONG_CATEGORY_KEYWORDS.items():
            for keyword_template in keywords:
                # Delay between keyword searches to avoid rate limiting
                await _asyncio.sleep(1.5)
                predictions = await self.autocomplete(
                    keyword_template.format(city=city), location=location
                )
                for prediction in predictions:
                    place_id = prediction.get("place_id")
                    if not place_id or place_id in seen_place_ids:
                        continue
                    seen_place_ids.add(place_id)

                    # Delay before each place detail call
                    await _asyncio.sleep(0.5)
                    detail = await self.place_detail(str(place_id))
                    raw_poi = self._build_raw_poi(
                        city=city,
                        category=category,
                        place_id=str(place_id),
                        prediction=prediction,
                        detail=detail,
                    )
                    if raw_poi:
                        pois.append(raw_poi)
                    if len(pois) >= max_items:
                        logger.info("Goong reached max_items=%d for %s", max_items, city)
                        return pois

        logger.info("Goong extracted %d POIs for %s", len(pois), city)
        return pois

    async def _city_bias_location(self, city: str) -> str | None:
        """Return Goong location bias as 'lat,lng' for a city."""
        coords = await self.geocode(city)
        if not coords:
            return None
        return f"{coords['lat']},{coords['lng']}"

    def _build_raw_poi(
        self,
        *,
        city: str,
        category: str,
        place_id: str,
        prediction: dict[str, Any],
        detail: dict[str, Any] | None,
    ) -> dict[str, Any] | None:
        """Normalize one Goong prediction/detail pair to a raw POI."""
        source = detail or prediction
        name = source.get("name") or prediction.get("structured_formatting", {}).get("main_text")
        if not name:
            return None

        location = (
            source.get("formatted_address")
            or prediction.get("description")
            or source.get("address")
            or city
        )
        geometry = source.get("geometry", {}) if isinstance(source.get("geometry"), dict) else {}
        point = geometry.get("location", {}) if isinstance(geometry.get("location"), dict) else {}

        return {
            "name": str(name).strip(),
            "category": category,
            "lat": point.get("lat"),
            "lng": point.get("lng"),
            "location": location,
            "description": source.get("description", ""),
            "avg_cost": self._extract_int(source.get("avg_cost")),
            "rating": self._extract_float(source.get("rating")),
            "review_count": self._extract_int(
                source.get("review_count") or source.get("user_ratings_total")
            ),
            "image": self._extract_image(source),
            "opening_hours": self._format_opening_hours(source.get("opening_hours")),
            "external_id": place_id,
            "source": "goong_places",
            "raw_metadata": self._sanitize_metadata(prediction=prediction, detail=detail),
        }

    @staticmethod
    def _format_opening_hours(value: object) -> str | None:
        if not value:
            return None
        if isinstance(value, str):
            return value
        if isinstance(value, dict):
            weekday_text = value.get("weekday_text")
            if isinstance(weekday_text, list):
                return "; ".join(str(item) for item in weekday_text)
        return None

    @staticmethod
    def _extract_int(value: object) -> int:
        if isinstance(value, bool):
            return 0
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            digits = "".join(ch for ch in value if ch.isdigit())
            return int(digits) if digits else 0
        return 0

    @staticmethod
    def _extract_float(value: object) -> float:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value)
        if isinstance(value, str):
            try:
                return float(value)
            except ValueError:
                return 0.0
        return 0.0

    @staticmethod
    def _extract_image(source: dict[str, Any]) -> str:
        for key in ("image", "photo", "thumbnail"):
            value = source.get(key)
            if isinstance(value, str) and value.strip():
                return value.strip()
        return ""

    @staticmethod
    def _sanitize_metadata(
        *,
        prediction: dict[str, Any],
        detail: dict[str, Any] | None,
    ) -> dict[str, Any]:
        """Keep useful raw data without secrets or request params."""
        return {
            "provider": "goong",
            "prediction": prediction,
            "detail": detail,
        }
