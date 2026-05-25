"""Base extractor with retry and exponential backoff.

All ETL extractors inherit from this to get resilient HTTP fetching
with configurable retry counts and delays.
"""

import asyncio
import logging

import httpx

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 5.0
DEFAULT_TIMEOUT = 30.0


class BaseExtractor:
    """Abstract base for ETL extractors with retry logic."""

    def __init__(
        self,
        max_retries: int = DEFAULT_MAX_RETRIES,
        base_delay: float = DEFAULT_BASE_DELAY,
        timeout: float = DEFAULT_TIMEOUT,
    ) -> None:
        self.max_retries = max_retries
        self.base_delay = base_delay
        self.timeout = timeout

    async def fetch(
        self,
        url: str,
        params: dict | None = None,
        headers: dict | None = None,
    ) -> dict:
        """HTTP GET with exponential backoff retry.

        Backoff schedule: base_delay × 3^attempt (5s → 15s → 45s).
        Retries on 429 (rate limit) and 5xx (server error).
        Other errors (4xx except 429) raise immediately.

        Args:
            url: Request URL.
            params: Query parameters.
            headers: Request headers.

        Returns:
            Parsed JSON response.

        Raises:
            RuntimeError: If all retries exhausted.
        """
        last_error: Exception | None = None

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params, headers=headers)

                    if response.status_code == 429:
                        retry_after = int(response.headers.get("Retry-After", "60"))
                        logger.warning("Rate limited (429), waiting %ds", retry_after)
                        await asyncio.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    return response.json()

            except httpx.TimeoutException as exc:
                logger.warning("Timeout on attempt %d/%d: %s", attempt + 1, self.max_retries, exc)
                last_error = exc

            except httpx.HTTPStatusError as exc:
                if exc.response.status_code >= 500:
                    delay = self.base_delay * (3**attempt)
                    logger.warning(
                        "Server error %d, retry in %.1fs",
                        exc.response.status_code,
                        delay,
                    )
                    await asyncio.sleep(delay)
                    last_error = exc
                    continue
                raise RuntimeError(
                    f"HTTP {exc.response.status_code} while fetching {url}"
                ) from None

            except (httpx.ConnectError, httpx.ReadError) as exc:
                delay = self.base_delay * (3**attempt)
                logger.warning(
                    "Connection error on attempt %d/%d, retry in %.1fs",
                    attempt + 1,
                    self.max_retries,
                    delay,
                )
                await asyncio.sleep(delay)
                last_error = exc

        raise RuntimeError(f"All {self.max_retries} retries exhausted for {url}") from last_error
