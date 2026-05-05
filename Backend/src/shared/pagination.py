"""Pagination utility for paginated queries."""


def calculate_pagination(page: int, size: int) -> tuple[int, int]:
    """Calculate skip/limit for paginated database queries.

    Args:
        page: 1-indexed page number.
        size: Items per page.

    Returns:
        Tuple of (skip, limit) for SQLAlchemy queries.
    """
    return (page - 1) * size, size
