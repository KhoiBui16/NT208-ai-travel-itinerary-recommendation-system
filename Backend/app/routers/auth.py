"""
============================================
app/routers/auth.py — Authentication Router
============================================
Endpoints:
  POST /api/v1/auth/register  — Đăng ký tài khoản mới
  POST /api/v1/auth/login     — Đăng nhập

Tương ứng FE:
  registerUser() → POST /register
  loginUser()    → POST /login

Security:
  - Password được hash bằng bcrypt trước khi lưu DB
  - JWT token trả về sau khi đăng ký/đăng nhập thành công
  - FE lưu token vào localStorage và gắn vào header Authorization
============================================
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.auth import RegisterRequest, LoginRequest, AuthResponse
from app.services import auth_service

# --- Tạo router instance ---
# Prefix đã được set trong main.py: /api/v1/auth
router = APIRouter()


@router.post(
    "/register",
    response_model=AuthResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Đăng ký tài khoản mới",
    description="""
    Tạo tài khoản mới với email, password, name.
    Trả về JWT token + thông tin user nếu thành công.
    
    **FE mapping:** registerUser() trong auth.ts
    """,
)
async def register(
    data: RegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Đăng ký user mới.

    Flow:
    1. Validate input (Pydantic tự động)
    2. Kiểm tra email trùng
    3. Hash password + tạo user
    4. Tạo JWT token
    5. Trả về { success, access_token, user }
    """
    result = await auth_service.register_user(data, db)

    # Nếu thất bại (email trùng), trả 400
    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result.error,
        )

    return result


@router.post(
    "/login",
    response_model=AuthResponse,
    summary="Đăng nhập",
    description="""
    Đăng nhập bằng email + password.
    Trả về JWT token + thông tin user nếu thành công.
    
    **FE mapping:** loginUser() trong auth.ts
    """,
)
async def login(
    data: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> AuthResponse:
    """
    Đăng nhập user.

    Flow:
    1. Tìm user theo email
    2. Verify password
    3. Tạo JWT token
    4. Trả về { success, access_token, user }
    """
    result = await auth_service.login_user(data, db)

    if not result.success:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=result.error,
        )

    return result
