"""Rating seeder for assigning default ratings to places with rating = 0.

This module provides heuristics-based default ratings for places imported from
Goong API (which doesn't provide rating data). The goal is to provide meaningful
quality ranking for place search and AI generate operations.
"""

import logging

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.places.models import Place

logger = logging.getLogger(__name__)

# Default ratings by place category
# These are conservative estimates to provide meaningful ranking
# Admin can override these with manual ratings via admin endpoints
DEFAULT_RATINGS: dict[str, float] = {
    # Attraction-based places get higher ratings (tourist value)
    "attraction": 4.2,
    "nature": 4.0,
    # Commercial places get moderate ratings
    "food": 3.8,
    "shopping": 3.7,
    # Entertainment gets baseline rating
    "entertainment": 3.9,
}


async def seed_default_ratings(
    session: AsyncSession,
    dry_run: bool = False,
) -> int:
    """Assign default ratings to places with rating = 0.

    This function updates places that have rating = 0 with category-based
    default ratings. It also sets rating_source to "seeded" to distinguish
    these from manually rated places.

    Args:
        session: Database session
        dry_run: If True, only count places without updating

    Returns:
        Number of places that would be/were updated
    """
    stmt = select(Place).where(Place.rating == 0)
    result = await session.execute(stmt)
    places = result.scalars().all()

    if dry_run:
        logger.info("Dry run: would update %d places", len(places))
        return len(places)

    updated_count = 0
    for place in places:
        default = DEFAULT_RATINGS.get(place.category, 3.5)
        place.rating = default
        place.rating_source = "seeded"
        place.review_count = 0  # Keep as 0 since no actual reviews
        updated_count += 1

    await session.commit()
    logger.info("Seeded default ratings for %d places", updated_count)
    return updated_count


async def get_rating_statistics(session: AsyncSession) -> dict[str, int]:
    """Get current rating distribution statistics.

    Args:
        session: Database session

    Returns:
        Dictionary with rating distribution counts
    """
    stats = {
        "total_places": 0,
        "zero_rating": 0,
        "positive_rating": 0,
        "seeded_ratings": 0,
        "manual_ratings": 0,
    }

    # Total places
    stmt = select(Place.id)
    result = await session.execute(stmt)
    stats["total_places"] = len(result.all())

    # Zero rating places
    stmt = select(Place.id).where(Place.rating == 0)
    result = await session.execute(stmt)
    stats["zero_rating"] = len(result.all())

    # Positive rating places
    stmt = select(Place.id).where(Place.rating > 0)
    result = await session.execute(stmt)
    stats["positive_rating"] = len(result.all())

    # Seeded ratings
    stmt = select(Place.id).where(Place.rating_source == "seeded")
    result = await session.execute(stmt)
    stats["seeded_ratings"] = len(result.all())

    # Manual ratings
    stmt = select(Place.id).where(Place.rating_source == "manual")
    result = await session.execute(stmt)
    stats["manual_ratings"] = len(result.all())

    return stats


async def reset_seeded_ratings(
    session: AsyncSession,
    confirm: bool = False,
) -> int:
    """Reset all seeded ratings back to 0.

    Use this to re-run rating seeding with updated DEFAULT_RATINGS values.

    Args:
        session: Database session
        confirm: Must be True to actually reset (safety check)

    Returns:
        Number of places reset
    """
    if not confirm:
        logger.warning("reset_seeded_ratings called without confirm=True, no action taken")
        return 0

    stmt = select(Place).where(Place.rating_source == "seeded")
    result = await session.execute(stmt)
    places = result.scalars().all()

    reset_count = 0
    for place in places:
        place.rating = 0
        place.rating_source = None
        reset_count += 1

    await session.commit()
    logger.info("Reset %d seeded ratings", reset_count)
    return reset_count
