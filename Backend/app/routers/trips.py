"""
============================================
app/routers/trips.py — Itinerary (Trip) Router
============================================
Endpoints (prefix: /api/v1/itineraries):
  POST   /generate          — Tạo lịch trình mới (AI) [guest hoặc user]
  GET    /                   — Lấy danh sách lịch trình đã lưu [protected]
  GET    /{id}               — Lấy chi tiết 1 lịch trình [public]
  DELETE /{id}               — Xóa lịch trình [protected]
  PUT    /{id}/rating        — Đánh giá lịch trình [public/protected]
  DELETE /{id}/activities/{activity_id} — Xóa 1 activity [protected]

Naming convention:
  - API URL dùng "itineraries" (FE name)
  - DB table dùng "trips" (ERD name)
  - Service layer mapping giữa 2 tên

Tương ứng FE pages:
  TripPlanning.tsx → POST /generate
  SavedItineraries.tsx → GET /
  ItineraryView.tsx → GET /{id}, PUT /{id}/rating, DELETE /{id}/activities/{aid}
============================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.trip import (
    TripCreateRequest,
    ItineraryResponse,
    ItineraryListResponse,
    RatingRequest,
)
from app.services import itinerary_service
from app.utils.dependencies import get_current_user, get_current_user_optional

router = APIRouter()


@router.post(
    "/generate",
    response_model=ItineraryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Tạo lịch trình du lịch mới",
    description="""
    Tạo lịch trình bằng AI (Gemini) hoặc fallback mock data.
    
    - Guest (không có token): tạo lịch trình tạm, không lưu vào account
    - User (có token): tạo và lưu lịch trình vào account
    
    **FE mapping:** TripPlanning.tsx → generateItinerary() + saveItinerary()
    """,
)
async def generate_itinerary(
    data: TripCreateRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> ItineraryResponse:
    """
    Tạo lịch trình du lịch.

    Flow:
    1. Nhận input từ FE (destination, dates, budget, interests)
    2. Gọi AI hoặc dùng fallback
    3. Lưu Trip + Places + TripPlaces
    4. Trả về ItineraryResponse cho FE hiển thị
    """
    user_id = current_user.id if current_user else None
    return await itinerary_service.generate_itinerary(data, user_id, db)


@router.get(
    "/",
    response_model=ItineraryListResponse,
    summary="Lấy danh sách lịch trình đã lưu",
    description="""
    Lấy tất cả lịch trình của user hiện tại.
    Yêu cầu đăng nhập.
    
    **FE mapping:** SavedItineraries.tsx → getSavedItineraries()
    """,
)
async def get_itineraries(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ItineraryListResponse:
    """Lấy danh sách lịch trình của user."""
    itineraries = await itinerary_service.get_user_itineraries(current_user.id, db)
    return ItineraryListResponse(
        itineraries=itineraries,
        total=len(itineraries),
    )


@router.get(
    "/{itinerary_id}",
    response_model=ItineraryResponse,
    summary="Lấy chi tiết lịch trình",
    description="""
    Lấy thông tin đầy đủ 1 lịch trình (bao gồm activities theo ngày).
    Không yêu cầu đăng nhập (guest cũng xem được).
    
    **FE mapping:** ItineraryView.tsx → getItineraryById()
    """,
)
async def get_itinerary(
    itinerary_id: str,
    db: AsyncSession = Depends(get_db),
) -> ItineraryResponse:
    """Lấy chi tiết 1 lịch trình."""
    result = await itinerary_service.get_itinerary_by_id(itinerary_id, db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch trình",
        )
    return result


@router.delete(
    "/{itinerary_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Xóa lịch trình",
    description="""
    Xóa lịch trình (chỉ owner mới xóa được).
    Cascade xóa tất cả trip_places liên quan.
    
    **FE mapping:** SavedItineraries.tsx → deleteItinerary()
    """,
)
async def delete_itinerary(
    itinerary_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Xóa lịch trình."""
    success = await itinerary_service.delete_itinerary(
        itinerary_id, current_user.id, db
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch trình hoặc bạn không có quyền xóa",
        )


@router.put(
    "/{itinerary_id}/rating",
    response_model=ItineraryResponse,
    summary="Đánh giá lịch trình",
    description="""
    Đánh giá lịch trình (1-5 sao + feedback text).
    
    **FE mapping:** ItineraryView.tsx → rateItinerary()
    """,
)
async def rate_itinerary(
    itinerary_id: str,
    data: RatingRequest,
    current_user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
) -> ItineraryResponse:
    """Đánh giá lịch trình."""
    user_id = current_user.id if current_user else None
    result = await itinerary_service.rate_itinerary(itinerary_id, data, user_id, db)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy lịch trình",
        )
    return result


@router.delete(
    "/{itinerary_id}/activities/{activity_id}",
    response_model=ItineraryResponse,
    summary="Xóa 1 activity khỏi lịch trình",
    description="""
    Xóa 1 activity (trip_place) trong lịch trình.
    Dùng trong edit mode của ItineraryView.
    
    **FE mapping:** ItineraryView.tsx → edit mode → xóa activity
    """,
)
async def remove_activity(
    itinerary_id: str,
    activity_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ItineraryResponse:
    """Xóa 1 activity khỏi lịch trình."""
    result = await itinerary_service.remove_activity(
        itinerary_id, activity_id, current_user.id, db
    )
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Không tìm thấy activity hoặc bạn không có quyền",
        )
    return result
