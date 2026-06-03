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
    """Handle profile read, update, and password change.

    Args:
        user_repo: UserRepository for user table writes.
    """

    def __init__(self, user_repo: UserRepository) -> None:
        self.user_repo = user_repo

    async def get_profile(self, user: User) -> UserResponse:
        """Return the public profile for the authenticated user."""
        return UserResponse.model_validate(user)

    async def update_profile(
        self,
        user_id: int,
        name: str | None = None,
        phone: str | None = None,
        interests: list[str] | None = None,
    ) -> UserResponse:
        """Partially update the user's profile fields.
        
        Partial Update Pattern:
        
        1. Fetch user bằng user_id
           - SELECT * FROM users WHERE id = ?
           - Nếu không tồn tại -> throw UnauthorizedException
        
        2. Build updates dict (partial)
           - Nếu name is not None -> updates["name"] = name
           - Nếu phone is not None -> updates["phone"] = phone
           - Nếu interests is not None -> updates["interests"] = interests
           - Nếu không có field nào -> skip
        
        3. Update nếu có changes
           - Nếu updates dict không rổng:
             * UPDATE users SET name=?, phone=?, interests=? WHERE id=?
             * Chỉ update fields có trong dict
           - Log audit
        
        4. Return updated user
        
        Benefits (Partial Update):
          - Client có thể cập nhật lẫ field rời
          - KHLNG bắt buộc gửi tất cả fields
          - Số dữ liệu làng phiê khi gửi lẫm lẫm
        
        Exceptions:
          - UnauthorizedException: User không tồn tại (hack attempt)
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
        """Change the user's password after verifying the current one.
        
        Change Password Flow (User Initiated):
        
        1. Fetch user bằng user_id
           - SELECT * FROM users WHERE id = ?
           - Nếu không tồn tại -> throw UnauthorizedException
        
        2. Verify current password
           - Dùng bcrypt.checkpw(current_password, user.hashed_password)
           - Nếu không match -> throw UnauthorizedException
           - KHLNG tiết lộ: vẫn nhật error "Current password is incorrect"
        
        3. Hash mật khẩu mới
           - Dùng bcrypt.hashpw() (salt rounds = 12)
        
        4. Update user
           - UPDATE users SET hashed_password = new_hash WHERE id = ?
           - Lị clear password_reset_token (nếu có)
           - Lị password_reset_expires_at
        
        5. **KHLNG revoke tokens** (không như forgot_password)
           - User tự thay đổi mật khẩu khi còn đăng nhập
           - Việc revoke tokens sẽ force logout -> UX xấu
           - Un like password reset (thường sau bị compromise)
        
        6. Log audit
        
        Security:
          - Verify current password: buộc đặng check authorize user action
          - Prevent account takeover: ngăn chặn thay password nếu desktop/session stolen
          - Kẽ to not revoke tokens: user vẫn giữ session
        
        Difference vs Reset Password:
          - Change Password: user authenticated + verify current password
            * Keep tokens active (user tự quản lý)
          - Reset Password: user forgot password + use reset token + no auth
            * Revoke all tokens (security: force re-login)
        
        Exceptions:
          - UnauthorizedException: current_password sai
          - UnauthorizedException: User không tồn tại
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
