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

    Unlike OAuth2PasswordBearer which raises 401 when no token is present,
    this dependency silently returns None so that endpoints can serve both
    authenticated and anonymous users.

    Bearer Token Format:
      Authorization: Bearer <access_token>

    Logic:
      1. Extract Authorization header
      2. Kiểm tra header bắt đầu "Bearer " (case-insensitive)
      3. Nếu có -> trả về token string (từ vị trí 7 trở đi)
      4. Nếu không -> trả về None

    Use Case:
      - Public endpoints: có thể dịch vụ cả authenticated và anonymous
      - Example: GET /api/v1/shared/{shareToken} (public itinerary)
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

    JWT Verification Flow:

    1. FastAPI dependency injection chain:
       - oauth2_scheme: OAuth2PasswordBearer (auto extract Bearer token)
         * If không có token -> 401 Unauthorized
         * (không như _optional_token, cái này bắt buộc)

    2. Verify JWT signature và expiry
       - Call verify_access_token(token)
       - Inside:
         * Decode JWT
         * Verify signature HMAC-SHA256(header.payload, SECRET_KEY)
         * Check exp claim (expiry time)
         * Nếu invalid/expired -> throw UnauthorizedException

    3. Extract user_id từ sub claim
       - payload["sub"] = user.id
       - Nếu không có -> throw UnauthorizedException

    4. Query user record
       - SELECT * FROM users WHERE id = ?
       - Nếu không tồn tại -> throw UnauthorizedException

    5. Kiểm tra user status
       - is_active == true (tài khoản không bị disable)
       - Nếu is_active == false -> throw UnauthorizedException

    6. Trả về User instance

    Usage:
      - In endpoint: user: User = Depends(get_current_user)
      - FastAPI: tự inject userñ parameter

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

    Optional JWT Verification:

    1. Extract token (optional)
       - If không có Bearer header -> token = None
       - If có -> extract

    2. Nếu token is None -> trả về None (anonymous request)

    3. Nếu token exists:
       - Verify JWT (signal/expiry)
       - Nếu invalid/expired -> trả về None (không throw)
       - Extract user_id, query user
       - Trả về User instance nếu valid

    Usage:
      - Public endpoints: endpoints cả anonymous và authenticated có thể dịch vụ một
      - Example: GET /api/v1/shared/{shareToken} (public, but can identify user if token provided)

    Difference vs get_current_user:
      - get_current_user: Bắt buộc authenticate (401 if no token)
      - get_current_user_optional: Flexible (200 even if no token)
    """
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    return result.scalar_one_or_none()
