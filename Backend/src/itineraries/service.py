"""Itinerary domain service.

Handles trip CRUD, auto-save with diff/sync, share/claim, rating,
and C.1 AI itinerary generation through ItineraryPipeline.

Service method groups:
  1. Generate  — AI-powered trip creation via ItineraryPipeline
  2. CRUD      — Manual create, read, update, delete trips
  3. Rating    — Upsert user ratings on trips
  4. Share     — Create share links and resolve shared trips
  5. Claim     — Guest trip ownership transfer after login
  6. Activity CRUD       — Add/update/delete activities within a day
  7. Accommodation CRUD  — Add/delete accommodations for a trip
  8. Private helpers      — Internal methods for data sync, mapping, etc.
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.core.schema import PaginatedResponse
from src.core.security import create_opaque_token, hash_token
from src.itineraries.models.extras import GuestClaimToken
from src.itineraries.models.trip import Activity, Trip, TripDay
from src.itineraries.pipeline import ItineraryPipeline
from src.itineraries.repository import TripRepository
from src.itineraries.schemas import (
    AccommodationSchema,
    ActivitySchema,
    ChatSessionListResponse,
    ChatSessionResponse,
    ClaimTripRequest,
    CreateTripRequest,
    DaySchema,
    ExtraExpenseSchema,
    GenerateItineraryRequest,
    ItineraryResponse,
    ShareResponse,
    TravelerInfo,
    UpdateTripRequest,
)
from src.shared.service import BaseService

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

# Maximum number of active (non-archived) trips a single user can have.
# Prevents unbounded resource consumption per user account.
MAX_ACTIVE_TRIPS = 5


class ItineraryService(BaseService):
    """Business logic for itineraries.

    Orchestrates between the TripRepository (data access), ItineraryPipeline
    (AI generation), and schema conversion to produce API responses.
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self.session = session
        self.repo = TripRepository(session)

    # ===================================================================
    # Generate — Phase C.1 AI-powered trip generation
    # ===================================================================

    async def generate(
        self, request: GenerateItineraryRequest, user_id: int | None
    ) -> ItineraryResponse:
        """AI-powered trip generation using the C.1 direct pipeline.

        Delegates to ItineraryPipeline which:
        1. Resolves destination from DB
        2. Gathers place/hotel context for the LLM
        3. Calls Gemini with retry logic
        4. Persists the generated Trip, Days, Activities, Accommodations

        For guest users (user_id=None), issues a claim token so they
        can claim the trip after registering.
        """
        pipeline = ItineraryPipeline(self.session)
        trip = await pipeline.generate(request, user_id=user_id)
        resp = await self._to_response(trip)

        # Guest users receive a claim token for later ownership transfer
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    # ===================================================================
    # CRUD — Manual trip lifecycle operations
    # ===================================================================

    async def create_manual(
        self, request: CreateTripRequest, user_id: int | None
    ) -> ItineraryResponse:
        """Create an empty manual trip (no AI generation).

        Enforces the per-user trip limit for authenticated users.
        Guest-created trips receive a claim token in the response.

        DB-DATA-01 Fix: Automatically creates trip_days based on date range
        to prevent 74% of trips from having no days (which breaks generate pipeline).
        """
        # Check trip count limit for authenticated users
        if user_id is not None:
            await self._check_trip_limit(user_id)

        # Create the trip record
        trip = await self._create_trip_record(
            destination=request.destination,
            trip_name=request.trip_name,
            start_date=request.start_date,
            end_date=request.end_date,
            budget=request.budget,
            adults_count=request.adults_count,
            children_count=request.children_count,
            interests=request.interests,
            user_id=user_id,
        )

        # DB-DATA-01 Fix: Seed trip_days based on date range
        from datetime import timedelta

        start = request.start_date
        end = request.end_date
        day_count = (end - start).days + 1

        for idx in range(day_count):
            current_date = start + timedelta(days=idx)
            await self.repo.get_or_create_day(
                trip_id=trip.id,
                day_number=idx + 1,
                label=f"Ngày {idx + 1}",
                date=current_date.isoformat(),
                destination_name=request.destination,
            )

        resp = await self._to_response(trip)

        # Issue claim token for guest-created trips
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    async def get_by_id(self, trip_id: int, user_id: int) -> ItineraryResponse:
        """Retrieve a trip with full nested data (days, activities, accommodations).

        Raises NotFoundException if trip doesn't exist.
        Raises ForbiddenException if the requester is not the trip owner.
        """
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return await self._to_response(trip)

    async def list_by_user(self, user_id: int, page: int = 1, size: int = 20) -> PaginatedResponse:
        """List trips for a user with pagination.

        Returns lightweight responses (no nested days/activities) for
        efficient listing in TripLibrary and TripHistory pages.
        """
        skip = (page - 1) * size
        trips, total = await self.repo.list_by_user(user_id, skip=skip, limit=size)
        items = [await self._to_list_item(t) for t in trips]
        return PaginatedResponse(items=items, total=total, page=page, page_size=size)

    async def update(
        self, trip_id: int, data: UpdateTripRequest, user_id: int
    ) -> ItineraryResponse:
        """Auto-save endpoint: apply partial updates with diff/sync logic.

        Update flow:
        1. Validate ownership
        2. Update trip-level scalar fields (name, budget)
        3. Sync days + activities (diff: create new, update existing, delete removed)
        4. Sync accommodations (same diff logic)
        5. Recalculate total_cost from all nested cost fields
        6. Re-fetch fresh data to return consistent response
        """
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # Step 1: Update trip-level fields (only if provided)
        if data.trip_name is not None:
            trip.trip_name = data.trip_name
        if data.budget is not None:
            trip.budget = data.budget
        # BUG-BE-001 fix: Update traveler count if provided
        if data.traveler_info is not None:
            trip.adults_count = data.traveler_info.adults
            trip.children_count = data.traveler_info.children

        # Step 2: Sync days + activities (diff logic — handles create/update/delete)
        if data.days is not None:
            await self._sync_days(trip, data.days)

        # Step 3: Sync accommodations (same diff pattern)
        if data.accommodations is not None:
            await self._sync_accommodations(trip, data.accommodations)

        # Step 4: Recalculate total cost from all nested entities
        await self.session.flush()
        trip.total_cost = self._calculate_total_cost(trip)
        await self.session.flush()

        # Step 5: Re-fetch to get consistent data (expire cached ORM relations)
        self.session.expire_all()
        trip = await self.repo.get_with_full_data(trip_id)
        return await self._to_response(trip)

    async def delete(self, trip_id: int, user_id: int) -> None:
        """Permanently delete a trip and all nested data (cascade).

        Validates ownership before deletion.
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.delete_trip(trip)

    # ===================================================================
    # Rating — User feedback on trips
    # ===================================================================

    async def rate(self, trip_id: int, user_id: int, rating: int, feedback: str | None) -> None:
        """Upsert a rating (1-5 stars) with optional text feedback.

        Uses upsert semantics — calling again updates the existing rating.
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.upsert_rating(trip_id, rating, feedback)

    # ===================================================================
    # Share — Public read-only trip access via opaque tokens
    # ===================================================================

    async def share(self, trip_id: int, user_id: int) -> ShareResponse:
        """Create a public share link for the trip.

        If a non-revoked share link already exists, returns it with a
        redacted token (the raw token cannot be recovered from the hash).
        Otherwise, generates a new opaque token, stores its hash, and
        returns the full share URL with the raw token.
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # Check for existing non-revoked share link
        existing = await self.repo.get_share_link(trip_id)
        if existing and existing.revoked_at is None:
            # Already shared — return existing token info (cannot recover raw token)
            settings = get_settings()
            return ShareResponse(
                share_url=f"{settings.frontend_url}/shared/[REDACTED]",
                share_token="[REDACTED — already issued]",
                expires_at=existing.expires_at,
            )

        # Generate new opaque share token and store its hash
        raw_token, token_hash = create_opaque_token("share")
        await self.repo.create_share_link(
            trip_id=trip_id,
            token_hash=token_hash,
            created_by_user_id=user_id,
            permission="view",
        )

        # Build the shareable URL using the frontend base URL from settings
        settings = get_settings()
        return ShareResponse(
            share_url=f"{settings.frontend_url}/shared/{raw_token}",
            share_token=raw_token,
            expires_at=None,
        )

    async def get_by_share_token(self, raw_token: str) -> ItineraryResponse:
        """Resolve a share token to a full trip response (public, no auth).

        Validates that the token exists, hasn't been revoked, and hasn't
        expired. Returns 404 for any invalid state.
        """
        # Hash the raw token to look up the stored link
        token_hash = hash_token(raw_token)
        link = await self.repo.get_share_link_by_hash(token_hash)

        # Validate link state
        if not link or link.revoked_at is not None:
            raise NotFoundException("Share link not found or revoked")
        if link.expires_at and link.expires_at < datetime.now(UTC):
            raise NotFoundException("Share link expired")

        # Fetch and return the full trip data
        trip = await self.repo.get_with_full_data(link.trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        return await self._to_response(trip)

    # ===================================================================
    # Claim — Guest trip ownership transfer
    # ===================================================================

    async def claim(self, trip_id: int, user_id: int, request: ClaimTripRequest) -> dict:
        """Transfer ownership of a guest-created trip to an authenticated user.

        Validation steps:
        1. Trip must exist and have no current owner (user_id is None)
        2. Claim token must be valid (matching hash, not consumed, not expired)
        3. On success: consume the token and set trip.user_id atomically
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id is not None:
            raise ConflictException("Trip already has an owner")

        # Hash the provided claim token for comparison
        token_hash = hash_token(request.claim_token)
        claim_tokens = await self.repo.get_claim_tokens_for_trip(trip_id)

        # Find a valid, unconsumed, non-expired token matching the hash
        valid_token: GuestClaimToken | None = None
        for ct in claim_tokens:
            if ct.token_hash == token_hash and ct.consumed_at is None:
                if ct.expires_at > datetime.now(UTC):
                    valid_token = ct
                    break

        if not valid_token:
            raise ForbiddenException("Invalid or expired claim token")

        # Consume token + transfer ownership in one flush (atomic operation)
        valid_token.consumed_at = datetime.now(UTC)
        trip.user_id = user_id
        await self.session.flush()

        return {"claimed": True, "trip_id": trip_id}

    # ===================================================================
    # Activity CRUD — Sub-resource operations within trip days
    # ===================================================================

    async def add_activity(
        self, trip_id: int, day_id: int, data: ActivitySchema, user_id: int
    ) -> ActivitySchema:
        """Add a new activity to a specific day within the trip.

        Validates ownership and ensures the day belongs to the trip.
        """
        trip = await self._verify_owner(trip_id, user_id)

        # Verify the target day belongs to this trip
        day_ids = {d.id for d in trip.days}
        if day_id not in day_ids:
            raise NotFoundException("Day not found in this trip")

        activity = await self.repo.add_activity(
            trip_day_id=day_id,
            name=data.name,
            time=data.time,
            end_time=data.end_time,
            type=data.type,
            location=data.location,
            description=data.description,
            image=data.image,
            transportation=data.transportation,
            adult_price=data.adult_price,
            child_price=data.child_price,
            custom_cost=data.custom_cost,
            bus_ticket_price=data.bus_ticket_price,
            taxi_cost=data.taxi_cost,
            order_index=0,
        )
        return self._activity_to_schema(activity)

    async def update_activity(
        self, trip_id: int, activity_id: int, data: ActivitySchema, user_id: int
    ) -> ActivitySchema:
        """Update an existing activity's details.

        Only non-null, non-identity fields from the request are applied.
        The `id` and `extra_expenses` fields are excluded from the update.
        """
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_for_trip(activity_id, trip_id)
        if not activity:
            raise NotFoundException("Activity not found")

        # Build update dict excluding identity and nested fields
        updates = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if k not in ("id", "extra_expenses")
        }
        activity = await self.repo.update_activity(activity, **updates)
        return self._activity_to_schema(activity)

    async def delete_activity(self, trip_id: int, activity_id: int, user_id: int) -> None:
        """Remove an activity from the trip (cascade deletes extra expenses)."""
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_for_trip(activity_id, trip_id)
        if not activity:
            raise NotFoundException("Activity not found")
        await self.repo.delete_activity(activity)

    # ===================================================================
    # Accommodation CRUD — Lodging sub-resource operations
    # ===================================================================

    async def add_accommodation(
        self, trip_id: int, data: AccommodationSchema, user_id: int
    ) -> AccommodationSchema:
        """Add a new accommodation record to the trip.

        Provides defaults for required fields when not specified.
        """
        await self._verify_owner(trip_id, user_id)
        acc = await self.repo.add_accommodation(
            trip_id=trip_id,
            name=data.name or "",
            check_in=data.check_in or "",
            check_out=data.check_out or "",
            price_per_night=data.price_per_night or 0,
            total_price=data.total_price or 0,
            booking_url=None,
            booking_type=data.booking_type,
            duration=data.duration,
            day_ids=data.day_ids,
        )
        return AccommodationSchema.model_validate(acc, from_attributes=True)

    async def delete_accommodation(self, trip_id: int, acc_id: int, user_id: int) -> None:
        """Remove an accommodation record from the trip."""
        await self._verify_owner(trip_id, user_id)
        acc = await self.repo.get_accommodation_for_trip(acc_id, trip_id)
        if not acc:
            raise NotFoundException("Accommodation not found")
        await self.repo.delete_accommodation(acc)

    # ===================================================================
    # Private helpers — Internal utility methods
    # ===================================================================

    # --- Trip record creation ---

    async def _create_trip_record(
        self, *, user_id: int | None, ai_generated: bool = False, **kwargs: object
    ) -> Trip:
        """Create a new Trip row and return it with eager-loaded relations.

        Checks trip limit for authenticated users before creation.
        """
        if user_id is not None:
            await self._check_trip_limit(user_id)
        trip = await self.repo.create_trip(
            user_id=user_id, ai_generated=ai_generated, status="draft", **kwargs
        )
        return await self.repo.get_with_full_data(trip.id)

    # --- Authorization helpers ---

    async def _check_trip_limit(self, user_id: int) -> None:
        """Enforce maximum active trips per user.

        Active trips are those with status in ('draft', 'planned', 'confirmed').
        Raises ConflictException when the limit is exceeded.
        """
        count = await self.repo.count_active_by_user(user_id)
        if count >= MAX_ACTIVE_TRIPS:
            raise ConflictException(f"Maximum {MAX_ACTIVE_TRIPS} active trips allowed")

    async def _verify_owner(self, trip_id: int, user_id: int) -> Trip:
        """Load a trip with full data and verify the requester is the owner.

        Returns the loaded trip on success.
        Raises NotFoundException or ForbiddenException on failure.
        """
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return trip

    # --- Token helpers ---

    async def _issue_claim_token(self, trip_id: int) -> str:
        """Generate a one-time claim token for guest-created trips.

        The raw token is returned to the client; only the hash is stored.
        Token expires after 24 hours.
        """
        raw_token, token_hash = create_opaque_token("claim")
        expires_at = datetime.now(UTC) + timedelta(hours=24)
        await self.repo.create_claim_token(
            trip_id=trip_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return raw_token

    # --- Diff/sync helpers for auto-save ---

    async def _sync_days(self, trip: Trip, incoming_days: list[DaySchema]) -> None:
        """Synchronize trip days with incoming data using diff logic.

        Three-way operation:
        1. UPDATE: Days with matching IDs get their fields updated
        2. CREATE: Days without IDs (or unknown IDs) are created as new
        3. DELETE: Existing days not present in incoming list are removed
        """
        existing_map = {d.id: d for d in trip.days if d.id is not None}
        incoming_day_ids: set[int] = set()

        for idx, day_data in enumerate(incoming_days):
            if day_data.id and day_data.id in existing_map:
                # UPDATE existing day — match by ID
                incoming_day_ids.add(day_data.id)
                day = existing_map[day_data.id]
                day.label = day_data.label
                day.date = day_data.date
                day.destination_name = day_data.destination_name
                day.day_number = idx + 1
                # Recursively sync activities within this day
                await self._sync_activities(day, day_data.activities)
            else:
                # CREATE new day + all its activities
                day = await self.repo.get_or_create_day(
                    trip_id=trip.id,
                    day_number=idx + 1,
                    label=day_data.label,
                    date=day_data.date,
                    destination_name=day_data.destination_name,
                )
                incoming_day_ids.add(day.id)  # FIX: Keep the day from being deleted
                # Sync activities within this day (handles diff/merge safely)
                await self._sync_activities(day, day_data.activities)

        # DELETE days not present in incoming list (cascade deletes activities)
        for existing_id in existing_map:
            if existing_id not in incoming_day_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_activities(self, day: TripDay, incoming: list[ActivitySchema]) -> None:
        """Synchronize activities within a single day using diff logic.

        Same three-way pattern as _sync_days:
        1. UPDATE: Match by ID, apply field changes
        2. CREATE: New activities without matching IDs
        3. DELETE: Remove activities not in incoming list
        """
        existing_map = {a.id: a for a in day.activities if a.id is not None}
        incoming_ids: set[int] = set()

        for idx, act_data in enumerate(incoming):
            if act_data.id and act_data.id in existing_map:
                # UPDATE existing activity — apply non-null field values
                incoming_ids.add(act_data.id)
                activity = existing_map[act_data.id]
                for field in (
                    "name",
                    "time",
                    "end_time",
                    "type",
                    "location",
                    "description",
                    "image",
                    "transportation",
                    "adult_price",
                    "child_price",
                    "custom_cost",
                    "bus_ticket_price",
                    "taxi_cost",
                    "place_id",
                ):
                    val = getattr(act_data, field, None)
                    if val is not None:
                        setattr(activity, field, val)
                # Update sort order to match incoming position
                activity.order_index = idx
            else:
                # CREATE new activity in this day
                await self.repo.add_activity(
                    trip_day_id=day.id,
                    name=act_data.name,
                    time=act_data.time,
                    end_time=act_data.end_time,
                    type=act_data.type,
                    location=act_data.location,
                    description=act_data.description,
                    image=act_data.image,
                    transportation=act_data.transportation,
                    adult_price=act_data.adult_price,
                    child_price=act_data.child_price,
                    custom_cost=act_data.custom_cost,
                    bus_ticket_price=act_data.bus_ticket_price,
                    taxi_cost=act_data.taxi_cost,
                    order_index=idx,
                    place_id=act_data.place_id,
                )

        # DELETE activities not present in incoming list
        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_accommodations(self, trip: Trip, incoming: list[AccommodationSchema]) -> None:
        """Synchronize accommodations using diff logic.

        Same three-way pattern:
        1. UPDATE: Match by ID, apply non-null field changes
        2. CREATE: New accommodations without matching IDs
        3. DELETE: Remove accommodations not in incoming list
        """
        existing_map = {a.id: a for a in trip.accommodations if a.id is not None}
        incoming_ids: set[int] = set()

        for acc_data in incoming:
            if acc_data.id and acc_data.id in existing_map:
                # UPDATE existing accommodation — apply non-null fields
                incoming_ids.add(acc_data.id)
                acc = existing_map[acc_data.id]
                if acc_data.name is not None:
                    acc.name = acc_data.name
                if acc_data.check_in is not None:
                    acc.check_in = acc_data.check_in
                if acc_data.check_out is not None:
                    acc.check_out = acc_data.check_out
                if acc_data.price_per_night is not None:
                    acc.price_per_night = acc_data.price_per_night
                if acc_data.total_price is not None:
                    acc.total_price = acc_data.total_price
                if acc_data.day_ids is not None:
                    acc.day_ids = acc_data.day_ids
                if acc_data.booking_type is not None:
                    acc.booking_type = acc_data.booking_type
                if acc_data.duration is not None:
                    acc.duration = acc_data.duration
            else:
                # CREATE new accommodation
                await self.repo.add_accommodation(
                    trip_id=trip.id,
                    name=acc_data.name or "",
                    check_in=acc_data.check_in or "",
                    check_out=acc_data.check_out or "",
                    price_per_night=acc_data.price_per_night or 0,
                    total_price=acc_data.total_price or 0,
                    booking_type=acc_data.booking_type,
                    duration=acc_data.duration,
                    day_ids=acc_data.day_ids,
                )

        # DELETE accommodations not present in incoming list
        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    # --- Cost calculation ---

    def _calculate_total_cost(self, trip: Trip) -> int:
        """Calculate the total cost of a trip from all nested cost fields.

        Sums:
        - Activity costs using the same semantics as the frontend workspace
        - Activity extra expenses
        - Day-level extra expenses
        - Accommodation total prices
        """
        total = 0
        adults = max(trip.adults_count or 0, 0)
        children = max(trip.children_count or 0, 0)

        # Sum costs from all days and their activities
        for day in trip.days:
            for activity in day.activities:
                total += self._calculate_activity_cost(
                    activity,
                    adults=adults,
                    children=children,
                )
                # Activity-level extra expenses
                for expense in activity.extra_expenses:
                    total += expense.amount
            # Day-level extra expenses
            for expense in day.extra_expenses:
                total += expense.amount

        # Sum accommodation costs
        for acc in trip.accommodations:
            total += acc.total_price or 0

        return total

    @staticmethod
    def _calculate_activity_cost(
        activity: Activity,
        *,
        adults: int,
        children: int,
    ) -> int:
        """Mirror frontend cost rules so persisted totals match user-visible totals."""
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

    # --- ORM-to-schema conversion helpers ---

    @staticmethod
    def _activity_to_schema(activity: Activity) -> ActivitySchema:
        """Convert Activity ORM to ActivitySchema without triggering lazy loads.

        Used for single-activity CRUD responses where we don't need to
        load the full trip tree. BUG-BE-002 fix: Serialize actual extra_expenses.
        """
        # Serialize extra_expenses if they exist (may be unloaded, that's okay)
        # If relationship is not loaded, accessing it will return empty list due to
        # SQLAlchemy default behavior for unloaded relationships
        extra_expenses_list = (
            [
                ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
                for e in activity.extra_expenses
            ]
            if activity.extra_expenses
            else []
        )

        return ActivitySchema(
            id=activity.id,
            name=activity.name,
            time=activity.time,
            end_time=activity.end_time,
            type=activity.type,
            location=activity.location,
            description=activity.description,
            image=activity.image,
            transportation=activity.transportation,
            adult_price=activity.adult_price,
            child_price=activity.child_price,
            custom_cost=activity.custom_cost,
            bus_ticket_price=activity.bus_ticket_price,
            taxi_cost=activity.taxi_cost,
            extra_expenses=extra_expenses_list,  # BUG-BE-002 fix: use actual data
            place_id=activity.place_id,
            latitude=activity.place.latitude if getattr(activity, "place", None) else None,
            longitude=activity.place.longitude if getattr(activity, "place", None) else None,
            city=activity.place.destination.name if (getattr(activity, "place", None) and activity.place.destination) else None,
        )

    async def _to_response(self, trip: Trip) -> ItineraryResponse:
        """Convert a fully-loaded Trip ORM to ItineraryResponse schema.

        Manually maps all nested relationships (days → activities → expenses)
        to avoid Pydantic's `from_attributes` which can trigger lazy loads
        in async SQLAlchemy sessions.
        """
        # Build day schemas with nested activities and expenses
        days = []
        for day in trip.days:
            # Map each activity with its extra expenses
            activities = []
            for act in day.activities:
                expenses = [
                    ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
                    for e in act.extra_expenses
                ]
                activities.append(
                    ActivitySchema(
                        id=act.id,
                        name=act.name,
                        time=act.time,
                        end_time=act.end_time,
                        type=act.type,
                        location=act.location,
                        description=act.description,
                        image=act.image,
                        transportation=act.transportation,
                        adult_price=act.adult_price,
                        child_price=act.child_price,
                        custom_cost=act.custom_cost,
                        bus_ticket_price=act.bus_ticket_price,
                        taxi_cost=act.taxi_cost,
                        extra_expenses=expenses,
                        latitude=act.place.latitude if act.place else None,
                        longitude=act.place.longitude if act.place else None,
                        place_id=act.place_id,
                        city=act.place.destination.name if (act.place and act.place.destination) else None,
                    )
                )

            # Map day-level extra expenses
            day_expenses = [
                ExtraExpenseSchema(id=e.id, name=e.name, amount=e.amount, category=e.category)
                for e in day.extra_expenses
            ]

            days.append(
                DaySchema(
                    id=day.id,
                    label=day.label,
                    date=day.date,
                    destination_name=day.destination_name,
                    activities=activities,
                    extra_expenses=day_expenses,
                )
            )

        # Map accommodations (flat list, no deep nesting)
        accommodations = [
            AccommodationSchema(
                id=a.id,
                name=a.name,
                check_in=a.check_in,
                check_out=a.check_out,
                price_per_night=a.price_per_night,
                total_price=a.total_price,
                booking_type=a.booking_type,
                duration=a.duration,
                day_ids=a.day_ids,
            )
            for a in trip.accommodations
        ]

        # Assemble the full response
        return ItineraryResponse(
            id=trip.id,
            destination=trip.destination,
            trip_name=trip.trip_name,
            start_date=trip.start_date,
            end_date=trip.end_date,
            budget=trip.budget,
            total_cost=trip.total_cost,
            traveler_info=TravelerInfo(
                adults=trip.adults_count,
                children=trip.children_count,
                total=trip.adults_count + trip.children_count,
            ),
            interests=trip.interests or [],
            days=days,
            accommodations=accommodations,
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )

    async def _to_list_item(self, trip: Trip) -> ItineraryResponse:
        """Convert a Trip to a lightweight response for list views.

        Returns empty arrays for days and accommodations to keep
        the response payload small for paginated listing pages.
        """
        return ItineraryResponse(
            id=trip.id,
            destination=trip.destination,
            trip_name=trip.trip_name,
            start_date=trip.start_date,
            end_date=trip.end_date,
            budget=trip.budget,
            total_cost=trip.total_cost,
            traveler_info=TravelerInfo(
                adults=trip.adults_count,
                children=trip.children_count,
                total=trip.adults_count + trip.children_count,
            ),
            interests=trip.interests or [],
            days=[],  # Omitted for list views — loaded on detail view
            accommodations=[],  # Omitted for list views
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )

    # ===================================================================
    # Chat Sessions — Trip-bound companion chat sessions
    # ===================================================================

    async def create_chat_session(self, trip_id: int, user_id: int) -> ChatSessionResponse:
        """Create a new chat session for a trip.

        Enforces trip ownership before creating.
        Generates a unique thread_id for the session.
        """
        import uuid

        trip = await self._verify_owner(trip_id, user_id)

        session = await self.repo.create_chat_session(
            trip_id=trip.id,
            user_id=user_id,
            thread_id=f"trip-{trip.id}-{uuid.uuid4().hex[:12]}",
            status="active",
        )
        return self._to_chat_session_response(session)

    async def list_chat_sessions(
        self, trip_id: int, user_id: int, skip: int = 0, limit: int = 20
    ) -> ChatSessionListResponse:
        """List chat sessions for a trip. Enforces ownership."""
        await self._verify_owner(trip_id, user_id)
        sessions, total = await self.repo.list_sessions_by_trip(trip_id, skip=skip, limit=limit)
        return ChatSessionListResponse(
            items=[self._to_chat_session_response(s) for s in sessions],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def get_chat_session(self, session_id: int, user_id: int) -> ChatSessionResponse:
        """Get a chat session by ID. Enforces ownership via trip."""
        session = await self.repo.get_chat_session_by_id(session_id)
        if not session:
            raise NotFoundException("Chat session not found")

        # Verify ownership through the trip
        await self._verify_owner(session.trip_id, user_id)
        return self._to_chat_session_response(session)

    async def rename_chat_session(
        self, session_id: int, user_id: int, title: str
    ) -> ChatSessionResponse:
        """Đổi tên (title) một chat session. Enforces ownership via trip."""
        session = await self.repo.get_chat_session_by_id(session_id)
        if not session:
            raise NotFoundException("Chat session not found")
        await self._verify_owner(session.trip_id, user_id)
        session = await self.repo.update_chat_session_title(session, title)
        return self._to_chat_session_response(session)

    async def delete_chat_session(self, session_id: int, user_id: int) -> None:
        """Xoá một chat session + message (cascade). Enforces ownership via trip."""
        session = await self.repo.get_chat_session_by_id(session_id)
        if not session:
            raise NotFoundException("Chat session not found")
        await self._verify_owner(session.trip_id, user_id)
        await self.repo.delete_chat_session(session)

    def _to_chat_session_response(self, session) -> ChatSessionResponse:
        """Convert ChatSession ORM to ChatSessionResponse schema."""
        return ChatSessionResponse(
            id=session.id,
            trip_id=session.trip_id,
            user_id=session.user_id,
            thread_id=session.thread_id,
            status=session.status,
            title=session.title,
            created_at=session.created_at,
            updated_at=session.updated_at,
        )
