# Issue: ETL Rate Limit Stop Behavior Not Fully Implemented

## Status
✅ **RESOLVED** — Fixed in Phase 4C-FIX-2 (2026-05-30)

## Evidence
- **Phase 3 Consolidated Batch B**: After 6th city (Nha Trang) import, Goong API returned HTTP 429
- ETL entered retry loop with 60s backoff
- ETL did NOT stop entire run as designed in Phase 2B
- Process manually killed after ~5 minutes of continued retries

## Reproduction

1. Import 6+ cities consecutively via ETL
2. After 6th city, Goong API starts returning HTTP 429
3. ETL continues retrying instead of stopping entire run

```
2026-05-30 02:10:44,360 [INFO] src.etl.runner: ETL completed in 25.1s: 64 places, 1 hotels
2026-05-30 02:10:50,815 [WARNING] src.etl.base_extractor: Rate limited (429), waiting 60s
2026-05-30 02:11:51,126 [WARNING] src.etl.base_extractor: Rate limited (429), waiting 60s
2026-05-30 02:12:51,466 [WARNING] src.etl.base_extractor: Rate limited (429), waiting 60s
...
(infinite loop, did NOT stop entire run)
```

## Expected Behavior (Phase 2B Design)

From `docs/REPORTS/00052_etl_quota_and_data_expansion_plan.md` Phase 2B:

```
### Required Fix 2: 429 Stop Behavior

**File**: `Backend/src/etl/runner.py`

**Changes**:
1. Added `ETLResult` dataclass to track per-city metrics
2. Catch `RuntimeError` with "rate limit" or "429" message
3. Set `hit_rate_limit = True` and break city loop
4. Log "Rate limit hit — X cities remaining skipped"
5. Record `status="rate_limited"` in `scraped_sources`
```

**Expected**:
- ETL should stop entire run when rate limit hit
- Should set `hit_rate_limit = True` and break city loop
- Should log "Rate limit hit — X cities remaining skipped"
- Should NOT continue retrying indefinitely

## Actual Behavior

1. `base_extractor.py` handles 429 with retry loop (60s backoff)
2. `runner.py` never receives the rate limit error to stop the run
3. ETL continues retrying indefinitely within the same city
4. No "Rate limit hit" summary message logged
5. No `status="rate_limited"` set in `scraped_sources`

## Root Cause

The rate limit handling in `base_extractor.py` retries with backoff **internally** without propagating the error back to `runner.py`. The `hit_rate_limit` flag in `runner.py` is only set when catching `RuntimeError` with "rate limit" message, but `base_extractor.py` swallows the error and continues retrying.

**Gap in Phase 2B implementation**:
- Phase 2B added `hit_rate_limit` logic in `runner.py`
- Phase 2B did NOT modify `base_extractor.py` to propagate rate limit errors
- The two layers are not connected

## Impact

### Low impact for MVP
- 6 cities successfully imported (exceeding 5-city minimum)
- All 6 cities pass generate readiness threshold
- Companion chat can serve 6 cities

### Medium impact for scalability
- Cannot import remaining 9 cities in one run
- Must manually kill process and wait for quota reset
- No clear summary of which cities were skipped

### High impact for production deployment
- Scheduled ETL (Render Cron) will hang indefinitely on rate limit
- No automated way to detect and stop failed runs
- May consume unnecessary resources waiting for quota reset

## Suggested Fixes

### Option A: Propagate Rate Limit Error (Recommended)

**Files to modify**:
1. `Backend/src/etl/base_extractor.py`
2. `Backend/src/etl/runner.py`

**Changes**:
1. Add `MaxRetriesExceededError` exception in `base_extractor.py`
2. Raise `MaxRetriesExceededError` after 3 retries instead of infinite loop
3. Catch `MaxRetriesExceededError` in `runner.py`
4. Set `hit_rate_limit = True` and break city loop
5. Log "Rate limit hit — X cities remaining skipped"

### Option B: Add Configurable Retry Limit

**Files to modify**:
1. `Backend/src/etl/base_extractor.py`
2. `Backend/src/core/config.py`

**Changes**:
1. Add `ETL_GOONG_MAX_RETRIES` config setting (default: 3)
2. Stop retrying after max retries
3. Raise `MaxRetriesExceededError` to propagate to `runner.py`

### Option C: Implement Request Budget Tracking (Deferred to 00052+)

**Files to modify**:
1. `Backend/src/etl/runner.py`
2. `Backend/src/core/config.py`

**Changes**:
1. Add `ETL_GOONG_MAX_REQUESTS_PER_RUN` config setting
2. Track request count across all cities
3. Stop entire run before hitting rate limit
4. Log "Request budget exhausted — X cities remaining skipped"

## Recommended Branch

`fix/00052-etl-rate-limit-stop-behavior` or defer to `feat/00052-etl-goong-data-expansion` continuation

## Related Issues

- `docs/REPORTS/ISSUES/goong_quota_blocks_bulk_etl.md` (if exists)
- `docs/REPORTS/00052_etl_quota_and_data_expansion_plan.md` (Phase 2B section)

## Workaround

For immediate MVP needs:
1. Import cities in smaller batches (1-2 cities per run)
2. Wait 24 hours for Goong quota reset between batches
3. Manually kill process if rate limit loop detected

---

**Created**: 2026-05-30
**Priority**: MEDIUM (MVP can proceed with 6 cities; fix required for production)
**Status**: ✅ **RESOLVED**

## Resolution (2026-05-30 — Phase 4C-FIX-2)

### Changes made

1. **Backend/src/etl/base_extractor.py**:
   - Added `MaxRetriesExceededError` exception class with `status_code` and `is_rate_limit` fields
   - Modified `fetch()` to track `rate_limit_retry_count` separately from general retries
   - On HTTP 429: sleeps 60s for first 2 retries, on 3rd retry raises `MaxRetriesExceededError(is_rate_limit=True)`
   - On generic exhaustion: raises `MaxRetriesExceededError(is_rate_limit=False)`

2. **Backend/src/geo/goong_client.py**:
   - Added `except MaxRetriesExceededError: raise` before generic `RuntimeError` handler in all 3 methods (geocode, autocomplete, place_detail)

3. **Backend/src/etl/runner.py**:
   - Added `"skipped_after_rate_limit"` to `ETLResult.status` Literal
   - Added `except MaxRetriesExceededError` handler before `RuntimeError` handler
   - When `is_rate_limit=True`: sets `hit_rate_limit = True`, `status = "rate_limited"`, breaks city loop
   - After break, appends remaining cities with `status = "skipped_after_rate_limit"` and error message
   - When `is_rate_limit=False`: sets `status = "failed"`, continues to next city

4. **Backend/tests/unit/test_rate_limit_behavior.py** (new file, 9 tests):
   - Tests for `MaxRetriesExceededError` properties
   - Tests for GoongClient re-raising behavior
   - Tests for ETLResult accepting `skipped_after_rate_limit` status

### Test evidence

- ✅ Ruff check: `All checks passed!`
- ✅ Ruff format: `88 files already formatted`
- ✅ Unit tests: `115 passed` (106 original + 9 new)
- ✅ Integration tests: `37 passed, 7 skipped`

### Remaining limitation

Tests are mock-only (no real HTTP calls to Goong API). Full E2E test would require:
- Real Goong API key with rate limit
- Trigger actual HTTP 429 response
- Verify runner stops and appends skipped cities

This is deferred to production deployment or manual verification.
