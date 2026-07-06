# PR #85 - Complete Description (R5 + R6 + R7A + R7C)

**Branch**: `fix/00060-d-local-smoke-ux-data-fix`
**PR**: #85 - "fix: [#00060] fix local smoke ux and data blockers"
**Update Date**: 2026-06-05

---

## Summary of All Fixes Included in This PR

This PR now includes **R5 + R6 + R7A + R7C** fixes for comprehensive end-user UX improvements before merge.

### Phase Summary (in chronological order):

**Phase R5** (Commit 445b0f6):
1. ✅ **Destination image 404**: Skip relative `/img/...` paths, use fallback URLs directly from placeImage.ts
2. ✅ **AI timeout message**: Changed from misleading "tạo chuyến đi ngắn hơn 1-2 ngày" to generic "Chưa có lịch trình nào được lưu"
3. ✅ **Budget warning threshold**: Increased from 10K VND to 1M VND (realistic minimum based on 2M/ngày/người calculation)

**Phase R6** (Commit ec0b23e):
- ✅ Deep end-user smoke audit identifying 19 issues across P0-P2 severity
- ✅ Source discovery matrix, endpoint mapping, UX message audit
- ✅ Test coverage gap analysis, logging instrumentation audit
- ✅ Fix classification into R7A/R7B/R7C groups
- ✅ Database diagnostics: 10 destinations, 618 places, 22 hotels
- ✅ All place images = NULL in DB (deferred to 00060K)

**Phase R7A** (7 Critical UX Improvements):
1. ✅ **Web title**: Changed from "Travel (Copy)" to "AI Travel Itinerary - YourTrip"
2. ✅ **City detail state**: Distinguished between city not found vs city with no places
3. ✅ **Save place feedback**: Added toast notifications for save/unsave actions
4. ✅ **Premium UX**: Added onClick handler + coming-soon modal with benefits
5. ✅ **Footer team info**: Updated to show full role "Bùi Nhật Anh Khôi — Leader, Backend, AI"
6. ✅ **Chatbot overlap**: Repositioned FloatingAIChat to bottom-28 with z-20 to avoid LiveBudgetBar button conflict
7. ✅ **Destination images**: R5 fix handles relative path fallback correctly

**Phase R7C** (Critical Save Error Fixes):
1. ✅ **Trip save error classification**: Improved error messages to distinguish quota/auth/network/validation errors

**Phase R7-FIXUP** (Regression Fixes):
1. ✅ **CityDetail unsupported copy**: Restored exact user-requested copy "Địa điểm chưa được hỗ trợ trong giai đoạn hiện tại, Vui lòng liên hệ để được cập nhật thêm địa điểm" (removed "chọn thành phố khác" suggestion)
2. ✅ **FloatingAIChat layout**: Fixed invalid z-35 class, repositioned to bottom-28 (112px from bottom) with proper z-20 to avoid collision with Plus button
3. ✅ **Error classification logic**: Fixed quota error detection by checking error_code BEFORE status code, ensuring 5/5 message displays correctly

---

## Files Modified (7 files for R7A/R7C):

### R7A/R7C Changes:
1. `Frontend/index.html` - Web title updated
2. `Frontend/src/app/components/FloatingAIChat.tsx` - Repositioned to bottom-28 with z-20
3. `Frontend/src/app/components/Header.tsx` - Premium modal added
4. `Frontend/src/app/hooks/trips/useTripSync.ts` - Error classification improved
5. `Frontend/src/app/pages/Account.tsx` - Premium modal added
6. `Frontend/src/app/pages/CityDetail.tsx` - City state messages + save place toasts
7. `Frontend/src/app/pages/Home.tsx` - Footer team info updated

### Previous Phase Files (already in PR):
- Various files from 00060I, 00060J, 00060K prep work

---

## Detailed Fix Descriptions:

### R5 Fixes:

**F2: Destination Image 404** - `Frontend/src/app/pages/Home.tsx`
- **Before**: Relative paths `/img/...` prefixed with BE URL → 404 errors
- **After**: Skip relative paths, use fallback Unsplash URLs directly
- **Impact**: No more broken image icons for destinations

**F9: AI Timeout Message** - `Backend/src/agent/llm.py`
- **Before**: "Vui lòng thử lại sau hoặc tạo chuyến đi ngắn hơn" (misleading for 2-day trips)
- **After**: "Dịch vụ AI đang phản hồi quá lâu nên chưa thể tạo lịch trình. Chưa có lịch trình nào được lưu. Vui lòng thử lại sau."
- **Impact**: Clear generic message, no misleading duration suggestions

**F8: Budget Warning Threshold** - `Frontend/src/app/pages/BudgetSetup.tsx`
- **Before**: Warning appeared for all budgets (threshold: 10K VND)
- **After**: Warning only appears if budget < 1M VND (realistic minimum)
- **Impact**: Warning only shows for genuinely low budgets

### R7A Fixes:

**F1: Web Title** - `Frontend/index.html:7`
- **Change**: `<title>Travel app (Copy)</title>` → `<title>AI Travel Itinerary - YourTrip</title>`
- **Impact**: Professional appearance, no placeholder text

**F4: City Detail State Messages** - `Frontend/src/app/pages/CityDetail.tsx`
- **City not found**: "Thành phố không tồn tại" + "Vui lòng chọn thành phố khác từ danh sách"
- **City exists no places**: "Địa điểm chưa được hỗ trợ trong giai đoạn hiện tại, Vui lòng liên hệ để được cập nhật thêm địa điểm"
- **Impact**: Users can distinguish between invalid slug vs unsupported location, with exact user-requested copy that does not suggest choosing a different city

**F5: Save Place Feedback** - `Frontend/src/app/pages/CityDetail.tsx`
- **Success**: Toast "Đã lưu địa điểm" / "Đã bỏ lưu địa điểm"
- **Failure**: Toast "Không thể lưu địa điểm lúc này. Vui lòng thử lại."
- **Guest**: LoginRequiredModal appears
- **Impact**: Clear UX feedback for bookmark actions

**F6: Premium UX** - `Frontend/src/app/pages/Account.tsx` + `Frontend/src/app/components/Header.tsx`
- **Added**: onClick handler + premium modal with benefits:
  - Lưu nhiều lịch trình hơn
  - Tạo nhiều lịch trình AI hơn
  - Ưu tiên tốc độ & gợi ý
- **Impact**: Premium buttons now responsive with clear coming-soon message

**F7: Footer Team Info** - `Frontend/src/app/pages/Home.tsx`
- **Change**: "Bùi Nhật Anh Khôi - Leader" → "Bùi Nhật Anh Khôi — Leader, Backend, AI"
- **Impact**: Complete role information displayed

**F18: Chatbot Overlap** - `Frontend/src/app/components/FloatingAIChat.tsx`
- **Change**: Repositioned from bottom-6 to bottom-28 (112px higher), z-index from z-40 to z-20
- **Impact**: No longer conflicts with LiveBudgetBar add expense button (which is at bottom-0, z-30)

### R7C Fixes:

**F10/F11: Trip Save Error Classification** - `Frontend/src/app/hooks/trips/useTripSync.ts`
- **Quota error (TRIP_LIMIT_EXCEEDED/TRIP_QUOTA_EXCEEDED)**: "Bạn đã đạt giới hạn 5/5 lịch trình có thể lưu. Hãy xóa một lịch trình cũ hoặc nâng cấp khi Premium khả dụng."
- **Auth error (401)**: "Vui lòng đăng nhập để lưu lịch trình."
- **Generic forbidden (403)**: "Bạn không có quyền thực hiện hành động này."
- **Rate limit (429)**: "Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút."
- **Validation error (422)**: "Dữ liệu lịch trình không hợp lệ. Vui lòng kiểm tra và thử lại."
- **Network/server error (500/503)**: "Không thể lưu lịch trình lên server lúc này. Lịch trình đã được lưu tạm trên thiết bị này."
- **Impact**: Users understand exactly why save failed and what to do. Fixed quota detection by checking error_code before status code.

---

## Test Results:

- ✅ **Frontend build**: PASS (42.20s, 1.2MB bundle)
- ✅ **Backend lint**: All checks passed
- ✅ **Backend unit tests**: 27/27 itinerary/trip tests passed (10.38s)
- ✅ **Git diff check**: No trailing whitespace issues
- ✅ **Branch status**: Clean working tree (R5/R6/R7A/R7C ready)

---

## Deferred to Future Phases:

**00060K** - ETL Image Crawl:
- All 618 places have `image = NULL` in DB
- All 22 hotels have `image = NULL` in DB- Currently using category fallback from Pexels (working solution)
- Need ETL image crawl for real destination/place photos

**00060L** - Async Generation:
- AI generation can timeout for longer trips (current: 60s timeout)
- Need background job + polling + progress UI
- Unblock longer trips without blocking UI

**00060M** - Goong Map Integration:
- Map UI currently missing/too sơ sài
- Need Goong Map SDK integration
- Large scope, deferred to future phase

**R7B Remaining** - Manual Add Place Filter:
- Add place modal can show places from other cities
- Fix requires API parameter verification (destination/city filter)
- Documented in audit, fix in future iteration

**R7C Remaining** - DailyItinerary/TripHistory UX:
- DailyItinerary: Verify save action is clear
- TripHistory: Verify continue editing + status + delete UX
- Lower priority, can be improved in future iteration

---

## Manual Smoke Verification Checklist:

Before merging, verify:

### R5 Fixes:
- [ ] Destination cards show images (no 404 icons)
- [ ] AI timeout message is generic (no "short trip" suggestion)
- [ ] Budget warning only appears for very low budgets (< 1M VND)

### R7A Fixes:
- [ ] Web browser tab shows "AI Travel Itinerary - YourTrip" (not "Travel (Copy)")
- [ ] Invalid city slug shows "Thành phố không tồn tại"
- [ ] City with no data shows "Địa điểm đang được cập nhật"
- [ ] Save place button shows toast notification
- [ ] Unsave place button shows toast notification
- [ ] Premium button shows coming-soon modal with benefits
- [ ] Footer shows "Bùi Nhật Anh Khôi — Leader, Backend, AI"
- [ ] FloatingAIChat doesn't overlap add expense button

### R7C Fixes:
- [ ] Trip quota error shows specific 5/5 message
- [ ] Network/server error shows temporary local save message
- [ ] Auth error shows login required message

---

## Expected Final Commit Message:

```
fix: [#00060] harden end-user ux blockers before merge
```

---

**Implementation Status**: ✅ Complete (R5 + R6 + R7A + R7C). Ready for user manual smoke test before commit.
