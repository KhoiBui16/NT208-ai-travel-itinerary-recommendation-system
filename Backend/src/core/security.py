"""Password hashing, JWT management, and token hashing helpers.

Three groups of functionality:

1. Password hashing (bcrypt):
   - hash_password(plain) → bcrypt hash string
   - verify_password(plain, hashed) → bool

2. JWT access tokens:
   - create_access_token(user_id) → signed JWT string (short-lived, 15 min)
   - verify_access_token(token) → payload dict or None

3. Opaque token hashing (for refresh, share, claim tokens):
   - hash_token(raw) → SHA-256 hex digest
   - create_refresh_token(user_id) → (raw, hash, expires_at)
   - create_opaque_token(prefix) → (raw, hash)

Security design:
   - passlib and jose are imported lazily inside functions so that
     unit tests for hash_token don't require the full auth stack.
   - Opaque tokens are stored as SHA-256 hashes — raw tokens are only
     returned once to the client and never persisted.
"""

from datetime import UTC, datetime, timedelta
from hashlib import sha256
from secrets import token_urlsafe
from typing import Any

from src.core.config import get_settings

ALGORITHM = "HS256"


def _get_pwd_context() -> Any:
    """Load passlib CryptContext lazily to avoid import overhead in non-auth tests."""
    from passlib.context import CryptContext

    return CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain: str) -> str:
    """Hash a plain-text password with bcrypt.

    Args:
        plain: The user's plaintext password.

    Returns:
        bcrypt hash string suitable for storage in the users table.
    """
    return _get_pwd_context().hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain-text password against a stored bcrypt hash.

    Args:
        plain: The plaintext password to check.
        hashed: The stored bcrypt hash.

    Returns:
        True if the password matches, False otherwise.
    """
    return _get_pwd_context().verify(plain, hashed)


def hash_token(raw_token: str) -> str:
    """Hash an opaque token before storing it in the database.

    Uses SHA-256 (fast, deterministic) since these tokens are
    high-entropy random strings — no need for slow bcrypt.

    Args:
        raw_token: The plaintext token string (e.g. "claim_abc123...").

    Returns:
        Hex digest string (64 chars).
    """
    return sha256(raw_token.encode("utf-8")).hexdigest()


def create_access_token(user_id: int) -> str:
    """Create a short-lived JWT access token.

    Args:
        user_id: The user's integer ID, stored in the "sub" claim.

    Returns:
        Signed JWT string with claims: sub, exp, type="access".
    """
    from jose import jwt

    settings = get_settings()
    # Calculate expiry time
    expires_at = datetime.now(UTC) + timedelta(minutes=settings.access_token_expire_minutes)
    payload: dict[str, Any] = {"sub": str(user_id), "exp": expires_at, "type": "access"}
    return jwt.encode(
        payload,
        settings.jwt_secret_key.get_secret_value(),
        algorithm=ALGORITHM,
    )


def create_refresh_token(user_id: int) -> tuple[str, str, datetime]:
    """Create a refresh token and its database-safe hash.

    The raw token is returned to the client once. Only the hash is stored in DB.

    Workflow:
      1. Generate 48-byte random URL-safe string.
      2. Build token payload: f"{user_id}:{random}:{expiry_timestamp}".
      3. Hash the payload with SHA-256 for DB storage.
      4. Return (raw_token, token_hash, expires_at).

    Args:
        user_id: The user's integer ID.

    Returns:
        Tuple of (raw_token_string, sha256_hash, expires_at_datetime).
    """
    settings = get_settings()
    raw_token = token_urlsafe(48)
    expires_at = datetime.now(UTC) + timedelta(days=settings.refresh_token_expire_days)
    token_payload = f"{user_id}:{raw_token}:{int(expires_at.timestamp())}"
    return token_payload, hash_token(token_payload), expires_at


def create_opaque_token(prefix: str) -> tuple[str, str]:
    """Create an opaque token and its hash for share/claim flows.

    Used for share links (prefix="share") and guest claim tokens (prefix="claim").
    The raw token is returned once; only the hash is persisted.

    Args:
        prefix: Token type prefix (e.g. "share", "claim").

    Returns:
        Tuple of (raw_token, sha256_hash).
    """
    raw_token = f"{prefix}_{token_urlsafe(32)}"
    return raw_token, hash_token(raw_token)


def verify_access_token(token: str) -> dict[str, Any] | None:
    """Decode and verify a JWT access token.

    Args:
        token: The JWT string from the Authorization header.

    Returns:
        Payload dict with "sub" (user_id), "exp", "type" if valid;
        None if the token is expired, malformed, or has wrong type.
    """
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
    # Reject tokens that aren't access tokens (e.g. refresh tokens misused)
    if payload.get("type") != "access":
        return None
    return payload
