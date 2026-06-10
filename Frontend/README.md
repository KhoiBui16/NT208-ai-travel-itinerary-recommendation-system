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
| AI C.2 | Activity suggestion API integrated (`GET /api/v1/agent/suggest/{activity_id}`) |
| AI C.3A | `ChatPanel` component integrated into `TripWorkspace` with chat session REST APIs |
| Remaining AI UI | `FloatingAIChat`, promo bubble, contextual panels, and companion components are still mock/placeholder for C.3B |
| Verified 2026-06-10 | Playwright e2e: 19 test files; browser smoke covered auth generate, seeded guest claim reload, rate limit, FE error handling (00062 fixes), destination slugify fuzzy match (BUG-BE-003 fix PR #92), chat session CRUD (C3A PR #98-100) |

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
├── chat.ts         # chat session CRUD (C3A)
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
-> ProtectedRoute redirects to /login
-> login/register calls POST /api/v1/itineraries/{tripId}/claim
-> BE transfers trip ownership to the authenticated user
```

Observed 2026-05-26:

- `pendingClaim` survives reload within the same browser tab because it is stored in `sessionStorage`.
- After reloading `/login`, the claim still succeeds after login.
- The React Router `location.state.from` target is lost on login-page reload, so the user may land on `/` after claim and then must open the trip from library/history or direct URL. This is tracked in `docs/REPORTS/ISSUES/guest_login_reload_redirect_target_lost.md`.

## Trip Workspace Data Flow

```text
/trip-workspace?tripId=123
-> ProtectedRoute requires auth
-> useTripSync() calls getItinerary(123)
-> maps ItineraryResponse days/activities/accommodations into FE state
-> sessionStorage "currentTrip" is only a quick-restore fallback
```

The backend remains source of truth after a generated trip is claimed or owned by a user.

## Map And Goong Usage

Do not call Goong REST APIs directly from FE with `GOONG_API_KEY`.

Current FE only calls backend places APIs:

```text
GET /api/v1/places/destinations
GET /api/v1/places/destinations/{name}
GET /api/v1/places/search
```

Future map view, if implemented, should use a separate public map key:

```env
VITE_GOONG_MAP_KEY=<frontend map tile key>
```

REST geocode/detail/direction calls should still go through the backend.

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

Post-merge note from 2026-06-10:

- `npm run test:e2e`: 19 test files (expanded coverage after 00062 fixes + C3A chat session tests).
- FE error handling improved: toast notifications now show specific error messages instead of generic "Không thể tạo lịch trình" for rate limits, validation errors, and AI timeouts.
- Destination slugify fuzzy matching (PR #92): Backend now properly matches "Ha Noi" → "ha-noi" → DB, improving destination resolution for users typing city names without accents.
- C3A chat session foundation (PR #98-100): ChatPanel component integrated into TripWorkspace, chat session REST APIs (EP-37/38/39), e2e tests for chat session CRUD.
- The exact default `npm run build` failed locally because an ignored `Frontend/dist/assets` directory had Windows `EPERM` permission locks. This is local artifact state, not a TypeScript/Vite compile error, and is tracked in `docs/REPORTS/ISSUES/frontend_dist_permission_lock.md`.

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
- [`docs/REPORTS/00060k_r2_full_testing_report.md`](../docs/REPORTS/00060k_r2_full_testing_report.md) - Latest full testing report

**Browser debug skill:**
- `.claude/skills/fullstack-browser-debug/SKILL.md` - Full FE-BE verification checklist

