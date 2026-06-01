"""Itinerary request/response schemas (Pydantic models).

Tất cả schema sử dụng CamelCaseModel để auto-convert snake_case ↔ camelCase
khi giao tiếp với FE.

Phân nhóm:
  1. Sub-schemas       — ExtraExpenseSchema, ActivitySchema, DaySchema,
                         AccommodationSchema, TravelerInfo
  2. Request schemas   — GenerateItineraryRequest, CreateTripRequest,
                         UpdateTripRequest, ClaimTripRequest
  3. Response schemas  — ShareResponse, ItineraryResponse
"""

from datetime import date, datetime
from typing import Literal

from pydantic import Field, field_validator

from src.core.schema import CamelCaseModel
from src.places.schemas import HotelResponse

# ---------------------------------------------------------------------------
# Literal types — các giá trị cho phép
# ---------------------------------------------------------------------------

ActivityType = Literal["food", "attraction", "nature", "entertainment", "shopping"]
TransportType = Literal["walk", "bike", "bus", "taxi"]
ExpenseCategory = Literal["food", "attraction", "entertainment", "transportation", "shopping"]


# ===========================================================================
# 1. Sub-schemas — Thành phần con dùng chung cho request & response
# ===========================================================================


class ExtraExpenseSchema(CamelCaseModel):
    """Chi phí phát sinh cho activity hoặc day."""

    id: int | None = None
    name: str
    amount: int = Field(ge=0)  # Đơn vị: VNĐ
    category: ExpenseCategory  # Loại chi phí


class ActivitySchema(CamelCaseModel):
    """Hoạt động trong ngày — aligned với FE Activity interface.

    Cost logic:
      • food/attraction: adultPrice × adults + childPrice × children
      • shopping/entertainment: customCost (flat amount)
      • transportation: busTicketPrice × total_people (bus) hoặc taxiCost (taxi)
    """

    id: int | None = None
    time: str  # Giờ bắt đầu (HH:MM)
    end_time: str | None = None  # Giờ kết thúc (HH:MM)
    name: str  # Tên hoạt động
    location: str = ""  # Địa chỉ
    description: str = ""  # Mô tả chi tiết
    type: ActivityType  # Loại hoạt động
    image: str = ""  # URL ảnh
    transportation: TransportType | None = None  # Phương tiện di chuyển

    # --- Cost fields (đơn vị: VNĐ) ---
    adult_price: int | None = Field(default=None, ge=0)  # Giá vé/ăn người lớn
    child_price: int | None = Field(default=None, ge=0)  # Giá vé/ăn trẻ em
    custom_cost: int | None = Field(default=None, ge=0)  # Chi phí tùy chỉnh
    bus_ticket_price: int | None = Field(default=None, ge=0)  # Giá vé bus/người
    taxi_cost: int | None = Field(default=None, ge=0)  # Tổng chi phí taxi

    # --- Extra expenses ---
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)


class DaySchema(CamelCaseModel):
    """Một ngày trong lịch trình."""

    id: int | None = None
    label: str  # "Ngày 1 - Hà Nội"
    date: str  # ISO date string
    activities: list[ActivitySchema] = Field(default_factory=list)
    destination_name: str | None = None  # Tên điểm đến của ngày
    extra_expenses: list[ExtraExpenseSchema] = Field(default_factory=list)


class AccommodationSchema(CamelCaseModel):
    """Thông tin chỗ ở — aligned với FE Accommodation interface.

    Có thể chứa hotel object (từ DB) hoặc chỉ thông tin manual.
    """

    id: int | None = None
    hotel: HotelResponse | None = None  # Hotel entity (nếu có)
    day_ids: list[int] = Field(default_factory=list)  # IDs các ngày sử dụng
    booking_type: Literal["hourly", "nightly", "daily"] | None = None
    duration: int | None = Field(default=None, ge=0)  # Số đêm/giờ/ngày
    name: str | None = None  # Tên chỗ ở
    check_in: str | None = None  # Giờ/ngày check-in
    check_out: str | None = None  # Giờ/ngày check-out
    price_per_night: int | None = Field(default=None, ge=0)  # Giá/đêm (VNĐ)
    total_price: int | None = Field(default=None, ge=0)  # Tổng giá (VNĐ)


class TravelerInfo(CamelCaseModel):
    """Thông tin số lượng du khách."""

    adults: int = Field(ge=1)  # Số người lớn (ít nhất 1)
    children: int = Field(default=0, ge=0)  # Số trẻ em
    total: int = Field(ge=1)  # Tổng = adults + children


# ===========================================================================
# 2. Request schemas — Dữ liệu FE gửi lên
# ===========================================================================


class GenerateItineraryRequest(CamelCaseModel):
    """Request tạo lịch trình bằng AI (Phase C.1).

    FE gửi destination + khoảng ngày + budget + travelers + interests
    → BE gọi AI pipeline → trả về ItineraryResponse đầy đủ.
    """

    destination: str = Field(min_length=1, max_length=100)  # Tên điểm đến
    start_date: date  # Ngày bắt đầu
    end_date: date  # Ngày kết thúc
    budget: int = Field(gt=0)  # Ngân sách (VNĐ)
    adults: int = Field(default=1, ge=1)  # Số người lớn
    children: int = Field(default=0, ge=0)  # Số trẻ em
    interests: list[str] = Field(default_factory=list)  # Sở thích: food, attraction, ...

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info: object) -> date:
        """Ensure end_date is not before start_date."""
        data = getattr(info, "data", {})
        start_date = data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("end_date must be on or after start_date")
        return value


class CreateTripRequest(CamelCaseModel):
    """Request tạo lịch trình thủ công (manual).

    Tạo trip rỗng (không có days/activities) → user tự thêm sau qua auto-save.
    """

    destination: str  # Tên điểm đến
    trip_name: str  # Tên lịch trình
    start_date: date  # Ngày bắt đầu
    end_date: date  # Ngày kết thúc
    budget: int = Field(gt=0)  # Ngân sách (VNĐ)
    adults_count: int = Field(default=1, ge=1)  # Số người lớn
    children_count: int = Field(default=0, ge=0)  # Số trẻ em
    interests: list[str] = Field(default_factory=list)  # Sở thích

    @field_validator("end_date")
    @classmethod
    def validate_date_order(cls, value: date, info: object) -> date:
        """Ensure end_date is not before start_date."""
        data = getattr(info, "data", {})
        start_date = data.get("start_date")
        if start_date and value < start_date:
            raise ValueError("end_date must be on or after start_date")
        return value


class UpdateTripRequest(CamelCaseModel):
    """Request auto-save toàn bộ lịch trình (nested update).

    FE gửi diff data — chỉ các field thay đổi.
    BE sync days/activities/accommodations theo diff logic.
    """

    trip_name: str | None = None  # Tên mới (nếu đổi)
    budget: int | None = Field(default=None, gt=0)  # Budget mới
    days: list[DaySchema] | None = None  # Toàn bộ days (sync)
    accommodations: list[AccommodationSchema] | None = None  # Toàn bộ accommodations (sync)


class ClaimTripRequest(CamelCaseModel):
    """Request guest claim trip sau khi đăng nhập.

    Guest gửi claim_token (nhận được khi tạo trip lúc chưa đăng nhập)
    → BE verify token → transfer ownership.
    """

    claim_token: str  # Raw opaque token nhận từ create/generate response


# ===========================================================================
# 3. Response schemas — Dữ liệu BE trả về FE
# ===========================================================================


class ShareResponse(CamelCaseModel):
    """Response khi share lịch trình — chứa URL và token.

    Lần đầu share: trả raw token + URL
    Lần sau share: trả [REDACTED] (không thể recover raw token)
    """

    share_url: str  # Full URL cho người nhận
    share_token: str  # Raw token (hoặc [REDACTED])
    expires_at: datetime | None = None  # Thời hạn (None = vĩnh viễn)


class ItineraryResponse(CamelCaseModel):
    """Response đầy đủ của lịch trình — trả về cho FE.

    Bao gồm tất cả thông tin trip + nested days + activities + accommodations.
    claim_token chỉ có khi guest tạo trip (để claim sau khi đăng nhập).
    """

    id: int
    destination: str
    trip_name: str
    start_date: date
    end_date: date
    budget: int
    total_cost: int = 0
    traveler_info: TravelerInfo
    interests: list[str] = Field(default_factory=list)
    days: list[DaySchema] = Field(default_factory=list)
    accommodations: list[AccommodationSchema] = Field(default_factory=list)
    claim_token: str | None = None  # Chỉ có khi guest tạo trip
    created_at: datetime
    updated_at: datetime
