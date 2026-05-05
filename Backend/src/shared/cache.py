"""Redis cache client — composition-based, no domain knowledge.

Usage:
    self.cache = CacheClient(redis)
    cached = await self.cache.get("key")
    await self.cache.set("key", value, ttl=300)
"""

import logging

from redis.asyncio import Redis

logger = logging.getLogger(__name__)


class CacheClient:
    """Redis cache wrapper for domain services.

    Uses composition instead of mixin: the CacheClient is explicitly
    instantiated and stored, with no implicit dependency on self.redis
    in the parent service class.

    Args:
        redis: Async Redis client, or None if caching is unavailable.
    """

    def __init__(self, redis: Redis | None) -> None:
        self._redis = redis

    async def get(self, key: str) -> str | None:
        """Read from Redis. Returns None on miss or if Redis unavailable.

        Args:
            key: Redis cache key.

        Returns:
            Cached string value, or None on miss/Redis failure.
        """
        if not self._redis:
            return None
        try:
            return await self._redis.get(key)
        except Exception:
            logger.warning("Redis cache read failed for key=%s", key, exc_info=True)
            return None

    async def set(self, key: str, value: str, ttl: int) -> None:
        """Write to Redis with TTL. Silently fails if Redis unavailable.

        Args:
            key: Redis cache key.
            value: JSON string to cache.
            ttl: Time-to-live in seconds.
        """
        if not self._redis:
            return
        try:
            await self._redis.setex(key, ttl, value)
        except Exception:
            logger.warning("Redis cache write failed for key=%s", key, exc_info=True)

    async def delete(self, key: str) -> None:
        """Delete a key from Redis. Silently fails if Redis unavailable.

        Args:
            key: Redis cache key.
        """
        if not self._redis:
            return
        try:
            await self._redis.delete(key)
        except Exception:
            logger.warning("Redis cache delete failed for key=%s", key, exc_info=True)
