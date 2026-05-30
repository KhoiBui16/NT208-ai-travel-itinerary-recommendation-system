"""Base extractor with retry and exponential backoff.

All ETL extractors inherit from this to get resilient HTTP fetching
with configurable retry counts and delays.
"""

import asyncio
import logging
from typing import Any

import httpx

logger = logging.getLogger(__name__)
logging.getLogger("httpx").setLevel(logging.WARNING)

DEFAULT_MAX_RETRIES = 3
DEFAULT_BASE_DELAY = 5.0
DEFAULT_TIMEOUT = 30.0


class ProviderErrorResponse(RuntimeError):
    """Raised when a provider (Goong, etc.) returns an error with structured body.

    This preserves the provider's error.code so callers can distinguish between
    API_KEY_MISSING, API_KEY_INVALID, RATE_LIMIT_EXCEEDED, etc.
    """

    def __init__(
        self,
        message: str,
        status_code: int,
        provider_code: str | None = None,
        response_body: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.provider_code = provider_code
        self.response_body = response_body or {}

    def __str__(self) -> str:
        if self.provider_code:
            return f"{super().__str__()} (provider_code={self.provider_code})"
        return super().__str__()


class MaxRetriesExceededError(RuntimeError):
    """Raised when max retries are exhausted with details about the final error.

    This allows the runner to distinguish between:
    - Rate limit exhaustion (429 retries exceeded)
    - Generic network/server errors (5xx, timeout, connection)
    """

    def __init__(
        self,
        message: str,
        status_code: int | None = None,
        is_rate_limit: bool = False,
    ) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.is_rate_limit = is_rate_limit

    def __str__(self) -> str:
        if self.is_rate_limit:
            return f"{super().__str__()} (rate limit exceeded)"
        return super().__str__()


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
        Retries on 429 (rate limit) up to max_retries before raising MaxRetriesExceededError.
        Retries on 5xx (server error) up to max_retries before raising MaxRetriesExceededError.
        Other errors (4xx except 429) raise immediately.

        Args:
            url: Request URL.
            params: Query parameters.
            headers: Request headers.

        Returns:
            Parsed JSON response.

        Raises:
            ProviderErrorResponse: If provider returns structured error (API_KEY_MISSING, etc.).
            MaxRetriesExceededError: If all retries exhausted with is_rate_limit flag set.
        """
        last_error: Exception | None = None
        rate_limit_retry_count = 0  # Track 429 retries separately

        for attempt in range(self.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.timeout) as client:
                    response = await client.get(url, params=params, headers=headers)

                    if response.status_code == 429:
                        rate_limit_retry_count += 1
                        # If this is the last retry, don't sleep - raise immediately
                        if rate_limit_retry_count >= self.max_retries:
                            retry_after = int(response.headers.get("Retry-After", "60"))
                            logger.error(
                                "Rate limit (429) exceeded after %d retries, giving up "
                                "(Retry-After: %ds)",
                                rate_limit_retry_count,
                                retry_after,
                            )
                            raise MaxRetriesExceededError(
                                f"Rate limit exceeded after {rate_limit_retry_count} "
                                f"retries for {url}",
                                status_code=429,
                                is_rate_limit=True,
                            )
                        retry_after = int(response.headers.get("Retry-After", "60"))
                        logger.warning(
                            "Rate limited (429), waiting %ds (retry %d/%d)",
                            retry_after,
                            rate_limit_retry_count,
                            self.max_retries,
                        )
                        await asyncio.sleep(retry_after)
                        continue

                    response.raise_for_status()
                    return response.json()

            except MaxRetriesExceededError:
                # Re-raise MaxRetriesExceededError immediately
                raise

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

                # Try to extract provider error structure from response body
                provider_code = None
                response_body = None
                try:
                    response_body = exc.response.json()
                    # Goong returns: {"error": {"code": "API_KEY_MISSING", "message": "..."}}
                    if isinstance(response_body, dict) and "error" in response_body:
                        error_detail = response_body.get("error", {})
                        if isinstance(error_detail, dict):
                            provider_code = error_detail.get("code")
                except Exception:
                    pass  # Response not JSON or malformed, proceed with generic error

                if provider_code:
                    raise ProviderErrorResponse(
                        f"Provider error {exc.response.status_code} while fetching {url}",
                        status_code=exc.response.status_code,
                        provider_code=provider_code,
                        response_body=response_body,
                    ) from exc

                raise RuntimeError(f"HTTP {exc.response.status_code} while fetching {url}") from exc

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

        # Determine if this was a rate limit exhaustion or generic failure
        is_rate_limit_exhausted = rate_limit_retry_count >= self.max_retries
        if is_rate_limit_exhausted:
            raise MaxRetriesExceededError(
                f"Rate limit exceeded after {rate_limit_retry_count} retries for {url}",
                status_code=429,
                is_rate_limit=True,
            ) from last_error

        raise MaxRetriesExceededError(
            f"All {self.max_retries} retries exhausted for {url}",
            status_code=None,
            is_rate_limit=False,
        ) from last_error
