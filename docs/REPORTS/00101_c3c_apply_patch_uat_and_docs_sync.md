# 00101 C3C Apply-Patch UAT And Docs Sync

Date: `2026-06-21`
Branch: `feat/00101-c-c3c-apply-patch-confirm`
Scope: `C3C` patch-confirm core + browser/API/DB verification + docs sync

## Summary

Current source has:

- real `POST /api/v1/itineraries/{tripId}/apply-patch`
- FE confirm/cancel UI inside `ChatPanel`
- persisted `confirmation_status`, `trip_snapshot_updated_at`, `resolved_at`
- browser/API/DB evidence for `apply`, `cancel`, and `stale`
- destination API truth hardening bổ sung:
  - sparse city không còn overstate `isGenerateReady`
  - local destination cover path được normalize theo slug chuẩn
  - cache key bump sang `destinations:all:v3` / `detail:v3` để tránh Redis giữ semantics cũ

Remaining follow-up after this pass:

- patch-specific rate limit
- ETL scheduler wiring into compose/CI workflow
- sparse-city data enrichment
- deeper history-management/session UX

## Bugs found during real UAT

### 1. Legacy `restaurant` alias caused `500`

Observed on real API call:

- pending proposal existed in `chat_messages`
- `POST /apply-patch` returned `500`
- root cause: persisted proposal contained `activity.type="restaurant"` but schema only accepted canonical values like `food`

Fix landed:

- normalize legacy aliases in `CompanionPatchActivityInput`
- current mapping:
  - `restaurant -> food`
  - `cafe -> food`
  - `coffee -> food`

Verification:

- unit regression added
- API apply succeeded after reload with the same persisted proposal

### 2. Stale proposal status was rolled back on `409`

Observed on real browser/API run:

- stale request correctly returned `409`
- but re-reading session history still showed the proposal as `pending`
- root cause: service mutated ORM state then raised `ConflictException`, so transaction rolled back before `confirmationStatus='stale'` was persisted

Fix landed:

- commit stale marker before raising `409`

Verification:

- integration regression added
- browser rerun showed stale badge after reload
- SQL now confirms proposal row persisted as `stale`

## Real runtime verification

Environment:

- Docker stack: `nt208-ai-travel-itinerary-recommendation-system`
- services healthy: `api`, `db`, `redis`
- frontend dev server: `http://localhost:5173`
- backend API: `http://localhost:8000`

UAT state used:

- trip: `780`
- session: `265`
- owner user created via real auth API

### Apply

Seeded pending assistant proposal:

- assistant message `81`
- operation: add `Phở Thìn Bờ Hồ` to day `3`

Browser/API/DB result:

- browser clicked `Xác nhận áp dụng`
- API returned `200`
- `assistantMessage.confirmationStatus = "applied"`
- new activity persisted as `activities.id = 842`
- system message inserted as `82`

### Cancel

Seeded pending assistant proposal:

- assistant message `83`
- operation: add `Bún chả Hàng Quạt` to day `1`

Browser/API/DB result:

- browser clicked `Bỏ qua đề xuất`
- API returned `200`
- `assistantMessage.confirmationStatus = "cancelled"`
- system message inserted as `84`
- no new activity was created for day `1`

### Stale

Seeded pending assistant proposal:

- assistant message `85`
- operation: add `Cà phê Giảng` to day `1`

Conflict trigger:

- real `PUT /api/v1/itineraries/780` changed `tripName`
- this bumped `trips.updated_at`

Browser/API/DB result:

- browser clicked `Xác nhận áp dụng`
- API returned `409`
- browser reload showed stale status text (`Đã lỗi thời`)
- SQL confirmed:
  - `assistantMessage.confirmationStatus = "stale"`
  - `resolved_at != null`
- no extra activity was created for day `1`

### Real AI smoke

Real chat message sent after patch-confirm verification:

- `POST /api/v1/itineraries/chat-sessions/265/messages`
- status `201`
- assistant message `99`
- returned a real summary of the current itinerary and food stops

## SQL evidence snapshot

Assistant proposal rows:

- `81 -> applied`
- `83 -> cancelled`
- `85 -> stale`

Trip `780` persisted state:

- `trip_name = "C3C Apply Patch UAT [stale-check]"`
- `total_cost = 170000`
- day `2`: `Highlands Coffee Hoan Kiem`
- day `3`: `Phở Thìn Bờ Hồ`
- day `1`: still no activity

## Artifacts

Local screenshots saved under `.codex-run-logs/`:

- `00101-before-browser-apply.png`
- `00101-after-browser-apply.png`
- `00101-before-browser-cancel.png`
- `00101-after-browser-cancel.png`
- `00101-after-browser-stale-fixed.png`

## Test summary

Backend:

- `uv run ruff check src tests`
- `uv run pytest tests/unit -v --tb=short` -> `161 passed, 1 warning`
- `CI=true uv run pytest tests/integration -v --tb=short` -> `76 passed`

Frontend:

- `npm run build -- --outDir .build-tmp\\verify-00101-c3c-3` -> pass

Browser/runtime:

- browser automation via direct Playwright script on running Vite server
- real FE -> BE -> DB -> Redis verification for patch-confirm flows

## Merge-readiness view

This branch is not waiting on `apply-patch` existence anymore.

If CI passes after docs sync, the remaining blockers are no longer core C3C functionality. They are:

- ops wiring
- patch rate limiting
- sparse-city data quality
- broader UX polish
