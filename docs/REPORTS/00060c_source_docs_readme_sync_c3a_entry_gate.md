# 00060C — Source/Docs/README Sync + C3A Entry Gate

Ngày báo cáo: 2026-06-01
Branch báo cáo: `docs/00060-c-source-docs-readme-sync-c3a-gate`
PR title đề xuất: `docs: [#00060] add source docs readme sync and c3a entry gate`

## 1. Executive Summary

| Item | Result |
|---|---|
| Source/docs/README sync status | `SYNCED` |
| Can start `C3A` | `YES` |
| Can start `C3B` directly | `NO` |
| Can start `C4` directly | `NO` |
| Production code changed | `NO` |

Biggest remaining risk: chat session/message API vẫn chưa tồn tại trong source hiện tại, còn chat quota riêng, live-provider smoke, và stale patch handling vẫn là risk mở cho các phase sau `C3A`.

## 2. Why This Audit Was Needed

`00060B` đã chốt `GO_WITH_LIMITATIONS`, nhưng trước khi code `C3A` cần chắc rằng:

- source hiện tại đúng là chỉ sẵn sàng cho session foundation
- `README.md` không overclaim rằng chat/history đã có
- technical docs không còn kể câu chuyện cũ kiểu `/agent/chat` như thể đã tồn tại
- report index và docs C3/C4 plan nói cùng một current truth

Nếu không audit bước này, team rất dễ bước vào `C3A` với hiểu nhầm rằng:

- chat quota đã giải xong
- chat API đã có
- `FloatingAIChat` đã là panel thật
- shared viewer hoặc guest có thể chat ngay

## 3. Base Verification

| Check | Result | Evidence |
|---|---|---|
| main pulled | PASS | `origin/main` ở `98d2229 docs: [#00060] add architecture review and c3 c4 readiness plan (#69)` |
| `00059C` merged | YES | `c50dd73 docs: [#00059] add real end-user manual UAT evidence (#67)` |
| `00060A` merged | YES | `b8d5a20 fix: [#00060] enforce nested trip subresource authorization (#68)` |
| `00060B` merged | YES | `98d2229 docs: [#00060] add architecture review and c3 c4 readiness plan (#69)` |
| README exists | YES | `README.md` on `main` |
| technical docs exist | YES | `docs/ARCHITECTURE_C3_C4_READINESS.md`, `docs/C3_C4_IMPLEMENTATION_PLAN.md` |
| reports exist | YES | `docs/REPORTS/00060b_architecture_c3_c4_readiness.md` and report index |
| current branch | PASS | `docs/00060-c-source-docs-readme-sync-c3a-gate` |
| branch policy valid | YES | `docs/<task>-c-...` format |

## 4. Documentation Inventory

| Document | Type | Purpose | Verified? |
|---|---|---|---|
| `README.md` | project entry | setup/features/status | YES |
| `docs/01_overview.md` | technical docs | overview/current truth | YES |
| `docs/02_architecture.md` | technical docs | system architecture | YES |
| `docs/03_backend.md` | technical docs | backend structure/contracts | YES |
| `docs/04_frontend.md` | technical docs | frontend structure/tests | YES |
| `docs/05_database_etl.md` | technical docs | schema/migrations/ETL | YES |
| `docs/06_ai_roadmap.md` | technical docs | long-horizon AI roadmap | YES |
| `docs/08_testing_local_run.md` | technical docs | local/test guide | YES |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | technical docs | manual UAT guide | YES |
| `docs/USER_JOURNEY_UAT.md` | technical/UAT | user journey matrix | YES |
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | technical docs | current readiness architecture | YES |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | technical docs | phased C3/C4 plan | YES |
| `docs/REPORTS/REPORT.md` | report index | progress/current snapshot | YES |
| `docs/REPORTS/00059c_real_end_user_manual_uat.md` | phase report | real-user evidence | YES |
| `docs/REPORTS/00060a_nested_subresource_authz_fix.md` | phase report | authz fix evidence | YES |
| `docs/REPORTS/00060b_architecture_c3_c4_readiness.md` | phase report | readiness decision | YES |

## 5. Existing Docs Claims

| Document | Claim | Verified against source? | Action |
|---|---|---|---|
| `README.md` | repo ở `GO_WITH_LIMITATIONS`, `C3A` next, `FloatingAIChat` mock | YES, after sync | Updated status table + test counts |
| `docs/01_overview.md` | current gate before chat/history | YES, after sync | Updated backend/frontend current counts and conclusion |
| `docs/03_backend.md` | chat schema exists, no chat API yet | YES | Updated counts and chat-schema wording |
| `docs/04_frontend.md` | FloatingAIChat mock, FE test inventory | PARTIAL before sync | Updated Playwright totals and known gaps |
| `docs/05_database_etl.md` | chat tables/migration history | PARTIAL before sync | Removed misleading future-chat-migration row |
| `docs/06_ai_roadmap.md` | roadmap vs current source truth | PARTIAL before sync | Added explicit future-target note and corrected planned filenames |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | C3A/C3B/C4 split | YES, but lacked risk mapping | Added risk-to-phase mapping + C3A non-goals |
| `docs/REPORTS/REPORT.md` | current latest C3/C4 gate | YES after sync | Added `00060C` snapshot |

## 6. Source-vs-Docs Coverage

| Area | Source truth | README claim | docs claim | REPORTS claim | Match? | Action |
|---|---|---|---|---|---|---|
| Chat models/migrations | `ChatSession` / `ChatMessage` exist in `models/chat.py` and initial migration | now says schema exists | `05_database_etl`, architecture docs now align | `00060B` and `00060C` align | YES | synced `docs/05_database_etl.md` |
| FloatingAIChat/TripWorkspace | `FloatingAIChat` is mock local-state; `TripWorkspace` mounts it with hardcoded city | says mock, trip-aware not yet | frontend/architecture docs now say same | `00060B` and `00060C` align | YES | synced `README.md`, `docs/04_frontend.md` |
| Backend chat/session API | no chat/session/message endpoint exists in `itineraries/router.py` | says API not yet exists | roadmap docs now clearly mark future target only | `00060B` and `00060C` align | YES | synced `docs/02_architecture.md`, `docs/06_ai_roadmap.md` |
| Auth/guest/claim/share | guest claim exists; shared view is read-only public | matches | matches | matches | YES | no change needed in UAT docs |
| Rate-limit/quota | only shared AI namespace `rate:ai:*` exists now | says chat quota belongs to `C3B` | architecture/plan now say same | matches `00060B` | YES | no new issue needed |
| Error handling 401/403/422/429/503 | FE has generate-specific mapping; no chat-specific UI yet | matches | matches | matches | YES | no change needed |
| Generate/Gemini/Goong | real provider flow exists for generate, but recent manual evidence is partial by policy | matches after sync | matches | matches | YES | no change needed |
| Stale patch/apply-patch | no current endpoint; design issue still open | now says not in `C3A` | plan says `C3C/future` | matches | YES | added explicit non-goals/risk mapping |
| Tests/CI | backend current merged-source counts are 125 unit / 51 integration; FE suite 22 total with latest local UAT 19 pass, 3 skip | was stale before sync | several docs were stale before sync | historical reports preserved | YES, after sync | updated counts only in active docs |

## 7. README Sync

| Section | Stale? | Action |
|---|---|---|
| Feature table for Phase C | YES | Split high-level `C.3` into `C.3A` / `C.3B` and kept `C.4` as later phase |
| Current readiness table | PARTIAL | Kept `GO_WITH_LIMITATIONS`, added concise risk-to-phase notes |
| Backend test counts | YES | Updated to `125 unit + 51 integration = 176` |
| Backend tree test-count comments | YES | Updated count comments |

## 8. Technical Docs Sync

| Document | Stale? | Action |
|---|---|---|
| `docs/01_overview.md` | YES | Updated current gate wording, counts, and conclusion |
| `docs/02_architecture.md` | YES | Marked companion block as future target, corrected SuggestionService/current filenames |
| `docs/03_backend.md` | YES | Updated chat-schema note and backend test counts |
| `docs/04_frontend.md` | YES | Updated FE e2e totals and current known gaps |
| `docs/05_database_etl.md` | YES | Synced migration history to current source truth |
| `docs/06_ai_roadmap.md` | YES | Clarified future-target sections and corrected planned file naming |
| `docs/08_testing_local_run.md` | NO | Active local-run guidance already matched source well enough |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | YES | Updated expected backend gate counts to current merged source |
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | PARTIAL | Closed its own docs-drift note for migration history |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | PARTIAL | Added explicit risk-to-phase mapping and `C3A must not do` |

## 9. REPORTS Sync

| Report | Stale? | Action |
|---|---|---|
| `docs/REPORTS/REPORT.md` | YES | Added `00060C` section and current sync verdict |
| `docs/REPORTS/00059c_real_end_user_manual_uat.md` | NO | Historical facts preserved unchanged |
| `docs/REPORTS/00060a_nested_subresource_authz_fix.md` | NO | Historical facts preserved unchanged |
| `docs/REPORTS/00060b_architecture_c3_c4_readiness.md` | NO | Historical snapshot preserved; `00060C` now supersedes docs-drift part |
| `docs/REPORTS/00060c_source_docs_readme_sync_c3a_entry_gate.md` | NEW | Added this report |
| `docs/REPORTS/pr_00060c_description.md` | NEW | Added PR body template |

## 10. Risk-to-Phase Mapping

| Risk | Block C3A? | Target phase | Required action |
|---|---:|---|---|
| FloatingAIChat still mock | YES | `C3A` | replace/wrap with session-aware placeholder in `TripWorkspace` |
| No session ownership API | YES | `C3A` | create/list/get owner-only session API |
| No message ownership/send API | NO | `C3B/C4` | add send/history endpoints with trip/session ownership |
| Chat quota not split from generate | NO | `C3B` | add chat-specific quota namespace |
| Real Gemini/live outage evidence partial | NO | `C3B` / provider smoke | keep fake provider in tests, live smoke separate |
| Goong/live ETL partial | NO | generate/data hardening | not a blocker for chat foundation |
| Stale patch handling open | NO | `C3C` / future apply-patch | define conflict/version strategy before mutation |

## 11. Docs Updated

| File | Change | Why |
|---|---|---|
| `README.md` | Synced readiness summary, counts, and next-phase wording | project entry must not overclaim C3/C4 |
| `docs/01_overview.md` | Synced current gate and counts | overview is first-stop technical truth |
| `docs/02_architecture.md` | Marked chat/apply-patch as future target, fixed stale SuggestionService wording | avoid confusing roadmap with current API |
| `docs/03_backend.md` | Synced backend counts and chat-schema note | backend doc must reflect current source |
| `docs/04_frontend.md` | Synced FE test totals and current mock-chat gap | frontend doc was behind latest suite and UAT |
| `docs/05_database_etl.md` | Synced chat migration history | remove false “future chat migration on main” claim |
| `docs/06_ai_roadmap.md` | Clarified current gate vs future target | roadmap must not read like implemented API |
| `docs/11_phase_roadmap.md` | Synced current C3A/C3B/C4 split at top | old roadmap table pointed to stale branches/endpoints |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | Synced expected backend counts | manual guide should reflect current merged source |
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | Closed migration-drift note | current architecture doc should match synced docs |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | Added risk mapping and C3A non-goals | make entry gate explicit for implementation |
| `docs/REPORTS/REPORT.md` | Added `00060C` snapshot | report index must show latest current gate |
| `docs/REPORTS/00060c_source_docs_readme_sync_c3a_entry_gate.md` | New | audit record for this phase |
| `docs/REPORTS/pr_00060c_description.md` | New | PR body template |

## 12. Remaining Risks

| Risk | Severity | Phase |
|---|---|---|
| Chat session/message API chưa tồn tại | HIGH | `C3A` |
| Chat quota riêng chưa có | HIGH | `C3B` |
| Stale patch/apply-patch conflict handling chưa chốt | HIGH | `C3C` / future mutation work |
| Real provider/live outage evidence gần nhất vẫn partial | MEDIUM | `C3B` / provider smoke |
| Multi-city data readiness vẫn là concern riêng của generate/features nâng cao | MEDIUM | data hardening / later chat enhancements |

## 13. No Local IP/Path/Secret Scan

| Scan | Result |
|---|---|
| `git diff --check` | PASS |
| `git diff --name-only -- Backend/src Frontend/src` | PASS — no production code changes |
| local path/IP scan on active docs | PASS |
| secret/token pattern scan on active docs | PASS |
| repo-wide scan | `PASS_WITH_HISTORICAL_MATCHES_ONLY` |

## 14. Stage Plan

| File | Stage? | Reason |
|---|---|---|
| `README.md` | YES | current project status must match source truth |
| `docs/01_overview.md` | YES | overview sync |
| `docs/02_architecture.md` | YES | architecture sync |
| `docs/03_backend.md` | YES | backend sync |
| `docs/04_frontend.md` | YES | frontend sync |
| `docs/05_database_etl.md` | YES | migration/schema sync |
| `docs/06_ai_roadmap.md` | YES | roadmap sync |
| `docs/11_phase_roadmap.md` | YES | phase tracker sync |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | YES | manual guide sync |
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | YES | current architecture doc sync |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | YES | explicit C3A gate + risk mapping |
| `docs/REPORTS/00060c_source_docs_readme_sync_c3a_entry_gate.md` | YES | phase report |
| `docs/REPORTS/pr_00060c_description.md` | YES | PR body |
| `docs/REPORTS/REPORT.md` | YES | report index sync |
| `Frontend/.build-tmp*` | NO | artifact/noise |
| `test-results/` | NO | Playwright artifact |
| `playwright-report/` | NO | artifact if present |
| `docs/REPORTS/00055_fullstack_regression_result.md` | NO | unrelated old doc noise |
| `docs/REPORTS/pr_00055_description.md` | NO | unrelated old doc noise |

## 15. Decision

- Source code hiện tại đã đúng với mục tiêu sản phẩm core: generate/workspace/auth/share/claim/error handling.
- `README.md` sau sync đã khớp source.
- Technical docs trọng yếu sau sync đã khớp source.
- `docs/REPORTS` sau sync đã phân biệt rõ historical snapshot với current gate.
- Có thể bắt đầu `C3A`.
- Không được làm ở `C3A`: real AI call, message generation, quota split, apply-patch, public/shared chat, guest-unclaimed chat.

## 16. Recommended Next Phase

`C3A — Chat Session Foundation`
