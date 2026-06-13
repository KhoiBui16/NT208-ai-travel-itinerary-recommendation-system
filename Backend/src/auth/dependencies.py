"""Dependency hỗ trợ xác thực cho các endpoint cần biết user hiện tại.

File này chỉ lo việc đọc Bearer token, xác thực access token và nạp `User`
từ database. Nó không xử lý business logic của auth như login, refresh
hay logout.
"""

from fastapi import Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from src.auth.models import User
from src.core.database import get_db
from src.core.exceptions import UnauthorizedException
from src.core.security import verify_access_token

# Points to the login endpoint so Swagger UI can generate the "Authorize" dialog
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


async def _optional_token(request: Request) -> str | None:
    """Đọc Bearer token nếu request có gửi, ngược lại trả về `None`.

    Hàm này chỉ tách chuỗi token từ header `Authorization`. Việc kiểm tra
    chữ ký JWT và trạng thái user được thực hiện ở dependency phía sau.
    """
    auth: str | None = request.headers.get("authorization")
    if not auth or not auth.lower().startswith("bearer "):
        return None
    return auth[7:]


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Trả về user đang đăng nhập dựa trên access token hợp lệ.

    Luồng xử lý:
    1. Nhận token từ `OAuth2PasswordBearer`.
    2. Xác minh token còn hiệu lực và có claim `sub`.
    3. Nạp `User` từ database.
    4. Từ chối nếu user không tồn tại hoặc đã bị vô hiệu hóa.
    """
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        raise UnauthorizedException("Invalid or expired token")

    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    user = result.scalar_one_or_none()
    if user is None or not user.is_active:
        raise UnauthorizedException("User not found or inactive")
    return user


async def get_current_user_optional(
    token: str | None = Depends(_optional_token),
    db: AsyncSession = Depends(get_db),
) -> User | None:
    """Trả về user nếu request có token hợp lệ, ngược lại trả về `None`.

    Dependency này phù hợp cho các endpoint có thể phục vụ cả người dùng đã
    đăng nhập lẫn anonymous user mà không muốn ném lỗi 401 ngay từ đầu.
    """
    if not token:
        return None
    payload = verify_access_token(token)
    if not payload or "sub" not in payload:
        return None
    result = await db.execute(select(User).where(User.id == int(payload["sub"])))
    return result.scalar_one_or_none()
