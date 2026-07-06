"""C.1 AI itinerary generation pipeline.

This module owns itinerary business orchestration — the full flow from
user request to persisted Trip with Days, Activities, and Accommodations.

Architecture:
  - Shared AI infrastructure (LLM client, config) lives in src/agent/
  - Domain-specific prompts live in src/agent/prompts/
  - DB reads/writes stay in the itineraries domain (TripRepository)
  - This pipeline coordinates between them

Pipeline flow:
  1. Resolve destination from DB (name/slug/fuzzy matching)
  2. Load place + hotel context from DB for the LLM prompt
  3. Call Gemini LLM with retry + validation loop
  4. Validate the generated itinerary (day count, budget, activity counts)
  5. Persist Trip, TripDay, Activity, Accommodation records to DB
"""

import asyncio
from dataclasses import dataclass
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
# Constants — Pipeline configuration limits
# ---------------------------------------------------------------------------

# Valid activity categories that map to Goong ETL place categories
VALID_ACTIVITY_CATEGORIES = {"food", "attraction", "nature", "entertainment", "shopping"}

# Maps user interest strings that don't directly match DB categories
# to their closest DB category equivalent
INTEREST_CATEGORY_ALIASES = {
    "culture": "attraction",
    "cultural": "attraction",
    "history": "attraction",
}

# Maximum number of places to include in the LLM prompt context
# PERF-01 Fix: Reduced from 15 to 10 to reduce prompt size by 30-40%
# This improves response time and reduces timeout risk for longer trips
MAX_CONTEXT_PLACES = 10

# Maximum number of hotels to include in the LLM prompt context
# PERF-01 Fix: Reduced from 4 to 3 to further optimize prompt size
MAX_CONTEXT_HOTELS = 3

# Maximum allowed trip duration.
# NOTE: This is a temporary technical guard accepted by the product team for the
# current blocking-REST generation flow. Accepted value: 30 days (PR #85, 00060J).
# If longer trips are required in future, either raise this limit (requires user
# approval) or implement an async generation job — see follow-up task 00060L.
MAX_TRIP_DAYS = 30

# Conservative fallback costs used only when the model leaves all activity
# cost fields empty and the DB context has no usable avg_cost value.
DEFAULT_ACTIVITY_COSTS = {
    "food": {"adult": 50_000, "child": 30_000},
    "attraction": {"adult": 40_000, "child": 20_000},
    "shopping": {"custom": 100_000},
    "entertainment": {"custom": 100_000},
    "nature": {"custom": 0},
}
DEFAULT_TRANSPORT_COSTS = {
    "bus": 7_000,
    "taxi": 50_000,
}
CHILD_PRICE_RATIO = 0.6


@dataclass(slots=True)
class CostNormalizationResult:
    """Tracks whether itinerary cost validation relied on inferred values."""

    llm_total_cost: int
    recomputed_total_cost: int
    used_fallback_estimates: bool


logger = get_logger(__name__)


class ItineraryPipeline:
    """Generate and persist an AI itinerary from DB recommendation context.

    This is the main orchestrator for Phase C.1 AI itinerary generation.
    It coordinates between the database (for context), the LLM (for generation),
    and the repository (for persistence).
    """

    # ===================================================================
    # Initialization
    # ===================================================================

    def __init__(
        self,
        session: AsyncSession,
        *,
        repo: TripRepository | None = None,
        llm: GeminiLLM | None = None,
        settings: AppSettings | None = None,
        retry_delay_seconds: float = 1.0,
    ) -> None:
        """Initialize the pipeline with all required dependencies.

        Args:
            session: Async database session for the current request
            repo: Optional pre-built repository (defaults to new TripRepository)
            llm: Optional pre-built LLM client (defaults to new GeminiLLM)
            settings: Optional app settings (defaults to global settings)
            retry_delay_seconds: Base delay between LLM retries (exponential backoff)
        """
        self.session = session
        self.repo = repo or TripRepository(session)
        self.settings = settings or get_settings()
        self.llm = llm or GeminiLLM(AgentConfig.from_settings(self.settings))
        self.retry_delay_seconds = retry_delay_seconds

    # ===================================================================
    # Public API — Main generation entry point
    # ===================================================================

    @staticmethod
    def _calculate_dynamic_timeout(day_count: int, interests_count: int) -> int:
        """Calculate dynamic LLM timeout based on trip complexity.

        PERF-02 Fix: Timeout scales with trip complexity instead of fixed 30s.

        Formula:
        - Base: 30 seconds (minimum)
        - Per day: 2 seconds (more days = more context to process)
        - Per interest: 5 seconds (more interests = more complex constraints)

        Max: 180 seconds (3 minutes) to prevent indefinite hangs.

        Examples:
        - 1 day, 1 interest: 30 + 2*1 + 5*1 = 37s
        - 3 days, 2 interests: 30 + 2*3 + 5*2 = 46s
        - 7 days, 3 interests: 30 + 2*7 + 5*3 = 59s
        - 14 days, 4 interests: 30 + 2*14 + 5*4 = 78s
        - 30 days, 5 interests: 30 + 2*30 + 5*5 = 115s

        Args:
            day_count: Number of days in the trip (1-30)
            interests_count: Number of user interests (0-10)

        Returns:
            Timeout in seconds (30-180)
        """
        base = 30
        per_day = 2
        per_interest = 5
        calculated = base + (day_count * per_day) + (interests_count * per_interest)
        return min(calculated, 180)

    async def generate(
        self,
        request: GenerateItineraryRequest,
        user_id: int | None,
    ) -> Trip:
        """Generate an itinerary and persist Trip/Days/Activities/Accommodations.

        Full pipeline:
        1. Validate trip duration
        2. Resolve destination from DB
        3. Load place/hotel context
        4. Fall back to all categories if filtered results are insufficient
        5. Call LLM with retries and validation
        6. Persist generated itinerary to DB
        7. Return fully-loaded Trip ORM object
        """
        started_at = perf_counter()
        day_count = self._day_count(request)
        interests_count = len(request.interests)

        # PERF-02 Fix: Calculate dynamic timeout based on trip complexity
        dynamic_timeout = self._calculate_dynamic_timeout(day_count, interests_count)

        # Use provided LLM (for tests) or create new instance with dynamic timeout (for production)
        if self.llm is not None:
            # Tests inject fake LLM - use as-is
            llm = self.llm
        else:
            # Production: create LLM instance with dynamic timeout for this request
            base_config = AgentConfig.from_settings(self.settings)
            dynamic_config = AgentConfig(
                api_key=base_config.api_key,
                model=base_config.model,
                temperature=base_config.temperature,
                max_retries=base_config.max_retries,
                timeout_seconds=dynamic_timeout,
                min_activities_per_day=base_config.min_activities_per_day,
                max_activities_per_day=base_config.max_activities_per_day,
            )
            llm = GeminiLLM(dynamic_config)

        # Log pipeline start with all relevant parameters
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
            timeout_seconds=dynamic_timeout,
            min_activities_per_day=self.settings.agent_min_activities_per_day,
            max_activities_per_day=self.settings.agent_max_activities_per_day,
        )

        # --- Step 1: Resolve destination from DB ---
        destination_lookup_started_at = perf_counter()
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
        logger.info(
            "ai_generate_destination_resolved",
            destination_id=destination_id,
            destination=destination_name,
            duration_ms=self._elapsed_ms(destination_lookup_started_at),
        )

        # --- Step 2: Load place context (filtered by user interests) ---
        context_started_at = perf_counter()
        categories = self._normalize_interests(request.interests)
        places = await self.repo.search_places_for_ai(
            destination_id,
            categories=categories,
            limit=MAX_CONTEXT_PLACES,
        )

        # Calculate minimum required places based on trip duration
        min_required = self._minimum_required_places(day_count)
        logger.info(
            "ai_generate_context_loaded",
            destination_id=destination_id,
            destination=destination_name,
            requested_categories=categories,
            places_count=len(places),
            minimum_required_places=min_required,
            context_place_limit=MAX_CONTEXT_PLACES,
            duration_ms=self._elapsed_ms(context_started_at),
        )

        # --- Step 3: Fallback to all categories if insufficient matches ---
        if len(places) < min_required and categories:
            places = await self.repo.search_places_for_ai(
                destination_id,
                categories=None,  # Remove category filter
                limit=MAX_CONTEXT_PLACES,
            )
            logger.info(
                "ai_generate_context_fallback_loaded",
                destination_id=destination_id,
                places_count=len(places),
                context_place_limit=MAX_CONTEXT_PLACES,
                duration_ms=self._elapsed_ms(context_started_at),
            )

        # Validate minimum place count after fallback
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

        # --- Step 4: Load hotel context and call LLM ---
        hotels_started_at = perf_counter()
        hotels = await self.repo.get_hotels_for_ai(destination_id, limit=MAX_CONTEXT_HOTELS)
        logger.info(
            "ai_generate_hotels_loaded",
            destination_id=destination_id,
            hotels_count=len(hotels),
            context_hotel_limit=MAX_CONTEXT_HOTELS,
            duration_ms=self._elapsed_ms(hotels_started_at),
        )
        itinerary = await self._call_llm_with_retries(
            request=request,
            destination_name=destination_name,
            places=places,
            hotels=hotels,
            day_count=day_count,
            llm=llm,
        )

        # --- Step 5: Persist to database ---
        persistence_started_at = perf_counter()
        trip = await self._persist_itinerary(
            request=request,
            user_id=user_id,
            destination_name=destination_name,
            places=places,
            hotels=hotels,
            itinerary=itinerary,
        )
        logger.info(
            "ai_generate_persisted",
            trip_id=trip.id,
            duration_ms=self._elapsed_ms(persistence_started_at),
        )

        # Log successful completion with metrics
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
    # LLM interaction — Retry loop with validation
    # ===================================================================

    async def _call_llm_with_retries(
        self,
        *,
        request: GenerateItineraryRequest,
        destination_name: str,
        places: list[Place],
        hotels: list[Hotel],
        day_count: int,
        llm: GeminiLLM,
    ) -> AgentItinerary:
        """Call the LLM with retry logic and structured validation.

        Retry strategy:
        - Maximum attempts = agent_max_retries + 1 (initial + retries)
        - Exponential backoff between retries (delay * 2^attempt)
        - Previous validation errors are fed back to the LLM as feedback
        - ServiceUnavailableException (upstream LLM errors) are not retried

        Args:
            llm: LLM instance with dynamic timeout for this request
        """
        errors: list[str] = []
        attempts = self.settings.agent_max_retries + 1

        for attempt in range(attempts):
            attempt_started_at = perf_counter()

            # Build prompt with context, including any previous validation errors
            prompt_started_at = perf_counter()
            prompt = build_itinerary_prompt(
                request=request,
                destination_name=destination_name,
                candidate_places=[self._place_context(place) for place in places],
                candidate_hotels=[self._hotel_context(hotel) for hotel in hotels],
                min_activities_per_day=self.settings.agent_min_activities_per_day,
                max_activities_per_day=self.settings.agent_max_activities_per_day,
                validation_feedback=errors or None,
            )
            prompt_build_duration_ms = self._elapsed_ms(prompt_started_at)

            try:
                # Log attempt details for observability
                logger.info(
                    "ai_generate_llm_attempt_started",
                    attempt=attempt + 1,
                    max_attempts=attempts,
                    model=self.settings.agent_model,
                    timeout_seconds=self.settings.agent_timeout_seconds,
                    prompt_chars=len(prompt),
                    prompt_estimated_tokens=self._estimate_tokens(prompt),
                    prompt_build_duration_ms=prompt_build_duration_ms,
                    candidate_places=len(places),
                    candidate_hotels=len(hotels),
                    day_count=day_count,
                    previous_validation_errors=len(errors),
                )

                # Call the LLM and parse the JSON response
                raw_text = await llm.generate_text(prompt)
                logger.info(
                    "ai_generate_llm_attempt_received",
                    attempt=attempt + 1,
                    response_chars=len(raw_text),
                    response_estimated_tokens=self._estimate_tokens(raw_text),
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )

                # Parse and validate the structured response
                payload = parse_json_response(raw_text)
                itinerary = AgentItinerary.model_validate(payload)
                cost_result = self._normalize_itinerary_costs(
                    itinerary,
                    request=request,
                    places=places,
                    hotels=hotels,
                )
                self._validate_itinerary(
                    itinerary,
                    request,
                    day_count,
                    cost_result=cost_result,
                )

                # Validation passed — log success and return
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
                # Upstream LLM service error — don't retry, propagate immediately
                logger.warning(
                    "ai_generate_llm_attempt_unavailable",
                    attempt=attempt + 1,
                    error=str(exc),
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )
                raise

            except (LLMGenerationError, ValidationError) as exc:
                # Invalid LLM output — collect error for feedback and retry
                errors.append(str(exc))
                logger.warning(
                    "ai_generate_llm_attempt_invalid",
                    attempt=attempt + 1,
                    error_type=exc.__class__.__name__,
                    error=str(exc)[:500],
                    retrying=attempt < attempts - 1,
                    duration_ms=self._elapsed_ms(attempt_started_at),
                )
                # Exponential backoff before next retry
                if attempt < attempts - 1 and self.retry_delay_seconds > 0:
                    await asyncio.sleep(self.retry_delay_seconds * (2**attempt))

        # All attempts exhausted — fail with descriptive error
        logger.error(
            "ai_generate_llm_validation_exhausted",
            attempts=attempts,
            validation_errors=len(errors),
        )
        # Validation exhaustion is a client/business-contract failure (bad LLM
        # output: wrong day count, over budget, too few/many activities). It is
        # NOT a provider outage, so it must surface as 422 — not 503. Genuine
        # provider/timeout failures are re-raised as ServiceUnavailableException
        # (503) by the upstream except clause above.
        raise ValidationException("AI itinerary generation failed validation")

    # ===================================================================
    # Persistence — Save generated itinerary to database
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
        """Persist the AI-generated itinerary as Trip + nested entities.

        Creates:
        - 1 Trip row
        - N TripDay rows (sorted by day_number)
        - M Activity rows per day (with place_id validation)
        - K Accommodation rows (with hotel_id validation)

        place_id and hotel_id are only set if they reference valid IDs
        from the context that was provided to the LLM.
        """
        # Build lookup sets for validating AI-referenced IDs
        place_ids = {place.id for place in places}
        place_by_id = {place.id: place for place in places}
        hotel_ids = {hotel.id for hotel in hotels}

        # Create the root Trip record
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

        # Create days first and track both AI day number and generated order → TripDay.id mapping.
        sorted_days = sorted(itinerary.days, key=lambda item: item.day_number)
        days: list[Any] = []
        day_number_to_id: dict[int, int] = {}
        day_order_to_id: dict[int, int] = {}
        for idx, day in enumerate(sorted_days):
            # Calculate the actual calendar date for this day
            trip_date = request.start_date + timedelta(days=idx)

            trip_day = await self.repo.get_or_create_day(
                trip_id=trip.id,
                day_number=idx + 1,
                label=day.label,
                date=trip_date.isoformat(),
                destination_name=destination_name,
            )
            days.append(trip_day)
            day_number_to_id[day.day_number] = trip_day.id
            day_order_to_id[idx + 1] = trip_day.id

            # Create activities for this day
            for order_index, activity in enumerate(day.activities):
                # Validate place_id against context — only set if it's a known place
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
                    image=self._activity_image_for_generated_activity(
                        activity,
                        place_id=place_id,
                        place_by_id=place_by_id,
                        places=places,
                    ),
                    transportation=activity.transportation,
                    adult_price=activity.adult_price,
                    child_price=activity.child_price,
                    custom_cost=activity.custom_cost,
                    bus_ticket_price=activity.bus_ticket_price,
                    taxi_cost=activity.taxi_cost,
                    order_index=order_index,
                )

        # Create accommodation records, remapping AI day numbers to persisted TripDay IDs.
        for accommodation in itinerary.accommodations:
            # Validate hotel_id against context — only set if it's a known hotel
            hotel_id = accommodation.hotel_id if accommodation.hotel_id in hotel_ids else None

            remapped_day_ids: list[int] = []
            invalid_day_ids: list[int] = []
            seen_day_ids: set[int] = set()
            for raw_day_id in accommodation.day_ids:
                db_day_id = day_number_to_id.get(raw_day_id) or day_order_to_id.get(raw_day_id)
                if db_day_id is None:
                    invalid_day_ids.append(raw_day_id)
                    continue
                if db_day_id in seen_day_ids:
                    continue
                remapped_day_ids.append(db_day_id)
                seen_day_ids.add(db_day_id)

            if invalid_day_ids:
                logger.warning(
                    "ai_generate_accommodation_invalid_day_ids",
                    trip_id=trip.id,
                    accommodation_name=accommodation.name,
                    raw_day_ids=accommodation.day_ids,
                    invalid_day_ids=invalid_day_ids,
                    valid_day_numbers=sorted(day_number_to_id),
                    persisted_day_ids=sorted(day_order_to_id.values()),
                )

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
                day_ids=remapped_day_ids,
            )

        # Flush all inserts, then re-fetch with eager loading
        await self.session.flush()
        trip_id = trip.id
        self.session.expire_all()
        refreshed = await self.repo.get_with_full_data(trip_id)
        if not refreshed:
            raise ServiceUnavailableException("Generated trip could not be loaded")
        return refreshed

    def _normalize_itinerary_costs(
        self,
        itinerary: AgentItinerary,
        *,
        request: GenerateItineraryRequest,
        places: list[Place],
        hotels: list[Hotel],
    ) -> CostNormalizationResult:
        """Normalize partial LLM cost output into repo-consistent semantics."""
        llm_total_cost = itinerary.total_cost or 0
        place_by_id = {place.id: place for place in places}
        hotel_by_id = {hotel.id: hotel for hotel in hotels}
        used_fallback_estimates = False

        for day in itinerary.days:
            for activity in day.activities:
                matched_place = place_by_id.get(activity.place_id) if activity.place_id else None
                used_fallback_estimates = (
                    self._normalize_activity_costs(activity, matched_place=matched_place)
                    or used_fallback_estimates
                )

        for accommodation in itinerary.accommodations:
            matched_hotel = (
                hotel_by_id.get(accommodation.hotel_id) if accommodation.hotel_id else None
            )
            used_fallback_estimates = (
                self._normalize_accommodation_costs(
                    accommodation,
                    matched_hotel=matched_hotel,
                )
                or used_fallback_estimates
            )

        recomputed_total = self._calculate_generated_total_cost(
            itinerary,
            adults=request.adults,
            children=request.children,
        )
        if itinerary.total_cost != recomputed_total:
            logger.info(
                "ai_generate_total_cost_recomputed",
                llm_total_cost=itinerary.total_cost,
                recomputed_total_cost=recomputed_total,
            )
            itinerary.total_cost = recomputed_total
        return CostNormalizationResult(
            llm_total_cost=llm_total_cost,
            recomputed_total_cost=recomputed_total,
            used_fallback_estimates=used_fallback_estimates,
        )

    def _normalize_activity_costs(
        self,
        activity: Any,
        *,
        matched_place: Place | None,
    ) -> bool:
        """Backfill missing cost fields without overwriting explicit model output."""
        inferred_costs = False
        adult_price = activity.adult_price or 0
        child_price = activity.child_price or 0
        custom_cost = activity.custom_cost or 0
        has_person_prices = adult_price > 0 or child_price > 0
        has_custom_cost = custom_cost > 0

        if activity.transportation == "bus" and not activity.bus_ticket_price:
            activity.bus_ticket_price = DEFAULT_TRANSPORT_COSTS["bus"]
            inferred_costs = True
        if activity.transportation == "taxi" and not activity.taxi_cost:
            activity.taxi_cost = DEFAULT_TRANSPORT_COSTS["taxi"]
            inferred_costs = True

        if has_person_prices or has_custom_cost:
            if (
                activity.type in {"food", "attraction"}
                and activity.child_price is None
                and (activity.adult_price or 0) > 0
            ):
                activity.child_price = self._default_child_price(activity.adult_price or 0)
                inferred_costs = True
            return inferred_costs

        avg_cost = matched_place.avg_cost if matched_place and matched_place.avg_cost > 0 else 0
        defaults = DEFAULT_ACTIVITY_COSTS[activity.type]

        if activity.type in {"food", "attraction"}:
            activity.adult_price = avg_cost or defaults["adult"]
            if activity.child_price is None:
                child_seed = avg_cost or defaults["adult"]
                activity.child_price = self._default_child_price(child_seed)
            return True

        if activity.custom_cost is None:
            activity.custom_cost = avg_cost or defaults["custom"]
            return True

        return inferred_costs

    def _normalize_accommodation_costs(
        self,
        accommodation: Any,
        *,
        matched_hotel: Hotel | None,
    ) -> bool:
        """Fill missing accommodation pricing from hotel context when possible."""
        inferred_costs = False
        if (accommodation.price_per_night or 0) <= 0 and matched_hotel:
            accommodation.price_per_night = matched_hotel.price_per_night
            inferred_costs = True

        if (accommodation.total_price or 0) > 0:
            return inferred_costs

        if (accommodation.price_per_night or 0) <= 0:
            return inferred_costs

        duration = accommodation.duration
        if duration is None or duration <= 0:
            duration = max(1, len(accommodation.day_ids) - 1)
            accommodation.duration = duration
            inferred_costs = True

        accommodation.total_price = self._calculate_accommodation_total(
            price_per_night=accommodation.price_per_night,
            booking_type=accommodation.booking_type,
            duration=duration,
        )
        return True

    def _calculate_generated_total_cost(
        self,
        itinerary: AgentItinerary,
        *,
        adults: int,
        children: int,
    ) -> int:
        total = 0
        for day in itinerary.days:
            for activity in day.activities:
                total += self._calculate_generated_activity_cost(
                    activity,
                    adults=adults,
                    children=children,
                )
        for accommodation in itinerary.accommodations:
            total += accommodation.total_price or 0
        return total

    def _calculate_generated_activity_cost(
        self,
        activity: Any,
        *,
        adults: int,
        children: int,
    ) -> int:
        total = 0
        adult_price = activity.adult_price or 0
        child_price = activity.child_price or 0
        custom_cost = activity.custom_cost or 0
        has_person_prices = adult_price > 0 or child_price > 0

        if activity.transportation == "bus":
            total += (activity.bus_ticket_price or 0) * (adults + children)
        elif activity.transportation == "taxi":
            total += activity.taxi_cost or 0

        if activity.type in {"food", "attraction"}:
            if has_person_prices:
                total += (adult_price * adults) + (child_price * children)
            else:
                total += custom_cost
            return total

        if custom_cost > 0:
            total += custom_cost
        elif has_person_prices:
            total += adult_price + child_price

        return total

    @staticmethod
    def _calculate_accommodation_total(
        *,
        price_per_night: int,
        booking_type: str | None,
        duration: int,
    ) -> int:
        if booking_type == "hourly":
            return round(price_per_night * 0.15) * duration
        if booking_type == "daily":
            return round(price_per_night * 1.5) * duration
        return price_per_night * duration

    @staticmethod
    def _default_child_price(adult_price: int) -> int:
        return round(adult_price * CHILD_PRICE_RATIO)

    def _activity_image_for_generated_activity(
        self,
        activity: Any,
        *,
        place_id: int | None,
        place_by_id: dict[int, Place],
        places: list[Place],
    ) -> str:
        """Resolve a persisted activity image from known place context.

        Gemini does not generate image URLs. When the model references a valid
        `place_id`, prefer the DB-backed `Place.image`. If the id is missing or
        invalid, fall back to a conservative exact match on generated name and
        location so reloads still have a stable thumbnail when source truth is
        obvious.
        """
        if place_id is not None:
            matched_place = place_by_id.get(place_id)
            if matched_place and matched_place.image:
                return matched_place.image

        normalized_name = self._normalize_text(getattr(activity, "name", ""))
        normalized_location = self._normalize_text(getattr(activity, "location", ""))

        for place in places:
            if self._normalize_text(place.name) != normalized_name:
                continue
            place_location = self._normalize_text(place.location)
            if normalized_location and place_location and place_location != normalized_location:
                continue
            return place.image or ""

        return ""

    # ===================================================================
    # Validation — Business rules for generated itineraries
    # ===================================================================

    def _validate_itinerary(
        self,
        itinerary: AgentItinerary,
        request: GenerateItineraryRequest,
        day_count: int,
        *,
        cost_result: CostNormalizationResult | None = None,
    ) -> None:
        """Validate the AI-generated itinerary against business rules.

        Checks:
        1. Day count matches the requested trip duration
        2. Total cost doesn't exceed budget by more than 20% tolerance
        3. Each day has between min and max activities (from settings)
        """
        # Check day count matches request
        if len(itinerary.days) != day_count:
            raise LLMGenerationError("AI itinerary day count does not match request")

        budget_limit = int(request.budget * 1.2)
        budget_total_cost = itinerary.total_cost
        if (
            cost_result
            and cost_result.used_fallback_estimates
            and cost_result.llm_total_cost > 0
            and cost_result.recomputed_total_cost > budget_limit
            and cost_result.llm_total_cost <= budget_limit
        ):
            logger.warning(
                "ai_generate_budget_soft_overshoot",
                budget=request.budget,
                llm_total_cost=cost_result.llm_total_cost,
                recomputed_total_cost=cost_result.recomputed_total_cost,
            )
            budget_total_cost = cost_result.llm_total_cost

        # itinerary.total_cost is recomputed from nested data before validation.
        # If cost gaps were filled conservatively, prefer a soft gate over the
        # model-supplied total instead of rejecting an otherwise valid plan.
        if budget_total_cost > budget_limit:
            raise LLMGenerationError("AI itinerary exceeds budget tolerance")

        # Check per-day activity count bounds
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
    # Static utility methods
    # ===================================================================

    @staticmethod
    def _day_count(request: GenerateItineraryRequest) -> int:
        """Calculate trip duration in days from the request dates.

        Validates that duration is between 1 and MAX_TRIP_DAYS.

        Note:
            MAX_TRIP_DAYS is currently 30 — a temporary technical limit for the
            blocking-REST generation flow. Trips exceeding this raise a
            user-visible error (Vietnamese generic message). For async generation
            that can handle longer trips, see follow-up task 00060L.
        """
        day_count = (request.end_date - request.start_date).days + 1
        if day_count < 1 or day_count > MAX_TRIP_DAYS:
            raise ValidationException(
                "Số ngày chuyến đi không hợp lệ. "
                f"Vui lòng liên hệ hỗ trợ nếu cần lịch trình dài hơn {MAX_TRIP_DAYS} ngày."
            )
        return day_count

    @staticmethod
    def _minimum_required_places(day_count: int) -> int:
        """Calculate minimum places needed for meaningful AI generation.

        Formula: max(day_count * 2, 2), capped at 6.
        Ensures the LLM has enough place variety for each day.
        """
        return min(max(day_count * 2, 2), 6)

    @staticmethod
    def _normalize_interests(interests: list[str]) -> list[str]:
        """Convert user interest strings to valid DB place categories.

        Applies alias mapping (e.g. "culture" → "attraction") and
        filters out any interests that don't map to valid categories.
        Preserves insertion order and removes duplicates.
        """
        categories: list[str] = []
        for interest in interests:
            normalized = INTEREST_CATEGORY_ALIASES.get(interest, interest)
            if normalized in VALID_ACTIVITY_CATEGORIES and normalized not in categories:
                categories.append(normalized)
        return categories

    @staticmethod
    def _place_context(place: Place) -> dict[str, Any]:
        """Build a place context dict for inclusion in the LLM prompt.

        Returns camelCase keys to match the prompt template format.
        """
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
        """Build a hotel context dict for inclusion in the LLM prompt.

        Returns camelCase keys to match the prompt template format.
        """
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
        """Calculate elapsed time in milliseconds since `started_at`.

        Uses perf_counter for high-resolution timing.
        """
        return round((perf_counter() - started_at) * 1000)

    @staticmethod
    def _estimate_tokens(text: str) -> int:
        """Rough token count estimate for logging purposes.

        Uses the simple heuristic of ~4 characters per token.
        """
        return max(1, round(len(text) / 4))

    @staticmethod
    def _normalize_text(value: str | None) -> str:
        return " ".join((value or "").strip().lower().split())
