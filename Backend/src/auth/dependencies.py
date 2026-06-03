"""Auth-specific FastAPI dependency providers.

Moved from core/dependencies.py to eliminate core→auth model dependency.
core/ now only provides infrastructure deps (get_db, get_redis, get_rate_limiter).
"""

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.exceptions import UnauthorizedException
from src.core.security import verify_access_token

# Points to the login endpoint so Swagger UI can generate the "Authorize" dialog
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def _optional_token(request: Request) -> str | None:
    """Extract Bearer token from the request, returning None if absent.

    Khác biệt với OAuth2PasswordBearer:
      - OAuth2PasswordBearer: Tự động trả 401 khi không có token
      - _optional_token: Trả None nếu không có token (cho phép endpoint quyết định)
    
    Cách sử dụng:
      - Endpoint bắt buộc auth: Dùng get_current_user (oauth2_scheme)
      - Endpoint tuỳ chọn auth: Dùng get_current_user_optional (_optional_token)
    
    Ví dụ EP-8 (generate):
      - User authenticated: AI rate limit = pro quota
      - User guest/anonymous: AI rate limit = guest quota
    """
    auth: str | None = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth[7:]


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user from a Bearer token.

    Raises:
        UnauthorizedException: If token is invalid, expired, or user not found.
    """
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    return user


async def get_current_user_optional(
    token: str | None = Depends(_optional_token),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Resolve the user when a valid token is present; otherwise return None.
    
    Dùng cho endpoint hỗ trợ cả authenticated + anonymous users (EP-8, EP-9):
      - Nếu client gửi Bearer token hợp lệ → trả về User object
      - Nếu client không gửi token hoặc token invalid → trả về None
      - Endpoint có thể kiểm tra: if user: (authenticated) else: (guest/anonymous)
    
    So sánh:
      - get_current_user: Bắt buộc token, trả 401 nếu token không hợp lệ
      - get_current_user_optional: Token tùy chọn, trả None nếu không có/invalid
    """
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    return result.scalar_one_or_none()
