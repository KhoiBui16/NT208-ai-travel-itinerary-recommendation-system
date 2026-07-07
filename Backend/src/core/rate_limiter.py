"""Redis-backed rate limiting primitives.

Rate limiting for AI endpoints:
  - Generate giữ key legacy `rate:ai:user:{id}:{YYYYMMDD}` / `rate:ai:guest:{hash}:{YYYYMMDD}`.
  - Companion chat dùng namespace riêng `rate:ai:chat:user:{id}:{YYYYMMDD}`.
  - Counter resets at midnight UTC.

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

    async def check_ai_actor_limit(
        self,
        actor: str,
        *,
        namespace: str | None = None,
        limit: int | None = None,
    ) -> bool:
        """Kiểm tra quota AI theo actor và namespace logic.

        Args:
            actor: Actor logic như ``user:12`` hoặc ``guest:abcd``.
            namespace: ``None`` để giữ key generate legacy, hoặc tên namespace
                riêng như ``chat``.
            limit: Hạn mức riêng cho namespace; nếu bỏ trống sẽ dùng quota
                generate mặc định.
        """
        key = self._ai_key(actor) if namespace is None else self._scoped_ai_key(namespace, actor)
        quota_limit = limit or self.settings.rate_limit_ai_free
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
        return count <= quota_limit

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
            reset = self._next_midnight_utc()
            raise RateLimitException(
                detail=f"Bạn đã dùng hết {limit} lượt tạo lịch trình AI hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset.strftime('%H:%M UTC')}. "
                "Nâng cấp tài khoản để có thêm lượt.",
                limit=limit,
                remaining=0,
                reset_at=reset,
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
            reset = self._next_midnight_utc()
            raise RateLimitException(
                detail=f"Bạn đã dùng hết {limit} lượt tạo lịch trình AI miễn phí hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset.strftime('%H:%M UTC')}. "
                "Đăng ký tài khoản miễn phí để lưu lịch trình và nhận thêm lượt AI mỗi ngày.",
                limit=limit,
                remaining=0,
                reset_at=reset,
            )

    async def enforce_chat_limit(self, user_id: int) -> None:
        """Chặn companion chat khi user đã dùng hết quota chat riêng trong ngày.

        Guest chat chưa được mở trong phase hiện tại, nên method này chỉ nhận
        authenticated user ID.
        """
        limit = self.settings.rate_limit_ai_chat_user
        if not await self.check_ai_actor_limit(
            f"user:{user_id}",
            namespace="chat",
            limit=limit,
        ):
            reset = self._next_midnight_utc()
            raise RateLimitException(
                detail=f"Bạn đã dùng hết {limit} lượt chat AI hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset.strftime('%H:%M UTC')}. "
                "Vui lòng thử lại sau hoặc tiếp tục chỉnh lịch trình thủ công.",
                limit=limit,
                remaining=0,
                reset_at=reset,
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
        return await self.get_remaining_for_actor(f"user:{user_id}")

    async def get_chat_remaining(self, user_id: int) -> RateLimitInfo:
        """Trả về quota chat còn lại của user hiện tại."""
        return await self.get_remaining_for_actor(
            f"user:{user_id}",
            namespace="chat",
            limit=self.settings.rate_limit_ai_chat_user,
        )

    async def enforce_apply_patch_limit(self, user_id: int) -> None:
        """Chặn apply-patch khi user đã dùng hết quota apply-patch riêng trong ngày.

        apply-patch là mutation nhanh (không gọi LLM) nhưng vẫn cần chặn spam nên
        dùng namespace ``apply_patch``, tách biệt hẳn với generate và chat.
        """
        limit = self.settings.rate_limit_ai_apply_patch_user
        if not await self.check_ai_actor_limit(
            f"user:{user_id}",
            namespace="apply_patch",
            limit=limit,
        ):
            reset = self._next_midnight_utc()
            raise RateLimitException(
                detail=f"Bạn đã dùng hết {limit} lượt xác nhận chỉnh sửa AI hôm nay. "
                f"Hạn mức sẽ được đặt lại lúc {reset.strftime('%H:%M UTC')}.",
                limit=limit,
                remaining=0,
                reset_at=reset,
            )

    async def get_apply_patch_remaining(self, user_id: int) -> RateLimitInfo:
        """Trả về quota apply-patch còn lại của user hiện tại."""
        return await self.get_remaining_for_actor(
            f"user:{user_id}",
            namespace="apply_patch",
            limit=self.settings.rate_limit_ai_apply_patch_user,
        )

    async def get_remaining_for_actor(
        self,
        actor: str,
        *,
        namespace: str | None = None,
        limit: int | None = None,
    ) -> RateLimitInfo:
        """Return remaining AI calls for an actor (user or guest) for the current UTC day.

        Args:
            actor: Actor string like "user:123" or "guest:abcd1234".
            namespace: ``None`` để đọc key generate legacy, hoặc namespace riêng.
            limit: Override hạn mức khi namespace không dùng quota generate mặc định.

        Returns:
            RateLimitInfo with remaining count, limit, and reset time.

        Raises:
            ServiceUnavailableException: If Redis is down (always fail-closed for reads).
        """
        key = self._ai_key(actor) if namespace is None else self._scoped_ai_key(namespace, actor)
        try:
            current = int(await self.redis.get(key) or 0)
        except Exception as exc:
            if self.settings.ai_rate_limit_fail_mode == "closed":
                raise ServiceUnavailableException("AI rate limiter unavailable") from exc
            current = 0
        resolved_limit = limit or self.settings.rate_limit_ai_free
        return RateLimitInfo(
            remaining=max(resolved_limit - current, 0),
            limit=resolved_limit,
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

    @staticmethod
    def _scoped_ai_key(namespace: str, actor: str) -> str:
        """Build namespaced AI quota keys without breaking generate legacy keys."""
        today = datetime.now(UTC).strftime("%Y%m%d")
        return f"rate:ai:{namespace}:{actor}:{today}"
