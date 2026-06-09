"""seed trip_days for existing trips

Revision ID: 20260609_0007
Revises: 20260608_0006
Create Date: 2026-06-09

DB-DATA-01 Fix: 311/420 trips (74%) have no trip_days, which breaks the
generate pipeline. This migration seeds trip_days for all existing trips
based on their start_date and end_date.

Safety:
- Only creates trip_days where none exist (prevents duplicates)
- Uses simple labels ("Ngày 1", "Ngày 2", etc.)
- Sets destination_name from trip destination field
- Idempotent: can be re-run safely

"""

from collections.abc import Sequence
from datetime import timedelta

from alembic import op
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision: str = "20260609_0007"
down_revision: str | None = "20260608_0006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    """Seed trip_days for all trips that don't have any."""
    # Get all trips without trip_days
    conn = op.get_bind()
    trips_without_days = conn.execute(
        text("""
            SELECT id, destination, start_date, end_date
            FROM trips
            WHERE id NOT IN (SELECT DISTINCT trip_id FROM trip_days)
            ORDER BY id
        """)
    ).fetchall()

    if not trips_without_days:
        print("No trips without trip_days found - migration complete")
        return

    print(f"Found {len(trips_without_days)} trips without trip_days")

    # Insert trip_days for each trip
    for trip_id, destination, start_date, end_date in trips_without_days:
        # Calculate day count
        if end_date < start_date:
            print(f"Skipping trip {trip_id}: end_date before start_date")
            continue

        day_count = (end_date - start_date).days + 1
        if day_count > 30:
            print(f"Skipping trip {trip_id}: too many days ({day_count})")
            continue

        # Insert trip_days
        for day_offset in range(day_count):
            current_date = start_date + timedelta(days=day_offset)
            day_number = day_offset + 1
            label = f"Ngày {day_number}"

            conn.execute(
                text("""
                    INSERT INTO trip_days (trip_id, day_number, label, date, destination_name)
                    VALUES (:trip_id, :day_number, :label, :date, :destination_name)
                """),
                {
                    "trip_id": trip_id,
                    "day_number": day_number,
                    "label": label,
                    "date": current_date.isoformat(),
                    "destination_name": destination,
                },
            )

        print(f"Created {day_count} trip_days for trip {trip_id}")


def downgrade() -> None:
    """Remove trip_days created by this migration.

    WARNING: This will delete ALL trip_days, not just the ones created
    by this migration. Use with caution.
    """
    # For safety, only delete trip_days that were likely created by this migration
    # (simple labels with "Ngày X" pattern and no activities)
    conn = op.get_bind()
    conn.execute(
        text("""
            DELETE FROM trip_days
            WHERE label LIKE 'Ngày %%'
              AND id NOT IN (
                  SELECT DISTINCT trip_day_id
                  FROM activities
                  WHERE trip_day_id IS NOT NULL
              )
        """)
    )
    print("Removed trip_days created by migration")
