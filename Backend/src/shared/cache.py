"""Redis cache client — composition-based, no domain knowledge.

Usage:
    self.cache = CacheClient(redis)
    cached = await self.cache.get("key")
    await self.cache.set("key", value, ttl=300)
"""

import logging
import urllib.parse

from redis.asyncio import Redis

logger = logging.getLogger(__name__)


def normalize_cache_key(*parts: str | None) -> str:
    """Normalize cache key parts to handle UTF-8 encoding.

    Converts None to "None" and URL-encodes all parts to ensure
    consistent cache keys regardless of Vietnamese characters.

    Args:
        *parts: Variable number of string parts to join into cache key

    Returns:
        Normalized cache key with URL-encoded Vietnamese characters

    Example:
        >>> normalize_cache_key("places", "search", None, "Hà Nội", None, 20)
        "places:search:None:H%E1%BB%8i%20N%E1%BB%99i:None:20"
    """
    normalized = []
    for part in parts:
        if part is None:
            normalized.append("None")
        else:
            # URL-encode to handle UTF-8 Vietnamese characters
            encoded = urllib.parse.quote(str(part), safe="")
            normalized.append(encoded)
    return ":".join(normalized)


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
