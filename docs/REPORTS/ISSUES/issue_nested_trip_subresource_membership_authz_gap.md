# Issue — Nested Trip Subresource Membership AuthZ Gap

Status: `✅ RESOLVED`
Severity: `HIGH`
Found in: `00059B — Full User Journey UAT`
Resolved in: `00060A — Fix nested trip subresource authz gap`
**Extended by PR #86 (00062):** Destination matching and data contract fixes ensure authZ checks work correctly for all itinerary subresources

## Summary

The itinerary service checks that the authenticated user owns the supplied `trip_id`, but some nested subresource update/delete paths then load `activity_id` or `accommodation_id` directly without proving that the subresource belongs to that same trip.

This can become a broken object-level authorization risk if a user owns one valid trip and sends another trip's nested subresource ID.

## Source Evidence

| Area | Evidence |
|---|---|
| Router exposes nested activity update/delete | `Backend/src/itineraries/router.py` has `PUT /{trip_id}/activities/{activity_id}` and `DELETE /{trip_id}/activities/{activity_id}` |
| Router exposes nested accommodation delete | `Backend/src/itineraries/router.py` has `DELETE /{trip_id}/accommodations/{accommodation_id}` |
| Service verifies supplied trip owner first | `ItineraryService._verify_owner(trip_id, user_id)` is called before nested update/delete |
| Activity loaded by ID only | `ItineraryService.update_activity()` and `delete_activity()` call `repo.get_activity_by_id(activity_id)` |
| Accommodation loaded by ID only | `ItineraryService.delete_accommodation()` calls `repo.get_accommodation_by_id(acc_id)` |
| Repository query has no trip join/filter | `TripRepository.get_activity_by_id()` and `get_accommodation_by_id()` select by subresource ID only |

## Impact

Expected invariant: every integer-ID itinerary endpoint must be owner-only, including nested writes.

Current risk: ownership of the supplied trip does not necessarily prove ownership of the supplied activity/accommodation ID. A malicious user could try a valid trip ID they own with another guessed subresource ID.

## 00059C Manual Reproduction Evidence

The issue was reproduced with two real authenticated users during the `00059C` manual UAT phase.

| Check | Result |
|---|---|
| User A direct read of user B trip | `403` |
| User A `PUT /itineraries/{tripA}/activities/{activityB}` | `200` |
| User A `DELETE /itineraries/{tripA}/accommodations/{accommodationB}` | `204` |
| Activity in user B trip after exploit | Renamed to `PWNED BY USER A` |
| Accommodation count in user B trip after exploit | `0` |

This confirms the bug is not only theoretical source drift. Trip-level ownership is enforced, but nested subresource ownership is still bypassable when a valid owned `trip_id` is mixed with another trip's nested IDs.

## Recommended Fix

1. Add repository methods that fetch nested resources by both parent trip and nested ID:
   - `get_activity_for_trip(trip_id, activity_id)`
   - `get_accommodation_for_trip(trip_id, accommodation_id)`
2. Use a join through `TripDay.trip_id` for activities.
3. Use direct `Accommodation.trip_id` filter for accommodations.
4. Return `404` when the nested resource is not inside the supplied trip.
5. Add unit and integration tests:
   - Owner can update/delete activity inside their trip.
   - Owner cannot update/delete activity from another trip by mixing IDs.
   - Owner can delete accommodation inside their trip.
   - Owner cannot delete accommodation from another trip by mixing IDs.

## 00060A Fix Outcome

Implemented in `fix/00060-a-nested-subresource-authz`:

- `TripRepository.get_activity_for_trip(activity_id, trip_id)`
- `TripRepository.get_accommodation_for_trip(acc_id, trip_id)`
- `ItineraryService.update_activity()` now loads activities by both `activity_id` and `trip_id`
- `ItineraryService.delete_activity()` now loads activities by both `activity_id` and `trip_id`
- `ItineraryService.delete_accommodation()` now loads accommodations by both `acc_id` and `trip_id`

Regression evidence:

| Case | Before fix | After fix |
|---|---|---|
| Mixed activity update | `200` | `404` |
| Mixed activity delete | same vulnerable pattern | `404` |
| Mixed accommodation delete | `204` | `404` |
| Owner updates own activity | `200` | `200` |
| Owner deletes own activity | `204` | `204` |
| Owner deletes own accommodation | `204` | `204` |

Verified by:

- targeted integration tests in `Backend/tests/integration/test_itinerary_endpoints.py`
- service unit tests in `Backend/tests/unit/test_itinerary_service.py`
- full backend lint/unit/integration pass

## Blocking Decision

This issue blocked implementation-heavy C3/C4 work while it was open. With `00060A` and passing regression coverage, this specific blocker is resolved and no longer blocks moving to `00060B` architecture/system review.
