"""Fix accommodation day_ids mismatch for AI-generated trips.

Bug #1: AI-generated accommodations have day_ids containing AI day numbers (1, 2, 3...)
instead of actual TripDay IDs (188, 189, 190...). This causes accommodation lookup to fail.

This migration remaps accommodation.day_ids from AI day_number to real TripDay.id.

Revision ID: 20260608_0006
Revises: 20260525_0005
Create Date: 2026-06-08 17:30:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy import text
from sqlalchemy.sql import table, column

# revision identifiers, used by Alembic.
revision: str = "20260608_0006"
down_revision: str | None = "20260525_0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Fix accommodation day_ids by remapping from day_number to TripDay ID."""

    # Get database connection
    connection = op.get_bind()

    # First, let's check how many accommodations are affected
    # Note: day_ids is JSON type, so we need to properly extract and compare values
    check_query = text("""
        SELECT COUNT(*)
        FROM accommodations a
        WHERE EXISTS (
            SELECT 1
            FROM trip_days td
            WHERE td.trip_id = a.trip_id
              AND td.day_number IN (
                  SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
              )
        )
    """)
    result = connection.execute(check_query)
    affected_count = result.scalar()

    print(f"Found {affected_count} accommodations to fix")

    if affected_count == 0:
        print("No accommodations need fixing - migration complete")
        return

    # Core fix logic: For each accommodation, remap day_ids from day_number to TripDay ID
    # This handles the case where day_ids contains [1, 2] but should be [188, 189]
    migration_query = text("""
        UPDATE accommodations a
        SET day_ids = (
            SELECT jsonb_agg(trip_day_id)
            FROM (
                SELECT td.id as trip_day_id
                FROM trip_days td
                WHERE td.trip_id = a.trip_id
                  AND td.day_number IN (
                      -- Extract day numbers from current day_ids JSON array
                      SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                  )
                ORDER BY td.day_number
            ) AS mapped_ids
        )
        WHERE a.day_ids IS NOT NULL
          AND a.day_ids::text != 'null'
          AND jsonb_array_length(a.day_ids::jsonb) > 0
          AND EXISTS (
              -- Only update if we have valid mappings
              SELECT 1
              FROM trip_days td
              WHERE td.trip_id = a.trip_id
                AND td.day_number IN (
                    SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                )
          )
    """)

    print("Executing migration query...")
    connection.execute(migration_query)
    print("Migration completed successfully")

    # Verification query - check if any accommodations still have invalid day_ids
    verify_query = text("""
        SELECT COUNT(*)
        FROM accommodations a
        WHERE a.day_ids IS NOT NULL
          AND a.day_ids::text != 'null'
          AND jsonb_array_length(a.day_ids::jsonb) > 0
          AND NOT EXISTS (
              SELECT 1
              FROM trip_days td
              WHERE td.id IN (
                  SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
              )
          )
    """)
    result = connection.execute(verify_query)
    broken_count = result.scalar()

    if broken_count > 0:
        print(f"WARNING: {broken_count} accommodations still have invalid day_ids after migration")
    else:
        print("All accommodations verified - day_ids correctly remapped")


def downgrade() -> None:
    """
    Rollback migration - restore original day_ids from day_number.

    WARNING: This rollback assumes the original data used day_number values.
    If some accommodations already had correct TripDay IDs, this will break them.
    Use with caution!
    """

    connection = op.get_bind()

    # To rollback, we need to remap from TripDay.id back to day_number
    # Note: This is a best-effort rollback and may not be 100% accurate
    # if some accommodations already had correct IDs before migration
    rollback_query = text("""
        UPDATE accommodations a
        SET day_ids = (
            SELECT jsonb_agg(day_number)
            FROM (
                SELECT td.day_number
                FROM trip_days td
                WHERE td.trip_id = a.trip_id
                  AND td.id IN (
                      SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                  )
                ORDER BY td.day_number
            ) AS day_numbers
        )
        WHERE a.day_ids IS NOT NULL
          AND a.day_ids::text != 'null'
          AND jsonb_array_length(a.day_ids::jsonb) > 0
    """)

    print("Executing rollback - this may not restore exact original state...")
    connection.execute(rollback_query)
    print("Rollback completed")
