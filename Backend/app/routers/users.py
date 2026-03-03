"""
============================================
app/routers/users.py — User Profile Router
============================================
Endpoints:
  GET  /api/v1/users/profile  — Lấy thông tin user (protected)
  PUT  /api/v1/users/profile  — Cập nhật profile (protected)

Tất cả endpoint đều yêu cầu JWT token (protected routes).
Tương ứng FE:
  getCurrentUser()     → GET /profile
  updateUserProfile()  → PUT /profile
============================================
"""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.schemas.user import UserResponse, UserUpdateRequest
from app.services import user_service
from app.utils.dependencies import get_current_user

router = APIRouter()


@router.get(
    "/profile",
    response_model=UserResponse,
    summary="Lấy thông tin profile",
    description="""
    Lấy thông tin user hiện tại từ JWT token.
    Yêu cầu: Authorization: Bearer <token>
    
    **FE mapping:** getCurrentUser() trong auth.ts
    """,
)
async def get_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """
    Trả về profile user hiện tại.
    get_current_user dependency tự giải mã token → lấy user từ DB.
    """
    return await user_service.get_user_profile(current_user)


@router.put(
    "/profile",
    response_model=UserResponse,
    summary="Cập nhật profile",
    description="""
    Cập nhật thông tin profile (name, phone, interests).
    Chỉ cập nhật field nào được gửi.
    
    **FE mapping:** updateUserProfile() trong auth.ts
    """,
)
async def update_profile(
    data: UserUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """
    Cập nhật profile user.

    VD request body:
        { "name": "Nguyễn Văn B", "phone": "0901234567" }

    Chỉ cập nhật field có trong body (not None).
    """
    return await user_service.update_profile(current_user, data, db)
