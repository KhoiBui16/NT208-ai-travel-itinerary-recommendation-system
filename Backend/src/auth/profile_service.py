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
        """Return the public profile for the authenticated user.

        Tính năng: Xem hồ sơ cá nhân (EP-5)
        - Nhận User ORM object đã được xác thực từ dependency get_current_user
        - Chuyển đổi sang UserResponse schema (loại bỏ các field nhạy cảm như hashed_password)
        - Không query thêm database vì user object đã được load sẵn bởi get_current_user
        - Trả về thông tin public: id, email, name, phone, interests, is_active, timestamps
        """
        return UserResponse.model_validate(user)

    async def update_profile(
        self,
        user_id: int,
        name: str | None = None,
        phone: str | None = None,
        interests: list[str] | None = None,
    ) -> UserResponse:
        """Partially update the user's profile fields.

        Tính năng: Cập nhật thông tin hồ sơ (EP-6)
        - Cho phép cập nhật từng phần (PATCH-style) dù endpoint dùng PUT:
          chỉ field nào được truyền (không None) mới được ghi đè
        - Kiểm tra user tồn tại trước khi update (double-check sau get_current_user)
        - Xây dựng dict updates động: chỉ chứa field thực sự thay đổi
        - Nếu không có field nào thay đổi (updates rỗng): bỏ qua query UPDATE,
          trả về user hiện tại mà không tốn thêm round-trip database
        - Ghi log khi profile được cập nhật thành công (audit trail)
        - Trả về UserResponse mới nhất sau khi cập nhật

        Args:
            user_id: ID của user cần cập nhật (lấy từ JWT token).
            name: Tên mới, None = giữ nguyên.
            phone: Số điện thoại mới, None = giữ nguyên.
            interests: Danh sách sở thích mới, None = giữ nguyên.
        """
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedException("User not found")

        # Chỉ đưa vào dict những field được client gửi lên (không None)
        updates: dict[str, object] = {}
        if name is not None:
            updates["name"] = name
        if phone is not None:
            updates["phone"] = phone
        if interests is not None:
            updates["interests"] = interests

        # Tránh UPDATE không cần thiết khi client không gửi field nào
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

        Tính năng: Đổi mật khẩu (EP-7)
        - Yêu cầu xác thực mật khẩu hiện tại trước khi cho phép đổi
          (ngăn chặn chiếm tài khoản khi session bị đánh cắp)
        - verify_password: so sánh plain-text với bcrypt hash đã lưu trong DB
        - hash_password: tạo bcrypt hash mới cho mật khẩu mới
        - Không trả về UserResponse vì client không cần reload sau đổi mật khẩu
        - Ghi log sự kiện đổi mật khẩu để phục vụ audit trail bảo mật
        - Không tự động revoke các refresh token hiện có (không force logout)

        Args:
            user_id: ID của user đang thực hiện đổi mật khẩu.
            current_password: Mật khẩu hiện tại (plain-text) để xác minh.
            new_password: Mật khẩu mới (plain-text) sẽ được hash trước khi lưu.
        """
        user = await self.user_repo.get_by_id(user_id)
        if user is None:
            raise UnauthorizedException("User not found")

        # Xác minh mật khẩu hiện tại với bcrypt hash trong DB trước khi cho phép đổi
        if not verify_password(current_password, user.hashed_password):
            raise UnauthorizedException("Current password is incorrect")

        # Hash mật khẩu mới rồi ghi vào DB
        user = await self.user_repo.update(
            user,
            hashed_password=hash_password(new_password),
        )
        logger.info("password_changed", user_id=user.id)
