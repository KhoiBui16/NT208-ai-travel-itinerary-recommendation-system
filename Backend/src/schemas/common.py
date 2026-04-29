"""Shared API schemas."""

from typing import Generic, TypeVar

from pydantic import Field

from src.base.schema import CamelCaseModel

T = TypeVar("T")


class ErrorResponse(CamelCaseModel):
    """Standard error response."""

    detail: str
    error_code: str
    status_code: int


class SuccessResponse(CamelCaseModel):
    """Simple success response."""

    success: bool = True
    message: str


class PaginatedResponse(CamelCaseModel, Generic[T]):
    """Generic paginated list response."""

    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1, le=100)
