"""ETL runner — CLI entry point to orchestrate the full pipeline.

Usage:
    uv run python -m src.etl                       # All configured cities
    uv run python -m src.etl --cities "Hà Nội"     # Single city
    uv run python -m src.etl --dry-run             # No DB writes
    uv run python -m src.etl --hotels-only         # Load hotels YAML only
"""

import argparse
import asyncio
import logging
import time
from pathlib import Path

import yaml
from redis.asyncio import Redis

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.etl.extractors.goong_extractor import GoongExtractor
from src.etl.extractors.osm_extractor import OsmExtractor
from src.etl.loaders.db_loader import (
    invalidate_cache,
    update_source_tracking,
    upsert_hotels,
    upsert_places,
)
from src.etl.transformers.hotel_transformer import transform_hotels
from src.etl.transformers.place_transformer import transform

logger = logging.getLogger(__name__)

HOTELS_YAML = Path(__file__).parent / "data" / "hotels.yaml"
MIN_GOONG_PLACES_BEFORE_OSM_FALLBACK = 10


async def run_etl(
    cities: list[str] | None = None,
    dry_run: bool = False,
    hotels_only: bool = False,
) -> None:
    """Run full ETL pipeline.

    Args:
        cities: Target cities (None = all).
        dry_run: If True, skip DB writes.
        hotels_only: If True, only load hotels from YAML.
    """
    settings = get_settings()
    target_cities = cities or settings.etl_cities
    start = time.monotonic()

    logger.info("ETL started — cities: %s, dry_run: %s", target_cities, dry_run)

    osm = OsmExtractor()
    goong_key = settings.goong_api_key.get_secret_value()
    goong = GoongExtractor(api_key=goong_key) if goong_key else None

    if not goong:
        logger.warning("No GOONG_API_KEY — skipping geocoding, using OSM coords only")

    redis: Redis | None = None
    if not dry_run:
        try:
            redis = Redis.from_url(settings.redis_url, decode_responses=True)
        except Exception:
            logger.warning("Redis not available — skipping cache invalidation")

    total_places = 0
    total_hotels = 0

    async with AsyncSessionLocal() as session:
        if not hotels_only:
            for city in target_cities:
                try:
                    places = await _extract_places_for_city(
                        city=city,
                        goong=goong,
                        osm=osm,
                        max_places=settings.etl_max_places_per_city,
                    )

                    if not dry_run and places:
                        async with session.begin():
                            count = await upsert_places(session, places)
                            await update_source_tracking(
                                session,
                                source_name="etl_pipeline",
                                city=city,
                                items_count=count,
                                status="success",
                            )
                        total_places += count
                        logger.info("Loaded %d places for %s", count, city)

                except Exception:
                    logger.error("ETL failed for %s", city, exc_info=True)
                    if not dry_run:
                        await _record_failed_source(session, city)

        # Load hotels from YAML
        if HOTELS_YAML.exists():
            raw_hotels = _load_hotels_yaml()
            for city in target_cities:
                hotels = transform_hotels(raw_hotels, city)
                if not dry_run and hotels:
                    async with session.begin():
                        count = await upsert_hotels(session, hotels)
                    total_hotels += count
                    logger.info("Loaded %d hotels for %s", count, city)

    # Invalidate Redis cache after all writes
    if not dry_run and redis:
        await invalidate_cache(redis)
        await redis.aclose()

    elapsed = time.monotonic() - start
    logger.info(
        "ETL completed in %.1fs: %d places, %d hotels",
        elapsed,
        total_places,
        total_hotels,
    )


async def _extract_places_for_city(
    *,
    city: str,
    goong: GoongExtractor | None,
    osm: OsmExtractor,
    max_places: int,
) -> list[dict]:
    """Extract, enrich, and normalize places for one city."""
    raw_pois = []
    if goong:
        try:
            raw_pois = await goong.extract_pois(city, max_items=max_places)
            logger.info("Goong extracted %d POIs for %s", len(raw_pois), city)
        except Exception:
            logger.warning("Goong extraction failed for %s; falling back to OSM", city)

    if not goong or len(raw_pois) < MIN_GOONG_PLACES_BEFORE_OSM_FALLBACK:
        osm_pois = await osm.extract_pois(city)
        logger.info("OSM extracted %d POIs for %s", len(osm_pois), city)
        raw_pois.extend(osm_pois)

    if goong:
        await _geocode_missing_coordinates(goong, raw_pois, city)

    places = transform(raw_pois, city)[:max_places]
    logger.info("Transformed %d valid places for %s", len(places), city)
    return places


async def _geocode_missing_coordinates(
    goong: GoongExtractor,
    raw_pois: list[dict],
    city: str,
) -> None:
    """Fill missing POI coordinates with Goong geocoding when possible."""
    for poi in raw_pois:
        if not poi.get("lat"):
            coords = await goong.geocode(f"{poi['name']} {city}")
            if coords:
                poi["lat"] = coords["lat"]
                poi["lng"] = coords["lng"]


async def _record_failed_source(session, city: str) -> None:
    """Persist ETL failure tracking in a fresh transaction."""
    try:
        async with session.begin():
            await update_source_tracking(
                session,
                source_name="etl_pipeline",
                city=city,
                items_count=0,
                status="failed",
                error_message="See logs",
            )
    except Exception:
        logger.warning("Could not persist ETL failure tracking for %s", city, exc_info=True)


def _load_hotels_yaml() -> list[dict]:
    """Load hotel entries from YAML data file.

    Returns:
        List of hotel dicts.
    """
    if not HOTELS_YAML.exists():
        return []
    data = yaml.safe_load(HOTELS_YAML.read_text(encoding="utf-8")) or {}
    return data.get("hotels", [])


def main() -> None:
    """CLI entry point."""
    parser = argparse.ArgumentParser(description="DuLichViet ETL Pipeline")
    parser.add_argument(
        "--cities",
        nargs="+",
        default=None,
        help="Cities to process (default: configured etl.cities)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Extract and transform only — no DB writes",
    )
    parser.add_argument(
        "--hotels-only",
        action="store_true",
        help="Load hotels from YAML only",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    asyncio.run(
        run_etl(
            cities=args.cities,
            dry_run=args.dry_run,
            hotels_only=args.hotels_only,
        )
    )


if __name__ == "__main__":
    main()
