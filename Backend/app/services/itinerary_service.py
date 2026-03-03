"""
============================================
app/services/itinerary_service.py — Itinerary (Trip) Service
============================================
Xử lý logic nghiệp vụ cho lịch trình du lịch:
  - generate: Tạo lịch trình mới (AI hoặc fallback mock)
  - get_all: Lấy danh sách lịch trình (SavedItineraries page)
  - get_by_id: Lấy chi tiết 1 lịch trình (ItineraryView page)
  - delete: Xóa lịch trình
  - rate: Đánh giá lịch trình
  - remove_activity: Xóa 1 activity trong lịch trình (edit mode)

Mapping ERD → FE:
  DB: Trip + TripPlace + Place → FE: Itinerary + ItineraryDay + Activity

Flow tạo lịch trình:
  1. FE gửi: { destination, startDate, endDate, budget, interests }
  2. BE gọi AI (Gemini) hoặc dùng fallback mock data
  3. AI trả về JSON danh sách activities theo ngày
  4. BE lưu Trip + Places (nếu chưa có) + TripPlaces
  5. BE trả về ItineraryResponse cho FE
============================================
"""

import json
import uuid
from datetime import date, datetime, timedelta

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.trip import Trip
from app.models.place import Place
from app.models.trip_place import TripPlace
from app.schemas.trip import TripCreateRequest, ItineraryResponse, RatingRequest
from app.schemas.place import ActivityResponse, ItineraryDayResponse


# --- Fallback mock data (từ FE itinerary.ts) ---
# Dùng khi không có Gemini API key hoặc AI bị lỗi
FALLBACK_DATA: dict[str, list[dict]] = {
    "Hà Nội": [
        {
            "title": "Hồ Hoàn Kiếm",
            "description": "Tham quan hồ Hoàn Kiếm và đền Ngọc Sơn",
            "cost": 0,
            "duration": "2 giờ",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
        {
            "title": "Phố Cổ Hà Nội",
            "description": "Khám phá 36 phố phường cổ kính",
            "cost": 0,
            "duration": "3 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
        {
            "title": "Lăng Chủ tịch Hồ Chí Minh",
            "description": "Tham quan lăng Bác và Khu di tích",
            "cost": 100000,
            "duration": "2 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
        {
            "title": "Văn Miếu Quốc Tử Giám",
            "description": "Di tích văn hóa giáo dục Việt Nam",
            "cost": 30000,
            "duration": "1.5 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
        {
            "title": "Chùa Một Cột",
            "description": "Chùa cổ độc đáo của Hà Nội",
            "cost": 0,
            "duration": "30 phút",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
        {
            "title": "Ăn tối tại phố Tạ Hiện",
            "description": "Thưởng thức ẩm thực đường phố",
            "cost": 200000,
            "duration": "2 giờ",
            "category": "food",
            "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
        },
    ],
    "TP. Hồ Chí Minh": [
        {
            "title": "Dinh Độc Lập",
            "description": "Tham quan dinh thự lịch sử",
            "cost": 40000,
            "duration": "2 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
        {
            "title": "Nhà thờ Đức Bà",
            "description": "Công trình kiến trúc Pháp cổ",
            "cost": 0,
            "duration": "1 giờ",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
        {
            "title": "Bưu điện Trung tâm Sài Gòn",
            "description": "Kiến trúc Pháp đẹp mắt",
            "cost": 0,
            "duration": "30 phút",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
        {
            "title": "Chợ Bến Thành",
            "description": "Mua sắm và thưởng thức ẩm thực",
            "cost": 150000,
            "duration": "2 giờ",
            "category": "food",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
        {
            "title": "Phố đi bộ Nguyễn Huệ",
            "description": "Dạo bộ và ngắm cảnh thành phố",
            "cost": 0,
            "duration": "1.5 giờ",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
        {
            "title": "Địa đạo Củ Chi",
            "description": "Khám phá hệ thống địa đạo lịch sử",
            "cost": 250000,
            "duration": "4 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
        },
    ],
    "Đà Nẵng": [
        {
            "title": "Bãi biển Mỹ Khê",
            "description": "Tắm biển và thư giãn",
            "cost": 0,
            "duration": "3 giờ",
            "category": "beach",
            "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
        },
        {
            "title": "Bà Nà Hills",
            "description": "Cáp treo và Cầu Vàng nổi tiếng",
            "cost": 750000,
            "duration": "6 giờ",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
        },
        {
            "title": "Ngũ Hành Sơn",
            "description": "Khám phá động và chùa",
            "cost": 40000,
            "duration": "2.5 giờ",
            "category": "nature",
            "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
        },
        {
            "title": "Cầu Rồng",
            "description": "Xem cầu phun lửa và nước",
            "cost": 0,
            "duration": "1 giờ",
            "category": "sightseeing",
            "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
        },
        {
            "title": "Chợ Hàn",
            "description": "Mua sắm đặc sản địa phương",
            "cost": 200000,
            "duration": "2 giờ",
            "category": "food",
            "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
        },
    ],
    "Hội An": [
        {
            "title": "Phố cổ Hội An",
            "description": "Dạo bộ phố cổ với đèn lồng",
            "cost": 120000,
            "duration": "3 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
        },
        {
            "title": "Chùa Cầu",
            "description": "Biểu tượng của Hội An",
            "cost": 0,
            "duration": "30 phút",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
        },
        {
            "title": "Bãi biển An Bàng",
            "description": "Thư giãn tại bãi biển đẹp",
            "cost": 0,
            "duration": "2 giờ",
            "category": "beach",
            "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
        },
        {
            "title": "Làng rau Trà Quế",
            "description": "Trải nghiệm làm nông dân",
            "cost": 150000,
            "duration": "3 giờ",
            "category": "nature",
            "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
        },
        {
            "title": "Thả đèn lồng trên sông",
            "description": "Hoạt động văn hóa đặc sắc",
            "cost": 50000,
            "duration": "1 giờ",
            "category": "culture",
            "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
        },
    ],
}


def _calculate_days(start_str: str, end_str: str) -> int:
    """Tính số ngày du lịch (giống calculateDays trong FE itinerary.ts)."""
    start = date.fromisoformat(start_str)
    end = date.fromisoformat(end_str)
    diff = abs((end - start).days)
    return max(1, diff)


def _generate_fallback_activities(
    destination: str,
    num_days: int,
) -> list[list[dict]]:
    """
    Tạo lịch trình từ mock data (giống FE generateItinerary logic).
    Trả về: list[ngày][activities] — mỗi ngày có 3 activities.

    Logic giống FE:
      - Mỗi ngày tối đa 3 activities
      - Xoay vòng qua danh sách activities
      - Giờ mặc định: 09:00, 13:00, 17:00
    """
    all_activities = FALLBACK_DATA.get(destination, [])
    if not all_activities:
        # Nếu destination không có mock data, dùng data Hà Nội
        all_activities = FALLBACK_DATA.get("Hà Nội", [])

    days_activities = []
    for i in range(num_days):
        day_acts = []
        activities_per_day = min(3, len(all_activities))
        for j in range(activities_per_day):
            idx = (i * activities_per_day + j) % len(all_activities)
            act = all_activities[idx].copy()
            # Gán giờ mặc định giống FE
            act["time"] = ["09:00", "13:00", "17:00"][j]
            act["location"] = destination
            day_acts.append(act)
        days_activities.append(day_acts)

    return days_activities


async def _get_or_create_place(
    db: AsyncSession,
    place_data: dict,
    destination: str,
) -> Place:
    """
    Tìm place theo tên trong DB, nếu chưa có thì tạo mới.
    Tránh duplicate places cho cùng 1 địa điểm.
    """
    # Tìm place đã tồn tại
    result = await db.execute(
        select(Place).where(
            Place.place_name == place_data["title"],
            Place.destination == destination,
        )
    )
    existing = result.scalar_one_or_none()
    if existing:
        return existing

    # Tạo mới
    new_place = Place(
        place_name=place_data["title"],
        description=place_data.get("description", ""),
        category=place_data.get("category"),
        cost=place_data.get("cost", 0),
        duration=place_data.get("duration", ""),
        image=place_data.get("image", ""),
        location=place_data.get("location", destination),
        destination=destination,
        latitude=place_data.get("latitude"),
        longitude=place_data.get("longitude"),
    )
    db.add(new_place)
    await db.flush()  # Lấy ID mà chưa commit
    return new_place


async def generate_itinerary(
    data: TripCreateRequest,
    user_id: uuid.UUID | None,
    db: AsyncSession,
) -> ItineraryResponse:
    """
    Tạo lịch trình du lịch mới.

    Flow:
      1. Thử gọi AI (Gemini) để tạo lịch trình thông minh
      2. Nếu AI thất bại → dùng fallback mock data (giống FE)
      3. Lưu Trip + Places + TripPlaces vào DB
      4. Trả về ItineraryResponse

    Args:
        data: TripCreateRequest từ FE
        user_id: UUID nếu đã đăng nhập, None nếu guest
        db: AsyncSession
    """
    num_days = _calculate_days(data.startDate, data.endDate)
    start_date = date.fromisoformat(data.startDate)
    end_date = date.fromisoformat(data.endDate)

    # --- Bước 1: Thử AI generation ---
    ai_result = None
    try:
        ai_result = await _generate_with_ai(
            destination=data.destination,
            num_days=num_days,
            budget=data.budget,
            interests=data.interests,
        )
    except Exception as e:
        print(f"⚠️ AI generation failed, using fallback: {e}")

    # --- Bước 2: Fallback nếu AI thất bại ---
    if ai_result is None:
        ai_result = _generate_fallback_activities(data.destination, num_days)

    # --- Bước 3: Tạo Trip record ---
    trip = Trip(
        user_id=user_id,
        destination=data.destination,
        total_days=num_days,
        budget=data.budget,
        start_date=start_date,
        end_date=end_date,
        interests=data.interests,
    )
    db.add(trip)
    await db.flush()  # Lấy trip.id

    # --- Bước 4: Tạo Places + TripPlaces ---
    total_cost = 0.0
    for day_idx, day_activities in enumerate(ai_result):
        for order_idx, act_data in enumerate(day_activities):
            # Tạo hoặc lấy Place
            place = await _get_or_create_place(db, act_data, data.destination)

            # Tạo TripPlace (junction)
            cost = float(act_data.get("cost", 0))
            total_cost += cost

            trip_place = TripPlace(
                trip_id=trip.id,
                place_id=place.id,
                day_number=day_idx + 1,
                visit_order=order_idx + 1,
                time=act_data.get("time", ""),
                custom_cost=cost if cost > 0 else None,
            )
            db.add(trip_place)

    # Thêm phí ăn ở (giống FE: 500k accommodation + 300k food / ngày)
    total_cost += num_days * 500000  # Accommodation
    total_cost += num_days * 300000  # Food

    trip.total_cost = total_cost

    # --- Bước 5: Commit tất cả ---
    await db.commit()

    # Refresh để load relationships
    await db.refresh(trip)

    # --- Bước 6: Reload trip với full relationships ---
    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip.id)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
    )
    trip = result.scalar_one()

    return ItineraryResponse.from_db(trip)


async def _generate_with_ai(
    destination: str,
    num_days: int,
    budget: float,
    interests: list[str],
) -> list[list[dict]] | None:
    """
    Gọi Google Gemini API để tạo lịch trình AI.

    Trả về: list[ngày][activities] hoặc None nếu thất bại.

    Prompt yêu cầu AI trả JSON format:
    [
      [ // Ngày 1
        { "title": "...", "description": "...", "cost": 0, "duration": "2 giờ",
          "time": "09:00", "location": "...", "category": "...", "image": "" }
      ],
      [ // Ngày 2 ... ]
    ]
    """
    from app.config import settings

    if not settings.GEMINI_API_KEY:
        return None

    import google.generativeai as genai

    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    # Chuẩn bị prompt
    interests_str = ", ".join(interests) if interests else "tổng hợp"
    budget_formatted = f"{budget:,.0f} VND"

    prompt = f"""Bạn là chuyên gia du lịch Việt Nam. Hãy tạo lịch trình du lịch {destination} trong {num_days} ngày.

Ngân sách: {budget_formatted}
Sở thích: {interests_str}

Yêu cầu:
- Mỗi ngày có 3 hoạt động (sáng, chiều, tối)
- Chi phí phải nằm trong ngân sách (trừ 500.000 VND/ngày ăn ở)
- Ưu tiên hoạt động phù hợp sở thích
- Trả về CHÍNH XÁC JSON format, KHÔNG có text khác

Format JSON (array of days, each day is array of activities):
[
  [
    {{"title": "Tên địa điểm", "description": "Mô tả ngắn", "cost": 50000, "duration": "2 giờ", "time": "09:00", "location": "Địa chỉ, {destination}", "category": "culture", "image": ""}}
  ]
]

Category phải là 1 trong: culture, food, nature, beach, adventure, sightseeing, shopping

Chỉ trả về JSON, không có text giải thích."""

    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Xử lý trường hợp AI wrap trong ```json...```
        if text.startswith("```"):
            text = text.split("\n", 1)[1]  # Bỏ dòng ```json
            text = text.rsplit("```", 1)[0]  # Bỏ dòng ``` cuối
            text = text.strip()

        result = json.loads(text)

        # Validate format
        if isinstance(result, list) and len(result) > 0:
            return result

        return None
    except Exception as e:
        print(f"⚠️ Gemini API error: {e}")
        return None


async def get_user_itineraries(
    user_id: uuid.UUID,
    db: AsyncSession,
) -> list[ItineraryResponse]:
    """
    Lấy tất cả lịch trình của user.
    Tương ứng getSavedItineraries() trong FE auth.ts
    """
    result = await db.execute(
        select(Trip)
        .where(Trip.user_id == user_id)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
        .order_by(Trip.created_at.desc())
    )
    trips = result.scalars().all()

    return [ItineraryResponse.from_db(trip) for trip in trips]


async def get_itinerary_by_id(
    itinerary_id: str,
    db: AsyncSession,
) -> ItineraryResponse | None:
    """
    Lấy chi tiết 1 lịch trình theo ID.
    Tương ứng getItineraryById() trong FE auth.ts
    """
    try:
        trip_uuid = uuid.UUID(itinerary_id)
    except ValueError:
        return None

    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_uuid)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
    )
    trip = result.scalar_one_or_none()

    if not trip:
        return None

    return ItineraryResponse.from_db(trip)


async def delete_itinerary(
    itinerary_id: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> bool:
    """
    Xóa lịch trình (chỉ owner mới xóa được).
    Tương ứng deleteItinerary() trong FE auth.ts
    """
    try:
        trip_uuid = uuid.UUID(itinerary_id)
    except ValueError:
        return False

    result = await db.execute(
        select(Trip).where(Trip.id == trip_uuid, Trip.user_id == user_id)
    )
    trip = result.scalar_one_or_none()

    if not trip:
        return False

    await db.delete(trip)  # CASCADE sẽ xóa trip_places
    await db.commit()
    return True


async def rate_itinerary(
    itinerary_id: str,
    data: RatingRequest,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ItineraryResponse | None:
    """
    Đánh giá lịch trình (1-5 sao + feedback).
    Tương ứng rateItinerary() trong FE auth.ts
    """
    try:
        trip_uuid = uuid.UUID(itinerary_id)
    except ValueError:
        return None

    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_uuid)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
    )
    trip = result.scalar_one_or_none()

    if not trip:
        return None

    trip.rating = data.rating
    trip.feedback = data.feedback

    await db.commit()

    # Expire cache để reload clean
    db.expire_all()

    # Reload trip with full relationships (db.refresh doesn't reload relationships)
    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_uuid)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
    )
    trip = result.scalar_one()

    return ItineraryResponse.from_db(trip)


async def remove_activity(
    itinerary_id: str,
    activity_id: str,
    user_id: uuid.UUID,
    db: AsyncSession,
) -> ItineraryResponse | None:
    """
    Xóa 1 activity khỏi lịch trình (edit mode trong ItineraryView).
    activity_id = trip_place.id
    """
    try:
        trip_uuid = uuid.UUID(itinerary_id)
        tp_uuid = uuid.UUID(activity_id)
    except ValueError:
        return None

    # Verify ownership
    result = await db.execute(
        select(Trip).where(Trip.id == trip_uuid, Trip.user_id == user_id)
    )
    trip = result.scalar_one_or_none()
    if not trip:
        return None

    # Tìm và xóa trip_place
    result = await db.execute(
        select(TripPlace).where(TripPlace.id == tp_uuid, TripPlace.trip_id == trip_uuid)
    )
    trip_place = result.scalar_one_or_none()
    if not trip_place:
        return None

    # Trừ chi phí
    cost = float(trip_place.custom_cost or 0)
    if trip.total_cost and cost > 0:
        trip.total_cost = float(trip.total_cost) - cost

    await db.delete(trip_place)
    await db.commit()

    # Expire tất cả objects trong session để tránh stale identity map
    # Khi delete trip_place, session cache còn giữ reference cũ
    # → selectinload không reload đúng → MissingGreenlet error
    db.expire_all()

    # Reload trip với full relationships
    result = await db.execute(
        select(Trip)
        .where(Trip.id == trip_uuid)
        .options(selectinload(Trip.trip_places).selectinload(TripPlace.place))
    )
    trip = result.scalar_one()

    return ItineraryResponse.from_db(trip)
