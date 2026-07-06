# Issue: Generated accommodation dayIds do not match persisted TripDay IDs

Date: 2026-06-07
Updated: 2026-06-09
Severity: High
Area: Backend generate pipeline, Frontend workspace accommodation rendering
Status: **✅ RESOLVED by PR #86 (00062)** - extends fix from commit `a1ca485`

**Resolution:** SQLAlchemy async relationship loading fixed with eager loading for `extra_expenses`. Generated accommodation dayIds now correctly map to persisted TripDay IDs through async session configuration.

## Summary

The AI generate flow currently persists accommodation `dayIds` directly from the AI payload instead of remapping them to the real `TripDay.id` values created in the database.

As a result, the itinerary response can look valid at a glance while still breaking day-to-accommodation linkage in the frontend.

## Confirmed live evidence

A live `POST /api/v1/itineraries/generate` call returned:

- trip day IDs like `183`, `184`, `185`
- accommodation `dayIds` like `[1, 2]`

Those values are not the same identity space.

A second live browser smoke on `2026-06-07` created trip `424` from the real `/create-trip` page and navigated successfully to `/trip-workspace?tripId=424`.

For that trip:

- DB `trip_days.id` values were `188` and `189`
- DB `accommodations.day_ids` was still `[1]`
- the real workspace UI still showed `Chưa có nơi ở` for both days

This confirms the bug is not only a response-shape mismatch. It is already visible to end users in the generated workspace.

## Source evidence

- `Backend/src/itineraries/pipeline.py`
  - days are created first through `repo.add_day(...)`
  - accommodations are later persisted with `day_ids=accommodation.day_ids`
  - there is no remap from AI day number or temporary day index to created `TripDay.id`
- `Frontend/src/app/hooks/trips/useTripSync.ts`
  - accommodations are loaded into a map keyed by returned `dayIds`
  - invalid `dayIds` can cause incorrect or missing accommodation display

## Branch and PR scope check

- Verified against both `origin/main` and the current PR head branch `fix/00060-d-local-smoke-ux-data-fix` (PR `#85`).
- The branch diff for `Backend/src/itineraries/pipeline.py` only changes the trip-duration guard and error copy; it does not add any remap logic for generated accommodation `dayIds`.
- This means the bug persists on the current branch and is still unresolved in PR `#85`.

## User-visible impact

- Generated accommodation may not appear on the expected trip day in `TripWorkspace`.
- A single backend accommodation can be mapped incorrectly or duplicated in frontend local state.
- Subsequent saves can propagate bad linkage back into update flows.
- Guest/browser generate can look successful at first because navigation to `TripWorkspace` still happens, but the accommodation section is silently wrong on arrival.

## Likely fix direction

1. During generate persistence, keep a mapping:
   - AI day number or generation order
   - created `TripDay.id`
2. Remap incoming accommodation day references before calling `repo.add_accommodation(...)`.
3. Add one backend test that verifies:
   - generated response `accommodations[].dayIds`
   - all returned day IDs belong to the persisted trip's real `days[].id`
4. Add one frontend test that loads a generated itinerary and verifies accommodation renders on the intended day.

## Suggested acceptance criteria

- Every returned `accommodations[].dayIds[]` value matches a real `days[].id` in the same itinerary response.
- A live generate from `/create-trip` shows accommodation in the correct day/workspace state immediately after navigation, not only after manual patching.
- Generated accommodation is visible in `TripWorkspace` on the correct day after reload.
- Saving the generated trip again does not duplicate or corrupt accommodation linkage.
