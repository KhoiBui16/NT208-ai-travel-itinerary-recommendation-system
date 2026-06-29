"""Place data transformer for ETL pipeline.

Normalizes, validates, and deduplicates raw POI data from
OSM and Goong extractors before loading into the database.
"""

import logging
import re

from src.etl.transformers.city_match import build_city_token_map, detect_contamination

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


def _to_int(value: object) -> int:
    if isinstance(value, bool):
        return 0
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value)
    if isinstance(value, str):
        digits = re.sub(r"[^\d]", "", value)
        return int(digits) if digits else 0
    return 0


def _to_float(value: object) -> float:
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return float(value)
    if isinstance(value, str):
        try:
            return float(value)
        except ValueError:
            return 0.0
    return 0.0


def transform(
    raw_pois: list[dict],
    city: str,
    known_cities: list[str] | None = None,
) -> list[dict]:
    """Transform raw POIs into normalized, validated place records.

    Steps:
        1. Map raw fields to DB schema fields.
        2. Normalize name.
        3. Validate each record.
        4. Reject cross-city contamination (khi ``known_cities`` được truyền).
        5. Deduplicate by (name, city).

    Args:
        raw_pois: List of raw POI dicts from extractors.
        city: Destination city name.
        known_cities: Danh sách các thành phố đã biết để phát hiện place có địa
            chỉ thuộc thành phố khác (city-bias leak từ Goong). ``None`` = tắt
            kiểm contamination (giữ hành vi cũ cho test đơn thuần).

    Returns:
        List of validated, deduplicated place dicts ready for DB load.
    """
    seen: set[str] = set()
    valid: list[dict] = []
    skipped = 0
    # Normalization layer: chính tên các destination làm chuẩn so khớp city.
    token_map = build_city_token_map(known_cities) if known_cities else {}

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
            "avg_cost": _to_int(poi.get("avg_cost")),
            "rating": _to_float(poi.get("rating")),
            "review_count": _to_int(poi.get("review_count")),
            "description": poi.get("description", ""),
            "image": poi.get("image", "") or "",
            "opening_hours": poi.get("opening_hours"),
            "external_id": poi.get("external_id"),
            "raw_metadata": poi.get("raw_metadata"),
            "source": poi.get("source", "etl"),
        }

        if not validate_place(record):
            skipped += 1
            logger.debug("Validation skipped: %s", name)
            continue

        # Cross-city contamination guard: từ chối POI có địa chỉ thuộc thành phố
        # khác (Goong city-bias có thể trả place sai thành phố).
        if token_map:
            conflict = detect_contamination(record.get("location", ""), city, token_map)
            if conflict:
                skipped += 1
                logger.warning(
                    "Contamination skipped: %s target=%s but location mentions %s",
                    name,
                    city,
                    conflict,
                )
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
