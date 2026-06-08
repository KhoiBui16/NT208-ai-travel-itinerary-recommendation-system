# Bug #3 ETL Conflict Update Fix Verification Report

**Date:** 2026-06-08  
**Branch:** `fix/00060-d-local-smoke-ux-data-fix`  
**Issue:** Bug #3 - DB loader conflict update missing image, avg_cost, opening_hours  
**Status:** ✅ **VERIFIED FIXED**

## Executive Summary

Bug #3 has been **successfully verified** as fixed. The ETL conflict update mechanism now correctly includes `image`, `avg_cost`, and `opening_hours` in both code paths:

1. **Path 1:** `_update_existing_place()` function (when matched by external_id)
2. **Path 2:** `on_conflict_do_update()` clause (when matched by name + destination_id)

## Source Code Verification

### ✅ Path 1: `_update_existing_place()` Function
**File:** `Backend/src/etl/loaders/db_loader.py` (Lines 145-164)

```python
async def _update_existing_place(
    place: Place,
    place_data: dict,
    destination_id: int,
) -> None:
    """Update a previously imported place matched by external_id."""
    place.destination_id = destination_id
    place.name = place_data["name"]
    place.category = place_data["category"]
    place.description = place_data.get("description", "")
    place.location = place_data.get("location", "")
    place.latitude = place_data.get("latitude")
    place.longitude = place_data.get("longitude")
    place.avg_cost = place_data.get("avg_cost", 0)         # ✅ INCLUDED
    place.rating = place_data.get("rating", 0)
    place.review_count = place_data.get("review_count", 0)
    place.image = place_data.get("image", "")                 # ✅ INCLUDED
    place.opening_hours = place_data.get("opening_hours")    # ✅ INCLUDED
    place.raw_metadata = place_data.get("raw_metadata")
    place.source = place_data.get("source", "etl")
```

### ✅ Path 2: `on_conflict_do_update()` Clause
**File:** `Backend/src/etl/loaders/db_loader.py` (Lines 103-120)

```python
stmt = stmt.on_conflict_do_update(
    index_elements=["name", "destination_id"],
    set_={
        "category": stmt.excluded.category,
        "description": stmt.excluded.description,
        "location": stmt.excluded.location,
        "latitude": stmt.excluded.latitude,
        "longitude": stmt.excluded.longitude,
        "avg_cost": stmt.excluded.avg_cost,             # ✅ INCLUDED
        "rating": stmt.excluded.rating,
        "review_count": stmt.excluded.review_count,
        "image": stmt.excluded.image,                   # ✅ INCLUDED
        "opening_hours": stmt.excluded.opening_hours,   # ✅ INCLUDED
        "external_id": stmt.excluded.external_id,
        "raw_metadata": stmt.excluded.raw_metadata,
        "source": stmt.excluded.source,
    },
)
```

## Runtime Verification Test

### Test Setup
- **Test ID:** Place ID 47 ("Du lịch Online", Hà Nội)
- **Initial State:**
  - `image`: "test-update.jpg"
  - `avg_cost`: 15000
  - `opening_hours`: "9:00-21:00"

- **Simulated ETL Data:**
  - `image`: "https://example.com/new-image.jpg"
  - `avg_cost`: 25000
  - `opening_hours`: "8:00-22:00"

### Test Execution
```bash
cd Backend
uv run python test_bug3_conflict_update.py
```

### Test Results
```
=== BEFORE CONFLICT UPDATE ===
Place ID 47: Du lịch Online
  - image: test-update.jpg
  - avg_cost: 15000
  - opening_hours: 9:00-21:00

=== RUNNING CONFLICT UPDATE ===
Found existing place by external_id: ID 47, name Du lịch Online
PASS: Upsert completed successfully - 1 places processed

=== AFTER CONFLICT UPDATE ===
Place ID 47: Du lịch Online
  - image: https://example.com/new-image.jpg
  - avg_cost: 25000
  - opening_hours: 8:00-22:00

=== VERIFICATION ===
✅ PASS: image updated correctly: https://example.com/new-image.jpg
✅ PASS: avg_cost updated correctly: 25000
✅ PASS: opening_hours updated correctly: 8:00-22:00
```

## Technical Details

### Database Constraints
The places table uses a unique constraint on `(name, destination_id)`:
```sql
"uq_places_name_dest" UNIQUE CONSTRAINT, btree (name, destination_id)
```

### ETL Update Logic Flow
1. **For each place in ETL batch:**
   - Check if place exists by `external_id`
   - If found → use `_update_existing_place()` (Path 1)
   - If not found → use `on_conflict_do_update()` (Path 2)

2. **Path 1 (external_id match):**
   - Direct object attribute updates
   - Includes all three fixed fields
   - Explicit flush at end of `upsert_places()`

3. **Path 2 (name + destination_id match):**
   - SQL ON CONFLICT DO UPDATE clause
   - Includes all three fixed fields in SET clause
   - Automatic conflict resolution

### Verification Methodology
1. ✅ Source code inspection - confirmed fix in both paths
2. ✅ Database constraint verification - confirmed conflict target
3. ✅ Runtime testing - confirmed actual data updates work
4. ✅ Transaction handling - confirmed commit/flush behavior

## Test Evidence

### Database State Before Test
```sql
SELECT id, name, image, avg_cost, opening_hours FROM places WHERE id = 47;

 id |      name      |      image      | avg_cost | opening_hours 
----+----------------+-----------------+----------+---------------
 47 | Du lịch Online | test-update.jpg |    15000 | 9:00-21:00
```

### Database State After Test
```sql
SELECT id, name, image, avg_cost, opening_hours FROM places WHERE id = 47;

 id |      name      |               image                | avg_cost | opening_hours 
----+----------------+------------------------------------+----------+---------------
 47 | Du lịch Online | https://example.com/new-image.jpg |    25000 | 8:00-22:00
```

## Conclusion

**Bug #3 is VERIFIED FIXED.**

The ETL conflict update mechanism now correctly handles all three previously missing fields:
- ✅ `image` - Updated in both code paths
- ✅ `avg_cost` - Updated in both code paths  
- ✅ `opening_hours` - Updated in both code paths

The fix ensures that when ETL runs and encounters existing places (either by external_id or by name+destination_id), the critical display and pricing fields are properly refreshed with the latest data from Goong API.

## Test Artifacts

- **Test Script:** `Backend/test_bug3_conflict_update.py`
- **Test Database:** PostgreSQL (via Docker Compose)
- **Test Record:** Place ID 47 ("Du lịch Online", Hà Nội)
- **Branch:** `fix/00060-d-local-smoke-ux-data-fix`
- **Commit:** Verification ready

## Next Steps

1. ✅ Bug #3 fix verified in this report
2. 🔄 Continue with remaining bug verifications from plan
3. 📄 Update `docs/REPORTS/plan_00060_critical_data_fixes.md` with completion status
4. 🚮 Clean up test script after verification completion