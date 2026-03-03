"""
============================================
app/services/user_service.py — User Profile Service
============================================
Xử lý logic cập nhật profile user.
Tương ứng updateUserProfile() trong FE auth.ts.
============================================
"""

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.user import UserUpdateRequest, UserResponse


async def update_profile(
    user: User,
    data: UserUpdateRequest,
    db: AsyncSession,
) -> UserResponse:
    """
    Cập nhật thông tin profile.

    Chỉ cập nhật field nào FE gửi (not None).
    FE auth.ts updateUserProfile() gửi: { name?, phone?, interests? }

    Args:
        user: User object (đã verify token)
        data: UserUpdateRequest (các field muốn cập nhật)
        db: AsyncSession

    Returns:
        UserResponse với thông tin đã cập nhật
    """
    # Chỉ cập nhật field nào có giá trị
    if data.name is not None:
        user.full_name = data.name
    if data.phone is not None:
        user.phone = data.phone
    if data.interests is not None:
        user.interests = data.interests

    # Commit thay đổi
    await db.commit()
    await db.refresh(user)

    return UserResponse.from_db(user)


async def get_user_profile(user: User) -> UserResponse:
    """
    Lấy thông tin profile hiện tại.
    Tương ứng getCurrentUser() trong FE auth.ts.
    """
    return UserResponse.from_db(user)
