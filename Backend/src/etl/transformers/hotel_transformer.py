"""Hotel data transformer for ETL pipeline.

Transforms manually curated hotel YAML data into normalized
records ready for DB upsert.
"""

import logging

logger = logging.getLogger(__name__)


def transform_hotels(raw_hotels: list[dict], city: str) -> list[dict]:
    """Transform raw hotel YAML entries into DB-ready records.

    Args:
        raw_hotels: List of hotel dicts from YAML loader.
        city: Destination city name for filtering.

    Returns:
        List of normalized hotel dicts.
    """
    valid: list[dict] = []

    for hotel in raw_hotels:
        if hotel.get("city") != city:
            continue

        name = (hotel.get("name") or "").strip()
        if len(name) < 3:
            continue

        amenities = hotel.get("amenities", [])
        amenities_str = ",".join(amenities) if isinstance(amenities, list) else str(amenities)

        valid.append(
            {
                "name": name,
                "destination": city,
                "price_per_night": int(hotel.get("price", 0)),
                "rating": float(hotel.get("rating", 0)),
                "review_count": int(hotel.get("review_count", 0)),
                "location": hotel.get("location", ""),
                "image": hotel.get("image", ""),
                "amenities": amenities_str,
                "description": hotel.get("description", ""),
            }
        )

    logger.info("Transform hotels %s: %d valid", city, len(valid))
    return valid
