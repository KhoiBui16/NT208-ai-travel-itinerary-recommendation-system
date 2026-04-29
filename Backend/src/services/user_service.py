"""User profile business logic.

Handles read-only profile access, partial profile updates,
and password changes. All methods rely on the current_user
resolved by the JWT dependency — never trust client-provided user IDs.
"""

from src.core.exceptions import UnauthorizedException
from src.core.logger import get_logger
from src.core.security import hash_password, verify_password
from src.models.user import User
from src.repositories.user_repo import UserRepository
from src.schemas.user import UserResponse

logger = get_logger(__name__)


class UserService:
    """Handle profile read, update, and password change.

    Args:
        user_repo: UserRepository for user table writes.
    """

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def get_profile(self, user: User) -> UserResponse:
        """Return the public profile for the authenticated user.

        Args:
            user: Current user resolved from JWT.

        Returns:
            UserResponse with id, email, name, phone, interests, timestamps.
        """
        return UserResponse.model_validate(user)

    async def update_profile(
        self,
        user: User,
        name: str | None = None,
        phone: str | None = None,
        interests: list[str] | None = None,
    ) -> UserResponse:
        """Partially update the user's profile fields.

        Only non-None fields are updated — sending {"name": null} is a no-op.
        This allows the FE to send only changed fields without overwriting others.

        Workflow:
          1. Collect non-None fields into an updates dict.
          2. If any updates exist, persist them to DB.
          3. Return the updated UserResponse.

        Args:
            user: Current user from JWT.
            name: New display name (optional).
            phone: New phone number (optional).
            interests: New interests list (optional).

        Returns:
            UserResponse with updated fields.
        """
        # Step 1: Collect only non-None updates
        updates: dict[str, object] = {}
        if name is not None:
            updates["name"] = name
        if phone is not None:
            updates["phone"] = phone
        if interests is not None:
            updates["interests"] = interests

        # Step 2: Persist if there are changes
        if updates:
            user = await self.user_repo.update(user, **updates)
            logger.info("profile_updated", user_id=user.id)

        # Step 3: Return current state
        return UserResponse.model_validate(user)

    async def change_password(
        self,
        user: User,
        current_password: str,
        new_password: str,
    ) -> None:
        """Change the user's password after verifying the current one.

        Workflow:
          1. Verify current password with bcrypt.
          2. Hash the new password.
          3. Persist the new hashed password.

        Args:
            user: Current user from JWT.
            current_password: The user's current plaintext password.
            new_password: The desired new plaintext password (min 6 chars).

        Raises:
            UnauthorizedException: If current_password does not match.
        """
        # Step 1: Verify current password
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException("Current password is incorrect")

        # Step 2-3: Hash and persist new password
        user = await self.user_repo.update(
            user,
            hashed_password=hash_password(new_password),
        )
        logger.info("password_changed", user_id=user.id)
