"""Integration smoke tests for ETL DB loader.

These tests need PostgreSQL with Alembic migrations applied. They are
enabled in CI and can be run locally with `CI=true`.
"""

import os

import pytest
from sqlalchemy import delete, select

from src.core.database import AsyncSessionLocal
from src.etl.loaders.db_loader import upsert_hotels, upsert_places
from src.places.models import Destination, Hotel, Place

IN_CI = os.getenv("CI") == "true"


@pytest.mark.skipif(not IN_CI, reason="Requires running DB - runs in CI with postgres service")
async def test_etl_loader__upsert_places_and_hotels_twice__is_idempotent() -> None:
    """ETL loader should rely on real unique constraints for ON CONFLICT."""
    city = "Test City ETL"
    place_payload = [
        {
            "destination": city,
            "name": "Test Museum",
            "category": "attraction",
            "description": "Museum for ETL smoke test",
            "location": "1 Test Street",
            "rating": 4.5,
            "external_id": "goong-test-museum",
            "raw_metadata": {"provider": "goong"},
            "source": "test",
        }
    ]
    hotel_payload = [
        {
            "destination": city,
            "name": "Test Hotel",
            "price_per_night": 1000000,
            "rating": 4.4,
            "review_count": 10,
            "location": "2 Test Street",
            "image": "/img/hotels/test.jpg",
            "amenities": "wifi,restaurant",
            "description": "Hotel for ETL smoke test",
        }
    ]

    try:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                assert await upsert_places(session, place_payload) == 1
                assert await upsert_places(session, place_payload) == 1
                assert await upsert_hotels(session, hotel_payload) == 1
                assert await upsert_hotels(session, hotel_payload) == 1

                dest = (
                    await session.execute(select(Destination).where(Destination.name == city))
                ).scalar_one()
                place_count = (
                    (await session.execute(select(Place).where(Place.destination_id == dest.id)))
                    .scalars()
                    .all()
                )
                hotel_count = (
                    (await session.execute(select(Hotel).where(Hotel.destination_id == dest.id)))
                    .scalars()
                    .all()
                )

                assert len(place_count) == 1
                assert place_count[0].external_id == "goong-test-museum"
                assert place_count[0].raw_metadata == {"provider": "goong"}
                assert len(hotel_count) == 1
    finally:
        async with AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(Destination).where(Destination.name == city))
