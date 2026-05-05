"""FastAPI infrastructure dependency providers.

Auth-specific dependencies (get_current_user, get_current_user_optional)
have moved to auth/dependencies.py to eliminate core→auth model dependency.

Remaining providers:
  get_db()           → AsyncSession (one per request, auto-closes)
  get_redis()        → Redis client (one per request, auto-closes)
  get_rate_limiter() → RateLimiter(redis, settings)
"""

from collections.abc import AsyncGenerator

from fastapi import Depends
from redis.asyncio import Redis

from src.core.config import AppSettings, get_settings
from src.core.rate_limiter import RateLimiter


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
