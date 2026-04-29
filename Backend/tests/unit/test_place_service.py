"""Unit tests for PlaceService business logic."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.models.place import Destination, Place, SavedPlace
from src.services.place_service import PlaceService


@pytest.fixture()
def mock_repo() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def mock_redis() -> AsyncMock:
    return AsyncMock()


@pytest.fixture()
def service(mock_repo: AsyncMock, mock_redis: AsyncMock) -> PlaceService:
    session = AsyncMock()
    svc = PlaceService(session=session, redis=mock_redis)
    svc.repo = mock_repo
    return svc


def _make_destination(
    dest_id: int = 1, name: str = "Hà Nội", slug: str = "ha-noi"
) -> Destination:
    dest = Destination(id=dest_id, name=name, slug=slug, image="/img/hanoi.jpg")
    dest.is_active = True
    return dest


def _make_place(
    place_id: int = 1,
    name: str = "Hoàn Kiếm",
    category: str = "attraction",
    dest_id: int = 1,
) -> Place:
    dest = _make_destination(dest_id=dest_id)
    place = Place(
        id=place_id,
        name=name,
        category=category,
        image="/img/place.jpg",
        location="Hà Nội",
        rating=4.5,
        destination_id=dest_id,
        description="A beautiful place",
    )
    place.destination = dest
    return place


def _make_saved(saved_id: int = 1, user_id: int = 1, place_id: int = 1) -> SavedPlace:
    from datetime import UTC, datetime

    place = _make_place(place_id=place_id)
    saved = SavedPlace(id=saved_id, user_id=user_id, place_id=place_id)
    saved.place = place
    saved.created_at = datetime(2026, 1, 1, tzinfo=UTC)
    return saved


# --- get_destinations ---


async def test_get_destinations__cache_hit(
    service: PlaceService, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = '[{"id":1,"name":"Hà Nội","image":"/img/hanoi.jpg"}]'
    result = await service.get_destinations()
    assert len(result) == 1
    assert result[0].name == "Hà Nội"


async def test_get_destinations__cache_miss(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = None
    mock_repo.get_destinations.return_value = [_make_destination()]

    result = await service.get_destinations()
    assert len(result) == 1
    mock_redis.setex.assert_called_once()


async def test_get_destinations__redis_down(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.side_effect = ConnectionError("Redis down")
    mock_repo.get_destinations.return_value = [_make_destination()]

    result = await service.get_destinations()
    assert len(result) == 1


# --- get_destination_detail ---


async def test_get_destination_detail__found_by_name(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = None
    dest = _make_destination()
    mock_repo.get_destination_by_name.return_value = dest
    mock_repo.get_by_destination.return_value = [_make_place()]
    mock_repo.get_hotels_by_destination.return_value = []

    result = await service.get_destination_detail("Hà Nội")
    assert result["destination"]["name"] == "Hà Nội"


async def test_get_destination_detail__fallback_to_slug(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = None
    mock_repo.get_destination_by_name.return_value = None
    dest = _make_destination()
    mock_repo.get_destination_by_slug.return_value = dest
    mock_repo.get_by_destination.return_value = []
    mock_repo.get_hotels_by_destination.return_value = []

    result = await service.get_destination_detail("ha-noi")
    assert result["destination"]["name"] == "Hà Nội"


async def test_get_destination_detail__not_found(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = None
    mock_repo.get_destination_by_name.return_value = None
    mock_repo.get_destination_by_slug.return_value = None

    with pytest.raises(NotFoundException):
        await service.get_destination_detail("nonexistent")


# --- search_places ---


async def test_search_places__cache_miss(
    service: PlaceService, mock_repo: AsyncMock, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = None
    mock_repo.search.return_value = [_make_place()]

    result = await service.search_places(query="Hoàn")
    assert len(result) == 1
    assert result[0].name == "Hoàn Kiếm"


async def test_search_places__cache_hit(
    service: PlaceService, mock_redis: AsyncMock
) -> None:
    mock_redis.get.return_value = (
        '[{"id":1,"name":"Hoàn Kiếm","type":"attraction",'
        '"image":"/img/place.jpg","location":"Hà Nội",'
        '"rating":4.5,"city":"Hà Nội","description":"A beautiful place"}]'
    )
    result = await service.search_places(query="Hoàn")
    assert len(result) == 1


# --- get_place_by_id ---


async def test_get_place_by_id__found(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = _make_place()
    result = await service.get_place_by_id(1)
    assert result.name == "Hoàn Kiếm"


async def test_get_place_by_id__not_found(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_by_id.return_value = None
    with pytest.raises(NotFoundException):
        await service.get_place_by_id(999)


# --- save_place ---


async def test_save_place__success(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.saved_exists.return_value = False
    mock_repo.get_by_id.return_value = _make_place()
    saved = _make_saved()
    mock_repo.save_place.return_value = saved
    mock_repo.get_saved_by_id.return_value = saved

    from src.schemas.place import SavedPlaceRequest

    result = await service.save_place(user_id=1, request=SavedPlaceRequest(place_id=1))
    assert result.id == 1


async def test_save_place__already_saved(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.saved_exists.return_value = True

    from src.schemas.place import SavedPlaceRequest

    with pytest.raises(ConflictException):
        await service.save_place(user_id=1, request=SavedPlaceRequest(place_id=1))


async def test_save_place__place_not_found(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.saved_exists.return_value = False
    mock_repo.get_by_id.return_value = None

    from src.schemas.place import SavedPlaceRequest

    with pytest.raises(NotFoundException):
        await service.save_place(user_id=1, request=SavedPlaceRequest(place_id=999))


# --- unsave_place ---


async def test_unsave_place__owner_success(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_saved_by_id.return_value = _make_saved(user_id=1)
    await service.unsave_place(saved_id=1, user_id=1)
    mock_repo.unsave_place.assert_called_once_with(1)


async def test_unsave_place__not_owner__forbidden(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_saved_by_id.return_value = _make_saved(user_id=1)
    with pytest.raises(ForbiddenException):
        await service.unsave_place(saved_id=1, user_id=2)


async def test_unsave_place__not_found(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_saved_by_id.return_value = None
    with pytest.raises(NotFoundException):
        await service.unsave_place(saved_id=999, user_id=1)


# --- list_saved ---


async def test_list_saved(
    service: PlaceService, mock_repo: AsyncMock
) -> None:
    mock_repo.get_saved_by_user.return_value = [_make_saved()]
    result = await service.list_saved(user_id=1)
    assert len(result) == 1
    assert result[0].place.name == "Hoàn Kiếm"
