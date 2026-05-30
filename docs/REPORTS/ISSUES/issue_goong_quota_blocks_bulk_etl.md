# Issue: Goong Error Propagation Blocks Proper ETL Error Classification

## Status
UPDATED — Phase 2E Complete (2026-05-30) — REST API Key Validated

## Evidence
- **Phase 2A Dry-run** (2026-05-30):
  - Hà Nội, TP.HCM, Đà Nẵng, Hội An: ✅ PASS (~360 API calls)
  - Huế: ❌ BLOCKED by errors (originally classified as "429 rate limit")
- **Phase 2C Root Cause Analysis** (2026-05-30):
  - Direct Goong API test confirms: missing/invalid api_key returns `403` with body:
    ```json
    {"error": {"code": "API_KEY_MISSING", "message": "No api_key was supplied..."}}
    ```
  - `base_extractor.py:88` was raising `RuntimeError("HTTP 403...")` WITHOUT preserving the provider's error code
  - This made it impossible to distinguish `API_KEY_MISSING` from real 429 rate limit
- **Goong API facts**:
  - API billed per request
  - 403 for missing/invalid api_key, 429 for rate limit
  - Error responses include structured `error.code` field

## Impact
- **Phase 2A Huế failure likely misclassified** - may have been `API_KEY_MISSING` or `API_KEY_INVALID`, not quota exhaustion
- User has ~$100 free credit, only ~$3 used - NOT quota/credit depletion
- Cannot distinguish error types in logs without provider error code
- Staggered import still recommended for safety, but NOT because quota is exhausted

## Why ETL Consumes ~75-100 Calls/City

```
For each category (5: food, attraction, nature, entertainment, shopping):
  For each keyword template (3 per category = 15 total):
    Call Autocomplete API with "category_keyword city"
    For each prediction returned (~5 average):
      Call Place Detail API with place_id

Total: 15 autocomplete calls + ~75 detail calls = ~90 API calls/city
```

**Code location**: `Backend/src/etl/extractors/goong_extractor.py:extract_pois()`

## Gaps in Current Implementation

| Gap | Impact | Fix needed |
|---|---|---|
| No `limit` parameter in autocomplete | Gets full 10 predictions → more detail calls | Add `limit=5` to reduce predictions |
| No `sessiontoken` | Each call billed separately | Group requests with sessiontoken |
| No `more_compound` | Can't prefilter by province | Add to prefilter before detail |
| No request budget tracking | No counter/stop when quota near | Add `etl_goong_max_requests_per_run` |
| 429 retry too slow | 3 retries × 60s = 3+ minutes | Faster fail or stop immediately |

## Suggested Fixes

### Immediate (Phase 2C) — COMPLETED ✅
- ✅ DONE: Add `ProviderErrorResponse` exception to preserve Goong's `error.code`
- ✅ DONE: Update `base_extractor.py` to extract and raise `ProviderErrorResponse` for structured errors
- ✅ DONE: Update `runner.py` to catch `ProviderErrorResponse` separately and log `provider_code`
- ✅ DONE: Add tests verifying provider error code preservation

### Phase 2D — COMPLETED ✅ (2026-05-30)
- ✅ DONE: Fix `GoongClient` to re-raise `ProviderErrorResponse` instead of swallowing it
  - Added `except ProviderErrorResponse: raise` BEFORE `except RuntimeError` in all 3 methods
  - `geocode()`, `autocomplete()`, `place_detail()` now propagate structured errors
- ✅ DONE: Update `runner.py` to classify config errors (`API_KEY_MISSING`, `API_KEY_INVALID`) separately
  - Added `config_error` status type
  - Config errors stop entire run (not just continue to next city)
- ✅ DONE: Rewrite tests to mock-only (no real HTTP calls)
  - Replaced live API tests with `client.fetch = fake_fetch` pattern
  - Added 9 new tests covering provider error propagation
  - All 106 unit tests passing

### Phase 2E — COMPLETED ✅ (2026-05-30)
- ✅ DONE: One-request live Goong smoke test
- ✅ DONE: Validate REST API key type (not Maptiles Key)
- ✅ DONE: Verify Phase 2D error propagation fix (no silent errors)
- ✅ DONE: Confirm `.env` → `settings.goong_api_key` loading works
- ✅ RESULT: HTTP 200 OK, 5 predictions returned
- ✅ CONFIRMED: Current Goong API key is VALID REST API Key
- 📄 See: `docs/REPORTS/00052_goong_live_smoke_result.md`

### Phase 2B — Already Completed
- ✅ DONE: Add 429 stop behavior — break city loop on rate limit
- ✅ DONE: Add ETL summary log — track per-city metrics

### Short-term (00052+)
- Add configurable throttle: `etl_goong_request_delay_seconds`
- Add request budget: `etl_goong_max_requests_per_run`
- Use `limit=5` in autocomplete to reduce predictions
- Use `sessiontoken` to group autocomplete requests
- Add `more_compound=true` to prefilter by province

### Long-term (C3+)
- Implement request caching for autocomplete results
- OSM-first strategy for small/remote cities
- Manual/YAML bootstrap for cities with poor Goong coverage

## Recommended Branch
`feat/00052-c-etl-goong-data-expansion` — Phase 2E complete, REST API Key validated
Next: Phase 3A real import (Hà Nội only) to verify DB persistence, `last_etl_at`, idempotency

## Related Issues
- `issue_multicity_etl_required_before_multicity_generate.md` — Depends on this
- `issue_etl_scheduler_missing.md` — Scheduler needed for auto-staggered imports
