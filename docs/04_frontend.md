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
│   │   ├── contexts/         # AuthContext (JWT state)
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
| `/cities/:cityId` | `CityDetail` | chủ yếu data FE |
| `/onboarding` | `Onboarding` | flow FE |
| `/trip-library` | `TripLibrary` | API: list itineraries (protected) |
| `/saved-places` | `SavedPlaces` | API: list/save/unsave places (protected) |
| `/account` | `Account` | API: profile/update/password (protected) |
| `/trip-history` | `TripHistory` | cần nối itinerary list (protected) |
| `/settings` | `Settings` | local UI (protected) |
| `/daily-itinerary` | `DailyItinerary` | mock/demo |
| `/create-trip` | `CreateTrip` | cần nối create/generate thật |
| `/budget-setup` | `BudgetSetup` | flow FE |
| `/travelers-selection` | `TravelersSelection` | flow FE |
| `/manual-trip-setup` | `ManualTripSetup` | API: auth check (protected) |
| `/day-allocation` | `DayAllocation` | flow FE |
| `/trip-workspace` | `TripWorkspace` | API: places save/unsave (protected) |
| `/trip-planning` | `TripPlanning` | legacy/planning UI |
| `/itinerary/:id` | `ItineraryView` | cần owner API hoặc local fallback |
| `/login` | `Login` | API: auth login |
| `/register` | `Register` | API: auth register |
| `/forgot-password` | `ForgotPassword` | UI, BE chưa có endpoint |
| `/profile` | `Profile` | API: user profile (protected) |
| `/saved-itineraries` | `SavedItineraries` | cần nối itinerary list (protected) |
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

Static/mock data:

- `data/cities.ts`
- `data/destinations.ts`
- `data/places.ts`
- `data/trips.ts`
- `data/suggestions.ts`
- `data/budget.ts`
- `utils/tripConstants.ts`

Trip state/hooks:

- `hooks/useTripState.ts`
- `hooks/useTripCost.ts`
- `hooks/trips/useTripSync.ts`
- `hooks/trips/useActivityManager.ts`
- `hooks/trips/useAccommodation.ts`
- `hooks/trips/usePlacesManager.ts`

Ý nghĩa hiện tại:

- FE đã có UX/workflow để quản lý trip phức tạp.
- BE đã có API core tương ứng, nhưng FE chưa thay toàn bộ localStorage/mock bằng API.
- Khi nối API cần cẩn thận mapping camelCase để không phá contract.

## Contract Quan Trọng

`Frontend/src/app/types/trip.types.ts` là file cần đối chiếu khi sửa itinerary schema.

Các field cần giữ:

- `Activity.name`, không dùng `title`.
- `adultPrice`, `childPrice`, `extraExpenses`.
- `Day.activities`.
- `Accommodation.dayIds`, `bookingType`, `duration`.
- Public API dùng `camelCase`.

Backend hiện dùng `CamelCaseModel`, nên Python nội bộ `adult_price` sẽ serialize thành `adultPrice`.

## Flow FE Nên Nối Với BE

Auth:

```text
Login/Register page
→ POST /api/v1/auth/login hoặc /register
→ lưu accessToken/refreshToken an toàn
→ GET /api/v1/users/profile
```

Trip list/history:

```text
TripHistory/SavedItineraries
→ GET /api/v1/itineraries
→ render list trip owner-only
```

Manual trip:

```text
ManualTripSetup/CreateTrip
→ POST /api/v1/itineraries
→ TripWorkspace
→ PUT /api/v1/itineraries/{tripId} debounce auto-save
```

Places:

```text
CityList
→ GET /api/v1/places/destinations

CityDetail
→ GET /api/v1/places/destinations/{name}

SavedPlaces
→ GET/POST/DELETE /api/v1/places/saved...
```

Share:

```text
TripWorkspace share button
→ POST /api/v1/itineraries/{tripId}/share
→ public page should read /api/v1/shared/{shareToken}
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

- `ForgotPassword` có UI nhưng BE chưa có endpoint password reset.
- City/hotel/place UI cần thay data mock bằng API sau khi ETL real data sẵn sàng.
- Một số màn AI/chat vẫn mock vì BE AI chưa implement.
- `useTripSync` vẫn dùng localStorage cho trip workspace state — cần đổi sang BE API auto-save.
- Chưa có Playwright/Cypress.
- Chưa có test visual/e2e cho trip workspace.

## API Integration Status (2026-05-03)

Đã triển khai API client layer (`services/api.ts`) với JWT Bearer injection và auto-refresh trên 401. Các page đã nối BE:

| Page | API endpoint | Trạng thái |
|---|---|---|
| Login | `POST /auth/login` | Done |
| Register | `POST /auth/register` | Done |
| Account | `GET/PUT /users/profile`, `PUT /users/password` | Done |
| TripLibrary | `GET /itineraries` | Done |
| SavedPlaces | `GET/POST/DELETE /places/saved/*` | Done |
| ManualTripSetup | Auth check via `useAuth()` | Done |
| TripWorkspace | `savePlace/unsavePlace` via API | Done |
| Header | Auth state via `AuthContext` | Done |

Protected routes (7 routes) đã được bọc bằng `ProtectedRoute` — redirect sang `/login` nếu chưa đăng nhập.

AI generate endpoint (`POST /itineraries/generate`) vẫn là stub — tạo empty trip, chưa gọi LLM. Sẽ được implement ở Phase C.
