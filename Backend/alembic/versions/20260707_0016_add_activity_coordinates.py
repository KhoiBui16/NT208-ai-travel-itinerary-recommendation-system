"""add standalone activity coordinates

Revision ID: 20260707_0016
Revises: 20260705_0015
Create Date: 2026-07-07

Store coordinates directly on manually added activities. Generated activities
can still use their linked place coordinates through place_id.
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "20260707_0016"
down_revision: str | None = "20260705_0015"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("activities", sa.Column("latitude", sa.Float(), nullable=True))
    op.add_column("activities", sa.Column("longitude", sa.Float(), nullable=True))


def downgrade() -> None:
    op.drop_column("activities", "longitude")
    op.drop_column("activities", "latitude")
