"""Unit tests cho CompanionService ở phase C3B."""

from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest

from src.core.exceptions import ConflictException, ForbiddenException, NotFoundException
from src.itineraries.companion_service import CompanionReplyPayload, CompanionService
from src.itineraries.schemas import (
    ApplyPatchRequest,
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
                    "activity": {
                        "name": "Văn Miếu",
                        "time": "14:00",
                        "endTime": "16:00",
                        "location": "58 Quốc Tử Giám, Hà Nội",
                        "description": "Tham quan di tích lịch sử",
                        "type": "attraction",
                        "image": "",
                        "transportation": "taxi",
                        "adultPrice": 70000,
                        "childPrice": 35000,
                        "extraExpenses": [],
                    },
                }
            ],
        )


@pytest.fixture
def mock_session():
    session = AsyncMock()
    session.expire_all = lambda: None
    return session


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
        extra_expenses=[],
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
        updated_at=datetime.now(UTC),
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
        confirmation_status="not_required",
        trip_snapshot_updated_at=None,
        resolved_at=None,
        created_at=datetime.now(UTC),
    )


@pytest.fixture
def assistant_message_row():
    return SimpleNamespace(
        id=102,
        session_id=11,
        role="assistant",
        content="Mình đề xuất thêm Văn Miếu vào ngày 2.",
        proposed_operations=[
            {
                "type": "add_activity",
                "description": "Thêm Văn Miếu vào ngày 2",
                "target": {"dayId": 2},
                "activity": {
                    "name": "Văn Miếu",
                    "time": "14:00",
                    "endTime": "16:00",
                    "location": "58 Quốc Tử Giám, Hà Nội",
                    "description": "Tham quan di tích lịch sử",
                    "type": "attraction",
                    "image": "",
                    "transportation": "taxi",
                    "adultPrice": 70000,
                    "childPrice": 35000,
                    "extraExpenses": [],
                },
            }
        ],
        requires_confirmation=True,
        confirmation_status="pending",
        trip_snapshot_updated_at=datetime.now(UTC),
        resolved_at=None,
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


@pytest.mark.asyncio
async def test_apply_patch__apply_success__returns_trip_response(
    service,
    mock_repo,
    owned_trip,
    assistant_message_row,
    monkeypatch,
):
    """Apply path phải dùng persisted proposal, cập nhật status và trả trip mới."""
    assistant_message_row.session = SimpleNamespace(
        id=11,
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        updated_at=datetime.now(UTC),
    )
    assistant_message_row.trip_snapshot_updated_at = owned_trip.updated_at = datetime.now(UTC)
    refreshed_message_data = dict(assistant_message_row.__dict__)
    refreshed_message_data["confirmation_status"] = "applied"
    refreshed_message_data["resolved_at"] = datetime.now(UTC)
    refreshed_message = SimpleNamespace(**refreshed_message_data)
    system_message = SimpleNamespace(
        id=103,
        session_id=11,
        role="system",
        content="Đề xuất đã được áp dụng vào lịch trình.",
        proposed_operations=[],
        requires_confirmation=False,
        confirmation_status="not_required",
        trip_snapshot_updated_at=None,
        resolved_at=None,
        created_at=datetime.now(UTC),
    )
    final_trip_data = dict(owned_trip.__dict__)
    final_trip_data["total_cost"] = 2570000
    final_trip = SimpleNamespace(**final_trip_data)

    async def fake_to_response(_self, trip):
        return {
            "id": trip.id,
            "destination": trip.destination,
            "trip_name": trip.trip_name,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "budget": trip.budget,
            "total_cost": trip.total_cost,
            "traveler_info": {"adults": 2, "children": 0, "total": 2},
            "interests": trip.interests,
            "days": [],
            "accommodations": [],
            "created_at": datetime.now(UTC),
            "updated_at": trip.updated_at,
        }

    monkeypatch.setattr(
        "src.itineraries.companion_service.ItineraryService._to_response",
        fake_to_response,
    )

    mock_repo.get_with_full_data.side_effect = [owned_trip, final_trip, final_trip]
    mock_repo.get_chat_message_by_id.side_effect = [assistant_message_row, refreshed_message]
    mock_repo.create_chat_message.return_value = system_message
    mock_repo.get_chat_session_by_id.return_value = assistant_message_row.session

    result = await service.apply_patch(
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        request=ApplyPatchRequest(
            assistant_message_id=assistant_message_row.id,
            action="apply",
        ),
    )

    assert result.applied is True
    assert result.status == "applied"
    assert result.trip.id == owned_trip.id
    assert result.assistant_message.confirmation_status == "applied"
    mock_repo.add_activity.assert_awaited_once()
    mock_repo.touch_chat_session.assert_awaited_once()


@pytest.mark.asyncio
async def test_apply_patch__legacy_restaurant_alias__normalizes_to_food(
    service,
    mock_repo,
    owned_trip,
    assistant_message_row,
    monkeypatch,
):
    """Proposal cũ dùng `restaurant` vẫn phải apply được thay vì nổ 500."""
    assistant_message_row.session = SimpleNamespace(
        id=11,
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        updated_at=datetime.now(UTC),
    )
    assistant_message_row.trip_snapshot_updated_at = owned_trip.updated_at = datetime.now(UTC)
    assistant_message_row.proposed_operations[0]["activity"]["type"] = "restaurant"

    refreshed_message_data = dict(assistant_message_row.__dict__)
    refreshed_message_data["confirmation_status"] = "applied"
    refreshed_message_data["resolved_at"] = datetime.now(UTC)
    refreshed_message = SimpleNamespace(**refreshed_message_data)
    system_message = SimpleNamespace(
        id=103,
        session_id=11,
        role="system",
        content="Đề xuất đã được áp dụng vào lịch trình.",
        proposed_operations=[],
        requires_confirmation=False,
        confirmation_status="not_required",
        trip_snapshot_updated_at=None,
        resolved_at=None,
        created_at=datetime.now(UTC),
    )

    async def fake_to_response(_self, trip):
        return {
            "id": trip.id,
            "destination": trip.destination,
            "trip_name": trip.trip_name,
            "start_date": trip.start_date,
            "end_date": trip.end_date,
            "budget": trip.budget,
            "total_cost": trip.total_cost,
            "traveler_info": {"adults": 2, "children": 0, "total": 2},
            "interests": trip.interests,
            "days": [],
            "accommodations": [],
            "created_at": datetime.now(UTC),
            "updated_at": trip.updated_at,
        }

    monkeypatch.setattr(
        "src.itineraries.companion_service.ItineraryService._to_response",
        fake_to_response,
    )

    mock_repo.get_with_full_data.side_effect = [owned_trip, owned_trip, owned_trip]
    mock_repo.get_chat_message_by_id.side_effect = [assistant_message_row, refreshed_message]
    mock_repo.create_chat_message.return_value = system_message
    mock_repo.get_chat_session_by_id.return_value = assistant_message_row.session

    await service.apply_patch(
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        request=ApplyPatchRequest(
            assistant_message_id=assistant_message_row.id,
            action="apply",
        ),
    )

    _, kwargs = mock_repo.add_activity.await_args
    assert kwargs["type"] == "food"


@pytest.mark.asyncio
async def test_apply_patch__cancel__marks_message_cancelled(
    service,
    mock_repo,
    owned_trip,
    assistant_message_row,
):
    """Cancel path không đổi trip nhưng phải chốt proposal là cancelled."""
    assistant_message_row.session = SimpleNamespace(
        id=11,
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        updated_at=datetime.now(UTC),
    )
    mock_repo.get_with_full_data.return_value = owned_trip
    mock_repo.get_chat_message_by_id.return_value = assistant_message_row
    mock_repo.create_chat_message.return_value = SimpleNamespace(
        id=103,
        session_id=11,
        role="system",
        content="Bạn đã hủy đề xuất thay đổi lịch trình này.",
        proposed_operations=[],
        requires_confirmation=False,
        confirmation_status="not_required",
        trip_snapshot_updated_at=None,
        resolved_at=None,
        created_at=datetime.now(UTC),
    )

    result = await service.apply_patch(
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        request=ApplyPatchRequest(
            assistant_message_id=assistant_message_row.id,
            action="cancel",
        ),
    )

    assert result.applied is False
    assert result.status == "cancelled"
    assert result.trip is None
    assert result.assistant_message.confirmation_status == "cancelled"


@pytest.mark.asyncio
async def test_apply_patch__stale_trip_revision__raises_conflict(
    service,
    mock_repo,
    owned_trip,
    assistant_message_row,
):
    """Stale proposal phải bị chặn bằng 409 thay vì apply mù."""
    assistant_message_row.session = SimpleNamespace(
        id=11,
        trip_id=owned_trip.id,
        user_id=owned_trip.user_id,
        updated_at=datetime.now(UTC),
    )
    assistant_message_row.trip_snapshot_updated_at = datetime(2026, 7, 1, tzinfo=UTC)
    owned_trip.updated_at = datetime(2026, 7, 2, tzinfo=UTC)
    mock_repo.get_with_full_data.return_value = owned_trip
    mock_repo.get_chat_message_by_id.return_value = assistant_message_row

    with pytest.raises(ConflictException, match="đã thay đổi"):
        await service.apply_patch(
            trip_id=owned_trip.id,
            user_id=owned_trip.user_id,
            request=ApplyPatchRequest(
                assistant_message_id=assistant_message_row.id,
                action="apply",
            ),
        )

    assert assistant_message_row.confirmation_status == "stale"
    assert assistant_message_row.resolved_at is not None
    mock_repo.touch_chat_session.assert_awaited_once()
    service.session.commit.assert_awaited_once()
