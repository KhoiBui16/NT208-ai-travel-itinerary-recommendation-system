"""Unit tests for SuggestionService (Phase C.2)."""

from datetime import date
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import ForbiddenException, NotFoundException
from src.itineraries.models.trip import Activity, Trip, TripDay
from src.places.models import Destination, Place
from src.places.suggestion_service import SuggestionService


@pytest.fixture()
def mock_trip_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def mock_place_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def service(mock_trip_repo: AsyncMock, mock_place_repo: AsyncMock) -> SuggestionService:
    session = AsyncMock()
    svc = SuggestionService(session=session)
    svc.trip_repo = mock_trip_repo
    svc.place_repo = mock_place_repo
    return svc


def _make_activity(
    activity_id: int = 1,
    user_id: int = 10,
    place_id: int | None = 5,
    activity_type: str = "food",
) -> Activity:
    trip = Trip(
        id=100,
        user_id=user_id,
        destination="Hà Nội",
        trip_name="Test",
        start_date=date(2026, 6, 1),
        end_date=date(2026, 6, 2),
        budget=1_000_000,
    )
    day = TripDay(id=1, trip_id=100, day_number=1, label="Ngày 1", date="2026-06-01")
    day.trip = trip
    activity = Activity(
        id=activity_id,
        trip_day_id=1,
        place_id=place_id,
        name="Phở Bò",
        time="08:00",
        type=activity_type,
        location="Hà Nội",
    )
    activity.trip_day = day
    return activity


def _make_place(place_id: int, category: str = "food") -> Place:
    dest = Destination(id=1, name="Hà Nội", slug="ha-noi", image="")
    place = Place(
        id=place_id,
        destination_id=1,
        name=f"Place {place_id}",
        category=category,
        image="/img.jpg",
        location="Hà Nội",
        rating=4.5,
        review_count=10,
    )
    place.destination = dest
    return place


@pytest.mark.asyncio()
async def test_suggest_returns_alternatives(
    service: SuggestionService, mock_trip_repo: AsyncMock, mock_place_repo: AsyncMock
) -> None:
    mock_trip_repo.get_activity_with_trip.return_value = _make_activity()
    mock_place_repo.get_destination_by_name.return_value = Destination(
        id=1, name="Hà Nội", slug="ha-noi", image=""
    )
    mock_trip_repo.get_place_ids_in_trip.return_value = [5]
    mock_place_repo.find_alternatives.return_value = [_make_place(10), _make_place(11)]

    result = await service.suggest_alternatives(1, user_id=10)

    assert result.activity_id == 1
    assert result.current_name == "Phở Bò"
    assert len(result.suggestions) == 2
    mock_place_repo.find_alternatives.assert_awaited_once_with(
        destination_id=1,
        category="food",
        exclude_ids=[5],
        limit=5,
    )


@pytest.mark.asyncio()
async def test_suggest_empty_when_no_destination(
    service: SuggestionService, mock_trip_repo: AsyncMock, mock_place_repo: AsyncMock
) -> None:
    mock_trip_repo.get_activity_with_trip.return_value = _make_activity()
    mock_place_repo.get_destination_by_name.return_value = None
    mock_place_repo.get_destination_by_slug.return_value = None

    result = await service.suggest_alternatives(1, user_id=10)

    assert result.suggestions == []
    mock_place_repo.find_alternatives.assert_not_awaited()


@pytest.mark.asyncio()
async def test_suggest_not_found_activity(
    service: SuggestionService, mock_trip_repo: AsyncMock
) -> None:
    mock_trip_repo.get_activity_with_trip.return_value = None

    with pytest.raises(NotFoundException):
        await service.suggest_alternatives(999, user_id=10)


@pytest.mark.asyncio()
async def test_suggest_owner_check(service: SuggestionService, mock_trip_repo: AsyncMock) -> None:
    mock_trip_repo.get_activity_with_trip.return_value = _make_activity(user_id=10)

    with pytest.raises(ForbiddenException):
        await service.suggest_alternatives(1, user_id=99)
