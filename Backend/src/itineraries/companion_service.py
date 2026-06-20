"""Companion chat service cho Phase C3B.

Service này chịu trách nhiệm:
  - Xác thực ownership giữa `user -> chat session -> trip`
  - Build context từ itinerary hiện tại và history gần nhất
  - Gọi provider AI qua abstraction riêng
  - Persist cặp message `user` + `assistant` vào `chat_messages`
  - Trả structured payload `message / requiresConfirmation / proposedOperations`

Lưu ý quan trọng:
  - Service này KHÔNG tự apply patch vào itinerary.
  - Mọi thay đổi itinerary nếu có chỉ nằm trong `proposedOperations`
    để FE hiển thị và chờ phase apply-patch ở bước sau.
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass
from datetime import UTC, datetime
from time import perf_counter
from typing import Protocol

from pydantic import Field, ValidationError, field_validator

from src.agent.config import AgentConfig
from src.agent.llm import GeminiLLM, LLMGenerationError, parse_json_response
from src.core.config import AppSettings, get_settings
from src.core.exceptions import ForbiddenException, NotFoundException, ServiceUnavailableException
from src.core.logger import get_logger
from src.core.schema import CamelCaseModel
from src.itineraries.models.chat import ChatMessage, ChatSession
from src.itineraries.models.trip import Trip
from src.itineraries.repository import TripRepository
from src.itineraries.schemas import (
    ChatMessageListResponse,
    ChatMessageRequest,
    ChatMessageResponse,
    SendChatMessageResponse,
)

logger = get_logger(__name__)


class CompanionReplyPayload(CamelCaseModel):
    """Structured payload mà provider phải trả về cho message assistant."""

    message: str = Field(min_length=1, max_length=4000)
    requires_confirmation: bool = False
    proposed_operations: list[dict[str, object]] = Field(default_factory=list)

    @field_validator("message")
    @classmethod
    def validate_message_not_blank(cls, value: str) -> str:
        """Đảm bảo provider không trả lời rỗng hoặc chỉ toàn khoảng trắng."""
        normalized = value.strip()
        if not normalized:
            raise ValueError("message must not be blank")
        return normalized


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
      "type": "add_activity|update_activity|remove_activity|reorder_day|
               adjust_budget|suggest_accommodation|clarify",
      "description": "string",
      "target": {{}}
    }}
  ]
}}

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

        user_message = await self.repo.create_chat_message(
            session_id=session.id,
            role="user",
            content=request.content,
            proposed_operations=[],
            requires_confirmation=False,
        )
        assistant_message = await self.repo.create_chat_message(
            session_id=session.id,
            role="assistant",
            content=reply.message,
            proposed_operations=reply.proposed_operations,
            requires_confirmation=reply.requires_confirmation,
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
            created_at=message.created_at,
        )
