"""Trip data access repository.

Cung cấp toàn bộ CRUD và query operations cho Trip và các entity liên quan:
  • Trip          — CRUD lịch trình
  • TripDay       — CRUD ngày trong lịch trình
  • Activity      — CRUD hoạt động trong ngày
  • Accommodation — CRUD chỗ ở
  • TripRating    — Upsert đánh giá
  • ShareLink     — Tạo/truy vấn share link
  • GuestClaimToken — Tạo/truy vấn claim token

Ngoài ra cung cấp AI Recommendation Context:
  • resolve_destination_for_ai() — Resolve tên điểm đến → Destination entity
  • search_places_for_ai()      — Lấy places phục vụ AI pipeline
  • get_hotels_for_ai()         — Lấy hotels phục vụ AI pipeline
"""

from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from src.itineraries.models.extras import Accommodation, GuestClaimToken, ShareLink, TripRating
from src.itineraries.models.trip import Activity, Trip, TripDay
from src.places.models import Destination, Hotel, Place


class TripRepository:
    """Data access layer cho Trip và tất cả nested entities.

    Mỗi instance gắn với 1 AsyncSession (request-scoped).
    Không chứa business logic — chỉ DB operations thuần túy.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ===================================================================
    # Trip CRUD
    # ===================================================================

    async def get_by_id(self, trip_id: int) -> Trip | None:
        """Lấy trip theo ID (không eager-load relationships)."""
        result = await self.session.execute(select(Trip).where(Trip.id == trip_id))
        return result.scalar_one_or_none()

    async def get_with_full_data(self, trip_id: int) -> Trip | None:
        """Lấy trip với toàn bộ nested data (eager-load).

        Eager-load chain:
          Trip → days → activities → extra_expenses
          Trip → days → extra_expenses (day-level)
          Trip → accommodations
          Trip → rating
          Trip → share_link
        """
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
        """Lấy danh sách trips của user (phân trang).

        Returns:
            (trips, total_count) — danh sách trip + tổng số record
        """
        # Đếm tổng số trips
        count_stmt = select(func.count()).select_from(Trip).where(Trip.user_id == user_id)
        total = (await self.session.execute(count_stmt)).scalar_one()

        # Lấy danh sách trips (sắp xếp mới nhất trước)
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
        """Đếm số trips active (draft/planned/confirmed) của user.

        Dùng để enforce giới hạn MAX_ACTIVE_TRIPS.
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
        """Tạo trip mới và flush để lấy ID."""
        trip = Trip(**kwargs)  # type: ignore[arg-type]
        self.session.add(trip)
        await self.session.flush()
        return trip

    async def update_trip(self, trip: Trip, **kwargs: object) -> Trip:
        """Cập nhật các field của trip (chỉ set field có giá trị)."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(trip, key, value)
        await self.session.flush()
        return trip

    async def delete_trip(self, trip: Trip) -> None:
        """Xóa trip (cascade delete tất cả nested entities)."""
        await self.session.delete(trip)
        await self.session.flush()

    # ===================================================================
    # AI Recommendation Context — Dữ liệu phục vụ AI pipeline
    # ===================================================================

    async def resolve_destination_for_ai(self, destination: str) -> Destination | None:
        """Resolve tên điểm đến (user input) → Destination entity.

        Thứ tự ưu tiên:
        1. Exact case-insensitive name match (e.g. "Hà Nội" == "hà nội")
        2. Slug match — convert input thành slug (e.g. "Ha Noi" → "ha-noi")
        3. Fuzzy ILIKE name match (e.g. "Nội" matches "Hà Nội")
        """
        name = destination.strip()

        # 1. Exact case-insensitive match
        exact_stmt = select(Destination).where(func.lower(Destination.name) == name.lower())
        exact = (await self.session.execute(exact_stmt)).scalar_one_or_none()
        if exact:
            return exact

        # 2. Slug-based match: normalize input to slug format
        #    "Ha Noi" → "ha-noi", "TP. Hồ Chí Minh" → "tp-h-ch-minh"
        slug_candidate = self._to_slug(name)
        if slug_candidate:
            slug_stmt = select(Destination).where(Destination.slug == slug_candidate)
            slug_match = (await self.session.execute(slug_stmt)).scalar_one_or_none()
            if slug_match:
                return slug_match

        # 3. Fuzzy ILIKE match on name (partial match, e.g. "Nội" matches "Hà Nội")
        fuzzy_stmt = (
            select(Destination)
            .where(Destination.name.ilike(f"%{name}%"))
            .order_by(Destination.places_count.desc(), Destination.name)
            .limit(1)
        )
        return (await self.session.execute(fuzzy_stmt)).scalar_one_or_none()

    @staticmethod
    def _to_slug(text: str) -> str:
        """Convert tên điểm đến → slug format để matching.

        Sử dụng cùng replacement table với ETL db_loader._to_slug()
        để đảm bảo slugs khớp với dữ liệu trong DB.

        Examples:
            "Ha Noi"          → "ha-noi"   (ASCII input, no replacements needed)
            "Hà Nội"          → "ha-noi"   (Vietnamese diacritics stripped)
            "TP. Hồ Chí Minh" → "tp-ho-chi-minh"
            "Da Nang"         → "da-nang"
        """
        import re

        slug = text.lower().strip()
        # Mirror the ETL db_loader replacement table exactly so slugs match DB
        replacements = {
            "đ": "d",
            "ă": "a",
            "â": "a",
            "ê": "e",
            "ô": "o",
            "ơ": "o",
            "ư": "u",
            "à": "a",
            "á": "a",
            "ả": "a",
            "ã": "a",
            "ạ": "a",
            "ắ": "a",
            "ặ": "a",
            "ằ": "a",
            "ẳ": "a",
            "ẵ": "a",
            "ấ": "a",
            "ầ": "a",
            "ẩ": "a",
            "ẫ": "a",
            "ậ": "a",
            "è": "e",
            "é": "e",
            "ẻ": "e",
            "ẽ": "e",
            "ẹ": "e",
            "ế": "e",
            "ề": "e",
            "ể": "e",
            "ễ": "e",
            "ệ": "e",
            "ì": "i",
            "í": "i",
            "ỉ": "i",
            "ĩ": "i",
            "ị": "i",
            "ò": "o",
            "ó": "o",
            "ỏ": "o",
            "õ": "o",
            "ọ": "o",
            "ố": "o",
            "ồ": "o",
            "ổ": "o",
            "ỗ": "o",
            "ộ": "o",
            "ớ": "o",
            "ờ": "o",
            "ở": "o",
            "ỡ": "o",
            "ợ": "o",
            "ù": "u",
            "ú": "u",
            "ủ": "u",
            "ũ": "u",
            "ụ": "u",
            "ứ": "u",
            "ừ": "u",
            "ử": "u",
            "ữ": "u",
            "ự": "u",
            "ỳ": "y",
            "ý": "y",
            "ỷ": "y",
            "ỹ": "y",
            "ỵ": "y",
        }
        for vn_char, ascii_char in replacements.items():
            slug = slug.replace(vn_char, ascii_char)
        slug = re.sub(r"[^a-z0-9]+", "-", slug)
        slug = slug.strip("-")
        return slug

    async def search_places_for_ai(
        self,
        destination_id: int,
        categories: list[str] | None = None,
        limit: int = 30,
    ) -> list[Place]:
        """Lấy danh sách places xếp hạng để làm context cho AI recommendation.

        Sắp xếp: rating DESC → review_count DESC → name ASC
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
        """Lấy danh sách hotels xếp hạng để làm context cho AI recommendation.

        Sắp xếp: rating DESC → review_count DESC → name ASC
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
    # TripDay CRUD
    # ===================================================================

    async def add_day(self, **kwargs: object) -> TripDay:
        """Thêm ngày mới vào trip."""
        day = TripDay(**kwargs)  # type: ignore[arg-type]
        self.session.add(day)
        await self.session.flush()
        return day

    async def update_day(self, day: TripDay, **kwargs: object) -> TripDay:
        """Cập nhật thông tin ngày."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(day, key, value)
        await self.session.flush()
        return day

    async def delete_days_by_trip(self, trip_id: int, exclude_ids: set[int] | None = None) -> int:
        """Xóa các ngày của trip, có thể exclude một số ngày.

        Returns:
            Số ngày đã xóa
        """
        stmt = delete(TripDay).where(TripDay.trip_id == trip_id)
        if exclude_ids:
            stmt = stmt.where(TripDay.id.notin_(exclude_ids))
        result = await self.session.execute(stmt)
        await self.session.flush()
        return result.rowcount

    # ===================================================================
    # Activity CRUD
    # ===================================================================

    async def add_activity(self, **kwargs: object) -> Activity:
        """Thêm activity mới vào ngày."""
        activity = Activity(**kwargs)  # type: ignore[arg-type]
        self.session.add(activity)
        await self.session.flush()
        await self.session.refresh(activity)
        return activity

    async def update_activity(self, activity: Activity, **kwargs: object) -> Activity:
        """Cập nhật thông tin activity (chỉ set field có giá trị)."""
        for key, value in kwargs.items():
            if value is not None:
                setattr(activity, key, value)
        await self.session.flush()
        await self.session.refresh(activity)
        return activity

    async def delete_activity(self, activity: Activity) -> None:
        """Xóa activity."""
        await self.session.delete(activity)
        await self.session.flush()

    async def get_activity_by_id(self, activity_id: int) -> Activity | None:
        """Lấy activity theo ID (không eager-load)."""
        result = await self.session.execute(select(Activity).where(Activity.id == activity_id))
        return result.scalar_one_or_none()

    async def get_activity_with_trip(self, activity_id: int) -> Activity | None:
        """Lấy activity kèm eager-load trip_day → trip (dùng cho ownership check)."""
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
        """Lấy tất cả place_id đã dùng trong trip (dùng cho dedup recommendation)."""
        stmt = (
            select(Activity.place_id)
            .join(TripDay, Activity.trip_day_id == TripDay.id)
            .where(TripDay.trip_id == trip_id, Activity.place_id.isnot(None))
        )
        result = await self.session.execute(stmt)
        return [row[0] for row in result.all() if row[0] is not None]

    # ===================================================================
    # Accommodation CRUD
    # ===================================================================

    async def add_accommodation(self, **kwargs: object) -> Accommodation:
        """Thêm accommodation mới vào trip."""
        acc = Accommodation(**kwargs)  # type: ignore[arg-type]
        self.session.add(acc)
        await self.session.flush()
        await self.session.refresh(acc)
        return acc

    async def delete_accommodation(self, acc: Accommodation) -> None:
        """Xóa accommodation."""
        await self.session.delete(acc)
        await self.session.flush()

    async def get_accommodation_by_id(self, acc_id: int) -> Accommodation | None:
        """Lấy accommodation theo ID."""
        result = await self.session.execute(select(Accommodation).where(Accommodation.id == acc_id))
        return result.scalar_one_or_none()

    # ===================================================================
    # Rating — Đánh giá lịch trình
    # ===================================================================

    async def upsert_rating(self, trip_id: int, rating: int, feedback: str | None) -> TripRating:
        """Tạo hoặc cập nhật đánh giá (upsert pattern).

        Nếu đã có rating → update rating + feedback.
        Nếu chưa → tạo mới.
        """
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

    # ===================================================================
    # Share — Chia sẻ lịch trình
    # ===================================================================

    async def get_share_link(self, trip_id: int) -> ShareLink | None:
        """Lấy share link hiện tại của trip (nếu có)."""
        result = await self.session.execute(select(ShareLink).where(ShareLink.trip_id == trip_id))
        return result.scalar_one_or_none()

    async def create_share_link(self, **kwargs: object) -> ShareLink:
        """Tạo share link mới cho trip."""
        link = ShareLink(**kwargs)  # type: ignore[arg-type]
        self.session.add(link)
        await self.session.flush()
        return link

    async def get_share_link_by_hash(self, token_hash: str) -> ShareLink | None:
        """Tìm share link theo token hash (dùng khi visitor truy cập shared URL)."""
        result = await self.session.execute(
            select(ShareLink).where(ShareLink.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    # ===================================================================
    # Claim Token — Token cho guest claim trip
    # ===================================================================

    async def create_claim_token(self, **kwargs: object) -> GuestClaimToken:
        """Tạo claim token mới cho guest trip."""
        token = GuestClaimToken(**kwargs)  # type: ignore[arg-type]
        self.session.add(token)
        await self.session.flush()
        return token

    async def get_claim_token_by_hash(self, token_hash: str) -> GuestClaimToken | None:
        """Tìm claim token theo hash."""
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def get_claim_tokens_for_trip(self, trip_id: int) -> list[GuestClaimToken]:
        """Lấy tất cả claim tokens của trip (dùng khi verify claim request)."""
        result = await self.session.execute(
            select(GuestClaimToken).where(GuestClaimToken.trip_id == trip_id)
        )
        return list(result.scalars().all())
