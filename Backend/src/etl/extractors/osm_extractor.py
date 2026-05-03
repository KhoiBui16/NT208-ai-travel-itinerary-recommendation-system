"""OpenStreetMap Overpass API extractor for POI data.

Queries Overpass API for points of interest (restaurants, attractions,
parks, etc.) within a city area. Free, no API key needed.
"""

import logging

from src.etl.base_extractor import BaseExtractor

logger = logging.getLogger(__name__)

OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# OSM tag → our category mapping
OSM_CATEGORY_MAP: dict[str, str] = {
    "restaurant": "food",
    "cafe": "food",
    "fast_food": "food",
    "food_court": "food",
    "attraction": "attraction",
    "museum": "attraction",
    "viewpoint": "attraction",
    "artwork": "attraction",
    "gallery": "attraction",
    "park": "nature",
    "garden": "nature",
    "nature_reserve": "nature",
    "peak": "nature",
    "theatre": "entertainment",
    "cinema": "entertainment",
    "nightclub": "entertainment",
    "marketplace": "shopping",
    "shop": "shopping",
}

# Build Overpass QL filter from OSM tags
_OSM_TAGS_FILTER = "|".join(f'"{k}"' if "=" not in k else k for k in OSM_CATEGORY_MAP)


class OsmExtractor(BaseExtractor):
    """OpenStreetMap Overpass API client for POI extraction."""

    def __init__(self, **kwargs: object) -> None:
        super().__init__(**kwargs)
        # OSM needs longer timeout for large queries
        self.timeout = kwargs.get("timeout", 60.0)

    async def extract_pois(self, city: str) -> list[dict]:
        """Extract POIs for a city from OSM Overpass API.

        Queries for nodes with tourism, amenity, and leisure tags
        within the named city area.

        Args:
            city: City name in Vietnamese (e.g. "Hà Nội").

        Returns:
            List of raw POI dicts with name, category, lat, lng, etc.
        """
        query = self._build_query(city)
        try:
            data = await self.fetch(
                OVERPASS_URL,
                params={"data": query},
                headers={"User-Agent": "DuLichViet-ETL/1.0"},
            )
        except RuntimeError:
            logger.error("OSM Overpass query failed for: %s", city)
            return []

        elements = data.get("elements", [])
        logger.info("OSM returned %d elements for %s", len(elements), city)

        pois: list[dict] = []
        for el in elements:
            tags = el.get("tags", {})
            name = tags.get("name")
            if not name:
                continue

            category = self._map_category(tags)
            if not category:
                continue

            pois.append(
                {
                    "name": name.strip(),
                    "category": category,
                    "lat": el.get("lat"),
                    "lng": el.get("lon"),
                    "location": tags.get("addr:street", tags.get("addr:city", "")),
                    "description": tags.get("description", ""),
                    "opening_hours": tags.get("opening_hours"),
                    "source": "osm_overpass",
                }
            )

        return pois

    def _build_query(self, city: str) -> str:
        """Build Overpass QL query for a city.

        Args:
            city: City name to search within.

        Returns:
            Overpass QL query string.
        """
        return (
            f"[out:json][timeout:60];"
            f'area["name"="{city}"]->.searchArea;'
            f"("
            f'node["tourism"~"attraction|museum|viewpoint|artwork|gallery"](area.searchArea);'
            f'node["amenity"~"restaurant|cafe|fast_food|food_court|theatre|cinema|marketplace"](area.searchArea);'
            f'node["leisure"~"park|garden|nature_reserve"](area.searchArea);'
            f");"
            f"out body;"
        )

    def _map_category(self, tags: dict) -> str | None:
        """Map OSM tags to our 5 valid categories.

        Checks tourism, amenity, and leisure tags in order.

        Args:
            tags: OSM element tags dict.

        Returns:
            Category string or None if no match.
        """
        for tag_key in ("tourism", "amenity", "leisure"):
            value = tags.get(tag_key, "")
            if value in OSM_CATEGORY_MAP:
                return OSM_CATEGORY_MAP[value]
        return None
