"""add chat session title

Revision ID: 20260622_0009
Revises: 20260621_0008
Create Date: 2026-06-22

Adds nullable ``title`` column to ``chat_sessions`` so users can rename sessions
in C4 history-management UX. Nullable để không phá các session hiện có (FE dùng
fallback khi ``title`` IS NULL).
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260622_0009"
down_revision: str | None = "20260621_0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add title column to chat_sessions."""
    op.add_column(
        "chat_sessions",
        sa.Column("title", sa.String(length=200), nullable=True),
    )


def downgrade() -> None:
    """Remove title column from chat_sessions."""
    op.drop_column("chat_sessions", "title")
