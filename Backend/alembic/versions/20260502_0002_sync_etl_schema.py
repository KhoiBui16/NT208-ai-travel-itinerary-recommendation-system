"""Sync ETL schema with ORM models.

Revision ID: 20260502_0002
Revises: 20260428_0001
Create Date: 2026-05-02
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260502_0002"
down_revision: str | None = "20260428_0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Add ETL tracking table and conflict keys used by ETL upserts."""
    op.create_table(
        "scraped_sources",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("source_name", sa.String(100), nullable=False),
        sa.Column("city", sa.String(100), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column(
            "last_crawled",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("items_count", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    )
    op.create_unique_constraint("uq_places_name_dest", "places", ["name", "destination_id"])
    op.create_unique_constraint("uq_hotels_name_dest", "hotels", ["name", "destination_id"])


def downgrade() -> None:
    """Remove ETL schema additions."""
    op.drop_constraint("uq_hotels_name_dest", "hotels", type_="unique")
    op.drop_constraint("uq_places_name_dest", "places", type_="unique")
    op.drop_table("scraped_sources")
