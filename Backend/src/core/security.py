"""Password hashing, JWT management, and token hashing helpers."""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Any

from src.core.config import get_settings

ALGORITHM = "HS256"


def _get_pwd_context() -> Any:
    """Load passlib lazily so token-hash tests do not need auth extras installed."""
    from passlib.context import CryptContext

    return CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt."""
    return _get_pwd_context().hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash."""
    return _get_pwd_context().verify(plain, hashed)


def hash_token(raw_token: str) -> str:
    """Hash an opaque token before storing it in the database."""
    return sha256(raw_token.encode("utf-8")).hexdigest()


def create_access_token(user_id: int) -> str:
    """Create a short-lived JWT access token."""
    from jose import jwt

    settings = get_settings()
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(user_id), "exp": expires_at, "type": "access"}
    return jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=ALGORITHM,
    )


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Create a refresh token and its database-safe hash."""
    settings = get_settings()
    raw_token = token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    token_payload = f"{user_id}:{raw_token}:{int(expires_at.timestamp())}"
    return token_payload, hash_token(token_payload), expires_at


def create_opaque_token(prefix: str) -> tuple[str, str]:
    """Create an opaque token and its hash for share/claim flows."""
    raw_token = f"{prefix}_{token_urlsafe(32)}"
    return raw_token, hash_token(raw_token)


def verify_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT access token."""
    from jose import JWTError, jwt

    settings = get_settings()
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret_key.get_secret_value(),
            algorithms=[ALGORITHM],
        )
    except JWTError:
        return None
    if payload.get("type") != "access":
        return None
    return payload
