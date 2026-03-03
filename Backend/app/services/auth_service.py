"""
============================================
app/services/auth_service.py — Authentication Service
============================================
Xử lý logic đăng ký và đăng nhập.

Flow đăng ký:
  1. Kiểm tra email đã tồn tại chưa
  2. Hash password
  3. Tạo User record trong DB
  4. Tạo JWT token
  5. Trả về token + user info

Flow đăng nhập:
  1. Tìm user theo email
  2. Verify password
  3. Tạo JWT token
  4. Trả về token + user info
============================================
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import User
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.schemas.user import UserResponse
from app.utils.security import hash_password, verify_password, create_access_token


async def register_user(
    data: RegisterRequest,
    db: AsyncSession,
) -> AuthResponse:
    """
    Đăng ký user mới.

    Args:
        data: RegisterRequest (email, password, name)
        db: AsyncSession

    Returns:
        AuthResponse với success=True + token + user info
        hoặc success=False + error message
    """
    # 1. Kiểm tra email đã tồn tại chưa
    result = await db.execute(select(User).where(User.email == data.email))
    existing_user = result.scalar_one_or_none()

    if existing_user:
        return AuthResponse(
            success=False,
            error="Email đã được sử dụng",  # Khớp message FE auth.ts
        )

    # 2. Hash password (KHÔNG BAO GIỜ lưu plaintext)
    hashed = hash_password(data.password)

    # 3. Tạo User record
    new_user = User(
        full_name=data.name,
        email=data.email,
        password_hash=hashed,
        role="user",  # MVP#1 chỉ có role 'user'
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)  # Lấy lại id, created_at từ DB

    # 4. Tạo JWT token
    # "sub" (subject) = user_id, chuẩn JWT convention
    access_token = create_access_token(data={"sub": str(new_user.id)})

    # 5. Trả về response
    return AuthResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_db(new_user),
    )


async def login_user(
    data: LoginRequest,
    db: AsyncSession,
) -> AuthResponse:
    """
    Đăng nhập user.

    Args:
        data: LoginRequest (email, password)
        db: AsyncSession

    Returns:
        AuthResponse với success=True + token + user info
        hoặc success=False + error message
    """
    # 1. Tìm user theo email
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalar_one_or_none()

    # 2. Kiểm tra user tồn tại và password đúng
    if not user or not verify_password(data.password, user.password_hash):
        return AuthResponse(
            success=False,
            error="Email hoặc mật khẩu không đúng",  # Khớp message FE
        )

    # 3. Tạo JWT token
    access_token = create_access_token(data={"sub": str(user.id)})

    # 4. Trả về response
    return AuthResponse(
        success=True,
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.from_db(user),
    )
