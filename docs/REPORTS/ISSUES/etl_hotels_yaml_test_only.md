# Issue: Hotels Are Test Data from YAML — Not Production Ready

**Date**: 2026-05-28
**Branch**: `docs/00050-c-c3-design-readiness-audit`
**Priority**: MEDIUM
**Status**: OPEN
**Related**: `docs/REPORTS/phase_c3_data_coverage_verification.md`

---

## Problem

Hotels in the database come from `hotels.yaml` — test data with 3 hotels for Hanoi only. This is not production-ready.

### Current Hotel Data

```
Hà Nội: 3 hotels (all from YAML)
- Sofitel Legend Metropole Hanoi — 5,500,000 VND/night — 4.9 rating
- Hotel de l'Opera Hanoi — 3,200,000 VND/night — 4.7 rating
- La Siesta Premium Hang Be — 1,800,000 VND/night — 4.6 rating

Đà Nẵng: 0 hotels
TP.HCM: 0 hotels
All other cities: 0 hotels
```

### Issues

1. **Only 3 hotels for Hanoi** — Insufficient for itinerary generation
2. **No hotel data for other cities** — Generate pipeline uses hotels for accommodation
3. **YAML test data** — Images are placeholder paths (`/img/hotels/metropole.jpg`)
4. **No real-time pricing** — Static YAML prices, not live booking API
5. **No booking links** — `booking_url` is NULL in all hotels

---

## Evidence

### Query Result

```python
# Hotel samples from DB
[
  {
    "Name": "Sofitel Legend Metropole Hà Nội",
    "price_per_night": 5500000,
    "rating": 4.9,
    "image": "/img/hotels/metropole.jpg",  # Placeholder
    "booking_url": None  # No booking link
  },
  ...
]
```

### hotels.yaml Source

```yaml
hotels:
  - name: "Sofitel Legend Metropole Hanoi"
    price_per_night: 5500000
    rating: 4.9
    ...
```

---

## Impact

### Generate Pipeline

```python
# pipeline.py:133
hotels = await self.repo.get_hotels_for_ai(destination_id, limit=MAX_CONTEXT_HOTELS)
# MAX_CONTEXT_HOTELS = 4

# If user generates itinerary for TP.HCM:
# → hotels = [] (no hotel data)
# → LLM gets 0 hotels in context
# → Accommodation recommendations may be generic or missing
```

### C3 Companion Chat

```python
# If user asks: "gợi ý khách sạn gần đây"
# → For Hanoi: 3 hotels (test data only)
# → For TP.HCM: 0 hotels (no data)
```

---

## Suggested Fix

### Option A: ETL Hotels from Goong (Recommended)

Extend ETL pipeline to extract hotels:
1. Add hotel search keywords to `GOONG_CATEGORY_KEYWORDS`
2. Extract from Goong Place Detail + OpenStreetMap
3. Include booking_url if available via booking APIs

### Option B: Manual Hotel YAML (Quick Fix)

Expand `hotels.yaml` to include 10-15 hotels per city:
1. Add hotels for Hà Nội, Đà Nẵng, TP.HCM
2. Add real booking URLs (Booking.com, Agoda APIs)
3. Mark as "curated" not "Goong-sourced"

### Option C: Booking API Integration

Integrate real booking APIs:
1. Booking.com Affiliate API
2. Agoda API
3. Live pricing and availability

---

## Recommended Branch

```
feat/00052-c-etl-goong-data-expansion  # Include hotel ETL
```

---

## Notes

- Current 3 hotels are sufficient for Hà Nội demo with caveats
- Production requires real hotel data with booking URLs
- Option A (Goong ETL) is preferred for consistency