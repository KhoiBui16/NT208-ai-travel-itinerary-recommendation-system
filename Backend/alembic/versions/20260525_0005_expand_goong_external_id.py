"""Expand Goong external place id length.

Revision ID: 20260525_0005
Revises: 20260525_0004
Create Date: 2026-05-25 10:18:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260525_0005"
down_revision: str | None = "20260525_0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.alter_column(
        "places",
        "external_id",
        existing_type=sa.String(120),
        type_=sa.String(512),
        existing_nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "places",
        "external_id",
        existing_type=sa.String(512),
        type_=sa.String(120),
        existing_nullable=True,
    )
