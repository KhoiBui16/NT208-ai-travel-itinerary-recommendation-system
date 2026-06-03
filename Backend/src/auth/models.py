"""User and refresh-token ORM models."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import JSON, Boolean, DateTime, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from src.core.database import Base

if TYPE_CHECKING:
    from src.itineraries.models.chat import ChatSession
    from src.itineraries.models.trip import Trip
    from src.places.models import SavedPlace


class User(Base):
    """Application user.
    
    User Model - Lưu thông tin người dùng và password hash.
    
    Columns:
    
    - id (INT, PK, auto-increment):
      * Primary key
      * User identifier (used in JWT sub claim)
    
    - email (VARCHAR 255, UNIQUE, INDEXED):
      * Unique email address
      * Login identifier
      * Case-sensitive
    
    - hashed_password (VARCHAR 255):
      * Bcrypt hash (NOT raw password!)
      * Hash format: $2b$12$... (60 chars)
      * Never store plain text
      * Verify: bcrypt.checkpw(input, stored_hash)
    
    - name (VARCHAR 100, NOT NULL):
      * User full name (họ và tên)
      * Public profile data
    
    - phone (VARCHAR 30, NULLABLE):
      * Phone number (optional)
      * Public profile data
      * Can be empty
    
    - interests (JSON, DEFAULT []):
      * List of city preferences (thành phố quan tâm)
      * Example: ["Hanoi", "HCMC", "Da Nang"]
      * Used for personalization
    
    - is_active (BOOLEAN, DEFAULT true):
      * Account status
      * false = deactivated/banned
      * Login fails if false
      * Can be set by admin
    
    - password_reset_token_hash (VARCHAR 255, NULLABLE, INDEXED):
      * SHA-256 hash of password reset token
      * Only set when user forgot password
      * Lookup index: find_by_reset_token_hash()
      * NULL = no reset in progress
    
    - password_reset_expires_at (DATETIME, NULLABLE):
      * When reset token expires
      * Typically now + 1 hour
      * NULL = no reset in progress
    
    - created_at (DATETIME, server_default=NOW()):
      * User registration timestamp
      * Immutable
    
    - updated_at (DATETIME, server_default=NOW(), onupdate=NOW()):
      * Last profile update
      * Auto-updated on any change
    
    Relationships:
      - trips: 1-N (user -> multiple itineraries)
      - saved_places: 1-N (user -> saved places)
      - refresh_tokens: 1-N (user -> multiple tokens)
      - chat_sessions: 1-N (user -> chat history)
    
    Security Notes:
      - Password always hashed, never logged
      - Reset token stored as hash, raw token only sent via email
      - is_active can disable account without delete
      - Timestamps allow audit trail
    """

    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    interests: Mapped[list[str]] = mapped_column(JSON, default=list, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    password_reset_token_hash: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        index=True,
    )
    password_reset_expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    trips: Mapped[list["Trip"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    saved_places: Mapped[list["SavedPlace"]] = relationship(back_populates="user")
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    chat_sessions: Mapped[list["ChatSession"]] = relationship(back_populates="user")


class RefreshToken(Base):
    """Hashed refresh token used for server-side revoke/logout.
    
    Refresh Token Model - Quản lý refresh tokens và token rotation.
    
    Why hashed tokens?
      - DB breach won't leak raw tokens
      - Only token holder knows the raw value
      - Client stores raw token, server stores hash
    
    Columns:
    
    - id (INT, PK, auto-increment):
      * Primary key
    
    - user_id (INT, FK, INDEXED, CASCADE-DELETE):
      * Foreign key to users.id
      * Which user owns this token
      * ON DELETE CASCADE: delete tokens when user deleted
    
    - token_hash (VARCHAR 255, INDEXED):
      * SHA-256 hash of raw refresh token (64 hex chars)
      * Lookup: find_by_hash(token_hash)
      * Never store raw token in DB
      * Generate: hash = SHA-256(raw_token)
    
    - expires_at (DATETIME):
      * When token becomes invalid (typically now + 7 days)
      * Check: if now > expires_at -> reject token
      * Long TTL for refresh (vs short access token)
    
    - is_revoked (BOOLEAN, DEFAULT false):
      * Logout flag
      * When revoked: token can't be used again
      * Set to true on:
        * Token refresh (revoke old, create new pair)
        * User logout
        * User password reset (revoke all)
      * Prevents token reuse / replay attacks
    
    - created_at (DATETIME, server_default=NOW()):
      * When token was issued
      * Audit trail
    
    Relationships:
      - user: N-1 (many tokens -> one user)
    
    Token Rotation Security:
      1. User login -> create token pair
      2. Access token expires
      3. Client calls /refresh with refresh_token
      4. Server:
         a. Hash refresh_token
         b. Lookup in DB
         c. If is_revoked=true -> 401 (token reuse!)
         d. If is_revoked=false -> revoke old + create new pair
      5. Prevents token theft: attacker can only use token once
      6. Detects compromise: if old token reused -> security alert
    
    Database Queries:
      - find_by_hash(token_hash): SELECT * FROM refresh_tokens WHERE token_hash = ?
      - revoke(token_id): UPDATE refresh_tokens SET is_revoked=true WHERE id=?
      - revoke_all_for_user(user_id): UPDATE refresh_tokens SET is_revoked=true 
                                        WHERE user_id=? AND is_revoked=false
    """

    __tablename__ = "refresh_tokens"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    token_hash: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    is_revoked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    user: Mapped[User] = relationship(back_populates="refresh_tokens")
