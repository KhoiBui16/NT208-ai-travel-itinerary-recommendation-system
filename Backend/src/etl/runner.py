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
from dataclasses import dataclass
from pathlib import Path
from typing import Literal

import yaml
from redis.asyncio import Redis

from src.core.config import get_settings
from src.core.database import AsyncSessionLocal
from src.etl.base_extractor import MaxRetriesExceededError, ProviderErrorResponse
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


@dataclass
class ETLResult:
    """ETL run result for a single city."""

    city: str
    status: Literal[
        "success", "failed", "rate_limited", "config_error", "skipped", "skipped_after_rate_limit"
    ]
    places_count: int = 0
    hotels_count: int = 0
    raw_pois: int = 0
    valid_places: int = 0
    skipped: int = 0
    source: str = "unknown"
    duration_seconds: float = 0.0
    error_message: str | None = None
    db_written: bool = False
    last_etl_at_updated: bool = False


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

    # Track results and rate limit status
    results: list[ETLResult] = []
    hit_rate_limit = False

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
            for idx, city in enumerate(target_cities):
                city_start = time.monotonic()
                result = ETLResult(city=city, status="skipped")

                # Add inter-city delay to avoid Goong API rate limiting.
                # Skip delay for the first city; use 10s between cities to allow
                # Goong quota to recover between city crawls.
                if idx > 0:
                    inter_city_delay = 10.0
                    logger.info(
                        "Inter-city delay %.1fs before %s (%d/%d)",
                        inter_city_delay,
                        city,
                        idx + 1,
                        len(target_cities),
                    )
                    await asyncio.sleep(inter_city_delay)

                try:
                    places = await _extract_places_for_city(
                        city=city,
                        goong=goong,
                        osm=osm,
                        max_places=settings.etl_max_places_per_city,
                        known_cities=target_cities,
                    )

                    result.raw_pois = len(places) if places else 0
                    result.valid_places = len(places) if places else 0
                    result.source = "goong" if goong else "osm"

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
                        result.places_count = count
                        result.db_written = True
                        result.last_etl_at_updated = True
                        logger.info("Loaded %d places for %s", count, city)
                    elif dry_run and places:
                        result.places_count = len(places)
                        logger.info("Dry-run: %d places would be loaded for %s", len(places), city)

                    result.status = "success"

                except ProviderErrorResponse as e:
                    # Provider returned structured error with code
                    result.status = "failed"
                    result.error_message = f"{e.provider_code}: {e}"
                    logger.error(
                        "Provider error for %s: code=%s, status=%d, message=%s",
                        city,
                        e.provider_code,
                        e.status_code,
                        e,
                    )

                    # Config errors (API_KEY_MISSING, API_KEY_INVALID) — stop entire run
                    if e.provider_code and e.provider_code in (
                        "API_KEY_MISSING",
                        "API_KEY_INVALID",
                    ):
                        result.status = "config_error"
                        logger.error(
                            "Config error for %s: %s — stopping ETL (check GOONG_API_KEY in .env)",
                            city,
                            e.provider_code,
                        )
                        if not dry_run:
                            await _record_failed_source(session, city, "config_error")
                        results.append(result)
                        break

                    # Rate limit errors — stop entire run
                    if e.provider_code and "rate" in e.provider_code.lower():
                        result.status = "rate_limited"
                        hit_rate_limit = True
                        logger.error(
                            "Rate limit hit for %s — stopping ETL",
                            city,
                        )
                        if not dry_run:
                            await _record_failed_source(session, city, "rate_limited")
                        results.append(result)
                        break

                    # Other provider errors — record but continue to next city
                    if not dry_run:
                        await _record_failed_source(session, city, e.provider_code or "failed")

                except MaxRetriesExceededError as e:
                    # All retries exhausted - check if this was rate limit or generic error
                    if e.is_rate_limit:
                        result.status = "rate_limited"
                        hit_rate_limit = True
                        result.error_message = str(e)
                        logger.error(
                            "Rate limit retries exhausted for %s — stopping ETL",
                            city,
                        )
                        if not dry_run:
                            await _record_failed_source(session, city, "rate_limited")
                        results.append(result)
                        break
                    else:
                        # Generic retries exhausted (network, timeout, 5xx, etc.)
                        result.status = "failed"
                        result.error_message = str(e)
                        logger.error("Retries exhausted for %s: %s", city, e)
                        if not dry_run:
                            await _record_failed_source(session, city, "failed")

                except RuntimeError as e:
                    # Generic RuntimeError (no provider code available)
                    result.status = "failed"
                    result.error_message = str(e)

                    # Legacy check: string matching for "rate limit" or "429"
                    if "rate limit" in str(e).lower() or "429" in str(e):
                        result.status = "rate_limited"
                        hit_rate_limit = True
                        logger.error(
                            "Rate limit detected for %s (via string match) — stopping ETL",
                            city,
                        )
                        if not dry_run:
                            await _record_failed_source(session, city, "rate_limited")
                        results.append(result)
                        break

                    logger.error("ETL failed for %s: %s", city, e, exc_info=True)
                    if not dry_run:
                        await _record_failed_source(session, city)

                except Exception as e:
                    result.status = "failed"
                    result.error_message = str(e)
                    logger.error("ETL failed for %s", city, exc_info=True)
                    if not dry_run:
                        await _record_failed_source(session, city)

                result.duration_seconds = time.monotonic() - city_start
                results.append(result)

                # Stop if we hit rate limit
                if hit_rate_limit:
                    remaining_cities = len(target_cities) - idx - 1
                    if remaining_cities > 0:
                        logger.warning(
                            "Rate limit hit — %d cities remaining skipped to save quota",
                            remaining_cities,
                        )
                        # Append remaining cities with skipped_after_rate_limit status
                        rate_limited_city = city
                        for remaining_city in target_cities[idx + 1 :]:
                            results.append(
                                ETLResult(
                                    city=remaining_city,
                                    status="skipped_after_rate_limit",
                                    error_message=(
                                        f"Skipped because provider rate limit was hit on "
                                        f"{rate_limited_city}"
                                    ),
                                )
                            )
                    break

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

    # Log ETL summary
    logger.info("=" * 80)
    logger.info("ETL SUMMARY — dry_run: %s", dry_run)
    logger.info("=" * 80)
    for r in results:
        logger.info(
            "%s | status=%s | places=%d | hotels=%d | source=%s | duration=%.1fs%s",
            r.city,
            r.status,
            r.places_count,
            r.hotels_count,
            r.source,
            r.duration_seconds,
            f" | error: {r.error_message}" if r.error_message else "",
        )
    logger.info("=" * 80)
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
    known_cities: list[str] | None = None,
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

    places = transform(raw_pois, city, known_cities=known_cities)[:max_places]
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


async def _record_failed_source(session, city: str, status: str = "failed") -> None:
    """Persist ETL failure tracking in a fresh transaction."""
    try:
        async with session.begin():
            await update_source_tracking(
                session,
                source_name="etl_pipeline",
                city=city,
                items_count=0,
                status=status,
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
