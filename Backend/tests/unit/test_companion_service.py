"""Unit tests cho CompanionService ở phase C3B."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import ForbiddenException, NotFoundException
from src.itineraries.companion_service import CompanionReplyPayload, CompanionService
from src.itineraries.schemas import (
    ChatMessageListResponse,
    ChatMessageRequest,
    SendChatMessageResponse,
)


class FakeProvider:
    """Fake provider để test service mà không gọi Gemini thật."""

    def __init__(self) -> None:
        self.calls: list[dict[str, object]] = []

    async def generate_reply(self, **kwargs: object) -> CompanionReplyPayload:
        self.calls.append(kwargs)
        return CompanionReplyPayload(
            message="Mình đề xuất thêm Văn Miếu vào ngày 2.",
            requires_confirmation=True,
            proposed_operations=[
                {
                    "type": "add_activity",
                    "description": "Thêm Văn Miếu vào ngày 2",
                    "target": {"dayId": 2},
                }
            ],
        )


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def mock_repo():
    return AsyncMock()


@pytest.fixture
def fake_provider():
    return FakeProvider()


@pytest.fixture
def service(mock_session, mock_repo, fake_provider):
    svc = CompanionService(session=mock_session, provider=fake_provider)
    svc.repo = mock_repo
    return svc


@pytest.fixture
def owned_session():
    return SimpleNamespace(
        id=11,
        trip_id=21,
        user_id=100,
        thread_id="trip-21-thread",
        status="active",
        created_at=datetime.now(UTC),
        updated_at=datetime.now(UTC),
    )


@pytest.fixture
def owned_trip():
    day = SimpleNamespace(
        id=2,
        day_number=2,
        label="Ngày 2",
        date="2026-07-02",
        destination_name="Hà Nội",
        activities=[],
    )
    return SimpleNamespace(
        id=21,
        user_id=100,
        destination="Hà Nội",
        trip_name="Hanoi Trip",
        start_date="2026-07-01",
        end_date="2026-07-03",
        budget=5000000,
        total_cost=2500000,
        adults_count=2,
        children_count=0,
        interests=["food"],
        accommodations=[],
        days=[day],
    )


@pytest.fixture
def user_message_row():
    return SimpleNamespace(
        id=101,
        session_id=11,
        role="user",
        content="Thêm giúp mình một điểm tham quan lịch sử",
        proposed_operations=[],
        requires_confirmation=False,
        created_at=datetime.now(UTC),
    )


@pytest.fixture
def assistant_message_row():
    return SimpleNamespace(
        id=102,
        session_id=11,
        role="assistant",
        content="Mình đề xuất thêm Văn Miếu vào ngày 2.",
        proposed_operations=[{"type": "add_activity", "target": {"dayId": 2}}],
        requires_confirmation=True,
        created_at=datetime.now(UTC),
    )


@pytest.mark.asyncio
async def test_send_message_success(
    service,
    mock_repo,
    fake_provider,
    owned_session,
    owned_trip,
    user_message_row,
    assistant_message_row,
):
    """Service phải persist đủ 2 message và trả structured payload."""
    mock_repo.get_chat_session_by_id.return_value = owned_session
    mock_repo.get_with_full_data.return_value = owned_trip
    mock_repo.list_messages_by_session.return_value = ([], 0)
    mock_repo.create_chat_message.side_effect = [user_message_row, assistant_message_row]

    result = await service.send_message(
        session_id=11,
        user_id=100,
        request=ChatMessageRequest(content="Thêm giúp mình một điểm tham quan lịch sử"),
    )

    assert isinstance(result, SendChatMessageResponse)
    assert result.session_id == 11
    assert result.message == "Mình đề xuất thêm Văn Miếu vào ngày 2."
    assert result.requires_confirmation is True
    assert result.user_message.role == "user"
    assert result.assistant_message.role == "assistant"
    assert len(result.proposed_operations) == 1

    assert len(fake_provider.calls) == 1
    assert fake_provider.calls[0]["user_message"] == "Thêm giúp mình một điểm tham quan lịch sử"
    assert mock_repo.touch_chat_session.await_count == 1


@pytest.mark.asyncio
async def test_send_message__session_not_found__raises_not_found(service, mock_repo):
    """Session không tồn tại phải trả 404 trước khi gọi provider."""
    mock_repo.get_chat_session_by_id.return_value = None

    with pytest.raises(NotFoundException, match="Chat session not found"):
        await service.send_message(
            session_id=999,
            user_id=100,
            request=ChatMessageRequest(content="Xin chào"),
        )

    mock_repo.create_chat_message.assert_not_called()


@pytest.mark.asyncio
async def test_send_message__trip_owner_mismatch__raises_forbidden(
    service,
    mock_repo,
    owned_session,
    owned_trip,
):
    """Cross-user access phải bị chặn ở mức trip ownership."""
    mock_repo.get_chat_session_by_id.return_value = owned_session
    owned_trip.user_id = 999
    mock_repo.get_with_full_data.return_value = owned_trip

    with pytest.raises(ForbiddenException, match="Not trip owner"):
        await service.send_message(
            session_id=11,
            user_id=100,
            request=ChatMessageRequest(content="Xin chào"),
        )


@pytest.mark.asyncio
async def test_list_messages_success(
    service,
    mock_repo,
    owned_session,
    owned_trip,
    user_message_row,
    assistant_message_row,
):
    """History API phải trả đúng slice message đã persist."""
    mock_repo.get_chat_session_by_id.return_value = owned_session
    mock_repo.get_with_full_data.return_value = owned_trip
    mock_repo.list_messages_by_session.return_value = ([user_message_row, assistant_message_row], 2)

    result = await service.list_messages(session_id=11, user_id=100, skip=0, limit=50)

    assert isinstance(result, ChatMessageListResponse)
    assert result.total == 2
    assert result.skip == 0
    assert result.limit == 50
    assert [item.role for item in result.items] == ["user", "assistant"]
