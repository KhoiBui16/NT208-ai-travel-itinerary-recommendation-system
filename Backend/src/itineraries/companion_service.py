"""Companion chat service cho Phase C3B.

Service này chịu trách nhiệm:
  - Xác thực ownership giữa `user -> chat session -> trip`
  - Build context từ itinerary hiện tại và history gần nhất
  - Gọi provider AI qua abstraction riêng
  - Persist cặp message `user` + `assistant` vào `chat_messages`
  - Trả structured payload `message / requiresConfirmation / proposedOperations`

Lưu ý quan trọng:
  - Service này KHÔNG tự apply patch vào itinerary trong message flow.
  - Mọi thay đổi itinerary nếu có chỉ nằm trong `proposedOperations`
    để FE hiển thị; user xác nhận qua endpoint riêng
    `POST /api/v1/itineraries/{trip_id}/apply-patch` (cũng nằm trong service
    này, merged #105) mới thực sự ghi DB.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from time import perf_counter
from typing import Protocol

from pydantic import Field, ValidationError, field_validator, model_validator

from src.agent.config import AgentConfig
from src.agent.llm import GeminiLLM, LLMGenerationError, parse_json_response
from src.core.config import AppSettings, get_settings
from src.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
    ServiceUnavailableException,
    ValidationException,
)
from src.core.logger import get_logger
from src.core.schema import CamelCaseModel
from src.itineraries.models.chat import ChatMessage, ChatSession
from src.itineraries.models.trip import Trip
from src.itineraries.repository import TripRepository
from src.itineraries.schemas import (
    ApplyPatchRequest,
    ApplyPatchResponse,
    ChatMessageListResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    CompanionPatchOperation,
    SendChatMessageResponse,
)
from src.itineraries.service import ItineraryService

logger = get_logger(__name__)


class CompanionReplyPayload(CamelCaseModel):
    """Structured payload mà provider phải trả về cho message assistant."""

    message: str = Field(min_length=1, max_length=4000)
    requires_confirmation: bool = False
    proposed_operations: list[CompanionPatchOperation] = Field(default_factory=list)

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, value: str) -> str:
        """Đảm bảo provider không trả lời rỗng hoặc chỉ toàn khoảng trắng."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("message must not be blank")
        return normalized

    @model_validator(mode="after")
    def validate_confirmation_payload(self) -> CompanionReplyPayload:
        """Nếu assistant đòi confirm thì bắt buộc phải có operation cụ thể."""
        if self.requires_confirmation and not self.proposed_operations:
            raise ValueError("requiresConfirmation=true must include proposedOperations")
        return self


class CompanionProvider(Protocol):
    """Interface nhỏ cho provider chat để test có thể cắm fake dễ dàng."""

    async def generate_reply(
        self,
        *,
        trip: Trip,
        session: ChatSession,
        history: list[ChatMessage],
        user_message: str,
    ) -> CompanionReplyPayload:
        """Sinh reply structured từ trip context và chat history."""


@dataclass(slots=True)
class GeminiCompanionProvider:
    """Provider runtime dùng Gemini thật cho companion chat.

    Provider này chỉ lo:
      - build prompt theo trip context
      - gọi `GeminiLLM`
      - parse/validate JSON trả về

    Mọi chuyện ownership, persistence, rate-limit đều nằm ở service/router.
    """

    settings: AppSettings
    llm: GeminiLLM
    retry_delay_seconds: float = 0.5

    @classmethod
    def from_settings(cls, settings: AppSettings | None = None) -> GeminiCompanionProvider:
        """Khởi tạo provider từ cấu hình app hiện tại."""
        resolved = settings or get_settings()
        llm = GeminiLLM(AgentConfig.from_settings(resolved))
        return cls(settings=resolved, llm=llm)

    async def generate_reply(
        self,
        *,
        trip: Trip,
        session: ChatSession,
        history: list[ChatMessage],
        user_message: str,
    ) -> CompanionReplyPayload:
        """Gọi Gemini với retry nhẹ và validate chặt structured JSON."""
        errors: list[str] = []
        attempts = self.settings.agent_max_retries + 1

        for attempt in range(attempts):
            attempt_started_at = perf_counter()
            prompt = self._build_prompt(
                trip=trip,
                session=session,
                history=history,
                user_message=user_message,
                validation_feedback=errors or None,
            )

            try:
                logger.info(
                    "companion_chat_llm_attempt_started",
                    attempt=attempt + 1,
                    max_attempts=attempts,
                    trip_id=trip.id,
                    session_id=session.id,
                    prompt_chars=len(prompt),
                    history_messages=len(history),
                )
                raw_text = await self.llm.generate_text(prompt)
                payload = parse_json_response(raw_text)
                reply = CompanionReplyPayload.model_validate(payload)
                logger.info(
                    "companion_chat_llm_attempt_validated",
                    attempt=attempt + 1,
                    trip_id=trip.id,
                    session_id=session.id,
                    requires_confirmation=reply.requires_confirmation,
                    proposed_operations=len(reply.proposed_operations),
                    duration_ms=round((perf_counter() - attempt_started_at) * 1000),
                )
                return reply
            except ServiceUnavailableException:
                raise
            except (LLMGenerationError, ValidationError) as exc:
                errors.append(str(exc))
                logger.warning(
                    "companion_chat_llm_attempt_invalid",
                    attempt=attempt + 1,
                    trip_id=trip.id,
                    session_id=session.id,
                    error_type=exc.__class__.__name__,
                    error=str(exc)[:500],
                    retrying=attempt < attempts - 1,
                )
                if attempt < attempts - 1:
                    await asyncio.sleep(self.retry_delay_seconds * (2**attempt))

        raise ServiceUnavailableException(
            "AI companion trả về dữ liệu chưa hợp lệ. Chưa có thay đổi nào được lưu.",
            error_code="AI_COMPANION_INVALID_RESPONSE",
            retryable=True,
        )

    def _build_prompt(
        self,
        *,
        trip: Trip,
        session: ChatSession,
        history: list[ChatMessage],
        user_message: str,
        validation_feedback: list[str] | None,
    ) -> str:
        """Ghép prompt trip-bound cho companion chat.

        Prompt cố tình nhấn mạnh ba invariant:
          1. Chỉ bám trip hiện tại
          2. Không nói rằng đã lưu thay đổi
          3. Nếu có patch thì chỉ trả `proposedOperations`
        """
        history_block = self._history_context(history)
        trip_block = self._trip_context(trip)
        feedback_block = (
            "\nValidation feedback from previous attempt:\n- " + "\n- ".join(validation_feedback)
            if validation_feedback
            else ""
        )

        return f"""
Bạn là AI companion cho một lịch trình du lịch cụ thể, không phải chatbot du lịch chung chung.

Nhiệm vụ:
- Trả lời bằng tiếng Việt rõ ràng, ngắn gọn, hữu ích.
- Chỉ dùng context của trip bên dưới.
- Nếu user muốn thay đổi itinerary, KHÔNG được nói là đã lưu hay đã cập nhật DB.
- Với yêu cầu thay đổi itinerary, hãy trả `requiresConfirmation=true`
  và mô tả thay đổi trong `proposedOperations`.
- Nếu chỉ là hỏi thông tin hoặc gợi ý chung trên trip hiện tại,
  trả `requiresConfirmation=false` và `proposedOperations=[]`.
- Nếu thiếu thông tin để patch chính xác, hãy hỏi lại trong `message`
  và giữ `proposedOperations=[]`.

Chỉ trả về JSON object hợp lệ với đúng schema sau:
{{
  "message": "string",
  "requiresConfirmation": true,
  "proposedOperations": [
    {{
      "type": "add_activity|update_activity|remove_activity|adjust_budget|clarify",
      "description": "string",
      "target": {{
        "dayId": 2,
        "activityId": 10
      }},
      "activity": {{
        "name": "string",
        "time": "HH:mm",
        "endTime": "HH:mm",
        "location": "string",
        "description": "string",
        "type": "food|attraction|nature|entertainment|shopping",
        "image": "string",
        "transportation": "walk|bike|bus|taxi",
        "adultPrice": 0,
        "childPrice": 0,
        "customCost": 0,
        "busTicketPrice": 0,
        "taxiCost": 0,
        "extraExpenses": []
      }},
      "budget": 0
    }}
  ]
}}

Quy tắc payload:
- `add_activity`: bắt buộc có `target.dayId` + `activity`
- `update_activity`: bắt buộc có `target.activityId` + `activity`
- `remove_activity`: bắt buộc có `target.activityId`
- `adjust_budget`: bắt buộc có `budget`
- `clarify`: dùng khi chưa đủ dữ liệu để patch, không gửi `activity` hay `budget`

Trip context:
{trip_block}

Recent chat history:
{history_block}

Current session:
- sessionId: {session.id}
- threadId: {session.thread_id}

User message:
{user_message}
{feedback_block}
""".strip()

    @staticmethod
    def _trip_context(trip: Trip) -> str:
        """Biến trip ORM thành text context vừa đủ cho provider."""
        traveler_summary = f"{trip.adults_count} người lớn, {trip.children_count} trẻ em"
        days_lines: list[str] = []

        for day in trip.days:
            activities = (
                "; ".join(
                    f"{activity.time}-{activity.end_time or '--'} {activity.name} ({activity.type})"
                    for activity in day.activities
                )
                or "chưa có hoạt động"
            )
            days_lines.append(
                f"- DayId={day.id}, dayNumber={day.day_number}, label={day.label}, "
                f"date={day.date}, "
                f"destination={day.destination_name or trip.destination}, "
                f"activities={activities}"
            )

        accommodations = (
            "; ".join(
                f"{accommodation.name or 'N/A'} / "
                f"dayIds={accommodation.day_ids} / "
                f"total={accommodation.total_price or 0}"
                for accommodation in trip.accommodations
            )
            or "chưa có nơi ở"
        )

        return "\n".join(
            [
                f"- tripId: {trip.id}",
                f"- destination: {trip.destination}",
                f"- tripName: {trip.trip_name}",
                f"- dateRange: {trip.start_date} -> {trip.end_date}",
                f"- budget: {trip.budget}",
                f"- totalCost: {trip.total_cost}",
                f"- travelers: {traveler_summary}",
                f"- interests: {', '.join(trip.interests or []) or 'không có'}",
                f"- accommodations: {accommodations}",
                "- days:",
                *days_lines,
            ]
        )

    @staticmethod
    def _history_context(history: list[ChatMessage]) -> str:
        """Chỉ giữ text history gần nhất để prompt không phình quá lớn."""
        if not history:
            return "- chưa có lịch sử"
        return "\n".join(f"- {message.role}: {message.content}" for message in history[-10:])


class CompanionService:
    """Service điều phối chat message flow của C3B."""

    def __init__(
        self,
        session,
        *,
        provider: CompanionProvider | None = None,
        settings: AppSettings | None = None,
    ) -> None:
        self.session = session
        self.settings = settings or get_settings()
        self.repo = TripRepository(session)
        self.provider = provider or GeminiCompanionProvider.from_settings(self.settings)

    async def send_message(
        self,
        session_id: int,
        user_id: int,
        request: ChatMessageRequest,
    ) -> SendChatMessageResponse:
        """Xử lý một lượt chat mới và persist cặp message nếu thành công."""
        session, trip = await self._load_owned_session(session_id, user_id)
        history, _ = await self.repo.list_messages_by_session(
            session_id=session.id,
            skip=0,
            limit=20,
        )

        # Gọi provider trước; nếu provider fail thì transaction request sẽ rollback
        # và không tạo dangling message history.
        reply = await self.provider.generate_reply(
            trip=trip,
            session=session,
            history=history,
            user_message=request.content,
        )
        serialized_operations = [
            operation.model_dump(mode="json", by_alias=True)
            for operation in reply.proposed_operations
        ]

        user_message = await self.repo.create_chat_message(
            session_id=session.id,
            role="user",
            content=request.content,
            proposed_operations=[],
            requires_confirmation=False,
            confirmation_status="not_required",
        )
        assistant_message = await self.repo.create_chat_message(
            session_id=session.id,
            role="assistant",
            content=reply.message,
            proposed_operations=serialized_operations,
            requires_confirmation=reply.requires_confirmation,
            confirmation_status="pending" if reply.requires_confirmation else "not_required",
            trip_snapshot_updated_at=trip.updated_at if reply.requires_confirmation else None,
        )

        # Chạm `updated_at` để session list phản ánh cuộc hội thoại gần nhất.
        session.updated_at = datetime.now(UTC)
        await self.repo.touch_chat_session(session)

        user_payload = self._to_chat_message_response(user_message)
        assistant_payload = self._to_chat_message_response(assistant_message)
        return SendChatMessageResponse(
            session_id=session.id,
            user_message=user_payload,
            assistant_message=assistant_payload,
            message=assistant_payload.content,
            requires_confirmation=assistant_payload.requires_confirmation,
            proposed_operations=assistant_payload.proposed_operations,
        )

    async def apply_patch(
        self,
        trip_id: int,
        user_id: int,
        request: ApplyPatchRequest,
    ) -> ApplyPatchResponse:
        """Xác nhận hoặc hủy một assistant proposal đã persist trong DB."""
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        assistant_message = await self.repo.get_chat_message_by_id(request.assistant_message_id)
        if not assistant_message:
            raise NotFoundException("Assistant proposal not found")
        if assistant_message.role != "assistant":
            raise ValidationException("Only assistant proposals can be confirmed")
        if assistant_message.session.trip_id != trip_id:
            raise ForbiddenException("Assistant proposal does not belong to this trip")
        if (
            assistant_message.session.user_id is not None
            and assistant_message.session.user_id != user_id
        ):
            raise ForbiddenException("Not chat session owner")
        if not assistant_message.requires_confirmation:
            raise ValidationException("This message does not require confirmation")
        if assistant_message.confirmation_status != "pending":
            raise ConflictException("Đề xuất này đã được xử lý trước đó")

        if request.action == "cancel":
            assistant_message.confirmation_status = "cancelled"
            assistant_message.resolved_at = datetime.now(UTC)
            system_message = await self.repo.create_chat_message(
                session_id=assistant_message.session_id,
                role="system",
                content="Bạn đã hủy đề xuất thay đổi lịch trình này.",
                proposed_operations=[],
                requires_confirmation=False,
                confirmation_status="not_required",
            )
            assistant_message.session.updated_at = datetime.now(UTC)
            await self.repo.touch_chat_session(assistant_message.session)
            return ApplyPatchResponse(
                applied=False,
                status="cancelled",
                message="Đã hủy đề xuất. Lịch trình hiện tại được giữ nguyên.",
                trip=None,
                assistant_message=self._to_chat_message_response(assistant_message),
            )

        if assistant_message.trip_snapshot_updated_at != trip.updated_at:
            assistant_message.confirmation_status = "stale"
            assistant_message.resolved_at = datetime.now(UTC)
            assistant_message.session.updated_at = datetime.now(UTC)
            await self.repo.touch_chat_session(assistant_message.session)
            # Persist stale marker before raising 409 so FE/history can render
            # the resolved proposal state on the next refresh.
            await self.session.commit()
            raise ConflictException(
                "Lịch trình đã thay đổi sau khi AI tạo đề xuất này. "
                "Hãy yêu cầu AI đề xuất lại trên dữ liệu mới nhất."
            )

        operations = [
            CompanionPatchOperation.model_validate(operation)
            for operation in (assistant_message.proposed_operations or [])
        ]
        if not operations:
            raise ValidationException("Assistant proposal does not contain applicable operations")

        session_id = assistant_message.session_id
        next_order_index_by_day: dict[int, int] = {}
        for operation in operations:
            await self._apply_operation(trip, operation, next_order_index_by_day)

        assistant_message.confirmation_status = "applied"
        assistant_message.resolved_at = datetime.now(UTC)
        await self.session.flush()

        # Re-load fresh graph before recalculating and serializing response.
        self.session.expire_all()
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        trip.total_cost = ItineraryService(self.session)._calculate_total_cost(trip)
        await self.session.flush()

        system_message = await self.repo.create_chat_message(
            session_id=session_id,
            role="system",
            content="Đề xuất đã được áp dụng vào lịch trình.",
            proposed_operations=[],
            requires_confirmation=False,
            confirmation_status="not_required",
        )
        _ = system_message
        session = await self.repo.get_chat_session_by_id(session_id)
        if session:
            session.updated_at = datetime.now(UTC)
            await self.repo.touch_chat_session(session)

        self.session.expire_all()
        final_trip = await self.repo.get_with_full_data(trip_id)
        refreshed_message = await self.repo.get_chat_message_by_id(request.assistant_message_id)
        if not final_trip or not refreshed_message:
            raise NotFoundException("Updated trip state not found")
        trip_payload = await ItineraryService(self.session)._to_response(final_trip)
        return ApplyPatchResponse(
            applied=True,
            status="applied",
            message="Đã áp dụng đề xuất vào lịch trình hiện tại.",
            trip=trip_payload,
            assistant_message=self._to_chat_message_response(refreshed_message),
        )

    async def list_messages(
        self,
        session_id: int,
        user_id: int,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> ChatMessageListResponse:
        """Đọc persisted history của một session sau khi xác thực ownership."""
        session, _ = await self._load_owned_session(session_id, user_id)
        messages, total = await self.repo.list_messages_by_session(
            session_id=session.id,
            skip=skip,
            limit=limit,
        )
        return ChatMessageListResponse(
            items=[self._to_chat_message_response(message) for message in messages],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def _load_owned_session(self, session_id: int, user_id: int) -> tuple[ChatSession, Trip]:
        """Load session + trip rồi chặn mọi case cross-user/cross-trip."""
        session = await self.repo.get_chat_session_by_id(session_id)
        if not session:
            raise NotFoundException("Chat session not found")
        if session.user_id is not None and session.user_id != user_id:
            raise ForbiddenException("Not chat session owner")

        trip = await self.repo.get_with_full_data(session.trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return session, trip

    @staticmethod
    def _to_chat_message_response(message: ChatMessage) -> ChatMessageResponse:
        """Map ORM row sang response schema nhất quán cho FE."""
        return ChatMessageResponse(
            id=message.id,
            session_id=message.session_id,
            role=message.role,  # type: ignore[arg-type]
            content=message.content,
            proposed_operations=message.proposed_operations or [],
            requires_confirmation=message.requires_confirmation,
            confirmation_status=message.confirmation_status,  # type: ignore[arg-type]
            trip_snapshot_updated_at=message.trip_snapshot_updated_at,
            resolved_at=message.resolved_at,
            created_at=message.created_at,
        )

    async def _apply_operation(
        self,
        trip: Trip,
        operation: CompanionPatchOperation,
        next_order_index_by_day: dict[int, int],
    ) -> None:
        """Apply một operation đã được validate lên trip hiện tại."""
        if operation.type == "clarify":
            raise ValidationException("Đề xuất này vẫn cần làm rõ thêm trước khi có thể áp dụng")

        if operation.type == "adjust_budget":
            trip.budget = operation.budget or trip.budget
            return

        if operation.type == "add_activity":
            day_id = operation.target.day_id
            if day_id is None or operation.activity is None:
                raise ValidationException(
                    "Thiếu target.dayId hoặc activity payload cho add_activity"
                )
            day = next((item for item in trip.days if item.id == day_id), None)
            if not day:
                raise ValidationException(
                    f"Không tìm thấy ngày #{day_id} trong lịch trình hiện tại"
                )

            current_next = next_order_index_by_day.get(
                day_id,
                max((activity.order_index for activity in day.activities), default=-1) + 1,
            )
            next_order_index_by_day[day_id] = current_next + 1
            await self.repo.add_activity(
                trip_day_id=day.id,
                name=operation.activity.name,
                time=operation.activity.time,
                end_time=operation.activity.end_time,
                type=operation.activity.type,
                location=operation.activity.location,
                description=operation.activity.description,
                image=operation.activity.image,
                transportation=operation.activity.transportation,
                adult_price=operation.activity.adult_price,
                child_price=operation.activity.child_price,
                custom_cost=operation.activity.custom_cost,
                bus_ticket_price=operation.activity.bus_ticket_price,
                taxi_cost=operation.activity.taxi_cost,
                order_index=current_next,
            )
            return

        if operation.type == "update_activity":
            activity_id = operation.target.activity_id
            if activity_id is None or operation.activity is None:
                raise ValidationException(
                    "Thiếu target.activityId hoặc activity payload cho update_activity"
                )
            activity = await self.repo.get_activity_for_trip(activity_id, trip.id)
            if not activity:
                raise ValidationException(
                    f"Không tìm thấy activity #{activity_id} trong lịch trình hiện tại"
                )
            await self.repo.update_activity(
                activity,
                name=operation.activity.name,
                time=operation.activity.time,
                end_time=operation.activity.end_time,
                type=operation.activity.type,
                location=operation.activity.location,
                description=operation.activity.description,
                image=operation.activity.image,
                transportation=operation.activity.transportation,
                adult_price=operation.activity.adult_price,
                child_price=operation.activity.child_price,
                custom_cost=operation.activity.custom_cost,
                bus_ticket_price=operation.activity.bus_ticket_price,
                taxi_cost=operation.activity.taxi_cost,
            )
            return

        if operation.type == "remove_activity":
            activity_id = operation.target.activity_id
            if activity_id is None:
                raise ValidationException("Thiếu target.activityId cho remove_activity")
            activity = await self.repo.get_activity_for_trip(activity_id, trip.id)
            if not activity:
                raise ValidationException(
                    f"Không tìm thấy activity #{activity_id} trong lịch trình hiện tại"
                )
            await self.repo.delete_activity(activity)
            return

        raise ValidationException(f"Operation type `{operation.type}` chưa được hỗ trợ")
