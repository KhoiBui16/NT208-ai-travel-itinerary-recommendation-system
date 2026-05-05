"""Core schema primitives: base model + shared response schemas.

All schemas inherit from CamelCaseModel for consistent camelCase JSON output.
Shared response types (PaginatedResponse, ErrorResponse, SuccessResponse)
are used across all domains.
"""

from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel

T = TypeVar("T")


class CamelCaseModel(BaseModel):
    """Base schema: snake_case in Python, camelCase in public JSON.

    Config:
        from_attributes: Allow ORM object -> schema conversion.
        alias_generator: Convert snake_case field names to camelCase.
        populate_by_name: Accept both snake_case and camelCase input.
    """

    model_config = ConfigDict(
        from_attributes=True,
        alias_generator=to_camel,
        populate_by_name=True,
    )


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
