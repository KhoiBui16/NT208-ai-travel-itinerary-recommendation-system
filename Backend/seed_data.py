"""
============================================
seed_data.py — Script seed dữ liệu ban đầu
============================================
Chạy: cd Backend && python seed_data.py

Script này tạo dữ liệu mẫu cho bảng places,
import từ mock data của FE (itinerary.ts).
Giúp BE có data sẵn để test mà không cần AI.

Chỉ chạy 1 lần khi setup DB lần đầu.
Nếu chạy lại, skip places đã tồn tại (check by name + destination).
============================================
"""

import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal, engine, Base
from app.models.place import Place

# Import để Base biết tất cả models
from app.models import user, trip, place, trip_place  # noqa: F401


# --- Dữ liệu seed từ FE itinerary.ts ---
SEED_PLACES = [
    # === Hà Nội ===
    {
        "place_name": "Hồ Hoàn Kiếm",
        "description": "Tham quan hồ Hoàn Kiếm và đền Ngọc Sơn",
        "cost": 0,
        "duration": "2 giờ",
        "category": "sightseeing",
        "destination": "Hà Nội",
        "location": "Quận Hoàn Kiếm, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    {
        "place_name": "Phố Cổ Hà Nội",
        "description": "Khám phá 36 phố phường cổ kính",
        "cost": 0,
        "duration": "3 giờ",
        "category": "culture",
        "destination": "Hà Nội",
        "location": "Quận Hoàn Kiếm, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    {
        "place_name": "Lăng Chủ tịch Hồ Chí Minh",
        "description": "Tham quan lăng Bác và Khu di tích",
        "cost": 100000,
        "duration": "2 giờ",
        "category": "culture",
        "destination": "Hà Nội",
        "location": "Quận Ba Đình, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    {
        "place_name": "Văn Miếu Quốc Tử Giám",
        "description": "Di tích văn hóa giáo dục Việt Nam",
        "cost": 30000,
        "duration": "1.5 giờ",
        "category": "culture",
        "destination": "Hà Nội",
        "location": "58 Quốc Tử Giám, Đống Đa, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    {
        "place_name": "Chùa Một Cột",
        "description": "Chùa cổ độc đáo của Hà Nội",
        "cost": 0,
        "duration": "30 phút",
        "category": "culture",
        "destination": "Hà Nội",
        "location": "Quận Ba Đình, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    {
        "place_name": "Ăn tối tại phố Tạ Hiện",
        "description": "Thưởng thức ẩm thực đường phố",
        "cost": 200000,
        "duration": "2 giờ",
        "category": "food",
        "destination": "Hà Nội",
        "location": "Phố Tạ Hiện, Hoàn Kiếm, Hà Nội",
        "image": "https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1080",
    },
    # === TP. Hồ Chí Minh ===
    {
        "place_name": "Dinh Độc Lập",
        "description": "Tham quan dinh thự lịch sử",
        "cost": 40000,
        "duration": "2 giờ",
        "category": "culture",
        "destination": "TP. Hồ Chí Minh",
        "location": "135 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    {
        "place_name": "Nhà thờ Đức Bà",
        "description": "Công trình kiến trúc Pháp cổ",
        "cost": 0,
        "duration": "1 giờ",
        "category": "sightseeing",
        "destination": "TP. Hồ Chí Minh",
        "location": "1 Công xã Paris, Quận 1, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    {
        "place_name": "Bưu điện Trung tâm Sài Gòn",
        "description": "Kiến trúc Pháp đẹp mắt",
        "cost": 0,
        "duration": "30 phút",
        "category": "sightseeing",
        "destination": "TP. Hồ Chí Minh",
        "location": "2 Công xã Paris, Quận 1, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    {
        "place_name": "Chợ Bến Thành",
        "description": "Mua sắm và thưởng thức ẩm thực",
        "cost": 150000,
        "duration": "2 giờ",
        "category": "food",
        "destination": "TP. Hồ Chí Minh",
        "location": "Chợ Bến Thành, Quận 1, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    {
        "place_name": "Phố đi bộ Nguyễn Huệ",
        "description": "Dạo bộ và ngắm cảnh thành phố",
        "cost": 0,
        "duration": "1.5 giờ",
        "category": "sightseeing",
        "destination": "TP. Hồ Chí Minh",
        "location": "Đường Nguyễn Huệ, Quận 1, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    {
        "place_name": "Địa đạo Củ Chi",
        "description": "Khám phá hệ thống địa đạo lịch sử",
        "cost": 250000,
        "duration": "4 giờ",
        "category": "culture",
        "destination": "TP. Hồ Chí Minh",
        "location": "Huyện Củ Chi, TP.HCM",
        "image": "https://images.unsplash.com/photo-1532961432136-ca37cae5fa4a?w=1080",
    },
    # === Đà Nẵng ===
    {
        "place_name": "Bãi biển Mỹ Khê",
        "description": "Tắm biển và thư giãn",
        "cost": 0,
        "duration": "3 giờ",
        "category": "beach",
        "destination": "Đà Nẵng",
        "location": "Đường Võ Nguyên Giáp, Đà Nẵng",
        "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
    },
    {
        "place_name": "Bà Nà Hills",
        "description": "Cáp treo và Cầu Vàng nổi tiếng",
        "cost": 750000,
        "duration": "6 giờ",
        "category": "sightseeing",
        "destination": "Đà Nẵng",
        "location": "Hòa Ninh, Hòa Vang, Đà Nẵng",
        "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
    },
    {
        "place_name": "Ngũ Hành Sơn",
        "description": "Khám phá động và chùa",
        "cost": 40000,
        "duration": "2.5 giờ",
        "category": "nature",
        "destination": "Đà Nẵng",
        "location": "Quận Ngũ Hành Sơn, Đà Nẵng",
        "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
    },
    {
        "place_name": "Cầu Rồng",
        "description": "Xem cầu phun lửa và nước",
        "cost": 0,
        "duration": "1 giờ",
        "category": "sightseeing",
        "destination": "Đà Nẵng",
        "location": "Cầu Rồng, Đà Nẵng",
        "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
    },
    {
        "place_name": "Chợ Hàn",
        "description": "Mua sắm đặc sản địa phương",
        "cost": 200000,
        "duration": "2 giờ",
        "category": "food",
        "destination": "Đà Nẵng",
        "location": "119 Trần Phú, Hải Châu, Đà Nẵng",
        "image": "https://images.unsplash.com/photo-1723142282970-1fd415eec1ad?w=1080",
    },
    # === Hội An ===
    {
        "place_name": "Phố cổ Hội An",
        "description": "Dạo bộ phố cổ với đèn lồng",
        "cost": 120000,
        "duration": "3 giờ",
        "category": "culture",
        "destination": "Hội An",
        "location": "Phố cổ Hội An, Quảng Nam",
        "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
    },
    {
        "place_name": "Chùa Cầu",
        "description": "Biểu tượng của Hội An",
        "cost": 0,
        "duration": "30 phút",
        "category": "culture",
        "destination": "Hội An",
        "location": "Chùa Cầu, Hội An, Quảng Nam",
        "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
    },
    {
        "place_name": "Bãi biển An Bàng",
        "description": "Thư giãn tại bãi biển đẹp",
        "cost": 0,
        "duration": "2 giờ",
        "category": "beach",
        "destination": "Hội An",
        "location": "Bãi biển An Bàng, Hội An",
        "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
    },
    {
        "place_name": "Làng rau Trà Quế",
        "description": "Trải nghiệm làm nông dân",
        "cost": 150000,
        "duration": "3 giờ",
        "category": "nature",
        "destination": "Hội An",
        "location": "Trà Quế, Cẩm Hà, Hội An",
        "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
    },
    {
        "place_name": "Thả đèn lồng trên sông",
        "description": "Hoạt động văn hóa đặc sắc",
        "cost": 50000,
        "duration": "1 giờ",
        "category": "culture",
        "destination": "Hội An",
        "location": "Bờ sông Thu Bồn, Hội An",
        "image": "https://images.unsplash.com/photo-1664650440553-ab53804814b3?w=1080",
    },
]


async def seed():
    """
    Seed dữ liệu places vào DB.
    Skip nếu place đã tồn tại (check by name + destination).
    """
    # Tạo bảng nếu chưa có
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        created = 0
        skipped = 0

        for pdata in SEED_PLACES:
            # Check đã tồn tại chưa
            result = await session.execute(
                select(Place).where(
                    Place.place_name == pdata["place_name"],
                    Place.destination == pdata["destination"],
                )
            )
            if result.scalar_one_or_none():
                skipped += 1
                continue

            # Tạo mới
            new_place = Place(**pdata)
            session.add(new_place)
            created += 1

        await session.commit()
        print(
            f"✅ Seed hoàn tất: {created} places tạo mới, {skipped} đã tồn tại (skip)"
        )


if __name__ == "__main__":
    asyncio.run(seed())
