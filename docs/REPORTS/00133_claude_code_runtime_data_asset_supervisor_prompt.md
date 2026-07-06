You are working directly inside the current repository:
`NT208-ai-travel-itinerary-recommendation-system`

Do NOT create another worktree.
Do NOT clone another repo.
Do NOT switch sang local copy khác.
Do NOT tạo Docker stack mới hay DB/Redis volume mới.

You must work inside the current repo only.

## Goal

Tiếp tục đúng trên branch runtime fix hiện tại hoặc branch fix mới được tạo từ `main` mới nhất nếu branch hiện tại không còn phù hợp.

Mục tiêu của pass này là xử lý dứt điểm nhóm lỗi runtime/data đang ảnh hưởng end-user thật:

1. `TripWorkspace` runtime thật:
   - tab `Nơi ở`
   - nút `Thay đổi thiết lập`
   - save/reload/session sync
   - data thật thay vì mock/stale fallback
2. AI/data/cost consistency:
   - generate itinerary không fail vô lý sau hardening cost
   - chi phí ước tính không bị mâu thuẫn hiển thị
   - phân biệt rõ lỗi do prompt/AI, lỗi do validator, lỗi do data ETL
3. Mock image / placeholder / sai đường dẫn ảnh:
   - xác định chỗ nào đang leak mock asset
   - liệt kê city/place/hotel hiện có trong DB để user tự gắn ảnh thật
4. Xuất inventory DB thật ra file trong repo:
   - danh sách thành phố
   - danh sách địa điểm theo từng thành phố
   - nếu có, danh sách hotel theo từng thành phố
5. Chỉ sau khi fix runtime/data ổn mới tính chuyện sync docs.

## Hard Scope Boundary

Do NOT start:

- SSE / WebSocket / streaming
- Text-to-SQL / AI tự ghi DB
- broad refactor OOP/by-domain lớn
- docs sync diện rộng trước khi runtime fix xong
- fake data mới để che bug

AI ở phase này chỉ được:

- generate itinerary
- chat trả lời / đề xuất
- patch chỉ theo contract hiện tại

Không mở rộng sang AI tự cập nhật DB ngoài scope đã có.

## Non-Negotiable Constraints

- Use Windows PowerShell only.
- Always anchor commands from repo root.
- Read `.claude` context + skills before acting.
- Verify bằng runtime/source thật, không dựa vào docs cũ.
- Không log secret từ `.env`.
- Không stage broad bằng `git add .`.
- Nếu sửa code, phải commit/push/PR đúng template repo.
- Nếu thấy bug do data chứ không phải UI, phải nói rõ “data blocker”, không che bằng UI patch.

## Read First

Read these first:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.claude/context/00_project_overview.md`
4. `.claude/context/05_ai_services.md`
5. `.claude/context/06_ops_workflow_ci.md`
6. `.claude/skills/fullstack-browser-debug/SKILL.md`
7. `.claude/skills/code-review/SKILL.md`
8. `.claude/skills/git-pr-workflow/SKILL.md`
9. `.claude/skills/goong-etl-readiness-review/SKILL.md`
10. `docs/08_testing_local_run.md`
11. `docs/09_execution_tracker.md`

## Skills You Must Use

- `fullstack-browser-debug`
  - local FE/BE/browser/runtime verification
- `code-review`
  - contract + compatibility check trước commit
- `git-pr-workflow`
  - branch/commit/PR naming + CI policy
- `goong-etl-readiness-review`
  - nếu phải kết luận lỗi do data ETL/Goong/inventory

State clearly which skills you are using and why.

## Step 0: Git And Branch Truth

Run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
git fetch origin main
git status --short --branch
git branch --show-current
git log --oneline --decorate -n 8
git log origin/main --oneline -n 5
```

Then decide:

- nếu đang ở branch runtime fix sạch và đúng scope -> tiếp tục trên branch đó
- nếu branch đã lệch scope hoặc base quá cũ -> tạo branch fix mới từ `origin/main`

If creating a new branch, follow repo regex exactly.

## Step 1: Required Sub-Agents

Use narrow-scope sub-agents only.
Do not ask one agent làm toàn bộ repo.

Each sub-agent must:

- inspect source + runtime evidence
- return findings only
- cite file path + line when possible
- stop

Return format:

```text
path:line — finding — evidence — impact — recommended fix
```

If scope too broad:

```text
too-big
```

### Sub-Agent 1: TripWorkspace Runtime And Accommodation

Scope seed files:

- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/components/TripAccommodation.tsx`
- `Frontend/src/app/hooks/trips/useAccommodation.ts`
- `Frontend/src/app/hooks/trips/useTripSync.ts`
- `Frontend/src/app/utils/tripResponseMapper.ts`
- `Frontend/tests/e2e/`

Also inspect any transitive imports/callers discovered from these files.

Tasks:

- verify `Nơi ở` tab runtime
- verify button `Thay đổi thiết lập`
- verify save success -> authoritative server response -> sessionStorage sync
- verify no duplicate toaster / duplicate success message
- verify hotel payload partial/missing fields does not crash UI
- verify reload behavior after save
- verify route-param `tripId` flow

### Sub-Agent 2: Places / Mock Leakage / Image Source Audit

Scope seed files:

- `Frontend/src/app/hooks/trips/usePlacesManager.ts`
- `Frontend/src/app/components/PlaceSelectionModal.tsx`
- `Frontend/src/app/components/TripTimeline.tsx`
- `Frontend/src/app/utils/tripConstants.ts`
- `Frontend/src/app/services/places.ts`
- `Frontend/src/app/types/`

Tasks:

- find all mock place/hotel/image fallbacks still leaking into runtime
- identify where placeholder image / broken path is rendered
- distinguish:
  - API empty result
  - stale client cache
  - hardcoded mock constant
  - broken asset path
- recommend the smallest safe fix

### Sub-Agent 3: Backend AI / Cost / Validation

Scope seed files:

- `Backend/src/itineraries/pipeline.py`
- `Backend/src/itineraries/`
- `Backend/src/agent/`
- `Backend/tests/unit/test_itinerary_pipeline.py`
- any cost-related schema/service/router files discovered from imports

Tasks:

- verify current budget/cost normalization path
- verify when generate should soft-accept vs hard-reject
- explain why some generated activities show `0đ`
- explain whether issue is:
  - LLM sparse payload
  - fallback normalization
  - FE mapping/render
  - DB/place metadata gap
- verify no accidental regression broke AI generate entirely

### Sub-Agent 4: Real Database Inventory / ETL Truth

Scope:

- local Docker Postgres currently used by the app
- ETL models/tables relevant to destinations/places/hotels
- `Backend/src/etl/`
- `Backend/src/places/`
- `Backend/src/destinations/`

Tasks:

- extract real destination count
- extract place list per destination
- extract hotel list per destination if table/data exists
- identify cities still sparse / zero-place
- identify whether data contamination is local and current, not only in old reports
- recommend file format for user image-mapping work

### Sub-Agent 5: Live Runtime Verification

Scope:

- local backend + frontend runtime
- deployed FE/BE only if needed for comparison

Tasks:

- verify local stack on clean ports
- reproduce critical user flow in browser:
  - open workspace
  - switch `Nơi ở`
  - edit accommodation
  - save itinerary
  - reload
- capture API status and console errors
- classify failure as FE logic / BE logic / data / deployment drift

## Step 2: Local Runtime Verification

Use existing local stack only.

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
docker compose up -d db redis
docker compose ps
```

Backend:

```powershell
Set-Location "$ROOT\\Backend"
uv run uvicorn src.main:app --host localhost --port 8020
```

Frontend:

```powershell
Set-Location "$ROOT\\Frontend"
$env:VITE_API_URL="http://localhost:8020"
npm run dev -- --host localhost --port 5173
```

Required checks:

- `http://localhost:8020/api/v1/health`
- `http://localhost:5173`
- browser flow at:
  - `/trip-workspace?tripId=<real-or-mocked-test-id>`

If Playwright runner is flaky, use direct Node + Playwright script and save evidence under `.codex-run-logs/`.

## Step 3: DB Inventory Export

You must create repo files that the user can actually use to map images later.

Minimum output files:

1. `docs/REPORTS/00133_etl_destination_place_inventory.csv`
2. `docs/REPORTS/00133_etl_destination_hotel_inventory.csv`
3. `docs/REPORTS/00133_runtime_data_inventory_report.md`

CSV minimum columns for places:

- `destination_slug`
- `destination_name`
- `place_id`
- `place_name`
- `type`
- `location`
- `image`
- `rating`
- `review_count`
- `source`

CSV minimum columns for hotels:

- `destination_slug`
- `destination_name`
- `hotel_id`
- `hotel_name`
- `location`
- `image`
- `rating`
- `review_count`

Report must summarize:

- total destinations
- total places
- total hotels
- sparse cities
- zero-data cities
- obvious contamination if found

## Step 4: Fix Policy

Fix smallest real blockers first, in this order:

1. mock/stale fallback leaking into runtime
2. TripWorkspace accommodation/runtime crash or stale save sync
3. AI cost/generate regression
4. inventory export / reporting

Do not start docs sync before these are stable.

## Step 5: Required Verification Before Commit

At minimum:

```powershell
$ROOT = git rev-parse --show-toplevel

Set-Location "$ROOT\\Backend"
uv run ruff check src tests
uv run pytest tests\\unit\\test_itinerary_pipeline.py -q --tb=short

Set-Location "$ROOT\\Frontend"
npm run build -- --outDir .build-tmp\\00133-runtime
```

Plus at least one browser/runtime verification for the exact user-reported flow.

## Step 6: Commit / PR

If code changes are made:

- stage targeted files only
- commit using repo format
- push branch
- open PR using repo template
- wait required CI checks

Commit title format:

```text
fix: [#00133] <short description>
```

## Required Final Report

Return in Vietnamese and include:

1. `Branch/base đang dùng`
2. `Sub-agent đã tạo và kết quả`
3. `Root cause chính theo từng nhóm lỗi`
4. `Fix nào đã làm`
5. `Fix nào chưa làm và vì sao`
6. `Kết quả verify local`
7. `Inventory file đã tạo`
8. `Cities/hotels/places còn sparse`
9. `Mock image / placeholder còn leak ở đâu`
10. `AI generate/cost hiện ổn chưa`
11. `PR/CI status`
12. `Có sẵn sàng để merge và redeploy chưa`

Do not hide failures.
Do not claim local pass nếu chưa chạy browser/runtime thật.
Do not claim docs synced nếu chưa làm docs pass riêng.
