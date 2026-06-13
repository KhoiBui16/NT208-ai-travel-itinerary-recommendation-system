# Browser Test Status - 2026-06-13

**Last Updated:** 2026-06-13
**Plan Source:** `docs/BROWSER_TEST_PLAN.md`  
**Primary Browser Tool:** Browserbase `browse` CLI `0.8.3`  
**Support Regression:** `npx playwright test --reporter=list` + live local browser smoke

---

## One-Line Summary

🟢 **PRE-C3B BROWSER BASELINE IS STABLE** - `C3A` browser baseline vẫn xanh, `CityDetail` vẫn API-first/count-consistent, và `00098` đã khóa thêm các drift ở login submit, trip duration/status, và itinerary detail flow trước khi tách `C3B`.

---

## What Was Re-Verified Across The Latest Passes

| Flow | Source | Status | Notes |
|---|---|---|---|
| TC01 register flow | `browse` | ✅ PASS | Real UI submit redirects to `/`; tokens stored |
| TC02 destinations list | `browse` | ✅ PASS | `/cities` loads and routes use slug URLs |
| TC04 AI generate short trip | real browser + API/DB/Redis | ✅ PASS | Guest flow reached workspace; DB + Redis cross-check already proved persist/quota path |
| TC10 city detail via slug | real browser + API/DB | ✅ PASS | Sparse cities show hotel-only truth; rich cities render API places + hotels with matching counts |
| TC12 share trip modal | `browse` | ✅ PASS | Share URL generated from workspace |
| TC12 shared read-only view | `browse` | ✅ PASS | Public shared page loads and does not show owner-only chat/workspace controls |
| TC13 guest claim after login | `browse` | ✅ PASS | Redirects back to workspace; `pendingClaim` cleared |
| C3A chat session create + reload | `browse` | ✅ PASS | Empty state, create session, reload persistence all verified |
| C3A chat-session E2E | Playwright | ✅ PASS | `00096-c3a-chat-session.spec.ts` -> `5 passed` |
| CityDetail API-first E2E | Playwright | ✅ PASS | `00097-city-detail-api-detail.spec.ts` -> `2 passed` |
| Login submit + trip history/library truth | live browser + API | ✅ PASS | Real login returned `200`; `/trip-history` + `/trip-library` no longer show false `0 ngày` |
| Itinerary detail render with DB-backed activity | live browser + API | ✅ PASS | `/itinerary/521` rendered activity `Pho co Ha Noi` from real trip data |
| Full frontend E2E regression | Playwright | ✅ PASS | `32 passed, 3 skipped` on 2026-06-13 (`35` tests / `16` spec files) |

---

## Key Current Findings

### 1. The old blocker narrative is still stale

The old `2026-06-10` browser blocker narrative is no longer current:

- JWT/auth browser flows are working.
- Guest claim flow is working.
- Share flow is working.
- C3A chat session foundation is working.
- Destination list now routes by slug correctly.

### 2. `00098` removed remaining pre-C3B truth drift

The 2026-06-13 follow-up pass confirmed:

- destination browse/detail now follows backend slug/detail truth consistently
- TripHistory and TripLibrary no longer derive `0 ngày` from list payloads that have not hydrated `days[]`
- itinerary detail still renders real DB-backed activities after the contract hardening
- login submit path still works against the live auth API

This matters because `C3B` will build on these same workspace and destination surfaces.

### 3. `C3A` is real, but still only `C3A`

Browser evidence still confirms current source truth:

- `AI Chat` tab is present inside owner workspace
- empty state appears before session creation
- creating a session produces an active session with stable thread identity
- the session remains visible after reload

But the UI still explicitly says:

- `Giao diện tin nhắn sẽ có trong C3B`
- `Ô nhập tin nhắn sẽ có trong C3B`

So this is **chat session foundation only**, not companion messaging / patch-confirm flow yet.

### 4. `CityDetail` remains API-first and count-consistent

Observed browser truth remains aligned with API payloads:

- `Buôn Ma Thuột`: `0` places / `1` hotel
- `Cần Thơ`: `0` places / `1` hotel
- `Hà Nội`: `74` places / `3` hotels
- `Đà Nẵng`: `72` places / `2` hotels
- `TP. Hồ Chí Minh`: `75` places / `2` hotels

The remaining limitation is **data coverage**, not route/render correctness.

### 5. AI generate remains proven on the real stack

The live guest generate flow was already re-verified against:

- Frontend `http://localhost:5173`
- Backend `http://localhost:8000`
- Postgres in Docker
- Redis in Docker

Observed outcome:

- browser navigated to workspace
- generated itinerary rendered successfully
- DB cross-check confirmed persisted trip data
- Redis contained a local AI quota key after the run

---

## Evidence Anchors

Browserbase evidence from the 2026-06-12 pass remains valid under `docs/REPORTS/BROWSERBASE_TEST_EVIDENCE/`.

Additional 00098 local smoke evidence:

- `.codex-run-logs/00098-login-before-submit.png`
- `.codex-run-logs/00098-login-after-submit.png`
- `.codex-run-logs/00098-trip-history.png`
- `.codex-run-logs/00098-trip-library.png`
- `.codex-run-logs/00098-itinerary-521.png`
- `.codex-run-logs/playwright-00098.json`

---

## Playwright Regression Result

Command:

```powershell
Set-Location "<repo-root>\\Frontend"
npx playwright test --reporter=list
```

Result on `2026-06-13`:

- `32 passed`
- `3 skipped`
- `35` tests total across `16` spec files

Notable green areas from the suite:

- auth register/login/protected-route flows
- guest pending claim
- trip workspace boundary
- trip history/library truth after `00098`
- C3A chat session CRUD/persistence
- public pages
- trip CRUD smoke
- destination readiness / create-trip browser path

Skipped specs remain the legacy `b3/*` observation flows.

---

## Merge Recommendation

### PR readiness

**Recommendation:** ✅ **Mergeable with limitations** if the PR scope is:

- browser/doc sync for current `C3A` truth
- pre-`C3B` hardening for destination slug/detail truth
- trip duration/status truth on list pages
- itinerary delete-activity contract hardening
- real browser + Playwright evidence refresh

### Do not overclaim

Do **not** describe this PR as:

- shipping `C3B` companion chat
- shipping full message send / patch-confirm chat UX
- completing sparse-city ETL/data coverage

### Follow-up after merge

1. Start the dedicated `C3B` feature branch after merging `00098`.
2. Keep message send / apply-patch / chat quota work inside that branch.
3. Improve ETL/data coverage for sparse cities separately from `C3B`.

---

## Final Verdict

**Current branch status:** `MERGEABLE_FOR_00098`

- Browser-critical flows for `C3A` are stable enough.
- The CityDetail route/render/count bug remains fixed on the live stack.
- `00098` additionally fixed trip-duration truth and itinerary detail drift before `C3B`.
- Real AI generate has already been verified through FE -> BE -> DB -> Redis and remains consistent with the current stack.
- This branch is a valid pre-`C3B` stabilization checkpoint.
