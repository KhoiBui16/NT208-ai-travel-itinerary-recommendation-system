# PR #00052 — ETL Data Readiness Expansion and Generate Smoke Validation

## Mô tả

Hoàn thiện task #00052 cho ETL/data readiness và generate smoke trước C3/C4.

PR này mở rộng dữ liệu local từ Hà Nội-only sang 6 thành phố, sửa lỗi phân loại lỗi Goong/ETL, thêm an toàn khi gặp rate limit, kiểm chứng backend generate thật với Gemini cho 2 thành phố, và đồng bộ tài liệu readiness.

## Thay đổi chính

### ETL/Data Readiness
- [x] Mở rộng ETL/data readiness cho 6 city local: Hà Nội, TP.HCM, Đà Nẵng, Hội An, Huế, Nha Trang
- [x] 414 places, 11 hotels imported, 100% lat/lng coverage
- [x] Verify DB/API generate dependency cho tất cả 6 cities

### Goong Provider Error Handling
- [x] Sửa Goong provider error propagation để không nuốt `API_KEY_MISSING`, `API_KEY_INVALID`, rate-limit/provider errors
- [x] Preserve `ProviderErrorResponse` với `provider_code`, `status_code`, `message`
- [x] `GoongClient` re-raises structured errors thay vì wrap generic RuntimeError

### ETL Rate-Limit Safety
- [x] Thêm `MaxRetriesExceededError` exception với `status_code` và `is_rate_limit` fields
- [x] Modified `base_extractor.py` để raise `MaxRetriesExceededError(is_rate_limit=True)` sau 3 retries trên HTTP 429
- [x] Modified `goong_client.py` để re-raise `MaxRetriesExceededError` trong tất cả 3 methods (geocode, autocomplete, place_detail)
- [x] Update ETL runner để mark current city `rate_limited` và remaining cities `skipped_after_rate_limit`
- [x] Added mock-only unit tests cho Goong/provider/rate-limit behavior (9 tests)

### Real Generate Smoke
- [x] Real Goong REST API smoke: HTTP 200 với `GoongClient.autocomplete("Hà Nội")`, no DB write
- [x] Real Gemini generate smoke cho Hà Nội + TP.HCM, verify HTTP 201, schema, persistence
  - Hà Nội: HTTP 201, ~37.4s, 2 days, 10 activities, trip_id=236 persisted
  - TP.HCM: HTTP 201, ~38.7s, 2 days, 10 activities, trip_id=237 persisted
- [x] Redis AI quota key count after smoke: 2 (correct)
- [x] Backend tests after smoke: 115 unit + 37 integration pass

### Security/Docs Cleanup
- [x] Cleanup temp token/payload files từ local smoke testing
- [x] Verify no raw secrets (JWT/API keys) in tracked docs
- [x] Fix typo: `GENERATE_SMOCK_COMPLETE` → `GENERATE_SMOKE_COMPLETE`
- [x] Add security notes, technical limitations notes, no-overclaim section
- [x] Update docs/REPORTS và issues liên quan

### Deleted Obsolete Files
- [x] `Backend/test_api.py` — manual httpx test script, superseded by pytest integration tests
- [x] `Backend/test_full_api.py` — manual urllib test script, superseded by pytest integration tests

## Cách kiểm tra

### Backend Static/Tests

```bash
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit -q
uv run pytest tests/integration -q
```

**Expected results:**
- ruff check: PASS (`All checks passed!`)
- ruff format: PASS (`88 files already formatted`)
- unit tests: PASS (`115 passed`)
- integration tests: PASS (`37 passed, 7 skipped`)

### Evidence đã verify

**Goong live smoke (Phase 2E):**
- HTTP 200 với `GoongClient.autocomplete("Hà Nội")`
- No DB write (smoke only)
- Report: `docs/REPORTS/00052_goong_live_smoke_result.md`

**Multi-city local import (Phase 3 Consolidated):**
- 6 cities: Hà Nội, TP.HCM, Đà Nẵng, Hội An, Huế, Nha Trang
- 414 places (64-73 per city), 11 hotels
- 100% lat/lng coverage, 100% external_id coverage
- Report: `docs/REPORTS/00052_multicity_real_import_result.md`

**Backend API verification:**
- `GET /api/v1/places/destinations` → returns 6 cities
- `GET /api/v1/places/destinations/{slug}` → returns places array
- city search với URL-encoded Vietnamese names (e.g., `H%E1%BB%99i%20An`)

**Real generate smoke (Phase 4B):**
- Hà Nội: HTTP 201, latency ~37.4s, 2 days, 10 activities, trip_id=236 persisted
- TP.HCM: HTTP 201, latency ~38.7s, 2 days, 10 activities, trip_id=237 persisted
- Redis AI quota key `rate:ai:user:276:20260530` count = 2 (correct)
- Report: `docs/REPORTS/00052_real_generate_smoke_result.md`

## Lưu ý / Scope giới hạn

### NOT_IMPLEMENTED in this PR
- ❌ Scheduler/deploy ETL: `PLANNED_NOT_IMPLEMENTED` (deferred to Phase 5)
- ❌ Production Supabase data import (local only)
- ❌ FE/browser generate UX testing (BE-only)
- ❌ Guest flow testing (authenticated user only)
- ❌ Route/geography sanity fully tested (requires Goong Directions API)
- ❌ TC429 stress test (only 2 calls, no forced 429)
- ❌ Budget optimization testing (cost estimation only)
- ❌ LLM hallucination deep testing (basic schema validation only)
- ❌ C3/C4 implementation and testing

### Partial Scope
- ⚠️ Chỉ 2/6 city được real Gemini generate smoke (Hà Nội, TP.HCM)
- ⚠️ 4 cities còn lại (Đà Nẵng, Hội An, Huế, Nha Trang) chưa verify với real Gemini

### Files không commit (artifacts)
- `Backend/etl_output.log` (deleted)
- `Frontend/.build-tmp/` (build cache)
- `Frontend/playwright-report/` (test artifacts)
- `Frontend/tests/e2e/b3/` (test artifacts)
- local DB generated trips (trip_id=236, 237 — local Docker only)

## Files changed

### ETL Source
- `Backend/src/etl/base_extractor.py` — Added `MaxRetriesExceededError`
- `Backend/src/etl/loaders/db_loader.py` — Minor fixes
- `Backend/src/etl/runner.py` — Rate limit stop/skip behavior
- `Backend/src/geo/goong_client.py` — Provider error propagation

### Tests
- `Backend/tests/unit/test_goong_api_key_error.py` — New (Goong API key error tests)
- `Backend/tests/unit/test_rate_limit_behavior.py` — New (rate limit propagation tests)
- `Backend/test_api.py` — Deleted (obsolete manual script)
- `Backend/test_full_api.py` — Deleted (obsolete manual script)

### Docs/Reports
- `docs/REPORTS/REPORT.md` — Updated readiness summary
- `docs/REPORTS/generate_pipeline_readiness.md` — Added Phase 4B evidence
- `docs/REPORTS/phase_c3_data_coverage_verification.md` — Updated C3 readiness
- `docs/REPORTS/00052_deployment_etl_strategy.md` — New (deployment planning)
- `docs/REPORTS/00052_etl_quota_and_data_expansion_plan.md` — New (ETL plan)
- `docs/REPORTS/00052_goong_live_smoke_result.md` — New (Goong API smoke)
- `docs/REPORTS/00052_hanoi_real_import_result.md` — New (Hà Nội import)
- `docs/REPORTS/00052_multicity_real_import_result.md` — New (6-city import)
- `docs/REPORTS/00052_real_generate_smoke_result.md` — New (Gemini smoke)

### Issues
- `docs/REPORTS/ISSUES/issue_etl_rate_limit_stop_not_implemented.md` — New (RESOLVED)
- `docs/REPORTS/ISSUES/issue_goong_quota_blocks_bulk_etl.md` — New (rate limit analysis)
- `docs/REPORTS/ISSUES/issue_etl_scheduler_missing.md` — Updated
- `docs/REPORTS/ISSUES/issue_multicity_etl_required_before_multicity_generate.md` — Updated

## Next recommended branches (after PR merge)

Priority order:
1. `test/00055-c-fullstack-regression-verification` — FE/browser validation before production
2. `feat/00052-deploy-etl-scheduler` — Implement Render Cron job for scheduled ETL
3. `feat/00053-c-generate-pipeline-hardening` — Geography/budget optimization if quality issues appear

C3/C4 implementation should wait until generate is fully stable with browser validation.

---

**Generated**: 2026-05-30
**Branch**: `feat/00052-c-etl-goong-data-expansion`
**Status**: READY_FOR_MERGE
