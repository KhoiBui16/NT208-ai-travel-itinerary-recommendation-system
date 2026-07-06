# 00060A — Fix Nested Trip Subresource Authz Gap

Date: 2026-06-01
Branch: `fix/00060-a-nested-subresource-authz`
PR title: `fix: [#00060] enforce nested trip subresource authorization`

## 1. Executive Summary

| Item | Result |
|---|---|
| Vulnerability fixed | `YES` |
| Can proceed to `00060B` architecture/system review | `YES` |
| Can proceed directly to implementation-heavy C3/C4 | `NOT_YET_RECOMMENDED` |
| Main fixed risk | Mixed-ID nested activity/accommodation mutation is now blocked |
| Frontend changed | `NO` |
| External providers called | `NO` |

This fix closes the broken object-level authorization gap found in `00059B/00059C`. Before the change, a user who owned `trip_A` could update or delete nested resources from `trip_B` by sending the path `trip_id=trip_A.id` together with `activity_id` or `accommodation_id` from another trip. The backend now requires the nested subresource to belong to the same parent trip before mutating it.

## 2. Vulnerability Summary

| Item | Detail |
|---|---|
| Product area | Trip Workspace nested activity/accommodation edit/delete |
| Vulnerable pattern | Owner check validated only the path `trip_id`, then loaded nested resources by raw ID alone |
| Impact | Unauthorized cross-trip update/delete if a valid nested ID from another trip is known |
| Why it blocks C3/C4 | Future trip-bound chat/apply flows depend on a trustworthy trip ownership model |

## 3. Root Cause

Before this fix:

- `ItineraryService.update_activity()` called `_verify_owner(trip_id, user_id)` and then `repo.get_activity_by_id(activity_id)`
- `ItineraryService.delete_activity()` used the same pattern
- `ItineraryService.delete_accommodation()` called `_verify_owner(trip_id, user_id)` and then `repo.get_accommodation_by_id(acc_id)`

Those repository queries did not verify that the nested resource actually belonged to the path trip.

## 4. Reproduction / Regression Design

| Case | Before fix | After fix |
|---|---|---|
| User A updates activity of trip B under trip A path | `200` | `404` |
| User A deletes activity of trip B under trip A path | vulnerable by same pattern | `404` |
| User A deletes accommodation of trip B under trip A path | `204` | `404` |
| User updates own activity in own trip | `200` | `200` |
| User deletes own activity in own trip | `204` | `204` |
| User deletes own accommodation in own trip | `204` | `204` |
| User reads another user's trip directly | `403` | `403` unchanged |

## 5. Implementation

| File | Change | Why |
|---|---|---|
| `Backend/src/itineraries/repository.py` | Added `get_activity_for_trip(activity_id, trip_id)` | Ensure activity lookup is constrained by parent trip |
| `Backend/src/itineraries/repository.py` | Added `get_accommodation_for_trip(acc_id, trip_id)` | Ensure accommodation lookup is constrained by parent trip |
| `Backend/src/itineraries/service.py` | `update_activity()` now uses composite trip-bound lookup | Block mixed-ID cross-trip activity update |
| `Backend/src/itineraries/service.py` | `delete_activity()` now uses composite trip-bound lookup | Block mixed-ID cross-trip activity delete |
| `Backend/src/itineraries/service.py` | `delete_accommodation()` now uses composite trip-bound lookup | Block mixed-ID cross-trip accommodation delete |
| `Backend/tests/integration/test_itinerary_endpoints.py` | Added owner-path and mixed-ID regression tests | Prove exploit is blocked without breaking normal behavior |
| `Backend/tests/integration/test_itinerary_endpoints.py` | Switched fixed auth users in rerunnable itinerary tests to fresh users | Avoid local DB state collisions during repeated full integration runs |
| `Backend/tests/unit/test_itinerary_service.py` | Added service-level trip-bound lookup tests | Lock the business rule closer to the service layer |

## 6. Test Evidence

### 6.1 Before Fix Reproduction

Targeted regression tests were added first and run against the vulnerable code:

| Test | Before fix result |
|---|---|
| `test_update_activity__mixed_trip_and_activity_ids__returns_404` | Failed because API returned `200` |
| `test_delete_accommodation__mixed_trip_and_accommodation_ids__returns_404` | Failed because API returned `204` |

### 6.2 After Fix Verification

| Command | Status | Notes |
|---|---|---|
| `uv run pytest tests/unit/test_itinerary_service.py -v --tb=short -k "activity or accommodation"` | PASS | 6 selected tests passed |
| `CI=true uv run pytest tests/integration/test_itinerary_endpoints.py -v --tb=short -k "mixed or own_trip or activity or accommodation"` | PASS | 10 selected tests passed |
| `uv run ruff check src tests` | PASS | Ruff cache write warnings only |
| `uv run ruff format --check src tests` | PASS | Repository already formatted |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | `125 passed, 1 warning` |
| `CI=true uv run pytest tests/integration/ -v --tb=short` | PASS | `51 passed` |

## 7. Frontend Impact

No frontend source files changed in `00060A`.

- No normal user-facing UI contract changed
- No full frontend build or Playwright rerun was needed for this backend-only security fix
- Existing workspace edit/share/browser behavior from `00059C` remains relevant for valid flows

## 8. Security Behavior After Fix

| Case | Expected | Actual |
|---|---|---|
| Read another user's trip | `403` | `403` |
| Update own activity in own trip | `200` | `200` |
| Update another trip's activity under owned trip path | `404` | `404` |
| Delete own activity in own trip | `204` | `204` |
| Delete another trip's activity under owned trip path | `404` | `404` |
| Delete own accommodation in own trip | `204` | `204` |
| Delete another trip's accommodation under owned trip path | `404` | `404` |

## 9. Remaining Risk

| Item | Status | Note |
|---|---|---|
| Mixed-ID nested activity/accommodation mutation | RESOLVED | Covered by integration regression tests |
| Wider C3/C4 architecture readiness | PENDING | Still belongs to `00060B` review phase |
| Real provider/ETL readiness | UNCHANGED | Not part of `00060A` |

## 10. Recommendation

Proceed to `00060B — Architecture/System Review + Go/No-Go before C3/C4`.

The specific ownership-bypass blocker discovered in `00059C` is fixed and regression-covered, so it should no longer block that architecture review phase.
