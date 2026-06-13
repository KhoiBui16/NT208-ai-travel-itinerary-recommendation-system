"""User profile business logic.

Handles read-only profile access, partial profile updates,
and password changes.
"""

from src.auth.models import User
from src.auth.repository import UserRepository
from src.auth.schemas import UserResponse
from src.core.exceptions import UnauthorizedException
from src.core.logger import get_logger
from src.core.security import hash_password, verify_password

logger = get_logger(__name__)


class UserService:
    """Xử lý các thao tác hồ sơ cá nhân và đổi mật khẩu của người dùng."""

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def get_profile(self, user: User) -> UserResponse:
        """Trả về hồ sơ công khai của user đã được xác thực.

        Hàm này không query lại database vì `user` đã được dependency auth
        nạp sẵn từ access token.
        """
        return UserResponse.model_validate(user)

    async def update_profile(
        self,
        user_id: int,
        name: str | None = None,
        phone: str | None = None,
        interests: list[str] | None = None,
    ) -> UserResponse:
        """Cập nhật từng phần hồ sơ cá nhân của user.

        Chỉ những field khác `None` mới được ghi xuống database. Nếu payload
        không tạo ra thay đổi nào thì service trả lại trạng thái hiện tại.
        """
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedException("User not found")

        updates: dict[str, object] = {}
        if name is not None:
            updates["name"] = name
        if phone is not None:
            updates["phone"] = phone
        if interests is not None:
            updates["interests"] = interests

        if updates:
            user = await self.user_repo.update(user, **updates)
            logger.info("profile_updated", user_id=user.id)

        return UserResponse.model_validate(user)

    async def change_password(
        self,
        user_id: int,
        current_password: str,
        new_password: str,
    ) -> None:
        """Đổi mật khẩu sau khi xác minh đúng mật khẩu hiện tại.

        Service chỉ cập nhật hash mật khẩu và ghi log audit. Việc revoke các
        refresh token cũ không được tự động thực hiện trong flow này.
        """
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedException("User not found")

        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException("Current password is incorrect")

        user = await self.user_repo.update(
            user,
            hashed_password=hash_password(new_password),
        )
        logger.info("password_changed", user_id=user.id)
