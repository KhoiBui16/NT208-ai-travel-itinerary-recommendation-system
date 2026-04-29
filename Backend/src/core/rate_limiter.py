"""Redis-backed rate limiting primitives."""

from datetime import UTC, datetime, timedelta

from pydantic import BaseModel
from redis.asyncio import Redis

from src.core.config import AppSettings
from src.core.exceptions import RateLimitException, ServiceUnavailableException


class RateLimitInfo(BaseModel):
    """Rate limit status returned to clients."""

    remaining: int
    limit: int
    reset_at: datetime


class RateLimiter:
    """Rate limiter for paid AI endpoints and general API limits."""

    def __init__(self, redis: Redis, settings: AppSettings) -> None:
        self.redis = redis
        self.settings = settings

    async def check_ai_limit(self, user_id: int) -> bool:
        """Return True when the user still has AI calls left today."""
        key = self._ai_key(user_id)
        try:
            count = await self.redis.incr(key)
            if count == 1:
                await self.redis.expireat(key, self._next_midnight_utc())
        except Exception as exc:
            if self.settings.ai_rate_limit_fail_mode == "closed":
                raise ServiceUnavailableException("AI rate limiter unavailable") from exc
            return True
        return count <= self.settings.rate_limit_ai_free

    async def enforce_ai_limit(self, user_id: int) -> None:
        """Raise when the user has exceeded the daily AI quota."""
        if not await self.check_ai_limit(user_id):
            raise RateLimitException("Daily AI call limit exceeded")

    async def get_remaining(self, user_id: int) -> RateLimitInfo:
        """Return remaining AI calls for the current UTC day."""
        key = self._ai_key(user_id)
        try:
            current = int(await self.redis.get(key) or 0)
        except Exception as exc:
            raise ServiceUnavailableException("AI rate limiter unavailable") from exc
        limit = self.settings.rate_limit_ai_free
        return RateLimitInfo(
            remaining=max(limit - current, 0),
            limit=limit,
            reset_at=self._next_midnight_utc(),
        )

    @staticmethod
    def _next_midnight_utc() -> datetime:
        now = datetime.now(UTC)
        return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def _ai_key(user_id: int) -> str:
        today = datetime.now(UTC).strftime("%Y%m%d")
        return f"rate:ai:{user_id}:{today}"
