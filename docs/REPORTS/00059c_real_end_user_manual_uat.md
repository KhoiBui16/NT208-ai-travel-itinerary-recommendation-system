# 00059C — Real End-user Manual UAT

Date: 2026-06-01
Branch: `docs/00059-c-real-end-user-uat`
PR title: `docs: [#00059] add real end-user manual UAT evidence`

## 1. Executive Summary

| Item | Result |
|---|---|
| Overall product readiness | `PARTIAL_READY_FOR_00060` |
| Can proceed to `00060` review work? | `YES` |
| Can proceed directly to implementation-heavy C3/C4? | `NO` |
| Real Gemini call | Not run by policy |
| Real Goong / ETL | Not run by policy |
| Biggest risk found | Nested activity/accommodation ownership bypass via mixed trip/subresource IDs |

This run moved beyond source-only UAT and captured real browser behavior for the current end-user product: homepage understanding, guest claim, auth session flow, trip library/workspace access, itinerary edit persistence, share view, and error messaging shells. The product feels coherent for normal user journeys, but it is not ready for mutation-heavy next phases until the nested subresource authorization gap is fixed or explicitly triaged.

## 2. Step 0 — Merge Verification

| Check | Result | Evidence |
|---|---|---|
| `main` pulled | PASS | `main` fast-forwarded to `e95b486 fix: [#131] fix trip and places feature (#65)` |
| `00059A` merged | YES | `556bcfe fix: [#00059] unblock calendar modal e2e date selection (#63)` |
| `00059B` merged | YES | `57ad982 docs: [#00059] add full user journey UAT and manual run guide (#64)` |
| 00059B guide files present on `main` | YES | `docs/LOCAL_MANUAL_UAT_GUIDE.md`, `docs/USER_JOURNEY_UAT.md`, `docs/REPORTS/00059b_full_user_journey_uat.md` |
| Current branch | PASS | `docs/00059-c-real-end-user-uat` |
| Branch policy valid | YES | `docs/<numeric>-c-...` with numeric task id in PR title |

## 3. Step 1 — Product-aware Source Coverage

| Product area | Files read deeply | Why it matters to end-user |
|---|---|---|
| Guest create/generate trip | `Frontend/src/app/pages/CreateTrip.tsx`, `Frontend/src/app/components/CalendarModal.tsx`, `Frontend/src/app/hooks/useDestinations.ts`, `Backend/src/itineraries/router.py`, `Backend/src/itineraries/service.py` | The first core product promise is "pick a city and let AI build a trip" without confusing blockers. |
| Auth/session/profile | `Frontend/src/app/contexts/AuthContext.tsx`, `Frontend/src/app/pages/Login.tsx`, `Frontend/src/app/pages/Register.tsx`, `Frontend/src/app/components/ProtectedRoute.tsx`, `Backend/src/auth/router.py`, `Backend/src/auth/service.py` | A user must understand login/register/logout state and recover access to protected pages cleanly. |
| Trip workspace/edit | `Frontend/src/app/pages/TripWorkspace.tsx`, `Frontend/src/app/components/TripTimeline.tsx`, `Frontend/src/app/components/ActivityDetailModal.tsx`, `Frontend/src/app/hooks/trips/useTripSync.ts`, `Frontend/src/app/hooks/trips/useActivityManager.ts`, `Backend/src/itineraries/repository.py` | The product fails if generated trips are not inspectable or editable after creation. |
| Share/claim | `Frontend/src/app/components/TopActionBar.tsx`, `Frontend/src/app/pages/SharedTripView.tsx`, `Backend/src/itineraries/service.py`, `Backend/tests/integration/test_auth_endpoints.py`, `Backend/tests/integration/test_itinerary_endpoints.py` | Guest-to-auth recovery and shareable itineraries are key user trust paths. |
| Error/quota UX | `Frontend/src/app/services/api.ts`, `Frontend/src/app/utils/errorHandler.ts`, `Backend/src/core/rate_limiter.py`, `Frontend/tests/e2e/00058-rate-limit-claim.spec.ts` | Clear 422/429/503 messaging determines whether users know what to do next. |
| Local run/UAT guide | `README.md`, `docs/LOCAL_MANUAL_UAT_GUIDE.md`, `docs/USER_JOURNEY_UAT.md`, `docs/REPORTS/00059b_full_user_journey_uat.md` | Manual UAT must follow the repo's real commands, not an invented workflow. |

## 4. Step 2 — Real End-user UAT Scenario Matrix

| ID | Persona | Scenario | Evidence needed | Status |
|---|---|---|---|---|
| EU-GUEST-01 | Guest | Understand homepage/product value | Real browser notes | PASS |
| EU-GUEST-02 | Guest | Create AI trip with ready city | Browser + API evidence | PARTIAL |
| EU-GUEST-03 | Guest | Partial destination `Da Lat` | Browser notes | PASS |
| EU-GUEST-04 | Guest | Quota 429 UX | UI/API evidence | PARTIAL |
| EU-GUEST-05 | Guest to Auth | Claim guest trip | Browser/API evidence | PASS |
| EU-AUTH-01 | Auth | Register/login/logout/session | Browser notes | PASS |
| EU-AUTH-02 | Auth | Generate trip as auth user | Browser + API evidence | PARTIAL |
| EU-AUTH-03 | Auth | Trip library/workspace | Browser notes | PASS |
| EU-AUTH-04 | Auth | Edit itinerary subresources | Browser/API evidence | PASS |
| EU-AUTH-05 | Auth | Share trip | Browser notes | PASS |
| EU-ERR-01 | Any | Unsupported city / 422 | UI evidence | PARTIAL |
| EU-ERR-02 | Any | AI/backend unavailable 503 | UI evidence | PARTIAL |
| EU-SEC-01 | Auth | Unauthorized trip/subresource access | API evidence | FAIL |

Why these scenarios matter:

- `EU-GUEST-01` checks whether a first-time traveler understands the app quickly enough to continue.
- `EU-GUEST-02` and `EU-AUTH-02` are the core product promise, but remain `PARTIAL` because external AI calls were intentionally not made.
- `EU-GUEST-03`, `EU-GUEST-04`, `EU-ERR-01`, and `EU-ERR-02` confirm whether the product fails clearly instead of feeling broken.
- `EU-GUEST-05` and `EU-AUTH-01` validate trust and continuity across guest/auth transitions.
- `EU-AUTH-03`, `EU-AUTH-04`, and `EU-AUTH-05` prove that a created trip is usable after generation.
- `EU-SEC-01` is critical because C3/C4 will add more mutation surfaces; an existing ownership bypass must not be buried under green happy-path tests.

## 5. Step 3 — Local App Startup

| Component | Command used | Status | URL |
|---|---|---|---|
| DB/Redis | `docker compose up -d db redis` | PASS | N/A |
| Backend | `uv run uvicorn src.main:app --host localhost --port 8000` | PASS | `localhost:8000` |
| Frontend | `npm run dev -- --host localhost --port 5173` | PASS | `localhost:5173` |
| Backend health | `curl http://localhost:8000/api/v1/health` | PASS | `localhost:8000/api/v1/health` |

Notes:

- `docker compose config --services` confirmed the active service names are `db`, `redis`, and `api`.
- Browser screenshots and dev-server logs were captured locally during this run and intentionally kept out of staged git scope.

## 6. Step 4 — Sanity Test Evidence

| Command | Status | Notes |
|---|---|---|
| `uv run ruff check src tests` | PASS | Ruff cache write warnings only |
| `uv run ruff format --check src tests` | PASS | No formatting drift |
| `uv run pytest tests/unit/ -v --tb=short` | PASS | `119 passed, 1 warning` |
| `npm run build -- --outDir .build-tmp\\verify-00059c-manual-uat` | PASS | Vite chunk-size warning only |
| `npx playwright test --reporter=list` | PASS | `19 passed, 3 skipped` |

## 7. Step 5 — Manual UAT Results

### EU-GUEST-01 — Homepage/Product Understanding

- Steps actually performed:
  1. Opened `localhost:5173`.
  2. Read the main heading and primary CTA.
  3. Followed the create-trip CTA.
- Expected: a first-time visitor understands that the app creates AI travel itineraries for Vietnam.
- Actual: heading and CTA were visible and descriptive enough to continue the flow.
- Status: `PASS`
- Evidence: heading `Kham Pha Viet Nam...`, CTA `Bat dau len lich trinh dau tien`, navigation to create-trip worked.
- User impact: the product value is discoverable without requiring docs first.

### EU-GUEST-02 — Guest AI Trip Create with Ready City

- Steps actually performed:
  1. Filled create-trip with a ready city and valid dates.
  2. Intercepted the generate response with a safe mocked success.
  3. Observed redirect behavior after trip creation.
- Expected: guest generate should store pending claim and route the user into the auth gate for protected workspace access.
- Actual: pending claim was stored and the user landed on `/login`.
- Status: `PARTIAL`
- Evidence: browser flow showed `pendingClaimStored=true`; no real Gemini call was executed.
- User impact: the guest happy path shape is correct, but real provider behavior is still outside this phase.

### EU-GUEST-03 — Partial Destination `Da Lat`

- Steps actually performed:
  1. Selected `Da Lat`.
  2. Confirmed warning text appeared.
  3. Submitted the form with a safe mocked 503 response to prove the request still left the page.
- Expected: warning is visible but submit is not blocked.
- Actual: warning appeared and generate submission was still attempted.
- Status: `PASS`
- Evidence: the warning explicitly says data is limited but the user can continue.
- User impact: advisory messaging does not block legitimate exploration of partial cities.

### EU-GUEST-04 — Quota 429 UX

- Steps actually performed:
  1. Triggered a safe mocked `429` response on create-trip.
  2. Observed user-facing error text.
- Expected: user sees quota exhaustion and knows it resets later.
- Actual: the UI showed a clear quota message.
- Status: `PARTIAL`
- Evidence: message indicated the user had used all `3` daily AI trip generations.
- User impact: recovery guidance is understandable, but this was not a real quota-burn run.

### EU-GUEST-05 — Guest Trip Claim after Auth

- Steps actually performed:
  1. Created a guest trip flow with pending claim.
  2. Registered/logged in.
  3. Let pending claim execute.
- Expected: claimed trip becomes owned and opens inside workspace.
- Actual: browser landed on `/trip-workspace?tripId=...` and pending claim was cleared.
- Status: `PASS`
- Evidence: workspace loaded after auth; pending claim storage became `null`.
- User impact: guest work is not lost when the user decides to create an account.

### EU-AUTH-01 — Register/Login/Logout/Session

- Steps actually performed:
  1. Registered a fresh account.
  2. Used the protected app routes.
  3. Logged out through the header menu.
  4. Logged back in.
- Expected: auth state stays coherent across redirects and protected pages.
- Actual: logout returned the browser to `/login`; login returned it to `/trip-library`.
- Status: `PASS`
- User impact: authenticated ownership flows feel reliable.

### EU-AUTH-02 — Auth Generate Trip

- Steps actually performed:
  1. Logged in.
  2. Submitted create-trip with a safe mocked success response.
  3. Observed workspace navigation.
- Expected: auth user can reach workspace directly after generate success.
- Actual: browser landed on `/trip-workspace?tripId=99002` with the generated trip heading visible.
- Status: `PARTIAL`
- Evidence: workspace route and heading rendered correctly, but no real Gemini call occurred.
- User impact: auth happy-path UX looks correct, pending real provider verification.

### EU-AUTH-03 — Trip Library and Workspace

- Steps actually performed:
  1. Opened `TripLibrary`.
  2. Opened an owned trip workspace.
- Expected: owned trip list and workspace data are visible.
- Actual: trip card rendered and workspace data loaded normally.
- Status: `PASS`
- User impact: created trips remain discoverable and usable.

### EU-AUTH-04 — Edit Itinerary Subresources

- Steps actually performed:
  1. Opened an activity edit flow in workspace.
  2. Changed the time.
  3. Reloaded the page.
- Expected: change persists after reload.
- Actual: time persisted as `10:15 - 11:00`.
- Status: `PASS`
- User impact: users can trust small itinerary edits to stick.

### EU-AUTH-05 — Share Trip

- Steps actually performed:
  1. Generated a share link from workspace.
  2. Opened the shared route in browser.
- Expected: shared itinerary is viewable publicly and not presented as an owner-edit surface.
- Actual: public shared route rendered the itinerary title and did not expose the save button used in owner view.
- Status: `PASS`
- User impact: share works for read-only viewing and matches user expectations.

### EU-ERR-01 — Unsupported City / 422 UX

- Steps actually performed:
  1. Entered unsupported city `Atlantis`.
  2. Observed the user-facing validation message.
  3. Separately verified backend-style 422 UI mapping with a safe mocked response.
- Expected: the user sees an actionable error instead of a generic failure.
- Actual: the UI explained that the city is not supported and should be selected from the available list.
- Status: `PARTIAL`
- User impact: message quality is good, but not every 422 branch was exercised through a real backend round-trip.

### EU-ERR-02 — 503 AI/Backend Unavailable UX

- Steps actually performed:
  1. Triggered a safe mocked `503`.
  2. Observed the mapped error message.
- Expected: the UI explains temporary service unavailability.
- Actual: the page told the user the AI service was busy or too slow and to try again later.
- Status: `PARTIAL`
- User impact: graceful error copy exists, but no real provider outage was triggered.

### EU-SEC-01 — Unauthorized Trip/Subresource Access

- Steps actually performed:
  1. Registered user A and user B through API.
  2. Created trip A and trip B.
  3. Seeded trip B with one activity and one accommodation.
  4. Verified user A gets `403` on trip-B direct read.
  5. Mixed `tripA` with `activityB` and `accommodationB` on nested endpoints.
- Expected: all unauthorized cross-trip mutations are blocked.
- Actual: trip-level read was blocked, but nested mutation succeeded across trips.
- Status: `FAIL`
- Evidence:
  - Trip-level owner check: `403`
  - Cross-trip activity update: `200`
  - Cross-trip accommodation delete: `204`
  - Activity name after exploit: `PWNED BY USER A`
  - Accommodation count after exploit: `0`
- User impact: a malicious authenticated user who owns any trip can tamper with another user's nested itinerary data if they can obtain subresource IDs.
- Follow-up: keep `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` open and fix before C3/C4 mutation work.

## 8. Error / Edge-case UX Summary

| Case | Status | Finding |
|---|---|---|
| Partial city advisory (`Da Lat`) | PASS | Clear warning, submit still allowed |
| Unsupported city copy | PASS | Actionable and specific |
| Backend-style 422 mapping | PARTIAL | Message is good, but browser evidence used safe mock |
| 429 quota message | PARTIAL | Friendly and specific, but safe mock only |
| 503 unavailable message | PARTIAL | Friendly and specific, but safe mock only |

## 9. Security / Ownership Observations

| Case | Status | Finding |
|---|---|---|
| Protected route redirect | PASS | Guests are pushed to login before workspace access |
| Claim token flow | PASS | Pending claim clears after successful claim |
| Trip-level owner check | PASS | Direct read of another user's trip returns `403` |
| Nested activity/accommodation ownership | FAIL | Mixed-ID update/delete bypass is reproducible and high severity |

## 10. Files Changed in This Phase

| File | Change | Why |
|---|---|---|
| `docs/REPORTS/00059c_real_end_user_manual_uat.md` | New | Records real browser/API UAT evidence |
| `docs/REPORTS/pr_00059c_description.md` | New | PR body template for this phase |
| `docs/REPORTS/REPORT.md` | Update | Makes 00059C discoverable from the report index |
| `docs/USER_JOURNEY_UAT.md` | Update | Adds latest real-manual-evidence status on top of 00059B matrix |
| `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` | Update | Adds concrete reproduction evidence from 00059C |

## 11. Issues Found / Deferred

| Issue | Severity | Next action |
|---|---|---|
| Nested trip subresource membership authz gap | HIGH | Fix as `00060A` before mutation-heavy next phases |
| Real Gemini generate still not run | MEDIUM | Keep as a controlled paid-provider smoke only when explicitly approved |
| Real Goong/ETL not run | MEDIUM | Keep outside this manual UAT phase |
| 429/422/503 browser flows rely partly on safe mocks | MEDIUM | Acceptable for this phase; re-verify with controlled live cases later |

## 12. Readiness Decision

| Decision | Result |
|---|---|
| Can move to `00060` review phase | `YES` |
| Can move directly to C3/C4 implementation-heavy work | `NO` |
| Recommended next phase | `00060A — Fix nested subresource authz gap` |
| Then | `00060B — Architecture/System Review + Go/No-Go before C3/C4` |

## 13. No-overclaim Notes

- Real browser evidence exists for homepage, claim flow, auth flow, workspace, edit persistence, and share view.
- Real provider-backed AI generation was intentionally not executed.
- Real quota exhaustion and real provider outage were intentionally not executed.
- Screenshots/logs were captured locally during the run and intentionally left out of the git diff to keep this phase docs-only.
