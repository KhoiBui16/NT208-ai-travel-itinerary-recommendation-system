-- Test SQL Queries for Bug #1 Migration (Accommodation day_ids Fix)
-- Target Trip: 424
-- Purpose: Verify migration works correctly before/after applying fix

-- ================================================================================
-- BEFORE MIGRATION - Current State Analysis
-- ================================================================================

-- Query 1: Check Trip 424 - TripDay IDs and day_numbers
SELECT td.id as trip_day_id,
       td.day_number,
       td.label,
       td.date
FROM trip_days td
WHERE td.trip_id = 424
ORDER BY td.day_number;

-- Expected Result (before migration):
-- trip_day_id | day_number |               label               |    date
-- -------------+------------+-----------------------------------+------------
--          188 |          1 | Hanoi Old Quarter & History      | 2025-06-15
--          189 |          2 | Imperial Citadel & Local Delights| 2025-06-16

-- Query 2: Check Trip 424 - Accommodation day_ids (BROKEN)
SELECT a.id,
       a.name,
       a.day_ids,
       a.check_in,
       a.check_out
FROM accommodations a
WHERE a.trip_id = 424;

-- Expected Result (before migration):
-- id  |           name            | day_ids | check_in  | check_out
-- ----+---------------------------+---------+-----------+-----------
--  88 | La Siesta Premium Hang Be| [1]     | 2025-06-15| 2025-06-16
--                                                                ^^^^ BUG: Should be [188] not [1]

-- Query 3: Verify the corruption pattern (day_ids contains day_number, not trip_day_id)
SELECT a.trip_id,
       a.name,
       a.day_ids as current_day_ids,
       td.id as expected_day_id,
       td.day_number
FROM accommodations a
JOIN trip_days td ON td.trip_id = a.trip_id
WHERE a.trip_id = 424
  AND td.day_number = ANY(
      SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
  );

-- Expected Result (before migration):
-- This shows the mismatch - day_ids contains [1] but should be [188]

-- Query 4: Count all affected accommodations across all trips
SELECT COUNT(*) as total_corrupted_accommodations
FROM accommodations a
WHERE EXISTS (
    SELECT 1
    FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(
          SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
      )
);

-- Expected: ~50+ accommodations affected

-- Query 5: List all affected trips with corruption details
SELECT DISTINCT
    t.id as trip_id,
    t.destination,
    t.created_at,
    COUNT(DISTINCT a.id) as corrupted_accommodations,
    array_agg(DISTINCT a.name) as affected_hotels
FROM trips t
JOIN accommodations a ON a.trip_id = t.id
WHERE EXISTS (
    SELECT 1
    FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(
          SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
      )
)
GROUP BY t.id, t.destination, t.created_at
ORDER BY t.created_at DESC
LIMIT 10;

-- ================================================================================
-- APPLY MIGRATION
-- ================================================================================

-- Run this command in terminal (NOT in SQL client):
-- cd Backend
-- uv run alembic upgrade head

-- ================================================================================
-- AFTER MIGRATION - Verification Queries
-- ================================================================================

-- Query 6: Check Trip 424 - Accommodation day_ids (FIXED)
SELECT a.id,
       a.name,
       a.day_ids,
       a.check_in,
       a.check_out
FROM accommodations a
WHERE a.trip_id = 424;

-- Expected Result (after migration):
-- id  |           name            | day_ids | check_in  | check_out
-- ----+---------------------------+---------+-----------+-----------
--  88 | La Siesta Premium Hang Be| [188]   | 2025-06-15| 2025-06-16
--                                                                ^^^^ FIXED: Now contains actual TripDay ID

-- Query 7: Verify the fix - day_ids now contains actual TripDay IDs
SELECT a.trip_id,
       a.name,
       a.day_ids as fixed_day_ids,
       td.id as trip_day_id,
       td.day_number,
       CASE
         WHEN td.id = ANY(
             SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
         ) THEN 'CORRECT'
         ELSE 'STILL BROKEN'
       END as verification_status
FROM accommodations a
JOIN trip_days td ON td.trip_id = a.trip_id
WHERE a.trip_id = 424
ORDER BY td.day_number;

-- Expected Result (after migration):
-- All rows should show 'CORRECT' status

-- Query 8: Verify no accommodations still have invalid day_ids
SELECT COUNT(*) as remaining_broken_accommodations
FROM accommodations a
WHERE a.day_ids IS NOT NULL
  AND a.day_ids::jsonb != 'null'::jsonb
  AND NOT EXISTS (
      SELECT 1
      FROM trip_days td
      WHERE td.id = ANY(
          SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
      )
  );

-- Expected Result: 0 (no broken accommodations remaining)

-- Query 9: Final verification - Trip 424 complete check
SELECT 'TripDays' as table_name,
       jsonb_agg(
           jsonb_build_object(
               'id', td.id,
               'day_number', td.day_number,
               'label', td.label
           ) ORDER BY td.day_number
       ) as data
FROM trip_days td
WHERE td.trip_id = 424

UNION ALL

SELECT 'Accommodations' as table_name,
       jsonb_agg(
           jsonb_build_object(
               'id', a.id,
               'name', a.name,
               'day_ids', a.day_ids
           )
       ) as data
FROM accommodations a
WHERE a.trip_id = 424;

-- This shows the complete state after migration - day_ids should match TripDay IDs

-- ================================================================================
-- EDGE CASES TESTS
-- ================================================================================

-- Query 10: Test multi-day accommodation (day_ids = [1, 2] should become [188, 189])
SELECT a.id,
       a.name,
       a.day_ids,
       jsonb_array_length(a.day_ids::jsonb) as number_of_days
FROM accommodations a
WHERE jsonb_array_length(a.day_ids::jsonb) > 1
LIMIT 5;

-- After migration, these should have multiple correct TripDay IDs

-- Query 11: Verify accommodation with NULL day_ids (should not be affected)
SELECT COUNT(*) as accommodations_with_null_day_ids
FROM accommodations a
WHERE a.day_ids IS NULL OR a.day_ids::jsonb = 'null'::jsonb;

-- These should remain NULL after migration

-- Query 12: Check for any orphaned accommodations (no matching TripDays)
SELECT a.id, a.name, a.trip_id, a.day_ids
FROM accommodations a
WHERE NOT EXISTS (
    SELECT 1
    FROM trip_days td
    WHERE td.id = ANY(
        SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
    )
)
AND a.day_ids IS NOT NULL
AND a.day_ids::jsonb != 'null'::jsonb;

-- Expected: 0 rows after migration

-- ================================================================================
-- ROLLBACK TEST (if needed)
-- ================================================================================

-- Query 13: Before rollback - save current state for comparison
CREATE TEMP TABLE pre_rollback_state AS
SELECT a.id, a.name, a.day_ids as current_day_ids
FROM accommodations a
WHERE a.trip_id = 424;

-- Run rollback (in terminal):
-- uv run alembic downgrade -1

-- Query 14: After rollback - compare with pre-rollback state
SELECT a.id, a.name, a.day_ids as rolled_back_day_ids,
       pre.current_day_ids as original_day_ids,
       CASE
         WHEN a.day_ids = pre.current_day_ids THEN 'ROLLBACK SUCCESSFUL'
         ELSE 'ROLLBACK MISMATCH'
       END as rollback_status
FROM accommodations a
JOIN pre_rollback_state pre ON pre.id = a.id
WHERE a.trip_id = 424;

-- Note: Rollback may not be 100% accurate if some accommodations already had
-- correct TripDay IDs before the migration
