"""add chat message confirmation fields

Revision ID: 20260621_0008
Revises: 20260609_0007
Create Date: 2026-06-21

Adds persistent confirmation metadata so C3C can:
- apply/cancel assistant proposals by `assistantMessageId`
- reject stale proposals against the trip revision snapshot
- hide already-resolved proposals after reload
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "20260621_0008"
down_revision: str | None = "20260609_0007"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add confirmation lifecycle columns for persisted assistant messages."""
    op.add_column(
        "chat_messages",
        sa.Column(
            "confirmation_status",
            sa.String(length=20),
            nullable=False,
            server_default="not_required",
        ),
    )
    op.add_column(
        "chat_messages",
        sa.Column("trip_snapshot_updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "chat_messages",
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
    )


def downgrade() -> None:
    """Remove confirmation lifecycle columns from chat_messages."""
    op.drop_column("chat_messages", "resolved_at")
    op.drop_column("chat_messages", "trip_snapshot_updated_at")
    op.drop_column("chat_messages", "confirmation_status")
