"""Unit tests for ItineraryService business logic."""

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.itineraries.models.extras import Accommodation, GuestClaimToken, ShareLink
from src.itineraries.models.trip import Activity, Trip
from src.itineraries.schemas import ActivitySchema
from src.itineraries.service import MAX_ACTIVE_TRIPS, ItineraryService


@pytest.fixture()
def mock_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def service(mock_repo: AsyncMock) -> ItineraryService:
    session = AsyncMock()
    svc = ItineraryService(session=session)
    svc.repo = mock_repo
    return svc


def _make_trip(
    trip_id: int = 1,
    user_id: int = 1,
    destination: str = "Hà Nội",
    status: str = "draft",
) -> Trip:
    trip = Trip(
        id=trip_id,
        user_id=user_id,
        destination=destination,
        trip_name=f"Trip to {destination}",
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
        budget=5000000,
        total_cost=0,
        adults_count=2,
        children_count=0,
        interests=["food"],
        status=status,
        ai_generated=False,
        created_at=datetime(2026, 5, 1),
        updated_at=datetime(2026, 5, 1),
    )
    trip.days = []
    trip.accommodations = []
    return trip


# --- create_manual ---


async def test_create_manual__auth_user__success(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    trip = _make_trip()
    mock_repo.count_active_by_user.return_value = 0
    mock_repo.create_trip.return_value = trip
    mock_repo.get_with_full_data.return_value = trip

    from src.itineraries.schemas import CreateTripRequest

    req = CreateTripRequest(
        destination="Hà Nội",
        trip_name="Trip to Hà Nội",
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
        budget=5000000,
    )
    result = await service.create_manual(req, user_id=1)
    assert result.destination == "Hà Nội"
    mock_repo.create_trip.assert_called_once()


async def test_create_manual__trip_limit_exceeded(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.count_active_by_user.return_value = MAX_ACTIVE_TRIPS

    from src.itineraries.schemas import CreateTripRequest

    req = CreateTripRequest(
        destination="Hà Nội",
        trip_name="Test",
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
        budget=5000000,
    )
    with pytest.raises(ConflictException):
        await service.create_manual(req, user_id=1)


async def test_create_manual__guest__gets_claim_token(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    trip = _make_trip(user_id=None)
    mock_repo.create_trip.return_value = trip
    mock_repo.get_with_full_data.return_value = trip
    mock_repo.create_claim_token.return_value = MagicMock()

    from src.itineraries.schemas import CreateTripRequest

    req = CreateTripRequest(
        destination="Hà Nội",
        trip_name="Guest Trip",
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
        budget=5000000,
    )
    with patch.object(service, "_issue_claim_token", return_value="claim_abc123"):
        result = await service.create_manual(req, user_id=None)
    assert result.claim_token == "claim_abc123"


async def test_generate__guest__gets_claim_token(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    trip = _make_trip(user_id=None)

    from src.itineraries.schemas import GenerateItineraryRequest

    req = GenerateItineraryRequest(
        destination="Hà Nội",
        start_date=date(2026, 5, 1),
        end_date=date(2026, 5, 3),
        budget=5000000,
        adults=2,
        children=0,
        interests=["food"],
    )

    with (
        patch("src.itineraries.service.ItineraryPipeline.generate", AsyncMock(return_value=trip)),
        patch.object(service, "_issue_claim_token", return_value="claim_abc123"),
    ):
        result = await service.generate(req, user_id=None)

    assert result.claim_token == "claim_abc123"


# --- get_by_id ---


async def test_get_by_id__owner__success(service: ItineraryService, mock_repo: AsyncMock) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    result = await service.get_by_id(1, user_id=1)
    assert result.id == 1


async def test_get_by_id__not_owner__forbidden(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    with pytest.raises(ForbiddenException):
        await service.get_by_id(1, user_id=2)


async def test_get_by_id__not_found(service: ItineraryService, mock_repo: AsyncMock) -> None:
    mock_repo.get_with_full_data.return_value = None
    with pytest.raises(NotFoundException):
        await service.get_by_id(999, user_id=1)


# --- delete ---


async def test_delete__owner__success(service: ItineraryService, mock_repo: AsyncMock) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    await service.delete(1, user_id=1)
    mock_repo.delete_trip.assert_called_once()


async def test_delete__not_owner__forbidden(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    with pytest.raises(ForbiddenException):
        await service.delete(1, user_id=2)


# --- share ---


async def test_share__first_time__returns_token(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    mock_repo.get_share_link.return_value = None
    mock_repo.create_share_link.return_value = MagicMock()

    result = await service.share(1, user_id=1)
    assert result.share_token.startswith("share_")
    assert result.share_url.endswith(result.share_token)


async def test_share__already_shared__redacted(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    mock_repo.get_share_link.return_value = ShareLink(
        id=1,
        trip_id=1,
        token_hash="abc",
        created_by_user_id=1,
        permission="view",
        revoked_at=None,
    )

    result = await service.share(1, user_id=1)
    assert "REDACTED" in result.share_token


# --- claim ---


async def test_claim__valid_token__success(service: ItineraryService, mock_repo: AsyncMock) -> None:
    trip = _make_trip(user_id=None)
    mock_repo.get_by_id.return_value = trip

    claim_token = GuestClaimToken(
        id=1,
        trip_id=1,
        token_hash="hashed",
        expires_at=datetime(2030, 1, 1, tzinfo=UTC),
        consumed_at=None,
    )
    mock_repo.get_claim_tokens_for_trip.return_value = [claim_token]

    from src.itineraries.schemas import ClaimTripRequest

    req = ClaimTripRequest(claim_token="claim_abc123")
    with patch("src.itineraries.service.hash_token", return_value="hashed"):
        result = await service.claim(1, user_id=5, request=req)
    assert result["claimed"] is True


async def test_claim__already_owned__conflict(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)

    from src.itineraries.schemas import ClaimTripRequest

    req = ClaimTripRequest(claim_token="claim_abc123")
    with pytest.raises(ConflictException):
        await service.claim(1, user_id=5, request=req)


# --- rate ---


async def test_rate__owner__success(service: ItineraryService, mock_repo: AsyncMock) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    mock_repo.upsert_rating.return_value = MagicMock()
    await service.rate(1, user_id=1, rating=5, feedback="Great trip")
    mock_repo.upsert_rating.assert_called_once_with(1, 5, "Great trip")


async def test_rate__not_owner__forbidden(service: ItineraryService, mock_repo: AsyncMock) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)
    with pytest.raises(ForbiddenException):
        await service.rate(1, user_id=2, rating=5, feedback=None)


# --- nested subresource authorization ---


def _make_activity(activity_id: int = 11, name: str = "Museum") -> Activity:
    return Activity(
        id=activity_id,
        trip_day_id=21,
        place_id=None,
        name=name,
        time="09:00",
        end_time="10:00",
        type="attraction",
        location="Hà Nội",
        description="Seed activity",
        image="",
        transportation=None,
        adult_price=None,
        child_price=None,
        custom_cost=None,
        bus_ticket_price=None,
        taxi_cost=None,
        order_index=0,
    )


def _make_accommodation(acc_id: int = 7, trip_id: int = 1) -> Accommodation:
    return Accommodation(
        id=acc_id,
        trip_id=trip_id,
        hotel_id=None,
        name="Test Hotel",
        check_in="2026-05-01",
        check_out="2026-05-02",
        price_per_night=500000,
        total_price=500000,
        booking_url=None,
        booking_type="nightly",
        duration=1,
        day_ids=[],
    )


def test_calculate_total_cost__matches_frontend_semantics() -> None:
    service = ItineraryService(session=AsyncMock())
    trip = _make_trip()
    trip.adults_count = 2
    trip.children_count = 1

    food_activity = _make_activity(1, "Breakfast")
    food_activity.type = "food"
    food_activity.adult_price = 50000
    food_activity.child_price = 30000
    food_activity.transportation = "bus"
    food_activity.bus_ticket_price = 7000
    food_activity.extra_expenses = []

    attraction_activity = _make_activity(2, "Museum")
    attraction_activity.type = "attraction"
    attraction_activity.adult_price = None
    attraction_activity.child_price = None
    attraction_activity.custom_cost = 120000
    attraction_activity.transportation = "taxi"
    attraction_activity.taxi_cost = 50000
    attraction_activity.extra_expenses = []

    shopping_activity = _make_activity(3, "Market")
    shopping_activity.type = "shopping"
    shopping_activity.adult_price = 40000
    shopping_activity.child_price = None
    shopping_activity.custom_cost = None
    shopping_activity.transportation = "walk"
    shopping_activity.extra_expenses = []

    day = MagicMock()
    day.activities = [food_activity, attraction_activity, shopping_activity]
    day.extra_expenses = []
    trip.days = [day]
    trip.accommodations = [_make_accommodation()]

    assert service._calculate_total_cost(trip) == 861000


async def test_update_activity__owner_same_trip__success(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    trip = _make_trip(user_id=1)
    activity = _make_activity()
    mock_repo.get_with_full_data.return_value = trip
    mock_repo.get_activity_for_trip.return_value = activity

    async def _update_activity_side_effect(existing: Activity, **kwargs: object) -> Activity:
        for key, value in kwargs.items():
            setattr(existing, key, value)
        return existing

    mock_repo.update_activity.side_effect = _update_activity_side_effect

    result = await service.update_activity(
        1,
        activity.id,
        ActivitySchema(
            id=activity.id,
            name="Updated Museum",
            time="10:15",
            end_time="11:00",
            type="attraction",
            location="Hà Nội",
            description="Updated",
            image="",
        ),
        user_id=1,
    )

    assert result.name == "Updated Museum"
    mock_repo.get_activity_for_trip.assert_called_once_with(activity.id, 1)
    mock_repo.update_activity.assert_called_once()


async def test_update_activity__other_trip_subresource__raises_not_found(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    mock_repo.get_activity_for_trip.return_value = None

    with pytest.raises(NotFoundException):
        await service.update_activity(
            1,
            999,
            ActivitySchema(
                id=999,
                name="PWNED",
                time="09:30",
                type="attraction",
                location="Hà Nội",
                description="Bad update",
                image="",
            ),
            user_id=1,
        )

    mock_repo.update_activity.assert_not_called()


async def test_delete_activity__owner_same_trip__success(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    mock_repo.get_activity_for_trip.return_value = _make_activity()

    await service.delete_activity(1, 11, user_id=1)

    mock_repo.get_activity_for_trip.assert_called_once_with(11, 1)
    mock_repo.delete_activity.assert_called_once()


async def test_delete_activity__other_trip_subresource__raises_not_found(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    mock_repo.get_activity_for_trip.return_value = None

    with pytest.raises(NotFoundException):
        await service.delete_activity(1, 999, user_id=1)

    mock_repo.delete_activity.assert_not_called()


async def test_delete_accommodation__owner_same_trip__success(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    mock_repo.get_accommodation_for_trip.return_value = _make_accommodation()

    await service.delete_accommodation(1, 7, user_id=1)

    mock_repo.get_accommodation_for_trip.assert_called_once_with(7, 1)
    mock_repo.delete_accommodation.assert_called_once()


async def test_delete_accommodation__other_trip_subresource__raises_not_found(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_with_full_data.return_value = _make_trip(user_id=1)
    mock_repo.get_accommodation_for_trip.return_value = None

    with pytest.raises(NotFoundException):
        await service.delete_accommodation(1, 999, user_id=1)

    mock_repo.delete_accommodation.assert_not_called()
