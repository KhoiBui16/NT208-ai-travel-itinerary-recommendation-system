# B1 Network Evidence — /places/saved/list storm

User: `b1-evidence-1782199591043@test.com` (fresh registration, OTP bypass)
City: Hà Nội (102 places, 3 hotels — real BE data)

## /places/saved/list call counts by phase

| Phase | Calls |
|---|---|
| city-load (initial sync) | 1 |
| save-toggle (delta) | 0 |
| unsave-toggle (delta) | 0 |
| render-stress (scroll x6 + resize, delta) | 0 |
| saved-places page (delta) | 1 |
| **TOTAL** | **2** |

## Verdict

**PASS — /places/saved/list bounded to 1 initial sync; toggles + renders do not refetch**

Before the fix (task 00113 evidence, network_log.txt partD) the same flow
fired ~128 `/places/saved/list` calls because the sync `useEffect` depended on
`displayCity`/`displayPlaces` (new object/array every render). The fix moves
deps to stable state refs (`apiDestination`, `apiPlaces`, `isAuthenticated`)
and caches the SavedPlace id map so toggle does not refetch.

## Screenshots

- b1-01-city-load.png
- b1-02-after-toggle.png
- b1-03-saved-places.png

## Raw call log

```json
[
  {
    "phase": "city-load",
    "url": "http://localhost:8000/api/v1/places/saved/list"
  },
  {
    "phase": "saved-page",
    "url": "http://localhost:8000/api/v1/places/saved/list"
  }
]
```
