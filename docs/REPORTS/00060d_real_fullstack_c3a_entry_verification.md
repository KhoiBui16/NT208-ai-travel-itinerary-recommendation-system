# 00060D — Real Fullstack + C3A Entry Verification

Ngày cập nhật: 2026-06-02
Branch báo cáo: `docs/00060-d-real-fullstack-c3a-entry`
PR title đề xuất: `fix: [#00060] harden pre-c3a browser uat blockers`

> Bản cập nhật này gộp luôn hardening `00060D-R v2` và `00060D-FIX`: real Gemini smoke, live rate-limit/provider-path evidence, trip edit persistence re-check, README sync tối thiểu, fix context bug của `FloatingAIChat`, và browser-level `429` submit-path regression trước khi bắt đầu `C3A`.

## 1. Executive Summary

| Item | Result |
|---|---|
| Fullstack startup status | `PASS` |
| Real Gemini generate status | `PASS` |
| Trip workspace status | `PASS` |
| Trip edit persistence status | `PASS` |
| Auth/session/share status | `PASS` |
| Rate-limit/error UX status | `PASS` |
| README sync status | `SYNCED_AFTER_V2_HARDENING` |
| FloatingAIChat wrong-city reproduction | `FIXED_PRE_C3A` |
| Can start `C3A` | `YES` |
| Can start `C3B` directly | `NO` |
| Can start `C4` directly | `NO` |
| Production code changed | `NO` |

Biggest blocker: `FloatingAIChat` không còn hardcoded `Hà Nội`, nhưng nó vẫn chỉ là mock local-state và chưa có session/message API. `C3A` vẫn phải thay nó bằng panel owner-only, trip-scoped, session-aware.

## 2. Why 00060D-R v2 Was Needed

`00060D v1` đã chứng minh local stack chạy được và các flow nền như auth, trip-library, workspace, share route đều sống. Nhưng trước khi bắt đầu code `C3A`, vẫn còn vài khoảng trống cần khóa:

- real Gemini generate chưa có bằng chứng browser/API thật
- trip edit persistence chưa được re-run lại sau refresh
- browser `429` submit-path chưa có regression riêng đi hết đường click thật
- `503` mới là mocked shell, chưa có live FE-BE fail path
- `README.md` cần được re-check để tránh kể chuyện cũ hơn source/runtime

`00060D-R v2` đóng các khoảng trống này bằng một live run có kiểm soát, không sửa production code và không spam provider.

## 3. 00060D v1 Baseline

| Item | v1 Status | Need re-check? | Reason |
|---|---|---|---|
| DB/Redis/backend/frontend startup | PASS | YES | cần giữ evidence runtime mới nhất cùng với real Gemini smoke |
| Public pages + auth entrypoints | PASS | NO | đã đủ evidence ở v1; chỉ cần kế thừa |
| Partial destination advisory | PASS | YES | cần xác nhận vẫn đúng trong live generate path |
| Trip library/workspace/share | PASS | YES | cần nối liền với real Gemini trip và share boundary |
| Trip edit persistence | PARTIAL | YES | v1 chưa re-run mutation + refresh |
| `429` UX | PARTIAL | YES | v1 chỉ có mocked browser path |
| `503` UX | PARTIAL | YES | v1 chỉ có mocked browser path |
| FloatingAIChat wrong-city | PASS (finding) | YES | cần giữ như evidence cứng cho `C3A` |
| README current truth | UNKNOWN | YES | README là entrypoint chính cho reviewer/dev tiếp theo |

## 4. README Structure Audit

| Section | Status | Action |
|---|---|---|
| `1.1 Trạng thái hiện tại trước khi vào C3/C4` | PARTIAL | thêm note runtime từ `00060D-R`: real Gemini success + wrong-city reproduction |
| `7.4 Share & Claim Flow` | STALE | sửa `localStorage` -> `sessionStorage` cho pending claim; thêm boundary notes cho shared view / owner chat |
| `8.5 C.3A` | PARTIAL | thêm runtime note rằng mock chat vẫn sai city context trên trip thật |
| `8.3/8.4` vs duplicate C.1/C.2 blocks phía sau | DUPLICATED | giữ section có numbering, đổi phần lặp phía sau thành cross-reference ngắn |
| `9.5-9.8` vs duplicate auth flow blocks phía sau | DUPLICATED | giữ section numbered, đổi phần lặp thành note ngắn |
| `9.9 Security Rules Summary` | PARTIAL | giữ checklist và thêm subsection `Rate Limit & Quota Boundary` |
| `10. Trạng thái Phase C` | PARTIAL | thêm latest runtime snapshot trước `C3A` |
| `12. Tests & Verification` | PARTIAL | thêm mini snapshot `00060D-R` để reviewer thấy latest live UAT |

## 5. README vs Source/Docs Consistency

| Topic | README before | Source truth | Action |
|---|---|---|
| Rate-limit fail-closed | có nói fail-closed | đúng theo `rate_limiter.py` và live `503` fail path | giữ, thêm rate-limit boundary subsection |
| Rate-limit response headers/body | chưa ghi rõ actual runtime shape | live `429` trả `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After` + body metadata | thêm note ngắn ở README, chi tiết để trong report |
| Share public read-only | có nói read-only | đúng; live shared route không có owner controls/chat trigger | thêm note future chat controls không được lộ |
| Guest claim one-time | có nói one-time | đúng, nhưng lưu pending claim ở `sessionStorage`, không phải `localStorage` | sửa README |
| C3A no real AI | đã nói đúng | vẫn đúng | giữ |
| C3B owns chat quota/provider | chưa nhấn đủ rõ | đúng theo plan hiện tại | thêm rõ ở `Rate Limit & Quota Boundary` |
| FloatingAIChat mock/runtime context | mới nói mock | pre-C3A fix đã bỏ hardcoded `Hà Nội`, nhưng chat vẫn chưa session-aware/API-backed | thêm runtime note ngắn |
| Real Gemini UAT status | chưa có | live v2 đã có `201`, ~31s, workspace render | thêm snapshot ngắn |

## 6. README Updates

| Section | Change | Why |
|---|---|---|
| `1.1` | thêm rows cho real Gemini smoke và wrong-city runtime finding | current status trước `C3A` phải bám runtime mới nhất |
| `7.4 Share & Claim Flow` | sửa pending claim storage sang `sessionStorage`; thêm notes về shared read-only và owner chat | tránh drift với source/auth flow |
| `8.5 C.3A` | thêm runtime note về mock chat sai city | chốt requirement rõ cho `C3A` |
| `8.6` | thay duplicate C.1/C.2 text bằng cross-reference ngắn | giảm lặp, không mất nội dung |
| `9.10/9.11` | đổi phần auth duplicate thành note + thêm `Rate Limit & Quota Boundary` | làm rõ quota boundary và runtime `429/503` truth |
| `10` | thêm latest runtime snapshot trước `C3A` | reviewer nhìn một chỗ là thấy gate hiện tại |
| `12.1` | thêm latest live UAT snapshot | README là entrypoint, nhưng không nhét full phase report vào đó |

## 7. Skills/Agents Used

| Skill/Agent | Used? | Evidence |
|---|---|---|
| `fullstack-browser-debug` | YES | real FE-BE run, screenshots, trace, provider-timeout FE path |
| `security-auditor` | YES | share/public boundary, cross-user `403`, rate-limit/quota interpretation |
| `c3-c4-readiness-review` | YES | final gate vẫn là `C3A YES`, `C3B/C4 NO` |
| `source-plan-sync-review` | YES | README/source/docs consistency pass |
| `git-pr-workflow` | YES | giữ branch/report/PR naming policy, không commit/push |

## 8. Browser Evidence

| Scenario | Screenshot/trace/video | Status |
|---|---|---|
| Home page load | `01-home.png` | PASS |
| CreateTrip load | `02-create-trip.png` | PASS |
| Hà Nội selected | `03-hanoi-selected.png` | PASS |
| Calendar selected | `04-calendar-selected.png` | PASS |
| Register success | `05-register-login.png` | PASS |
| Real Gemini loading state | `06-real-gemini-generate-loading.png` | PASS |
| Real Gemini result | `07-real-gemini-generate-result-or-error.png` | PASS |
| TripWorkspace after real generate | `08-trip-workspace.png` | PASS |
| Trip edit + save | `09-trip-edit-save.png` | PASS |
| TripLibrary after refresh | `10-trip-library-after-refresh.png` | PASS |
| Shared public view | `11-share-view.png` | PASS |
| Floating chat context after pre-C3A fix | `12-floating-chat-wrong-city-if-reproduced.png` | PASS |
| Live 503 browser UX | `13-rate-limit-or-error-ux.png` | PASS |
| Trace artifact | `test-results/00060d-r/trace.zip` | PASS |

## 9. Real Gemini Evidence

| Check | Result | Notes |
|---|---|---|
| GEMINI key present in `Backend/.env` | YES | key tồn tại; không in ra |
| Real Gemini generate attempted | YES | auth user flow, ready city `Hà Nội` |
| Response status | `201` | trip created successfully |
| Observed latency | `~31.2s` | one controlled live attempt |
| Workspace render after generate | PASS | browser navigated to `/trip-workspace?tripId=391` |
| Persisted trip reload path | PASS | workspace and trip-library reopened correctly |
| Real Gemini failure path | YES, separately controlled | alternate backend với `AGENT_TIMEOUT_SECONDS=1` cho `503` provider-timeout path |

## 10. TripWorkspace/Edit/Share Evidence

| Scenario | Status | Evidence |
|---|---|---|
| Workspace open after real Gemini | PASS | trip `391` render đúng ở `TripWorkspace` |
| Activity edit persistence re-check | PASS | activity end-time `11:00 -> 11:05`, reload xong vẫn còn |
| TripLibrary after refresh | PASS | generated trip vẫn hiện trong list |
| Share/public boundary | PASS | share API `200`; public route render read-only; không owner controls |
| Shared view no owner chat trigger | PASS | browser shared route không có floating chat trigger |
| Cross-user trip access | PASS | user khác `GET /itineraries/391` trả `403 Not trip owner` |

## 11. Rate-limit/Error UX Evidence

| Scenario | Status | Evidence |
|---|---|---|
| Invalid city `422` | PASS | actual API trả `VALIDATION_ERROR` với message actionable |
| Cross-user `403` | PASS | actual API trả `FORBIDDEN` |
| Actual `429` contract | PASS | request invalid city lặp 4 lần cho auth user mới: `422, 422, 422, 429`; lần 4 trả đủ rate-limit headers + body |
| Browser `429` UX | PASS | Playwright submit-path regression intercept generate endpoint, hiện alert thật từ headers/body, không điều hướng sang workspace |
| Browser `503` UX | PASS | alternate timeout backend trả `503 Gemini request timed out`; FE hiện copy thân thiện |
| Unauth protected route | PASS | v1 evidence vẫn còn đúng; route redirect `/login` |

Actual `429` runtime shape observed:

- `X-RateLimit-Limit: 3`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 2026-06-03T00:00:00+00:00`
- `Retry-After: 55523`
- body gồm `limit`, `remaining`, `reset_at`, `retry_after_seconds`

Actual browser `503` runtime copy observed:

- `Dịch vụ AI đang bận hoặc phản hồi quá lâu. Vui lòng thử lại sau ít phút.`

## 12. C3A Implications

| Finding | C3A requirement |
|---|---|
| Real Gemini generate path đang chạy được | `C3A` không cần sửa gì ở C.1; chỉ cần không phá flow hiện tại |
| Workspace edit persistence đã sống sau reload | có thể gắn chat panel vào `TripWorkspace` mà không giả định workspace còn quá mong manh |
| Shared public view không có owner controls/chat trigger | `C3A` phải giữ invariant này |
| `FloatingAIChat` context bug đã được fix pre-C3A | `C3A` vẫn phải thay mock bằng panel session-aware thay vì giữ local-state chat |
| `429` actual API contract đã rõ, chat quota còn chưa tách | `C3B` phải tạo namespace quota riêng cho chat |
| Live `503` browser UX đã có baseline tốt | `C3B` nên reuse copy/error handling hiện tại thay vì tạo flow mới |

## 13. Tests

| Command | Status | Notes |
|---|---|---|
| `uv run ruff check src tests` | PASS | backend lint sạch |
| `uv run ruff format --check src tests` | PASS | `88 files already formatted` |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | `125 passed, 1 warning` |
| `uv run pytest tests/integration/ -v --tb=short` | PASS | `37 passed, 14 skipped` |
| `npm run build -- --outDir .build-tmp\\verify-00060d-fix-pre-c3a` | PASS | chunk-size warning only |
| `npx playwright test tests/e2e/00060d-pre-c3a-429-submit-ux.spec.ts --reporter=list` | PASS | submit-path `429` regression green |
| `npx playwright test tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts --reporter=list` | PASS | non-`Hà Nội` trip chat context green |
| `npx playwright test --reporter=list` | PASS | `21 passed, 3 skipped` |
| Custom Playwright live UAT | PASS | screenshots + trace + real Gemini success + live 503 path |

## 14. Docs/Reports Updated

| File | Change |
|---|---|
| `README.md` | sync runtime findings, quota/share boundaries, and duplicate-section hardening |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | thêm note rằng real Gemini smoke, actual `429` contract, browser `503`, và pre-C3A floating-chat/429 hardening đã được verify |
| `docs/REPORTS/00060d_real_fullstack_c3a_entry_verification.md` | cập nhật thành bản v2 + `00060D-FIX` hiện tại |
| `docs/REPORTS/pr_00060d_description.md` | sync PR body với scope fix pre-C3A blocker hiện tại |
| `docs/REPORTS/REPORT.md` | update snapshot `00060D` theo evidence v2 |

## 15. Remaining Issues

| Issue | Severity | Target phase |
|---|---|---|
| Chat quota riêng chưa có | HIGH | `C3B` |
| Chat session/message API chưa có | HIGH | `C3A` / `C3B` |
| Stale patch/apply-patch conflict handling chưa chốt | MEDIUM | `C3C` |

## 16. Stage Plan

| File | Stage? | Reason |
|---|---|---|
| `Frontend/src/app/components/FloatingAIChat.tsx` | YES | fix pre-C3A context bug |
| `Frontend/src/app/pages/TripWorkspace.tsx` | YES | derive chat cities from current trip state |
| `Frontend/src/app/pages/CreateTrip.tsx` | YES | accessible alert for submit-path error UX |
| `Frontend/src/app/utils/errorHandler.ts` | YES | include retry wait text for `429` |
| `Frontend/tests/e2e/00060d-pre-c3a-429-submit-ux.spec.ts` | YES | browser-level `429` submit regression without Gemini |
| `Frontend/tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts` | YES | regression for non-Hà Nội trip chat context |
| `README.md` | YES | README sync hardening theo fix mới |
| `docs/REPORTS/00060d_real_fullstack_c3a_entry_verification.md` | YES | report phase chính |
| `docs/REPORTS/pr_00060d_description.md` | YES | PR body |
| `docs/REPORTS/REPORT.md` | YES | update report index/current snapshot |
| `docs/C3_C4_IMPLEMENTATION_PLAN.md` | YES | runtime hardening findings affect C3A entry criteria |
| `docs/LOCAL_MANUAL_UAT_GUIDE.md` | NO | run steps hiện tại chưa phát hiện drift đáng sửa |
| `.build-tmp*/` | NO | build artifacts |
| `test-results/` | NO | screenshots/videos/traces are local evidence only |
| `playwright-report/` | NO | artifact nếu có |

## 17. Decision

- Fullstack startup: `PASS`
- Real Gemini generate: `PASS`
- Trip workspace/edit/share: `PASS`
- Rate-limit/error UX: `PASS`
- README sync: `SYNCED_AFTER_V2_HARDENING`
- Can start `C3A`: `YES`
- Can start `C3B` directly: `NO`
- Can start `C4` directly: `NO`

`00060D-FIX` đã đẩy browser `429` từ `PARTIAL` lên `PASS` bằng regression test đi đúng submit-path thật nhưng intercept endpoint ở browser layer, nên không đốt Gemini quota và vẫn chứng minh được UX alert, button re-enable, và không navigation sai.

## Recommended Next Phase

`C3A — Chat Session Foundation`
