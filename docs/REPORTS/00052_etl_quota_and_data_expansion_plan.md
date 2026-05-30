# 00052 ETL Quota and Data Expansion Plan

**Date**: 2026-05-30
**Branch**: `feat/00052-c-etl-goong-data-expansion`
**Type**: ETL quota analysis and expansion strategy

---

## Summary (Updated Phase 2C)

Phase 2A dry-run revealed Goong API errors during multi-city ETL. Originally classified as "rate limit/quota exhaustion," Phase 2C analysis revealed the actual issue was **error propagation** — Goong's structured error responses (with `error.code` like `API_KEY_MISSING`) were being lost.

**Key findings (corrected)**:
- Dry-run consumes Goong API calls (~75-100 calls/city)
- After 4 cities, 5th city (Huế) failed with errors
- **Phase 2C finding**: `base_extractor.py` was raising generic `RuntimeError` without preserving Goong's `error.code`
- **Phase 2C fix**: Added `ProviderErrorResponse` exception to preserve error codes
- User has ~$100 free credit, ~$3 used — **NOT quota/credit depletion**
- Staggered import still recommended for safety, but NOT because quota is exhausted
- `last_etl_at` field never updated by ETL (fixed in Phase 2B)

---

## Phase 2A Evidence: Dry-run Results

### Cities Completed Successfully

| City | Raw POIs (Goong) | Valid places | Skipped | Hotels | Duration | Source |
|---|---:|---:|---:|---:|---|---|
| **Hà Nội** | 75 | 60 | 15 | 3 | 25.0s | Goong 100% |
| **TP. Hồ Chí Minh** | 75 | 70 | 5 | 2 | 25.6s | Goong 100% |
| **Đà Nẵng** | 75 | 72 | 3 | 2 | 25.9s | Goong 100% |
| **Hội An** | 72 | 68 | 4 | 2 | 25.0s | Goong 100% (hit exhaustion) |

### City Blocked by Rate Limit

| City | Status | Issue |
|---|---|---|
| **Huế** | ❌ BLOCKED | 429 rate limit loop after 6+ retries |

**Huế rate limit timeline**:
```
00:58:34 — First 429, waiting 60s
00:59:34 — Second 429, waiting 60s
01:00:35 — Third 429, waiting 60s
01:01:35 — Fourth 429 + autocomplete error
... (continuing)
```

### DB Verification

**✅ Dry-run does NOT write DB** — verified:
- Before: Hà Nội 68 places, 3 hotels
- After: Hà Nội 68 places, 3 hotels (unchanged)
- All other cities: 0 places, 0 hotels (unchanged)

---

## Why Dry-run Consumes API Calls

**Reality**: `--dry-run` only means "no DB writes" — it does NOT mean "no API calls".

**Why ~75-100 calls/city**:

```
For each category (5: food, attraction, nature, entertainment, shopping):
  For each keyword template (3 per category = 15 total):
    Call Autocomplete API with "category_keyword city"
    For each prediction returned (~5 average):
      Call Place Detail API with place_id

Total: 15 autocomplete calls + ~75 detail calls = ~90 API calls/city
```

**Goong docs facts**:
- API billed per request
- Autocomplete default limit: 10 predictions
- No built-in request batching
- Rate limit (429) returns `Retry-After: 60` seconds

---

## Goong API Usage Analysis

| Docs/API capability | Current code usage | Gap | Impact |
|---|---|---|---|
| `api_key` per request | ✅ Used | None | — |
| `limit` parameter | ❌ NOT USED | Getting full 10 predictions each time | More detail calls needed |
| `sessiontoken` | ❌ NOT USED | No session grouping | Each call billed separately |
| `more_compound` | ❌ NOT USED | Can't prefilter by province | Wasted detail calls |
| Detail dedupe | ✅ Via `seen_place_ids` set | Good | — |
| 429 handling | ⚠️ 3 retries × 60s | 3+ minutes before fail | Too slow |
| Request budget | ❌ NO TRACKING | No counter/stop | Quota exhaustion |

---

## Code Changes Implemented (Phase 2B)

### Required Fix 1: Update `destinations.last_etl_at`

**File**: `Backend/src/etl/loaders/db_loader.py`

**Changes**:
1. Set `last_etl_at = datetime.now(UTC)` on destination creation
2. Update `last_etl_at` after successful `upsert_places()`
3. Update `last_etl_at` after successful `upsert_hotels()`

**Impact**: Can now detect stale data and track ETL freshness.

### Required Fix 2: 429 Stop Behavior

**File**: `Backend/src/etl/runner.py`

**Changes**:
1. Added `ETLResult` dataclass to track per-city metrics
2. Catch `RuntimeError` with "rate limit" or "429" message
3. Set `hit_rate_limit = True` and break city loop
4. Log "Rate limit hit — X cities remaining skipped"
5. Record `status="rate_limited"` in `scraped_sources`

**Impact**: No more infinite 429 loops. Quota-conscious behavior.

### Required Fix 3: ETL Summary Log

**File**: `Backend/src/etl/runner.py`

**Changes**:
1. Track results per city: status, places, hotels, source, duration, error
2. Log summary table before completion message

**Impact**: Clear visibility into ETL results per city.

---

## Code Changes Implemented (Phase 2C)

### Critical Fix: Preserve Goong Error Codes

**Issue**: `base_extractor.py` was raising generic `RuntimeError("HTTP {status_code} while fetching {url}")` without preserving Goong's structured error response body. This made it impossible to distinguish `API_KEY_MISSING` from real rate limit.

**Evidence**: Direct Goong API test (2026-05-30):
```bash
# Request without api_key:
curl "https://rsapi.goong.io/place/autocomplete?input=nhà+hàng+Hà+Nội"
# Response:
{"error": {"code": "API_KEY_MISSING", "message": "No api_key was supplied..."}}
```

**Files modified**:
1. **`Backend/src/etl/base_extractor.py`**:
   - Added `ProviderErrorResponse` exception class with fields: `status_code`, `provider_code`, `response_body`
   - Modified `fetch()` to extract `error.code` from JSON response before raising error

2. **`Backend/src/etl/runner.py`**:
   - Added import for `ProviderErrorResponse`
   - Added separate `except ProviderErrorResponse` block to handle structured errors
   - Logs `provider_code` (e.g., `API_KEY_MISSING`, `API_KEY_INVALID`) separately

**Impact**: ETL can now properly distinguish between:
- `API_KEY_MISSING` → config/key issue, NOT quota
- `API_KEY_INVALID` → wrong key type (Maptiles vs REST)
- `RATE_LIMIT_EXCEEDED` → real quota issue

---

## Code Changes Implemented (Phase 2D)

### Critical Fix: Propagate Provider Errors Through GoongClient

**Issue**: Phase 2C added `ProviderErrorResponse` in `base_extractor.py`, but `GoongClient` methods were catching all `RuntimeError` (including `ProviderErrorResponse`, which is a subclass) and returning `None`/`[]`. This meant provider errors never reached `runner.py`.

**Evidence**: `GoongClient.geocode()` line 30-32:
```python
try:
    data = await self.fetch(...)
except RuntimeError:
    return None  # Swallows ProviderErrorResponse!
```

**Files modified**:
1. **`Backend/src/geo/goong_client.py`**:
   - Added import for `ProviderErrorResponse`
   - Added `except ProviderErrorResponse: raise` BEFORE `except RuntimeError` in:
     - `geocode()` method
     - `autocomplete()` method
     - `place_detail()` method
   - Generic `RuntimeError` (timeout, network) still returns `None`/`[]` per existing contract

2. **`Backend/src/etl/runner.py`**:
   - Added `config_error` status type to `ETLResult` dataclass
   - Added explicit handling for `API_KEY_MISSING` and `API_KEY_INVALID`:
     - Sets `status = "config_error"`
     - Logs clear message about checking `GOONG_API_KEY` in `.env`
     - Stops entire run (breaks city loop)
   - Rate limit handling unchanged (stops entire run)

3. **`Backend/tests/unit/test_goong_api_key_error.py`**:
   - Rewrote to mock-only (removed real HTTP calls)
   - Added 9 tests covering:
     - Provider error re-raising behavior (3 tests)
     - Generic RuntimeError still returns None/[] (3 tests)
     - api_key included in request params (3 tests)

**Impact**:
- `ProviderErrorResponse` now correctly propagates through the entire stack
- ETL runner can classify and act on different error types:
  - `API_KEY_MISSING`/`API_KEY_INVALID` → stops run, prompts user to check config
  - `RATE_LIMIT_EXCEEDED` → stops run, avoids wasting quota
  - Generic errors → logged, city continues
- All 106 unit tests passing (101 before + 5 new)

---

## New Expansion Strategy

### Constraint: Goong API Usage Reality

**Updated understanding**: The original "quota exhausted" conclusion was incorrect. The actual issue was error classification. Staggered import is still recommended for operational safety, but NOT because quota is exhausted.

**Strategy**: **Staggered import** — 1-2 cities per day, monitor for actual rate limit errors.

**Before Phase 3A real import**:
1. Verify Goong API key type (REST API Key, not Maptiles Key)
2. Confirm key has Goong REST API permissions
3. Check Goong dashboard for any restrictions
4. Run single-city test (Hà Nội) to verify `provider_code` logging

### Batch A — Validation/Demo Core (5 cities)

**Priority**: HIGHEST
**Timeline**: 5 days (1 city/day)

| Day | City | Purpose | Expected API calls |
|---|---|---|---:|
| 1 | Hà Nội | Idempotency verify | ~90 |
| 2 | TP. Hồ Chí Minh | Largest city | ~90 |
| 3 | Đà Nẵng | Coastal tourism | ~90 |
| 4 | Hội An | UNESCO heritage | ~85 |
| 5 | Huế | Central Vietnam | ~85 |

**After Batch A**: 5 cities with generate-ready data → sufficient for initial demo.

### Batch B — Demo Expansion (10 cities)

**Priority**: HIGH
**Timeline**: 5-7 days (2 cities/day after quota reset)

| Cities | Purpose | Strategy |
|---|---|---|
| Nha Trang, Đà Lạt | Coastal/highland | Goong first |
| Phú Quốc, Hạ Long | Island/heritage | Goong first |
| Sapa, Cần Thơ | Mountain/delta | Goong first |
| Vũng Tàu, Quy Nhơn | Beach/coastal | Goong first |
| Ninh Bình, Hải Phòng | Nature/port | Goong first |

**Expected API calls**: ~900 calls total → requires 7-10 days with 2 cities/day.

### Batch C — Extended Coverage (14 cities)

**Priority**: MEDIUM
**Timeline**: Deferred to 00052+

**Strategy**: **OSM-first + YAML bootstrap** for remote/small cities:
- Hà Giang, Côn Đảo: OSM-first (remote, poor Goong coverage)
- Mộc Châu, Châu Đốc: YAML bootstrap (small cities)
- Đồng Hới, Phong Nha: Goong if quota allows

---

## Target Coverage: 10-15 Cities

**Demo-readiness threshold**: 10 cities with ≥30 places each.

**After Batch A + B**:
- 15 cities total
- Estimated total places: 900-1200
- Estimated total hotels: 30-45
- Coverage: Top 10 tourist destinations in Vietnam

**Remaining gaps** (defer to 00052+ or C3+):
- Route optimization (Goong Directions API)
- Hotel quality data (still YAML-only)
- Rating/cost/image coverage (Goong returns limited)

---

## Recommendations

### For 00052 Phase 3 (Real Import)

**Pre-flight checklist** (BEFORE any real import):
1. **Verify Goong API key type**: Confirm using REST API Key, not Maptiles Key
2. **Check key permissions**: Ensure key has Goong Places API permissions
3. **Single-city smoke test**: Run Hà Nội only, verify `provider_code` in logs
4. **Check for `API_KEY_INVALID`**: If seen, key type is wrong

**During import**:
1. **Staggered import recommended**: 1 city/day for Batch A, 2 cities/day for Batch B
2. **Monitor logs for `provider_code`**: Watch for `API_KEY_MISSING`, `API_KEY_INVALID`, `RATE_LIMIT_EXCEEDED`
3. **Stop immediately on structured errors** — new code logs `provider_code` clearly
4. **Verify `last_etl_at` updated** after each import

### For Future Work (00052+)

1. **Add `limit=5` to autocomplete** — reduce prediction count, fewer detail calls
2. **Use `sessiontoken`** — group autocomplete requests in same session
3. **Add `more_compound=true`** — prefilter by province before detail
4. **Implement request budget** — configurable `etl_goong_max_requests_per_run`
5. **OSM-first for small cities** — bypass Goong entirely for Batch C

---

## Open Issues

| Issue | Priority | Status |
|---|---|---|---|
| Goong error codes lost in propagation | HIGH | ✅ FIXED in Phase 2C |
| `last_etl_at` not updated | HIGH | ✅ FIXED in Phase 2B |
| Key type verification (REST vs Maptiles) | HIGH | ⚠️ PENDING — verify before Phase 3A |
| No request budget tracking | MEDIUM | ⚠️ DEFERRED to 00052+ |
| Hotels YAML test-only | MEDIUM | ⚠️ DEFERRED to 00052+ |

---

## Conclusion (Updated Phase 2D)

Phase 2A observed Goong failures during Huế dry-run. Originally classified as "429 rate limit/quota exhaustion," Phase 2C analysis revealed the actual issue was **error propagation** — Goong's `error.code` field (e.g., `API_KEY_MISSING`) was being discarded by `base_extractor.py`.

Phase 2B implemented quota-aware fixes (`last_etl_at` update, 429 stop behavior, ETL summary).

**Phase 2C implemented**: `ProviderErrorResponse` exception to preserve provider error codes in `base_extractor.py`.

**Phase 2D implemented**: Fixed `GoongClient` to propagate `ProviderErrorResponse` through the entire stack:
- Added `except ProviderErrorResponse: raise` in all 3 GoongClient methods
- Updated `runner.py` to classify config errors separately and stop entire run
- Rewrote tests to mock-only (no real HTTP calls)
- All 106 unit tests passing

**Phase 2E implemented**: One-request live Goong smoke test to validate REST API key type:
- Single request to `GoongClient.autocomplete("Hà Nội")`
- Result: ✅ SUCCESS — HTTP 200 OK, 5 predictions returned
- **Key type confirmed**: VALID REST API Key (not Maptiles Key)
- No `API_KEY_MISSING` or `API_KEY_INVALID` errors
- Phase 2D error propagation fix validated (no silent errors)
- Config loading validated (`.env` → `settings.goong_api_key`)

**Recommended path**: ✅ **READY FOR PHASE 3A** — REST API key validated, proceed with staggered real import (1-2 cities/day) starting with Hà Nội only to verify DB persistence, `last_etl_at` update, and idempotency.

---

**Phase 3A implemented**: Hà Nội real import with verification:
- ✅ First import: 60 places reported, DB totals 73 places (+5 relative to baseline)
- ✅ Second import: Idempotency verified (places stayed at 73, no duplicate names)
- ✅ `last_etl_at` updated: `2026-05-29 18:48:38` (Phase 2B fix validated)
- ✅ Backend API contract verified: `/destinations`, `/destinations/ha-noi`, `/search` all working
- ✅ Schema documented: DB name `dulichviet`, places use `destination_id`, coordinates are `latitude`/`longitude`
- 📄 Full report: `docs/REPORTS/00052_hanoi_real_import_result.md`

**Phase 3A-R implemented**: Review and corrections:
- ✅ Corrected docs overclaims about DB writes and dry-run
- ✅ Documented schema details (DB name, columns, constraints)
- ✅ API city search verified with URL encoding (works correctly)
- ✅ Generate pipeline lookup verified (Hà Nội only)
- ✅ All backend tests passing (106 unit + 37 integration)
- ✅ Deployment ETL strategy documented in `00052_deployment_etl_strategy.md`
- 📄 Current report: Phase 3A-R (this file)

**Current State**:
- Hà Nội: ✅ READY (73 places, 3 hotels, `last_etl_at` updated)
- Multi-city: ❌ NOT_READY (TP.HCM, Đà Nẵng chưa được import)
- Deployment scheduler: ⚠️ PLANNED_NOT_IMPLEMENTED

**Next Recommended**: Phase 3B — Import TP.HCM + Đà Nẵng only to validate multi-city ETL.

---

**Phase 3 Consolidated implemented**: Multi-city real import (6 cities, 414 places, 11 hotels):
- ✅ **Batch A** (must-have): TP.HCM (73 places), Đà Nẵng (69 places), Hội An (68 places), Huế (67 places) — 4/4 SUCCESS
- ✅ **Batch B** (demo expansion): Nha Trang (64 places) — 1/5 SUCCESS
- ❌ **Batch B** rate-limited: Đà Lạt, Phú Quốc, Hạ Long, Sapa — 4/5 BLOCKED by Goong 429
- ✅ DB verification: All 6 cities have 100% lat/lng, external_id, source coverage
- ✅ API verification: `/destinations` returns 6 cities, `/destinations/{slug}` works for all
- ✅ Generate dependency: All 6 cities pass `ENOUGH_FOR_GENERATE` threshold (>=30 places)
- ✅ All backend tests passing (106 unit + 37 integration)
- ⚠️ **Rate limit gap**: ETL continued retrying instead of stopping entire run (Phase 2B design not fully implemented)
- 📄 Full report: `docs/REPORTS/00052_multicity_real_import_result.md`

**Multi-city State (after Phase 3 Consolidated)**:
- ✅ **6 cities READY**: Hà Nội, TP.HCM, Đà Nẵng, Hội An, Huế, Nha Trang
- ❌ **9 cities NOT_READY**: Đà Lạt, Phú Quốc, Hạ Long, Sapa, Cần Thơ, Vũng Tàu, Quy Nhơn, Ninh Bình, Hải Phòng
- ✅ Deployment scheduler strategy documented in `00052_deployment_etl_strategy.md`

**Next Recommended**: Phase 4 — Generate/API readiness matrix for 6 cities (no ETL, no C3/C4 yet).
