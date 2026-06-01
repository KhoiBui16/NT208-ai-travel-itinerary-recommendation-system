"""C.1 AI itinerary generation pipeline.

Module này chịu trách nhiệm orchestrate quá trình tạo lịch trình bằng AI:

  1. Resolve destination → Destination entity (từ DB)
  2. Load context data  → Places + Hotels cho AI recommendation
  3. Build prompt       → Gọi LLM (Gemini) với context
  4. Validate response  → Kiểm tra format, day count, budget
  5. Persist to DB      → Tạo Trip + Days + Activities + Accommodations

Phân tách trách nhiệm:
  • Shared AI infrastructure → src/agent/ (LLM client, prompts, schemas)
  • DB reads/writes          → src/itineraries/ (repository, models)
  • Business orchestration   → file này (ItineraryPipeline)
"""

import asyncio
from datetime import timedelta
from time import perf_counter
from typing import Any

from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

from src.agent.config import AgentConfig
from src.agent.llm import GeminiLLM, LLMGenerationError, parse_json_response
from src.agent.prompts.itinerary_prompts import build_itinerary_prompt
from src.agent.schemas.itinerary_schemas import AgentItinerary
from src.core.config import AppSettings, get_settings
from src.core.exceptions import ServiceUnavailableException, ValidationException
from src.core.logger import get_logger
from src.itineraries.models.trip import Trip
from src.itineraries.repository import TripRepository
from src.itineraries.schemas import GenerateItineraryRequest
from src.places.models import Hotel, Place

# ---------------------------------------------------------------------------
# Constants — Cấu hình pipeline
# ---------------------------------------------------------------------------

# Các loại activity hợp lệ trong hệ thống
VALID_ACTIVITY_CATEGORIES = {"food", "attraction", "nature", "entertainment", "shopping"}

# Mapping sở thích user → category DB (normalize user input)
INTEREST_CATEGORY_ALIASES = {
    "culture": "attraction",
    "cultural": "attraction",
    "history": "attraction",
}

# Giới hạn context gửi cho LLM (tránh prompt quá dài)
MAX_CONTEXT_PLACES = 15
MAX_CONTEXT_HOTELS = 4

# Giới hạn số ngày tối đa cho 1 trip
MAX_TRIP_DAYS = 14

logger = get_logger(__name__)


class ItineraryPipeline:
    """Generate và persist lịch trình AI từ DB recommendation context.

    Flow chính: generate() → _call_llm_with_retries() → _persist_itinerary()
    """

    def __init__(
        self,
        session: AsyncSession,
        *,
        repo: TripRepository | None = None,
        llm: GeminiLLM | None = None,
        settings: AppSettings | None = None,
        retry_delay_seconds: float = 1.0,
    ) -> None:
        self.session = session
        self.repo = repo or TripRepository(session)
        self.settings = settings or get_settings()
        self.llm = llm or GeminiLLM(AgentConfig.from_settings(self.settings))
        self.retry_delay_seconds = retry_delay_seconds

    # ===================================================================
    # Public API — Entry point
    # ===================================================================

    async def generate(
        self,
        request: GenerateItineraryRequest,
        user_id: int | None,
    ) -> Trip:
        """Generate lịch trình AI và persist vào DB.

        Flow:
          1. Tính số ngày → validate (1-14)
          2. Resolve destination → Destination entity
          3. Load places + hotels context
          4. Gọi LLM → validate response
          5. Persist Trip + Days + Activities + Accommodations
          6. Return Trip (eager-loaded)
        """
        started_at = perf_counter()
        day_count = self._day_count(request)

        # --- Log bắt đầu ---
        logger.info(
            "ai_generate_started",
            destination=request.destination,
            day_count=day_count,
            adults=request.adults,
            children=request.children,
            interests=request.interests,
            budget=request.budget,
            authenticated=bool(user_id),
            model=self.settings.agent_model,
            timeout_seconds=self.settings.agent_timeout_seconds,
            min_activities_per_day=self.settings.agent_min_activities_per_day,
            max_activities_per_day=self.settings.agent_max_activities_per_day,
        )

        # --- Step 1: Resolve destination ---
        destination = await self.repo.resolve_destination_for_ai(request.destination)
        if not destination:
            logger.warning(
                "ai_generate_destination_missing",
                destination=request.destination,
                duration_ms=self._elapsed_ms(started_at),
            )
            raise ValidationException(
                "Destination data not found. Please run ETL for this destination first."
            )
        destination_id = destination.id
        destination_name = destination.name

        # --- Step 2: Load context places ---
        categories = self._normalize_interests(request.interests)
        places = await self.repo.search_places_for_ai(
            destination_id,
            categories=categories,
            limit=MAX_CONTEXT_PLACES,
        )
        min_required = self._minimum_required_places(day_count)
        logger.info(
            "ai_generate_context_loaded",
            destination_id=destination_id,
            destination=destination_name,
            requested_categories=categories,
            places_count=len(places),
            minimum_required_places=min_required,
            context_place_limit=MAX_CONTEXT_PLACES,
        )

        # Nếu không đủ places với category filter → fallback lấy tất cả categories
        if len(places) < min_required and categories:
            places = await self.repo.search_places_for_ai(
                destination_id,
                categories=None,
                limit=MAX_CONTEXT_PLACES,
            )
            logger.info(
                "ai_generate_context_fallback_loaded",
                destination_id=destination_id,
                places_count=len(places),
                context_place_limit=MAX_CONTEXT_PLACES,
            )

        # Vẫn không đủ → raise error
        if len(places) < min_required:
            logger.warning(
                "ai_generate_context_insufficient",
                destination_id=destination_id,
                places_count=len(places),
                minimum_required_places=min_required,
                duration_ms=self._elapsed_ms(started_at),
            )
            raise ValidationException(
                "Not enough destination places for AI recommendation. Please run Goong ETL first."
            )

        # --- Step 3: Load context hotels + Call LLM ---
        hotels = await self.repo.get_hotels_for_ai(destination_id, limit=MAX_CONTEXT_HOTELS)
        itinerary = await self._call_llm_with_retries(
            request=request,
            destination_name=destination_name,
            places=places,
            hotels=hotels,
            day_count=day_count,
        )

        # --- Step 4: Persist to DB ---
        trip = await self._persist_itinerary(
            request=request,
            user_id=user_id,
            destination_name=destination_name,
            places=places,
            hotels=hotels,
            itinerary=itinerary,
        )

        # --- Log hoàn thành ---
        logger.info(
            "ai_generate_completed",
            trip_id=trip.id,
            destination_id=destination_id,
            days_count=len(trip.days),
            activities_count=sum(len(day.activities) for day in trip.days),
            accommodations_count=len(trip.accommodations),
            duration_ms=self._elapsed_ms(started_at),
        )
        return trip

    # ===================================================================
    # LLM Interaction — Gọi AI model với retry
    # ===================================================================

    async def _call_llm_with_retries(
        self,
        *,
        request: GenerateItineraryRequest,
        destination_name: str,
        places: list[Place],
        hotels: list[Hotel],
        day_count: int,
    ) -> AgentItinerary:
        """Gọi LLM với retry logic (exponential backoff).

        Mỗi attempt:
          1. Build prompt (kèm validation errors từ attempt trước nếu có)
          2. Call LLM → parse JSON response
          3. Validate itinerary (day count, budget, activity count)

        Retry khi: LLMGenerationError hoặc ValidationError
        Không retry khi: ServiceUnavailableException (LLM down)
        """
        errors: list[str] = []
        attempts = self.settings.agent_max_retries + 1
        for attempt in range(attempts):
            attempt_started_at = perf_counter()

            # Build prompt — kèm validation errors từ attempt trước (nếu có)
            prompt = build_itinerary_prompt(
                request=request,
                destination_name=destination_name,
                candidate_places=[self._place_context(place) for place in places],
                candidate_hotels=[self._hotel_context(hotel) for hotel in hotels],
                min_activities_per_day=self.settings.agent_min_activities_per_day,
                max_activities_per_day=self.settings.agent_max_activities_per_day,
                validation_feedback=errors or None,
            )
            try:
                logger.info(
                    "ai_generate_llm_attempt_started",
                    attempt=attempt + 1,
                    max_attempts=attempts,
                    model=self.settings.agent_model,
                    timeout_seconds=self.settings.agent_timeout_seconds,
                    prompt_chars=len(prompt),
                    prompt_estimated_tokens=self._estimate_tokens(prompt),
                    candidate_places=len(places),
                    candidate_hotels=len(hotels),
                    day_count=day_count,
                    previous_validation_errors=len(errors),
                )

                # Gọi LLM
                raw_text = await self.llm.generate_text(prompt)
                logger.info(
                    "ai_generate_llm_attempt_received",
                    attempt=attempt + 1,
                    response_chars=len(raw_text),
                    response_estimated_tokens=self._estimate_tokens(raw_text),
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )

                # Parse JSON response → validate schema
                payload = parse_json_response(raw_text)
                itinerary = AgentItinerary.model_validate(payload)

                # Validate business rules (day count, budget, activity count)
                self._validate_itinerary(itinerary, request, day_count)
                logger.info(
                    "ai_generate_llm_attempt_validated",
                    attempt=attempt + 1,
                    generated_days=len(itinerary.days),
                    generated_activities=sum(len(day.activities) for day in itinerary.days),
                    total_cost=itinerary.total_cost,
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )
                return itinerary

            except ServiceUnavailableException as exc:
                # LLM service down → không retry
                logger.warning(
                    "ai_generate_llm_attempt_unavailable",
                    attempt=attempt + 1,
                    error=str(exc),
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )
                raise
            except (LLMGenerationError, ValidationError) as exc:
                # Parse/validation error → retry với feedback
                errors.append(str(exc))
                logger.warning(
                    "ai_generate_llm_attempt_invalid",
                    attempt=attempt + 1,
                    error_type=exc.__class__.__name__,
                    error=str(exc)[:500],
                    retrying=attempt < attempts - 1,
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )
                # Exponential backoff trước khi retry
                if attempt < attempts - 1 and self.retry_delay_seconds > 0:
                    await asyncio.sleep(self.retry_delay_seconds * (2**attempt))

        # Hết retry → raise error
        logger.error(
            "ai_generate_llm_validation_exhausted",
            attempts=attempts,
            validation_errors=len(errors),
        )
        raise ServiceUnavailableException("AI itinerary generation failed validation")

    # ===================================================================
    # Persistence — Lưu kết quả AI vào DB
    # ===================================================================

    async def _persist_itinerary(
        self,
        *,
        request: GenerateItineraryRequest,
        user_id: int | None,
        destination_name: str,
        places: list[Place],
        hotels: list[Hotel],
        itinerary: AgentItinerary,
    ) -> Trip:
        """Persist AI-generated itinerary vào DB.

        Tạo: Trip → TripDay (per day) → Activity (per activity) → Accommodation (per hotel)
        Verify place_id/hotel_id tồn tại trong context trước khi link.
        """
        # Tạo set IDs hợp lệ để verify foreign keys
        place_ids = {place.id for place in places}
        hotel_ids = {hotel.id for hotel in hotels}

        # Tạo Trip record
        trip = await self.repo.create_trip(
            user_id=user_id,
            destination=destination_name,
            trip_name=itinerary.trip_name,
            start_date=request.start_date,
            end_date=request.end_date,
            budget=request.budget,
            total_cost=itinerary.total_cost,
            adults_count=request.adults,
            children_count=request.children,
            interests=request.interests,
            status="draft",
            ai_generated=True,
        )

        # Tạo Days + Activities
        for idx, day in enumerate(sorted(itinerary.days, key=lambda item: item.day_number)):
            trip_date = request.start_date + timedelta(days=idx)
            trip_day = await self.repo.add_day(
                trip_id=trip.id,
                day_number=idx + 1,
                label=day.label,
                date=trip_date.isoformat(),
                destination_name=destination_name,
            )
            for order_index, activity in enumerate(day.activities):
                # Chỉ link place_id nếu tồn tại trong context
                place_id = activity.place_id if activity.place_id in place_ids else None
                await self.repo.add_activity(
                    trip_day_id=trip_day.id,
                    place_id=place_id,
                    name=activity.name,
                    time=activity.time,
                    end_time=activity.end_time,
                    type=activity.type,
                    location=activity.location,
                    description=activity.description,
                    image="",
                    transportation=activity.transportation,
                    adult_price=activity.adult_price,
                    child_price=activity.child_price,
                    custom_cost=activity.custom_cost,
                    bus_ticket_price=activity.bus_ticket_price,
                    taxi_cost=activity.taxi_cost,
                    order_index=order_index,
                )

        # Tạo Accommodations
        for accommodation in itinerary.accommodations:
            # Chỉ link hotel_id nếu tồn tại trong context
            hotel_id = accommodation.hotel_id if accommodation.hotel_id in hotel_ids else None
            await self.repo.add_accommodation(
                trip_id=trip.id,
                hotel_id=hotel_id,
                name=accommodation.name,
                check_in=accommodation.check_in,
                check_out=accommodation.check_out,
                price_per_night=accommodation.price_per_night,
                total_price=accommodation.total_price,
                booking_type=accommodation.booking_type,
                duration=accommodation.duration,
                day_ids=accommodation.day_ids,
            )

        # Flush + expire → re-fetch để eager-load tất cả data
        await self.session.flush()
        trip_id = trip.id
        self.session.expire_all()
        refreshed = await self.repo.get_with_full_data(trip_id)
        if not refreshed:
            raise ServiceUnavailableException("Generated trip could not be loaded")
        return refreshed

    # ===================================================================
    # Validation — Kiểm tra kết quả AI
    # ===================================================================

    def _validate_itinerary(
        self,
        itinerary: AgentItinerary,
        request: GenerateItineraryRequest,
        day_count: int,
    ) -> None:
        """Validate AI-generated itinerary theo business rules.

        Kiểm tra:
          • Số ngày = số ngày yêu cầu
          • Tổng chi phí <= 120% budget (tolerance 20%)
          • Mỗi ngày có đủ activities (min/max từ settings)
        """
        if len(itinerary.days) != day_count:
            raise LLMGenerationError("AI itinerary day count does not match request")
        if itinerary.total_cost > int(request.budget * 1.2):
            raise LLMGenerationError("AI itinerary exceeds budget tolerance")
        for day in itinerary.days:
            activity_count = len(day.activities)
            if activity_count < self.settings.agent_min_activities_per_day:
                raise LLMGenerationError(
                    f"AI itinerary day {day.day_number} has too few activities"
                )
            if activity_count > self.settings.agent_max_activities_per_day:
                raise LLMGenerationError(
                    f"AI itinerary day {day.day_number} has too many activities"
                )

    # ===================================================================
    # Utility — Các helper nhỏ
    # ===================================================================

    @staticmethod
    def _day_count(request: GenerateItineraryRequest) -> int:
        """Tính số ngày trip từ start_date và end_date. Validate range 1-14."""
        day_count = (request.end_date - request.start_date).days + 1
        if day_count < 1 or day_count > MAX_TRIP_DAYS:
            raise ValidationException("Trip duration must be between 1 and 14 days")
        return day_count

    @staticmethod
    def _minimum_required_places(day_count: int) -> int:
        """Tính số places tối thiểu cần có để AI tạo lịch trình hợp lý."""
        return min(max(day_count * 2, 2), 6)

    @staticmethod
    def _normalize_interests(interests: list[str]) -> list[str]:
        """Normalize user interests → DB categories.

        Ví dụ: "culture" → "attraction", "cultural" → "attraction"
        Chỉ giữ categories hợp lệ, loại bỏ duplicates.
        """
        categories: list[str] = []
        for interest in interests:
            normalized = INTEREST_CATEGORY_ALIASES.get(interest, interest)
            if normalized in VALID_ACTIVITY_CATEGORIES and normalized not in categories:
                categories.append(normalized)
        return categories

    @staticmethod
    def _place_context(place: Place) -> dict[str, Any]:
        """Convert Place ORM → dict context cho LLM prompt."""
        return {
            "placeId": place.id,
            "name": place.name,
            "category": place.category,
            "location": place.location,
            "rating": place.rating,
            "reviewCount": place.review_count,
            "avgCost": place.avg_cost,
            "latitude": place.latitude,
            "longitude": place.longitude,
            "source": place.source,
        }

    @staticmethod
    def _hotel_context(hotel: Hotel) -> dict[str, Any]:
        """Convert Hotel ORM → dict context cho LLM prompt."""
        return {
            "hotelId": hotel.id,
            "name": hotel.name,
            "location": hotel.location,
            "rating": hotel.rating,
            "reviewCount": hotel.review_count,
            "pricePerNight": hotel.price_per_night,
            "amenities": hotel.amenities,
        }

    @staticmethod
    def _elapsed_ms(started_at: float) -> int:
        """Tính thời gian đã trôi qua (milliseconds) từ started_at."""
        return round((perf_counter() - started_at) * 1000)

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """Ước tính số tokens từ text (rough: 1 token ≈ 4 chars)."""
        return max(1, round(len(text) / 4))
