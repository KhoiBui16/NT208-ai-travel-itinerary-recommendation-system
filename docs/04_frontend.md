# 04. Frontend MVP2

## Mục đích

File này mô tả **chi tiết kiến trúc Frontend** — component hierarchy, hook data flow, API client layer, routing, auth context, và integration status với BE. Đọc khi cần hiểu FE data flow, debug API integration, hoặc thêm page/component mới.

**Khi nào đọc file này:**
- Thêm page mới → hiểu route map, ProtectedRoute pattern
- Debug API call → trace từ component → hook → service → api.ts
- Thêm hook mới → hiểu optimistic update pattern
- Code review FE-BE contract → kiểm tra camelCase field names

---

## 1. Runtime Structure

```text
Frontend/
├── src/
│   ├── main.tsx                    # Entry point → App.tsx
│   ├── app/
│   │   ├── App.tsx                 # Root: ErrorBoundary > AuthProvider > TripWizardProvider > Router
│   │   ├── routes.tsx              # Route definitions (public, protected, catch-all)
│   │   ├── components/
│   │   │   ├── ui/                 # 40+ shadcn/ui components (Button, Dialog, Card, etc.)
│   │   │   ├── ErrorBoundary.tsx   # Catch React runtime errors → show recovery UI
│   │   │   ├── ProtectedRoute.tsx  # Redirect /login if not authenticated
│   │   │   ├── Header.tsx         # Navigation bar, auth state
│   │   │   ├── TripSidebar.tsx    # Day list in workspace
│   │   │   ├── TripTimeline.tsx   # Activity timeline per day
│   │   │   ├── TripAccommodation.tsx  # Hotel/accommodation panel
│   │   │   ├── TripBudgetSidebar.tsx  # Budget summary
│   │   │   ├── TopActionBar.tsx   # Share, save, export actions
│   │   │   ├── ActivityDetailModal.tsx # Edit activity popup
│   │   │   ├── AddPlaceModal.tsx  # Add place from search
│   │   │   ├── PlaceSelectionModal.tsx # Choose place for activity
│   │   │   ├── CalendarModal.tsx  # Date picker
│   │   │   ├── BudgetTracker.tsx  # Budget progress
│   │   │   ├── FloatingAIChat.tsx # Legacy mock companion surface (không còn mount ở runtime chính)
│   │   │   ├── AIPromoBubble.tsx  # Legacy promo bubble (không còn mount ở TripWorkspace)
│   │   │   ├── ContextualSuggestionsPanel.tsx # Suggestions demo panel (mock/inactive)
│   │   │   ├── SavedSuggestions.tsx
│   │   │   ├── GoongMap.tsx    # Real Goong map (DailyItinerary "Bản đồ" tab, @goongmaps/goong-js, VITE_GOONG_MAP_API_KEY)
│   │   │   └── SimpleFooter.tsx
│   │   ├── contexts/
│   │   │   ├── AuthContext.tsx     # JWT state, login/logout/register, pending claim
│   │   │   └── TripWizardContext.tsx # Wizard flow state (destinations → allocations → travelers → budget)
│   │   ├── data/                   # Static/mock fallback data
│   │   │   ├── cities.ts
│   │   │   ├── destinations.ts
│   │   │   ├── places.ts
│   │   │   ├── trips.ts
│   │   │   ├── suggestions.ts
│   │   │   └── budget.ts
│   │   ├── hooks/
│   │   │   ├── useTripState.ts    # Minimal trip state hook
│   │   │   ├── useTripCost.ts     # Cost calculation (activities, hotels, transport, VND format)
│   │   │   └── trips/
│   │   │       ├── useTripSync.ts         # Main trip data sync (create/update/get, sessionStorage fallback)
│   │   │       ├── useActivityManager.ts  # Activity CRUD + drag-and-drop + time conflict
│   │   │       ├── useAccommodation.ts    # Accommodation CRUD + hotel selection
│   │   │       └── usePlacesManager.ts    # Debounced searchPlaces + save/unsave + add suggestion
│   │   ├── pages/                  # 27 page components
│   │   ├── services/               # API client layer
│   │   │   ├── api.ts             # fetch wrapper + JWT Bearer + auto-refresh on 401
│   │   │   ├── auth.ts            # login, register, logout, forgotPassword, resetPassword
│   │   │   ├── itinerary.ts       # CRUD, generate, share, claim, nested activity/accommodation
│   │   │   ├── places.ts          # destinations, search, saved
│   │   │   ├── chat.ts            # chat session CRUD + message/history + apply-patch APIs (C.3/C.4)
│   │   │   └── users.ts           # profile, password
│   │   ├── types/
│   │   │   └── trip.types.ts      # FE-BE contract: Activity, Day, Place, Accommodation, etc.
│   │   └── utils/
│   │       └── tripConstants.ts   # Trip constants
│   ├── styles/                     # Tailwind + global CSS
│   └── imports/                    # Shared imports
├── tests/e2e/                      # 36 test cases / 17 spec files (latest full recorded run: 33 passed, 3 skipped)
│   ├── auth.spec.ts
│   ├── trips.spec.ts
│   ├── public.spec.ts
│   └── helpers/auth.ts
├── playwright.config.ts
├── package.json
└── vite.config.ts
```

---

## 2. Component Hierarchy

```text
App.tsx
└── ErrorBoundary
    └── AuthProvider (AuthContext)
        └── TripWizardProvider (TripWizardContext)
            └── Router (routes.tsx)
                │
                ├── Public routes (không cần login)
                │   ├── /               → Home
                │   ├── /cities         → CityList
                │   ├── /cities/:cityId → CityDetail
                │   ├── /onboarding     → Onboarding
                │   ├── /create-trip    → CreateTrip
                │   ├── /daily-itinerary → DailyItinerary
                │   ├── /login          → Login
                │   ├── /register       → Register
                │   ├── /forgot-password → ForgotPassword
                │   ├── /reset-password → ResetPassword
                │   ├── /budget-setup   → BudgetSetup (wizard)
                │   ├── /travelers-selection → TravelersSelection (wizard)
                │   ├── /day-allocation → DayAllocation (wizard)
                │   ├── /trip-planning  → TripPlanning
                │   └── /shared/:token  → SharedTripView
                │
                ├── Protected routes (cần login → redirect /login)
                │   ├── /trip-library     → TripLibrary
                │   ├── /saved-places     → SavedPlaces
                │   ├── /account          → Account
                │   ├── /trip-history     → TripHistory
                │   ├── /settings         → Settings
                │   ├── /manual-trip-setup → ManualTripSetup
                │   ├── /trip-workspace   → TripWorkspace
                │   ├── /itinerary/:id    → ItineraryView
                │   ├── /profile          → Profile
                │   └── /saved-itineraries → SavedItineraries
                │
                └── * → NotFound (404)
```

---

## 3. API Client Layer — Data Flow

### 3.1 api.ts — Core fetch wrapper

```text
Component gọi service function (createItinerary, updateActivity, ...)
  │
  └── Service gọi apiRequest() từ api.ts
        │
        ├── Thêm Authorization: Bearer {accessToken}
        ├── Gửi HTTP request đến BE (VITE_API_URL)
        │
        ├── 200 OK → parse JSON → return data
        │
        ├── 401 Unauthorized → tự động refresh
        │     ├── Đọc refreshToken từ localStorage
        │     ├── POST /api/v1/auth/refresh {refreshToken}
        │     │     ├── Refresh thành công
        │     │     │   ├── Lưu accessToken + refreshToken mới vào localStorage
        │     │     │   └── Retry request gốc với accessToken mới
        │     │     └── Refresh thất bại
        │     │           ├── Xóa tokens khỏi localStorage
        │     │           └── Redirect /login
        │     └── Nếu không có refreshToken → redirect /login
        │
        └── Other error → throw ApiError { status, message, data }
```

### 3.2 Optimistic Update Pattern

```text
┌──────────────────────────────────────────────────────────┐
│               OPTIMISTIC UPDATE FLOW                      │
│                                                           │
│  1. User thay đổi UI (VD: kéo activity, sửa tên)        │
│  2. Hook cập nhật local state NGAY LẬP TỨC               │
│     → UI hiển thị thay đổi ngay, không chờ API          │
│  3. Hook gọi API trong background                         │
│     ├── API success → state đã đúng, không cần revert    │
│     └── API failure → REVERT state về giá trị trước      │
│         → User thấy UI quay lại trạng thái cũ            │
│         → Hiển thị error toast                            │
│                                                           │
│  Ví dụ: useActivityManager.updateActivity()               │
│  ├── setDays(updatedDays)         // optimistic update    │
│  ├── try { updateActivityAPI() }  // background API call  │
│  └── catch { setDays(prevDays) }  // revert on failure    │
└──────────────────────────────────────────────────────────┘
```

---

## 4. Auth Context Flow

### 4.1 AuthContext — State Management

```text
AuthContext
  │
  ├── State:
  │   ├── user: User | null
  │   ├── accessToken: string | null (localStorage)
  │   ├── refreshToken: string | null (localStorage)
  │   ├── isAuthenticated: boolean
  │   ├── isLoading: boolean
  │   └── pendingClaim: { tripId, claimToken, returnTo? } | null (sessionStorage)
  │
  ├── Methods:
  │   ├── login(email, password) → API call → save tokens → load profile → executePendingClaim()
  │   ├── register(email, password, name) → API call → save tokens → executePendingClaim()
  │   ├── logout() → API call revoke → clear tokens → clear user
  │   ├── refreshUser() → GET /users/profile → update user state
  │   ├── storePendingClaim(tripId, claimToken, returnTo?) → save to sessionStorage
  │   └── executePendingClaim() → nếu có pendingClaim thì POST /itineraries/{id}/claim
  │
  └── Auto-check on mount:
      ├── Read tokens from localStorage
      ├── If tokens exist → GET /users/profile → set user
      └── If tokens invalid → clear tokens → user = null
```

### 4.2 Guest → Owner Claim Flow

```text
┌──────────────────────────────────────────────────────────┐
│           GUEST → OWNER CLAIM FLOW (FE side)             │
│                                                           │
│  1. Guest tạo trip (không login)                         │
│     → POST /itineraries (không Bearer)                   │
│     → Response chứa claimToken                            │
│     → AuthContext.storePendingClaim(tripId, claimToken)   │
│     → Lưu vào sessionStorage: pendingClaim               │
│                                                           │
│  2. Guest đăng nhập hoặc đăng ký                         │
│     → Login/Register success → tokens saved              │
│     → AuthContext.executePendingClaim()                   │
│     → Nếu có pendingClaim:                                │
│         POST /itineraries/{tripId}/claim                  │
│           { claimToken: "raw_token_from_sessionStorage" } │
│         → Success: trip now owned by user                │
│         → Remove pendingClaim                            │
│                                                           │
│  3. Result: Guest trip → Owner trip                       │
└──────────────────────────────────────────────────────────┘
```

---

## 5. TripWizard Context Flow

```text
┌──────────────────────────────────────────────────────────┐
│              TRIP WIZARD FLOW                             │
│                                                           │
│  Step 1: CreateTrip (/create-trip)                       │
│     → Chọn destination, dates, budget level, travel type │
│     → TripWizardContext.setDestination()                  │
│     → TripWizardContext.setDates()                        │
│                                                           │
│  Step 2: DayAllocation (/day-allocation)                  │
│     → Phân bổ số ngày cho mỗi điểm đến                   │
│     → TripWizardContext.setAllocations()                  │
│                                                           │
│  Step 3: TravelersSelection (/travelers-selection)        │
│     → Chọn số người lớn, trẻ em                          │
│     → TripWizardContext.setTravelers()                    │
│                                                           │
│  Step 4: BudgetSetup (/budget-setup)                      │
│     → Chọn ngân sách chi tiết                            │
│     → TripWizardContext.setBudget()                       │
│                                                           │
│  Step 5: Create trip                                      │
│     → CreateTrip.tsx gọi generateItinerary() API          │
│     → Navigate /trip-workspace?tripId={id}                │
│     → TripWizardContext.resetWizard()                     │
│                                                           │
│  Storage: sessionStorage (persist across page navigation) │
│  → Không dùng 6 sessionStorage keys riêng lẻ nữa         │
│  → Dùng 1 context object thống nhất                      │
└──────────────────────────────────────────────────────────┘
```

### 5.1 CreateTrip — Destination Data Quality Advisory UX (00057+)

**Destination selector behavior**:
- Backend-backed: Calls `GET /api/v1/places/destinations` on mount
- Suggestions filtered from backend response (fallback to static list if API fails)
- User can type free text, but submit validates against backend list

**Data quality warning UX**:
- When user selects destination with `readinessReason`, displays amber/yellow warning box below generate button
- Warning style: `bg-amber-50 border-amber-200 text-amber-800` (not red like blocking errors)
- Warning text: Advisory message from backend (e.g., "Dữ liệu cho Đà Lạt hiện còn hạn chế...")
- Does NOT block submit — user can still click "Tạo Lịch Trình Với AI"
- Clears automatically when user switches to ready city (no `readinessReason`)

**Unsupported city handling**:
- Pre-submit validation checks if destination exists in backend list
- If not found: Shows validation error `text-red-500`: "Thành phố này chưa có trong danh sách được hỗ trợ"
- Blocks generate API call until user selects supported city

**State management**:
- `validationError`: Blocking errors (red, stops submit)
- `qualityWarning`: Advisory warnings (amber, does NOT stop submit)
- Two separate states for different semantic purposes

---

## 6. Hook Data Flow Diagrams

### 6.1 useTripSync — Main trip data hook

```text
TripWorkspace mount
  │
  ├── URL có tripId?
  │   ├── YES → load existing trip
  │   │   ├── GET /itineraries/{tripId} (BE API)
  │   │   │   ├── Success → setDays, setAccommodations
  │   │   │   └── Fail → fallback to sessionStorage("currentTrip")
  │   │   └── Save to sessionStorage as quick-restore cache
  │   │
  │   └── NO → new trip from wizard
  │       ├── Read TripWizardContext state
  │       ├── Build trip data from wizard selections
  │       └── POST /itineraries (create new)
  │           ├── Success → set tripId, save to sessionStorage
  │           └── If guest → storePendingClaim(tripId, claimToken)
  │
  ├── Auto-save on changes:
  │   ├── Debounce 500ms sau last change
  │   └── PUT /itineraries/{tripId} (full trip state)
  │
  └── Manual save:
      └── PUT /itineraries/{tripId}
```

### 6.2 useActivityManager — Activity CRUD + drag-and-drop

```text
┌────────────────────────────────────────────────────────┐
│         useActivityManager FLOW                         │
│                                                         │
│  addActivityToDay(dayId, activityData)                  │
│    ├── resolveTimeConflicts() → shift times nếu conflict│
│    ├── Optimistic: thêm vào local days state            │
│    ├── POST /itineraries/{tripId}/activities (API)      │
│    └── On fail → revert local state                     │
│                                                         │
│  updateActivity(activityId, updates)                    │
│    ├── Optimistic: cập nhật local state                 │
│    ├── PUT /itineraries/{tripId}/activities/{id} (API)  │
│    └── On fail → revert                                 │
│                                                         │
│  deleteActivity(activityId)                             │
│    ├── Optimistic: xóa khỏi local state                 │
│    ├── DELETE /itineraries/{tripId}/activities/{id}     │
│    └── On fail → revert                                 │
│                                                         │
│  Drag-and-drop reorder:                                 │
│    ├── Reorder in local state                           │
│    ├── Recalculate order_index cho mỗi activity         │
│    └── Trigger auto-save (useTripSync)                  │
│                                                         │
│  Extra expenses:                                        │
│    ├── addExtraExpense(dayId/activityId, expense)       │
│    └── removeExtraExpense(expenseId)                    │
│    └── Trigger auto-save                                │
└────────────────────────────────────────────────────────┘
```

### 6.3 useAccommodation — Accommodation management

```text
┌────────────────────────────────────────────────────────┐
│         useAccommodation FLOW                           │
│                                                         │
│  addAccommodation(data)                                 │
│    ├── Optimistic: thêm vào accommodations state        │
│    ├── POST /itineraries/{tripId}/accommodations (API)  │
│    └── On fail → revert                                 │
│                                                         │
│  deleteAccommodation(accId)                             │
│    ├── Optimistic: xóa khỏi state                       │
│    ├── DELETE /itineraries/{tripId}/accommodations/{id} │
│    └── On fail → revert                                 │
│                                                         │
│  Hotel selection:                                       │
│    ├── Filter hotels by city (from places data)         │
│    ├── Select hotel → populate accommodation fields     │
│    └── Booking types: hourly / nightly / daily          │
│                                                         │
│  Multi-day booking:                                     │
│    └── dayIds: [1, 2, 3] → cover 3 ngày               │
└────────────────────────────────────────────────────────┘
```

### 6.4 usePlacesManager — Place search + save

```text
┌────────────────────────────────────────────────────────┐
│         usePlacesManager FLOW                           │
│                                                         │
│  searchPlaces(query, city?, category?)                  │
│    ├── Debounce 300ms                                   │
│    ├── GET /places/search?query=...&city=...&category=  │
│    ├── Success → set searchResults                      │
│    └── Fail → fallback to mock data                     │
│                                                         │
│  savePlace(placeId)                                     │
│    ├── POST /places/saved { placeId }                   │
│    └── Optimistic: thêm vào savedPlaces                 │
│                                                         │
│  unsavePlace(savedId)                                   │
│    ├── DELETE /places/saved/{savedId}                   │
│    └── Optimistic: xóa khỏi savedPlaces                 │
│                                                         │
│  addSuggestionToItinerary(place, dayId)                 │
│    ├── Build ActivitySchema từ place data               │
│    ├── addActivityToDay(dayId, activity) → useActivity  │
│    └── Trigger auto-save                                │
└────────────────────────────────────────────────────────┘
```

### 6.5 useTripCost — Cost calculation

```text
┌────────────────────────────────────────────────────────┐
│         useTripCost FLOW                                │
│                                                         │
│  Input: days[], accommodations[]                        │
│                                                         │
│  Tính tổng chi phí:                                     │
│  ├── For each activity:                                 │
│  │   ├── adultPrice × adultsCount                      │
│  │   ├── childPrice × childrenCount                    │
│  │   ├── customCost                                    │
│  │   ├── busTicketPrice                                │
│  │   ├── taxiCost                                      │
│  │   └── extraExpenses[].amount                        │
│  ├── For each day:                                      │
│  │   └── dayExtraExpenses[].amount                     │
│  ├── For each accommodation:                            │
│  │   └── totalPrice                                    │
│  └── Format: VND (vi-VN locale)                        │
│                                                         │
│  Category breakdown:                                    │
│  ├── food, attraction, nature, entertainment, shopping  │
│  └── transportation (bus + taxi)                        │
└────────────────────────────────────────────────────────┘
```

---

## 7. Route Map

| Path | Page | Auth | API Connected | Trạng thái |
|---|---|---|---|---|
| `/` | Home | Public | — | Done |
| `/cities` | CityList | Public | — | Done (mock data) |
| `/cities/:cityId` | CityDetail | Public | `GET /places/destinations/{name}` | Done (API + mock fallback) |
| `/onboarding` | Onboarding | Public | — | Done |
| `/create-trip` | CreateTrip | Public | `POST /itineraries` | Done |
| `/budget-setup` | BudgetSetup | Public | — | Done (wizard context) |
| `/travelers-selection` | TravelersSelection | Public | — | Done (wizard context) |
| `/day-allocation` | DayAllocation | Public | — | Done (wizard context) |
| `/daily-itinerary` | DailyItinerary | Public | `GET /itineraries/{id}` | Done (sessionStorage fallback) |
| `/login` | Login | Public | `POST /auth/login` | Done |
| `/register` | Register | Public | `POST /auth/register` | Done (OTP bypassed) |
| `/forgot-password` | ForgotPassword | Public | `POST /auth/forgot-password` | Done |
| `/reset-password` | ResetPassword | Public | `POST /auth/reset-password` | Done |
| `/shared/:token` | SharedTripView | Public | `GET /shared/{shareToken}` | Done |
| `/trip-planning` | TripPlanning | Public | — | Done |
| `/trip-library` | TripLibrary | Protected | `GET /itineraries` | Done |
| `/saved-places` | SavedPlaces | Protected | `GET/POST/DELETE /places/saved/*` | Done |
| `/account` | Account | Protected | `GET/PUT /users/profile`, `PUT /users/password` | Done |
| `/trip-history` | TripHistory | Protected | `GET /itineraries`, `DELETE /itineraries/{id}` | Done |
| `/settings` | Settings | Protected | — | Done (local UI) |
| `/manual-trip-setup` | ManualTripSetup | Protected | Auth check | Done |
| `/trip-workspace` | TripWorkspace | Protected | Full CRUD API | Done |
| `/itinerary/:id` | ItineraryView | Protected | `GET/PUT/DELETE /itineraries/{id}`, share, rating | Done |
| `/profile` | Profile | Protected | `PUT /users/profile` | Done |
| `/saved-itineraries` | SavedItineraries | Protected | `GET /itineraries`, `DELETE /itineraries/{id}` | Done |
| `*` | NotFound | — | — | Done |

---

## 8. Contract Quan Trọng

`Frontend/src/app/types/trip.types.ts` là **FE-BE contract source of truth**.

### Key field name rules

| BE Python (snake_case) | BE JSON (camelCase) | FE TypeScript | Ghi chú |
|---|---|---|---|
| `trip_name` | `tripName` | `tripName` | Không dùng `name` cho trip |
| `adult_price` | `adultPrice` | `adultPrice` | Không dùng `price` |
| `child_price` | `childPrice` | `childPrice` | — |
| `extra_expenses` | `extraExpenses` | `extraExpenses` | Array |
| `day_ids` | `dayIds` | `dayIds` | JSON array |
| `booking_type` | `bookingType` | `bookingType` | `hourly/nightly/daily` |
| `order_index` | `orderIndex` | `orderIndex` | Drag-and-drop sort |

### Activity name rule

- **LUÔN dùng `name`** — không dùng `title`.
- BE: `Activity.name` (varchar 200)
- FE: `Activity.name` (string)

---

## 9. FE-BE Integration Status (2026-05-05)

Tất cả trang chính đã nối BE API. Mock chỉ dùng fallback.

| Page | API endpoint | Trạng thái |
|---|---|---|
| Login | `POST /auth/login` | Done |
| Register | `POST /auth/register` | Done (OTP bypassed until BE email OTP) |
| ForgotPassword | `POST /auth/forgot-password` | Done |
| ResetPassword | `POST /auth/reset-password` | Done |
| Account | `GET/PUT /users/profile`, `PUT /users/password` | Done |
| Profile | `PUT /users/profile` | Done |
| TripLibrary | `GET /itineraries` | Done |
| SavedPlaces | `GET/POST/DELETE /places/saved/*` | Done |
| TripHistory | `GET /itineraries`, `PUT/DELETE /itineraries/{id}` | Done |
| SavedItineraries | `GET /itineraries`, `DELETE /itineraries/{id}` | Done |
| ManualTripSetup | Auth check via `useAuth()` | Done |
| TripWorkspace | Full CRUD + nested activity/accommodation + places search | Done |
| ItineraryView | `GET/PUT/DELETE /itineraries/{id}`, rating, share | Done |
| SharedTripView | `GET /shared/{shareToken}` | Done |
| CityDetail | `GET /places/destinations/{name}` | Done (API + mock fallback) |
| DailyItinerary | `GET /itineraries/{id}` + sessionStorage fallback | Done |
| CreateTrip | `POST /itineraries` | Done |
| Header | Auth state via `AuthContext` | Done |

---

## 10. Playwright E2E Tests

### Cấu hình

- **Config file**: `Frontend/playwright.config.ts`
- **Base URL**: `http://localhost:5173` (override bằng `E2E_BASE_URL`)
- **Browser**: Chromium only
- **Timeout**: 30 giây, retries: 2 trên CI
- **WebServer**: Tự động start `npm run dev` nếu chưa chạy

### Test suites (36 tests trên 17 spec files; latest full recorded run: 33 passed, 3 skipped)

Current suite coverage:

- Auth flow: register, login, protected redirect, guest claim after login/register.
- Trip CRUD + workspace truth: create, list, delete, workspace boundary, TripHistory/TripLibrary rendering.
- Calendar + destination readiness: date-range interaction và limited-data advisory.
- Rate-limit / timeout / UI shell: 429 contract, timeout UX, submit/loading shell.
- Public pages: home, login, register, forgot-password, 404.
- C3A chat session CRUD: create/list/detail/persist/cross-user ownership behavior.
- CityDetail API-first regression: non-mock city và mock-pack city đều phải render backend truth khi API detail có sẵn.
- Legacy `b3/*` observation flows: `3 skipped`.

### Test helpers

`tests/e2e/helpers/auth.ts`:

```typescript
apiRegister(email, password, name)    // Register qua BE API
apiLogin(email, password)             // Login qua BE API
injectAuth(page, accessToken, refreshToken) // Inject JWT vào localStorage
loginAs(page, email, password, name)  // Full register + inject flow
```

### CI integration

Job `frontend-e2e` trong `frontend-ci.yml`:
1. Start PostgreSQL + Redis containers
2. Install BE + run migrations + start BE server
3. Install FE + Playwright browsers
4. Run `npx playwright test` với `E2E_API_URL=http://localhost:8000`
5. Upload Playwright report artifact khi fail

---

## 11. Known Gaps

- `FloatingAIChat` / `AIPromoBubble` vẫn còn trên source như legacy components, nhưng `TripWorkspace` và `DailyItinerary` không còn mount chúng; active runtime chat surface là `ChatPanel`.
- CreateTrip đã gọi BE generate API thật; chất lượng lịch trình phụ thuộc Goong ETL data + Gemini key.
- E2E spec assert confirm `apply` của proposal trên runtime thật; `cancel` và `stale`-proposal có browser/API/DB evidence (pass `00101`) nhưng chưa có e2e spec assertion riêng. Gap còn lại là trip workspace drag-and-drop, accommodation CRUD e2e, và data richness cho sparse cities.
- City browse/detail hiện đã API-backed; gap còn lại là sparse-city data richness, image quality, và một số destination image path cũ như `ha-n-i.jpg`.
- Visual regression testing chưa có.

---

## 12. OTP Registration Note (PR #28)

Register page hiện **bypass OTP verification**:

```text
Lý do:
  OTPModal.tsx so sánh otpValue === generatedOTP
  → Random OTP chỉ tồn tại trong browser state
  → Không bao giờ gửi email
  → Block TẤT CẢ registration

Fix:
  Comment out OTP state/handlers
  Gọi register() API trực tiếp trong handleSubmit
  OTPModal.tsx component giữ nguyên → re-enable khi BE có email OTP (Phase C)
```
