"""
============================================
app/schemas/place.py — Schemas cho Place
============================================
Map giữa DB model Place ↔ FE Activity interface:

FE (auth.ts Activity):            DB (models/place.py):
  id: string                       id: UUID (trip_place.id)
  time: string                     trip_place.time
  title: string                    place_name
  description: string              description
  location: string                 location
  cost: number                     cost (hoặc trip_place.custom_cost)
  duration: string                 duration
  image: string                    image
  coordinates?:                    latitude, longitude
    { lat: number, lng: number }
============================================
"""

from pydantic import BaseModel, Field, ConfigDict


class PlaceBase(BaseModel):
    """Base schema cho Place — các field chung."""

    place_name: str = Field(..., description="Tên địa điểm")
    category: str | None = Field(None, description="Phân loại")
    description: str | None = Field(None, description="Mô tả")
    location: str | None = Field(None, description="Địa chỉ")
    cost: float | None = Field(None, description="Chi phí trung bình VND")
    duration: str | None = Field(None, description="Thời gian tham quan")
    image: str | None = Field(None, description="URL ảnh")
    latitude: float | None = Field(None, description="Vĩ độ")
    longitude: float | None = Field(None, description="Kinh độ")
    destination: str | None = Field(None, description="Thành phố")
    rating: float | None = Field(None, description="Đánh giá")
    popularity_score: float | None = Field(None, description="Độ phổ biến")


class PlaceResponse(PlaceBase):
    """Response trả về FE cho danh sách destinations/places."""

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Place ID")

    @classmethod
    def from_db(cls, place) -> "PlaceResponse":
        return cls(
            id=str(place.id),
            place_name=place.place_name,
            category=place.category,
            description=place.description,
            location=place.location,
            cost=float(place.cost) if place.cost else None,
            duration=place.duration,
            image=place.image,
            latitude=float(place.latitude) if place.latitude else None,
            longitude=float(place.longitude) if place.longitude else None,
            destination=place.destination,
            rating=float(place.rating) if place.rating else None,
            popularity_score=(
                float(place.popularity_score) if place.popularity_score else None
            ),
        )


class ActivityResponse(BaseModel):
    """
    Response khớp 1:1 với FE interface Activity trong auth.ts.
    Được tạo bằng cách JOIN trip_places + places.

    FE mong đợi:
        { id, time, title, description, location, cost, duration, image, coordinates? }
    """

    id: str = Field(..., description="Activity ID (= trip_place.id)")
    time: str = Field("", description="Giờ tham quan")
    title: str = Field(..., description="Tên hoạt động (= place.place_name)")
    description: str = Field("", description="Mô tả")
    location: str = Field("", description="Địa chỉ")
    cost: float = Field(0, description="Chi phí VND")
    duration: str = Field("", description="Thời gian")
    image: str = Field("", description="URL ảnh")
    coordinates: dict | None = Field(
        None,
        description="Tọa độ { lat, lng }",
    )

    @classmethod
    def from_trip_place(cls, trip_place) -> "ActivityResponse":
        """
        Tạo ActivityResponse từ TripPlace + Place (JOIN).
        trip_place.place chứa Place object nhờ relationship.
        """
        place = trip_place.place
        coordinates = None
        if place.latitude and place.longitude:
            coordinates = {
                "lat": float(place.latitude),
                "lng": float(place.longitude),
            }

        return cls(
            id=str(trip_place.id),
            time=trip_place.time or "",
            title=place.place_name,
            description=place.description or "",
            location=place.location or "",
            cost=float(trip_place.custom_cost or place.cost or 0),
            duration=place.duration or "",
            image=place.image or "",
            coordinates=coordinates,
        )


class ItineraryDayResponse(BaseModel):
    """
    Response khớp với FE interface ItineraryDay trong auth.ts.
    FE mong đợi: { day, date, activities[] }
    """

    day: int = Field(..., description="Ngày thứ mấy (1, 2, 3, ...)")
    date: str = Field(..., description="Ngày (YYYY-MM-DD)")
    activities: list[ActivityResponse] = Field(
        default_factory=list,
        description="Danh sách hoạt động trong ngày",
    )
