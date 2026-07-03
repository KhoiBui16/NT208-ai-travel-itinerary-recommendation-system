"""merge vinh ha long into ha long

Revision ID: 20260703_0010
Revises: 20260622_0009
Create Date: 2026-07-03

Merges the sparse ``vinh-ha-long`` destination into the canonical ``ha-long``
destination. "Vịnh Hạ Long" is the bay *inside* the city of Hạ Long and is
already modelled as places under ``ha-long`` (e.g. place id 1290 "Vịnh Hạ
Long"), so keeping it as a peer top-level destination duplicated the taxonomy
and produced a sparse, noisy destination (5 places, 1 hotel) next to the rich
``ha-long`` destination (81 places, 1 hotel).

Safety (verified on the live schema before writing this migration):
- The only FK columns referencing ``destinations`` are ``places.destination_id``
  and ``hotels.destination_id`` (information_schema). No trip / trip_day /
  accommodation row references the destination directly.
- No name collision: none of the 5 ``vinh-ha-long`` place names match a
  ``ha-long`` place name, and the single ``vinh-ha-long`` hotel name does not
  match ``ha-long``'s hotel — so the reassign cannot violate
  ``uq_places_name_dest`` or hotel uniqueness.
- Idempotent: a no-op when ``vinh-ha-long`` is absent (e.g. a fresh CI database
  seeded from the cleaned config that no longer lists it).

Downgrade is best-effort: it re-creates an *empty* ``vinh-ha-long`` destination
row but cannot un-merge the reassigned places/hotels (the merge is intentional
and one-way).
"""

from collections.abc import Sequence

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "20260703_0010"
down_revision: str | None = "20260622_0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Reassign vinh-ha-long places/hotels to ha-long, then drop the destination."""
    op.execute(
        """
        UPDATE places
        SET destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        WHERE destination_id = (SELECT id FROM destinations WHERE slug = 'vinh-ha-long')
        """
    )
    op.execute(
        """
        UPDATE hotels
        SET destination_id = (SELECT id FROM destinations WHERE slug = 'ha-long')
        WHERE destination_id = (SELECT id FROM destinations WHERE slug = 'vinh-ha-long')
        """
    )
    op.execute("DELETE FROM destinations WHERE slug = 'vinh-ha-long'")
    # The reassign moved vinh-ha-long's places into ha-long, so ha-long's cached
    # ``destinations.places_count`` is now stale. Recompute it to the live count
    # so destination list/sort UI and place tallies stay correct. Idempotent and
    # a no-op when nothing was reassigned (fresh CI DB without vinh-ha-long).
    op.execute(
        """
        UPDATE destinations
        SET places_count = (
            SELECT COUNT(*)
            FROM places
            WHERE places.destination_id = destinations.id
        )
        WHERE slug = 'ha-long'
        """
    )


def downgrade() -> None:
    """Best-effort: re-create an empty (inactive) vinh-ha-long destination row.

    All NOT NULL no-default columns (name, slug, description, image, is_active,
    places_count) are populated with safe defaults so the INSERT succeeds
    against the current schema. Reassigned places/hotels are NOT moved back —
    the merge is intentionally one-way, so the recreated row stays empty and
    inactive (places_count = 0, is_active = false).
    """
    op.execute(
        """
        INSERT INTO destinations (slug, name, description, image, is_active, places_count)
        SELECT
            'vinh-ha-long',
            'Vịnh Hạ Long',
            'Vịnh Hạ Long (đã hợp nhất vào Hạ Long)',
            '/img/destinations/vinh-ha-long.jpg',
            false,
            0
        WHERE NOT EXISTS (SELECT 1 FROM destinations WHERE slug = 'vinh-ha-long')
        """
    )
