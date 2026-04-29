"""Unit tests for ItineraryService business logic."""

from datetime import UTC, date, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.models.extras import GuestClaimToken, ShareLink
from src.models.trip import Trip
from src.services.itinerary_service import MAX_ACTIVE_TRIPS, ItineraryService


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

    from src.schemas.itinerary import CreateTripRequest

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

    from src.schemas.itinerary import CreateTripRequest

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

    from src.schemas.itinerary import CreateTripRequest

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

    from src.schemas.itinerary import ClaimTripRequest

    req = ClaimTripRequest(claim_token="claim_abc123")
    with patch("src.services.itinerary_service.hash_token", return_value="hashed"):
        result = await service.claim(1, user_id=5, request=req)
    assert result["claimed"] is True


async def test_claim__already_owned__conflict(
    service: ItineraryService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_trip(user_id=1)

    from src.schemas.itinerary import ClaimTripRequest

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
