## Mô tả

Audit design readiness trước khi implement Phase C3 (companion chat) và C4 (chat history).

PR này **không implement C3/C4 feature**. Mục tiêu là tạo bộ báo cáo evidence-based từ real API và browser testing để team biết C3/C4 đã sẵn sàng chưa, gap nào cần fix trước, và branch roadmap ra sao.

- Task ID: [#00050]

## Loại PR

Audit/readiness documentation PR. Không có thay đổi runtime code.

## Thay đổi chính

### Reports tạo/update

- [x] `generate_pipeline_readiness.md` — **Updated**: PARTIALLY_READY (B2 evidence: Hà Nội small PASS, large timeout, TP.HCM/Đà Nẵng 422)
- [x] `rate_limit_policy_review.md` — **Updated**: B2 confirmed working, FE UX gap added
- [x] `auth_authorization_use_cases_for_c3.md` — **Updated**: B2/B3 evidence added
- [x] `phase_c3_design_readiness.md` — 4 design gaps, verification evidence added
- [x] `phase_c3_data_readiness.md` — Goong/ETL readiness summary
- [x] `phase_c3_verification_results.md` — **Updated**: B3 browser evidence, final readiness
- [x] `phase_c3_data_coverage_verification.md` — **Updated**: B2 DB evidence, FE static list gap
- [x] `browser_flow_test_plan_for_c3.md` — **NEW**: B3 Playwright evidence
- [x] `test_strategy_gap_analysis.md` — **NEW**: Gap matrix với 8 risk areas
- [x] `REPORT.md` — **Updated**: B1.5/B2/B3 evidence, full issue list

### Issues tạo/update

- [x] `issue_fe_generic_error_masks_backend_error.md` — **NEW**: B3 confirmed, HIGH priority
- [x] `issue_destination_selector_not_db_backed.md` — **NEW**: B3 confirmed, HIGH priority
- [x] `issue_multicity_etl_required_before_multicity_generate.md` — **NEW**: B2 confirmed, HIGH priority
- [x] `issue_gemini_timeout_large_prompt.md` — **NEW**: B2 confirmed, HIGH priority
- [x] `issue_rate_limit_testing_and_ux.md` — **NEW**: B2/B3 confirmed, MEDIUM priority
- [x] `issue_observability_trace_missing.md` — **NEW**: B1.5 confirmed, MEDIUM priority
- [x] `issue_etl_scheduler_missing.md` — **NEW**: B1.5 confirmed, MEDIUM priority
- [x] `issue_overlap_trip_policy_not_verified.md` — **NEW**: not tested, MEDIUM priority
- [x] `issue_fe_error_handling_generic.md` — existing, updated with B3 evidence
- [x] `issue_browser_smoke_blocked.md` — existing, superseded by B3 Playwright runs
- [x] `c3_stale_patch_handling_missing.md` — existing
- [x] `c3_chat_quota_shared_with_generate.md` — existing

## Blockers Found (Real Evidence)

| Blocker | Severity | Evidence | Issue |
|---|---|---|---|
| Multi-city data missing (TP.HCM, Đà Nẵng) | HIGH | B2: 422 for all non-Hanoi cities | `issue_multicity_etl_required_before_multicity_generate.md` |
| FE generic error masks backend reason | HIGH | B3: UI shows generic for 422/429/503 | `issue_fe_generic_error_masks_backend_error.md` |
| Gemini timeout on large prompt | HIGH | B2: 3 ngày + 3 interests → 503 | `issue_gemini_timeout_large_prompt.md` |
| Destination selector not DB-backed | HIGH | B3: static list, user can pick unsupported city | `issue_destination_selector_not_db_backed.md` |
| ETL manual only | MEDIUM | B1.5: no cron/schedule | `issue_etl_scheduler_missing.md` |
| Observability partial | MEDIUM | B1.5: no request_id | `issue_observability_trace_missing.md` |

## Cách kiểm tra (Testing)

### Bước 1: Review reports

```bash
git log --oneline main..HEAD
```

### Bước 2: Đọc reports chính

```
docs/REPORTS/phase_c3_verification_results.md   # Final readiness
docs/REPORTS/test_strategy_gap_analysis.md       # Gap matrix
docs/REPORTS/browser_flow_test_plan_for_c3.md    # B3 evidence
docs/REPORTS/generate_pipeline_readiness.md      # B2 evidence
docs/REPORTS/REPORT.md                           # Index
```

### Bước 3: Kiểm tra không có code C3/C4

```bash
git diff main...HEAD -- "Backend/src/**" "Frontend/src/**"
```

### Bước 4: Real verification results

| Gate | Status | Evidence |
|---|---|---|
| BE lint + format | ✅ PASS | `uv run ruff check src tests` |
| BE unit (97 tests) | ✅ PASS | `uv run pytest tests/unit/ -q` |
| BE integration (37 tests) | ✅ PASS | `uv run pytest tests/integration/ -q` |
| HTTP /health | ✅ 200 | B2 |
| Generate Hà Nội small | ✅ 201 | B2: trip_id=234/235 |
| Generate Hà Nội large | ❌ 503 timeout | B2: 3 ngày + 3 interests |
| Generate TP.HCM | ❌ 422 | B2: destination missing |
| TripWorkspace render | ✅ PASS | B3: trip_id=235 |
| FE error visibility | ❌ FAIL | B3: generic error |
| FloatingAIChat | ⏸️ NOT_VISIBLE | B3: C3 not implemented |

## Kết quả mong đợi

- Branch name đúng format: `docs/00050-c-c3-design-readiness-audit`
- Không có thay đổi business logic
- Không implement C3/C4
- Reports evidence-based với real API và browser test results
- Issues rõ ràng, prioritized, có suggested fix

## Lưu ý khác

- Không có thay đổi `.env`
- Không có migration/schema change
- Không có API contract change
- Playwright test files tại `Frontend/tests/e2e/b3/` (untracked — không commit)
- Screenshots tại `Frontend/tests/e2e/b3/screenshots/` (untracked — không commit)

## C3/C4 Phase Contract (verified)

- [x] companion chat là trip-bound, không phải global chatroom
- [x] C3 MVP dùng REST, không WebSocket/SSE
- [x] Chat trả proposedOperations, không tự persist itinerary
- [x] companion_service.py nằm trong src/itineraries/, không trong src/agent/
- [x] apply-patch có owner-check
- [x] Guest phải claim trip trước khi chat

## Recommended Next Branches (Historical)

**Note**: This was the recommended roadmap after PR 00050 (2026-05-28). Task numbering was later updated to avoid conflicts - see current roadmap in REPORT.md.

```
Priority 1: fix/00050-x-fe-error-visibility        # FE error messages → Became fix/00051-c-fe-error-visibility (DONE 2026-05-29)
Priority 2: feat/00057-c-etl-goong-data-expansion  # Multi-city data → Became feat/00052-c-etl-goong-data-expansion
Priority 3: feat/00051-c-c3-chat-session-foundation # C3 CRUD foundation → Became feat/00056-c-c3-chat-session-foundation
```
