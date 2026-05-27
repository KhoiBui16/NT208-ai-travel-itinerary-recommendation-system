"""Redis-backed rate limiting primitives.

Rate limiting for AI endpoints (generate, chat):
  - Daily quota per user or guest fingerprint (default: 3 calls/day for free tier).
  - Counter resets at midnight UTC.
  - Key format: rate:ai:user:{user_id}:{YYYYMMDD}
  - Guest key format: rate:ai:guest:{hash}:{YYYYMMDD}

Fail mode behavior (configurable via ai_rate_limit_fail_mode):
  - "closed" (default): If Redis is down, block the request with 503.
    This prevents uncontrolled AI usage when monitoring is unavailable.
  - "open": If Redis is down, allow the request through.
    Use only for non-critical rate limits where blocking is worse than overuse.
"""

from datetime import UTC, datetime, timedelta
from hashlib import sha256

from pydantic import BaseModel
from redis.asyncio import Redis

from src.core.config import AppSettings
from src.core.exceptions import RateLimitException, ServiceUnavailableException


class RateLimitInfo(BaseModel):
    """Rate limit status returned to clients.

    Attributes:
        remaining: Number of calls left today.
        limit: Maximum calls allowed per day.
        reset_at: When the counter resets (next midnight UTC).
    """

    remaining: int
    limit: int
    reset_at: datetime


class RateLimiter:
    """Rate limiter for paid AI endpoints and general API limits.

    Args:
        redis: Async Redis client.
        settings: AppSettings for rate limit configuration.
    """

    def __init__(self, redis: Redis, settings: AppSettings) -> None:
        self.redis = redis
        self.settings = settings

    async def check_ai_limit(self, user_id: int) -> bool:
        """Check if the user still has AI calls left today.

        Workflow:
          1. Increment the daily counter in Redis.
          2. If first call today, set expiry to next midnight UTC.
          3. If Redis is down:
             - "closed" mode → raise ServiceUnavailableException (503).
             - "open" mode → return True (allow through).
          4. Return True if under limit, False if exceeded.

        Args:
            user_id: The user to check.

        Returns:
            True if the user has calls remaining, False if quota exhausted.
        """
        return await self.check_ai_actor_limit(f"user:{user_id}")

    async def check_ai_actor_limit(self, actor: str) -> bool:
        """Check if an AI actor key still has calls left today.

        Actor values are scoped labels such as "user:12" or "guest:abcd".
        """
        key = self._ai_key(actor)
        try:
            # Step 1: Increment counter
            count = await self.redis.incr(key)
            # Step 2: Set TTL on first call of the day
            if count == 1:
                await self.redis.expireat(key, self._next_midnight_utc())
        except Exception as exc:
            # Step 3: Handle Redis failure based on fail mode
            if self.settings.ai_rate_limit_fail_mode == "closed":
                raise ServiceUnavailableException("AI rate limiter unavailable") from exc
            return True
        # Step 4: Check against limit
        return count <= self.settings.rate_limit_ai_free

    async def enforce_ai_limit(self, user_id: int) -> None:
        """Raise when the user has exceeded the daily AI quota.

        Convenience method that combines check + exception.

        Args:
            user_id: The user to enforce limits for.

        Raises:
            RateLimitException: If the daily quota is exceeded.
            ServiceUnavailableException: If Redis is down in "closed" mode.
        """
        if not await self.check_ai_limit(user_id):
            limit = self.settings.rate_limit_ai_free
            reset = self._next_midnight_utc().strftime("%H:%M UTC")
            raise RateLimitException(
                f"Bạn đã dùng hết {limit} lượt tạo lịch trình AI hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset}. "
                "Nâng cấp tài khoản để có thêm lượt."
            )

    async def enforce_ai_guest_limit(self, ip: str | None, user_agent: str | None) -> None:
        """Raise when an anonymous guest has exceeded the daily AI quota.

        Guest fingerprint is based on IP + User-Agent hash — stable within a session
        but resets if the user changes network or browser. Guests share a tighter
        quota than authenticated users; the message encourages registration.
        """
        actor = self.guest_actor(ip=ip, user_agent=user_agent)
        if not await self.check_ai_actor_limit(actor):
            limit = self.settings.rate_limit_ai_free
            reset = self._next_midnight_utc().strftime("%H:%M UTC")
            raise RateLimitException(
                f"Bạn đã dùng hết {limit} lượt tạo lịch trình AI miễn phí hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset}. "
                "Đăng ký tài khoản miễn phí để lưu lịch trình và nhận thêm lượt AI mỗi ngày."
            )

    async def get_remaining(self, user_id: int) -> RateLimitInfo:
        """Return remaining AI calls for the current UTC day.

        Args:
            user_id: The user to query.

        Returns:
            RateLimitInfo with remaining count, limit, and reset time.

        Raises:
            ServiceUnavailableException: If Redis is down (always fail-closed for reads).
        """
        key = self._ai_key(f"user:{user_id}")
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
        """Calculate the next midnight UTC timestamp."""
        now = datetime.now(UTC)
        return (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)

    @staticmethod
    def guest_actor(ip: str | None, user_agent: str | None) -> str:
        """Build a stable anonymized guest actor key."""
        fingerprint = f"{ip or 'unknown'}|{user_agent or 'unknown'}"
        digest = sha256(fingerprint.encode("utf-8")).hexdigest()[:16]
        return f"guest:{digest}"

    @staticmethod
    def _ai_key(actor: str) -> str:
        """Build the Redis key for a user's daily AI call counter.

        Format: rate:ai:user:{user_id}:{YYYYMMDD} or rate:ai:guest:{hash}:{YYYYMMDD}
        """
        today = datetime.now(UTC).strftime("%Y%m%d")
        return f"rate:ai:{actor}:{today}"
