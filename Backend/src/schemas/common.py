"""Backward-compatibility shim — shared schemas moved to core.schema."""

from src.core.schema import (
    CamelCaseModel,
    ErrorResponse,
    PaginatedResponse,
    SuccessResponse,
)

__all__ = ["CamelCaseModel", "ErrorResponse", "PaginatedResponse", "SuccessResponse"]
