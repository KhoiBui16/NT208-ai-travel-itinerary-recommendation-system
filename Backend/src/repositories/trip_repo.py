"""Trip data access repository.

Provides CRUD and query operations for trips and nested entities
(days, activities, accommodations, ratings, share links, claim tokens).
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.models.extras import Accommodation, GuestClaimToken, ShareLink, TripRating
from src.models.trip import Activity, Trip, TripDay


class TripRepository:
    """Data access for Trip and nested entities."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # --- Trip CRUD ---

    async def get_by_id(self, trip_id: int) -> Trip | None:
        result = await self.session.execute(select(Trip).where(Trip.id == trip_id))
        return result.scalar_one_or_none()

    async def get_with_full_data(self, trip_id: int) -> Trip | None:
        """Eager-load days→activities→extra_expenses, accommodations, rating, share_link."""
        stmt = (
            select(Trip)
            .where(Trip.id == trip_id)
            .options(
                selectinload(Trip.days)
                .selectinload(TripDay.activities)
                .selectinload(Activity.extra_expenses),
                selectinload(Trip.days).selectinload(TripDay.extra_expenses),
                selectinload(Trip.accommodations),
                selectinload(Trip.rating),
                selectinload(Trip.share_link),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_by_user(
        self, user_id: int, skip: int = 0, limit: int = 20
    ) -> tuple[list[Trip], int]:
        """Return (trips, total_count) for a user."""
        count_stmt = select(func.count()).select_from(Trip).where(Trip.user_id == user_id)
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(Trip)
            .where(Trip.user_id == user_id)
            .order_by(Trip.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def count_active_by_user(self, user_id: int) -> int:
        stmt = (
            select(func.count())
            .select_from(Trip)
            .where(
                Trip.user_id == user_id,
                Trip.status.in_(["draft", "planned", "confirmed"]),
            )
        )
        return (await self.session.execute(stmt)).scalar_one()

    async def create_trip(self, **kwargs: object) -> Trip:
        trip = Trip(**kwargs)  # type: ignore[arg-type]
        self.session.add(trip)
        await self.session.flush()
        return trip

    async def update_trip(self, trip: Trip, **kwargs: object) -> Trip:
        for key, value in kwargs.items():
            if value is not None:
                setattr(trip, key, value)
        await self.session.flush()
        return trip

    async def delete_trip(self, trip: Trip) -> None:
        await self.session.delete(trip)
        await self.session.flush()

    # --- TripDay ---

    async def add_day(self, **kwargs: object) -> TripDay:
        day = TripDay(**kwargs)  # type: ignore[arg-type]
        self.session.add(day)
        await self.session.flush()
        return day

    async def update_day(self, day: TripDay, **kwargs: object) -> TripDay:
        for key, value in kwargs.items():
            if value is not None:
                setattr(day, key, value)
        await self.session.flush()
        return day

    async def delete_days_by_trip(self, trip_id: int, exclude_ids: set[int] | None = None) -> int:
        """Delete days of a trip, optionally keeping those with IDs in exclude_ids."""
        stmt = delete(TripDay).where(TripDay.trip_id == trip_id)
        if exclude_ids:
            stmt = stmt.where(TripDay.id.notin_(exclude_ids))
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    # --- Activity ---

    async def add_activity(self, **kwargs: object) -> Activity:
        activity = Activity(**kwargs)  # type: ignore[arg-type]
        self.session.add(activity)
        await self.session.flush()
        return activity

    async def update_activity(self, activity: Activity, **kwargs: object) -> Activity:
        for key, value in kwargs.items():
            if value is not None:
                setattr(activity, key, value)
        await self.session.flush()
        return activity

    async def delete_activity(self, activity: Activity) -> None:
        await self.session.delete(activity)
        await self.session.flush()

    async def get_activity_by_id(self, activity_id: int) -> Activity | None:
        result = await self.session.execute(select(Activity).where(Activity.id == activity_id))
        return result.scalar_one_or_none()

    # --- Accommodation ---

    async def add_accommodation(self, **kwargs: object) -> Accommodation:
        acc = Accommodation(**kwargs)  # type: ignore[arg-type]
        self.session.add(acc)
        await self.session.flush()
        return acc

    async def delete_accommodation(self, acc: Accommodation) -> None:
        await self.session.delete(acc)
        await self.session.flush()

    async def get_accommodation_by_id(self, acc_id: int) -> Accommodation | None:
        result = await self.session.execute(select(Accommodation).where(Accommodation.id == acc_id))
        return result.scalar_one_or_none()

    # --- Rating ---

    async def upsert_rating(self, trip_id: int, rating: int, feedback: str | None) -> TripRating:
        stmt = select(TripRating).where(TripRating.trip_id == trip_id)
        existing = (await self.session.execute(stmt)).scalar_one_or_none()
        if existing:
            existing.rating = rating
            if feedback is not None:
                existing.feedback = feedback
            await self.session.flush()
            return existing
        rating_obj = TripRating(trip_id=trip_id, rating=rating, feedback=feedback)
        self.session.add(rating_obj)
        await self.session.flush()
        return rating_obj

    # --- Share ---

    async def get_share_link(self, trip_id: int) -> ShareLink | None:
        result = await self.session.execute(select(ShareLink).where(ShareLink.trip_id == trip_id))
        return result.scalar_one_or_none()

    async def create_share_link(self, **kwargs: object) -> ShareLink:
        link = ShareLink(**kwargs)  # type: ignore[arg-type]
        self.session.add(link)
        await self.session.flush()
        return link

    async def get_share_link_by_hash(self, token_hash: str) -> ShareLink | None:
        result = await self.session.execute(
            select(ShareLink).where(ShareLink.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    # --- Claim Token ---

    async def create_claim_token(self, **kwargs: object) -> GuestClaimToken:
        token = GuestClaimToken(**kwargs)  # type: ignore[arg-type]
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_claim_token_by_hash(self, token_hash: str) -> GuestClaimToken | None:
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_claim_tokens_for_trip(self, trip_id: int) -> list[GuestClaimToken]:
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.trip_id == trip_id)
        )
        return list(result.scalars().all())
