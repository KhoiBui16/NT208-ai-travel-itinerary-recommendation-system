# Full User Journey UAT

Phase: `00059B`
Branch: `docs/00059-b1-full-user-journey-uat`
Date: 2026-06-01

## Scope

This UAT maps the current product as a Vietnam AI travel itinerary website after phases `00051`, `00052`, `00056`, `00057`, `00058A`, `00058B`, and `00059A`.

This phase does not implement C3/C4, does not call real Gemini, does not call real Goong, and does not run ETL. AI generate behavior is verified through source, unit tests, mocked browser tests, and backend validation tests unless explicitly marked otherwise.

## Why These Journeys Matter

The product is useful only if a traveler can discover destinations, create or save a trip, recover a guest trip after login/register, edit the workspace, and share or revisit the itinerary without seeing unclear errors. The matrix below keeps that product path visible instead of only checking isolated endpoints.

## Journey Matrix

| Journey ID | Actor | Goal | Real user steps | Expected behavior | FE area | BE area | Data dependency | Current evidence | Risk |
|---|---|---|---|---|---|---|---|---|---|
| UJ-GUEST-01 | Guest | Browse public app and destination entry points | Open home, city/create pages, inspect destination suggestions | Public pages load; destination API/fallback does not break the UI | `routes.tsx`, `Home`, `CityList`, `CreateTrip`, `useDestinations` | `GET /places/destinations`, `GET /places/search` | DB destinations or FE fallback | Playwright public pages pass; backend place integration tests pass | Low |
| UJ-GUEST-02 | Guest | Create AI trip | Choose supported city, dates, preferences, click AI generate | Trip generated or actionable 422/429/503; guest receives claim token if persisted | `CreateTrip.tsx`, `CalendarModal`, `errorHandler.ts` | `POST /itineraries/generate`, `ItineraryPipeline`, `RateLimiter` | Destination data, Redis, Gemini if real AI call | Calendar/date and mocked generate submit pass; backend pipeline unit tests pass | Partial because real Gemini was intentionally not called |
| UJ-GUEST-03 | Guest | Hit quota 429 | Generate until daily quota is exhausted | Friendly 429 with retry/reset information | `CreateTrip.tsx`, `ApiError`, `errorHandler.ts` | `RateLimiter`, `RateLimitException`, generate router headers | Redis | Unit tests verify quota metadata; E2E verifies 429 response shape and UI shell | Partial because no repeated real generate was executed |
| UJ-GUEST-04 | Guest to Auth | Claim guest trip after login/register | Create guest trip, store claim token, login/register, open workspace | Claim token is consumed and trip becomes owned by user | `AuthContext.tsx`, `Login.tsx`, `Register.tsx`, `ProtectedRoute.tsx` | `POST /itineraries/{id}/claim`, `GuestClaimToken` | Claim token row | Playwright login claim and register claim pass | Low |
| UJ-AUTH-01 | Auth | Register/login/session/logout/profile | Register, login, access protected route, refresh profile, logout | Authenticated state works and protected routes redirect guests | `AuthContext.tsx`, `services/api.ts`, `Login`, `Register`, `Profile` | `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/logout`, `/users/profile` | Auth DB/JWT/refresh token | Playwright register/login/protected route pass; backend unit auth tests pass | Logout browser path not directly covered |
| UJ-AUTH-02 | Auth | Generate AI trip | Login, create AI trip, open workspace | Auth user quota enforced; generated itinerary opens workspace | `CreateTrip.tsx`, `TripWorkspace.tsx` | `POST /itineraries/generate`, `ItineraryPipeline` | Destination data, Redis, Gemini if real AI call | Backend pipeline unit tests; Playwright creates trip via manual API then opens workspace | Partial because real Gemini was intentionally not called |
| UJ-AUTH-03 | Auth | Manual trip CRUD | Create/update/delete trip or day/activity | Data persists and unauthorized users are blocked | `useTripSync.ts`, `useActivityManager.ts`, `ItineraryView`, `TripLibrary` | `/itineraries`, `/activities`, `/accommodations` | DB trip ownership | Backend integration create/list pass; Playwright list/delete path pass | High: nested activity/accommodation membership authz gap found |
| UJ-AUTH-04 | Auth | Workspace edit itinerary | Open workspace, edit details, save | Optimistic UI updates, API persists, failure reverts | `TripWorkspace.tsx`, `useTripSync.ts`, `useActivityManager.ts` | `PUT /itineraries/{id}`, nested activity/accommodation endpoints | Trip ownership | Source supports optimistic save and update; backend service tests cover trip owner checks | Partial; no browser persistence test for workspace edit |
| UJ-AUTH-05 | Auth | Share trip | Create/open share link | Owner creates opaque share token; public shared view loads by token | `TopActionBar`, `ItineraryView`, `SharedTripView` | `POST /itineraries/{id}/share`, `GET /shared/{token}` | Share token hash | Backend unit tests cover share creation/redaction; invalid shared token integration pass | Partial; no valid share browser UAT in this run |
| UJ-AUTH-06 | Auth | Access another user's trip | Login as user A, try user B trip ID | 403 or redirect; no IDOR | `ProtectedRoute`, API client handling | owner checks in itinerary service | Two users and trips | Unit tests cover `get_by_id`, delete, rate owner checks | Partial; nested subresource membership gap needs fix |
| UJ-ERROR-01 | Any | Partial destination warning | Select partial city such as Đà Lạt | Warning appears but submit remains allowed | `CreateTrip.tsx`, `useDestinations.ts` | `DestinationResponse` readiness fields | Destination quality metadata | Playwright `00057` pass | Low |
| UJ-ERROR-02 | Any | Backend validation 422 | Submit invalid form/API payload | User sees actionable validation message | `errorHandler.ts`, forms | Pydantic schemas, `ValidationException` | None | Backend integration validation tests pass; FE mapping source reviewed | Browser 422 path currently skipped in legacy B3 |
| UJ-ERROR-03 | Any | AI unavailable 503 | AI provider/rate limiter unavailable | User sees service unavailable message; paid AI does not fail-open | `errorHandler.ts` | `ServiceUnavailableException`, Redis fail-closed | Redis/Gemini | Source and unit tests cover mapping/fail-closed behavior | Browser 503 path not tested in this run |

## Current Readiness

| Area | Status | Notes |
|---|---|---|
| Public browsing | PASS | Public Playwright pages passed; destination APIs have integration coverage. |
| Calendar/date picker | PASS | `00059A` helper unblocks date selection and full Playwright suite passed. |
| Destination readiness advisory | PASS | Partial city warning is non-blocking and tested. |
| Auth/register/login/protected route | PASS | Browser and backend unit evidence available. |
| Guest claim | PASS | Login and register claim reload paths passed. |
| AI generate | PARTIAL | Local UAT avoids real Gemini; source/unit coverage is good, real provider smoke remains separate. |
| Rate-limit 429 UX | PARTIAL | Backend metadata and FE mapping covered; no repeated real generate loop. |
| Manual trip/workspace CRUD | PARTIAL | Broad CRUD works, but nested subresource membership authz needs a fix. |
| Share/public shared view | PARTIAL | Backend share behavior covered; valid share browser path not tested. |
| C3/C4 | DEFERRED | Not implemented in this phase by design. |

## 00059C Real Manual Evidence Update

Date: 2026-06-01
Branch: `docs/00059-c-real-end-user-uat`

This section upgrades the `00059B` matrix with real browser/API evidence from a controlled local manual UAT run. Real Gemini, real Goong, and ETL were still intentionally skipped by phase policy, so journeys that depend on external providers remain `PARTIAL` even when UI flow was exercised with safe mocked responses.

| Journey ID | 00059C status | Evidence type | Key note |
|---|---|---|---|
| UJ-GUEST-01 | PASS | Real browser | Homepage CTA/value prop and create-trip navigation are understandable to a first-time visitor. |
| UJ-GUEST-02 | PARTIAL | Mocked-success browser flow | Guest generate stored pending claim and redirected to login, but no real Gemini call was executed. |
| UJ-GUEST-03 | PASS | Real browser + safe mocked error | `Da Lat` warning is visible and submit remains allowed; request still leaves the form. |
| UJ-GUEST-04 | PARTIAL | Mocked browser error | 429 message is clear and user-facing, but quota was not exhausted through real repeated calls. |
| UJ-GUEST-05 | PASS | Real browser | Guest trip was claimed after auth and landed in workspace successfully. |
| UJ-AUTH-01 | PASS | Real browser | Register, logout, login, and protected-route session behavior worked as expected. |
| UJ-AUTH-02 | PARTIAL | Mocked-success browser flow | Auth user reached workspace after mocked generate success; no real Gemini call. |
| UJ-AUTH-03 | PASS | Real browser | Trip library and workspace loaded owned data correctly. |
| UJ-AUTH-04 | PASS | Real browser | Activity time edit persisted after reload. |
| UJ-AUTH-05 | PASS | Real browser | Share link was generated and public shared route rendered a read-only itinerary. |
| UJ-AUTH-06 | FAIL | Real API reproduction | Trip-level 403 is enforced, but nested activity/accommodation mixed-ID writes were exploitable. |
| UJ-ERROR-01 | PARTIAL | Real browser + mocked 422 | Unsupported city and backend-style validation messaging are actionable, but not every 422 came from a live backend round-trip. |
| UJ-ERROR-02 | PARTIAL | Mocked browser error | 503 UX is friendly, but no real provider outage was triggered. |
| UJ-ERROR-03 | PARTIAL | Source + browser evidence | Paid-AI fail-closed behavior is still inferred from source/tests plus mocked UX, not a real Redis/provider outage. |

## Follow-Up Before C3/C4

| Follow-up | Severity | Reason |
|---|---|---|
| Fix nested activity/accommodation membership authorization | High | `update/delete` checks owner of supplied trip but does not prove subresource belongs to that trip. |
| Add browser UAT for workspace edit persistence | Medium | Optimistic UI exists, but persistence/revert path needs browser evidence. |
| Add valid share-link browser UAT | Medium | Public share route exists; valid token flow should be covered. |
| Keep real Gemini smoke separate and controlled | Medium | This UAT intentionally did not call paid/external AI. |
| Clean historical docs that still mention old host binding or stale counts | Low | New UAT docs use `localhost`, but old historical reports remain as evidence snapshots. |
