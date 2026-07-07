"""Trip data access repository.

Provides CRUD and query operations for trips and all nested entities:
  - Trip       — Root itinerary entity
  - TripDay    — Calendar day within a trip
  - Activity   — Scheduled event within a day
  - Accommodation — Lodging bookings for a trip
  - TripRating — User feedback (1-5 stars)
  - ShareLink  — Opaque share tokens for public trip access
  - GuestClaimToken — One-time tokens for guest trip ownership transfer

Also provides AI recommendation context queries:
  - Destination resolution (name → DB row)
  - Place/hotel search for LLM context building
"""

from sqlalchemy import delete, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.core.slugify import slugify
from src.itineraries.models.chat import ChatMessage, ChatSession
from src.itineraries.models.extras import Accommodation, GuestClaimToken, ShareLink, TripRating
from src.itineraries.models.trip import Activity, Trip, TripDay
from src.places.models import Destination, Hotel, Place


class TripRepository:
    """Data access layer for Trip and all nested entities.

    Encapsulates raw SQLAlchemy queries behind a clean async interface.
    All methods operate on the injected session and call flush() to
    synchronize with the database without committing the transaction.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ===================================================================
    # Trip CRUD — Core trip lifecycle operations
    # ===================================================================

    async def get_by_id(self, trip_id: int) -> Trip | None:
        """Fetch a trip by ID (shallow — no eager loading of relations)."""
        result = await self.session.execute(select(Trip).where(Trip.id == trip_id))
        return result.scalar_one_or_none()

    async def get_with_full_data(self, trip_id: int) -> Trip | None:
        """Fetch a trip with all nested relations eager-loaded.

        Eager-load chain:
          Trip → days → activities → extra_expenses
          Trip → days → extra_expenses (day-level)
          Trip → accommodations
          Trip → rating
          Trip → share_link

        This avoids N+1 query issues when serializing the full response.
        """
        stmt = (
            select(Trip)
            .where(Trip.id == trip_id)
            .options(
                # Load days → activities → activity extra expenses
                selectinload(Trip.days)
                .selectinload(TripDay.activities)
                .selectinload(Activity.extra_expenses),
                # Load days → activities → place (for map markers) and its destination city
                selectinload(Trip.days)
                .selectinload(TripDay.activities)
                .selectinload(Activity.place)
                .selectinload(Place.destination),
                # Load days → day-level extra expenses
                selectinload(Trip.days).selectinload(TripDay.extra_expenses),
                # Load flat relations
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
        """Return (trips, total_count) for a user.

        Results are ordered by creation date descending (newest first).
        Uses two queries: one for count, one for paginated results.
        """
        # Count total trips for this user
        count_stmt = select(func.count()).select_from(Trip).where(Trip.user_id == user_id)
        total = (await self.session.execute(count_stmt)).scalar_one()

        # Fetch paginated trip list
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
        """Count active trips for a user (used for trip limit enforcement).

        Active statuses: 'draft', 'planned', 'confirmed'
        """
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
        """Insert a new Trip row and return it with its generated ID."""
        trip = Trip(**kwargs)  # type: ignore[arg-type]
        self.session.add(trip)
        await self.session.flush()
        return trip

    async def update_trip(self, trip: Trip, **kwargs: object) -> Trip:
        """Update trip fields from keyword arguments (skip None values)."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(trip, key, value)
        await self.session.flush()
        return trip

    async def delete_trip(self, trip: Trip) -> None:
        """Delete a trip (cascade removes all nested entities)."""
        await self.session.delete(trip)
        await self.session.flush()

    # ===================================================================
    # AI Recommendation Context — Destination/place/hotel queries for LLM
    # ===================================================================

    async def resolve_destination_for_ai(self, destination: str) -> Destination | None:
        """Resolve a user-provided destination string to a Destination row.

        Resolution order (tries each in sequence until a match is found):
        1. Exact case-insensitive name match
           (handles "Hà Nội" == "hà nội")
        2. Slug match — converts input to slug format
           (handles "Ha Noi" → "ha-noi")
        3. Fuzzy ILIKE name match
           (handles partial names like "Nội" or "Hanoi")
        """
        name = destination.strip()

        # Strategy 1: Exact case-insensitive match on destination name
        exact_stmt = select(Destination).where(func.lower(Destination.name) == name.lower())
        exact = (await self.session.execute(exact_stmt)).scalar_one_or_none()
        if exact:
            return exact

        # Strategy 2: Slug-based match — normalize input to slug format
        # e.g. "Ha Noi" → "ha-noi", "TP. Hồ Chí Minh" → "tp-ho-chi-minh"
        slug_candidate = slugify(name)
        if slug_candidate:
            slug_stmt = select(Destination).where(Destination.slug == slug_candidate)
            slug_match = (await self.session.execute(slug_stmt)).scalar_one_or_none()
            if slug_match:
                return slug_match

        # Strategy 3: Fuzzy ILIKE match on name (partial match)
        # e.g. "Nội" matches "Hà Nội", picks the most relevant by places_count
        fuzzy_stmt = (
            select(Destination)
            .where(Destination.name.ilike(f"%{name}%"))
            .order_by(Destination.places_count.desc(), Destination.name)
            .limit(1)
        )
        return (await self.session.execute(fuzzy_stmt)).scalar_one_or_none()

    async def search_places_for_ai(
        self,
        destination_id: int,
        categories: list[str] | None = None,
        limit: int = 30,
    ) -> list[Place]:
        """Return ranked candidate places for AI recommendation context.

        Places are ordered by rating → review count → name for quality.
        Optionally filtered by category to match user interests.
        """
        stmt = select(Place).where(Place.destination_id == destination_id)
        if categories:
            stmt = stmt.where(Place.category.in_(categories))
        stmt = stmt.order_by(
            Place.rating.desc(),
            Place.review_count.desc(),
            Place.name,
        ).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_hotels_for_ai(self, destination_id: int, limit: int = 8) -> list[Hotel]:
        """Return ranked candidate hotels for AI recommendation context.

        Hotels are ordered by rating → review count → name for quality.
        """
        stmt = (
            select(Hotel)
            .where(Hotel.destination_id == destination_id)
            .order_by(Hotel.rating.desc(), Hotel.review_count.desc(), Hotel.name)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    # ===================================================================
    # TripDay — Day-level CRUD operations
    # ===================================================================

    async def add_day(self, **kwargs: object) -> TripDay:
        """Insert a new TripDay row and return it with its generated ID."""
        day = TripDay(**kwargs)  # type: ignore[arg-type]
        self.session.add(day)
        await self.session.flush()
        return day

    async def get_or_create_day(
        self, *, trip_id: int, day_number: int, **kwargs: object
    ) -> TripDay:
        """Insert a TripDay for (trip_id, day_number) or return the existing row.

        Race-safe against the ``uq_trip_days_trip_number`` unique constraint:
        uses ``INSERT ... ON CONFLICT (trip_id, day_number) DO NOTHING``. If the
        insert is skipped because a matching row already exists (e.g. a
        concurrent auto-save created the same day first), the pre-existing row
        is returned instead, so the caller always receives a TripDay with a
        valid ``id`` for attaching activities/accommodations.

        ``kwargs`` (label, date, destination_name) only apply on a fresh
        insert; an existing row is returned unchanged to preserve activities
        already attached to it.
        """
        insert_stmt = (
            pg_insert(TripDay)
            .values(trip_id=trip_id, day_number=day_number, **kwargs)
            .on_conflict_do_nothing(index_elements=["trip_id", "day_number"])
            .returning(TripDay.id)
        )
        result = await self.session.execute(insert_stmt)
        await self.session.flush()
        inserted_id = result.scalar_one_or_none()

        if inserted_id is None:
            # Conflict: another row already owns (trip_id, day_number).
            existing = await self.session.execute(
                select(TripDay).where(
                    TripDay.trip_id == trip_id,
                    TripDay.day_number == day_number,
                )
            )
            return existing.scalar_one()

        created = await self.session.execute(select(TripDay).where(TripDay.id == inserted_id))
        return created.scalar_one()

    async def update_day(self, day: TripDay, **kwargs: object) -> TripDay:
        """Update day fields from keyword arguments (skip None values)."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(day, key, value)
        await self.session.flush()
        return day

    async def delete_days_by_trip(self, trip_id: int, exclude_ids: set[int] | None = None) -> int:
        """Bulk delete days of a trip, optionally keeping those in exclude_ids.

        Returns the number of rows deleted.
        """
        stmt = delete(TripDay).where(TripDay.trip_id == trip_id)
        if exclude_ids:
            stmt = stmt.where(TripDay.id.notin_(exclude_ids))
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    # ===================================================================
    # Activity — Activity-level CRUD operations
    # ===================================================================

    async def add_activity(self, **kwargs: object) -> Activity:
        """Insert a new Activity row.

        Flushes and refreshes to get the generated ID and server defaults.
        Also eager-loads extra_expenses relationship for schema conversion.
        """
        activity = Activity(**kwargs)  # type: ignore[arg-type]
        self.session.add(activity)
        await self.session.flush()
        await self.session.refresh(activity)
        # Eager-load extra_expenses to avoid lazy-load in sync context (PR #86 fix)
        await self.session.refresh(
            activity,
            attribute_names=["extra_expenses"],
        )
        return activity

    async def update_activity(self, activity: Activity, **kwargs: object) -> Activity:
        """Update activity fields from keyword arguments (skip None values).

        Also eager-loads extra_expenses relationship after refresh for schema conversion.
        """
        for key, value in kwargs.items():
            if value is not None:
                setattr(activity, key, value)
        await self.session.flush()
        await self.session.refresh(activity)
        # Eager-load extra_expenses to avoid lazy-load in sync context (PR #86 fix)
        await self.session.refresh(
            activity,
            attribute_names=["extra_expenses"],
        )
        return activity

    async def delete_activity(self, activity: Activity) -> None:
        """Delete an activity (cascade removes extra expenses)."""
        await self.session.delete(activity)
        await self.session.flush()

    async def get_activity_by_id(self, activity_id: int) -> Activity | None:
        """Fetch a single activity by ID (no eager loading)."""
        result = await self.session.execute(select(Activity).where(Activity.id == activity_id))
        return result.scalar_one_or_none()

    async def get_activity_for_trip(self, activity_id: int, trip_id: int) -> Activity | None:
        """Fetch an activity only if it belongs to the supplied trip.

        This is the safe lookup for nested activity mutation endpoints where
        the parent `trip_id` comes from the path and must match the activity's
        actual parent trip through `TripDay.trip_id`.
        """
        stmt = (
            select(Activity)
            .join(TripDay, Activity.trip_day_id == TripDay.id)
            .where(
                Activity.id == activity_id,
                TripDay.trip_id == trip_id,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_activity_with_trip(self, activity_id: int) -> Activity | None:
        """Fetch an activity with its parent day and trip eager-loaded.

        Used by SuggestionService to access the trip context from an activity.
        """
        stmt = (
            select(Activity)
            .where(Activity.id == activity_id)
            .options(
                selectinload(Activity.trip_day).selectinload(TripDay.trip),
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_place_ids_in_trip(self, trip_id: int) -> list[int]:
        """Get all place IDs referenced by activities in a trip.

        Used by SuggestionService to exclude already-used places from
        alternative suggestions.
        """
        stmt = (
            select(Activity.place_id)
            .join(TripDay, Activity.trip_day_id == TripDay.id)
            .where(TripDay.trip_id == trip_id, Activity.place_id.isnot(None))
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all() if row[0] is not None]

    # ===================================================================
    # Accommodation — Lodging CRUD operations
    # ===================================================================

    async def add_accommodation(self, **kwargs: object) -> Accommodation:
        """Insert a new Accommodation row.

        Flushes and refreshes to get the generated ID.
        """
        acc = Accommodation(**kwargs)  # type: ignore[arg-type]
        self.session.add(acc)
        await self.session.flush()
        await self.session.refresh(acc)
        return acc

    async def delete_accommodation(self, acc: Accommodation) -> None:
        """Delete an accommodation record."""
        await self.session.delete(acc)
        await self.session.flush()

    async def get_accommodation_by_id(self, acc_id: int) -> Accommodation | None:
        """Fetch a single accommodation by ID."""
        result = await self.session.execute(select(Accommodation).where(Accommodation.id == acc_id))
        return result.scalar_one_or_none()

    async def get_accommodation_for_trip(self, acc_id: int, trip_id: int) -> Accommodation | None:
        """Fetch an accommodation only if it belongs to the supplied trip."""
        stmt = select(Accommodation).where(
            Accommodation.id == acc_id,
            Accommodation.trip_id == trip_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    # ===================================================================
    # Rating — Trip feedback operations
    # ===================================================================

    async def upsert_rating(self, trip_id: int, rating: int, feedback: str | None) -> TripRating:
        """Insert or update a trip rating.

        If a rating already exists for this trip, updates the score
        (and feedback if provided). Otherwise creates a new rating row.
        """
        stmt = select(TripRating).where(TripRating.trip_id == trip_id)
        existing = (await self.session.execute(stmt)).scalar_one_or_none()

        if existing:
            # Update existing rating
            existing.rating = rating
            if feedback is not None:
                existing.feedback = feedback
            await self.session.flush()
            return existing

        # Create new rating
        rating_obj = TripRating(trip_id=trip_id, rating=rating, feedback=feedback)
        self.session.add(rating_obj)
        await self.session.flush()
        return rating_obj

    # ===================================================================
    # Share — Share link operations
    # ===================================================================

    async def get_share_link(self, trip_id: int) -> ShareLink | None:
        """Get the share link for a trip (if one exists)."""
        result = await self.session.execute(select(ShareLink).where(ShareLink.trip_id == trip_id))
        return result.scalar_one_or_none()

    async def create_share_link(self, **kwargs: object) -> ShareLink:
        """Create a new share link record (stores hashed token)."""
        link = ShareLink(**kwargs)  # type: ignore[arg-type]
        self.session.add(link)
        await self.session.flush()
        return link

    async def get_share_link_by_hash(self, token_hash: str) -> ShareLink | None:
        """Look up a share link by its hashed token value."""
        result = await self.session.execute(
            select(ShareLink).where(ShareLink.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    # ===================================================================
    # Claim Token — Guest trip ownership transfer tokens
    # ===================================================================

    async def create_claim_token(self, **kwargs: object) -> GuestClaimToken:
        """Create a new guest claim token record (stores hashed token)."""
        token = GuestClaimToken(**kwargs)  # type: ignore[arg-type]
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_claim_token_by_hash(self, token_hash: str) -> GuestClaimToken | None:
        """Look up a claim token by its hashed value."""
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_claim_tokens_for_trip(self, trip_id: int) -> list[GuestClaimToken]:
        """Get all claim tokens issued for a trip (consumed and unconsumed)."""
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.trip_id == trip_id)
        )
        return list(result.scalars().all())

    # ===================================================================
    # Chat Session — Session CRUD for companion chat
    # ===================================================================

    async def create_chat_session(self, **kwargs: object) -> ChatSession:
        """Insert a new ChatSession row."""
        session = ChatSession(**kwargs)  # type: ignore[arg-type]
        self.session.add(session)
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def get_chat_session_by_id(self, session_id: int) -> ChatSession | None:
        """Fetch a chat session by ID."""
        result = await self.session.execute(select(ChatSession).where(ChatSession.id == session_id))
        return result.scalar_one_or_none()

    async def touch_chat_session(self, session: ChatSession) -> ChatSession:
        """Cập nhật `updated_at` của session sau khi có message mới.

        Mục tiêu là để danh sách session phản ánh đúng cuộc trò chuyện gần nhất
        thay vì chỉ thời điểm tạo session.
        """
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def list_sessions_by_trip(
        self, trip_id: int, skip: int = 0, limit: int = 20
    ) -> tuple[list[ChatSession], int]:
        """Return (sessions, total_count) for a trip, ordered by newest activity first."""
        count_stmt = (
            select(func.count()).select_from(ChatSession).where(ChatSession.trip_id == trip_id)
        )
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(ChatSession)
            .where(ChatSession.trip_id == trip_id)
            .order_by(ChatSession.updated_at.desc(), ChatSession.created_at.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total

    async def update_chat_session_title(self, session: ChatSession, title: str) -> ChatSession:
        """Cập nhật title (rename) cho một chat session."""
        session.title = title
        await self.session.flush()
        await self.session.refresh(session)
        return session

    async def delete_chat_session(self, session: ChatSession) -> None:
        """Xoá một chat session; chat_messages cascade theo FK ondelete=CASCADE."""
        await self.session.delete(session)
        await self.session.flush()

    async def create_chat_message(self, **kwargs: object) -> ChatMessage:
        """Insert một message mới vào lịch sử chat của session."""
        message = ChatMessage(**kwargs)  # type: ignore[arg-type]
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_chat_message_by_id(self, message_id: int) -> ChatMessage | None:
        """Lấy một chat message cùng session để apply/cancel proposal an toàn."""
        stmt = (
            select(ChatMessage)
            .where(ChatMessage.id == message_id)
            .options(selectinload(ChatMessage.session))
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def list_messages_by_session(
        self, session_id: int, skip: int = 0, limit: int = 50
    ) -> tuple[list[ChatMessage], int]:
        """Trả về message history theo thứ tự tăng dần thời gian tạo."""
        count_stmt = select(func.count()).select_from(ChatMessage)
        count_stmt = count_stmt.where(ChatMessage.session_id == session_id)
        total = (await self.session.execute(count_stmt)).scalar_one()

        stmt = (
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at.asc(), ChatMessage.id.asc())
            .offset(skip)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all()), total
