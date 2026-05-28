# Issue: Goong Directions API Not Implemented — Blocks Route Optimization

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: MEDIUM
**Status**: OPEN
**Related**: `docs/REPORTS/phase_c3_data_coverage_verification.md`

---

## Problem

Goong Directions API (route calculation between places) is not implemented. This blocks:
- C3 companion chat: "tính route từ khách sạn đến địa điểm đầu tiên"
- Route optimization in generate pipeline
- Travel time estimation

---

## Evidence

### Current Goong Client Coverage

| API | Endpoint | Status |
|---|---|---|
| Geocode | `/geocode` | ✅ Implemented |
| Autocomplete | `/place/autocomplete` | ✅ Implemented |
| Place Detail | `/place/detail` | ✅ Implemented |
| **Directions** | `/direction` | ❌ **Missing** |
| **Distance Matrix** | `/distance-matrix` | ❌ **Missing** |
| **Place Photo** | `/place/photo` | ❌ **Missing** |

### Goong API Documentation

Goong has these endpoints:
- `GET /geocode` — Address to coordinates
- `GET /place/autocomplete` — Search predictions
- `GET /place/detail` — Full place details
- `GET /direction` — Route between waypoints
- `GET /distance-matrix` — Distance/time between origin-destination pairs
- `GET /place/photo` — Place photos by photo_reference

---

## Impact on C3

### C3 Companion Chat Route Features

| User Question | C3 Current | C3 With Directions |
|---|---|---|
| "Tính thời gian di chuyển?" | ❌ Cannot answer | ✅ Goong Directions |
| "Địa điểm nào gần nhất?" | ⚠️ Approximate | ✅ Distance Matrix |
| "Tối ưu lộ trình?" | ❌ Not possible | ✅ Directions + optimization |
| "Cách bao xa?" | ❌ No distance | ✅ Distance Matrix |

### Without Directions API

C3 can answer trip context questions but cannot:
1. Calculate travel time between activities
2. Suggest nearest places
3. Optimize daily route
4. Answer "how far is X from Y?"

---

## Goong Directions API Details

### Endpoint

```
GET [REDACTED]/direction?origin={lat1},{lng1}&destination={lat2},{lng2}&api_key=[REDACTED]}
```

### Response

```json
{
  "routes": [
    {
      "legs": [
        {
          "distance": {"value": 5230, "text": "5.2 km"},
          "duration": {"value": 960, "text": "16 phút"}
        }
      ],
      "overview_polyline": {"points": "encoded_polyline..."}
    }
  ]
}
```

---

## Suggested Fix

### Phase 1: Add GoongClient Methods

```python
# src/geo/goong_client.py

async def directions(
    self,
    origin: tuple[float, float],
    destination: tuple[float, float],
) -> dict[str, Any] | None:
    """Calculate route between two points."""
    params = {
        "origin": f"{origin[0]},{origin[1]}",
        "destination": f"{destination[0]},{destination[1]}",
        "api_key": [REDACTED],
    }
    try:
        data = await self.fetch(f"{self.base_url}/direction", params=params)
    except RuntimeError:
        return None
    return data.get("routes", [{}])[0] if data.get("routes") else None

async def distance_matrix(
    self,
    origins: list[tuple[float, float]],
    destinations: list[tuple[float, float]],
) -> dict[str, Any] | None:
    """Calculate distances between multiple origins/destinations."""
    params = {
        "origin": ";".join(f"{o[0]},{o[1]}" for o in origins),
        "destination": ";".join(f"{d[0]},{d[1]}" for d in destinations),
        "api_key": [REDACTED],
    }
    try:
        data = await self.fetch(f"{self.base_url}/distance-matrix", params=params)
    except RuntimeError:
        return None
    return data
```

### Phase 2: C3 Route Features

After Directions API is implemented, C3 companion chat can:
1. Calculate travel time in companion chat
2. Show route on map
3. Suggest optimizations

---

## Recommended Branch

```
feat/00058-c-c3-goong-directions-api
```

---

## Notes

- Directions API is NOT a blocker for C3 MVP — companion chat can work without route optimization
- This is a C3+ enhancement, not MVP requirement
- C3 MVP scope: trip context Q&A + activity suggestions from DB
- C3+ scope: route optimization, distance calculation