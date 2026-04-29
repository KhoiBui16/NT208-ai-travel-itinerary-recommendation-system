"""Custom exceptions and standard error response helpers."""

from typing import Any

from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse


class AppException(HTTPException):
    """Base application exception with a stable error code."""

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
    """Raised when a request conflicts with existing state."""

    def __init__(self, detail: str = "Resource conflict") -> None:
        super().__init__(detail, "CONFLICT", status.HTTP_409_CONFLICT)


class ForbiddenException(AppException):
    """Raised when the current user cannot access a resource."""

    def __init__(self, detail: str = "Forbidden") -> None:
        super().__init__(detail, "FORBIDDEN", status.HTTP_403_FORBIDDEN)


class UnauthorizedException(AppException):
    """Raised when authentication is missing or invalid."""

    def __init__(self, detail: str = "Unauthorized") -> None:
        super().__init__(detail, "UNAUTHORIZED", status.HTTP_401_UNAUTHORIZED)


class ValidationException(AppException):
    """Raised when business validation fails."""

    def __init__(self, detail: str = "Validation error") -> None:
        super().__init__(detail, "VALIDATION_ERROR", status.HTTP_422_UNPROCESSABLE_ENTITY)


class RateLimitException(AppException):
    """Raised when a rate limit is exceeded."""

    def __init__(self, detail: str = "Rate limit exceeded") -> None:
        super().__init__(detail, "RATE_LIMIT_EXCEEDED", status.HTTP_429_TOO_MANY_REQUESTS)


class ServiceUnavailableException(AppException):
    """Raised when an external dependency is unavailable."""

    def __init__(self, detail: str = "Service unavailable") -> None:
        super().__init__(detail, "SERVICE_UNAVAILABLE", status.HTTP_503_SERVICE_UNAVAILABLE)


def error_payload(exc: AppException) -> dict[str, Any]:
    """Build the standard error response payload."""
    return {
        "detail": exc.detail,
        "error_code": exc.error_code,
        "status_code": exc.status_code,
    }


async def app_exception_handler(_: Request, exc: AppException) -> JSONResponse:
    """Format application exceptions consistently."""
    return JSONResponse(status_code=exc.status_code, content=error_payload(exc))


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    """Format FastAPI HTTPException consistently."""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "error_code": "HTTP_ERROR",
            "status_code": exc.status_code,
        },
    )
