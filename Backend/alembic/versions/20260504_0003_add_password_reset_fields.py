"""Add password reset token fields to users table.

Revision ID: 20260504_0003
Revises: 20260502_0002
Create Date: 2026-05-04
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260504_0003"
down_revision: str | None = "20260502_0002"
branch_labels: str | Sequence[str] = None
depends_on: str | Sequence[str] = None


def upgrade() -> None:
    """Add password_reset_token_hash and password_reset_expires_at to users."""
    op.add_column(
        "users",
        sa.Column("password_reset_token_hash", sa.String(255), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column(
            "password_reset_expires_at",
            sa.DateTime(timezone=True),
            nullable=True,
        ),
    )
    op.create_index(
        "ix_users_password_reset_token_hash",
        "users",
        ["password_reset_token_hash"],
        unique=False,
    )


def downgrade() -> None:
    """Remove password reset fields from users."""
    op.drop_index("ix_users_password_reset_token_hash", table_name="users")
    op.drop_column("users", "password_reset_expires_at")
    op.drop_column("users", "password_reset_token_hash")
