"""Refresh token data access repository.

Manages hashed refresh tokens in the refresh_tokens table.
Raw tokens are never stored — only SHA-256 hashes are persisted.
This allows safe token rotation and revocation without exposing
the actual token value if the DB is compromised.
"""

from datetime import datetime

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from src.models.user import RefreshToken


class RefreshTokenRepository:
    """Data access for RefreshToken table.

    Args:
        session: Async SQLAlchemy session injected via FastAPI Depends.
    """

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def find_by_hash(self, token_hash: str) -> RefreshToken | None:
        """Look up a refresh token by its SHA-256 hash.

        Args:
            token_hash: The hex digest of SHA-256(raw_token).

        Returns:
            RefreshToken instance or None if not found.
        """
        result = await self.session.execute(
            select(RefreshToken).where(RefreshToken.token_hash == token_hash)
        )
        return result.scalar_one_or_none()

    async def create(self, user_id: int, token_hash: str, expires_at: datetime) -> RefreshToken:
        """Persist a new refresh token hash.

        Args:
            user_id: Owner of the token.
            token_hash: SHA-256 hex digest of the raw token.
            expires_at: When the token becomes invalid.

        Returns:
            The newly created RefreshToken record.
        """
        token = RefreshToken(user_id=user_id, token_hash=token_hash, expires_at=expires_at)
        self.session.add(token)
        await self.session.flush()
        return token

    async def revoke(self, token_id: int) -> None:
        """Mark a single refresh token as revoked.

        Used during refresh rotation (revoke old, create new) and logout.

        Args:
            token_id: Primary key of the refresh_tokens row.
        """
        await self.session.execute(
            update(RefreshToken).where(RefreshToken.id == token_id).values(is_revoked=True)
        )
        await self.session.flush()

    async def revoke_all_for_user(self, user_id: int) -> None:
        """Revoke all active refresh tokens for a user.

        Can be used for "logout from all devices" functionality.

        Args:
            user_id: The user whose tokens should be revoked.
        """
        await self.session.execute(
            update(RefreshToken)
            .where(RefreshToken.user_id == user_id, RefreshToken.is_revoked == False)  # noqa: E712
            .values(is_revoked=True)
        )
        await self.session.flush()
