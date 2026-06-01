"""Itinerary domain service — business logic cho nhóm Trip.

Xử lý toàn bộ business logic của lịch trình du lịch:
  • Generate     — Tạo lịch trình bằng AI (Phase C.1) qua ItineraryPipeline
  • Trip CRUD    — Tạo thủ công, xem, danh sách, cập nhật (auto-save), xóa
  • Rating       — Đánh giá lịch trình (1-5 sao)
  • Share & Claim — Chia sẻ qua link công khai + guest claim ownership
  • Activity CRUD — Thêm/sửa/xóa hoạt động trong ngày
  • Accommodation CRUD — Thêm/xóa chỗ ở

Auto-save sử dụng diff/sync pattern: FE gửi toàn bộ days/activities,
BE so sánh với DB → tạo mới / cập nhật / xóa theo incoming data.
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

# Giới hạn số trips active (draft/planned/confirmed) mỗi user
MAX_ACTIVE_TRIPS = 5


class ItineraryService(BaseService):
    """Business logic cho lịch trình du lịch.

    Kế thừa BaseService để có structured logging (self.logger).
    Mỗi instance gắn với 1 AsyncSession (request-scoped).
    """

    def __init__(self, session: AsyncSession) -> None:
        super().__init__()
        self.session = session
        self.repo = TripRepository(session)

    # ===================================================================
    # 1. Generate — Tạo lịch trình bằng AI (Phase C.1)
    # ===================================================================

    async def generate(
        self, request: GenerateItineraryRequest, user_id: int | None
    ) -> ItineraryResponse:
        """Tạo lịch trình bằng AI pipeline.

        Flow: request → ItineraryPipeline.generate() → Trip ORM → ItineraryResponse
        Nếu user chưa đăng nhập (user_id=None): cấp claim_token để claim sau.
        """
        pipeline = ItineraryPipeline(self.session)
        trip = await pipeline.generate(request, user_id=user_id)
        resp = await self._to_response(trip)
        # Guest tạo trip → cấp claim token để claim sau khi đăng nhập
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    # ===================================================================
    # 2. Trip CRUD — Tạo, xem, danh sách, cập nhật, xóa
    # ===================================================================

    async def create_manual(
        self, request: CreateTripRequest, user_id: int | None
    ) -> ItineraryResponse:
        """Tạo lịch trình thủ công (manual).

        Tạo trip rỗng → FE sẽ thêm days/activities sau qua auto-save (update).
        Nếu guest: cấp claim_token.
        """
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
        # Guest tạo trip → cấp claim token
        if user_id is None:
            resp.claim_token = await self._issue_claim_token(trip.id)
        return resp

    async def get_by_id(self, trip_id: int, user_id: int) -> ItineraryResponse:
        """Lấy chi tiết lịch trình theo ID (chỉ owner mới xem được)."""
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return await self._to_response(trip)

    async def list_by_user(self, user_id: int, page: int = 1, size: int = 20) -> PaginatedResponse:
        """Lấy danh sách lịch trình của user (phân trang)."""
        skip = (page - 1) * size
        trips, total = await self.repo.list_by_user(user_id, skip=skip, limit=size)
        items = [await self._to_list_item(t) for t in trips]
        return PaginatedResponse(items=items, total=total, page=page, page_size=size)

    async def update(
        self, trip_id: int, data: UpdateTripRequest, user_id: int
    ) -> ItineraryResponse:
        """Cập nhật lịch trình (auto-save pattern).

        FE gửi toàn bộ state → BE sync theo diff logic:
          • trip_name, budget: update trực tiếp
          • days: sync qua _sync_days() (tạo/sửa/xóa)
          • accommodations: sync qua _sync_accommodations()
        Sau khi sync → recalculate total_cost → return updated trip.
        """
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
        # Recalculate tổng chi phí sau khi sync
        trip.total_cost = self._calculate_total_cost(trip)
        await self.session.flush()

        # Expire cached relations → re-fetch để load fresh data từ DB
        self.session.expire_all()
        trip = await self.repo.get_with_full_data(trip_id)
        return await self._to_response(trip)

    async def delete(self, trip_id: int, user_id: int) -> None:
        """Xóa lịch trình (chỉ owner mới xóa được)."""
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.delete_trip(trip)

    # ===================================================================
    # 3. Rating — Đánh giá lịch trình
    # ===================================================================

    async def rate(self, trip_id: int, user_id: int, rating: int, feedback: str | None) -> None:
        """Đánh giá lịch trình (upsert: tạo mới hoặc cập nhật)."""
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        await self.repo.upsert_rating(trip_id, rating, feedback)

    # ===================================================================
    # 4. Share — Chia sẻ lịch trình qua link công khai
    # ===================================================================

    async def share(self, trip_id: int, user_id: int) -> ShareResponse:
        """Tạo hoặc trả về link chia sẻ lịch trình.

        Lần đầu: tạo opaque token → hash → lưu DB → trả raw token + URL
        Lần sau: trả [REDACTED] (không thể recover raw token từ hash)
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")

        # Kiểm tra đã có share link chưa
        existing = await self.repo.get_share_link(trip_id)
        if existing and existing.revoked_at is None:
            # Đã share — trả thông tin hiện có (không recover được raw token)
            settings = get_settings()
            return ShareResponse(
                share_url=f"{settings.frontend_url}/shared/[REDACTED]",
                share_token="[REDACTED — already issued]",
                expires_at=existing.expires_at,
            )

        # Tạo share link mới
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
        """Lấy lịch trình qua share token (public read-only, EP-15).

        Verify: token exists → not revoked → not expired → return trip data.
        """
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

    # ===================================================================
    # 5. Claim — Guest claim trip sau khi đăng nhập
    # ===================================================================

    async def claim(self, trip_id: int, user_id: int, request: ClaimTripRequest) -> dict:
        """Guest claim ownership trip sau khi đăng nhập.

        Flow:
          1. Verify trip exists và chưa có owner
          2. Hash claim token → tìm trong DB
          3. Verify token chưa consumed và chưa expired
          4. Consume token + transfer ownership trong 1 flush
        """
        trip = await self.repo.get_by_id(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id is not None:
            raise ConflictException("Trip already has an owner")

        # Hash token để so sánh với DB
        token_hash = hash_token(request.claim_token)
        claim_tokens = await self.repo.get_claim_tokens_for_trip(trip_id)

        # Tìm token hợp lệ (matching hash, chưa consumed, chưa expired)
        valid_token: GuestClaimToken | None = None
        for ct in claim_tokens:
            if ct.token_hash == token_hash and ct.consumed_at is None:
                if ct.expires_at > datetime.now(UTC):
                    valid_token = ct
                    break

        if not valid_token:
            raise ForbiddenException("Invalid or expired claim token")

        # Consume token + transfer ownership trong 1 flush
        valid_token.consumed_at = datetime.now(UTC)
        trip.user_id = user_id
        await self.session.flush()

        return {"claimed": True, "trip_id": trip_id}

    # ===================================================================
    # 6. Activity CRUD — Thêm/sửa/xóa hoạt động
    # ===================================================================

    async def add_activity(
        self, trip_id: int, day_id: int, data: ActivitySchema, user_id: int
    ) -> ActivitySchema:
        """Thêm activity mới vào ngày cụ thể."""
        trip = await self._verify_owner(trip_id, user_id)
        # Verify day thuộc về trip
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
        """Cập nhật thông tin activity."""
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_by_id(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")
        # Chỉ update các field được gửi lên (exclude id và extra_expenses)
        updates = {
            k: v
            for k, v in data.model_dump(exclude_unset=True).items()
            if k not in ("id", "extra_expenses")
        }
        activity = await self.repo.update_activity(activity, **updates)
        return self._activity_to_schema(activity)

    async def delete_activity(self, trip_id: int, activity_id: int, user_id: int) -> None:
        """Xóa activity."""
        await self._verify_owner(trip_id, user_id)
        activity = await self.repo.get_activity_by_id(activity_id)
        if not activity:
            raise NotFoundException("Activity not found")
        await self.repo.delete_activity(activity)

    # ===================================================================
    # 7. Accommodation CRUD — Thêm/xóa chỗ ở
    # ===================================================================

    async def add_accommodation(
        self, trip_id: int, data: AccommodationSchema, user_id: int
    ) -> AccommodationSchema:
        """Thêm accommodation mới vào trip."""
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
        """Xóa accommodation."""
        await self._verify_owner(trip_id, user_id)
        acc = await self.repo.get_accommodation_by_id(acc_id)
        if not acc:
            raise NotFoundException("Accommodation not found")
        await self.repo.delete_accommodation(acc)

    # ===================================================================
    # Private helpers — Trip helpers
    # ===================================================================

    async def _create_trip_record(
        self, *, user_id: int | None, ai_generated: bool = False, **kwargs: object
    ) -> Trip:
        """Tạo Trip record mới và trả về trip kèm full data.

        Kiểm tra giới hạn trip nếu user đã đăng nhập.
        """
        if user_id is not None:
            await self._check_trip_limit(user_id)
        trip = await self.repo.create_trip(
            user_id=user_id, ai_generated=ai_generated, status="draft", **kwargs
        )
        return await self.repo.get_with_full_data(trip.id)

    async def _check_trip_limit(self, user_id: int) -> None:
        """Kiểm tra user chưa vượt quá MAX_ACTIVE_TRIPS trips active."""
        count = await self.repo.count_active_by_user(user_id)
        if count >= MAX_ACTIVE_TRIPS:
            raise ConflictException(f"Maximum {MAX_ACTIVE_TRIPS} active trips allowed")

    async def _verify_owner(self, trip_id: int, user_id: int) -> Trip:
        """Verify user là owner của trip. Raise exception nếu không phải."""
        trip = await self.repo.get_with_full_data(trip_id)
        if not trip:
            raise NotFoundException("Trip not found")
        if trip.user_id != user_id:
            raise ForbiddenException("Not trip owner")
        return trip

    async def _issue_claim_token(self, trip_id: int) -> str:
        """Tạo claim token cho guest trip (hết hạn sau 24h)."""
        raw_token, token_hash = create_opaque_token("claim")
        expires_at = datetime.now(UTC) + timedelta(hours=24)
        await self.repo.create_claim_token(
            trip_id=trip_id,
            token_hash=token_hash,
            expires_at=expires_at,
        )
        return raw_token

    # ===================================================================
    # Private helpers — Sync logic (diff-based auto-save)
    # ===================================================================

    async def _sync_days(self, trip: Trip, incoming_days: list[DaySchema]) -> None:
        """Sync danh sách days theo diff logic.

        So sánh incoming data với existing data:
          • day có ID → UPDATE (cập nhật label, date, destination_name + sync activities)
          • day không có ID → CREATE mới
          • existing day không có trong incoming → DELETE
        """
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
                # Sync activities bên trong ngày
                await self._sync_activities(day, day_data.activities)
            else:
                # CREATE new day + activities
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

        # DELETE days không có trong incoming
        for existing_id in existing_map:
            if existing_id not in incoming_day_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_activities(self, day: TripDay, incoming: list[ActivitySchema]) -> None:
        """Sync danh sách activities trong ngày theo diff logic.

        Tương tự _sync_days:
          • activity có ID → UPDATE fields
          • activity không có ID → CREATE mới
          • existing activity không có trong incoming → DELETE
        """
        existing_map = {a.id: a for a in day.activities if a.id is not None}
        incoming_ids: set[int] = set()

        for idx, act_data in enumerate(incoming):
            if act_data.id and act_data.id in existing_map:
                # UPDATE existing activity
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
                # CREATE new activity
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

        # DELETE activities không có trong incoming
        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    async def _sync_accommodations(self, trip: Trip, incoming: list[AccommodationSchema]) -> None:
        """Sync danh sách accommodations theo diff logic.

        Tương tự _sync_days/_sync_activities.
        """
        existing_map = {a.id: a for a in trip.accommodations if a.id is not None}
        incoming_ids: set[int] = set()

        for acc_data in incoming:
            if acc_data.id and acc_data.id in existing_map:
                # UPDATE existing accommodation
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

        # DELETE accommodations không có trong incoming
        for existing_id in existing_map:
            if existing_id not in incoming_ids:
                await self.session.delete(existing_map[existing_id])

    # ===================================================================
    # Private helpers — Cost calculation
    # ===================================================================

    def _calculate_total_cost(self, trip: Trip) -> int:
        """Tính tổng chi phí lịch trình từ tất cả activities + accommodations.

        Bao gồm:
          • Activity costs: adult_price + child_price + custom_cost + bus + taxi
          • Activity extra expenses
          • Day-level extra expenses
          • Accommodation total prices
        """
        total = 0
        for day in trip.days:
            for activity in day.activities:
                # Chi phí chính của activity
                total += activity.adult_price or 0
                total += activity.child_price or 0
                total += activity.custom_cost or 0
                total += activity.bus_ticket_price or 0
                total += activity.taxi_cost or 0
                # Chi phí phát sinh cấp activity
                for expense in activity.extra_expenses:
                    total += expense.amount
            # Chi phí phát sinh cấp ngày
            for expense in day.extra_expenses:
                total += expense.amount
        # Chi phí chỗ ở
        for acc in trip.accommodations:
            total += acc.total_price or 0
        return total

    # ===================================================================
    # Private helpers — ORM → Schema conversion
    # ===================================================================

    @staticmethod
    def _activity_to_schema(activity: Activity) -> ActivitySchema:
        """Convert Activity ORM → ActivitySchema (không trigger lazy loads).

        Dùng cho response của add_activity / update_activity
        khi chưa eager-load extra_expenses.
        """
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
            extra_expenses=[],
        )

    async def _to_response(self, trip: Trip) -> ItineraryResponse:
        """Convert Trip ORM (kèm eager-loaded data) → ItineraryResponse đầy đủ.

        Traverse: trip → days → activities → extra_expenses
                  trip → accommodations
        """
        days = []
        for day in trip.days:
            # Convert activities trong ngày
            activities = []
            for act in day.activities:
                # Convert extra expenses của activity
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
            # Convert extra expenses cấp ngày
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

        # Convert accommodations
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
        """Convert Trip ORM → ItineraryResponse nhẹ (không kèm days/accommodations).

        Dùng cho list endpoint — giảm payload size.
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
            days=[],
            accommodations=[],
            created_at=trip.created_at,
            updated_at=trip.updated_at,
        )
