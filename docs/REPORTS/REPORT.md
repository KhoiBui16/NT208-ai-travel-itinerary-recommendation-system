# Báo Cáo Tổng Quan — Phase C3/C4 Design Readiness Audit

Ngày báo cáo: 2026-05-28  
Branch báo cáo: `docs/00050-c-c3-design-readiness-audit`

## Phase C3/C4 Readiness Audit Reports

| File | Nội dung |
|---|---|
| [phase_c3_design_readiness.md](phase_c3_design_readiness.md) | Tổng hợp: design gaps, branch roadmap, C3/C4 readiness |
| [generate_pipeline_readiness.md](generate_pipeline_readiness.md) | Audit C.1 generate pipeline — **PARTIALLY_READY** (B2 evidence) |
| [rate_limit_policy_review.md](rate_limit_policy_review.md) | Rate limit auth vs guest — B2 confirmed working, FE UX gap |
| [auth_authorization_use_cases_for_c3.md](auth_authorization_use_cases_for_c3.md) | Auth/AuthZ checklist — B2/B3 evidence added |
| [phase_c3_data_readiness.md](phase_c3_data_readiness.md) | Goong/ETL readiness summary |
| [phase_c3_verification_results.md](phase_c3_verification_results.md) | Real verification: BE tests, HTTP smoke, B2/B3 evidence |
| [browser_flow_test_plan_for_c3.md](browser_flow_test_plan_for_c3.md) | **B3 Playwright evidence**: TP.HCM error, workspace render, date picker |
| [test_strategy_gap_analysis.md](test_strategy_gap_analysis.md) | Gap matrix — mock AI, FE-BE contract, data, browser UX |
| [00051_fe_error_visibility_results.md](00051_fe_error_visibility_results.md) | 2026-05-29: FE error visibility + destination selector backend integration — RESOLVED_FOR_SCOPE |

## 00052 ETL Goong Data Expansion Reports

| File | Nội dung |
|---|---|
| [00052_etl_quota_and_data_expansion_plan.md](00052_etl_quota_and_data_expansion_plan.md) | ETL quota analysis, Phase 2B/2C/2D/2E/3A/3A-R summary, expansion strategy |
| [00052_goong_live_smoke_result.md](00052_goong_live_smoke_result.md) | Phase 2E: REST API key validation, HTTP 200 OK |
| [00052_hanoi_real_import_result.md](00052_hanoi_real_import_result.md) | Phase 3A: Hà Nội real import, idempotency, API verification |
| [00052_deployment_etl_strategy.md](00052_deployment_etl_strategy.md) | Phase 3A-R: Production deployment planning (Vercel/Render/Supabase) |
| [00052_multicity_real_import_result.md](00052_multicity_real_import_result.md) | Phase 3 Consolidated: 6 cities, 414 places, rate limit behavior |
| [00052_real_generate_smoke_result.md](00052_real_generate_smoke_result.md) | Phase 4B: 2-city real Gemini generate smoke, HTTP 201, persistence verified |

## 00056 Calendar + Generate Flow Unblock

| File | Nội dung |
|---|---|
| [00056_calendar_generate_flow_fix_result.md](00056_calendar_generate_flow_fix_result.md) | 2026-05-30: CalendarModal click timeout bug fix + browser regression — **FIX_COMPLETE** |
| [pr_00056_description.md](pr_00056_description.md) | PR body template for fix/00056 |

**Key findings:**
- CalendarModal bug fixed: Added `pointer-events-auto` + `stopPropagation` to modal content
- All 4 Playwright tests pass (Flow A, B, C, Debug) with 0 console errors
- 10-city readiness verified: 9 cities READY, Đà Lạt MARGINAL (10 places < 30 threshold)
- Backend API limitation: `/api/v1/places/destinations` lacks `placesCount/isGenerateReady` metadata
- Build status: Default build EPERM (local file lock), alternate build PASS (7.79s)

## 00057 Destination Data Quality Advisory

| File | Nội dung |
|---|---|
| [00057_destination_readiness_contract_result.md](00057_destination_readiness_contract_result.md) | 2026-05-30: Backend readiness contract + Frontend advisory UX — **FIX_COMPLETE** |
| [pr_00057_description.md](pr_00057_description.md) | PR body template for fix/00057 |
| [../ISSUES/issue_destination_selector_not_db_backed.md](ISSUES/issue_destination_selector_not_db_backed.md) | Issue — RESOLVED |

**Key findings:**
- Backend: All destinations have `isGenerateReady=true` (allowed to attempt generate)
- Backend: `readinessStatus` = "ready" | "partial" | "sparse" (advisory, not submit gate)
- Backend: `readinessReason` is advisory message, NOT "chọn thành phố khác"
- Frontend: Removed blocking logic — partial/sparse cities allowed to submit
- Frontend: Shows ⚠️ icon for partial cities as data quality indicator
- Cache: Bumped to `destinations:all:v2` to invalidate old blocking semantics
- Product principle: City đã nằm trong backend API phải cho phép user chọn và submit. Warning chỉ là advisory.

## 00058A Auth/Guest/Rate-limit/Claim Audit

| File | Nội dung |
|---|---|
| [00058a_auth_guest_rate_limit_claim_audit.md](00058a_auth_guest_rate_limit_claim_audit.md) | 2026-05-31: Sub-agents + comprehensive auth/guest/rate-limit/claim audit — **AUDIT_COMPLETE** |
| [pr_00058a_description.md](pr_00058a_description.md) | PR body template for chore/00058A |

**Key findings:**
- ✅ Auth/JWT/refresh flow hoạt động đúng
- ✅ Guest generate với claim token hoạt động đúng
- ⚠️ Guest rate limit có thể bypass qua UA spoofing (known issue)
- ⚠️ Guest không bị limit số trips (orphan trips accumulate)
- ⚠️ FE không phân biệt 429 với các lỗi khác
- ❌ Không có E2E test verify 429 behavior
- ❌ Không có E2E test verify double-click protection

**Sub-agents created:**
- `product-flow-reviewer.md` - User journey mapping
- `backend-auth-rate-limit-auditor.md` - Auth/quota/abuse audit
- `frontend-e2e-ux-tester.md` - E2E/UX review
- `docs-sync-reviewer.md` - Docs sync + local IP scan

**Recommended next**: `fix/00058-b-auth-guest-rate-limit-claim-regression`

## 00058B AI Rate-limit Headers và Auth Guest Claim Regression

| File | Nội dung |
|---|---|
| [00058b_auth_guest_rate_limit_claim_regression.md](00058b_auth_guest_rate_limit_claim_regression.md) | 2026-05-31: **FIXED** guest remaining headers + documented calendar modal limitation — **READY** |
| [pr_00058b_description.md](pr_00058b_description.md) | PR body template for fix/00058 |

**Critical fix:**
- ✅ FIXED: Guest success responses now return accurate `X-RateLimit-Remaining` (was fake 0)
- ✅ Backend: Added `get_remaining_for_actor` method for accurate guest remaining
- ✅ Backend: Router uses actual guest remaining instead of fake object
- ✅ Backend: Unit tests verify guest remaining calculation (2 new tests)
- ✅ Backend: All 119 unit tests pass
- ✅ Frontend: Build passes (no TypeScript errors)
- ✅ E2E: Document calendar modal limitation honestly (4/4 tests pass)

**Limitation documented:**
- ⚠️ Full E2E 429 UX verification blocked by pre-existing calendar modal issue
- ⚠️ 00056/00057 tests also fail due to same calendar modal issue
- ⚠️ NOT caused by 00058B changes — verified by running 00056/00057

**Evidence:**
```
Backend unit tests: 119/119 PASS
Frontend build: PASS (10.37s)
E2E 00058: 4/4 PASS
00056 test: SKIP (1 enabled button, pre-existing)
00057 test: FAIL (calendar modal, pre-existing)
```
- ✅ Frontend: CreateTrip có double-click protection
- ✅ Tests: 2 unit tests cho rate limit exception metadata
- ✅ Tests: E2E test cho 429 behavior và double-click protection

**Deferred items (documented as issues):**
- Guest cookie fingerprint hardening (P1) — Requires security review
- AI generate idempotency key (P1) — Requires design discussion
- C3 chat quota separation (P2) — C3 not implemented yet

**Rate Limit Contract implemented:**
```http
# Request headers (always present after successful generate)
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 2026-05-31T23:59:59+07:00

# 429 Response headers
X-RateLimit-Limit: 3
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 2026-05-31T23:59:59+07:00
Retry-After: 3600

# 429 Response body
{
  "detail": "Bạn đã dùng hết 3 lượt tạo lịch trình AI hôm nay. Hạn mức sẽ được đặt lại lúc 23:59 UTC.",
  "error_code": "RATE_LIMIT_EXCEEDED",
  "status_code": 429,
  "limit": 3,
  "remaining": 0,
  "reset_at": "2026-05-31T23:59:59+07:00",
  "retry_after_seconds": 3600
}
```

**Files changed:** 11 files (3 BE source, 1 BE test, 3 FE source, 1 FE test, 3 docs)

**Test status:**
- Backend lint (ruff): ✅ PASS
- Backend format (ruff): ✅ PASS
- Backend unit (rate_limiter): ✅ PASS (4 passed, 0.83s)
- Backend unit (all): ✅ PASS (117 passed)
- Frontend build: ⚠️ PENDING
- E2E 00058 tests: ⚠️ PENDING

## 00059A Calendar Modal E2E Blocker Fix

| File | Nội dung |
|---|---|
| [00059a_calendar_modal_e2e_blocker_fix.md](00059a_calendar_modal_e2e_blocker_fix.md) | 2026-05-31: Calendar helper with month navigation — **COMPLETE** |
| [pr_00059a_description.md](pr_00059a_description.md) | PR body template for fix/00059 |
| [../ISSUES/issue_calendar_modal_enabled_date_buttons_e2e_blocker.md](ISSUES/issue_calendar_modal_enabled_date_buttons_e2e_blocker.md) | Issue — **RESOLVED** |

**Root cause identified:**
- ✅ **Test helper bug**, not UI bug
- ✅ CalendarModal already has prevMonth/nextMonth buttons (UI correct)
- ✅ Tests only looked at current month (automation limitation)
- ✅ When test runs on May 31, only 1 day enabled in current month

**Solution implemented:**
- ✅ Created reusable calendar helper (`tests/e2e/helpers/calendar.ts`)
- ✅ Helper automatically detects < 2 enabled days in current month
- ✅ Clicks next month button to navigate to future months
- ✅ Retries up to 3 months (current + next 2)
- ✅ Selects date range and verifies modal closes

**Test results:**
| Test | Before | After |
|---|---|---|
| 00056 | ⚠️ SKIP | ✅ PASS (01/06/2026 → 02/06/2026) |
| 00057 | ⚠️ SKIP | ✅ PASS (Đà Lạt partial city allowed to submit) |
| Full suite | 9 PASS / 13 SKIP / 0 FAIL | 11 PASS / 11 SKIP / 0 FAIL |

**Files changed:** 6 files (3 FE test, 3 docs)

**Test status:**
- Frontend build: ✅ PASS (10.10s)
- 00056 test: ✅ PASS
- 00057 test: ✅ PASS
- 00058 test: ✅ PASS (4/4)
- Full e2e: ✅ PASS (11/11, 11 skip auth/trips)
- Backend lint: ✅ PASS
- Backend format: ✅ PASS
- Backend unit: ✅ PASS (119)

**Console output success:**
```
Month 1: Not enough enabled days (1), trying next month
[Calendar Helper] Modal closed after 0ms
[Calendar Helper] Date input text after selection: "01/06/2026 — 02/06/2026"
✓ Successfully selected date range: 01/06/2026 → 02/06/2026
```

## 00059B Full User Journey UAT + Manual Run Guide

| File | Nội dung |
|---|---|
| [00059b_full_user_journey_uat.md](00059b_full_user_journey_uat.md) | 2026-06-01: Full user journey UAT, source coverage, local run guide evidence — **PARTIAL_READY_FOR_00060** |
| [../USER_JOURNEY_UAT.md](../USER_JOURNEY_UAT.md) | Product-level guest/auth/error journey matrix |
| [../LOCAL_MANUAL_UAT_GUIDE.md](../LOCAL_MANUAL_UAT_GUIDE.md) | PowerShell-safe local manual UAT guide |
| [pr_00059b_description.md](pr_00059b_description.md) | PR body template for docs/00059B |
| [ISSUES/issue_nested_trip_subresource_membership_authz_gap.md](ISSUES/issue_nested_trip_subresource_membership_authz_gap.md) | Issue — **OPEN / HIGH** |

**UAT results:**
- ✅ Backend ruff check + format check pass
- ✅ Backend unit tests pass: 119 passed
- ✅ Alembic upgrade/check pass
- ✅ Backend integration tests pass: 44 passed
- ✅ Frontend build pass with alternate `.build-tmp` outDir
- ✅ Full Playwright suite pass: 19 passed, 3 skipped
- ✅ 00059A calendar helper confirmed merged into `main`

**Readiness decision:**
- `00060 — Architecture/System Review before C3/C4`: YES, proceed as review phase.
- C3/C4 implementation-heavy work: NO direct start until nested activity/accommodation authz gap is fixed or explicitly triaged.

Historical sections above and below are phase snapshots. Current 00059B readiness supersedes older calendar-blocker wording and older test-count summaries.

## 00059C Real End-user Manual UAT

| File | Nội dung |
|---|---|
| [00059c_real_end_user_manual_uat.md](00059c_real_end_user_manual_uat.md) | 2026-06-01: Real browser/API end-user evidence for homepage, claim, auth, workspace, edit persistence, share, and error UX — **PARTIAL_READY_FOR_00060** |
| [pr_00059c_description.md](pr_00059c_description.md) | PR body template for docs/00059C |
| [../USER_JOURNEY_UAT.md](../USER_JOURNEY_UAT.md) | Updated with latest real-manual-evidence statuses |
| [ISSUES/issue_nested_trip_subresource_membership_authz_gap.md](ISSUES/issue_nested_trip_subresource_membership_authz_gap.md) | Concrete exploit evidence added — **OPEN / HIGH** |

**Manual UAT highlights:**
- ✅ Real browser: homepage CTA/product understanding
- ✅ Real browser: guest claim after auth
- ✅ Real browser: register/login/logout/session
- ✅ Real browser: trip library/workspace load
- ✅ Real browser: activity edit persists after reload
- ✅ Real browser: share link + public shared read-only route
- ⚠️ Mocked-only by policy: generate success, 429 UX, backend 422 mapping, 503 UX
- ❌ API reproduction: nested subresource ownership bypass is actively exploitable

**Readiness decision:**
- `00060` review phase: YES
- Direct C3/C4 implementation-heavy work: NO
- Recommended next: `00060A — Fix nested subresource authz gap`, then `00060B — Architecture/System Review + Go/No-Go before C3/C4`

## 00060A Nested Trip Subresource Authz Fix

| File | Nội dung |
|---|---|
| [00060a_nested_subresource_authz_fix.md](00060a_nested_subresource_authz_fix.md) | 2026-06-01: Backend security fix for mixed-ID nested trip mutation exploit — **FIXED** |
| [pr_00060a_description.md](pr_00060a_description.md) | PR body template for fix/00060 |
| [ISSUES/issue_nested_trip_subresource_membership_authz_gap.md](ISSUES/issue_nested_trip_subresource_membership_authz_gap.md) | Issue updated from **OPEN / HIGH** to **RESOLVED** |

**Security fix summary:**
- ✅ Added trip-bound repository lookups for nested activities and accommodations
- ✅ Blocked mixed-ID cross-trip activity update (`404`)
- ✅ Blocked mixed-ID cross-trip activity delete (`404`)
- ✅ Blocked mixed-ID cross-trip accommodation delete (`404`)
- ✅ Kept valid owner mutations working (`200` / `204`)
- ✅ Kept direct trip owner mismatch behavior unchanged (`403`)
- ✅ Full backend lint/unit/integration pass after the fix

**Readiness decision:**
- `00060B — Architecture/System Review + Go/No-Go before C3/C4`: YES
- This specific ownership-bypass blocker no longer blocks the architecture review phase

## 00060B Architecture/System Review + Go/No-Go before C3/C4

| File | Nội dung |
|---|---|
| [00060b_architecture_c3_c4_readiness.md](00060b_architecture_c3_c4_readiness.md) | 2026-06-01: Product-aware architecture review, C3/C4 readiness decision, and phased implementation plan — **GO_WITH_LIMITATIONS** |
| [../ARCHITECTURE_C3_C4_READINESS.md](../ARCHITECTURE_C3_C4_READINESS.md) | Kiến trúc hiện tại, ownership model, quota/error review, và readiness decision |
| [../C3_C4_IMPLEMENTATION_PLAN.md](../C3_C4_IMPLEMENTATION_PLAN.md) | Chia nhỏ C3A/C3B/C3C/C4A/C4B theo backend/frontend/tests/exit criteria |
| [pr_00060b_description.md](pr_00060b_description.md) | PR body template for docs/00060B |

**Key findings:**
- ✅ `00059C` đã chứng minh các flow end-user cốt lõi của sản phẩm đã được manual UAT bằng browser/API thật
- ✅ `00060A` đã resolve nested trip subresource authz gap, nên ownership model hiện tại đủ an toàn để bắt đầu phase foundation cho chat
- ✅ Source hiện tại đã có schema `chat_sessions` + `chat_messages`; C3A không cần dựng lại toàn bộ data model từ đầu
- ✅ `TripWorkspace` là điểm gắn companion chat đúng nhất vì đã có `tripId`, itinerary context, và owner-only access
- ⚠️ `FloatingAIChat` hiện chỉ là mock UI, chưa trip-aware và chưa gọi API thật
- ⚠️ Chat quota riêng chưa được tách khỏi generate quota; đây là risk mở cho `C3B`
- ⚠️ Stale patch handling vẫn là design gap mở cho giai đoạn apply-patch
- ⚠️ `docs/05_database_etl.md` còn drift ở migration-history line cho chat tables; source hiện tại mới là current truth

**Readiness decision:**
- `C3A — Chat Session Foundation`: YES
- `C3B — Companion Chat API`: NO direct start
- `C4 — Chat History`: NO direct start
- Overall: `GO_WITH_LIMITATIONS`

## 00060C Source/Docs/README Sync + C3A Entry Gate

| File | Nội dung |
|---|---|
| [00060c_source_docs_readme_sync_c3a_entry_gate.md](00060c_source_docs_readme_sync_c3a_entry_gate.md) | 2026-06-01: Source-vs-docs audit, README/docs/report sync, và C3A entry gate — **SYNCED_FOR_C3A** |
| [pr_00060c_description.md](pr_00060c_description.md) | PR body template for docs/00060C |
| [../ARCHITECTURE_C3_C4_READINESS.md](../ARCHITECTURE_C3_C4_READINESS.md) | Kiến trúc hiện tại sau khi sync lại docs drift |
| [../C3_C4_IMPLEMENTATION_PLAN.md](../C3_C4_IMPLEMENTATION_PLAN.md) | Risk-to-phase mapping và C3A non-goals rõ hơn |

**Key findings:**
- ✅ Source code, `README.md`, technical docs, và report index đã được sync lại với current truth sau `00060A` / `00060B`
- ✅ Chat tables được ghi đúng là đã nằm trong initial migration; không còn docs drift kiểu "future chat migration on main"
- ✅ `FloatingAIChat` vẫn được document rõ là mock local-state; `C3A` phải thay/wrap nó thành session-aware placeholder
- ✅ `C3A` vẫn là next allowed phase
- ⚠️ Chat quota riêng, real provider smoke, và stale patch handling vẫn là risk mở nhưng không block `C3A`

**Entry-gate decision:**
- Source/docs/README sync: `SYNCED`
- `C3A — Chat Session Foundation`: YES
- `C3B — Companion Chat API`: NO direct start
- `C4 — Chat History`: NO direct start

## 00060D Real Fullstack Run + End-user C3A Entry Verification

| File | Nội dung |
|---|---|
| [00060d_real_fullstack_c3a_entry_verification.md](00060d_real_fullstack_c3a_entry_verification.md) | 2026-06-02: Real FE-BE local startup, real Gemini smoke, live hardening evidence, và pre-C3A UX blocker fixes — **C3A_READY_AFTER_PRE_C3A_HARDENING** |
| [pr_00060d_description.md](pr_00060d_description.md) | PR body template for docs/00060D |
| [../C3_C4_IMPLEMENTATION_PLAN.md](../C3_C4_IMPLEMENTATION_PLAN.md) | Updated with runtime notes for pre-C3A chat-context hardening, real Gemini smoke, and actual `429/503` baseline |
| [../README.md](../README.md) | Updated with rate-limit/share/C3A boundary hardening and latest live UAT snapshot |

**Key findings:**
- ✅ Real fullstack startup pass: DB, Redis, backend health, frontend dev server
- ✅ Real Gemini generate smoke pass for auth user (`201`, ~31s), and resulting workspace renders correctly
- ✅ Real browser flow pass for home, create-trip, login/register, trip-library, workspace, share view, and protected-route redirect
- ✅ Runtime verified that partial destination advisory (`Đà Lạt`) still works as advisory-only
- ✅ Trip edit persistence pass after browser reload on real workspace data
- ✅ Public shared view has no owner controls and no floating chat trigger
- ✅ Actual `429` generate contract verified with real headers/body without spending Gemini quota
- ✅ Actual browser `503` timeout UX verified through controlled provider-timeout path
- ✅ Pre-C3A frontend fix removed hardcoded `Hà Nội` from `FloatingAIChat`; context now derives from current trip
- ✅ Browser `429` submit path is now covered by a dedicated Playwright regression without burning Gemini quota
- ⚠️ `FloatingAIChat` is still only a mock UI and not yet session-aware/API-backed

**Entry-gate decision:**
- Fullstack startup: `PASS`
- End-user flow: `PASS`
- `C3A — Chat Session Foundation`: YES
- `C3B — Companion Chat API`: NO direct start
- `C4 — Chat History`: NO direct start

## 00060E Final Docs Sync + Mermaid Render Fix

| File | Nội dung |
|---|---|
| [00060e_final_docs_sync_mermaid_fix.md](00060e_final_docs_sync_mermaid_fix.md) | 2026-06-02: Final docs-only sync before `C3A`, fix GitHub Mermaid ERD render blocker, thêm README diagram explanations, và re-check active docs truth — **DOCS_SYNCED_FOR_C3A** |
| [pr_00060e_description.md](pr_00060e_description.md) | PR body template for docs/00060E |
| [../README.md](../README.md) | Mermaid ERD updated to GitHub-compatible attribute syntax; key diagrams now have concise reading guides |

**Key findings:**
- ✅ GitHub Mermaid ERD blocker fixed: multi-key attributes of the form `FK` + `UK` were replaced with `FK "unique"` comments, preserving data-model semantics
- ✅ README now includes a short `Cách đọc ERD` section so reviewer can understand one-to-one constraints, guest-claim hashing, and why `FK "unique"` appears in Mermaid
- ✅ README now adds short explanations after the important Mermaid blocks for backend/frontend architecture, AI flow, auth/claim flow, and ETL
- ✅ Static scan across active `README.md` + `docs/**/*.md` no longer finds any Mermaid attribute lines with adjacent multi-key markers
- ✅ Mermaid CLI render verification passed for all 14 active Mermaid blocks (`README.md` + `docs/ARCHITECTURE_C3_C4_READINESS.md`)
- ✅ Active docs remain aligned with `00060D-FIX`: `FloatingAIChat` wrong-city fix is documented, browser `429` submit UX is `PASS`, pending claim storage is synced to `sessionStorage (pendingClaim)`, and `C3A` remains the next allowed phase

**Decision:**
- Mermaid ERD render blocker: `FIXED`
- Active docs/source sync before `C3A`: `SYNCED`
- `C3A — Chat Session Foundation`: YES
- After merge, can proceed to `00060F — Staging Deployment Readiness + Deploy`: YES

## 00060F Staging Deployment Readiness + Deploy CI/CD Plan

| File | Nội dung |
|---|---|
| [00060f_staging_deployment_readiness.md](00060f_staging_deployment_readiness.md) | 2026-06-02: Staging deployment inventory, platform decision, Vercel/Render runbook, và manual-first CI/CD recommendation — **READY_FOR_MANUAL_STAGING_PLAN** |
| [pr_00060f_description.md](pr_00060f_description.md) | PR body template for docs/00060F |
| [../STAGING_DEPLOYMENT_GUIDE.md](../STAGING_DEPLOYMENT_GUIDE.md) | Current-source deployment guide for Vercel + Render + managed Postgres/Redis |
| [../README.md](../README.md) | Quick pointer to staging deployment guide |

**Key findings:**
- ✅ Current source fits `Vercel + Render Web Service + managed Postgres + managed Redis` without forcing Docker first
- ✅ Frontend uses `createBrowserRouter`, so SPA rewrite on Vercel is required; `Frontend/vercel.json` has been added for that fallback
- ✅ Backend expects TCP Postgres + TCP Redis via `DATABASE_URL` and `REDIS_URL`; REST-only Redis providers are not source-compatible
- ✅ Render health check can use `/api/v1/health`
- ✅ Manual-first deployment is the least risky next step; auto-deploy should wait until staging URLs, migration flow, and smoke tests are stable
- ⚠️ Current source does not expose a dedicated `ALEMBIC_DATABASE_URL`; if migration needs a different URI, it must be overridden operationally for the migration command only
- ✅ `00060E-R2` is now merged into `main`, so `00060F` can be opened from a clean `main`-based docs branch

**Decision:**
- Recommended staging architecture: `Vercel + Render Python + Render Postgres/Redis`
- Docker required now: `NO`
- Manual staging deploy path: `YES`
- Auto-deploy now: `NO, manual-first`
- Clean PR-to-`main` readiness: `YES`

## B1.5 Observability & ETL Scheduling Audit

| Finding | Status |
|---|---|
| Trace readiness | TRACE_PARTIAL — thiếu request_id, Gemini quota classification |
| Error classification | ERROR_CLASSIFICATION_PARTIAL — 422 không phân biệt destination/places |
| FE error visibility | FE_ERROR_VISIBILITY_IMPROVED — 00051 added status-specific messages |
| ETL scheduling | ETL_MANUAL_ONLY — không có cron/schedule (deployment planned) |
| ETL auditability | ETL_AUDITABILITY_PARTIAL — `destinations.last_etl_at` updated for Hà Nội only (Phase 3A), NULL for other cities |

## B2 Real Generate API Matrix

| Test | Result |
|---|---|
| Hà Nội small input (guest) | ✅ 201, trip_id=234, claimToken PRESENT |
| Hà Nội small input (auth) | ✅ 201, trip_id=235, claimToken NULL |
| Hà Nội large input (3 ngày + 3 interests) | ❌ 503 Gemini timeout |
| TP.HCM | ❌ 422 Destination not found |
| Đà Nẵng | ❌ 422 Destination not found |
| Rate limit (guest/auth 3/day) | ✅ 429 working |

## B3 Browser Flow Verification

| Flow | Result |
|---|---|
| TP.HCM generate error visibility | ❌ FE generic error masks 422 reason |
| TripWorkspace Hà Nội (trip_id=235) | ✅ PASS — 0 errors |
| FloatingAIChat | NOT_VISIBLE — C3 chưa implement |
| Destination suggestions | STATIC — không query API |
| Date picker | PASS — past disabled, 2 dates required |

## Phase C3/C4 Data Coverage Verification

| File | Nội dung |
|---|---|
| [phase_c3_data_coverage_verification.md](phase_c3_data_coverage_verification.md) | **Real DB queries**: 1 city (Hà Nội), 68→73 places (Phase 3A), 3 hotels, 0% quality coverage. Pipeline is SAFE — no hallucination. |
| [phase_c3_data_readiness.md](phase_c3_data_readiness.md) | Goong/ETL readiness summary |
| [phase_c3_verification_results.md](phase_c3_verification_results.md) | Real verification: BE tests pass, HTTP smoke, blocks documented |
| [00052_hanoi_real_import_result.md](00052_hanoi_real_import_result.md) | **NEW** 2026-05-30: Hà Nội real import, idempotency verified, `last_etl_at` updated |

## Phase C3/C4 Data Coverage Issues

| Issue | Priority | Status |
|---|---|---|
| [data_coverage_hanoi_only.md](ISSUES/data_coverage_hanoi_only.md) | HIGH | OPEN |
| [data_coverage_blocks_multi_city_c3.md](ISSUES/data_coverage_blocks_multi_city_c3.md) | HIGH | OPEN |
| [etl_hotels_yaml_test_only.md](ISSUES/etl_hotels_yaml_test_only.md) | MEDIUM | OPEN |
| [goong_directions_api_missing.md](ISSUES/goong_directions_api_missing.md) | MEDIUM | OPEN |
| [c3_stale_patch_handling_missing.md](ISSUES/c3_stale_patch_handling_missing.md) | HIGH | OPEN |
| [c3_chat_quota_shared_with_generate.md](ISSUES/c3_chat_quota_shared_with_generate.md) | HIGH | OPEN |
| [guest_rate_limit_ua_bypass.md](ISSUES/guest_rate_limit_ua_bypass.md) | MEDIUM | KNOWN/OPEN |
| [issue_fe_generic_error_masks_backend_error.md](ISSUES/issue_fe_generic_error_masks_backend_error.md) | **HIGH** | OPEN — B3 confirmed |
| [issue_destination_selector_not_db_backed.md](ISSUES/issue_destination_selector_not_db_backed.md) | **HIGH** | OPEN — B3 confirmed |
| [issue_multicity_etl_required_before_multicity_generate.md](ISSUES/issue_multicity_etl_required_before_multicity_generate.md) | **HIGH** | OPEN — B2 confirmed |
| [issue_gemini_timeout_large_prompt.md](ISSUES/issue_gemini_timeout_large_prompt.md) | **HIGH** | OPEN — B2 confirmed |
| [issue_rate_limit_testing_and_ux.md](ISSUES/issue_rate_limit_testing_and_ux.md) | MEDIUM | OPEN — B2/B3 confirmed |
| [issue_observability_trace_missing.md](ISSUES/issue_observability_trace_missing.md) | MEDIUM | OPEN — B1.5 confirmed |
| [issue_etl_scheduler_missing.md](ISSUES/issue_etl_scheduler_missing.md) | MEDIUM | OPEN — B1.5 confirmed |
| [issue_overlap_trip_policy_not_verified.md](ISSUES/issue_overlap_trip_policy_not_verified.md) | MEDIUM | OPEN — not tested |

## Recommended Branch Roadmap

```
feat/00052-c-etl-goong-data-expansion      # Multi-city ETL (TP.HCM, Đà Nẵng, etc.)
fix/00053-c-generate-pipeline-hardening    # Gemini timeout, context optimization
fix/00054-c-rate-limit-auth-trip-policy    # Chat quota separate, auth trip ownership
test/00055-c-fullstack-regression-verification  # End-to-end browser verification
feat/00056-c-c3-chat-session-foundation   # C3 chat sessions table + API
feat/00057-c-c3-companion-chat-rest        # Companion chat endpoint
feat/00058-c-c3-apply-patch                # Apply-patch endpoint
feat/00059-c-c3-floating-chat-integration  # FE integration
feat/00060-c-c4-chat-history               # Chat history API
```

## Readiness Summary (Updated Phase 4B-R 2026-05-30)

| Component | Status | Evidence |
|---|---|---|
| Generate pipeline (6 cities) | **READY_6_CITIES** | Phase 3 Consolidated: 414 places, all 6 cities pass generate readiness |
| Generate pipeline (remaining 9 cities) | **NOT_READY** | Đà Lạt, Phú Quốc, Hạ Long, Sapa, Cần Thơ, Vũng Tàu, Quy Nhơn, Ninh Bình, Hải Phòng not imported |
| Real generate smoke (2 cities) | **PASS_2_CITIES** | Phase 4B: Hà Nội, TP.HCM generate HTTP 201, ~38s latency, persistence verified |
| Rate limit (generate) | READY | B2: 429 working correctly; Phase 4B: Redis key count verified |
| Rate limit (FE UX) | NOT_READY | B3: generic error for 429 |
| Redis fail-closed | READY | B1.5: confirmed |
| Auth/AuthZ use cases | MOSTLY READY | B2/B3: confirmed for existing flows |
| C3 design | PARTIALLY READY | 4 design gaps remain |
| C4 design | READY (schema) | chat_sessions/chat_messages tables exist |
| C3 data coverage | **PARTIAL_6_CITIES** | Phase 3 Consolidated: 6 cities with 414 places; Phase 4B: 2-city generate smoke PASS |
| Goong/ETL data | **6_CITIES_IMPORTED** | Phase 3 Consolidated: 414 places, 11 hotels, 100% lat/lng; 9 cities rate-limited |
| ETL rate-limit safety | **READY** | Phase 4C-FIX-2: MaxRetriesExceededError propagation, runner stops, skipped cities appended |
| FE error visibility | **IMPROVED** | 00051: status-specific messages added; TC429/TC503 deferred to regression |
| Destination selector | **READY** | 00051: backend API returns 6 cities; FE displays all |
| Observability | PARTIAL | B1.5: no request_id |
| ETL scheduling | **PLANNED_NOT_IMPLEMENTED** | Phase 3A-R: deployment strategy documented (Render Cron); not implemented |
| Scheduler/deploy ETL | **NOT_IMPLEMENTED** | Requires Render Cron job configuration (deferred to Phase 5) |
| FE/browser generate UX | **NOT_TESTED** | Phase 4B: BE-only; browser flow deferred to 00055 |
| Guest flow | **NOT_TESTED** | Phase 4B: authenticated user only |
| TripWorkspace render | READY | B3: trip_id=235 PASS |
| FloatingAIChat | NOT_IMPLEMENTED | B3: not visible |
| C3/C4 readiness | **NOT_READY** | Phase 4B: generate smoke only; C3/C4 not tested |
| TC429 stress test | **NOT_TESTED** | Phase 4B: only 2 calls; no forced 429 test |
| Route/geography sanity | **NOT_FULLY_TESTED** | Requires Goong Directions API (deferred) |
| Budget optimization | **NOT_TESTED** | Cost estimation only |
| LLM hallucination | **NOT_DEEPLY_TESTED** | Basic schema validation only |

## Data Coverage Reality

> **MULTI_CITY_MVP_PHASE1** — 6 cities out of target 20. Phase 3 Consolidated validated: 414 places, 11 hotels, `last_etl_at` updated, idempotency verified. Pipeline SAFE (fails fast, no hallucination). Rate limit blocked remaining 9 cities.

| Tier | Status |
|---|---|
| Minimum MVP (1 city, demo) | ✅ Achieved (exceeded) |
| Multi-city MVP (5 cities) | ✅ **PASS** — 6 cities with 64-73 places each |
| Production (15-20 cities) | ⚠️ **PARTIAL** — 6/15 cities imported, 9 blocked by rate limit |

## Recommended Decision: B (Split Path)

1. `feat/00052-c-etl-goong-data-expansion` — Multi-city ETL (TP.HCM, Đà Nẵng, etc.) ⚠️ **PREREQUISITE**
2. `fix/00053-c-generate-pipeline-hardening` — Gemini timeout, context optimization
3. `fix/00054-c-rate-limit-auth-trip-policy` — Chat quota separate, auth trip ownership
4. `test/00055-c-fullstack-regression-verification` — End-to-end browser verification
5. `feat/00056-c-c3-chat-session-foundation` — C3 CRUD, no data dependency ✅
6. `feat/00057-c-c3-companion-chat-rest` — C3 companion features (after ETL)
7. `feat/00058-c-c3-apply-patch` — Apply-patch endpoint
8. `feat/00059-c-c3-floating-chat-integration` — FE integration
9. `feat/00060-c-c4-chat-history` — C4 CRUD, no city data ✅

---

# Báo Cáo Tổng Quan Post-Merge PR40/PR41

Ngày báo cáo: 2026-05-26  
Branch báo cáo: `docs/00043-d-post-merge-audit-reporting`  
Phạm vi: kiểm tra sau khi `feat: [#00040] add goong-first etl readiness` và `feat: [#00041] add AI generate pipeline` đã merge vào `main`.

## Kết Luận Nhanh

| Hạng mục | Kết quả |
|---|---|
| Local `main` | Đã fast-forward lên `origin/main` commit `5fb4456` |
| Docker services | PostgreSQL và Redis healthy |
| Backend health | `GET /api/v1/health` trả 200 |
| BE lint/format | Pass |
| BE migration | `alembic upgrade head` và `alembic check` pass |
| BE unit tests | 93 passed, 1 deprecation warning |
| BE integration tests | 36 passed, 6 skipped |
| FE e2e | 13 passed after `fix/00044-c-stabilize-c1-guest-flow` |
| FE build | Clean worktree `npm ci && npm run build` pass; local working copy `dist` vẫn bị Windows lock |
| Browser AI smoke | Auth generate 201; seeded guest reload claim 200; guest AI generate blocked by Gemini quota in fix #00044 |
| Guest rate limit | `[422, 422, 422, 429]` bằng destination giả, không gọi Gemini |

## Phase Reports

| File | Nội dung |
|---|---|
| [phase_post_merge_runtime_smoke.md](phase_post_merge_runtime_smoke.md) | Docker, BE, FE, browser smoke, screenshots |
| [phase_frontend_flow.md](phase_frontend_flow.md) | Luồng source FE, API layer, auth/claim/reload |
| [phase_backend_flow.md](phase_backend_flow.md) | Luồng source BE, router/service/repository/storage |
| [phase_ai_generate_pipeline.md](phase_ai_generate_pipeline.md) | C.1 Generate Pipeline, input/output, logs, quota |
| [phase_guest_rate_limit_claim_reload.md](phase_guest_rate_limit_claim_reload.md) | Guest generate, pending claim, reload, rate limit |
| [phase_plan_source_sync.md](phase_plan_source_sync.md) | Map `plan/` với source sau PR40/PR41 |
| [phase_phase_c_remaining_audit.md](phase_phase_c_remaining_audit.md) | Audit phần còn lại của Phase C, branch strategy, env/key needs |
| [phase_c2_suggestion_service.md](phase_c2_suggestion_service.md) | C.2 EP-30 DB-only suggest, tests, API smoke (BE-only, no FE UI) |
| [phase_fix_00044_stabilize_c1_guest_flow.md](phase_fix_00044_stabilize_c1_guest_flow.md) | Fix guest claim reload, FE audit, post-fix gates (13 e2e pass) |
| [pr_00047_description.md](pr_00047_description.md) | PR body template cho feat/00047 C.2 suggestion service |
## Issues

| Issue | Status | Ghi chú |
|---|---|---|
| [frontend_dist_permission_lock.md](ISSUES/frontend_dist_permission_lock.md) | TO DO | Local ignored `Frontend/dist` bị khóa quyền, làm `npm run build` default fail |
| [guest_login_reload_redirect_target_lost.md](ISSUES/guest_login_reload_redirect_target_lost.md) | DONE | Fixed in `fix/00044-c-stabilize-c1-guest-flow` |
| [npm_audit_vulnerabilities.md](ISSUES/npm_audit_vulnerabilities.md) | DONE | `npm audit` now reports 0 vulnerabilities |
| [gemini_resource_exhausted_manual_smoke.md](ISSUES/gemini_resource_exhausted_manual_smoke.md) | TO DO | Guest AI smoke blocked by Gemini provider quota |
| [ruff_cache_permission_warning.md](ISSUES/ruff_cache_permission_warning.md) | TO DO | Ruff pass nhưng không ghi được `.ruff_cache` do quyền local |
| [phase_c_legacy_plan_status_drift.md](ISSUES/phase_c_legacy_plan_status_drift.md) | TO DO | `plan/19_phase_c_overview.md` còn ghi `Chưa bắt đầu` và branch examples cũ |
| [c2_fe_ui_missing.md](ISSUES/c2_fe_ui_missing.md) | TO DO | ActivityDetailModal thiếu nút gợi ý thay thế, `services/agent.ts` chưa có |
| [login_short_password_422.md](ISSUES/login_short_password_422.md) | KNOWN/ACCEPTABLE | Login với password ngắn trả 422 thay 401 — Pydantic validation behavior |
| [integration_test_trip_limit_pollution.md](ISSUES/integration_test_trip_limit_pollution.md) | TO DO | Test pollution: `trip_test@test.com` đạt trip limit → 409 trên local DB |

## Full System Test 2026-05-27

| File | Nội dung |
|---|---|
| [phase_full_system_test_2026_05_27.md](phase_full_system_test_2026_05_27.md) | Kiểm thử toàn hệ thống: BE tests, FE build, Playwright e2e, API smoke, Phase C status |

## Screenshot Evidence

| Screenshot | Ý nghĩa |
|---|---|
| [home.png](assets/2026-05-26/home.png) | Home page load |
| [cities.png](assets/2026-05-26/cities.png) | City list load |
| [city-detail-ha-noi.png](assets/2026-05-26/city-detail-ha-noi.png) | Hà Nội detail load |
| [auth-trip-workspace-136-reload.png](assets/2026-05-26/auth-trip-workspace-136-reload.png) | Auth AI generated trip persisted and reloads |
| [guest-login-pending-137.png](assets/2026-05-26/guest-login-pending-137.png) | Guest redirected to login after generate |
| [guest-claimed-trip-workspace-137.png](assets/2026-05-26/guest-claimed-trip-workspace-137.png) | Guest trip claimed and opened as auth user |
| [fix-00044-auth-generate-workspace.png](assets/2026-05-26/fix-00044-auth-generate-workspace.png) | Auth AI generate through UI after fix branch |
| [fix-00044-seeded-guest-login-before-reload.png](assets/2026-05-26/fix-00044-seeded-guest-login-before-reload.png) | Seeded guest claim present before login reload |
| [fix-00044-seeded-guest-claimed-after-login-reload.png](assets/2026-05-26/fix-00044-seeded-guest-claimed-after-login-reload.png) | Seeded guest claim redirects to workspace after login reload |

## Files Đã Đồng Bộ Trong Branch Này

- `README.md`
- `Backend/README.md`
- `Frontend/README.md`
- `AGENTS.md`
- `.claude/skills/source-plan-sync-review/SKILL.md`
- `Backend/src/itineraries/service.py` stale comment/docstring only
- `docs/REPORTS/**`

Không có thay đổi UI/UX, API contract, DB schema, hoặc business logic trong branch docs này.
