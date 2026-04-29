"""Custom exceptions and standard error response helpers.

Exception hierarchy:
  AppException (base, 500)
  ├── NotFoundException (404)
  ├── ConflictException (409)
  ├── ForbiddenException (403)
  ├── UnauthorizedException (401)
  ├── ValidationException (422)
  ├── RateLimitException (429)
  └── ServiceUnavailableException (503)

All exceptions produce a consistent JSON response:
  {"detail": "...", "error_code": "NOT_FOUND", "status_code": 404}

The two handlers registered in middlewares.py ensure both
AppException subclasses and FastAPI's HTTPException produce
the same response format.
"""

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class AppException(HTTPException):
    """Base application exception with a stable error code.

    Args:
        detail: Human-readable error message.
        error_code: Machine-readable error code (e.g. "NOT_FOUND").
        status_code: HTTP status code.
    """

    def __init__(
        self,
        detail: str = "Internal server error",
        error_code: str = "INTERNAL_ERROR",
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
    ) -> None:
        super().__init__(status_code=status_code, detail=detail)
        self.error_code = error_code


class NotFoundException(AppException):
    """Raised when a requested resource is not found."""

    def __init__(self, detail: str = "Resource not found") -> None:
        super().__init__(detail, "NOT_FOUND", status.HTTP_404_NOT_FOUND)


class ConflictException(AppException):
    """Raised when a request conflicts with existing state (e.g. duplicate email)."""

    def __init__(self, detail: str = "Resource conflict") -> None:
        super().__init__(detail, "CONFLICT", status.HTTP_409_CONFLICT)


class ForbiddenException(AppException):
    """Raised when the current user cannot access a resource (wrong owner)."""

    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(detail, "FORBIDDEN", status.HTTP_403_FORBIDDEN)


class UnauthorizedException(AppException):
    """Raised when authentication is missing or invalid."""

    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(detail, "UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED)


class ValidationException(AppException):
    """Raised when business validation fails (beyond Pydantic schema checks)."""

    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(detail, "VALIDATION_ERROR", status.HTTP_422_UNPROCESSABLE_ENTITY)


class RateLimitException(AppException):
    """Raised when a rate limit is exceeded (e.g. daily AI call quota)."""

    def __init__(self, detail: str = "Rate limit exceeded") -> None:
        super().__init__(detail, "RATE_LIMIT_EXCEEDED", status.HTTP_429_TOO_MANY_REQUESTS)


class ServiceUnavailableException(AppException):
    """Raised when an external dependency is unavailable (e.g. Redis down, AI API down)."""

    def __init__(self, detail: str = "Service unavailable") -> None:
        super().__init__(detail, "SERVICE_UNAVAILABLE", status.HTTP_503_SERVICE_UNAVAILABLE)


def error_payload(exc: AppException) -> dict[str, Any]:
    """Build the standard error response payload.

    Args:
        exc: The AppException to serialize.

    Returns:
        Dict with "detail", "error_code", and "status_code" keys.
    """
    return {
        "detail": exc.detail,
        "error_code": exc.error_code,
        "status_code": exc.status_code,
    }


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    """Format AppException subclasses into consistent JSON responses.

    Registered as a FastAPI exception handler in middlewares.py.
    """
    return JSONResponse(status_code=exc.status_code, content=error_payload(exc))


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Format FastAPI's built-in HTTPException into the same consistent shape.

    This ensures 3rd-party HTTPExceptions (e.g. from dependencies) also
    return {"detail", "error_code", "status_code"} instead of just {"detail"}.
    """
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": "HTTP_ERROR",
            "status_code": exc.status_code,
        },
    )
