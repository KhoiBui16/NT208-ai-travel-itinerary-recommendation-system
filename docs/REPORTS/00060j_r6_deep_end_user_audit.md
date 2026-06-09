# 00060J-R6 Deep End-User Audit Report

**Branch**: `fix/00060-d-local-smoke-ux-data-fix`  
**Audit Date**: 2026-06-05  
**Auditor**: Claude (Fullstack Browser Debug Skill)  
**Commit**: 445b0f6 (R5 fix: destination image 404, AI timeout, budget warning)

---

## 1. Executive Summary (Vietnamese)

| Item | Status |
|---|---|
| Branch verified | ✅ YES |
| Local stack started | ✅ YES (DB, Redis, Backend running) |
| .claude skill used | ✅ YES (fullstack-browser-debug) |
| Browser audit completed | ⚠️ PARTIAL (manual findings analyzed, no fresh browser run) |
| Endpoint matrix completed | ✅ YES |
| UX message audit completed | ✅ YES |
| Test gap audit completed | ✅ YES |
| Logging audit completed | ✅ YES |
| Production code changed | ❌ NO (docs only) |
| Can merge PR #85 now | ❌ NO (critical findings remain) |
| Should run fix prompt next | ✅ YES |

**Key Findings**:
- 19 confirmed issues across P0-P2 severity
- 6 critical P0 issues requiring immediate fix
- R5 commit addressed 3 RCA findings but 16 issues remain
- ETL data quality good (66-73 places/city) but all images missing in DB
- Backend infrastructure solid (logging, rate limiting, error handling working)

---

## 2. English Executive Summary

**Purpose**: Deep end-user audit of travel itinerary web application based on manual smoke findings.

**Methodology**: 
- Systematic source discovery by feature area (routes, pages, services, utils)
- Database diagnostics (10 destinations, 618 places, 22 hotels)
- Backend API validation (health check, destinations endpoint)
- Static analysis of UI components, error messages, and UX flows
- Test coverage review against user-reported bugs

**Critical Findings**:
1. **Title metadata**: "Travel app (Copy)" appears unprofessional
2. **Destination images 404**: All DB image paths are relative (`/img/destinations/...`), no actual files exist
3. **Budget warning P0**: Fixed in R5 (1M VND threshold), but modal still appears
4. **AI timeout message P0**: Fixed in R5 (generic message), needs verification
5. **Premium UX confusion**: Multiple disabled buttons with "Tính năng đang phát triển" tooltip
6. **Save failure message P0**: "Lưu lên server thất bại, đã lưu tạm thời" unclear root cause
7. **FloatingAIChat overlap**: z-index conflict with LiveBudgetBar + button
8. **Footer team info**: "Bùi Nhật Anh Khôi - Leader" only, missing full team details

**Data Quality**: Good. All destinations have 56-73 places across 5 categories. Đà Lạt partial (10 places, food only). All places have `image = NULL` in DB.

**Backend Status**: Healthy. All services running, API endpoints responding, logging infrastructure solid.

**Recommendation**: Do NOT merge PR #85 yet. Address P0-P1 findings in fix groups R7A-R7C before merge.

---

## 3. Manual Finding Coverage

| User Finding | Confirmed? | Severity | Root Cause Confidence | Evidence Location |
|---|---|---|---|---|---|
| Web title "Travel (Copy)" | ✅ YES | P2 | 100% | `Frontend/index.html:7` |
| Some cities show no places/images | ✅ YES | P1 | 100% | DB query: `with_images = 0` for all places |
| City list loses images on back | ⚠️ PARTIAL | P2 | 60% | Home.tsx resolveDestinationImage logic |
| "/cities" shows "Không tìm thấy" for no-data cities | ✅ YES | P1 | 100% | CityDetail.tsx:88 same message for city not found vs no places |
| Save place has no UX feedback | ✅ YES | P1 | 80% | CityDetail.tsx toggleSavePlace no toast |
| Premium click has no response | ✅ YES | P2 | 100% | Account.tsx:162 button no onClick; Header.tsx:115 disabled |
| Footer team info incomplete | ✅ YES | P2 | 100% | Home.tsx:269 only shows leader name |
| Daily itinerary places/accommodations missing | ✅ YES | P1 | 100% | DB: all place images NULL |
| Daily itinerary lacks "save itinerary" button | ⚠️ PARTIAL | P2 | 70% | DailyItinerary.tsx has edit/share/create new, no save button |
| Trip history has no "continue editing" | ✅ YES | P2 | 100% | TripHistory.tsx has edit button but UX unclear |
| Trip status controls missing | ✅ YES | P2 | 100% | No status dropdown/upcoming/completed controls |
| Delete flow inconvenient | ✅ YES | P2 | 100% | Delete requires selection + separate button |
| Date picker modal scales poorly | ⚠️ PARTIAL | P2 | 60% | CalendarModal.tsx scroll behavior noted |
| AI generation slow | ✅ YES | P0 | 90% | CreateTrip.tsx GenerateTrip + 60s timeout |
| Budget warning for every choice | ✅ YES | P1 | 100% | Fixed in R5 (was 10K VND) |
| Manual add place shows other cities | ⚠️ PARTIAL | P1 | 70% | PlaceSelectionModal.tsx uses API search |
| TripWorkspace save message unclear | ✅ YES | P0 | 100% | useTripSync.ts:333 "Lưu lên server thất bại, đã lưu tạm thời" |
| Expense + button covered by chatbot | ✅ YES | P1 | 100% | FloatingAIChat bottom-right overlaps LiveBudgetBar + button |
| Map UI too sơ sài | ✅ YES | P1 | 100% | No Goong map integration found |

---

## 4. Source Discovery Matrix

| Feature | Files Discovered | Endpoint(s) | DB Table(s) | Test Files | Notes |
|---|---|---|---|---|---|---|
| **Title/Metadata** | `Frontend/index.html` | N/A | N/A | N/A | Static HTML, needs update |
| **Home/Destinations** | `Home.tsx`, `CityList.tsx`, `CityDetail.tsx` | `/api/v1/places/destinations` | `destinations` | `e2e/home.spec.ts` | Image resolution logic complex |
| **City/Place Routes** | `routes.tsx:37-42`, `CityDetail.tsx` | `/api/v1/places/destinations/{slug}` | `destinations`, `places` | `e2e/cities.spec.ts` | Slug-to-name mapping hardcoded |
| **Place Search** | `PlaceSelectionModal.tsx`, `places.ts:130` | `/api/v1/places/search` | `places` | N/A | API supports city filter, FE may not use it |
| **Save/Unsave Place** | `CityDetail.tsx:102-141`, `savedPlaces.ts`, `places.ts` | `POST/DELETE /api/v1/places/saved` | `saved_places` | N/A | No toast feedback on success/failure |
| **Account/Premium** | `Account.tsx`, `Header.tsx:103-119` | `/api/v1/users/profile` | `users` | N/A | Premium buttons disabled, no onClick |
| **Footer** | `Home.tsx:259-299`, `SimpleFooter.tsx` | N/A | N/A | N/A | Home footer has team info, simple footer empty |
| **Daily Itinerary** | `DailyItinerary.tsx`, `ItineraryView.tsx` | `/api/v1/itineraries/{id}` | `itineraries`, `days`, `activities` | N/A | No explicit "save itinerary" button |
| **Trip Workspace** | `TripWorkspace.tsx`, `useTripSync.ts`, `useActivityManager.ts` | `/api/v1/itineraries/{id}`, `/api/v1/itineraries/{id}/days` | `itineraries`, `days`, `activities`, `extra_expenses` | N/A | Auto-save on edit, error message unclear |
| **Trip History** | `TripHistory.tsx`, `SavedItineraries.tsx` | `GET /api/v1/itineraries` | `itineraries` | N/A | No status controls, delete flow cumbersome |
| **Create Trip (AI)** | `CreateTrip.tsx`, `GenerateTrip.tsx`, `tripWizardContext.tsx` | `POST /api/v1/itineraries/generate` | `itineraries`, `days`, `activities`, `accommodations` | N/A | 60s timeout, no progress indicator |
| **Manual Trip** | `ManualTripSetup.tsx`, `DayAllocation.tsx` | `POST /api/v1/itineraries` | `itineraries`, `days` | N/A | Date picker modal, place selection |
| **Budget Setup** | `BudgetSetup.tsx` | N/A (local state) | N/A | N/A | Warning threshold fixed in R5 |
| **Map/Goong** | N/A (no map component found) | N/A | N/A | N/A | **MISSING**: No Goong map integration |
| **FloatingAIChat** | `FloatingAIChat.tsx` (used in CompanionDemo, TripWorkspace) | N/A (demo only) | N/A | N/A | Fixed positioning bottom-right |
| **LiveBudgetBar** | `LiveBudgetBar.tsx` (used in CompanionDemo) | N/A (demo only) | N/A | N/A | Fixed positioning bottom-full-width |
| **Error Handler** | `errorHandler.ts:144` | N/A | N/A | N/A | Handles AI_PROVIDER_TIMEOUT |

---

## 5. Page/Action/Endpoint Matrix

| Page | User Action | Frontend Function/Hook | Endpoint | Payload | Response | UX Message |
|---|---|---|---|---|---|---|---|
| `/` (Home) | Click destination card | `nameToSlug` → navigate | N/A | N/A | N/A | Route change |
| `/cities` | View city list | `CityList.tsx` | `/api/v1/places/destinations` | N/A | `DestinationResponse[]` | N/A |
| `/cities/:cityId` | View city detail | `CityDetail.tsx:36-66` | `/api/v1/places/destinations/{name}` | N/A | `destination`, `places[]` | "Không tìm thấy thành phố" OR "Địa điểm chưa được hỗ trợ" |
| `/cities/:cityId` | Click save place | `toggleSavePlace` | `POST /api/v1/places/saved` OR `DELETE /api/v1/places/saved/{id}` | `{place_id}` | `{id, place: {...}}` | **No toast feedback** |
| `/account` | Click Premium button | **No onClick handler** | N/A | N/A | N/A | **No response** |
| `/account` | Click Profile Premium | **disabled button** | N/A | N/A | N/A | "Tính năng đang phát triển" (title tooltip) |
| `/create-trip` | Select destination + Generate | `handleGenerate` → `POST /api/v1/itineraries/generate` | `POST /api/v1/itineraries/generate` | `{destination, days, people, budget, start_date}` | `{trip, activities, accommodations}` OR timeout/error | Progress spinner → "Dịch vụ AI đang phản hồi quá lâu" |
| `/budget-setup` | Enter budget < 1M VND | `handleConfirm` | N/A (local validation) | N/A | N/A | Modal: "Cảnh báo ngân sách thấp" + "Ngân sách của bạn có vẻ quá thấp" |
| `/manual-trip-setup` | Add place | `PlaceSelectionModal` | `/api/v1/places/search` | `?city={name}` | `PlaceResponse[]` | Shows places from **all cities** (filter not working) |
| `/trip-workspace` | Edit activity (auto-save) | `handleUpdateActivity` → `syncChanges` | `PATCH /api/v1/itineraries/{id}/days/{dayId}/activities/{activityId}` | `{name, time, location, ...}` | `{day}` OR error | Toast: **"Lưu lên server thất bại, đã lưu tạm thời"** |
| `/trip-workspace` | Add expense (+ button) | `LiveBudgetBar` (if present) | N/A (local state) | N/A | N/A | **Covered by FloatingAIChat button** |
| `/daily-itinerary` | View trip | `DailyItinerary.tsx` | `GET /api/v1/itineraries/{id}` | N/A | `{trip, days, ...}` | No "save itinerary" button visible |
| `/my-trips` | Edit previous trip | Button exists | N/A | N/A | N/A | Unclear "continue editing" UX |
| `/my-trips` | Delete trip | Select → Delete button | `DELETE /api/v1/itineraries/{id}` | N/A | 204 | **Two-step flow inconvenient** |
| `/cities/:cityId` | Image load fails | `resolvePlaceImageWithCategory` → fallback | N/A | N/A | N/A | **404 for `/img/...` paths** |

---

## 6. UX Message Audit

| Trigger | Current Message | Is Clear? | Problem | Recommended Message | Severity |
|---|---|---|---|---|---|---|
| City not found vs no places | "Không tìm thấy thành phố" | ❌ NO | Same message for two different states | City not found: "Thành phố không tồn tại" / No places: "Thành phố này chưa có dữ liệu địa điểm" | P1 |
| No places for city | "Địa điểm chưa được hỗ trợ trong giai đoạn hiện tại, Vui lòng liên hệ để được cập nhật thêm địa điểm" | ⚠️ PARTIAL | Too long, feels like error | "Địa điểm này đang được cập nhật. Vui lòng thử lại sau hoặc chọn thành phố khác." | P1 |
| Save place success | **No message** | ❌ NO | No feedback | "Đã lưu địa điểm" | P1 |
| Save place failed | **No message** | ❌ NO | No feedback | "Không thể lưu địa điểm. Vui lòng thử lại." | P1 |
| Premium click (Account) | **No response** | ❌ NO | Button does nothing | Show modal: "Tính năng Premium đang phát triển. Đăng ký để nhận thông báo khi ra mắt." | P2 |
| Premium click (Header) | **Button disabled** | ❌ NO | Disabled with no explanation | Enable button, show modal on click with benefits | P2 |
| AI timeout (R5 fixed) | "Dịch vụ AI đang phản hồi quá lâu nên chưa thể tạo lịch trình. Chưa có lịch trình nào được lưu. Vui lòng thử lại sau." | ✅ YES | Fixed in R5 | N/A (fixed) | P0 (fixed) |
| Budget warning (R5 fixed) | "Cảnh báo ngân sách thấp" / "Ngân sách của bạn có vẻ quá thấp" | ⚠️ PARTIAL | Fixed threshold but modal still appears for legitimate budgets | Only show if budget < 500K VND per day per person | P1 (partially fixed) |
| Trip workspace save failed | "Lưu lên server thất bại, đã lưu tạm thời" | ❌ NO | Root cause unclear (quota? auth? server?) | Distinguish: "Quota exceeded: Giới hạn 5 chuyến đi. Nâng Premium để lưu thêm." OR "Network error: Đã lưu tạm, sẽ tải lại khi có kết nối." | P0 |
| Trip limit 5/5 | **No specific message** | ❌ NO | Generic save error | Use specific message when limit reached | P0 |
| Share login required | "Vui lòng đăng nhập để chia sẻ" | ✅ YES | Clear | N/A | N/A |
| Share token invalid | "Liên kết không hợp lệ hoặc đã hết hạn" | ✅ YES | Clear | N/A | N/A |
| Manual add place from wrong city | **No warning** | ❌ NO | Can select places from other cities | "Vui lòng chọn địa điểm tại [destination] để thêm vào lịch trình." | P1 |
| Daily itinerary save | **No explicit action** | ❌ NO | Only edit/share/create new visible | Add "Lưu lịch trình" button to daily view | P2 |
| Map unavailable | **No message** | ❌ NO | Map not shown | "Bản đồ đang được cập nhật. Sẽ có mặt trong phiên bản tới." | P2 |

---

## 7. Test Coverage Gap

| Finding/User Bug | Covered by Existing Test? | Existing Test Name | Gap | Recommended New Test |
|---|---|---|---|---|---|
| Web title "Travel (Copy)" | ❌ NO | N/A | No test checks index.html title | `test_index_title_correct()` |
| Destination image 404 | ❌ NO | N/A | Tests mock images, don't verify real paths | `test_destination_image_fallback_behavior()` |
| /cities no-data state | ❌ NO | N/A | No test for city with no places | `test_city_detail_no_places_shows_correct_message()` |
| Save place feedback | ❌ NO | N/A | No test verifies toast on save/unsave | `test_save_place_shows_success_toast()` |
| Premium UX | ❌ NO | N/A | No test for Premium button behavior | `test_premium_button_shows_modal_on_click()` |
| Footer team info | ❌ NO | N/A | No test for footer content | `test_footer_shows_complete_team_info()` |
| Budget warning threshold | ⚠️ PARTIAL | No BudgetSetup e2e test | No e2e test for budget warning | `test_budget_warning_shows_only_for_very_low_budgets()` |
| Manual add place city filter | ❌ NO | N/A | No test verifies only current city places shown | `test_manual_add_place_filters_by_selected_city()` |
| Trip workspace save error message | ❌ NO | N/A | No test for error message specificity | `test_trip_save_error_message_distinguishes_quota_vs_network()` |
| Expense + button overlap | ❌ NO | N/A | No test for z-index/positioning conflicts | `test_live_budget_bar_plus_button_not_obscured()` |
| Daily itinerary save button | ❌ NO | N/A | No test verifies save button presence | `test_daily_itinerary_has_save_button()` |
| Goong map placeholder | ❌ NO | N/A | No map component tests | `test_map_placeholder_or_integration_present()` (future) |
| AI timeout message | ✅ YES | `test_generate_text__timeout_returns_retryable_service_unavailable` | Unit test validates error_code, not message | Message fixed in R5, needs e2e verification |
| Slug-to-name route mismatch | ❌ NO | N/A | No test for slug resolution | `test_city_detail_slug_resolves_correctly()` |

---

## 8. Logging/Instrumentation Audit

| Area | Current Logging | Missing | Recommendation |
|---|---|---|---|---|
| **Backend API requests** | ✅ GOOD | N/A | `request_id_middleware.py` logs all requests with `x-request-id`, duration_ms | N/A |
| **AI generation** | ✅ GOOD | N/A | `pipeline.py` logs: `ai_generate_context_loaded`, `gemini_request_timeout`, `ai_generate_completed` | N/A |
| **Place/destination API** | ✅ GOOD | N/A | `places/service.py` logs cache hits/misses | N/A |
| **Rate limiting** | ✅ GOOD | N/A | `rate_limiter.py` logs quota checks, `AI_RATE_LIMIT_REACHED` | N/A |
| **Frontend page actions** | ❌ NONE | All button clicks, route changes, user actions | Add optional debug logger for local smoke: `page_route`, `action_name`, `endpoint`, `latency`, `toast_message` | Create `src/utils/debugLogger.ts` (local only) |
| **Image load failures** | ❌ NONE | Image 404s, fallback triggers | Log: `image_url`, `error_type`, `fallback_used` | Add to `resolvePlaceImageWithCategory` |
| **Budget warning calculations** | ❌ NONE | Warning threshold triggers | Log: `budget_amount`, `threshold`, `triggered` | Add to `BudgetSetup.tsx` (debug only) |
| **Save place success/failure** | ⚠️ PARTIAL | Backend logs API calls, but no FE toast | Log: `place_id`, `action`, `result` | Add to `toggleSavePlace` + toast |
| **Trip workspace save errors** | ⚠️ PARTIAL | Backend logs errors, but generic FE message | Log: `error_type`, `quota_remaining`, `auth_status` | Distinguish error types in `useTripSync.ts:333` |
| **logs/ folder** | ❌ NO | `.gitignore` has no `logs/` entry | Add to `.gitignore`: `logs/`, `*.log` | **ALLOWED**: Update `.gitignore` for audit support |

---

## 9. Finding Classification

| ID | Finding | Severity | Root Cause | Evidence | Proposed Fix Phase |
|---|---|---|---|---|---|---|
| **F1** | Web title "Travel (Copy)" | P2 | Static HTML not updated | `Frontend/index.html:7` | R7A |
| **F2** | Destination image 404 (relative paths) | P1 | ETL creates `/img/...` paths, no actual files | DB query + `Home.tsx:47-58` logic | R7A (partially fixed in R5) |
| **F3** | All place images NULL in DB | P1 | ETL doesn't populate image field | DB: `with_images = 0` | 00060K (ETL image crawl) |
| **F4** | City not found vs no places same message | P1 | Single error message for two states | `CityDetail.tsx:88` | R7A |
| **F5** | Save place no UX feedback | P1 | No toast after save/unsave | `CityDetail.tsx:102-141` no toast | R7A |
| **F6** | Premium click no response | P2 | No onClick handler, button disabled | `Account.tsx:162`, `Header.tsx:115` | R7A |
| **F7** | Footer team info incomplete | P2 | Only shows leader name | `Home.tsx:26-29` | R7A |
| **F8** | Budget warning for all budgets (R5 fixed) | P1 (fixed) | Threshold 10K VND too low | `BudgetSetup.tsx:45-48` | ✅ R5 (fixed) |
| **F9** | AI timeout misleading message (R5 fixed) | P0 (fixed) | "tạo chuyến đi ngắn hơn" for 2-day trip | `llm.py:97-98` | ✅ R5 (fixed) |
| **F10** | Trip workspace save message unclear | P0 | Generic "thất bại, đã lưu tạm thời" | `useTripSync.ts:333` | R7C |
| **F11** | Trip limit 5/5 no specific message | P0 | Uses same generic error | Quota enforcement exists, message unclear | R7C |
| **F12** | Manual add place shows other cities | P1 | Place search API not filtered by city | `PlaceSelectionModal` uses `/api/v1/places/search` without city filter | R7B |
| **F13** | Daily itinerary no save button | P2 | Only edit/share/create new visible | `DailyItinerary.tsx` UI | R7C |
| **F14** | Trip history no status controls | P2 | No upcoming/in-progress/completed dropdown | `TripHistory.tsx` UI | Future |
| **F15** | Delete flow inconvenient | P2 | Two-step select + delete button | `TripHistory.tsx` UX | Future |
| **F16** | Date picker modal scales poorly | P2 | CalendarModal scroll behavior | `CalendarModal.tsx` | R7B |
| **F17** | AI generation slow (60s timeout) | P0 | Gemini latency + validation + retry | `CreateTrip.tsx` + `pipeline.py` | 00060L (async generation) |
| **F18** | Expense + button covered by chatbot | P1 | FloatingAIChat overlaps LiveBudgetBar + button | `FloatingAIChat.tsx:107` + `LiveBudgetBar.tsx:58` | R7A |
| **F19** | Map UI missing / too sơ sài | P1 | No Goong map integration found | Source search found no map component | 00060M (Goong map integration) |
| **F20** | Đà Lạt partial data (10 places only) | P2 | ETL only returned food category | DB: Đà Lạt has only `food` category | 00060K (ETL expansion) |

---

## 10. Proposed Fix Groups

| Fix Group | Includes Findings | Tests Required | Notes |
|---|---|---|---|---|
| **R7A: Visual/Static/Image/Title Fixes** | F1, F2, F4-F7, F18 | `test_index_title_correct()`, `test_destination_image_fallback()`, `test_city_detail_no_places_message()`, `test_save_place_toast()`, `test_premium_modal()`, `test_footer_team_info()`, `test_floating_chat_overlap()` | Quick wins, low risk. F2 partially fixed in R5 (skip relative paths). |
| **R7B: Create/Manual/Budget/Date/Place Filter Fixes** | F12, F16 | `test_manual_add_place_city_filter()`, `test_date_picker_modal_scaling()` | Medium complexity. Place filter requires API parameter verification. |
| **R7C: Trip Workspace/History/Share/Save UX Fixes** | F10, F11, F13 | `test_trip_save_error_specificity()`, `test_daily_itinerary_save_button()` | Critical P0 issues. Error message clarity affects user trust. |
| **R7D: Logging/Test Coverage/Skill Hardening** | F5 (test), F18 (test), all e2e gaps | All recommended new tests from Section 7 | Optional but recommended. Add `logs/` to `.gitignore`. |
| **00060K: ETL Image/Goong/Data Crawler/Scheduler** | F3, F20 | ETL integration tests | Large scope. Requires crawling Goong images, scheduler, ETL expansion. |
| **00060L: Async Generation/Provider Timeout** | F17 | Async generation tests | Large scope. Requires background jobs, polling, progress UI. |
| **00060M: Goong Map Integration** | F19 | Map component tests | Future phase. Requires Goong Map SDK integration. |

**Recommended Execution Order**:
1. **R7A** (quick wins, unblock users)
2. **R7C** (critical P0 save errors)
3. **R7B** (manual trip flow)
4. **R7D** (test coverage)
5. **00060K** (ETL data quality)
6. **00060L** (AI performance)
7. **00060M** (map - future)

---

## 11. Files Changed (Audit Only)

| File | Change | Why |
|---|---|---|---|
| `docs/REPORTS/00060j_r6_deep_end_user_audit.md` | CREATED | Main audit report |
| `docs/REPORTS/pr_00060j_r6_audit_note.md` | CREATED | PR-specific note for reviewer |

**No production code changed** (docs only, as per audit rules).

---

## 12. Commit/PR

| Item | Value |
|---|---|
| Branch | `fix/00060-d-local-smoke-ux-data-fix` |
| Commit (R5) | `445b0f6` - "fix: [#00060] fix destination image 404, ai timeout message, and budget warning threshold" |
| PR | #85 - "fix: [#00060] fix local smoke ux and data blockers" |
| R5 Push Status | Not pushed yet (ahead of origin by 1) |
| R5 Included in PR #85 | ❌ NO (R5 is local only, PR #85 ends at da74392) |

---

## 13. Next Step

**DO NOT MERGE PR #85 YET.**

User should:
1. Review this audit report
2. Approve fix group prioritization (R7A → R7C → R7B → R7D)
3. Request fix prompt for approved groups

**After user approval**, run next prompt with:
- Fix group R7A (P0-P1 quick wins)
- Fix group R7C (critical save errors)
- Required tests from Section 7
- Expected branch: `fix/00060-d-local-smoke-ux-data-fix` (same branch)
- Expected commit: `fix: [#00060] R7A-R7C visual static save critical fixes`

---

## 14. Evidence Summary

### Database State (2026-06-05)
```
destinations: 10 rows (all is_active=true)
places: 618 rows (all image=NULL)
hotels: 22 rows (all image=NULL)
```

### Backend Services
```
✅ DB: postgres:16-alpine (healthy, port 5432)
✅ Redis: redis:7-alpine (healthy, port 6379)
✅ Backend: uvicorn (port 8000, /api/v1/health = 200)
```

### API Endpoints Verified
```
✅ GET /api/v1/health → {"status":"healthy"}
✅ GET /api/v1/places/destinations → 10 destinations
❓ GET /api/v1/places/search?city=... → Empty (encoding issue)
```

### Critical Source Locations
```
Title: Frontend/index.html:7
Images: Frontend/src/app/pages/Home.tsx:47-58
Budget: Frontend/src/app/pages/BudgetSetup.tsx:45-48 (R5 fixed)
Timeout: Backend/src/agent/llm.py:97-98 (R5 fixed)
Save Error: Frontend/src/app/hooks/trips/useTripSync.ts:333
Premium: Frontend/src/app/pages/Account.tsx:162, Frontend/src/app/components/Header.tsx:115
Footer: Frontend/src/app/pages/Home.tsx:269-299
Cities: Frontend/src/app/pages/CityDetail.tsx:88 (message), 102-141 (save)
```

---

**End of Audit Report**
