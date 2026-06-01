"""Itineraries domain package.

Nhóm Trip — quản lý toàn bộ vòng đời lịch trình du lịch:
  • Tạo lịch trình thủ công (manual) hoặc AI-generated
  • Chỉnh sửa ngày / hoạt động / chỗ ở (auto-save)
  • Xem / xóa / đánh giá lịch trình
  • Chia sẻ lịch trình qua link công khai (share token)
  • Guest tạo trip → claim sau khi đăng nhập

Public exports — chỉ expose những symbol cần thiết cho các module khác:
  • ItineraryService  : Business logic chính cho trip CRUD + share/claim
  • Trip, TripDay, Activity : ORM models cốt lõi
"""

# --- ORM models ---
from src.itineraries.models.trip import Activity, Trip, TripDay

# --- Domain service ---
from src.itineraries.service import ItineraryService

__all__ = ["ItineraryService", "Trip", "TripDay", "Activity"]
