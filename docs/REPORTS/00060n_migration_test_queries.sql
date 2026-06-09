-- Bug #1 Migration Test Queries
-- For testing migration 20260608_0006_fix_accommodation_day_ids.py
-- Run BEFORE and AFTER migration to verify correctness

-- ========================================
-- BEFORE MIGRATION TESTS
-- ========================================

-- Test 1: Count affected accommodations
SELECT 'BEFORE: Affected accommodations' as test_name,
       COUNT(*) as count
FROM accommodations a
WHERE EXISTS (
    SELECT 1
    FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(a.day_ids)
);
-- Expected: ~50 (number of AI-generated trips with accommodation)

-- Test 2: Check Trip 424 state (before)
SELECT 'BEFORE: Trip 424 state' as test_name,
       a.id as accommodation_id,
       a.name as accommodation_name,
       a.day_ids as current_day_ids,
       td.id as trip_day_id,
       td.day_number as day_number
FROM accommodations a
LEFT JOIN trip_days td ON td.trip_id = a.trip_id
WHERE a.trip_id = 424
ORDER BY a.id, td.day_number;
-- Expected: day_ids=[1], trip_day_id=[188,189], day_number=[1,2]

-- Test 3: Check accommodation-day mapping (before)
SELECT 'BEFORE: Accommodation-Day Mapping' as test_name,
       a.trip_id,
       a.id as accommodation_id,
       a.day_ids,
       EXISTS (
           SELECT 1 FROM trip_days td
           WHERE td.trip_id = a.trip_id
             AND td.id = ANY(a.day_ids)
       ) as has_valid_trip_day_ids
FROM accommodations a
WHERE a.trip_id = 424;
-- Expected: has_valid_trip_day_ids = false (day_ids contains [1], not [188])

-- Test 4: Sample broken accommodations
SELECT 'BEFORE: Sample broken accommodations' as test_name,
       a.id,
       a.name,
       a.day_ids,
       t.destination
FROM accommodations a
JOIN trips t ON t.id = a.trip_id
WHERE t.ai_generated = true
ORDER BY a.created_at DESC
LIMIT 5;
-- Expected: day_ids contains small integers [1,2,3...] instead of large IDs

-- ========================================
-- MIGRATION LOGIC TEST
-- ========================================

-- Test 5: Migration logic dry run (what would happen)
SELECT 'DRY RUN: Expected remapping for trip 424' as test_name,
       a.day_ids as original_day_ids,
       (
           SELECT jsonb_agg(trip_day_id)
           FROM (
               SELECT td.id as trip_day_id
               FROM trip_days td
               WHERE td.trip_id = a.trip_id
                 AND td.day_number = ANY(
                     SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                 )
               ORDER BY td.day_number
           ) AS mapped_ids
       ) as new_day_ids
FROM accommodations a
WHERE a.trip_id = 424;
-- Expected: original=[1], new=[188]

-- Test 6: Test remapping logic for multiple accommodations
SELECT 'DRY RUN: Test remapping for all accommodations' as test_name,
       a.id,
       a.day_ids as original,
       (
           SELECT jsonb_agg(trip_day_id)
           FROM (
               SELECT td.id as trip_day_id
               FROM trip_days td
               WHERE td.trip_id = a.trip_id
                 AND td.day_number = ANY(
                     SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                 )
               ORDER BY td.day_number
           ) AS mapped_ids
       ) as remapped
FROM accommodations a
WHERE EXISTS (
    SELECT 1
    FROM trip_days td
    WHERE td.trip_id = a.trip_id
      AND td.day_number = ANY(a.day_ids)
)
LIMIT 10;
-- Expected: All original values remapped to TripDay IDs

-- ========================================
-- AFTER MIGRATION TESTS
-- ========================================

-- Test 7: Count accommodations with invalid day_ids (should be 0)
SELECT 'AFTER: Broken accommodations' as test_name,
       COUNT(*) as count
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
-- Expected: 0 (all accommodations have valid TripDay IDs)

-- Test 8: Verify Trip 424 fixed
SELECT 'AFTER: Trip 424 state' as test_name,
       a.id as accommodation_id,
       a.name as accommodation_name,
       a.day_ids as current_day_ids,
       td.id as trip_day_id,
       td.day_number as day_number
FROM accommodations a
LEFT JOIN trip_days td ON td.trip_id = a.trip_id
WHERE a.trip_id = 424
ORDER BY a.id, td.day_number;
-- Expected: day_ids=[188] (TripDay ID, not [1])

-- Test 9: Verify accommodation-day mapping (after)
SELECT 'AFTER: Accommodation-Day Mapping' as test_name,
       a.trip_id,
       a.id as accommodation_id,
       a.day_ids,
       EXISTS (
           SELECT 1 FROM trip_days td
           WHERE td.trip_id = a.trip_id
             AND td.id = ANY(a.day_ids)
       ) as has_valid_trip_day_ids
FROM accommodations a
WHERE a.trip_id = 424;
-- Expected: has_valid_trip_day_ids = true (day_ids contains [188])

-- Test 10: Verify all AI-generated trips have valid accommodations
SELECT 'AFTER: AI-generated trips with valid accommodations' as test_name,
       t.id as trip_id,
       t.destination,
       COUNT(a.id) as accommodation_count,
       COUNT(CASE WHEN a.day_ids IS NOT NULL THEN 1 END) as with_day_ids,
       COUNT(CASE
           WHEN EXISTS (
               SELECT 1 FROM trip_days td
               WHERE td.trip_id = t.id AND td.id = ANY(a.day_ids)
           ) THEN 1
       END) as with_valid_day_ids
FROM trips t
LEFT JOIN accommodations a ON a.trip_id = t.id
WHERE t.ai_generated = true
GROUP BY t.id, t.destination
HAVING COUNT(a.id) > 0
ORDER BY t.created_at DESC
LIMIT 10;
-- Expected: All rows show with_valid_day_ids = accommodation_count

-- Test 11: Verify day_ids are actual TripDay IDs
SELECT 'AFTER: Verify day_ids are TripDay IDs' as test_name,
       COUNT(DISTINCT a.id) as accommodations_checked,
       COUNT(DISTINCT td.id) as valid_trip_day_ids,
       COUNT(DISTINCT td.id) = COUNT(DISTINCT a.id) as all_valid
FROM accommodations a
JOIN unnest(a.day_ids) AS accommodation_day_id ON true
LEFT JOIN trip_days td ON td.id = accommodation_day_id
WHERE a.day_ids IS NOT NULL;
-- Expected: all_valid = true

-- ========================================
-- COMPREHENSIVE VERIFICATION
-- ========================================

-- Test 12: Full migration verification
SELECT 'COMPREHENSIVE: Migration Verification Summary' as test_name,
       (SELECT COUNT(*) FROM trips WHERE ai_generated = true) as total_ai_trips,
       (SELECT COUNT(*) FROM accommodations) as total_accommodations,
       (SELECT COUNT(*) FROM accommodations WHERE day_ids IS NOT NULL) as with_day_ids,
       (SELECT COUNT(*) FROM accommodations a
        WHERE EXISTS (
            SELECT 1 FROM trip_days td
            WHERE td.trip_id = a.trip_id AND td.id = ANY(a.day_ids)
        )
       ) as with_valid_day_ids,
       (SELECT COUNT(*) FROM accommodations a
        WHERE a.day_ids IS NOT NULL
          AND NOT EXISTS (
              SELECT 1 FROM trip_days td
              WHERE td.trip_id = a.trip_id AND td.id = ANY(a.day_ids)
          )
       ) as broken_accommodations;
-- Expected: broken_accommodations = 0

-- Test 13: Sample 5 random accommodations to verify
SELECT 'SAMPLE: Random accommodation verification' as test_name,
       a.id,
       a.name,
       a.day_ids,
       string_agg(td.day_number::text, ',' ORDER BY td.day_number) as day_numbers_for_trip_days,
       CASE
           WHEN EXISTS (
               SELECT 1 FROM trip_days td
               WHERE td.trip_id = a.trip_id AND td.id = ANY(a.day_ids)
           ) THEN 'VALID'
           ELSE 'BROKEN'
       END as status
FROM accommodations a
LEFT JOIN trip_days td ON td.trip_id = a.trip_id AND td.id = ANY(a.day_ids)
WHERE a.day_ids IS NOT NULL
GROUP BY a.id, a.name, a.day_ids
ORDER BY random()
LIMIT 5;
-- Expected: All status = 'VALID'

-- ========================================
-- ROLLBACK TEST (if needed)
-- ========================================

-- Test 14: Verify rollback would work (dry run)
SELECT 'ROLLBACK TEST: Verify rollback logic' as test_name,
       a.id,
       a.day_ids as current_state,
       (
           SELECT jsonb_agg(day_number)
           FROM (
               SELECT td.day_number
               FROM trip_days td
               WHERE td.trip_id = a.trip_id
                 AND td.id = ANY(
                     SELECT (jsonb_array_elements_text(a.day_ids::jsonb))::int
                 )
               ORDER BY td.day_number
           ) AS day_numbers
       ) as rolled_back_state
FROM accommodations a
WHERE a.trip_id = 424;
-- Expected: current_state=[188], rolled_back_state=[1]