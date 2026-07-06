"""Unit tests for ChatSession service methods."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from src.core.exceptions import ForbiddenException, NotFoundException
from src.itineraries.schemas import ChatSessionListResponse, ChatSessionResponse


@pytest.fixture
def mock_repo():
    repo = AsyncMock()
    return repo


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def service(mock_session, mock_repo):
    from src.itineraries.service import ItineraryService

    with patch.object(ItineraryService, "__init__", lambda self, session=None: None):
        svc = ItineraryService()
        svc.session = mock_session
        svc.repo = mock_repo
        svc.cache = AsyncMock()
        svc.settings = MagicMock()
        return svc


@pytest.fixture
def mock_trip():
    """Mock trip object."""
    trip = AsyncMock()
    trip.id = 1
    trip.user_id = 100
    trip.days = []
    trip.accommodations = []
    return trip


@pytest.fixture
def mock_chat_session():
    """Mock chat session object."""
    session = AsyncMock()
    session.id = 1
    session.trip_id = 1
    session.user_id = 100
    session.thread_id = "trip-1-abc123def456"
    session.status = "active"
    session.title = None
    session.created_at = datetime.now(UTC)
    session.updated_at = datetime.now(UTC)
    return session


# ===================================================================
# create_chat_session
# ===================================================================


@pytest.mark.asyncio
async def test_create_chat_session_success(service, mock_repo, mock_trip):
    """Test successful chat session creation."""
    # Mock _verify_owner to return a trip
    with patch.object(service, "_verify_owner", return_value=mock_trip):
        # Mock repository method
        mock_repo.create_chat_session.return_value = AsyncMock(
            id=1,
            trip_id=1,
            user_id=100,
            thread_id="trip-1-abc123def456",
            status="active",
            title=None,
            created_at=datetime.now(UTC),
            updated_at=datetime.now(UTC),
        )

        result = await service.create_chat_session(1, 100)

        # Verify repository was called
        mock_repo.create_chat_session.assert_called_once()
        call_args = mock_repo.create_chat_session.call_args
        assert call_args.kwargs["trip_id"] == 1
        assert call_args.kwargs["user_id"] == 100
        assert call_args.kwargs["status"] == "active"
        assert "thread_id" in call_args.kwargs
        assert call_args.kwargs["thread_id"].startswith("trip-1-")

        # Verify response type
        assert isinstance(result, ChatSessionResponse)
        assert result.trip_id == 1
        assert result.user_id == 100


@pytest.mark.asyncio
async def test_create_chat_session_not_owner(service, mock_repo):
    """Test create_chat_session raises ForbiddenException when user is not owner."""
    # Mock _verify_owner to raise ForbiddenException
    with patch.object(service, "_verify_owner", side_effect=ForbiddenException("Not trip owner")):
        with pytest.raises(ForbiddenException, match="Not trip owner"):
            await service.create_chat_session(1, 999)

        # Verify repository was NOT called
        mock_repo.create_chat_session.assert_not_called()


@pytest.mark.asyncio
async def test_create_chat_session_trip_not_found(service, mock_repo):
    """Test create_chat_session raises NotFoundException when trip not found."""
    # Mock _verify_owner to raise NotFoundException
    with patch.object(service, "_verify_owner", side_effect=NotFoundException("Trip not found")):
        with pytest.raises(NotFoundException, match="Trip not found"):
            await service.create_chat_session(999, 100)

        # Verify repository was NOT called
        mock_repo.create_chat_session.assert_not_called()


# ===================================================================
# list_chat_sessions
# ===================================================================


@pytest.mark.asyncio
async def test_list_chat_sessions_success(service, mock_repo, mock_chat_session, mock_trip):
    """Test successful listing of chat sessions."""
    sessions = [mock_chat_session]
    mock_repo.list_sessions_by_trip.return_value = (sessions, 1)

    # Mock _verify_owner to succeed
    with patch.object(service, "_verify_owner", return_value=mock_trip):
        result = await service.list_chat_sessions(1, 100, skip=0, limit=20)

        # Verify repository was called
        mock_repo.list_sessions_by_trip.assert_called_once_with(1, skip=0, limit=20)

        # Verify response type
        assert isinstance(result, ChatSessionListResponse)
        assert result.total == 1
        assert len(result.items) == 1
        assert isinstance(result.items[0], ChatSessionResponse)
        assert result.items[0].trip_id == 1


@pytest.mark.asyncio
async def test_list_chat_sessions_not_owner(service, mock_repo):
    """Test list_chat_sessions raises ForbiddenException when user is not owner."""
    # Mock _verify_owner to raise ForbiddenException
    with patch.object(service, "_verify_owner", side_effect=ForbiddenException("Not trip owner")):
        with pytest.raises(ForbiddenException, match="Not trip owner"):
            await service.list_chat_sessions(1, 999)

        # Verify repository was NOT called
        mock_repo.list_sessions_by_trip.assert_not_called()


@pytest.mark.asyncio
async def test_list_chat_sessions_empty(service, mock_repo, mock_trip):
    """Test list_chat_sessions returns empty list when no sessions exist."""
    mock_repo.list_sessions_by_trip.return_value = ([], 0)

    # Mock _verify_owner to succeed
    with patch.object(service, "_verify_owner", return_value=mock_trip):
        result = await service.list_chat_sessions(1, 100)

        assert isinstance(result, ChatSessionListResponse)
        assert result.total == 0
        assert len(result.items) == 0


# ===================================================================
# get_chat_session
# ===================================================================


@pytest.mark.asyncio
async def test_get_chat_session_success(service, mock_repo, mock_chat_session):
    """Test successful retrieval of a chat session."""
    # Mock repository to return session
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session
    # Mock _verify_owner to succeed
    with patch.object(service, "_verify_owner", return_value=AsyncMock(id=1, user_id=100)):
        result = await service.get_chat_session(1, 100)

        # Verify repository was called
        mock_repo.get_chat_session_by_id.assert_called_once_with(1)

        # Verify response type
        assert isinstance(result, ChatSessionResponse)
        assert result.id == 1
        assert result.trip_id == 1


@pytest.mark.asyncio
async def test_get_chat_session_not_found(service, mock_repo):
    """Test get_chat_session raises NotFoundException when session not found."""
    mock_repo.get_chat_session_by_id.return_value = None

    with pytest.raises(NotFoundException, match="Chat session not found"):
        await service.get_chat_session(999, 100)

    # Verify repository was called
    mock_repo.get_chat_session_by_id.assert_called_once_with(999)


@pytest.mark.asyncio
async def test_get_chat_session_not_owner(service, mock_repo, mock_chat_session):
    """Test get_chat_session raises ForbiddenException when user is not owner."""
    # Mock repository to return session
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session

    # Mock _verify_owner to raise ForbiddenException
    with patch.object(service, "_verify_owner", side_effect=ForbiddenException("Not trip owner")):
        with pytest.raises(ForbiddenException, match="Not trip owner"):
            await service.get_chat_session(1, 999)


# ===================================================================
# rename_chat_session
# ===================================================================


@pytest.mark.asyncio
async def test_rename_chat_session_success(service, mock_repo, mock_chat_session):
    """rename_chat_session cập nhật title khi user là owner."""
    mock_chat_session.title = "Old"
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session
    mock_repo.update_chat_session_title.return_value = mock_chat_session

    with patch.object(service, "_verify_owner", return_value=AsyncMock(id=1, user_id=100)):
        result = await service.rename_chat_session(1, 100, "New Title")

    mock_repo.update_chat_session_title.assert_called_once_with(mock_chat_session, "New Title")
    assert isinstance(result, ChatSessionResponse)


@pytest.mark.asyncio
async def test_rename_chat_session_not_found(service, mock_repo):
    mock_repo.get_chat_session_by_id.return_value = None
    with pytest.raises(NotFoundException, match="Chat session not found"):
        await service.rename_chat_session(999, 100, "X")
    mock_repo.update_chat_session_title.assert_not_called()


@pytest.mark.asyncio
async def test_rename_chat_session_not_owner(service, mock_repo, mock_chat_session):
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session
    with patch.object(service, "_verify_owner", side_effect=ForbiddenException("Not trip owner")):
        with pytest.raises(ForbiddenException):
            await service.rename_chat_session(1, 999, "X")
    mock_repo.update_chat_session_title.assert_not_called()


# ===================================================================
# delete_chat_session
# ===================================================================


@pytest.mark.asyncio
async def test_delete_chat_session_success(service, mock_repo, mock_chat_session):
    """delete_chat_session xoá session khi user là owner."""
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session
    with patch.object(service, "_verify_owner", return_value=AsyncMock(id=1, user_id=100)):
        await service.delete_chat_session(1, 100)
    mock_repo.delete_chat_session.assert_called_once_with(mock_chat_session)


@pytest.mark.asyncio
async def test_delete_chat_session_not_found(service, mock_repo):
    mock_repo.get_chat_session_by_id.return_value = None
    with pytest.raises(NotFoundException, match="Chat session not found"):
        await service.delete_chat_session(999, 100)
    mock_repo.delete_chat_session.assert_not_called()


@pytest.mark.asyncio
async def test_delete_chat_session_not_owner(service, mock_repo, mock_chat_session):
    mock_repo.get_chat_session_by_id.return_value = mock_chat_session
    with patch.object(service, "_verify_owner", side_effect=ForbiddenException("Not trip owner")):
        with pytest.raises(ForbiddenException):
            await service.delete_chat_session(1, 999)
    mock_repo.delete_chat_session.assert_not_called()


# ===================================================================
# _to_chat_session_response
# ===================================================================


def test_to_chat_session_response(service, mock_chat_session):
    """Test ORM to schema conversion helper."""
    result = service._to_chat_session_response(mock_chat_session)

    assert isinstance(result, ChatSessionResponse)
    assert result.id == 1
    assert result.trip_id == 1
    assert result.user_id == 100
    assert result.thread_id == "trip-1-abc123def456"
    assert result.status == "active"
    assert isinstance(result.created_at, datetime)
    assert isinstance(result.updated_at, datetime)
