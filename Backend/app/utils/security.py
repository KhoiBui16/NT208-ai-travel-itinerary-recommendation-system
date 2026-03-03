"""
============================================
app/utils/security.py — JWT Token & Password Hashing
============================================
Cung cấp 2 nhóm chức năng bảo mật:

1. Password Hashing (bcrypt):
   - hash_password(plain) → hashed string
   - verify_password(plain, hashed) → True/False

2. JWT Token:
   - create_access_token(data) → token string
   - verify_token(token) → payload dict hoặc None

JWT Flow:
  ┌─────────┐  login   ┌─────────┐
  │   FE    │ -------> │   BE    │
  │         │ <------- │         │
  │         │  token   │         │
  │         │          │         │
  │         │  request │         │
  │         │ -------> │         │
  │         │ +header  │ verify  │
  │         │  Bearer  │  token  │
  └─────────┘          └─────────┘

  Header: Authorization: Bearer <token>
============================================
"""

from datetime import datetime, timedelta, timezone

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.config import settings


# --- Password Hashing ---
# CryptContext quản lý thuật toán hash
# schemes=["bcrypt"]: dùng bcrypt (chuẩn industry)
# deprecated="auto": tự động cập nhật hash cũ
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """
    Hash mật khẩu plaintext bằng bcrypt.

    VD: hash_password("abc123") → "$2b$12$LJ3m5..."

    KHÔNG BAO GIỜ lưu password plaintext vào DB!
    """
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    So sánh password plaintext với hash trong DB.

    VD: verify_password("abc123", "$2b$12$LJ3m5...") → True

    bcrypt tự động xử lý salt, không cần compare thủ công.
    """
    return pwd_context.verify(plain_password, hashed_password)


# --- JWT Token ---


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Tạo JWT access token.

    Args:
        data: Payload chứa trong token (thường là {"sub": user_id})
        expires_delta: Thời gian hết hạn (mặc định từ settings)

    Returns:
        JWT token string (VD: "eyJhbGciOiJIUzI1NiIs...")

    Cấu trúc JWT:
        Header: {"alg": "HS256", "typ": "JWT"}
        Payload: {"sub": "user-uuid", "exp": 1234567890}
        Signature: HMAC-SHA256(header + payload, secret)
    """
    to_encode = data.copy()

    # Tính thời gian hết hạn
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )

    # Thêm "exp" (expiration) vào payload
    to_encode.update({"exp": expire})

    # Ký token bằng secret key
    encoded_jwt = jwt.encode(
        to_encode,
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    return encoded_jwt


def verify_token(token: str) -> dict | None:
    """
    Giải mã và xác thực JWT token.

    Args:
        token: JWT token string

    Returns:
        Payload dict nếu hợp lệ, None nếu:
        - Token hết hạn
        - Token bị sửa (signature invalid)
        - Token format sai
    """
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
        )
        return payload
    except JWTError:
        # Token không hợp lệ (hết hạn, sai signature, ...)
        return None
