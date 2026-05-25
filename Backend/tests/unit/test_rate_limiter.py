"""Unit tests for Redis-backed AI rate limiter helpers."""

from datetime import datetime

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
