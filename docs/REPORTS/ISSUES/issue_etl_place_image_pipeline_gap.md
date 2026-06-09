# Issue: ETL place image pipeline is incomplete and reruns cannot fully repair existing rows

Date: 2026-06-07
Updated: 2026-06-08
Severity: Medium
Area: Backend ETL, DB data quality, Frontend image rendering
Status: **PARTIALLY RESOLVED** - Conflict update fixed (Bug #3), but image source is API limitation (Bug #2)

## Resolution Summary

### ✅ FIXED: Conflict update refresh (Bug #3)
- **Commit:** `a1ca485`
- **File:** `Backend/src/etl/loaders/db_loader.py:105-119`
- **Fix:** Added `image`, `avg_cost`, `opening_hours` to ON CONFLICT DO UPDATE branch
- **Impact:** ETL reruns can now repair existing rows when image source data becomes available

### ⏸️ AWAITING DECISION: Image source strategy (Bug #2)
- **Root cause:** Goong API does NOT provide `photos`/`images` field
- **Current state:** 725/725 places have `image = ''` (expected - API limitation)
- **ETL pipeline:** ✅ Working correctly with available data
- **Required action:** User decision on image strategy
  - **Option B:** External API (Unsplash/Pexels) - High effort (8-12 hours)
  - **Option C:** Admin Panel + Manual Curation - Medium effort (4-6 hours)
  - **Option D:** Accept current state - Zero effort

See `docs/REPORTS/ISSUES/plan_00060_critical_data_fixes.md` for detailed options.

## Summary

Place image data is currently broken in two layers:

- the normalized ETL place data still carries empty image values
- the DB upsert path does not refresh `image`, `avg_cost`, or `opening_hours` for existing rows in the conflict-update branch

This explains why the frontend keeps falling back to generic images and why later ETL reruns cannot reliably heal already-imported place rows.

## Confirmed symptoms

- Live `GET /api/v1/places/search?city=Hà Nội&limit=3` returned places with `image: ""`.
- `Frontend/src/app/utils/placeImage.ts` documents that all `618` place rows currently have empty image values.
- Generated AI itinerary activities also came back with empty image fields because they inherit from place data when a real image exists.
- Live DB verification on `2026-06-07` confirmed:
  - `places`: `618/618` rows have empty `image`
  - `destinations`: `10/10` rows use relative `/img/...` image paths instead of source-backed media URLs
  - `Hà Nội` still uses the malformed path `/img/destinations/ha-n-i.jpg`
- A live browser generate on `2026-06-07` produced trip `424`; DB verification then showed `10/10` generated activities for that trip still had blank image values.

## Source evidence

- `Backend/src/etl/transformers/place_transformer.py`
  - current normalization path still produces empty `image` values for imported places
- `Backend/src/etl/loaders/db_loader.py`
  - initial insert writes `image`
  - conflict update does not refresh:
    - `image`
    - `avg_cost`
    - `opening_hours`

## Branch and PR scope check

- Verified against both `origin/main` and the current PR head branch `fix/00060-d-local-smoke-ux-data-fix` (PR `#85`).
- PR `#85` adds frontend image fallbacks, but it does not repair the ETL/data layer that produces or preserves empty place images.
- The core backend/data issue therefore persists on both `main` and PR `#85`.

## Impact

- Search/list/detail screens cannot show source-backed place photos.
- AI-generated itinerary activities persist empty image fields.
- The frontend must rely on category or destination fallbacks instead of real place media.
- Later ETL reruns cannot fully repair old rows unless rows are deleted first or manually patched.
- Destination cards may look usable only because frontend fallbacks hide the broken or relative image strategy.

## Fix direction

1. Decide the real place-photo source strategy.
2. Update `place_transformer.py` so normalized place data carries usable image values whenever upstream data provides them.
3. Update `db_loader.py` conflict-update branch to refresh at least:
   - `image`
   - `avg_cost`
   - `opening_hours`
4. Run a repair/backfill ETL for already imported destinations.
5. Invalidate destination/place caches after the repair.
6. Add tests for:
   - ETL transformer preserving image values
   - conflict-update refreshing image fields
   - generated activity image propagation from repaired place rows

## Suggested acceptance criteria

- New ETL runs persist non-empty place images when upstream data provides them.
- Existing rows are repaired by rerun, not only by first insert.
- `GET /api/v1/places/search` returns non-empty image values for at least a verified sample set.
- Destination image fields are either verified absolute/served asset URLs or an explicitly supported local asset strategy, not malformed placeholders.
- AI-generated itinerary activities show real images when they reference known places.
