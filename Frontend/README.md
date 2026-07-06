# DuLichViet Frontend

React + Vite + TypeScript frontend for the NT208 AI travel itinerary recommendation system.

## Current State

| Area | Status |
|---|---|
| Routing | Home, city list/detail, auth, create trip, trip workspace, trip library/history, saved places/itineraries, settings, profile, shared trip, forgot/reset password |
| API layer | Centralized services under `src/app/services/` |
| Auth | JWT local storage, refresh-token retry on 401, protected routes, guest-to-owner claim after login/register |
| Trips | Manual create/update, generated itinerary load by `tripId`, optimistic activity/accommodation/place operations |
| AI C.1 | `CreateTrip` calls BE `POST /api/v1/itineraries/generate` and navigates to `TripWorkspace` |
| AI C.2 | Suggestion backend ready (`GET /api/v1/agent/suggest/{activity_id}`), nhưng FE suggestion surfaces vẫn dùng mock data |
| AI C.3A | `ChatPanel` integrated into `TripWorkspace` with chat session REST APIs |
| AI C.3B/C.3C | `ChatPanel` now loads history thật, gửi message thật, render `requiresConfirmation` + `proposedOperations`, và đã có confirm/cancel UI gọi `apply-patch` thật |
| Remaining AI UI | Legacy companion/demo components vẫn còn trên source nhưng không còn mount trên runtime chính; C.4 session management (switcher/rename/delete/load-more) đã merged (#106) |
| Verified 2026-06-24 | Production build pass qua `npm run build`; CI `frontend-e2e` green trên PR #109; 17 spec files Playwright ở `tests/e2e/` (14 top-level + 3 `b3/`; cần BE chạy trên `localhost:8000`) |

## Local Start

Terminal 1 should already run the backend on `localhost:8000`.

Terminal 2:

```powershell
cd Frontend
npm ci
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

Open:

```text
http://localhost:5173
```

If the backend uses another port, restart Vite after changing `VITE_API_URL`; Vite only exposes `VITE_*` variables at server startup.

## API Organization

The frontend already has an API layer. Do not hardcode backend URLs inside pages/components.

```text
src/app/services/
├── api.ts          # fetch wrapper, VITE_API_URL, Bearer token, refresh on 401
├── auth.ts         # login/register/logout/refresh/forgot/reset
├── itinerary.ts    # CRUD, generate, share, claim, rating
├── places.ts       # destinations, search, saved places
├── chat.ts         # chat session CRUD + message/history APIs
└── users.ts        # profile and password
```

Typical flow:

```text
CreateTrip.tsx
-> generateItinerary()
-> api.post("/api/v1/itineraries/generate")
-> Backend ItineraryPipeline
-> TripWorkspace loads generated trip by tripId
```

## Auth And Guest Claim Flow

Guest AI generate:

```text
CreateTrip
-> POST /api/v1/itineraries/generate without Bearer token
-> BE returns trip id + claimToken
-> FE stores { tripId, claimToken } in sessionStorage key "pendingClaim"
-> FE navigates to /trip-workspace?tripId=...
-> ProtectedRoute cho guest đi tiếp nếu `currentTrip` / `pendingClaim` khớp tripId
-> login/register calls POST /api/v1/itineraries/{tripId}/claim
-> BE transfers trip ownership to the authenticated user
```

Observed through 2026-06-11:

- `pendingClaim` survives reload within the same browser tab because it is stored in `sessionStorage`.
- After reloading `/login`, the claim still succeeds after login.
- `AuthContext` now persists a workspace `returnTo` target inside `pendingClaim`, and `Login.tsx` prefers `claimResult?.returnTo || from`, so guest claim can land back on the trip workspace after login.

## Trip Workspace Data Flow

```text
/trip-workspace?tripId=123
-> ProtectedRoute allows auth user OR guest same-session workspace restore
-> useTripSync() calls getItinerary(123)
-> maps ItineraryResponse days/activities/accommodations into FE state
-> sessionStorage "currentTrip" is only a quick-restore fallback
```

The backend remains source of truth after a generated trip is claimed or owned by a user.

## Map And Goong Usage

Do not call Goong REST APIs directly from FE with `GOONG_API_KEY`.

FE calls backend places APIs for data:

```text
GET /api/v1/places/destinations
GET /api/v1/places/destinations/{name}
GET /api/v1/places/search
```

The DailyItinerary "Bản đồ" tab renders a real Goong map via `src/app/components/GoongMap.tsx` (PR #128), using the `@goongmaps/goong-js` SDK. The map:

- Reads `import.meta.env.VITE_GOONG_MAP_API_KEY` (map-tiles public key, set on Vercel as `VITE_GOONG_MAP_API_KEY`).
- Plots a colored marker per suggestion place that has `latitude`/`longitude` (exposed on `PlaceResponse` by the backend), centers on their centroid (fallback Hà Nội), and shows a popup per marker.
- Falls back to a "Chưa cấu hình Goong Maps API key" hint when `VITE_GOONG_MAP_API_KEY` is missing, and to a no-marker map when no place has coordinates.

```env
VITE_GOONG_MAP_API_KEY=<Goong map-tiles public key, URL-restricted on Goong dashboard>
```

`VITE_GOONG_MAP_API_KEY` is a **separate map-tiles public key** — it is NOT the REST `GOONG_API_KEY` used server-side for ETL/geocode. REST geocode/detail/direction calls still go through the backend only.

## Test Commands

Production build:

```powershell
cd Frontend
npm run build
```

Playwright e2e:

```powershell
cd Frontend
$env:E2E_API_URL="http://localhost:8000"
npm run test:e2e
```

Post-verify note from 2026-06-19:

- `npm run test:e2e`: `17` spec files ở `tests/e2e/` (14 top-level + 3 `b3/`; cần BE chạy trên `localhost:8000`); CI `frontend-e2e` green trên PR #109. Số case chính xác chạy đủ trên CI.
- FE error handling improved: toast notifications now show specific error messages instead of generic "Không thể tạo lịch trình" for rate limits, validation errors, and AI timeouts.
- Destination slugify fuzzy matching (PR #92): Backend now properly matches "Ha Noi" → "ha-noi" → DB, improving destination resolution for users typing city names without accents.
- C3A chat session foundation (PR #98-100): ChatPanel component integrated into TripWorkspace, chat session REST APIs (EP-37/38/39), e2e tests for chat session CRUD.
- C3B message flow (current source): `ChatPanel` creates/loads session thật, fetches persisted history, sends companion messages through BE, and can render the assistant `proposedOperations` contract when the provider returns it.
- Active runtime drift đã được dọn ở `00100`: `TripWorkspace` và `DailyItinerary` không còn mount `FloatingAIChat` / promo mock surfaces.
- Local note: latest verified build used `--outDir .build-tmp\\verify`. Nếu chạy default `npm run build` và `dist` bị process khác khóa trên Windows thì có thể vẫn gặp `EPERM`; đây là local artifact state, không phải compile failure của source.

## Browser Debug Checklist

Use `.claude/skills/fullstack-browser-debug/SKILL.md` for full FE-BE verification.

Minimum evidence:

- Backend health URL.
- Vite served `VITE_API_URL`.
- Browser screenshot.
- Network response status.
- Browser console errors.
- Backend log events around the same timestamp.

Keep UI/UX unchanged while debugging logic.

---

## Documentation

📖 **Comprehensive documentation:** See [`docs/INDEX.md`](../docs/INDEX.md) for:
- Architecture and design docs
- Component reference and UI patterns
- Testing strategies and E2E results
- Issue tracking and bug reports
- Phase C implementation status

**Key docs for Frontend:**
- [`docs/04_frontend.md`](../docs/04_frontend.md) - Frontend architecture and component reference
- [`docs/08_testing_local_run.md`](../docs/08_testing_local_run.md) - Local testing guide
- [`docs/USER_JOURNEY_UAT.md`](../docs/USER_JOURNEY_UAT.md) - User journey matrix
- [`docs/REPORTS/00060k_r2_full_testing_report.md`](../docs/REPORTS/00060k_r2_full_testing_report.md) - Full testing report (snapshot 2026-06-09; current inventory xem `docs/08_testing_local_run.md`)

**Browser debug skill:**
- `.claude/skills/fullstack-browser-debug/SKILL.md` - Full FE-BE verification checklist

