"""Place data transformer for ETL pipeline.

Normalizes, validates, and deduplicates raw POI data from
OSM and Goong extractors before loading into the database.
"""

import logging
import re

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"food", "attraction", "nature", "entertainment", "shopping"}
MIN_NAME_LENGTH = 3
MAX_NAME_LENGTH = 200

# Vietnam coordinate bounds
VN_LAT_MIN = 8.0
VN_LAT_MAX = 23.5
VN_LNG_MIN = 102.0
VN_LNG_MAX = 110.0


def validate_place(place: dict) -> bool:
    """Validate a normalized place record.

    Checks: required fields present, category valid, name length OK,
    coordinates within Vietnam bounds (if provided).

    Args:
        place: Normalized place dict.

    Returns:
        True if valid, False otherwise.
    """
    for field in ("name", "category"):
        if not place.get(field):
            return False

    if place["category"] not in VALID_CATEGORIES:
        return False

    if len(place["name"]) < MIN_NAME_LENGTH or len(place["name"]) > MAX_NAME_LENGTH:
        return False

    lat = place.get("latitude")
    lng = place.get("longitude")
    if lat is not None and lng is not None:
        if not (VN_LAT_MIN <= lat <= VN_LAT_MAX and VN_LNG_MIN <= lng <= VN_LNG_MAX):
            return False

    return True


def normalize_name(name: str) -> str:
    """Normalize a place name: strip, collapse whitespace, title case.

    Args:
        name: Raw place name.

    Returns:
        Cleaned name string.
    """
    name = name.strip()
    name = re.sub(r"\s+", " ", name)
    return name


def transform(raw_pois: list[dict], city: str) -> list[dict]:
    """Transform raw POIs into normalized, validated place records.

    Steps:
        1. Map raw fields to DB schema fields.
        2. Normalize name.
        3. Validate each record.
        4. Deduplicate by (name, city).

    Args:
        raw_pois: List of raw POI dicts from extractors.
        city: Destination city name.

    Returns:
        List of validated, deduplicated place dicts ready for DB load.
    """
    seen: set[str] = set()
    valid: list[dict] = []
    skipped = 0

    for poi in raw_pois:
        name = normalize_name(poi.get("name", ""))
        category = poi.get("category", "")

        record = {
            "name": name,
            "category": category,
            "destination": city,
            "location": poi.get("location", ""),
            "latitude": poi.get("lat"),
            "longitude": poi.get("lng"),
            "avg_cost": 0,
            "rating": poi.get("rating", 0),
            "review_count": poi.get("review_count", 0),
            "description": poi.get("description", ""),
            "image": "",
            "opening_hours": poi.get("opening_hours"),
            "external_id": poi.get("external_id"),
            "raw_metadata": poi.get("raw_metadata"),
            "source": poi.get("source", "etl"),
        }

        if not validate_place(record):
            skipped += 1
            logger.debug("Validation skipped: %s", name)
            continue

        # Deduplicate by lowercase name + city
        dedup_key = f"{name.lower()}|{city.lower()}"
        if dedup_key in seen:
            skipped += 1
            continue
        seen.add(dedup_key)

        valid.append(record)

    logger.info(
        "Transform %s: %d valid, %d skipped",
        city,
        len(valid),
        skipped,
    )
    return valid
