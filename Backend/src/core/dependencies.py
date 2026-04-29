"""FastAPI dependency providers.

Dependency injection chain:
  get_db()           → AsyncSession (one per request, auto-closes)
  get_redis()        → Redis client (one per request, auto-closes)
  get_rate_limiter() → RateLimiter(redis, settings)
  get_current_user() → User (requires valid Bearer JWT, raises 401 if invalid)
  get_current_user_optional() → User | None (returns None if no/invalid token)

Usage in endpoints:
    @router.get("/profile")
    async def get_profile(user: User = Depends(get_current_user)):
        ...
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from redis.asyncio import Redis
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.core.config import AppSettings, get_settings
from src.core.database import get_db
from src.core.exceptions import UnauthorizedException
from src.core.rate_limiter import RateLimiter
from src.core.security import verify_access_token
from src.models.user import User

# Points to the login endpoint so Swagger UI can generate the "Authorize" dialog
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user from a Bearer token.

    Workflow:
      1. Extract token from Authorization: Bearer <token> header.
      2. Decode and verify the JWT.
      3. Look up the user by ID from the "sub" claim.
      4. Raise UnauthorizedException if any step fails.

    Args:
        token: JWT string from the OAuth2 scheme.
        db: AsyncSession for user lookup.

    Returns:
        The authenticated User ORM instance.

    Raises:
        UnauthorizedException: If token is invalid, expired, or user not found.
    """
    # Step 1-2: Verify JWT
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired token")

    # Step 3-4: Look up user
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    return user


async def get_current_user_optional(
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Resolve the user when a valid token is present; otherwise return None.

    Used for endpoints that behave differently for authenticated vs
    anonymous users (e.g. public share links with optional auth).

    Args:
        token: JWT string (optional — may be absent).
        db: AsyncSession for user lookup.

    Returns:
        User if valid token present, None otherwise.
    """
    if not token:
        return None
    # Decode token — return None silently if invalid
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    return result.scalar_one_or_none()


async def get_redis(settings: AppSettings = Depends(get_settings)) -> AsyncGenerator[Redis, None]:
    """Yield a Redis client for the current request.

    The client is created fresh per request and closed automatically
    when the request completes.

    Args:
        settings: AppSettings for redis_url.

    Yields:
        Connected Redis client with decode_responses=True.
    """
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.aclose()


def get_rate_limiter(
    redis: Redis = Depends(get_redis),
    settings: AppSettings = Depends(get_settings),
) -> RateLimiter:
    """Create a RateLimiter instance for the current request.

    Args:
        redis: Redis client from get_redis dependency.
        settings: AppSettings for rate limit configuration.

    Returns:
        RateLimiter bound to the given Redis client.
    """
    return RateLimiter(redis=redis, settings=settings)
