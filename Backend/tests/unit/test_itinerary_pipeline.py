"""Unit tests for C.1 itinerary generation pipeline."""

import json
from datetime import date, datetime
from typing import Any
from unittest.mock import patch

import pytest

from src.core.config import AppSettings
from src.core.exceptions import ServiceUnavailableException, ValidationException
from src.itineraries.models.extras import Accommodation
from src.itineraries.models.trip import Activity, Trip, TripDay
from src.itineraries.pipeline import ItineraryPipeline
from src.itineraries.schemas import GenerateItineraryRequest
from src.places.models import Destination, Hotel, Place


class FakeSession:
    async def flush(self) -> None:
        return None

    def expire_all(self) -> None:
        return None


class FakeLLM:
    def __init__(self, responses: list[dict[str, Any]]) -> None:
        self.responses = responses
        self.calls = 0
        self.prompts: list[str] = []

    async def generate_text(self, prompt: str) -> str:
        self.prompts.append(prompt)
        self.calls += 1
        index = min(self.calls - 1, len(self.responses) - 1)
        return json.dumps(self.responses[index])


class FakeTimeoutLLM:
    def __init__(self) -> None:
        self.calls = 0

    async def generate_text(self, prompt: str) -> str:
        self.calls += 1
        raise ServiceUnavailableException(
            "Dịch vụ AI đang phản hồi quá lâu. Vui lòng thử lại sau hoặc tạo chuyến đi ngắn hơn.",
            error_code="AI_PROVIDER_TIMEOUT",
            retryable=True,
        )


class FakeRepo:
    def __init__(self, *, places: list[Place]) -> None:
        self.destination = Destination(id=1, name="Hà Nội", slug="ha-noi", places_count=len(places))
        self.places = places
        self.hotels = [
            Hotel(
                id=1,
                destination_id=1,
                name="Hotel A",
                price_per_night=500000,
                rating=4.5,
                review_count=100,
                location="Hoàn Kiếm",
                amenities="wifi",
                description="",
                image="",
            )
        ]
        self.trip: Trip | None = None
        self._day_id = 10
        self._activity_id = 20

    async def resolve_destination_for_ai(self, destination: str) -> Destination | None:
        return self.destination if destination == "Hà Nội" else None

    async def search_places_for_ai(
        self,
        destination_id: int,
        categories: list[str] | None = None,
        limit: int = 30,
    ) -> list[Place]:
        if categories:
            return [place for place in self.places if place.category in categories][:limit]
        return self.places[:limit]

    async def get_hotels_for_ai(self, destination_id: int, limit: int = 8) -> list[Hotel]:
        return self.hotels[:limit]

    async def create_trip(self, **kwargs: object) -> Trip:
        self.trip = Trip(
            id=1,
            created_at=datetime(2026, 5, 25),
            updated_at=datetime(2026, 5, 25),
            **kwargs,
        )
        self.trip.days = []
        self.trip.accommodations = []
        return self.trip

    async def add_day(self, **kwargs: object) -> TripDay:
        assert self.trip is not None
        self._day_id += 1
        day = TripDay(id=self._day_id, **kwargs)
        day.activities = []
        day.extra_expenses = []
        self.trip.days.append(day)
        return day

    async def get_or_create_day(
        self, *, trip_id: int, day_number: int, **kwargs: object
    ) -> TripDay:
        """Fake mirror of TripRepository.get_or_create_day.

        The production helper is race-safe via ON CONFLICT DO NOTHING; in this
        in-memory fake there is no concurrency, so we simply return the
        existing day for (trip_id, day_number) if one was already created, or
        create+append a new one. This keeps pipeline persistence tests
        deterministic after the caller switch from add_day.
        """
        assert self.trip is not None
        existing = next(
            (d for d in self.trip.days if d.day_number == day_number),
            None,
        )
        if existing is not None:
            return existing
        return await self.add_day(trip_id=trip_id, day_number=day_number, **kwargs)

    async def add_activity(self, **kwargs: object) -> Activity:
        assert self.trip is not None
        self._activity_id += 1
        activity = Activity(id=self._activity_id, **kwargs)
        activity.extra_expenses = []
        self.trip.days[-1].activities.append(activity)
        return activity

    async def add_accommodation(self, **kwargs: object) -> Accommodation:
        assert self.trip is not None
        acc = Accommodation(id=1, **kwargs)
        self.trip.accommodations.append(acc)
        return acc

    async def get_with_full_data(self, trip_id: int) -> Trip | None:
        return self.trip


def _make_request(
    days: int = 2,
    *,
    budget: int = 5_000_000,
    adults: int = 2,
    children: int = 0,
) -> GenerateItineraryRequest:
    return GenerateItineraryRequest(
        destination="Hà Nội",
        startDate=date(2026, 6, 1),
        endDate=date(2026, 6, days),
        budget=budget,
        adults=adults,
        children=children,
        interests=["food", "culture"],
    )


def _make_places(count: int = 4) -> list[Place]:
    categories = ["food", "attraction", "food", "attraction", "shopping", "nature"]
    return [
        Place(
            id=idx + 1,
            destination_id=1,
            name=f"Place {idx + 1}",
            category=categories[idx],
            description="",
            location="Hà Nội",
            latitude=21.0 + idx,
            longitude=105.0 + idx,
            avg_cost=50000,
            rating=4.5,
            review_count=100,
            image=f"https://cdn.test/place-{idx + 1}.jpg",
            source="goong_places",
        )
        for idx in range(count)
    ]


def _valid_ai_payload() -> dict[str, Any]:
    return {
        "tripName": "AI Hà Nội Trip",
        "totalCost": 1200000,
        "days": [
            {
                "dayNumber": 1,
                "label": "Ngày 1",
                "activities": [
                    {
                        "time": "09:00",
                        "name": "Place 1",
                        "type": "food",
                        "location": "Hà Nội",
                        "placeId": 1,
                        "adultPrice": 50000,
                    },
                    {
                        "time": "14:00",
                        "name": "Unknown place",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 999,
                        "adultPrice": 100000,
                    },
                    {
                        "time": "18:00",
                        "name": "Place 4",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 4,
                        "adultPrice": 80000,
                    },
                    {
                        "time": "20:00",
                        "name": "Place 5",
                        "type": "shopping",
                        "location": "Hà Nội",
                        "placeId": 5,
                        "adultPrice": 30000,
                    },
                    {
                        "time": "21:30",
                        "name": "Place 6",
                        "type": "nature",
                        "location": "Hà Nội",
                        "placeId": 6,
                        "adultPrice": 0,
                    },
                ],
            },
            {
                "dayNumber": 2,
                "label": "Ngày 2",
                "activities": [
                    {
                        "time": "09:00",
                        "name": "Place 2",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 2,
                        "adultPrice": 100000,
                    },
                    {
                        "time": "18:00",
                        "name": "Place 3",
                        "type": "food",
                        "location": "Hà Nội",
                        "placeId": 3,
                        "adultPrice": 50000,
                    },
                    {
                        "time": "20:00",
                        "name": "Place 4",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 4,
                        "adultPrice": 80000,
                    },
                    {
                        "time": "21:00",
                        "name": "Place 5",
                        "type": "shopping",
                        "location": "Hà Nội",
                        "placeId": 5,
                        "adultPrice": 30000,
                    },
                    {
                        "time": "22:00",
                        "name": "Place 6",
                        "type": "nature",
                        "location": "Hà Nội",
                        "placeId": 6,
                        "adultPrice": 0,
                    },
                ],
            },
        ],
        "accommodations": [
            {
                "name": "Hotel A",
                "hotelId": 1,
                "checkIn": "2026-06-01",
                "checkOut": "2026-06-02",
                "pricePerNight": 500000,
                "totalPrice": 500000,
                "bookingType": "nightly",
                "duration": 1,
                "dayIds": [1, 2],
            }
        ],
    }


@pytest.mark.asyncio
async def test_pipeline__not_enough_places__does_not_call_llm() -> None:
    llm = FakeLLM([_valid_ai_payload()])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=[]),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    with pytest.raises(ValidationException):
        await pipeline.generate(_make_request(), user_id=None)

    assert llm.calls == 0


@pytest.mark.asyncio
async def test_pipeline__persists_generated_trip_and_nulls_unknown_place() -> None:
    llm = FakeLLM([_valid_ai_payload()])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places()),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    trip = await pipeline.generate(_make_request(), user_id=7)

    assert trip.user_id == 7
    assert trip.ai_generated is True
    assert len(trip.days) == 2
    assert trip.days[0].activities[0].place_id == 1
    assert trip.days[0].activities[0].image == "https://cdn.test/place-1.jpg"
    assert trip.days[0].activities[1].place_id is None
    assert trip.days[0].activities[1].image == ""
    assert trip.accommodations[0].hotel_id == 1
    assert trip.accommodations[0].day_ids == [11, 12]
    assert "5 to 5 activities" in llm.prompts[0]


@pytest.mark.asyncio
async def test_pipeline__drops_invalid_accommodation_day_ids_and_logs_warning() -> None:
    payload = _valid_ai_payload()
    payload["accommodations"][0]["dayIds"] = [2, 99, 2, 0]

    llm = FakeLLM([payload])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places()),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    with patch("src.itineraries.pipeline.logger.warning") as warning_mock:
        trip = await pipeline.generate(_make_request(), user_id=None)

    assert trip.accommodations[0].day_ids == [12]
    warning_mock.assert_called_once()
    _, kwargs = warning_mock.call_args
    assert kwargs["trip_id"] == 1
    assert kwargs["accommodation_name"] == "Hotel A"
    assert kwargs["raw_day_ids"] == [2, 99, 2, 0]
    assert kwargs["invalid_day_ids"] == [99, 0]


@pytest.mark.asyncio
async def test_pipeline__falls_back_to_exact_name_location_for_activity_image() -> None:
    payload = _valid_ai_payload()
    payload["days"][0]["activities"][1]["name"] = "Place 2"
    payload["days"][0]["activities"][1]["location"] = "Hà Nội"

    llm = FakeLLM([payload])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places()),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    trip = await pipeline.generate(_make_request(), user_id=None)

    assert trip.days[0].activities[1].place_id is None
    assert trip.days[0].activities[1].image == "https://cdn.test/place-2.jpg"


@pytest.mark.asyncio
async def test_pipeline__retries_invalid_output_then_accepts_valid() -> None:
    invalid = {**_valid_ai_payload(), "days": [_valid_ai_payload()["days"][0]]}
    llm = FakeLLM([invalid, _valid_ai_payload()])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places()),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    trip = await pipeline.generate(_make_request(), user_id=None)

    assert trip.trip_name == "AI Hà Nội Trip"
    assert llm.calls == 2


@pytest.mark.asyncio
async def test_pipeline__recomputes_total_and_backfills_missing_costs() -> None:
    payload = _valid_ai_payload()
    payload["totalCost"] = 1
    first_activity = payload["days"][0]["activities"][0]
    first_activity["adultPrice"] = None
    first_activity["childPrice"] = None
    first_activity["transportation"] = "taxi"
    first_activity["taxiCost"] = None

    llm = FakeLLM([payload])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places()),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    trip = await pipeline.generate(_make_request(), user_id=None)

    normalized = trip.days[0].activities[0]
    assert normalized.adult_price == 50000
    assert normalized.child_price == 30000
    assert normalized.taxi_cost == 50000
    assert trip.total_cost > 1


def _sparse_cost_payload() -> dict[str, Any]:
    return {
        "tripName": "Budget Soft Gate Trip",
        "totalCost": 450000,
        "days": [
            {
                "dayNumber": 1,
                "label": "Ngày 1",
                "activities": [
                    {
                        "time": "08:00",
                        "name": "Place 1",
                        "type": "food",
                        "location": "Hà Nội",
                        "placeId": 1,
                    },
                    {
                        "time": "10:00",
                        "name": "Place 2",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 2,
                    },
                    {
                        "time": "12:00",
                        "name": "Place 3",
                        "type": "food",
                        "location": "Hà Nội",
                        "placeId": 3,
                    },
                    {
                        "time": "15:00",
                        "name": "Place 4",
                        "type": "attraction",
                        "location": "Hà Nội",
                        "placeId": 4,
                    },
                    {
                        "time": "18:00",
                        "name": "Place 5",
                        "type": "nature",
                        "location": "Hà Nội",
                        "placeId": 5,
                    },
                ],
            }
        ],
        "accommodations": [],
    }


@pytest.mark.asyncio
async def test_pipeline__accepts_budget_soft_overshoot_when_costs_are_inferred() -> None:
    llm = FakeLLM([_sparse_cost_payload()])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places(count=6)),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    trip = await pipeline.generate(
        _make_request(days=1, budget=400_000, adults=2, children=1),
        user_id=None,
    )

    assert trip.total_cost > int(400_000 * 1.2)
    assert trip.days[0].activities[0].adult_price == 50_000
    assert trip.days[0].activities[0].child_price == 30_000


@pytest.mark.asyncio
async def test_pipeline__still_rejects_explicit_over_budget_itinerary() -> None:
    payload = _sparse_cost_payload()
    payload["totalCost"] = 700000
    for activity in payload["days"][0]["activities"][:4]:
        activity["adultPrice"] = 120000
        activity["childPrice"] = 60000

    llm = FakeLLM([payload])
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=FakeRepo(places=_make_places(count=6)),  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    with pytest.raises(ValidationException, match="failed validation"):
        await pipeline.generate(
            _make_request(days=1, budget=400_000, adults=2, children=1),
            user_id=None,
        )


@pytest.mark.asyncio
async def test_pipeline__ai_timeout__raises_retryable_timeout_without_persisting() -> None:
    llm = FakeTimeoutLLM()
    repo = FakeRepo(places=_make_places())
    pipeline = ItineraryPipeline(
        session=FakeSession(),  # type: ignore[arg-type]
        repo=repo,  # type: ignore[arg-type]
        llm=llm,  # type: ignore[arg-type]
        settings=AppSettings(_env_file=None),
        retry_delay_seconds=0,
    )

    with pytest.raises(ServiceUnavailableException) as exc_info:
        await pipeline.generate(_make_request(), user_id=None)

    assert llm.calls == 1
    assert repo.trip is None
    assert exc_info.value.error_code == "AI_PROVIDER_TIMEOUT"
    assert exc_info.value.retryable is True
