# Browserbase Test Results - 2026-06-12

**Plan Reference:** `docs/BROWSER_TEST_PLAN.md`  
**Browser Tool:** Browserbase `browse` CLI `0.8.3`  
**Mode:** local managed browser, headless  
**Support Verification:** Playwright targeted regressions + API/DB/Redis spot checks

> **2026-06-13 addendum:** Nhánh `00098` không cần rerun Browserbase riêng vì các flow browser nền đã xanh từ pass này. Follow-up hardening được verify thêm bằng live local browser smoke + full Playwright regression và được tổng hợp tại `BROWSER_TEST_STATUS.md` và `00098_pre_c3b_hardening_and_pr_readiness.md`.
>
> **2026-06-19 addendum:** File này hiện là baseline lịch sử của giai đoạn `C3A`/pre-`C3B`. Current source trên nhánh `00100` đã vượt baseline này với các evidence mới:
> - full Playwright suite `33 passed`, `3 skipped` trên `36` tests / `17` spec files
> - real AI generate PASS
> - real companion chat send/history PASS
> - ETL scheduler once PASS, `Buôn Ma Thuột` đã có `69` places
>
> Current truth nên đọc cùng `docs/REPORTS/BROWSER_TEST_STATUS.md`, `docs/09_execution_tracker.md`, và `README.md`.
>
> **2026-06-20 addendum:** current runtime tiếp tục được verify thêm bằng local Chrome smoke trên stack thật:
> - `TripWorkspace` và `DailyItinerary` không còn mount `FloatingAIChat` / promo mock surfaces
> - `/cities/ha-noi` và `/cities/chau-doc` render đúng rich/sparse truth từ backend
> - `chat_sessions.id=206` persisted cùng `4` `chat_messages`
> - live provider prompt chỉnh itinerary vẫn có thể trả clarification-first (`requiresConfirmation=false`), nhưng pass `00101` đã bổ sung evidence end-to-end cho proposal-confirm bằng browser/API/DB thật

---

## Scope Of This Pass

This rerun focused on flows that matter most for current `C3A` truth and for the recent destination slug/detail + API-first fixes:

1. Auth register in real UI
2. Destinations list -> slug route navigation
3. Multi-city destination detail render across sparse and ready cities
4. Share trip -> shared read-only page
5. Guest claim after login
6. C3A chat session create + reload persistence
7. Real AI generate guest flow through FE -> BE -> DB -> Redis

This pass also reran targeted Playwright regressions for chat sessions and API-backed `CityDetail`.

---

## Environment Snapshot

### Local services

- `Frontend`: `http://localhost:5173`
- `Backend`: `http://localhost:8000`
- `db` container: healthy
- `redis` container: healthy

### Tool health

`browse doctor` was healthy before the run:

- runtime: `browse 0.8.3`
- mode: `managed-local, headless`
- daemon: no blocking prerequisite issue

The repo-local Browserbase workflow is therefore usable as-is. The `agent-browser` CLI from the Vercel skill set was **not** installed locally; browser evidence in this report comes from `browse` plus Playwright.

### Frontend API base

Served frontend source confirmed:

```ts
import.meta.env.VITE_API_URL = "http://localhost:8000"
```

---

## Browserbase Results

### 1. Register flow

**Status:** ✅ PASS

What was verified:

- `/register` loads
- real form fill works
- submit succeeds
- browser redirects to `/`
- `accessToken` and `refreshToken` exist in `localStorage`

Evidence:

- `docs/REPORTS/BROWSERBASE_TEST_EVIDENCE/2026-06-12-tc01-register-before.png`
- `docs/REPORTS/BROWSERBASE_TEST_EVIDENCE/2026-06-12-tc01-register-after-ref.png`
- `docs/REPORTS/BROWSERBASE_TEST_EVIDENCE/2026-06-12-tc01-register-after-ref-snapshot.txt`

Notes:

- CSS selector fill for confirm-password was flaky in one attempt.
- Using `browse` refs fixed this and produced a clean submit path.

### 2. Destinations list -> slug route

**Status:** ✅ PASS

What was verified:

- `/cities` renders correctly
- list items now point to slug URLs
- clicking `Buôn Ma Thuột` lands on `/cities/buon-ma-thuot`

Evidence:

- `2026-06-12-tc02-cities-list.png`
- `2026-06-12-tc02-cities-list-snapshot.txt`
- `2026-06-12-tc10-buon-ma-thuot-detail.png`
- `2026-06-12-tc10-buon-ma-thuot-detail-snapshot.txt`

Confirmed URL:

```text
http://localhost:5173/cities/buon-ma-thuot
```

### 3. Multi-city `CityDetail`

**Status:** ✅ PASS

What was verified in a real browser:

- `/cities/buon-ma-thuot` renders a sparse hotel-backed page, not 404/generic-only fallback
- `/cities/can-tho` renders the same sparse hotel-only pattern
- `/cities/ha-noi` renders API-backed place + hotel sections with `74` places and `3` hotels
- `/cities/da-nang` renders API-backed place + hotel sections with `72` places and `2` hotels
- `/cities/tp-ho-chi-minh` renders API-backed place + hotel sections with `75` places and `2` hotels

Meaning:

- non-mock destinations now render real backend detail
- mock-pack destinations no longer hide backend truth when API detail exists
- the remaining issue for sparse cities is data coverage, not `CityDetail` rendering

### 4. Share flow

**Status:** ✅ PASS

What was verified:

- workspace `Chia sẻ` button works
- share URL is generated in UI
- public shared page opens without login
- shared page is read-only and does not expose `AI Chat`

Evidence:

- `2026-06-12-tc12-share-modal.png`
- `2026-06-12-tc12-share-modal.txt`
- `2026-06-12-tc12-shared-view.png`
- `2026-06-12-tc12-shared-view.txt`

Observed share URL example:

```text
http://localhost:5173/shared/share_OmCRfzmI80HOZBt-uh7ZcSDbHM750vWcKNURuL7Na6g
```

### 5. Guest claim after login

**Status:** ✅ PASS

What was verified:

- seed `pendingClaim` in `sessionStorage`
- login through the real UI
- browser redirects to `trip-workspace?tripId=503`
- `pendingClaim` becomes `null`

Evidence:

- `2026-06-12-tc13-claim-login-before.txt`
- `2026-06-12-tc13-claim-login-after.png`
- `2026-06-12-tc13-claim-login-after.txt`

### 6. C3A chat session foundation

**Status:** ✅ PASS

What was verified:

- owner workspace exposes `AI Chat` tab
- empty state appears before session creation
- `Bắt đầu cuộc trò chuyện` creates a session
- active session state appears
- same session remains visible after reload

Observed UI strings:

- `Chưa có phiên chat cho chuyến đi này`
- `Companion Chat`
- `Phiên: #22`
- `active`
- `Thread ID: trip-503-0020adb747ed`
- `Giao diện tin nhắn sẽ có trong C3B`
- `Ô nhập tin nhắn sẽ có trong C3B`

Evidence:

- `2026-06-12-c3a-chat-empty-state.png`
- `2026-06-12-c3a-chat-empty-state.txt`
- `2026-06-12-c3a-chat-active-session.png`
- `2026-06-12-c3a-chat-active-session.txt`
- `2026-06-12-c3a-chat-after-reload.png`
- `2026-06-12-c3a-chat-after-reload.txt`

Interpretation:

- `C3A` foundation is real and stable.
- Historical note from the pre-`00101` pass: at that point patch-confirm was not yet implemented. Current source has already superseded this conclusion with real apply/cancel/stale verification.

### 7. Real AI generate guest flow

**Status:** ✅ PASS

What was verified:

- opened `/create-trip` in a real browser
- filled destination + date range + traveler preferences
- submitted `Tạo Lịch Trình Với AI`
- browser navigated to `/trip-workspace?tripId=513`
- generated workspace rendered a real itinerary (`Hà Nội Food Adventure`)

Cross-check outcome:

- DB: trip `513` exists with `2` trip days, `10` activities, `1` accommodation
- Redis: local AI quota key existed after generate

Interpretation:

- FE -> BE -> Gemini -> DB persist -> workspace load is working on the live stack
- AI generate is no longer just a docs claim or API-only smoke

---

## API And DB Cross-Checks

### Destination truth across sparse and ready cities

DB + API checks now align for the sampled cities:

| City | Browser result | DB/API truth |
|---|---|---|
| `Buôn Ma Thuột` | sparse hotel-only detail | `0` places / `1` hotel |
| `Cần Thơ` | sparse hotel-only detail | `0` places / `1` hotel |
| `Hà Nội` | rich API detail | `74` places / `3` hotels |
| `Đà Nẵng` | rich API detail | `72` places / `2` hotels |
| `TP. Hồ Chí Minh` | rich API detail | `75` places / `2` hotels |

### AI generate truth

DB checks for the browser-generated trip:

```text
trip_id = 513
destination = Hà Nội
trip_days = 2
activities = 10
accommodations = 1
guest_claim_tokens = 1
```

Redis check after the run:

```text
rate:ai:guest:dd09278b64d71375:20260612
```

---

## Playwright Regression Companion Result

Commands run:

```powershell
Set-Location "<repo-root>\\Frontend"
npx playwright test tests\\e2e\\00096-c3a-chat-session.spec.ts --reporter=list
npx playwright test tests\\e2e\\00097-city-detail-api-detail.spec.ts --reporter=list
```

Result:

- `00096-c3a-chat-session.spec.ts`: `5 passed`
- `00097-city-detail-api-detail.spec.ts`: `2 passed`
- follow-up `00098` full-suite rerun on 2026-06-13: `32 passed`, `3 skipped` across `35` tests / `16` spec files

Important green areas from the suite:

- C3A chat session create/list/cross-user/persist
- `CityDetail` API-backed non-mock render
- `CityDetail` API-first behavior even for old mock-pack cities

---

## Findings

### Resolved / no longer reproduced

1. The old browser report claim that JWT/auth browser flows were blocked is stale.
2. Guest claim works in real browser flow.
3. Share flow works in real browser flow.
4. C3A chat session foundation works in real browser flow.
5. Destination list now routes with slugs correctly.
6. `CityDetail` now surfaces API-backed places/hotels and no longer has the old detail count mismatch.
7. Real AI generate is proven on the live stack.

### Remaining limitation

1. `C3B/C3C` messaging + patch-confirm core is implemented and locally verified; remaining gaps are data/ops hardening.
2. Many destinations remain sparse in DB coverage, so hotel-only pages are expected for those cities.

### Tooling note

`browse` sometimes printed daemon-session timeout warnings during long scripted runs, but the resulting sessions, screenshots, URLs, and snapshots were still captured successfully. The evidence above was validated from the saved artifacts, not from tool stdout alone.

---

## Recommendation

### Merge posture

**Recommended status:** `MERGEABLE_WITH_LIMITATIONS`

Use this only if the PR is described as:

- browser/doc sync
- evidence refresh for current `C3A`
- destination slug/detail stabilization
- CityDetail API-first/detail-count hardening
- pre-`C3B` workspace hardening from `00098`
- real AI generate evidence refresh

### Do not claim in merge description

Do not claim that this PR:

- implements C3B companion messaging
- implements patch-confirm companion workflow
- completes sparse-city ETL coverage

### Follow-up ticket after merge

1. Improve ETL/data coverage for sparse cities such as `Buôn Ma Thuột` and `Cần Thơ`.
2. Keep message send / apply-patch / chat quota work inside the dedicated `C3B` branch.

---

## Final Result

Browserbase verification is now strong enough to support the current PR, and it materially changes the repo truth compared with the stale `2026-06-10` report:

- core browser flows are green
- `C3A` is genuinely active
- old blocker narrative is outdated
- `CityDetail` API-first rendering is fixed on the live stack
- real AI generate is confirmed through FE -> BE -> DB -> Redis
- `C3B` is still the next phase, not something this branch already ships
