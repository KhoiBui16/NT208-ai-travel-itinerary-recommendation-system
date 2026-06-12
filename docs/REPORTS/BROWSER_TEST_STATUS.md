# Browser Test Status - 2026-06-12

**Last Updated:** 2026-06-12  
**Plan Source:** `docs/BROWSER_TEST_PLAN.md`  
**Primary Browser Tool:** Browserbase `browse` CLI `0.8.3`  
**Support Regression:** `npx playwright test --reporter=list`

---

## One-Line Summary

🟢 **C3A BROWSER BASELINE IS STABLE** - Core browser flows, multi-city `CityDetail`, real AI generate, share/claim, and chat-session foundation all pass on the live local stack. `C3B` itself is still not implemented yet.

---

## What Was Re-Verified This Pass

| Flow | Source | Status | Notes |
|---|---|---|---|
| TC01 register flow | `browse` | ✅ PASS | Real UI submit redirects to `/`; `accessToken` + `refreshToken` stored |
| TC02 destinations list | `browse` | ✅ PASS | `/cities` loads and routes now use slug URLs |
| TC04 AI generate short trip | real browser + API/DB/Redis | ✅ PASS | Guest flow reached `/trip-workspace?tripId=513`; DB has `2` days / `10` activities / `1` accommodation; Redis rate key observed |
| TC10 city detail via slug | real browser + API/DB | ✅ PASS | Sparse cities show hotel-only state; rich cities render API places + hotels with true counts |
| TC12 share trip modal | `browse` | ✅ PASS | Share URL generated from workspace |
| TC12 shared read-only view | `browse` | ✅ PASS | Public shared page loads and does not show owner chat/workspace controls |
| TC13 guest claim after login | `browse` | ✅ PASS | Redirects to `trip-workspace?tripId=503`; `pendingClaim` cleared |
| C3A chat session create | `browse` | ✅ PASS | Empty state -> create session -> active session visible |
| C3A chat session persists after reload | `browse` | ✅ PASS | Same session still visible after reload |
| C3A chat-session E2E | Playwright | ✅ PASS | `00096-c3a-chat-session.spec.ts` -> `5 passed` |
| CityDetail API-first E2E | Playwright | ✅ PASS | `00097-city-detail-api-detail.spec.ts` -> `2 passed` |
| Full frontend E2E regression | Playwright | ✅ PASS | `30 passed, 3 skipped` on 2026-06-12 |

---

## Key Current Findings

### 1. Previous browser blockers are stale

The old `2026-06-10` status in this file is no longer accurate:

- JWT/auth browser flows are now working in real UI and Playwright.
- Guest claim flow is working.
- Share flow is working.
- C3A chat session foundation is working.
- Destination list now routes by slug correctly.

### 2. C3A is real, but still only C3A

Browser evidence confirms current source truth:

- `AI Chat` tab is present inside owner workspace.
- Empty state shows `Chưa có phiên chat cho chuyến đi này`.
- Creating a session produces `Companion Chat`, `Phiên: #22`, `active`, and a stable thread id.
- After reload, the session remains visible.

But the UI still explicitly says:

- `Giao diện tin nhắn sẽ có trong C3B`
- `Ô nhập tin nhắn sẽ có trong C3B`

So this is **chat session foundation only**, not companion messaging / patch-confirm flow yet.

### 3. `CityDetail` is now API-first and count-consistent

The old limitation is no longer current.

Backend:

- `GET /api/v1/places/destinations/{slug}` now returns a composite payload with `destination`, `places[]`, and `hotels[]`
- detail `placesCount` / `hotelsCount` now align with the returned arrays

Real browser verification:

- sparse destinations such as `Buôn Ma Thuột` and `Cần Thơ` render hotel-backed detail instead of 404/generic-only fallback
- ready destinations such as `Hà Nội`, `Đà Nẵng`, and `TP. Hồ Chí Minh` now render API-backed place + hotel sections even though they also exist in the old mock pack
- observed counts in the browser now match backend truth:
  - `Buôn Ma Thuột`: `0` places / `1` hotel
  - `Cần Thơ`: `0` places / `1` hotel
  - `Hà Nội`: `74` places / `3` hotels
  - `Đà Nẵng`: `72` places / `2` hotels
  - `TP. Hồ Chí Minh`: `75` places / `2` hotels

The remaining limitation is **data coverage**, not route/render correctness: many cities are still sparse in the DB, so the UI truthfully shows hotel-only/sparse readiness states.

### 4. The AI generate path is proven on the real stack

The live guest generate flow was re-verified in a real browser against:

- Frontend `http://localhost:5173`
- Backend `http://localhost:8000`
- Postgres in Docker
- Redis in Docker

Observed outcome:

- browser navigated to `trip-workspace?tripId=513`
- generated workspace rendered `Hà Nội Food Adventure`
- DB cross-check for trip `513` showed `2` trip days, `10` activities, `1` accommodation
- Redis contained a local AI quota key after the run

---

## Evidence Anchors

Key evidence files under `docs/REPORTS/BROWSERBASE_TEST_EVIDENCE/`:

- `2026-06-12-tc01-register-after-ref.png`
- `2026-06-12-tc02-cities-list.png`
- `2026-06-12-tc10-buon-ma-thuot-detail.png`
- `2026-06-12-tc12-share-modal.png`
- `2026-06-12-tc12-shared-view.png`
- `2026-06-12-tc13-claim-login-after.png`
- `2026-06-12-c3a-chat-empty-state.png`
- `2026-06-12-c3a-chat-active-session.png`
- `2026-06-12-c3a-chat-after-reload.png`

Supporting truth checks:

- DB verified destination slug `buon-ma-thuot` exists
- DB verified sparse and ready cities with matching place/hotel counts
- DB verified trip `513` persisted after real AI generate
- Redis verified local AI rate-limit key creation after generate

---

## Playwright Regression Result

Command:

```powershell
Set-Location "<repo-root>\\Frontend"
npx playwright test --reporter=list
```

Result on `2026-06-12`:

- `30 passed`
- `3 skipped`
- duration about `44s`

Notable green areas from the suite:

- auth register/login/protected-route flows
- guest pending claim
- trip workspace boundary
- C3A chat session CRUD/persistence
- public pages
- trip CRUD smoke
- destination readiness / create-trip browser path

Skipped specs remained the exploratory `b3/*` cases.

---

## Merge Recommendation

### PR readiness

**Recommendation:** ✅ **Mergeable with limitations** if the PR scope is:

- browser/doc sync for current `C3A` truth
- slug-route stabilization
- CityDetail API-first/detail-count fix
- real browser + AI generate evidence refresh
- evidence-backed status update

### Do not overclaim

Do **not** describe this PR as:

- shipping `C3B` companion chat
- shipping full message send / patch-confirm chat UX
- making sparse-city ETL/data coverage complete

### Follow-up after merge

1. Improve destination data coverage so sparse cities have real places instead of hotel-only detail.
2. Keep `C3B` work separate from this docs/browser sync branch.
3. Add chat-message/apply-patch verification only on the dedicated `C3B` branch, because current repo truth is still session-foundation only.

---

## Final Verdict

**Current branch status:** `MERGEABLE_FOR_00097`

- Browser-critical flows for `C3A` are stable enough.
- The CityDetail route/render/count bug is fixed on the live stack.
- Real AI generate has been verified through FE -> BE -> DB -> Redis.
- This branch is a valid pre-C3B stabilization checkpoint.
- `C3B` is still **not implemented yet**, so the correct next step is: merge `00097`, then open a dedicated `C3B` feature branch.
