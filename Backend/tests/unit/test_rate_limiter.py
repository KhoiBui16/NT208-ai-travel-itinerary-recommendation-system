"""Unit tests for Redis-backed AI rate limiter helpers."""

from datetime import UTC, datetime

import pytest

from src.core.config import AppSettings
from src.core.exceptions import RateLimitException
from src.core.rate_limiter import RateLimiter


class FakeRedis:
    def __init__(self) -> None:
        self.values: dict[str, int] = {}
        self.expirations: dict[str, datetime] = {}

    async def incr(self, key: str) -> int:
        self.values[key] = self.values.get(key, 0) + 1
        return self.values[key]

    async def expireat(self, key: str, when: datetime) -> None:
        self.expirations[key] = when

    async def get(self, key: str) -> int | None:
        return self.values.get(key)


@pytest.mark.asyncio
async def test_rate_limiter__guest_key_is_scoped_and_enforced() -> None:
    settings = AppSettings(_env_file=None, rate_limit_ai_free=1)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    await limiter.enforce_ai_guest_limit(ip="127.0.0.1", user_agent="pytest")

    key = next(iter(redis.values))
    assert key.startswith("rate:ai:guest:")

    with pytest.raises(RateLimitException):
        await limiter.enforce_ai_guest_limit(ip="127.0.0.1", user_agent="pytest")


def test_rate_limiter__guest_actor_is_stable_without_raw_ip() -> None:
    actor = RateLimiter.guest_actor(ip="127.0.0.1", user_agent="pytest")

    assert actor == RateLimiter.guest_actor(ip="127.0.0.1", user_agent="pytest")
    assert actor.startswith("guest:")
    assert "127.0.0.1" not in actor


@pytest.mark.asyncio
async def test_rate_limit_exception__includes_metadata() -> None:
    """RateLimitException should include limit, remaining, reset_at, and retry_after_seconds."""
    limit = 3
    reset = datetime.now(UTC).replace(hour=23, minute=59, second=0, microsecond=0)

    exc = RateLimitException(
        detail="Rate limit exceeded",
        limit=limit,
        remaining=0,
        reset_at=reset,
    )

    assert exc.limit == limit
    assert exc.remaining == 0
    assert exc.reset_at == reset
    assert exc.retry_after_seconds >= 0
    assert exc.retry_after_seconds <= 86400  # At most 24 hours


@pytest.mark.asyncio
async def test_rate_limit_exception__retry_after_calculates_seconds() -> None:
    """retry_after_seconds should calculate correct seconds until reset."""
    now = datetime.now(UTC)
    reset = now.replace(hour=23, minute=59, second=0, microsecond=0)

    exc = RateLimitException(limit=3, remaining=0, reset_at=reset)

    # If reset is in the future, retry_after should be positive
    if reset > now:
        expected_seconds = int((reset - now).total_seconds())
        assert exc.retry_after_seconds == expected_seconds
        assert exc.retry_after_seconds > 0
    else:
        # If reset is in the past (shouldn't happen in normal flow), default to 1 hour
        assert exc.retry_after_seconds == 3600


@pytest.mark.asyncio
async def test_get_remaining_for_actor__returns_correct_remaining() -> None:
    """get_remaining_for_actor should return actual remaining count from Redis."""
    settings = AppSettings(_env_file=None, rate_limit_ai_free=3)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    # Initially, no calls made
    info = await limiter.get_remaining_for_actor("user:123")
    assert info.remaining == 3
    assert info.limit == 3

    # After 1 call
    await limiter.check_ai_actor_limit("user:123")
    info = await limiter.get_remaining_for_actor("user:123")
    assert info.remaining == 2

    # After 2 more calls (total 3)
    await limiter.check_ai_actor_limit("user:123")
    await limiter.check_ai_actor_limit("user:123")
    info = await limiter.get_remaining_for_actor("user:123")
    assert info.remaining == 0

    # Verify reset_at is set to next midnight UTC
    assert info.reset_at.hour == 0
    assert info.reset_at.minute == 0


@pytest.mark.asyncio
async def test_get_remaining_for_actor__works_for_guest_actors() -> None:
    """get_remaining_for_actor should work correctly for guest actors."""
    settings = AppSettings(_env_file=None, rate_limit_ai_free=3)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    # Create a guest actor
    guest_actor = limiter.guest_actor(ip="127.0.0.1", user_agent="pytest")

    # Initially, no calls made
    info = await limiter.get_remaining_for_actor(guest_actor)
    assert info.remaining == 3

    # After 1 call
    await limiter.check_ai_actor_limit(guest_actor)
    info = await limiter.get_remaining_for_actor(guest_actor)
    assert info.remaining == 2

    # After 2 more calls (total 3)
    await limiter.check_ai_actor_limit(guest_actor)
    await limiter.check_ai_actor_limit(guest_actor)
    info = await limiter.get_remaining_for_actor(guest_actor)
    assert info.remaining == 0


@pytest.mark.asyncio
async def test_chat_limit__uses_separate_namespace_and_limit() -> None:
    """Quota chat phải dùng key riêng để không ăn chung với generate."""
    settings = AppSettings(_env_file=None, rate_limit_ai_free=1, rate_limit_ai_chat_user=2)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    # Generate quota dùng key legacy và hết sau 1 lượt.
    await limiter.enforce_ai_limit(123)
    generate_key = next(iter(redis.values))
    assert generate_key.startswith("rate:ai:user:123:")

    with pytest.raises(RateLimitException):
        await limiter.enforce_ai_limit(123)

    # Chat quota vẫn còn vì đi namespace riêng.
    await limiter.enforce_chat_limit(123)
    await limiter.enforce_chat_limit(123)

    chat_keys = [key for key in redis.values if ":chat:user:123:" in key]
    assert len(chat_keys) == 1

    with pytest.raises(RateLimitException):
        await limiter.enforce_chat_limit(123)


@pytest.mark.asyncio
async def test_get_chat_remaining__returns_chat_quota_metadata() -> None:
    """Đọc remaining của chat phải phản ánh hạn mức chat, không phải generate."""
    settings = AppSettings(_env_file=None, rate_limit_ai_free=3, rate_limit_ai_chat_user=5)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    await limiter.enforce_chat_limit(456)
    info = await limiter.get_chat_remaining(456)

    assert info.limit == 5
    assert info.remaining == 4


@pytest.mark.asyncio
async def test_apply_patch_limit__uses_separate_namespace_and_limit() -> None:
    """Quota apply-patch dùng namespace riêng, không ăn chung generate/chat."""
    settings = AppSettings(
        _env_file=None,
        rate_limit_ai_free=1,
        rate_limit_ai_chat_user=5,
        rate_limit_ai_apply_patch_user=2,
    )
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    # apply-patch hết sau 2 lượt.
    await limiter.enforce_apply_patch_limit(789)
    await limiter.enforce_apply_patch_limit(789)
    patch_keys = [key for key in redis.values if ":apply_patch:user:789:" in key]
    assert len(patch_keys) == 1

    with pytest.raises(RateLimitException):
        await limiter.enforce_apply_patch_limit(789)

    # generate + chat vẫn còn quota riêng vì namespace tách biệt.
    await limiter.enforce_ai_limit(789)
    await limiter.enforce_chat_limit(789)


@pytest.mark.asyncio
async def test_get_apply_patch_remaining__returns_apply_patch_quota() -> None:
    """Đọc remaining apply-patch phải phản ánh hạn mức apply-patch."""
    settings = AppSettings(_env_file=None, rate_limit_ai_apply_patch_user=4)
    redis = FakeRedis()
    limiter = RateLimiter(redis=redis, settings=settings)  # type: ignore[arg-type]

    await limiter.enforce_apply_patch_limit(321)
    info = await limiter.get_apply_patch_remaining(321)

    assert info.limit == 4
    assert info.remaining == 3
