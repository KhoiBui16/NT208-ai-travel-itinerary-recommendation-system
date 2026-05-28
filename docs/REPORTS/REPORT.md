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
| [test_strategy_gap_analysis.md](test_strategy_gap_analysis.md) | **NEW**: Gap matrix — mock AI, FE-BE contract, data, browser UX |

## B1.5 Observability & ETL Scheduling Audit

| Finding | Status |
|---|---|
| Trace readiness | TRACE_PARTIAL — thiếu request_id, Gemini quota classification |
| Error classification | ERROR_CLASSIFICATION_PARTIAL — 422 không phân biệt destination/places |
| FE error visibility | FE_ERROR_VISIBILITY_NOT_READY — tất cả errors generic |
| ETL scheduling | ETL_MANUAL_ONLY — không có cron/schedule |
| ETL auditability | ETL_AUDITABILITY_PARTIAL — `destinations.last_etl_at` NULL |

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
| [phase_c3_data_coverage_verification.md](phase_c3_data_coverage_verification.md) | **Real DB queries**: 1 city (Hà Nội), 68 places, 3 hotels, 0% quality coverage. Pipeline is SAFE — no hallucination. |
| [phase_c3_data_readiness.md](phase_c3_data_readiness.md) | Goong/ETL readiness summary |
| [phase_c3_verification_results.md](phase_c3_verification_results.md) | Real verification: BE tests pass, HTTP smoke, blocks documented |

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
feat/00051-c-c3-chat-session-foundation  # C3 chat sessions table + API
feat/00052-c-c3-companion-chat-rest       # Companion chat endpoint
feat/00053-c-c3-apply-patch             # Apply-patch endpoint
feat/00054-c-c3-floating-chat-integration # FE integration
```

## Readiness Summary (Updated with B1.5/B2/B3 Evidence)

| Component | Status | Evidence |
|---|---|---|
| Generate pipeline (Hà Nội small) | **PARTIALLY_READY** | B2: PASS for 1-2 ngày, FAIL for 3+ ngày (timeout) |
| Generate pipeline (multi-city) | **NOT_READY** | B2: 422 for TP.HCM, Đà Nẵng |
| Rate limit (generate) | READY | B2: 429 working correctly |
| Rate limit (FE UX) | NOT_READY | B3: generic error for 429 |
| Redis fail-closed | READY | B1.5: confirmed |
| Auth/AuthZ use cases | MOSTLY READY | B2/B3: confirmed for existing flows |
| C3 design | PARTIALLY READY | 4 design gaps remain |
| C4 design | READY (schema) | chat_sessions/chat_messages tables exist |
| C3 data coverage | **NOT_READY** | B2: Hà Nội only, 11/12 FE cities fail |
| Goong/ETL data | **NOT_READY** | B2: TP.HCM/Đà Nẵng = 0 places |
| FE error visibility | **NOT_READY** | B3: all errors generic |
| Destination selector | **NOT_READY** | B3: static hardcoded, not DB-backed |
| Observability | PARTIAL | B1.5: no request_id |
| ETL scheduling | NOT_READY | B1.5: manual only |
| TripWorkspace render | READY | B3: trip_id=235 PASS |
| FloatingAIChat | NOT_IMPLEMENTED | B3: not visible |

## Data Coverage Reality

> **HANOI_ONLY_MVP** — 1 city out of target 20. Pipeline SAFE (fails fast, no hallucination). But companion chat blocked for multi-city without ETL data expansion.

| Tier | Status |
|---|---|
| Minimum MVP (1 city, demo) | ✅ Hà Nội với 68 places |
| Multi-city MVP (5 cities) | ❌ Only Hà Nội has data |
| Production (15-20 cities) | ❌ 0/20 cities ETL done |

## Recommended Decision: B (Split Path)

1. `feat/00051-c-c3-chat-session-foundation` — C3 CRUD, no data dependency ✅
2. `feat/00051b-c-c4-chat-history` — C4 CRUD, no city data ✅
3. `feat/00057-c-etl-goong-data-expansion` — Data expansion to 5 cities ⚠️ **PREREQUISITE**
4. `feat/00052-c-c3-companion-chat-rest` — C3 companion features (after ETL)

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
