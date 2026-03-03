"""
============================================
app/schemas/trip.py — Schemas cho Trip (Itinerary)
============================================
Map giữa DB model Trip ↔ FE interface Itinerary:

FE (auth.ts Itinerary):          DB (models/trip.py):
  id: string                      id: UUID
  userId?: string                 user_id: UUID | None
  destination: string             destination: str
  startDate: string               start_date: date
  endDate: string                 end_date: date
  budget: number                  budget: float
  interests: string[]             interests: list[str]
  days: ItineraryDay[]            ← từ trip_places JOIN places
  totalCost: number               total_cost: float
  createdAt: string               created_at: datetime
  rating?: number                 rating: int | None
  feedback?: string               feedback: str | None

API endpoint: /api/v1/itineraries (FE name)
DB table: trips (ERD name)
============================================
"""

from datetime import date

from pydantic import BaseModel, Field, ConfigDict

from app.schemas.place import ItineraryDayResponse


class TripCreateRequest(BaseModel):
    """
    Schema cho POST /api/v1/itineraries/generate
    FE gửi từ TripPlanning.tsx form:
      { destination, startDate, endDate, budget, interests }
    """

    destination: str = Field(
        ...,
        description="Điểm đến (VD: 'Hà Nội', 'TP.HCM')",
        examples=["Hà Nội"],
    )
    startDate: str = Field(
        ...,
        description="Ngày bắt đầu (YYYY-MM-DD)",
        examples=["2025-01-15"],
    )
    endDate: str = Field(
        ...,
        description="Ngày kết thúc (YYYY-MM-DD)",
        examples=["2025-01-18"],
    )
    budget: float = Field(
        ...,
        gt=0,
        description="Ngân sách (VND)",
        examples=[5000000],
    )
    interests: list[str] = Field(
        default_factory=list,
        description="Sở thích: culture, food, nature, beach, adventure",
        examples=[["culture", "food"]],
    )


class ItineraryResponse(BaseModel):
    """
    Response khớp 1:1 với FE interface Itinerary trong auth.ts.
    Đây là schema chính trả về cho FE.

    FE mong đợi:
        { id, userId?, destination, startDate, endDate, budget,
          interests, days[], totalCost, createdAt, rating?, feedback? }
    """

    model_config = ConfigDict(from_attributes=True)

    id: str = Field(..., description="Trip ID")
    userId: str | None = Field(None, description="User ID (null nếu guest)")
    destination: str = Field(..., description="Điểm đến")
    startDate: str = Field(..., description="Ngày bắt đầu (YYYY-MM-DD)")
    endDate: str = Field(..., description="Ngày kết thúc (YYYY-MM-DD)")
    budget: float = Field(..., description="Ngân sách VND")
    interests: list[str] = Field(default_factory=list, description="Sở thích")
    days: list[ItineraryDayResponse] = Field(
        default_factory=list,
        description="Lịch trình theo ngày",
    )
    totalCost: float = Field(0, description="Tổng chi phí VND")
    createdAt: str = Field("", description="Ngày tạo (ISO string)")
    rating: int | None = Field(None, description="Đánh giá 1-5")
    feedback: str | None = Field(None, description="Nhận xét")

    @classmethod
    def from_db(
        cls, trip, days: list[ItineraryDayResponse] | None = None
    ) -> "ItineraryResponse":
        """
        Tạo ItineraryResponse từ SQLAlchemy Trip model.

        Args:
            trip: Trip ORM object (đã load trip_places relationship)
            days: Danh sách ItineraryDayResponse (nếu đã build sẵn)
                  Nếu None, tự build từ trip.trip_places
        """
        from app.schemas.place import ActivityResponse, ItineraryDayResponse as DayResp
        from datetime import timedelta

        # Build days từ trip_places nếu chưa có
        if days is None:
            days = []
            # Group trip_places theo day_number
            day_map: dict[int, list] = {}
            for tp in trip.trip_places:
                day_num = tp.day_number
                if day_num not in day_map:
                    day_map[day_num] = []
                day_map[day_num].append(tp)

            # Tạo ItineraryDayResponse cho mỗi ngày
            for day_num in sorted(day_map.keys()):
                trip_places = day_map[day_num]
                # Tính ngày thực tế từ start_date + day_number
                day_date = trip.start_date + timedelta(days=day_num - 1)
                activities = [
                    ActivityResponse.from_trip_place(tp)
                    for tp in sorted(trip_places, key=lambda x: x.visit_order)
                ]
                days.append(
                    DayResp(
                        day=day_num,
                        date=day_date.isoformat(),
                        activities=activities,
                    )
                )

        return cls(
            id=str(trip.id),
            userId=str(trip.user_id) if trip.user_id else None,
            destination=trip.destination,
            startDate=trip.start_date.isoformat() if trip.start_date else "",
            endDate=trip.end_date.isoformat() if trip.end_date else "",
            budget=float(trip.budget) if trip.budget else 0,
            interests=trip.interests or [],
            days=days,
            totalCost=float(trip.total_cost) if trip.total_cost else 0,
            createdAt=trip.created_at.isoformat() if trip.created_at else "",
            rating=trip.rating,
            feedback=trip.feedback,
        )


class RatingRequest(BaseModel):
    """
    Schema cho PUT /api/v1/itineraries/{id}/rating
    FE gửi khi user đánh giá lịch trình.
    Tương ứng rateItinerary() trong auth.ts
    """

    rating: int = Field(
        ...,
        ge=1,
        le=5,
        description="Đánh giá 1-5 sao",
    )
    feedback: str | None = Field(
        None,
        max_length=1000,
        description="Nhận xét (tùy chọn)",
    )


class ItineraryListResponse(BaseModel):
    """Response cho GET /api/v1/itineraries — danh sách lịch trình."""

    itineraries: list[ItineraryResponse] = Field(
        default_factory=list,
        description="Danh sách lịch trình",
    )
    total: int = Field(0, description="Tổng số lịch trình")
