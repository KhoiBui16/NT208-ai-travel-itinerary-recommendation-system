# Comprehensive Browser Testing Plan

**Ngày tạo:** 2026-06-08
**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Mục tiêu:** Test toàn bộ UI/UX với screenshots và evidence collection trước Phase C3/C4

---

## Testing Philosophy

> "Phải test thực qua web-browser và nhớ rằng db và redis xài qua docker"

Theo `fullstack-browser-debug` skill từ `.claude/skills/`:

- **Không đoán, phải có evidence:** Screenshots + Network logs + Console errors + Backend logs
- **Isolate root cause:** Phân loại failures thành FE logic / BE API / Redis quota / DB data / external provider
- **Không thay đổi UI/UX khi debug:** Chỉ sửa logic khi root cause đã được chứng minh

---

## Test Environment Setup

### 1. Start All Services

```powershell
# Terminal 1: Docker services
docker compose up -d db redis
docker compose ps

# Terminal 2: Backend
cd Backend
uv run alembic upgrade head
$env:AGENT_TIMEOUT_SECONDS="120"
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"
uv run uvicorn src.main:app --host localhost --port 8000 --reload

# Terminal 3: Frontend
cd Frontend
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

### 2. Preflight Checklist

```powershell
# Branch and dirty tree
git status --short --branch
git log --oneline --decorate -5

# Docker services
docker compose ps

# Port ownership
Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
  Where-Object { $_.LocalPort -in 8000,8001,8020,5173,5432,6379 } |
  Select-Object LocalAddress,LocalPort,OwningProcess

# Backend health
curl.exe -i http://localhost:8000/api/v1/health

# Verify Vite API base
(Invoke-WebRequest -Uri "http://localhost:5173/src/app/services/api.ts" -UseBasicParsing).Content |
  Select-String -Pattern "VITE_API_URL|localhost:8000|localhost:8000"
```

---

## Test Scenarios

### Category 1: Authentication Flow

#### Test 1.1: Guest Access Home Page

**Steps:**
1. Open browser (incognito)
2. Navigate to `http://localhost:5173`
3. Capture pre-action screenshot
4. Verify: Home page loads
5. Check: Network requests (status codes)
6. Check: Browser console (no errors)
7. Capture post-action screenshot

**Expected Results:**
- ✅ Home page displays correctly
- ✅ No console errors
- ✅ All static assets load (200 status)
- ✅ Hero section visible
- ✅ Destination cards visible

**Evidence Required:**
- [ ] Screenshot: Home page full view
- [ ] Network tab: All requests 200
- [ ] Console: No errors
- [ ] Backend logs: No errors

---

#### Test 1.2: User Registration

**Steps:**
1. Click "Đăng ký" button
2. Capture pre-action screenshot
3. Fill form: email, password, name
4. Click "Đăng ký"
5. Wait for response
6. Check: Network POST /api/v1/auth/register
7. Check: Response 201 with tokens
8. Check: Redirect to home page
9. Capture post-action screenshot

**Expected Results:**
- ✅ Registration form validates input
- ✅ API returns 201 with accessToken, refreshToken, user
- ✅ Tokens saved to localStorage
- ✅ User redirected to home page
- ✅ User profile loaded

**Evidence Required:**
- [ ] Screenshot: Registration form
- [ ] Screenshot: After registration (home page)
- [ ] Network: POST /api/v1/auth/register (201)
- [ ] Console: No errors
- [ ] localStorage: accessToken, refreshToken present
- [ ] Backend logs: User created successfully

---

#### Test 1.3: User Login

**Steps:**
1. Click "Đăng nhập" button
2. Capture pre-action screenshot
3. Fill form: email, password
4. Click "Đăng nhập"
5. Wait for response
6. Check: Network POST /api/v1/auth/login
7. Check: Response 200 with tokens
8. Check: Redirect to home page or previous page
9. Capture post-action screenshot

**Expected Results:**
- ✅ Login form validates input
- ✅ API returns 200 with tokens
- ✅ Tokens saved to localStorage
- ✅ User redirected correctly
- ✅ User profile loaded

**Evidence Required:**
- [ ] Screenshot: Login form
- [ ] Screenshot: After login
- [ ] Network: POST /api/v1/auth/login (200)
- [ ] Console: No errors
- [ ] localStorage: Tokens present
- [ ] Backend logs: Login successful

---

#### Test 1.4: Token Refresh on 401

**Steps:**
1. Login as user
2. Manually expire accessToken (wait 30 min or modify localStorage)
3. Perform API call (e.g., load profile)
4. Check: Network GET /api/v1/users/profile returns 401
5. Check: Automatic POST /api/v1/auth/refresh
6. Check: Original request retried with new token
7. Capture screenshots at each step

**Expected Results:**
- ✅ 401 triggers automatic refresh
- ✅ POST /api/v1/auth/refresh returns new tokens
- ✅ Original request retried successfully
- ✅ UI updates without user intervention

**Evidence Required:**
- [ ] Screenshot: Before expiry
- [ ] Screenshot: After refresh
- [ ] Network: 401 → refresh → 200 sequence
- [ ] Console: No errors visible to user
- [ ] Backend logs: Refresh successful

---

#### Test 1.5: User Logout

**Steps:**
1. Click user menu
2. Click "Đăng xuất"
3. Capture pre-action screenshot
4. Confirm logout
5. Check: Network POST /api/v1/auth/logout
6. Check: Tokens removed from localStorage
7. Check: Redirect to home page
8. Capture post-action screenshot

**Expected Results:**
- ✅ Logout API called successfully
- ✅ Tokens cleared from localStorage
- ✅ User redirected to home page
- ✅ Protected routes inaccessible

**Evidence Required:**
- [ ] Screenshot: User menu with logout
- [ ] Screenshot: After logout (home page)
- [ ] Network: POST /api/v1/auth/logout (204/200)
- [ ] localStorage: Tokens cleared
- [ ] Backend logs: Refresh token revoked

---

### Category 2: Trip Creation & Management

#### Test 2.1: Manual Trip Creation (Authenticated)

**Steps:**
1. Navigate to `/create-trip`
2. Capture pre-action screenshot
3. Fill form:
   - Destination: "Hà Nội"
   - Trip name: "Chuyến đi Hà Nội"
   - Start date: Select date
   - End date: Select date (+2 days)
   - Budget: 5000000
   - Adults: 2, Children: 0
   - Interests: Select checkboxes
4. Click "Tạo lịch trình"
5. Check: Network POST /api/v1/itineraries
6. Check: Response 201 with trip data
7. Check: Redirect to `/trip-workspace?tripId={id}`
8. Capture post-action screenshot

**Expected Results:**
- ✅ Form validation works (dates, budget)
- ✅ API returns 201 with ItineraryResponse
- ✅ Trip created in DB
- ✅ Redirect to workspace
- ✅ Workspace displays trip correctly

**Evidence Required:**
- [ ] Screenshot: Create trip form (filled)
- [ ] Screenshot: Trip workspace after creation
- [ ] Network: POST /api/v1/itineraries (201)
- [ ] Response body: Complete ItineraryResponse
- [ ] DB verification: SELECT * FROM trips WHERE id = {new_id}
- [ ] Backend logs: Trip created successfully

---

#### Test 2.2: AI Trip Generation (Authenticated)

**Steps:**
1. Navigate to `/create-trip`
2. Capture pre-action screenshot
3. Fill form (same as Test 2.1)
4. Click "AI Generate" button
5. Check: Button shows loading state
6. Check: Network POST /api/v1/itineraries/generate
7. Wait for response (may take 30-120 seconds)
8. Check: Response 201 with generated trip
9. Check: Redirect to `/trip-workspace?tripId={id}`
10. Capture post-action screenshot

**Expected Results:**
- ✅ Loading UI shows during generation
- ✅ API returns 201 with complete trip
- ✅ Trip has days, activities, accommodations
- ✅ Redirect to workspace
- ✅ Workspace displays generated itinerary

**Evidence Required:**
- [ ] Screenshot: Create trip form (before generate)
- [ ] Screenshot: Loading state
- [ ] Screenshot: Trip workspace after generation
- [ ] Network: POST /api/v1/itineraries/generate (201)
- [ ] Response time: Record duration
- [ ] Response body: Complete generated trip
- [ ] Backend logs: AI generate pipeline logs
- [ ] DB verification: Trip with days, activities, accommodations

---

#### Test 2.3: Guest Trip Generation (Not Authenticated)

**Steps:**
1. Ensure NOT logged in (clear localStorage)
2. Navigate to `/create-trip`
3. Capture pre-action screenshot
4. Fill form and click "AI Generate"
5. Check: Network POST /api/v1/itineraries/generate (no Bearer token)
6. Check: Response 201 with trip + claimToken
7. Check: sessionStorage has pendingClaim
8. Check: sessionStorage has currentTrip
9. Check: Redirect to `/trip-workspace?tripId={id}`
10. Capture post-action screenshot

**Expected Results:**
- ✅ Guest can generate trip
- ✅ Response includes claimToken
- ✅ FE stores pendingClaim in sessionStorage
- ✅ FE stores currentTrip in sessionStorage
- ✅ Workspace loads from sessionStorage fallback
- ✅ Guest can view trip in same browser session

**Evidence Required:**
- [ ] Screenshot: Create trip form (guest)
- [ ] Screenshot: Trip workspace (guest, before claim)
- [ ] Network: POST /api/v1/itineraries/generate (201, no auth)
- [ ] Response body: Includes claimToken
- [ ] sessionStorage: pendingClaim, currentTrip present
- [ ] DB verification: trip.user_id IS NULL
- [ ] DB verification: guest_claim_tokens entry created

---

#### Test 2.4: Guest Claim After Login

**Steps:**
1. (Continue from Test 2.3) - Guest has pending trip
2. Click "Đăng nhập"
3. Capture pre-action screenshot
4. Login with existing user or register new
5. Check: After login, POST /api/v1/itineraries/{tripId}/claim
6. Check: Response 200 with claimed: true
7. Check: pendingClaim removed from sessionStorage
8. Check: trip now shows in user's library
9. Capture post-action screenshot

**Expected Results:**
- ✅ Login triggers automatic claim
- ✅ Claim API succeeds
- ✅ Trip ownership transferred
- ✅ Trip appears in user's library
- ✅ Workspace accessible with full features

**Evidence Required:**
- [ ] Screenshot: Login form (with pendingClaim)
- [ ] Screenshot: After claim (trip workspace)
- [ ] Network: POST /api/v1/auth/login (200)
- [ ] Network: POST /api/v1/itineraries/{tripId}/claim (200)
- [ ] sessionStorage: pendingClaim removed
- [ ] DB verification: trip.user_id = {user_id}
- [ ] DB verification: guest_claim_tokens.consumed_at IS NOT NULL

---

#### Test 2.5: Trip Library Display

**Steps:**
1. Navigate to `/trip-library`
2. Capture screenshot
3. Check: All user's trips displayed
4. Check: Trip cards show destination, dates, budget
5. Check: Filter/search functionality works

**Expected Results:**
- ✅ All user trips listed
- ✅ Trip details visible (name, destination, dates)
- ✅ Filter by destination works
- ✅ Search by name works
- ✅ Pagination works if > 10 trips

**Evidence Required:**
- [ ] Screenshot: Trip library with multiple trips
- [ ] Network: GET /api/v1/itineraries (200)
- [ ] Response body: Paginated trip list
- [ ] Console: No errors
- [ ] Backend logs: Query executed successfully

---

#### Test 2.6: Trip Deletion

**Steps:**
1. Open trip from library
2. Click "Xóa lịch trình"
3. Capture pre-action screenshot
4. Confirm deletion
5. Check: Network DELETE /api/v1/itineraries/{tripId}
6. Check: Response 204/200
7. Check: Redirect to trip library
8. Check: Trip no longer in library
9. Capture post-action screenshot

**Expected Results:**
- ✅ Confirmation dialog shows
- ✅ Delete API succeeds
- ✅ Trip removed from library
- ✅ DB trip deleted or marked deleted

**Evidence Required:**
- [ ] Screenshot: Before deletion (trip workspace)
- [ ] Screenshot: After deletion (trip library)
- [ ] Network: DELETE /api/v1/itineraries/{tripId} (204)
- [ ] DB verification: Trip deleted

---

### Category 3: Trip Workspace & Editing

#### Test 3.1: Add Activity

**Steps:**
1. Open trip workspace
2. Click "Thêm hoạt động" on a day
3. Capture pre-action screenshot
4. Fill activity form:
   - Name: "Thăm Văn Miếu"
   - Time: "09:00"
   - End time: "11:00"
   - Type: "attraction"
   - Location: "Hà Nội"
   - Description: "Tham quan văn hóa"
5. Click "Lưu"
6. Check: Network POST /api/v1/itineraries/{tripId}/activities
7. Check: Response 201 with activity
8. Check: Activity appears in UI
9. Capture post-action screenshot

**Expected Results:**
- ✅ Activity form validates input
- ✅ API returns 201 with activity
- ✅ UI shows optimistic update (instant)
- ✅ Activity persists after refresh
- ✅ Order index assigned correctly

**Evidence Required:**
- [ ] Screenshot: Before adding activity
- [ ] Screenshot: Activity form
- [ ] Screenshot: After adding activity
- [ ] Network: POST /api/v1/itineraries/{tripId}/activities (201)
- [ ] Response body: Complete activity
- [ ] UI: Activity visible in timeline
- [ ] DB verification: Activity in activities table

---

#### Test 3.2: Edit Activity

**Steps:**
1. Click on existing activity
2. Capture pre-action screenshot
3. Modify: Change time from "09:00" to "10:00"
4. Click "Lưu"
5. Check: Network PUT /api/v1/itineraries/{tripId}/activities/{actId}
6. Check: Response 200 with updated activity
7. Check: UI shows updated time
8. Capture post-action screenshot

**Expected Results:**
- ✅ Edit form populates with existing data
- ✅ API returns 200 with updated activity
- ✅ UI shows optimistic update
- ✅ Changes persist after refresh

**Evidence Required:**
- [ ] Screenshot: Activity edit form
- [ ] Screenshot: After edit
- [ ] Network: PUT /api/v1/itineraries/{tripId}/activities/{actId} (200)
- [ ] UI: Updated time visible
- [ ] DB verification: Activity updated

---

#### Test 3.3: Delete Activity

**Steps:**
1. Click delete icon on activity
2. Capture pre-action screenshot
3. Confirm deletion
4. Check: Network DELETE /api/v1/itineraries/{tripId}/activities/{actId}
5. Check: Response 204
6. Check: Activity removed from UI
7. Capture post-action screenshot

**Expected Results:**
- ✅ Confirmation dialog shows
- ✅ API returns 204
- ✅ UI shows optimistic update (instant removal)
- ✅ Activity removed from DB

**Evidence Required:**
- [ ] Screenshot: Before deletion
- [ ] Screenshot: After deletion
- [ ] Network: DELETE /api/v1/itineraries/{tripId}/activities/{actId} (204)
- [ ] UI: Activity no longer visible
- [ ] DB verification: Activity deleted

---

#### Test 3.4: Add Accommodation

**Steps:**
1. Click "Thêm chỗ ở"
2. Capture pre-action screenshot
3. Fill accommodation form:
   - Name: "Hotel Hà Nội"
   - Check-in: Date 1
   - Check-out: Date 2
   - Price per night: 500000
   - Booking type: "nightly"
   - Select days: Day 1, Day 2
4. Click "Lưu"
5. Check: Network POST /api/v1/itineraries/{tripId}/accommodations
6. Check: Response 201 with accommodation
7. Check: Accommodation appears in UI
8. **CRITICAL:** Check accommodation displayed on correct days (not "Chưa có nơi ở")
9. Capture post-action screenshot

**Expected Results:**
- ✅ Accommodation form validates input
- ✅ API returns 201 with accommodation
- ✅ UI shows accommodation on selected days
- ✅ day_ids contains real TripDay IDs
- ✅ No "Chưa có nơi ở" message

**Evidence Required:**
- [ ] Screenshot: Accommodation form
- [ ] Screenshot: After adding accommodation
- [ ] Network: POST /api/v1/itineraries/{tripId}/accommodations (201)
- [ ] Response body: day_ids array with real IDs
- [ ] UI: Accommodation visible on correct days
- [ ] DB verification: accommodations.day_ids = ARRAY[td_id1, td_id2]

---

#### Test 3.5: Auto-save Functionality

**Steps:**
1. Open trip workspace
2. Make multiple edits (add activity, change time, etc.)
3. Wait 5 seconds (debounce time)
4. Check: Network PUT /api/v1/itineraries/{tripId}
5. Check: Request body contains full trip state
6. Check: Response 200 with updated trip
7. Refresh page
8. Check: All changes persisted

**Expected Results:**
- ✅ Auto-save triggers after debounce
- ✅ Full trip state sent to API
- ✅ Changes persist across refresh
- ✅ No data loss

**Evidence Required:**
- [ ] Network: PUT /api/v1/itineraries/{tripId} (200)
- [ ] Request body: Full trip state
- [ ] UI: All changes visible after refresh
- [ ] DB verification: All changes saved

---

### Category 4: Places & Destinations

#### Test 4.1: Browse Destinations

**Steps:**
1. Navigate to `/cities`
2. Capture screenshot
3. Check: All destinations displayed
4. Check: Destination cards show image, name, places count
5. Click on a destination (e.g., "Hà Nội")
6. Check: Navigate to `/cities/{cityId}`
7. Capture screenshot

**Expected Results:**
- ✅ All 28 destinations visible
- ✅ Destination images load (or fallback)
- ✅ Places count displayed
- ✅ Click navigates to destination detail

**Evidence Required:**
- [ ] Screenshot: Cities list
- [ ] Screenshot: Destination detail
- [ ] Network: GET /api/v1/places/destinations (200)
- [ ] Console: No image 404 errors (or fallback working)
- [ ] UI: All cards render correctly

---

#### Test 4.2: Search Places

**Steps:**
1. Navigate to destination detail page
2. Find search box
3. Capture pre-action screenshot
4. Search: "đồ ăn" or "attraction"
5. Check: Network GET /api/v1/places/search?query=...
6. Check: Results appear
7. Check: Results match search query
8. Capture post-action screenshot

**Expected Results:**
- ✅ Search debounces (300ms)
- ✅ API returns results
- ✅ Results display correctly
- ✅ Category filter works
- ✅ Pagination works if > 20 results

**Evidence Required:**
- [ ] Screenshot: Before search
- [ ] Screenshot: Search results
- [ ] Network: GET /api/v1/places/search (200)
- [ ] Response body: Results array
- [ ] Console: No errors
- [ ] UI: Results match query

---

#### Test 4.3: Save Place to Favorites

**Steps:**
1. Search for a place
2. Click "Lưu" button on place card
3. (Must be logged in)
4. Capture pre-action screenshot
5. Check: Network POST /api/v1/places/saved
6. Check: Response 201
7. Check: Button changes to "Đã lưu"
8. Capture post-action screenshot

**Expected Results:**
- ✅ Auth check works (redirects to login if guest)
- ✅ API returns 201
- ✅ Button state updates
- ✅ Place appears in saved places

**Evidence Required:**
- [ ] Screenshot: Before saving
- [ ] Screenshot: After saving
- [ ] Network: POST /api/v1/places/saved (201)
- [ ] UI: Button state changed
- [ ] DB verification: saved_places entry created

---

#### Test 4.4: View Saved Places

**Steps:**
1. Navigate to `/saved-places`
2. Capture screenshot
3. Check: All saved places displayed
4. Check: Can remove from saved places

**Expected Results:**
- ✅ All saved places listed
- ✅ Place details visible
- ✅ Remove button works

**Evidence Required:**
- [ ] Screenshot: Saved places page
- [ ] Network: GET /api/v1/places/saved/list (200)
- [ ] Console: No errors

---

### Category 5: Sharing & Collaboration

#### Test 5.1: Generate Share Link

**Steps:**
1. Open trip workspace
2. Click "Chia sẻ"
3. Capture pre-action screenshot
4. Click "Tạo link chia sẻ"
5. Check: Network POST /api/v1/itineraries/{tripId}/share
6. Check: Response 200 with shareToken
7. Check: Share link displayed
8. Copy link
9. Capture post-action screenshot

**Expected Results:**
- ✅ Share dialog opens
- ✅ API returns shareToken
- ✅ Full share link displayed
- ✅ Copy button works

**Evidence Required:**
- [ ] Screenshot: Share dialog
- [ ] Network: POST /api/v1/itineraries/{tripId}/share (200)
- [ ] Response body: shareToken present
- [ ] UI: Share link visible

---

#### Test 5.2: Open Shared Trip (Public View)

**Steps:**
1. Open incognito window
2. Paste share link: `/shared/{shareToken}`
3. Capture screenshot
4. Check: Trip displays in read-only mode
5. Check: NO edit controls visible
6. Check: NO owner chat controls visible
7. Check: NO share button visible

**Expected Results:**
- ✅ Trip loads without auth
- ✅ Read-only mode enforced
- ✅ No edit/owner controls

**Evidence Required:**
- [ ] Screenshot: Shared trip view
- [ ] Network: GET /api/v1/shared/{shareToken} (200)
- [ ] UI: Read-only indicators visible
- [ ] UI: No edit buttons
- [ ] Backend logs: Share token verified

---

### Category 6: Error Scenarios

#### Test 6.1: Rate Limit (AI Generate Quota)

**Steps:**
1. Generate trip until quota exhausted (5/day for user)
2. Try to generate another trip
3. Capture screenshot
4. Check: Network POST /api/v1/itineraries/generate
5. Check: Response 429
6. Check: Error message displays
7. Check: Retry-After header present
8. Check: X-RateLimit-* headers present

**Expected Results:**
- ✅ API returns 429 when quota exhausted
- ✅ User-friendly error message
- ✅ Headers indicate when quota resets
- ✅ No generic "something went wrong"

**Evidence Required:**
- [ ] Screenshot: Rate limit error
- [ ] Network: POST /api/v1/itineraries/generate (429)
- [ ] Response headers: Retry-After, X-RateLimit-*
- [ ] UI: Error message visible
- [ ] Console: No unhandled errors
- [ ] Backend logs: Quota enforced

---

#### Test 6.2: AI Provider Timeout

**Steps:**
1. Monitor backend logs for AI timeout
2. (Can simulate by setting AGENT_TIMEOUT_SECONDS=1)
3. Try to generate trip
4. Capture screenshot
5. Check: Network POST /api/v1/itineraries/generate
6. Check: Response 503 with AI_PROVIDER_TIMEOUT
7. Check: User-friendly error message
8. Check: No trip created

**Expected Results:**
- ✅ API returns 503 (not 500)
- ✅ Error classified as AI_PROVIDER_TIMEOUT
- ✅ Clear error message
- ✅ No quota consumed on timeout

**Evidence Required:**
- [ ] Screenshot: Timeout error
- [ ] Network: POST /api/v1/itineraries/generate (503)
- [ ] Response body: AI_PROVIDER_TIMEOUT
- [ ] UI: Error message
- [ ] Backend logs: Timeout logged
- [ ] Redis: Quota not decremented

---

#### Test 6.3: Network Error (Backend Down)

**Steps:**
1. Stop backend server
2. Try to perform API action (e.g., load profile)
3. Capture screenshot
4. Check: Error message displays
5. Check: No app crash
6. Check: Retry mechanism works

**Expected Results:**
- ✅ User-friendly error message
- ✅ App doesn't crash
- ✅ Retry option available
- ✅ No console errors

**Evidence Required:**
- [ ] Screenshot: Network error
- [ ] Console: Network error logged
- [ ] UI: Error message visible
- [ ] Network tab: Failed request visible

---

#### Test 6.4: Validation Errors

**Steps:**
1. Try to create trip with invalid data:
   - End date before start date
   - Budget = 0
   - Destination empty
2. Capture screenshot
3. Check: Client-side validation prevents submit
4. Check: Error messages clear
5. Check: No API call made

**Expected Results:**
- ✅ Client-side validation works
- ✅ Clear error messages
- ✅ No unnecessary API calls

**Evidence Required:**
- [ ] Screenshot: Validation errors
- [ ] UI: Error messages visible
- [ ] Network: No API calls
- [ ] Console: No errors

---

### Category 7: Cross-Browser & Responsive

#### Test 7.1: Mobile Viewport

**Steps:**
1. Open DevTools
2. Enable mobile emulation (iPhone 12 Pro)
3. Navigate through key pages:
   - Home
   - Create trip
   - Trip workspace
   - Trip library
4. Capture screenshots for each

**Expected Results:**
- ✅ All pages responsive
- ✅ No horizontal scroll
- ✅ Touch targets large enough
- ✅ Text readable

**Evidence Required:**
- [ ] Screenshot: Home (mobile)
- [ ] Screenshot: Create trip (mobile)
- [ ] Screenshot: Trip workspace (mobile)
- [ ] Console: No responsive warnings

---

#### Test 7.2: Different Browsers

**Steps:**
1. Test in Chrome
2. Test in Firefox
3. Test in Edge
4. Verify key flows work in all:
   - Login
   - Create trip
   - Trip workspace
   - AI generate

**Expected Results:**
- ✅ All flows work in Chrome
- ✅ All flows work in Firefox
- ✅ All flows work in Edge

**Evidence Required:**
- [ ] Test results matrix (browser × flow)
- [ ] Screenshots per browser
- [ ] Console: No browser-specific errors

---

## Evidence Collection Template

For each test, use this template:

```markdown
### Test {ID}.{Number}: {Test Name}

**Date:** YYYY-MM-DD HH:MM
**Tester:** [Name]
**Browser:** Chrome 120.x
**Viewport:** 1280x920

#### Environment
- Branch: `fix/00060-d-local-smoke-ux-data-fix`
- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8000`
- Docker services: db (Up), redis (Up)

#### Screenshots
- [ ] Before action: `test-results/{test_id}_before.png`
- [ ] After action: `test-results/{test_id}_after.png`

#### Network Evidence
- [ ] Request URL: `/api/v1/...`
- [ ] Method: POST/GET/PUT/DELETE
- [ ] Status: 200/201/204/400/401/403/404/422/429/500/503
- [ ] Request body: {paste if applicable}
- [ ] Response body: {paste if applicable}
- [ ] Response time: Xms

#### Console Evidence
- [ ] Errors: [paste or "None"]
- [ ] Warnings: [paste or "None"]

#### Backend Logs (same timestamp)
```
[paste relevant log lines]
```

#### DB Verification (if applicable)
```sql
[paste query and results]
```

#### Classification
- Root Cause: [FE logic / BE API / Redis quota / DB data / external provider / configuration]
- Status: [PASS / FAIL / BLOCKED]
- Notes: [Additional observations]

#### Next Action
- [ ] If PASS: Move to next test
- [ ] If FAIL: Create issue report in docs/REPORTS/ISSUES/
- [ ] If BLOCKED: Document blocker and dependencies
```

---

## Success Criteria

Overall testing successful when:

1. **All Critical Flows Pass:**
   - [ ] Auth (login, register, logout, refresh)
   - [ ] Trip CRUD (create, edit, delete)
   - [ ] AI Generate (authenticated, guest)
   - [ ] Guest Claim flow

2. **Bug Fixes Verified:**
   - [ ] Bug #1: Accommodation dayIds match TripDay IDs
   - [ ] Bug #3: ETL conflict update refreshes data

3. **Data Quality Acceptable:**
   - [ ] All places have images (or fallback working)
   - [ ] Search results ordered reasonably
   - [ ] Redis cache working (no encoding issues)

4. **Error Handling Robust:**
   - [ ] Rate limit UX clear
   - [ ] AI timeout UX clear
   - [ ] Validation errors clear
   - [ ] Network errors handled

5. **UX/UX Standards Met:**
   - [ ] No console errors in normal flows
   - [ ] Loading states visible
   - [ ] Optimistic updates working
   - [ ] Error messages user-friendly

---

## Reporting Format

After testing, create report in `docs/REPORTS/00061_comprehensive_browser_test_results.md`:

```markdown
# Comprehensive Browser Test Results

**Date:** YYYY-MM-DD
**Branch:** `fix/00060-d-local-smoke-ux-data-fix`
**Tester:** [Name]

## Summary

- Total Tests: 40+
- Passed: X
- Failed: Y
- Blocked: Z

## Critical Results

| Category | Tests | Pass | Fail | Blocked |
|----------|-------|------|------|---------|
| Auth | 5 | X | Y | Z |
| Trip CRUD | 8 | X | Y | Z |
| AI Generate | 3 | X | Y | Z |
| Places | 4 | X | Y | Z |
| Sharing | 2 | X | Y | Z |
| Errors | 4 | X | Y | Z |
| Responsive | 2 | X | Y | Z |

## Bugs Found

### Bug #XXX: {Title}
- Severity: [Critical / High / Medium / Low]
- Evidence: `test-results/xxx.png`
- Steps to reproduce: ...
- Classification: [FE logic / BE API / Redis quota / DB data / external provider]
- Status: [Reported / Fixed / Verified]

## Recommendations

1. [High priority item]
2. [Medium priority item]
3. [Low priority item]

## Before Phase C3/C4

- [ ] All critical flows pass
- [ ] Bug #1 verified fixed
- [ ] Bug #3 verified fixed
- [ ] Data quality acceptable
- [ ] Error handling robust
```

---

**Generated:** 2026-06-08
**Status:** Ready for execution
**Next:** Execute tests sequentially, collect evidence, classify results
