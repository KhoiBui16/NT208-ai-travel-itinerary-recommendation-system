"""backfill activity images from linked places

Revision ID: 20260703_0014
Revises: 20260703_0013
Create Date: 2026-07-05

Generated itineraries store a *snapshot* of each activity's image at generation
time (``activities.image``). When a trip was generated before the place image
library existed (or while the linked place's image was still empty), the
activity row keeps an empty/NULL image forever — so Trip Workspace / Daily
Itinerary render the generic fallback even though the linked place now has a
real image.

This migration retroactively fills empty ``activities.image`` from the linked
place's current image via ``activities.place_id``. It is:

- SAFE: only touches activities whose image is NULL/empty (never overwrites a
  real snapshot), and only when the linked place actually has a non-empty image.
- IDEMPOTENT: re-running is a no-op once all empties are filled.
- PORTABLE: pure SQL, no Python, runs identically on local + Render.

Note: ``accommodations`` has no image column (hotel images are resolved live
via ``hotel_id`` from the ``hotels`` table at read time), so nothing to backfill
there.
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260703_0014"
down_revision: str | None = "20260703_0013"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        UPDATE activities a
        SET image = p.image
        FROM places p
        WHERE a.place_id = p.id
          AND p.image IS NOT NULL
          AND p.image <> ''
          AND (a.image IS NULL OR a.image = '')
        """
    )


def downgrade() -> None:
    # One-way data repair; the emptied snapshot images are not worth restoring.
    pass
