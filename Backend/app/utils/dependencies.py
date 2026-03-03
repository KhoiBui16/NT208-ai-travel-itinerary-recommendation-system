"""
============================================
app/utils/dependencies.py — FastAPI Dependencies
============================================
Dependency Injection (DI) là pattern cốt lõi của FastAPI.
Thay vì mỗi endpoint tự xử lý auth, DB session, ...
ta tạo dependencies dùng chung.

Cách dùng trong router:
    @router.get("/profile")
    async def get_profile(
        current_user: User = Depends(get_current_user),
        db: AsyncSession = Depends(get_db),
    ):
        ...

Flow xác thực:
    Request → Header: Authorization: Bearer <token>
            → get_current_user() giải mã token
            → Lấy user_id từ payload
            → Query DB lấy User object
            → Trả về User object cho endpoint
============================================
"""

import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.user import User
from app.utils.security import verify_token


# --- OAuth2 scheme ---
# Khai báo endpoint lấy token (cho Swagger UI biết)
# tokenUrl trỏ đến endpoint login
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=True,  # Tự động raise 401 nếu không có token
)

# Scheme optional: không bắt buộc có token (cho guest endpoints)
oauth2_scheme_optional = OAuth2PasswordBearer(
    tokenUrl="/api/v1/auth/login",
    auto_error=False,  # Trả về None nếu không có token
)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """
    Dependency: Lấy user hiện tại từ JWT token.

    Dùng cho endpoint yêu cầu đăng nhập (protected route).
    Nếu token không hợp lệ → raise 401 Unauthorized.

    Flow:
        1. Lấy token từ header Authorization
        2. Giải mã token → lấy user_id
        3. Query DB → lấy User object
        4. Trả về User
    """
    # Lỗi mặc định nếu xác thực thất bại
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token không hợp lệ hoặc đã hết hạn",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Giải mã token
    payload = verify_token(token)
    if payload is None:
        raise credentials_exception

    # Lấy user_id từ payload (trường "sub" = subject)
    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        raise credentials_exception

    # Query DB
    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        raise credentials_exception

    result = await db.execute(select(User).where(User.id == user_uuid))
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_user_optional(
    token: str | None = Depends(oauth2_scheme_optional),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """
    Dependency: Lấy user nếu có token, trả None nếu không có.

    Dùng cho endpoint cho cả guest lẫn user đã đăng nhập.
    VD: Tạo itinerary (guest lưu tạm, user lưu vĩnh viễn).
    """
    if token is None:
        return None

    payload = verify_token(token)
    if payload is None:
        return None

    user_id_str: str | None = payload.get("sub")
    if user_id_str is None:
        return None

    try:
        user_uuid = uuid.UUID(user_id_str)
    except ValueError:
        return None

    result = await db.execute(select(User).where(User.id == user_uuid))
    return result.scalar_one_or_none()
