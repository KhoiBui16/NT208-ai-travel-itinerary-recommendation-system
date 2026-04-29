"""User data access repository.

Provides CRUD operations for the users table.
Used by AuthService (login/register) and UserService (profile/password).
"""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import User


class UserRepository:
    """Data access for User table.

    Args:
        session: Async SQLAlchemy session injected via FastAPI Depends.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, user_id: int) -> User | None:
        """Fetch a user by primary key.

        Args:
            user_id: The user's integer ID from JWT sub claim.

        Returns:
            User instance or None if not found.
        """
        result = await self.session.execute(select(User).where(User.id == user_id))
        return result.scalar_one_or_none()

    async def get_by_email(self, email: str) -> User | None:
        """Fetch a user by email address.

        Used during login (to verify credentials) and register (to check duplicates).

        Args:
            email: Case-sensitive email string.

        Returns:
            User instance or None if not found.
        """
        result = await self.session.execute(select(User).where(User.email == email))
        return result.scalar_one_or_none()

    async def create(self, **kwargs: object) -> User:
        """Create a new user record.

        Args:
            **kwargs: User fields — must include email, hashed_password, name.
                      Optional: phone, interests.

        Returns:
            The newly created User with auto-generated id.
        """
        user = User(**kwargs)  # type: ignore[arg-type]
        self.session.add(user)
        await self.session.flush()
        return user

    async def update(self, user: User, **kwargs: object) -> User:
        """Update specific fields on an existing user.

        Only sets attributes whose value is not None, allowing partial updates.

        Args:
            user: The existing User ORM instance.
            **kwargs: Fields to update — e.g. name, phone, hashed_password.

        Returns:
            The updated User instance.
        """
        for key, value in kwargs.items():
            if value is not None:
                setattr(user, key, value)
        await self.session.flush()
        return user
