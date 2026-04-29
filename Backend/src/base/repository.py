"""Generic repository contract."""

from abc import ABC, abstractmethod
from collections.abc import Sequence
from typing import Generic, TypeVar

from sqlalchemy.ext.asyncio import AsyncSession

T = TypeVar("T")


class BaseRepository(ABC, Generic[T]):
    """Abstract base class for data access repositories."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @abstractmethod
    async def get_by_id(self, id: int) -> T | None:
        """Fetch a single record by primary key."""

    @abstractmethod
    async def get_all(self, skip: int = 0, limit: int = 20) -> Sequence[T]:
        """Fetch a paginated record list."""

    @abstractmethod
    async def create(self, **kwargs: object) -> T:
        """Create and return a new record."""

    @abstractmethod
    async def update(self, id: int, **kwargs: object) -> T | None:
        """Update an existing record."""

    @abstractmethod
    async def delete(self, id: int) -> bool:
        """Delete a record by primary key."""
