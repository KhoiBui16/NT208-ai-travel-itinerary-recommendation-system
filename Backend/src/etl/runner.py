"""ETL runner — CLI entry point to orchestrate the full pipeline.

Usage:
    uv run python -m src.etl.runner                       # All 12 cities
    uv run python -m src.etl.runner --cities "Hà Nội"     # Single city
    uv run python -m src.etl.runner --dry-run              # No DB writes
    uv run python -m src.etl.runner --hotels-only          # Load hotels YAML only
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

VIETNAM_CITIES = [
    "Hà Nội",
    "TP. Hồ Chí Minh",
    "Đà Nẵng",
    "Hội An",
    "Nha Trang",
    "Phú Quốc",
    "Sapa",
    "Hạ Long",
    "Huế",
    "Đà Lạt",
    "Vũng Tàu",
    "Cần Thơ",
    "Quy Nhơn",
]

HOTELS_YAML = Path(__file__).parent / "data" / "hotels.yaml"


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
    target_cities = cities or VIETNAM_CITIES
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
        async with session.begin():
            if not hotels_only:
                for city in target_cities:
                    try:
                        # Extract
                        raw_pois = await osm.extract_pois(city)
                        logger.info("Extracted %d POIs for %s", len(raw_pois), city)

                        # Geocode missing coords
                        if goong:
                            for poi in raw_pois:
                                if not poi.get("lat"):
                                    coords = await goong.geocode(
                                        f"{poi['name']} {city}"
                                    )
                                    if coords:
                                        poi["lat"] = coords["lat"]
                                        poi["lng"] = coords["lng"]

                        # Transform
                        places = transform(raw_pois, city)
                        logger.info("Transformed %d valid places for %s", len(places), city)

                        # Load
                        if not dry_run and places:
                            count = await upsert_places(session, places)
                            total_places += count
                            logger.info("Loaded %d places for %s", count, city)

                            await update_source_tracking(
                                session,
                                source_name="etl_pipeline",
                                city=city,
                                items_count=count,
                                status="success",
                            )

                    except Exception:
                        logger.error("ETL failed for %s", city, exc_info=True)
                        if not dry_run:
                            await update_source_tracking(
                                session,
                                source_name="etl_pipeline",
                                city=city,
                                items_count=0,
                                status="failed",
                                error_message="See logs",
                            )

            # Load hotels from YAML
            if HOTELS_YAML.exists():
                raw_hotels = _load_hotels_yaml()
                for city in target_cities:
                    hotels = transform_hotels(raw_hotels, city)
                    if not dry_run and hotels:
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
        elapsed, total_places, total_hotels,
    )


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
        "--cities", nargs="+", default=None,
        help="Cities to process (default: all 12)",
    )
    parser.add_argument(
        "--dry-run", action="store_true",
        help="Extract and transform only — no DB writes",
    )
    parser.add_argument(
        "--hotels-only", action="store_true",
        help="Load hotels from YAML only",
    )

    args = parser.parse_args()

    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    asyncio.run(run_etl(
        cities=args.cities,
        dry_run=args.dry_run,
        hotels_only=args.hotels_only,
    ))


if __name__ == "__main__":
    main()
