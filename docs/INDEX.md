# Documentation Index

**Ngày tạo:** 2026-06-08
**Cập nhật lần cuối:** 2026-06-24 (sync task 00116)

---

## Mục lục nhanh

| Category | Số files | Đường dẫn |
|----------|----------|-----------|
| [Core Architecture](#1-core-architecture-documentation) | 13 | `docs/*.md` |
| [Strategic Planning](#2-strategic-planning-documentation) | 4 | `docs/*.md` |
| [Phase Reports](#3-phase-reports--result-documentation) | 40+ | `docs/REPORTS/phase_*.md` |
| [Numbered Series](#4-numbered-series-reports-00050-00060) | 30+ | `docs/REPORTS/000*.md` |
| [PR Descriptions](#5-pull-request-documentation) | 35+ | `docs/REPORTS/pr_*.md` |
| [Issue Reports](#6-issue-tracking--bug-reports) | 45+ | `docs/REPORTS/ISSUES/` |

---

## 1. Core Architecture Documentation

**Location:** `docs/` root directory

### Entry Points (Bắt đầu từ đây)

| File | Mục đích | Khi nào đọc |
|------|----------|-------------|
| [`01_overview.md`](01_overview.md) | Entry point, reading order, invariant rules | **Đọc đầu tiên** - New developer onboarding |
| [`../README.md`](../README.md) | Quick start, tech stack, architecture overview | Project overview |
| [`02_architecture.md`](02_architecture.md) | System architecture FE-BE-DB-Redis-AI | Understanding system design |
| [`03_backend.md`](03_backend.md) | Backend endpoints, services, repositories | Backend development |
| [`04_frontend.md`](04_frontend.md) | Frontend components, hooks, API client | Frontend development |
| [`05_database_etl.md`](05_database_etl.md) | Database ERD, Redis, ETL pipeline | Data layer understanding |
| [`06_ai_roadmap.md`](06_ai_roadmap.md) | Phase C AI architecture (pending features) | AI feature planning |
| [`07_workflow_ci.md`](07_workflow_ci.md) | Branch/commit/PR format, CI/CD rules | Contributing guidelines |
| [`08_testing_local_run.md`](08_testing_local_run.md) | Local development and testing guide | Running tests locally |
| [`09_execution_tracker.md`](09_execution_tracker.md) | Task/branch/PR tracker (living document) | Project status tracking |
| [`10_automation_testing_report.md`](10_automation_testing_report.md) | Test results (187 unit + 77 integration; 17 e2e specs) | Test quality verification |
| [`11_phase_roadmap.md`](11_phase_roadmap.md) | Phase C roadmap & completion tracker | Phase planning |

### C3/C4 Specific

| File | Mục đích |
|------|----------|
| [`ARCHITECTURE_C3_C4_READINESS.md`](ARCHITECTURE_C3_C4_READINESS.md) | C3/C4 pre-implementation audit |
| [`C3_C4_IMPLEMENTATION_PLAN.md`](C3_C4_IMPLEMENTATION_PLAN.md) | Detailed C3/C4 implementation phases |

---

## 2. Strategic Planning Documentation

**Location:** `docs/` root directory

| File | Mục đích |
|------|----------|
| [`LOCAL_MANUAL_UAT_GUIDE.md`](LOCAL_MANUAL_UAT_GUIDE.md) | PowerShell-safe manual UAT guide |
| [`STAGING_DEPLOYMENT_GUIDE.md`](STAGING_DEPLOYMENT_GUIDE.md) | Production deployment strategy |
| [`USER_JOURNEY_UAT.md`](USER_JOURNEY_UAT.md) | End-to-end user journey matrix |

---

## 3. Phase Reports & Result Documentation

**Location:** `docs/REPORTS/`

### Phase C.1 - AI Generate Pipeline

| File | Mục đích |
|------|----------|
| [`phase_ai_generate_pipeline.md`](REPORTS/phase_ai_generate_pipeline.md) | Generate pipeline implementation |
| [`generate_pipeline_readiness.md`](REPORTS/generate_pipeline_readiness.md) | Pipeline readiness audit |

### Phase C.2 - Suggestion Service

| File | Mục đích |
|------|----------|
| [`phase_c2_suggestion_service.md`](REPORTS/phase_c2_suggestion_service.md) | DB-only suggestion service |

### Phase C.3 - Chat Foundation

| File | Mục đích |
|------|----------|
| [`phase_c3_data_readiness.md`](REPORTS/phase_c3_data_readiness.md) | Goong/ETL readiness for chat |
| [`phase_c3_design_readiness.md`](REPORTS/phase_c3_design_readiness.md) | Design gaps and verification |
| [`phase_c3_verification_results.md`](REPORTS/phase_c3_verification_results.md) | Real verification results |
| [`phase_c3_data_coverage_verification.md`](REPORTS/phase_c3_data_coverage_verification.md) | Data coverage analysis |
| [`auth_authorization_use_cases_for_c3.md`](REPORTS/auth_authorization_use_cases_for_c3.md) | Auth/AuthZ checklist |

### Backend/Frontend Flow

| File | Mục đích |
|------|----------|
| [`phase_backend_flow.md`](REPORTS/phase_backend_flow.md) | Backend flow documentation |
| [`phase_frontend_flow.md`](REPORTS/phase_frontend_flow.md) | Frontend flow documentation |
| [`phase_docs_readme_ci_sync.md`](REPORTS/phase_docs_readme_ci_sync.md) | Documentation sync report |

### Testing & Quality

| File | Mục đích |
|------|----------|
| [`phase_automation_testing_comprehensive.md`](REPORTS/phase_automation_testing_comprehensive.md) | Comprehensive testing strategy |
| [`phase_full_system_test_2026_05_27.md`](REPORTS/phase_full_system_test_2026_05_27.md) | Full system test results |
| [`test_strategy_gap_analysis.md`](REPORTS/test_strategy_gap_analysis.md) | Test coverage gap analysis |
| [`browser_flow_test_plan_for_c3.md`](REPORTS/browser_flow_test_plan_for_c3.md) | Browser E2E test plan for C3 |

### Data & ETL

| File | Mục đích |
|------|----------|
| [`phase_goong_etl_coverage_analysis.md`](REPORTS/phase_goong_etl_coverage_analysis.md) | Goong API coverage analysis |
| [`rate_limit_policy_review.md`](REPORTS/rate_limit_policy_review.md) | Rate limiting security review |

---

## 4. Numbered Series Reports (00050-00060)

**Location:** `docs/REPORTS/`

### 00050 Series - C3/C4 Readiness

| File | Mục đích |
|------|----------|
| [`00051_fe_error_visibility_results.md`](REPORTS/00051_fe_error_visibility_results.md) | Frontend error visibility fixes |
| [`00052_deployment_etl_strategy.md`](REPORTS/00052_deployment_etl_strategy.md) | ETL deployment strategy |
| [`00052_etl_quota_and_data_expansion_plan.md`](REPORTS/00052_etl_quota_and_data_expansion_plan.md) | ETL quota planning |
| [`00052_goong_live_smoke_result.md`](REPORTS/00052_goong_live_smoke_result.md) | Goong API validation |
| [`00052_hanoi_real_import_result.md`](REPORTS/00052_hanoi_real_import_result.md) | Hà Nội real import results |
| [`00052_multicity_real_import_result.md`](REPORTS/00052_multicity_real_import_result.md) | Multi-city import results |
| [`00052_real_generate_smoke_result.md`](REPORTS/00052_real_generate_smoke_result.md) | Real AI generate smoke test |

### 00056-00057 Series - Calendar & Destination

| File | Mục đích |
|------|----------|
| [`00056_calendar_generate_flow_fix_result.md`](REPORTS/00056_calendar_generate_flow_fix_result.md) | Calendar modal bug fix |
| [`00057_destination_readiness_contract_result.md`](REPORTS/00057_destination_readiness_contract_result.md) | Destination readiness contract |

### 00058 Series - Auth & Rate Limit

| File | Mục đích |
|------|----------|
| [`00058a_auth_guest_rate_limit_claim_audit.md`](REPORTS/00058a_auth_guest_rate_limit_claim_audit.md) | Auth/rate limit audit |
| [`00058b_auth_guest_rate_limit_claim_regression.md`](REPORTS/00058b_auth_guest_rate_limit_claim_regression.md) | Regression testing |

### 00059 Series - UAT Documentation

| File | Mục đích |
|------|----------|
| [`00059a_calendar_modal_e2e_blocker_fix.md`](REPORTS/00059a_calendar_modal_e2e_blocker_fix.md) | E2E blocker resolution |
| [`00059b_full_user_journey_uat.md`](REPORTS/00059b_full_user_journey_uat.md) | Complete user journey UAT |
| [`00059c_real_end_user_manual_uat.md`](REPORTS/00059c_real_end_user_manual_uat.md) | Real end-user manual testing |

### 00060 Series - Architecture & Critical Fixes 🔥

**Đây là series quan trọng nhất** - Chứa tất cả fixes và verification trước C3/C4

| File | Mục đích | Trạng thái |
|------|----------|------------|
| [`00060a_nested_subresource_authz_fix.md`](REPORTS/00060a_nested_subresource_authz_fix.md) | Authorization security fix | ✅ Merged |
| [`00060b_architecture_c3_c4_readiness.md`](REPORTS/00060b_architecture_c3_c4_readiness.md) | **KEY** C3/C4 go/no-go decision | ✅ Approved |
| [`00060c_source_docs_readme_sync_c3a_entry_gate.md`](REPORTS/00060c_source_docs_readme_sync_c3a_entry_gate.md) | Documentation sync | ✅ Merged |
| [`00060d_real_fullstack_c3a_entry_verification.md`](REPORTS/00060d_real_fullstack_c3a_entry_verification.md) | Fullstack verification | ✅ Verified |
| [`00060e_final_docs_sync_mermaid_fix.md`](REPORTS/00060e_final_docs_sync_mermaid_fix.md) | Mermaid diagram fixes | ✅ Merged |
| [`00060f_staging_deployment_readiness.md`](REPORTS/00060f_staging_deployment_readiness.md) | Staging deployment readiness | ✅ Ready |
| [`00060g_ai_latency_image_hardening.md`](REPORTS/00060g_ai_latency_image_hardening.md) | AI latency improvements | ✅ Merged |
| [`00060h_guest_gemini_image_boundary.md`](REPORTS/00060h_guest_gemini_image_boundary.md) | Guest/gemini boundaries | ✅ Merged |
| [`00060i_real_user_smoke_critical_flow.md`](REPORTS/00060i_real_user_smoke_critical_flow.md) | Critical user flow testing | ✅ Verified |
| [`00060j_fix_local_smoke_ux_data_gate.md`](REPORTS/00060j_fix_local_smoke_ux_data_gate.md) | Local smoke UX fixes | ✅ Merged |
| [`00060k_pre_chatbot_source_docs_runtime_audit.md`](REPORTS/00060k_pre_chatbot_source_docs_runtime_audit.md) | Pre-chatbot audit | ✅ Complete |
| [`00060k_r1_critical_data_contract_fixes.md`](REPORTS/00060k_r1_critical_data_contract_fixes.md) | Critical data fixes (Bug #1, #3) | ✅ Fixed |
| [`00060k_r2_backend_testing_report.md`](REPORTS/00060k_r2_backend_testing_report.md) | Comprehensive backend testing | ✅ Complete |
| [`00060k_r2_full_testing_report.md`](REPORTS/00060k_r2_full_testing_report.md) | Complete testing report | ✅ Complete |

---

## 5. Pull Request Documentation

**Location:** `docs/REPORTS/`

**Pattern:** `pr_<number>_description.md`

### PR Descriptions by Range

| PR Range | Chủ đề | Số lượng |
|----------|--------|----------|
| PR #43-#50 | Initial C3/C4 readiness audit | 8 |
| PR #52-#57 | Calendar, destination, ETL improvements | 6 |
| PR #58-#60 | Auth, rate limiting, UAT documentation | 3 |
| PR #60A-#60K | Architecture fixes & C3/C4 preparation | 11 |

**Các PR quan trọng:**
- `pr_00060b_description.md` - PR C3/C4 go/no-go decision
- `pr_00060k_description.md` - PR Bug #1, #3 fixes (current)

---

## 6. Issue Tracking & Bug Reports

**Location:** `docs/REPORTS/ISSUES/`

### Critical Issues (P0 - P1)

| Issue | Mô tả | Trạng thái |
|-------|--------|------------|
| [`issue_generated_accommodation_dayids_do_not_match_tripday_ids.md`](REPORTS/ISSUES/issue_generated_accommodation_dayids_do_not_match_tripday_ids.md) | **Bug #1 (P0)** - AI generates accommodation dayIds as [1, 2] but DB creates TripDay IDs like [188, 189] | ✅ FIXED |
| [`issue_etl_place_image_pipeline_gap.md`](REPORTS/ISSUES/issue_etl_place_image_pipeline_gap.md) | **Bug #2 (API Limitation)** - Goong API không cung cấp photos field | ⏸️ Pending decision |
| [`plan_00060_critical_data_fixes.md`](REPORTS/ISSUES/plan_00060_critical_data_fixes.md) | **Bug #3 (P1)** - DB loader conflict update missing fields | ✅ FIXED |

### Security & Authorization

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `issue_nested_trip_subresource_membership_authz_gap.md` | Authorization vulnerability | HIGH |
| `issue_auth_quota_separate_5_per_day.md` | Auth quota separation | MEDIUM |
| `issue_guest_cookie_fingerprint_hardening.md` | Guest security hardening | MEDIUM |
| `issue_rate_limit_algorithm_hardening_sliding_token_bucket.md` | Rate limiting algorithm | LOW |

### Data & ETL Issues

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `data_coverage_blocks_multi_city_c3.md` | Multi-city data coverage gaps | HIGH |
| `data_coverage_hanoi_only.md` | Hà Nội-only data limitation | MEDIUM |
| `etl_hotels_yaml_test_only.md` | Hotel data test-only status | INFO |
| `issue_etl_rate_limit_stop_not_implemented.md` | ETL rate limit missing | MEDIUM |
| `issue_etl_scheduler_missing.md` | ETL scheduler gap | LOW |
| `issue_goong_quota_blocks_bulk_etl.md` | Goong quota blocking ETL | HIGH |
| `issue_multicity_etl_required_before_multicity_generate.md` | Multi-city ETL prerequisite | HIGH |
| `issue_etl_place_images_empty_scheduler_needed.md` | Image scheduler needed | MEDIUM |

### Frontend Issues

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `issue_fe_error_handling_generic.md` | Generic error handling | MEDIUM |
| `issue_fe_generic_error_masks_backend_error.md` | Error masking issue | MEDIUM |
| `issue_frontend_build_eperm.md` | Frontend build permissions | LOW |
| `c2_fe_ui_missing.md` | Missing frontend UI for C.2 | LOW |
| `issue_calendar_modal_click_timeout.md` | Calendar modal timeout | FIXED |
| `issue_calendar_modal_enabled_date_buttons_e2e_blocker.md` | E2E blocker | FIXED |

### Backend & AI Issues

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `issue_gemini_timeout_large_prompt.md` | Gemini timeout on large prompts | MEDIUM |
| `c3_chat_quota_shared_with_generate.md` | Chat quota sharing | HIGH |
| `c3_stale_patch_handling_missing.md` | Stale patch handling | MEDIUM |
| `issue_async_generation_needed_for_long_trips.md` | Async generation requirement | LOW |
| `issue_idempotency_key_for_ai_generate.md` | Idempotency key missing | LOW |

### Infrastructure & Observability

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `issue_observability_trace_missing.md` | Request ID/correlation ID missing | MEDIUM |
| `issue_browser_smoke_blocked.md` | Browser smoke test blocking | LOW |
| `issue_overlap_trip_policy_not_verified.md` | Trip overlap policy | MEDIUM |
| `issue_rate_limit_testing_and_ux.md` | Rate limit testing gaps | MEDIUM |
| `ruff_cache_permission_warning.md` | Ruff cache permissions | LOW |
| `npm_audit_vulnerabilities.md` | NPM security vulnerabilities | LOW |

### Design & Architecture Decisions

| Issue | Mô tả | Trạng thái |
|-------|--------|------------|
| [`explanation_option_c_admin_panel.md`](REPORTS/ISSUES/explanation_option_c_admin_panel.md) | **Option C (Admin Panel)** explanation | ✅ APPROVED |
| `plan_00060_critical_data_fixes.md` | Critical data fix plan | ✅ IMPLEMENTED |
| `plan_fix_e2e_test_auth_context.md` | E2E test auth context fix | ✅ FIXED |
| `phase_c_legacy_plan_status_drift.md` | Legacy plan drift tracking | INFO |

### Specific Component Issues

| Issue | Mô tả | Priority |
|-------|--------|----------|
| `issue_backend_place_service_unit_fixture_activity_relationship.md` | Backend test fixture issues | LOW |
| `issue_destination_selector_not_db_backed.md` | Destination selector architecture | MEDIUM |
| `guest_login_reload_redirect_target_lost.md` | Guest login redirect issues | LOW |
| `guest_rate_limit_ua_bypass.md` | Guest rate limit bypass | MEDIUM |
| `guest_trip_no_limit.md` | Guest trip limitation | MEDIUM |
| `integration_test_trip_limit_pollution.md` | Test pollution issues | LOW |
| `goong_directions_api_missing.md` | Missing Goong API integration | LOW |
| `login_short_password_422.md` | Password validation issue | FIXED |

---

## Documentation Quality Metrics

| Metric | Giá trị | Đánh giá |
|--------|---------|----------|
| Tổng số files | 150 | 🟢 Excellent |
| Core architecture docs | 13 | 🟢 Complete |
| Phase reports | 40+ | 🟢 Comprehensive |
| PR descriptions | 35+ | 🟢 Excellent traceability |
| Issue reports | 45+ | 🟢 Well tracked |
| Cập nhật gần nhất | 2026-06-24 | 🟢 Current |

---

## Quick Navigation by Use Case

### For New Developers
1. Start: [`01_overview.md`](01_overview.md)
2. Understand: [`02_architecture.md`](02_architecture.md)
3. Setup: [`08_testing_local_run.md`](08_testing_local_run.md)
4. Contribute: [`07_workflow_ci.md`](07_workflow_ci.md)

### For Backend Development
1. API: [`03_backend.md`](03_backend.md)
2. Data: [`05_database_etl.md`](05_database_etl.md)
3. AI: [`06_ai_roadmap.md`](06_ai_roadmap.md)
4. Issues: [`REPORTS/ISSUES/`](REPORTS/ISSUES/)

### For Frontend Development
1. Components: [`04_frontend.md`](04_frontend.md)
2. Testing: [`08_testing_local_run.md`](08_testing_local_run.md)
3. Issues: [`REPORTS/ISSUES/`](REPORTS/ISSUES/) (frontend-*.md)

### For C3/C4 Implementation
1. **Go/No-Go:** [`00060b_architecture_c3_c4_readiness.md`](REPORTS/00060b_architecture_c3_c4_readiness.md)
2. Plan: [`C3_C4_IMPLEMENTATION_PLAN.md`](C3_C4_IMPLEMENTATION_PLAN.md)
3. Auth: [`auth_authorization_use_cases_for_c3.md`](REPORTS/auth_authorization_use_cases_for_c3.md)
4. Data: [`phase_c3_data_coverage_verification.md`](REPORTS/phase_c3_data_coverage_verification.md)

### For Testing & QA
1. Strategy: [`test_strategy_gap_analysis.md`](REPORTS/test_strategy_gap_analysis.md)
2. E2E: [`browser_flow_test_plan_for_c3.md`](REPORTS/browser_flow_test_plan_for_c3.md)
3. UAT: [`00059b_full_user_journey_uat.md`](REPORTS/00059b_full_user_journey_uat.md)
4. Results: [`00060k_r2_full_testing_report.md`](REPORTS/00060k_r2_full_testing_report.md)

### For Current Status (June 2026, HEAD `#109`)
1. Phase status: [`11_phase_roadmap.md`](11_phase_roadmap.md) (C.0–C.4 merged; C.5 optional)
2. Tracker: [`09_execution_tracker.md`](09_execution_tracker.md)
3. Deploy readiness: [`STAGING_DEPLOYMENT_GUIDE.md`](STAGING_DEPLOYMENT_GUIDE.md) · evidence `REPORTS/EVIDENCE/00115_post_109_deploy_readiness/`
4. Latest test inventory: 187 unit + 77 integration (17 e2e specs / 36 tests); CI green trên PR #109

---

## Missing Documentation (Gaps)

| Topic | Priority | Plan |
|-------|----------|------|
| API documentation (tách riêng) | MEDIUM | Extract from `03_backend.md` |
| Deployment runbook | MEDIUM | Expand `STAGING_DEPLOYMENT_GUIDE.md` |
| Performance/load testing | LOW | Create new doc |
| Disaster recovery | LOW | Create new doc |
| Monitoring/alerting setup | LOW | Create new doc |
| Developer onboarding checklist | LOW | Expand `01_overview.md` |

---

## Documentation Maintenance

**Frequency:** Theo từng PR/phase
**Owner:** Team lead + Documentation agent
**Process:**
1. Mỗi PR mới → Tạo `pr_<number>_description.md`
2. Mỗi issue mới → Tạo `issue_<name>.md`
3. Mỗi phase complete → Tạo `phase_<name>.md`
4. Monthly → Audit và update `INDEX.md`

---

**Generated:** 2026-06-08
**Next audit:** 2026-07-08
**Status:** ✅ Documentation is comprehensive and well-maintained
