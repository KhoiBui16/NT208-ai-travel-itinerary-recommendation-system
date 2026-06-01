"""Itinerary + Shared-trip API endpoints.

Nhóm Trip — tất cả REST endpoints cho lịch trình du lịch:

  Router: /api/v1/itineraries
    ├── POST   /generate                    — EP-C1: Tạo lịch trình bằng AI
    ├── POST   /                            — EP-08: Tạo lịch trình thủ công
    ├── GET    /                            — EP-09: Danh sách lịch trình (phân trang)
    ├── GET    /{trip_id}                   — EP-10: Chi tiết lịch trình
    ├── PUT    /{trip_id}                   — EP-11: Cập nhật lịch trình (auto-save)
    ├── DELETE /{trip_id}                   — EP-12: Xóa lịch trình
    ├── PUT    /{trip_id}/rating            — EP-13: Đánh giá lịch trình
    ├── POST   /{trip_id}/share            — EP-14: Chia sẻ lịch trình
    ├── POST   /{trip_id}/claim            — EP-16: Guest claim trip
    ├── POST   /{trip_id}/activities       — EP-17: Thêm activity
    ├── PUT    /{trip_id}/activities/{id}   — EP-18: Sửa activity
    ├── DELETE /{trip_id}/activities/{id}   — EP-19: Xóa activity
    ├── POST   /{trip_id}/accommodations   — EP-20: Thêm accommodation
    └── DELETE /{trip_id}/accommodations/{id} — EP-21: Xóa accommodation

  Shared router: /api/v1/shared
    └── GET    /{share_token}              — EP-15: Xem lịch trình qua share link
"""

from fastapi import APIRouter, Depends, Query, Request, Response
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.dependencies import get_current_user, get_current_user_optional
from src.auth.models import User
from src.core.database import get_db
from src.core.dependencies import get_rate_limiter
from src.core.rate_limiter import RateLimiter
from src.core.schema import PaginatedResponse, SuccessResponse
from src.itineraries.schemas import (
    AccommodationSchema,
    ActivitySchema,
    ClaimTripRequest,
    CreateTripRequest,
    GenerateItineraryRequest,
    ItineraryResponse,
    ShareResponse,
    UpdateTripRequest,
)
from src.itineraries.service import ItineraryService

# ---------------------------------------------------------------------------
# Router setup
# ---------------------------------------------------------------------------

router = APIRouter(prefix="/itineraries", tags=["Itineraries"])


def get_itinerary_service(session: AsyncSession = Depends(get_db)) -> ItineraryService:
    """Factory dependency — tạo ItineraryService gắn với DB session."""
    return ItineraryService(session=session)


# ===========================================================================
# 1. Trip CRUD — Tạo, xem, danh sách, cập nhật, xóa
# ===========================================================================


# --- EP-C1: Tạo lịch trình bằng AI ---
@router.post("/generate", response_model=ItineraryResponse, status_code=201)
async def generate_itinerary(
    body: GenerateItineraryRequest,
    request: Request,
    response: Response,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
    rate_limiter: RateLimiter = Depends(get_rate_limiter),
) -> ItineraryResponse:
    # Kiểm tra rate limit cho AI generation
    if user:
        await rate_limiter.enforce_ai_limit(user.id)
        rate_info = await rate_limiter.get_remaining(user.id)
    else:
        await rate_limiter.enforce_ai_guest_limit(
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        # Lấy remaining cho guest sử dụng cùng actor key
        guest_actor = rate_limiter.guest_actor(
            ip=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        rate_info = await rate_limiter.get_remaining_for_actor(guest_actor)

    # Thêm rate limit headers vào response
    response.headers["X-RateLimit-Limit"] = str(rate_info.limit)
    response.headers["X-RateLimit-Remaining"] = str(rate_info.remaining)
    response.headers["X-RateLimit-Reset"] = rate_info.reset_at.isoformat()

    return await service.generate(body, user_id=user.id if user else None)


# --- EP-08: Tạo lịch trình thủ công ---
@router.post("", response_model=ItineraryResponse, status_code=201)
async def create_trip(
    request: CreateTripRequest,
    user: User | None = Depends(get_current_user_optional),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.create_manual(request, user_id=user.id if user else None)


# --- EP-09: Danh sách lịch trình (phân trang) ---
@router.get("", response_model=PaginatedResponse)
async def list_trips(
    page: int = Query(default=1, ge=1),
    size: int = Query(default=20, ge=1, le=100),
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> PaginatedResponse:
    return await service.list_by_user(user.id, page=page, size=size)


# --- EP-10: Chi tiết lịch trình ---
@router.get("/{trip_id}", response_model=ItineraryResponse)
async def get_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.get_by_id(trip_id, user_id=user.id)


# --- EP-11: Cập nhật lịch trình (auto-save) ---
@router.put("/{trip_id}", response_model=ItineraryResponse)
async def update_trip(
    trip_id: int,
    request: UpdateTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.update(trip_id, request, user_id=user.id)


# --- EP-12: Xóa lịch trình ---
@router.delete("/{trip_id}", status_code=204)
async def delete_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete(trip_id, user_id=user.id)


# ===========================================================================
# 2. Rating & Share — Đánh giá và chia sẻ lịch trình
# ===========================================================================


# --- EP-13: Đánh giá lịch trình (1-5 sao) ---
@router.put("/{trip_id}/rating")
async def rate_trip(
    trip_id: int,
    rating: int = Query(..., ge=1, le=5),
    feedback: str | None = None,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> SuccessResponse:
    await service.rate(trip_id, user_id=user.id, rating=rating, feedback=feedback)
    return SuccessResponse(message="Rating saved")


# --- EP-14: Chia sẻ lịch trình qua link công khai ---
@router.post("/{trip_id}/share", response_model=ShareResponse)
async def share_trip(
    trip_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ShareResponse:
    return await service.share(trip_id, user_id=user.id)


# --- EP-16: Guest claim trip sau khi đăng nhập ---
@router.post("/{trip_id}/claim")
async def claim_trip(
    trip_id: int,
    request: ClaimTripRequest,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> dict:
    return await service.claim(trip_id, user_id=user.id, request=request)


# ===========================================================================
# 3. Activity CRUD — Thêm/sửa/xóa hoạt động
# ===========================================================================


# --- EP-17: Thêm activity vào ngày ---
@router.post("/{trip_id}/activities", response_model=ActivitySchema, status_code=201)
async def add_activity(
    trip_id: int,
    day_id: int = Query(..., description="TripDay ID to add activity to"),
    data: ActivitySchema = ...,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    return await service.add_activity(trip_id, day_id, data, user_id=user.id)


# --- EP-18: Sửa activity ---
@router.put("/{trip_id}/activities/{activity_id}", response_model=ActivitySchema)
async def update_activity(
    trip_id: int,
    activity_id: int,
    data: ActivitySchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> ActivitySchema:
    return await service.update_activity(trip_id, activity_id, data, user_id=user.id)


# --- EP-19: Xóa activity ---
@router.delete("/{trip_id}/activities/{activity_id}", status_code=204)
async def delete_activity(
    trip_id: int,
    activity_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete_activity(trip_id, activity_id, user_id=user.id)


# ===========================================================================
# 4. Accommodation CRUD — Thêm/xóa chỗ ở
# ===========================================================================


# --- EP-20: Thêm accommodation ---
@router.post("/{trip_id}/accommodations", response_model=AccommodationSchema, status_code=201)
async def add_accommodation(
    trip_id: int,
    data: AccommodationSchema,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> AccommodationSchema:
    return await service.add_accommodation(trip_id, data, user_id=user.id)


# --- EP-21: Xóa accommodation ---
@router.delete("/{trip_id}/accommodations/{accommodation_id}", status_code=204)
async def delete_accommodation(
    trip_id: int,
    accommodation_id: int,
    user: User = Depends(get_current_user),
    service: ItineraryService = Depends(get_itinerary_service),
) -> None:
    await service.delete_accommodation(trip_id, accommodation_id, user_id=user.id)


# ===========================================================================
# 5. Shared — Truy cập lịch trình qua share link (EP-15, public)
# ===========================================================================

shared_router = APIRouter(prefix="/shared", tags=["Shared"])


# --- EP-15: Xem lịch trình qua share token (public, không cần auth) ---
@shared_router.get("/{share_token}", response_model=ItineraryResponse)
async def get_shared_trip(
    share_token: str,
    service: ItineraryService = Depends(get_itinerary_service),
) -> ItineraryResponse:
    return await service.get_by_share_token(share_token)
