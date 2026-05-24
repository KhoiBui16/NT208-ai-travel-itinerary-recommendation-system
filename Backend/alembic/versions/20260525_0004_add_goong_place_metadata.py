"""Add Goong metadata fields to places.

Revision ID: 20260525_0004
Revises: 20260504_0003
Create Date: 2026-05-25
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260525_0004"
down_revision: str | None = "20260504_0003"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add external source identifier and sanitized raw metadata."""
    op.add_column("places", sa.Column("external_id", sa.String(120), nullable=True))
    op.add_column("places", sa.Column("raw_metadata", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.create_index("ix_places_external_id", "places", ["external_id"], unique=False)


def downgrade() -> None:
    """Remove Goong metadata fields from places."""
    op.drop_index("ix_places_external_id", table_name="places")
    op.drop_column("places", "raw_metadata")
    op.drop_column("places", "external_id")
