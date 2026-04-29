"""FastAPI dependency providers."""

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

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the current authenticated user from a Bearer token."""
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    return user


async def get_current_user_optional(
    token: str | None = None,
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Resolve the user when a valid token is present; otherwise return None."""
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    return result.scalar_one_or_none()


async def get_redis(settings: AppSettings = Depends(get_settings)) -> AsyncGenerator[Redis, None]:
    """Yield a Redis client."""
    redis = Redis.from_url(settings.redis_url, decode_responses=True)
    try:
        yield redis
    finally:
        await redis.aclose()


def get_rate_limiter(
    redis: Redis = Depends(get_redis),
    settings: AppSettings = Depends(get_settings),
) -> RateLimiter:
    """Create a rate limiter instance."""
    return RateLimiter(redis=redis, settings=settings)
