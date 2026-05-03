# 04. Frontend MVP2

Frontend source nằm trong `Frontend/`, dùng Vite + React + TypeScript. Hiện UI revamp đã rộng hơn MVP1. Auth, trip, places đã nối BE qua API client layer. AI và một số flow phụ vẫn pending.

## Runtime Structure

```text
Frontend/
├── src/
│   ├── main.tsx
│   ├── app/
│   │   ├── App.tsx
│   │   ├── routes.tsx
│   │   ├── components/
│   │   ├── contexts/         # AuthContext (JWT state), TripWizardContext (wizard flow)
│   │   ├── data/
│   │   ├── hooks/
│   │   ├── pages/
│   │   ├── services/         # API client layer
│   │   │   ├── api.ts        # fetch wrapper, JWT, auto-refresh
│   │   │   ├── auth.ts       # login, register, logout
│   │   │   ├── itinerary.ts  # CRUD, generate, share, claim
│   │   │   ├── places.ts     # destinations, search, saved
│   │   │   └── users.ts      # profile, password
│   │   ├── types/
│   │   └── utils/
│   ├── styles/
│   └── imports/
├── package.json
└── vite.config.ts
```

Root `index.html` trỏ tới `Frontend/src/main.tsx`, nên lệnh build trong `Frontend/` và root Vite đều đọc đúng app.

## Route Map

| Path | Page | Trạng thái |
|---|---|---|
| `/` | `Home` | UI/data FE |
| `/cities` | `CityList` | chủ yếu data FE |
| `/cities/:cityId` | `CityDetail` | API: getDestinationDetail + mock fallback |
| `/onboarding` | `Onboarding` | flow FE |
| `/trip-library` | `TripLibrary` | API: list itineraries (protected) |
| `/saved-places` | `SavedPlaces` | API: list/save/unsave places (protected) |
| `/account` | `Account` | API: profile/update/password (protected) |
| `/trip-history` | `TripHistory` | API: list/update/delete itineraries (protected) |
| `/settings` | `Settings` | local UI (protected) |
| `/daily-itinerary` | `DailyItinerary` | API: getItinerary + sessionStorage fallback |
| `/create-trip` | `CreateTrip` | API: createItinerary |
| `/budget-setup` | `BudgetSetup` | flow FE (TripWizardContext) |
| `/travelers-selection` | `TravelersSelection` | flow FE (TripWizardContext) |
| `/manual-trip-setup` | `ManualTripSetup` | API: auth check (protected) |
| `/day-allocation` | `DayAllocation` | flow FE (TripWizardContext) |
| `/trip-workspace` | `TripWorkspace` | API: full CRUD + places search (protected) |
| `/trip-planning` | `TripPlanning` | legacy/planning UI |
| `/itinerary/:id` | `ItineraryView` | API: get/rate/update/delete itinerary |
| `/shared/:token` | `SharedTripView` | API: getSharedItinerary (public) |
| `/login` | `Login` | API: auth login |
| `/register` | `Register` | API: auth register |
| `/forgot-password` | `ForgotPassword` | UI, BE chưa có endpoint |
| `/profile` | `Profile` | API: updateProfile (protected) |
| `/saved-itineraries` | `SavedItineraries` | API: list/delete itineraries (protected) |
| `*` | `NotFound` | done |

## Component Groups

Trip workspace:

- `TripSidebar`
- `TripTimeline`
- `TripAccommodation`
- `TripBudgetSidebar`
- `TopActionBar`
- `ActivityDetailModal`
- `AddPlaceModal`
- `PlaceSelectionModal`
- `BudgetTracker`

AI/companion UI hiện chủ yếu demo/mock:

- `FloatingAIChat`
- `AIPromoBubble`
- `ContextualSuggestionsPanel`
- `components/companion/*`

Shared UI:

- `components/ui/*`
- `Header`
- `SimpleFooter`
- Auth modals/layout.

## Data Và Hooks

Static/mock data (fallback khi BE không có data):

- `data/cities.ts`
- `data/destinations.ts`
- `data/places.ts`
- `data/trips.ts`
- `data/suggestions.ts`
- `data/budget.ts`
- `utils/tripConstants.ts`

Contexts:

- `contexts/AuthContext.tsx` — JWT state, login/logout/register, pending claim flow
- `contexts/TripWizardContext.tsx` — Wizard flow state (destinations, allocations, travelers, budget) thay thế sessionStorage

Trip state/hooks:

- `hooks/useTripState.ts`
- `hooks/useTripCost.ts`
- `hooks/trips/useTripSync.ts` — BE API auto-save (create/update/get itinerary), sessionStorage chỉ làm quick-restore cache
- `hooks/trips/useActivityManager.ts` — Activity CRUD API (add/update/delete) với optimistic update + revert
- `hooks/trips/useAccommodation.ts` — Accommodation CRUD API (add/delete) với optimistic update + revert
- `hooks/trips/usePlacesManager.ts` — Debounced searchPlaces API, save/unsave place API, addActivity API cho suggestion

Ý nghĩa hiện tại:

- FE đã có UX/workflow để quản lý trip phức tạp.
- **Tất cả trang chính đã nối BE API**: auth, profile, trip CRUD, activity/accommodation CRUD, places search/saved, share/claim, city detail, CreateTrip.
- Mock data chỉ làm fallback khi BE không có data hoặc API fail.
- `ErrorBoundary` bọc toàn app, hiển thị UI recover khi React runtime error.

## Contract Quan Trọng

`Frontend/src/app/types/trip.types.ts` là file cần đối chiếu khi sửa itinerary schema.

Các field cần giữ:

- `Activity.name`, không dùng `title`.
- `adultPrice`, `childPrice`, `extraExpenses`.
- `Day.activities`.
- `Accommodation.dayIds`, `bookingType`, `duration`.
- Public API dùng `camelCase`.

Backend hiện dùng `CamelCaseModel`, nên Python nội bộ `adult_price` sẽ serialize thành `adultPrice`.

## Flow FE Đã Nối BE

Auth:

```text
Login/Register page
→ POST /api/v1/auth/login hoặc /register
→ lưu accessToken/refreshToken an toàn
→ GET /api/v1/users/profile
→ executePendingClaim() cho guest→owner
```

Trip CRUD:

```text
TripWorkspace
→ POST /api/v1/itineraries (create)
→ PUT /api/v1/itineraries/{tripId} (update)
→ GET /api/v1/itineraries/{tripId} (load)
→ POST/PUT/DELETE /api/v1/itineraries/{tripId}/activities (nested CRUD)
→ POST/DELETE /api/v1/itineraries/{tripId}/accommodations (nested CRUD)
```

Trip list/history:

```text
TripHistory/SavedItineraries/TripLibrary
→ GET /api/v1/itineraries
→ DELETE /api/v1/itineraries/{tripId}
```

Places:

```text
CityDetail
→ GET /api/v1/places/destinations/{name}

TripWorkspace (usePlacesManager)
→ GET /api/v1/places/search?query=...&city=...&category=...
→ POST/DELETE /api/v1/places/saved/{placeId}

SavedPlaces
→ GET/POST/DELETE /api/v1/places/saved...
```

Share/Claim:

```text
TripWorkspace (TopActionBar)
→ POST /api/v1/itineraries/{tripId}/share

SharedTripView
→ GET /api/v1/shared/{shareToken}

AuthContext (after login/register)
→ POST /api/v1/itineraries/{tripId}/claim (claimToken one-time)
```

CreateTrip:

```text
CreateTrip
→ POST /api/v1/itineraries (createItinerary)
→ navigate /trip-workspace?tripId={resp.id}
→ TripWorkspace load trip via useTripSync
```

## Automation Hiện Có

Frontend chưa có unit/e2e test runner. Gate hiện tại:

```powershell
cd Frontend
npm run build
```

Smoke website:

- Start dev server bằng `npm run dev`.
- HTTP GET `/` phải trả 200.
- HTML phải có `id="root"`.

Đã thêm script `scripts/test_fullstack_smoke.ps1` để smoke FE/BE đang chạy.

## Known Gaps

- `ItineraryView` chưa có share button — share flow nằm trong `TopActionBar` của TripWorkspace.
- `ForgotPassword` có UI nhưng BE chưa có endpoint password reset.
- City/hotel/place UI dùng API làm primary, mock làm fallback khi BE không có data.
- Một số màn AI/chat vẫn mock vì BE AI chưa implement (Phase C).
- Chưa có Playwright/Cypress.
- Chưa có test visual/e2e cho trip workspace.

## API Integration Status (2026-05-04)

Đã triển khai API client layer (`services/api.ts`) với JWT Bearer injection và auto-refresh trên 401. Tất cả API call dùng optimistic update + revert-on-failure, với mock fallback khi BE không có data.

| Page | API endpoint | Trạng thái |
|---|---|---|
| Login | `POST /auth/login` | Done |
| Register | `POST /auth/register` | Done |
| Account | `GET/PUT /users/profile`, `PUT /users/password` | Done |
| Profile | `PUT /users/profile` | Done |
| TripLibrary | `GET /itineraries` | Done |
| SavedPlaces | `GET/POST/DELETE /places/saved/*` | Done |
| TripHistory | `GET /itineraries`, `PUT /itineraries/{id}`, `DELETE /itineraries/{id}` | Done |
| SavedItineraries | `GET /itineraries`, `DELETE /itineraries/{id}` | Done |
| ManualTripSetup | Auth check via `useAuth()` | Done |
| TripWorkspace | `POST/PUT/GET /itineraries`, nested activity CRUD, nested accommodation CRUD, `GET /places/search`, `POST/DELETE /places/saved` | Done |
| ItineraryView | `GET /itineraries/{id}`, `PUT /itineraries/{id}`, `PUT /itineraries/{id}/rating`, `DELETE /itineraries/{id}` | Done |
| SharedTripView | `GET /shared/{shareToken}` | Done |
| CityDetail | `GET /places/destinations/{name}`, `GET/POST/DELETE /places/saved` | Done |
| DailyItinerary | `GET /itineraries/{id}` + sessionStorage fallback | Done |
| Header | Auth state via `AuthContext` | Done |
| CreateTrip | `POST /itineraries` (createItinerary) | Done |

Protected routes (8 routes) đã được bọc bằng `ProtectedRoute` — redirect sang `/login` nếu chưa đăng nhập.

AI generate endpoint (`POST /itineraries/generate`) vẫn là stub — tạo empty trip, chưa gọi LLM. Sẽ được implement ở Phase C.
