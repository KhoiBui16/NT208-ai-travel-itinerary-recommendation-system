"""Itinerary domain service.

Handles trip CRUD, auto-save with diff/sync, share/claim, rating,
and stub for AI generation (Phase C will replace the stub).
"""

from datetime import UTC, datetime, timedelta

from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import get_settings
from src.core.exceptions import (
    ConflictException,
    ForbiddenException,
    NotFoundException,
)
from src.core.security import create_opaque_token, hash_token
from src.models.extras import GuestClaimToken
from src.models.trip import Trip, TripDay
from src.repositories.trip_repo import TripRepository
from src.schemas.common import PaginatedResponse
from src.schemas.itinerary import (
    AccommodationSchema,
    ActivitySchema,
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
from src.services.base import BaseService

MAX_ACTIVE_TRIPS = 5


class ItineraryService(BaseService):
    """Business logic for itineraries."""

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self.session = session
        self.repo = TripRepository(session)

    # --- Generate (stub for Phase C) ---

    async def generate(
        self, request: GenerateItineraryRequest, user_id: int | None
    ) -> ItineraryResponse:
        """AI-powered trip generation. Stub returns empty trip — Phase C replaces this."""
        trip = await self._create_trip_record(
            destination=request.destination,
            trip_name=f"Trip to {request.destination}",
            start_date=request.start_date,
            end_date=request.end_date,
            budget=request.budget,
            adults_count=request.adults,
            children_count=request.children,
            interests=request.interests,
            user_id=user_id,
            ai_generated=True,
        )
        resp = await self._to_response(trip)
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    # --- CRUD ---

    async def create_manual(
        self, request: CreateTripRequest, user_id: int | None
    ) -> ItineraryResponse:
        if user_id is not None:
            await self._check_trip_limit(user_id)
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
        resp = await self._to_response(trip)
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    async def get_by_id(self, trip_id: int, user_id: int) -> ItineraryResponse:
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return await self._to_response(trip)

    async def list_by_user(self, user_id: int, page: int = 1, size: int = 20) -> PaginatedResponse:
        skip = (page - 1) * size
        trips, total = await self.repo.list_by_user(user_id, skip=skip, limit=size)
        items = [await self._to_list_item(t) for t in trips]
        return PaginatedResponse(items=items, total=total, page=page, page_size=size)

    async def update(
        self, trip_id: int, data: UpdateTripRequest, user_id: int
    ) -> ItineraryResponse:
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # Update trip-level fields
        if data.trip_name is not None:
            trip.trip_name = data.trip_name
        if data.budget is not None:
            trip.budget = data.budget

        # Sync days + activities (diff logic)
        if data.days is not None:
            await self._sync_days(trip, data.days)

        # Sync accommodations
        if data.accommodations is not None:
            await self._sync_accommodations(trip, data.accommodations)

        await self.session.flush()
        trip.total_cost = self._calculate_total_cost(trip)
        await self.session.flush()

        # Re-fetch with fresh relations
        trip = await self.repo.get_with_full_data(trip_id)
        return await self._to_response(trip)

    async def delete(self, trip_id: int, user_id: int) -> None:
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.delete_trip(trip)

    # --- Rating ---

    async def rate(self, trip_id: int, user_id: int, rating: int, feedback: str | None) -> None:
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.upsert_rating(trip_id, rating, feedback)

    # --- Share ---

    async def share(self, trip_id: int, user_id: int) -> ShareResponse:
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        existing = await self.repo.get_share_link(trip_id)
        if existing and existing.revoked_at is None:
            # Already shared — return existing token info (cannot recover raw token)
            settings = get_settings()
            return ShareResponse(
                share_url=f"{settings.frontend_url}/shared/[REDACTED]",
                share_token="[REDACTED — already issued]",
                expires_at=existing.expires_at,
            )

        raw_token, token_hash = create_opaque_token("share")
        await self.repo.create_share_link(
            trip_id=trip_id,
            token_hash=token_hash,
            created_by_user_id=user_id,
            permission="view",
        )
        settings = get_settings()
        return ShareResponse(
            share_url=f"{settings.frontend_url}/shared/{raw_token}",
            share_token=raw_token,
            expires_at=None,
        )

    async def get_by_share_token(self, raw_token: str) -> ItineraryResponse:
        token_hash = hash_token(raw_token)
        link = await self.repo.get_share_link_by_hash(token_hash)
        if not link or link.revoked_at is not None:
            raise NotFoundException("Share link not found or revoked")
        if link.expires_at and link.expires_at < datetime.now(UTC):
            raise NotFoundException("Share link expired")
        trip = await self.repo.get_with_full_data(link.trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        return await self._to_response(trip)

    # --- Claim ---

    async def claim(self, trip_id: int, user_id: int, request: ClaimTripRequest) -> dict:
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id is not None:
            raise ConflictException("Trip already has an owner")

        token_hash = hash_token(request.claim_token)
        claim_tokens = await self.repo.get_claim_tokens_for_trip(trip_id)

        valid_token: GuestClaimToken | None = None
        for ct in claim_tokens:
            if ct.token_hash == token_hash and ct.consumed_at is None:
                if ct.expires_at > datetime.now(UTC):
                    valid_token = ct
                    break

        if not valid_token:
            raise ForbiddenException("Invalid or expired claim token")

        # Consume token + transfer ownership in one flush
        valid_token.consumed_at = datetime.now(UTC)
        trip.user_id = user_id
        await self.session.flush()

        return {"claimed": True, "trip_id": trip_id}

    # --- Activity CRUD ---

    async def add_activity(
        self, trip_id: int, day_id: int, data: ActivitySchema, user_id: int
    ) -> ActivitySchema:
        trip = await self._verify_owner(trip_id, user_id)
        # Verify day belongs to trip
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
        return ActivitySchema.model_validate(activity, from_attributes=True)

    async def update_activity(
        self, trip_id: int, activity_id: int, data: ActivitySchema, user_id: int
    ) -> ActivitySchema:
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_by_id(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")
        updates = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if k not in ("id", "extra_expenses")
        }
        activity = await self.repo.update_activity(activity, **updates)
        return ActivitySchema.model_validate(activity, from_attributes=True)

    async def delete_activity(self, trip_id: int, activity_id: int, user_id: int) -> None:
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_by_id(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")
        await self.repo.delete_activity(activity)

    # --- Accommodation CRUD ---

    async def add_accommodation(
        self, trip_id: int, data: AccommodationSchema, user_id: int
    ) -> AccommodationSchema:
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
        await self._verify_owner(trip_id, user_id)
        acc = await self.repo.get_accommodation_by_id(acc_id)
        if not acc:
            raise NotFoundException("Accommodation not found")
        await self.repo.delete_accommodation(acc)

    # --- Private helpers ---

    async def _create_trip_record(
        self, *, user_id: int | None, ai_generated: bool = False, **kwargs: object
    ) -> Trip:
        if user_id is not None:
            await self._check_trip_limit(user_id)
        trip = await self.repo.create_trip(
            user_id=user_id, ai_generated=ai_generated, status="draft", **kwargs
        )
        return trip

    async def _check_trip_limit(self, user_id: int) -> None:
        count = await self.repo.count_active_by_user(user_id)
        if count >= MAX_ACTIVE_TRIPS:
            raise ConflictException(f"Maximum {MAX_ACTIVE_TRIPS} active trips allowed")

    async def _verify_owner(self, trip_id: int, user_id: int) -> Trip:
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return trip

    async def _issue_claim_token(self, trip_id: int) -> str:
        raw_token, token_hash = create_opaque_token("claim")
        expires_at = datetime.now(UTC) + timedelta(hours=24)
        await self.repo.create_claim_token(
            trip_id=trip_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return raw_token

    async def _sync_days(self, trip: Trip, incoming_days: list[DaySchema]) -> None:
        existing_map = {d.id: d for d in trip.days if d.id is not None}
        incoming_day_ids: set[int] = set()

        for idx, day_data in enumerate(incoming_days):
            if day_data.id and day_data.id in existing_map:
                # UPDATE existing day
                incoming_day_ids.add(day_data.id)
                day = existing_map[day_data.id]
                day.label = day_data.label
                day.date = day_data.date
                day.destination_name = day_data.destination_name
                day.day_number = idx + 1
                await self._sync_activities(day, day_data.activities)
            else:
                # CREATE new day
                day = await self.repo.add_day(
                    trip_id=trip.id,
                    day_number=idx + 1,
                    label=day_data.label,
                    date=day_data.date,
                    destination_name=day_data.destination_name,
                )
                for act_data in day_data.activities:
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
                        order_index=0,
                    )

        # DELETE days not in incoming
        for existing_id in existing_map:
            if existing_id not in incoming_day_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_activities(self, day: TripDay, incoming: list[ActivitySchema]) -> None:
        existing_map = {a.id: a for a in day.activities if a.id is not None}
        incoming_ids: set[int] = set()

        for idx, act_data in enumerate(incoming):
            if act_data.id and act_data.id in existing_map:
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
                ):
                    val = getattr(act_data, field, None)
                    if val is not None:
                        setattr(activity, field, val)
                activity.order_index = idx
            else:
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
                )

        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_accommodations(self, trip: Trip, incoming: list[AccommodationSchema]) -> None:
        existing_map = {a.id: a for a in trip.accommodations if a.id is not None}
        incoming_ids: set[int] = set()

        for acc_data in incoming:
            if acc_data.id and acc_data.id in existing_map:
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

        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    def _calculate_total_cost(self, trip: Trip) -> int:
        total = 0
        for day in trip.days:
            for activity in day.activities:
                total += activity.adult_price or 0
                total += activity.child_price or 0
                total += activity.custom_cost or 0
                total += activity.bus_ticket_price or 0
                total += activity.taxi_cost or 0
                for expense in activity.extra_expenses:
                    total += expense.amount
            for expense in day.extra_expenses:
                total += expense.amount
        for acc in trip.accommodations:
            total += acc.total_price or 0
        return total

    async def _to_response(self, trip: Trip) -> ItineraryResponse:
        days = []
        for day in trip.days:
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
                    )
                )
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
            days=[],
            accommodations=[],
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )
