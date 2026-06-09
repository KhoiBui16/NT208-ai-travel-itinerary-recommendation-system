"""Integration smoke tests for ETL DB loader.

These tests need PostgreSQL with Alembic migrations applied. They are
enabled in CI and can be run locally with `CI=true`.
"""

import os

import pytest
from sqlalchemy import delete, select

from src.core import database
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
        async with database.AsyncSessionLocal() as session:
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
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(Destination).where(Destination.name == city))


@pytest.mark.skipif(not IN_CI, reason="Requires running DB - runs in CI with postgres service")
async def test_etl_loader__conflict_update_refreshes_image_cost_and_opening_hours() -> None:
    city = "Test City ETL Conflict Update"
    base_payload = [
        {
            "destination": city,
            "name": "Conflict Museum",
            "category": "attraction",
            "description": "Before rerun",
            "location": "1 Conflict Street",
            "avg_cost": 0,
            "rating": 4.0,
            "review_count": 10,
            "image": "",
            "opening_hours": None,
            "source": "test",
        }
    ]
    refreshed_payload = [
        {
            "destination": city,
            "name": "Conflict Museum",
            "category": "attraction",
            "description": "After rerun",
            "location": "1 Conflict Street",
            "avg_cost": 125000,
            "rating": 4.6,
            "review_count": 25,
            "image": "https://cdn.test/conflict-museum.jpg",
            "opening_hours": "08:00-18:00",
            "source": "test-refresh",
        }
    ]

    try:
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                assert await upsert_places(session, base_payload) == 1
                assert await upsert_places(session, refreshed_payload) == 1

                dest = (
                    await session.execute(select(Destination).where(Destination.name == city))
                ).scalar_one()
                place = (
                    await session.execute(
                        select(Place).where(
                            Place.destination_id == dest.id,
                            Place.name == "Conflict Museum",
                        )
                    )
                ).scalar_one()

                assert place.avg_cost == 125000
                assert place.image == "https://cdn.test/conflict-museum.jpg"
                assert place.opening_hours == "08:00-18:00"
                assert place.description == "After rerun"
                assert place.source == "test-refresh"
    finally:
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(Destination).where(Destination.name == city))


@pytest.mark.skipif(not IN_CI, reason="Requires running DB - runs in CI with postgres service")
async def test_etl_loader__external_id_update_refreshes_image_cost_and_opening_hours() -> None:
    city = "Test City ETL External ID"
    base_payload = [
        {
            "destination": city,
            "name": "External Museum",
            "category": "attraction",
            "description": "Before external update",
            "location": "2 External Street",
            "avg_cost": 0,
            "rating": 4.0,
            "review_count": 10,
            "image": "",
            "opening_hours": None,
            "external_id": "goong-external-museum",
            "raw_metadata": {"provider": "goong", "version": 1},
            "source": "test",
        }
    ]
    refreshed_payload = [
        {
            "destination": city,
            "name": "External Museum Updated",
            "category": "attraction",
            "description": "After external update",
            "location": "2 External Street",
            "avg_cost": 220000,
            "rating": 4.8,
            "review_count": 30,
            "image": "https://cdn.test/external-museum.jpg",
            "opening_hours": "09:00-21:00",
            "external_id": "goong-external-museum",
            "raw_metadata": {"provider": "goong", "version": 2},
            "source": "test-refresh",
        }
    ]

    try:
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                assert await upsert_places(session, base_payload) == 1
                assert await upsert_places(session, refreshed_payload) == 1

                dest = (
                    await session.execute(select(Destination).where(Destination.name == city))
                ).scalar_one()
                place = (
                    await session.execute(
                        select(Place).where(Place.external_id == "goong-external-museum")
                    )
                ).scalar_one()

                assert place.destination_id == dest.id
                assert place.name == "External Museum Updated"
                assert place.avg_cost == 220000
                assert place.image == "https://cdn.test/external-museum.jpg"
                assert place.opening_hours == "09:00-21:00"
                assert place.raw_metadata == {"provider": "goong", "version": 2}
                assert place.source == "test-refresh"
    finally:
        async with database.AsyncSessionLocal() as session:
            async with session.begin():
                await session.execute(delete(Destination).where(Destination.name == city))
