# Claude Code Prompt — 00136 Local Runtime, End-User Flow, Image Import Fix

You are working directly inside the current repository:

```text
NT208-ai-travel-itinerary-recommendation-system
```

Do **NOT** create another worktree.
Do **NOT** clone another repo.
Do **NOT** switch to another local copy.
Do **NOT** create a new Docker stack.
Do **NOT** create a new DB/Redis volume.
Do **NOT** run Linux destructive commands such as `rm -rf`.
Do **NOT** use destructive PowerShell deletes such as `Remove-Item -Recurse -Force` unless the user explicitly approves a precise target.

Use **Windows PowerShell only**.
Always anchor commands from repo root:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
```

## Goal

Finish task `00136` correctly:

1. Stabilize local Docker/runtime without creating unnecessary images or containers.
2. Audit current WIP from the previous Claude run.
3. Fix proven local/runtime bugs.
4. Import the user's crawled images from `asserts/images/` into the correct runtime image contract.
5. Update DB image paths only when mapping is correct.
6. Keep missing images on placeholder.
7. Re-test local end-user flows.
8. Commit a clean PR if fixes are made.
9. Sync docs only after runtime/image fixes are verified.

This is a runtime/data/image pass first. Docs sync comes last.

This prompt also supersedes the unfinished earlier local-runtime prompt. Do
not drop those requirements: auth, AI generate/cost, TripWorkspace,
accommodation, chat, share, local DB data truth, and image fallback all remain
in scope. The image import work is an addition, not a replacement.

## Current State To Assume Until Verified

Codex audit observed this state before this prompt was created:

```text
Branch: fix/00136-a-local-runtime-end-user-flow
HEAD: f33cdbc, same as origin/main at that time
Dirty:
  M Frontend/src/app/pages/TripWorkspace.tsx
  ?? Backend/alembic/versions/20260703_0011_strip_example_com_image_urls.py
  ?? asserts/images/
  ?? docs/REPORTS/00133_claude_code_runtime_data_asset_supervisor_prompt.md
  ?? docs/REPORTS/00134_claude_code_live_runtime_uiux_auth_ai_cost_prompt.md
  ?? docs/REPORTS/00135_claude_code_etl_runtime_end_user_taxonomy_prompt.md
```

Observed Docker/local runtime issue:

```text
curl http://localhost:8000/api/v1/health returned HTTP 000
docker compose ps / docker logs api / docker inspect api may timeout
DB container remained reachable
DB alembic_version was 20260703_0010
example.com image rows in places/hotels were already 0
```

Do not trust this blindly. Re-verify it first.

## Hard Scope Boundary

Do NOT implement:

- SSE / WebSocket / streaming
- Text-to-SQL / analytics write-back
- broad backend OOP refactor
- broad frontend redesign
- fake ratings/reviews/costs
- arbitrary AI database mutation
- random image assignment to hide missing data

AI behavior must remain inside the current contract:

- generate itinerary
- companion chat
- propose operation
- explicit confirm/apply only

## Read First

Read these files before making decisions:

1. `AGENTS.md`
2. `CLAUDE.md`
3. `.claude/AGENTS.md`
4. `.claude/context/00_project_overview.md`
5. `.claude/context/05_ai_services.md`
6. `.claude/context/06_ops_workflow_ci.md`
7. `.claude/skills/caveman/SKILL.md`
8. `.claude/skills/fullstack-browser-debug/SKILL.md`
9. `.claude/skills/goong-etl-readiness-review/SKILL.md`
10. `.claude/skills/code-review/SKILL.md`
11. `.claude/skills/git-pr-workflow/SKILL.md`
12. `.claude/skills/source-plan-sync-review/SKILL.md`
13. `.claude/skills/db-migration/SKILL.md` only if migration/backfill is needed
14. `.claude/agents/product-flow-reviewer.md`
15. `.claude/agents/frontend-e2e-ux-tester.md`
16. `.claude/agents/security-auditor.md`
17. `docs/REPORTS/00135_runtime_etl_end_user_audit_report.md`
18. `docker-compose.yml`
19. `Backend/Dockerfile`
20. `Backend/src/main.py`
21. `Frontend/src/app/utils/placeImage.ts`
22. `Frontend/src/app/pages/Home.tsx`
23. `Frontend/package.json`
24. `Backend/pyproject.toml`
25. `Frontend/src/app/routes.tsx`
26. `Frontend/src/app/pages/Login.tsx`
27. `Frontend/src/app/pages/Register.tsx`
28. `Frontend/src/app/pages/ForgotPassword.tsx`
29. `Frontend/src/app/pages/ResetPassword.tsx`
30. `Frontend/src/app/pages/TripWorkspace.tsx`
31. `Frontend/src/app/components/TripAccommodation.tsx`
32. `Frontend/src/app/components/ChatPanel.tsx`
33. `Backend/src/auth/`
34. `Backend/src/agent/`
35. `Backend/src/itineraries/`

State which skills are used and why.

Minimum expected:

- `caveman`
- `fullstack-browser-debug`
- `goong-etl-readiness-review`
- `code-review`
- `git-pr-workflow`
- `source-plan-sync-review` only after runtime fixes

## Non-Negotiable Docker Rules

Do **NOT** run these unless the user explicitly approves:

```powershell
docker compose up --build
docker compose build
docker build
docker compose down -v
docker system prune
docker rm
docker rmi
```

Do **NOT** run `rm -rf`.
Do **NOT** run broad `Remove-Item -Recurse`.

Allowed first-line Docker commands:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker compose config --services
docker compose up -d --no-build db redis
docker compose restart api
curl.exe -i http://localhost:8000/api/v1/health
```

If API/Docker commands hang or timeout:

1. Stop.
2. Report that local Docker/API container is wedged.
3. Tell the user to restart Docker Desktop.
4. Do not build a new image.
5. Do not continue browser testing against a broken local API.

## Important Compose Detail

Current `docker-compose.yml` bind-mounts:

```text
./Backend/src -> /app/src
./Backend/alembic -> /app/alembic
./Backend/config.yaml -> /app/config.yaml
```

It does **not** currently bind-mount:

```text
./Backend/static -> /app/static
```

Therefore, after adding new files under `Backend/static/img`, the already-running API container might not see them unless:

1. Docker image is rebuilt, or
2. backend is run locally from `Backend` using Docker DB/Redis, or
3. compose is intentionally changed to mount `./Backend/static:/app/static`.

Preferred safe approach for this pass:

- Do not rebuild first.
- Prefer running backend locally from `Backend` for image route verification if Docker API image is stale.
- If a code change is justified, consider adding a read-only static bind mount to `docker-compose.yml`:

```yaml
volumes:
  - ./Backend/src:/app/src
  - ./Backend/alembic:/app/alembic
  - ./Backend/config.yaml:/app/config.yaml
  - ./Backend/static:/app/static:ro
```

Only do this if it is clearly needed for local dev correctness.

## Step 0: Git State

Run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
git status --short --branch
git log --oneline --decorate -n 8
git diff --stat
git diff -- Frontend\src\app\pages\TripWorkspace.tsx
git ls-files --others --exclude-standard
```

If currently on a WIP branch with tracked or untracked changes, do **not**
blindly `git checkout main`. First classify the WIP. If the WIP is intended
for task `00136`, continue on the current branch. If it is unrelated or unsafe,
stop and report. Never lose WIP by switching branches.

Classify files:

```text
intended runtime fix
image source
image target
migration/data fix
prompt handoff file
unrelated/unwanted
```

Do not stage prompt handoff files unless explicitly required.

## Step 1: Exhaustive Discovery

Run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
New-Item -ItemType Directory -Force -Path .codex-run-logs | Out-Null

rg --files Backend Frontend .claude docs .github asserts | Set-Content .codex-run-logs\00136_file_inventory.txt

rg -n "TripWorkspace|TripAccommodation|useAccommodation|useTripSync|useTripCost|ChatPanel|PlaceSelectionModal|generateItinerary|estimatedCost|totalCost|budget|0đ|image|placeholder|mock|ha-long|vinh-ha-long|Hạ Long|Vịnh Hạ Long|forgot|reset|login|register|share|claim|apply-patch|proposedOperations|CORS|VITE_API_URL|REDIS_URL|DATABASE_URL|static|/img|AnhDaiDien|AnhBia" Backend Frontend .claude docs asserts docker-compose.yml render.yaml | Set-Content .codex-run-logs\00136_keyword_inventory.txt
```

Do not dump full inventories into final report.

## Step 2: Sub-Agent Model

Use Supervisor + narrow sub-agents.

Rules:

- max 5 agents per batch
- each agent has bounded scope
- each agent returns findings only
- every finding must include file/runtime evidence

Output schema:

```text
path:line — finding — evidence — impact — recommended fix — status
```

Allowed status:

```text
ok
warn
bug
stale
missing
blocked
```

### Sub-Agent 1: Docker / Local Runtime Stabilization

Scope:

- `docker-compose.yml`
- `Backend/Dockerfile`
- active Docker containers
- local API health
- local DB/Redis health

Tasks:

- identify active Compose containers vs old/orphan containers
- verify DB/Redis health
- verify API health without building a new image
- verify whether API is wedged
- if wedged, stop and recommend Docker Desktop restart
- do not rebuild/remove images/volumes

### Sub-Agent 2: WIP Code Review

Scope:

- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Backend/alembic/versions/20260703_0011_strip_example_com_image_urls.py`
- tests related to TripWorkspace and migrations

Tasks:

- decide keep/remove/modify current WIP changes
- verify if `0011` migration is necessary when DB already has zero `example.com` image rows
- verify if `TripWorkspace.tsx` tripId guard fixes a proven bug
- identify missing tests
- detect unrelated changes

### Sub-Agent 3: Image Mapping Auditor

Scope:

- `asserts/images/`
- `Backend/static/img/`
- `Backend/src/main.py`
- `Backend/Dockerfile`
- `docker-compose.yml`
- `Frontend/src/app/utils/placeImage.ts`
- `Frontend/src/app/pages/Home.tsx`
- `Frontend/src/app/data/homeData.ts`
- local DB tables:
  - `destinations`
  - `places`
  - `hotels`

Tasks:

- inventory all source images
- map city folders to destination slugs
- identify city cover images
- identify missing city covers
- identify invalid current DB image paths
- identify place/hotel image candidates
- produce mapping CSV before applying DB updates
- do not assign random images

### Sub-Agent 4: End-User Flow Audit

Scope:

- local FE/BE only after API is healthy
- guest/auth routes
- create AI trip
- manual trip
- TripWorkspace
- accommodation
- AI chat
- share
- Home destination card images
- `Frontend/src/app/routes.tsx`
- `Frontend/src/app/pages/Login.tsx`
- `Frontend/src/app/pages/Register.tsx`
- `Frontend/src/app/pages/ForgotPassword.tsx`
- `Frontend/src/app/pages/ResetPassword.tsx`
- `Frontend/src/app/contexts/AuthContext.tsx`
- `Frontend/src/app/utils/authErrorHandler.ts`
- `Backend/src/auth/`

Tasks:

- run browser flows
- capture fresh evidence
- classify bugs vs UX debt vs data issue
- verify no broken image icons
- test guest route behavior
- test invalid login
- test register
- test valid login
- test forgot password truthfulness
- test reset password route behavior
- verify error messages are specific enough but do not leak sensitive account existence
- verify login state does not desync in TripWorkspace/chat

### Sub-Agent 4B: AI Generate / Cost / TripWorkspace Contract

Use this after Sub-Agent 4 proves the local API and auth path are usable. If
five-agent fan-out is already full, run this as Batch 2.

Scope:

- `Backend/src/agent/`
- `Backend/src/itineraries/`
- `Backend/tests/unit/test_itinerary_pipeline.py`
- `Backend/tests/unit/test_companion_service.py`
- `Frontend/src/app/hooks/useTripCost.ts`
- `Frontend/src/app/hooks/trips/useTripSync.ts`
- `Frontend/src/app/hooks/trips/useAccommodation.ts`
- `Frontend/src/app/utils/tripResponseMapper.ts`
- `Frontend/src/app/components/TripTimeline.tsx`
- `Frontend/src/app/components/TripAccommodation.tsx`
- `Frontend/src/app/components/ChatPanel.tsx`
- `Frontend/src/app/components/ShareTripModal.tsx` if present

Tasks:

- run AI generate locally for at least:
  - `Hà Nội`
  - `Vũng Tàu`
  - `Hạ Long`
  - one sparse/problematic city
- identify if `503 AI itinerary generation failed validation` still happens
- identify why `totalCost` may exceed budget
- identify why any line item shows `0đ`
- classify root cause:
  - AI output
  - backend normalization
  - frontend mapper
  - sparse metadata
  - display bug
- verify TripWorkspace opens after AI generate
- verify manual trip opens
- verify accommodation tab
- verify `Thay đổi thiết lập` button
- verify save -> API response -> FE state -> session restore
- verify chat session create/send/reply
- verify confirm/apply proposal behavior
- verify share flow is only shown in correct context
- do not expand AI into arbitrary DB mutation

### Sub-Agent 5: Docs Sync Planner

Scope:

- only after runtime/image fixes are verified
- `README.md`
- `Backend/README.md`
- `Frontend/README.md`
- `docs/`
- `.claude/context/`

Tasks:

- identify active docs that must be updated
- document image contract
- document how user should add new images later
- avoid broad historical report cleanup

## Step 3: Image Source Audit

The user has added crawled images under:

```text
asserts/images/
```

This is a staging/source folder only. Do not serve it directly.

Known observed source structure:

```text
asserts/images/AnhBia.jpg
asserts/images/BuonMaThuat/AnhDaiDien.jpg
asserts/images/CanTho/AnhDaiDien.jpg
asserts/images/Dalat/AnhDaiDien.webp
asserts/images/DANANG/AnhDaiDien.webp
asserts/images/DongHoi/AnhDaiDien.jpg
asserts/images/Hagiang/AnhDaiDien.jpg
asserts/images/Haiphong/AnhDaiDien.jpg
asserts/images/HaLong/AnhDaiDien.jpg
asserts/images/Hanoi/AnhDaiDien.jpg
asserts/images/HoiAn/AnhDaiDien.jpg
asserts/images/Hue/AnhDaiDien.webp
asserts/images/MocChau/AnhDaiDien.jpg
asserts/images/NhaTrang/AnhDaiDien.webp
asserts/images/NinhBinh/AnhDaiDien.webp
asserts/images/PhanThiet/AnhDaiDien.webp
asserts/images/PhuQuoc/AnhDaiDien.jpg
asserts/images/Pleiku/AnhDaiDien.jpg
asserts/images/QuyNhon/AnhDaiDien.webp
asserts/images/Sapa/AnhDaiDien.jpg
asserts/images/TayNinh/AnhDaiDien.webp
asserts/images/TPHCM/AnhDaiDien.jpg
asserts/images/TuyHoa/AnhDaiDien.png
asserts/images/VungTau/AnhDaiDien.webp
```

`AnhDaiDien.*` is the cover image for each city and should be used on Home destination cards.

Current DB has 27 destinations. These 4 destinations may have no source folder yet and should remain placeholder:

```text
chau-doc
con-dao
mui-ne
phong-nha
```

Known DB path bug to verify/fix:

```text
ha-noi may currently use /img/destinations/ha-n-i.jpg
correct path should be /img/destinations/ha-noi.<ext>
```

## Step 4: Canonical Image Contract

Use this runtime contract:

```text
Backend/static/img/...
DB stores /img/...
FastAPI serves /img/{file_path:path}
Docker/Render include Backend/static through Backend/Dockerfile COPY static ./static
```

Do not store these in DB:

```text
asserts/images/...
Frontend/src/assets/...
C:\...
D:\...
```

Target folders:

```text
Backend/static/img/home/
Backend/static/img/destinations/
Backend/static/img/places/<destination-slug>/
Backend/static/img/hotels/<destination-slug>/
Backend/static/img/placeholder.svg
```

Target DB paths:

```text
/img/home/hero.jpg
/img/destinations/ha-noi.jpg
/img/places/ha-long/hang-sung-sot.jpg
/img/hotels/ha-long/wyndham-legend-ha-long.jpg
```

Reason:

- `Frontend/src/assets` is bundled/fingerprinted by Vite and is not a stable DB runtime path.
- `/img/...` is stable for Docker and Render.
- Missing image should fall back to `placeholder.svg`, not random external photos.

## Step 5: Folder-To-Slug Mapping

Map source folders to destination slugs exactly:

```text
BuonMaThuat  -> buon-ma-thuot
CanTho       -> can-tho
Dalat        -> da-lat
DANANG       -> da-nang
DongHoi      -> dong-hoi
Hagiang      -> ha-giang
Haiphong     -> hai-phong
HaLong       -> ha-long
Hanoi        -> ha-noi
HoiAn        -> hoi-an
Hue          -> hue
MocChau      -> moc-chau
NhaTrang     -> nha-trang
NinhBinh     -> ninh-binh
PhanThiet    -> phan-thiet
PhuQuoc      -> phu-quoc
Pleiku       -> pleiku
QuyNhon      -> quy-nhon
Sapa         -> sapa
TayNinh      -> tay-ninh
TPHCM        -> tp-ho-chi-minh
TuyHoa       -> tuy-hoa
VungTau      -> vung-tau
```

For unmapped folders or filenames, report them. Do not guess.

## Step 6: Required Mapping CSV

Before applying DB updates, create:

```text
docs/REPORTS/00136_image_import_mapping.csv
```

Columns:

```text
kind,destination_slug,destination_name,source_file,target_file,db_table,db_id,db_name,db_image_path,match_status,notes
```

`kind` allowed:

```text
home_hero
destination_cover
place_candidate
hotel_candidate
unmatched
missing_placeholder
```

`match_status` allowed:

```text
exact
normalized
manual_needed
missing_source
placeholder
```

Use relative paths only. Do not write local absolute paths into CSV/docs.

## Step 7: Copy Images

Use PowerShell copy commands. Do not use Python to copy unless PowerShell cannot handle a required encoding/path case.

Create target folders:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

New-Item -ItemType Directory -Force -Path Backend\static\img\home | Out-Null
New-Item -ItemType Directory -Force -Path Backend\static\img\destinations | Out-Null
New-Item -ItemType Directory -Force -Path Backend\static\img\places | Out-Null
New-Item -ItemType Directory -Force -Path Backend\static\img\hotels | Out-Null
```

Copy:

```text
asserts/images/AnhBia.jpg -> Backend/static/img/home/hero.jpg
asserts/images/<City>/AnhDaiDien.<ext> -> Backend/static/img/destinations/<slug>.<ext>
```

For non-cover images:

- Try normalized Vietnamese-insensitive matching against place/hotel names in the same destination.
- Only update DB image path on high-confidence match.
- Otherwise copy under a safe location only if useful, but mark as `unmatched`.
- Do not assign unmatched image to DB.

Do not stage raw `asserts/images/` unless the user explicitly wants raw crawled source images committed.

## Step 8: DB / Migration Rules

If DB image paths need persistent update, create a new idempotent Alembic migration.

Suggested file:

```text
Backend/alembic/versions/20260703_0012_import_crawled_image_paths.py
```

Rules:

- Update `destinations.image` for each mapped city cover.
- Fix `ha-noi` path.
- Leave `chau-doc`, `con-dao`, `mui-ne`, `phong-nha` on placeholder/fallback if no image exists.
- Update `places.image` and `hotels.image` only for high-confidence matches.
- Do not set random images.
- Do not set `NULL` if columns are `NOT NULL`; use existing repo convention.
- Migration must be idempotent.
- Downgrade may be no-op if this is one-way data enrichment; document why.

Before creating a new migration, inspect whether existing untracked migration `20260703_0011_strip_example_com_image_urls.py` should be kept, merged into `0012`, or removed.

Do not keep unnecessary migrations.

## Step 9: Local Runtime Stabilization

Run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker ps -a --format "table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}"
docker compose config --services
docker compose up -d --no-build db redis
docker compose restart api
curl.exe -i http://localhost:8000/api/v1/health
```

If API is healthy, continue.

If API remains HTTP `000` or Docker commands timeout:

- Stop.
- Report Docker/API wedged.
- Ask user to restart Docker Desktop.
- Do not build a new image.

## Step 10: Static Image Verification

Because compose might not mount `Backend/static`, verify carefully.

First try existing API:

```powershell
curl.exe -I http://localhost:8000/img/placeholder.svg
curl.exe -I http://localhost:8000/img/home/hero.jpg
curl.exe -I http://localhost:8000/img/destinations/ha-noi.jpg
curl.exe -I http://localhost:8000/img/destinations/ha-long.jpg
```

If files exist in repo but existing API container does not see them, do **not** rebuild immediately.

Use one of these safe approaches:

Option A, preferred for local source verification:

```powershell
Set-Location "$ROOT\Backend"
$env:DATABASE_URL="postgresql+asyncpg://postgres:postgres@localhost:5432/dulichviet"
$env:REDIS_URL="redis://localhost:6379/0"
uv run uvicorn src.main:app --host localhost --port 8020
```

Then verify:

```powershell
curl.exe -I http://localhost:8020/img/home/hero.jpg
curl.exe -I http://localhost:8020/img/destinations/ha-noi.jpg
```

If host-to-Docker DB fails on Windows, stop and report.

Option B, if approved as a code fix:

- Add `./Backend/static:/app/static:ro` to `docker-compose.yml`.
- Restart API with `docker compose restart api`.
- Do not rebuild.

Only use `docker compose up --build` after explaining why and getting approval.

## Step 11: DB Verification

Run against existing DB:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d dulichviet -c "select version_num from alembic_version;"
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d dulichviet -c "select slug,name,image from destinations order by slug;"
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d dulichviet -c "select count(*) filter (where image = '' or image is null) as empty_destination_images, count(*) as total from destinations;"
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d dulichviet -c "select count(*) filter (where image ilike '%example.com%') as example_place_images from places;"
docker exec nt208-ai-travel-itinerary-recommendation-system-db-1 psql -U postgres -d dulichviet -c "select count(*) filter (where image ilike '%example.com%') as example_hotel_images from hotels;"
```

Required checks:

- `ha-noi` must not point to `/img/destinations/ha-n-i.jpg`.
- mapped cities must point to real copied files.
- missing cities must not point to non-existent files unless placeholder fallback is verified.

Run broader local data checks from the unfinished runtime task:

```powershell
docker compose exec -T db psql -U postgres -d dulichviet -c "select slug, name from destinations order by name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, d.name, count(p.id) as places_count from destinations d left join places p on p.destination_id=d.id group by d.id order by d.name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, d.name, count(h.id) as hotels_count from destinations d left join hotels h on h.destination_id=d.id group by d.id order by d.name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select source, count(*) from places group by source order by source;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, count(*) filter (where p.image is null or p.image = '') as empty_images, count(*) as total_places from destinations d left join places p on p.destination_id = d.id group by d.slug order by d.slug;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, count(*) filter (where h.image is null or h.image = '') as empty_images, count(*) as total_hotels from destinations d left join hotels h on h.destination_id = d.id group by d.slug order by d.slug;"
```

Add targeted SQL for:

```text
ha-long
vinh-ha-long
sparse cities
image paths starting with /img/
image paths containing example.com
cost fields if stored
```

## Step 11A: Data Copy Guidance To Verify

Explain this clearly in the final report. Do not execute destructive restore
unless the user explicitly approves it.

### If testing local with current Docker DB

No import is needed. Use the existing Docker volume and inspect current data.

### If user wants local to mirror Render DB

Do not paste DB URLs into reports.

Use an environment variable for Render External Database URL:

```powershell
$env:RENDER_DATABASE_URL="postgresql://..."
```

Create a local ignored import folder:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
New-Item -ItemType Directory -Force -Path data\imports | Out-Null
```

Dump Render DB to local file:

```powershell
pg_dump $env:RENDER_DATABASE_URL --format=custom --no-owner --no-acl --file data\imports\render_snapshot.dump
```

Before restoring into Docker local DB, backup local DB:

```powershell
docker compose exec -T db pg_dump -U postgres -d dulichviet --format=custom --no-owner --no-acl > data\imports\local_before_restore.dump
```

Restore into local Docker DB only if the user approves destructive overwrite:

```powershell
docker compose exec -T db psql -U postgres -d dulichviet -c "select pg_terminate_backend(pid) from pg_stat_activity where datname='dulichviet' and pid <> pg_backend_pid();"
docker compose exec -T db dropdb -U postgres dulichviet
docker compose exec -T db createdb -U postgres dulichviet
Get-Content data\imports\render_snapshot.dump -Encoding Byte | docker compose exec -T db pg_restore -U postgres -d dulichviet --no-owner --no-acl
```

If this PowerShell binary pipe fails, stop and report. Do not improvise with
unsafe commands.

### If user wants local ETL master data copied to Render later

Do not truncate Render production tables if there are real users/trips unless
explicitly approved.

Preferred safe approach:

1. Fix schema/migrations first.
2. Backfill taxonomy and image paths with Alembic/data migration where possible.
3. For images, update only `image` fields using stable keys such as destination
   slug and high-confidence place/hotel names.
4. Avoid destructive `TRUNCATE` on Render if user data exists.

## Step 12: Frontend Local Browser Test

Only after API is healthy.

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Frontend"
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

If backend uses port `8020`, set:

```powershell
$env:VITE_API_URL="http://localhost:8020"
```

Browser flows:

1. Home loads.
2. Home destination cards show real covers for mapped cities.
3. Missing cities show placeholder cleanly.
4. No broken image icon.
5. Network panel returns 200 for real `/img/destinations/...`.
6. Protected route redirects guest to login.
7. Invalid login shows correct message.
8. Register/login works.
9. AI generate Hà Nội.
10. AI generate Hạ Long.
11. Manual trip creation.
12. TripWorkspace opens.
13. Accommodation tab works.
14. "Thay đổi thiết lập" works.
15. AI chat session works.
16. Proposed patch requires confirm/apply.
17. Share flow appears in correct context.
18. Refresh page and verify session/server state remains correct.
19. Mobile viewport sanity check.

Capture fresh evidence under:

```text
docs/REPORTS/EVIDENCE/00136_local_runtime_image_fix/
```

## Step 13: Fix Rules

Fix only proven bugs.

Priority:

1. local API/runtime blocker
2. static image serving/path blocker
3. destination cover mapping
4. `ha-noi` image path bug
5. TripWorkspace invalid `tripId` bug
6. accommodation button bug
7. AI generate validation/cost/budget bug
8. auth UX truth bug
9. share flow context bug
10. docs sync

Do not refactor broadly.
Do not redesign UI.
Do not fake data.

## Step 14: Verification Before Commit

Backend:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests\unit -q --tb=short
uv run alembic check
```

If migration changed:

```powershell
uv run alembic upgrade head
```

Frontend:

```powershell
Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\00136-images
```

Browser:

- local Home image verification
- local auth flow
- local AI generate
- local TripWorkspace
- local chat
- local accommodation

Do not claim browser pass unless executed.

## Step 15: Docs Sync After Runtime/Image Fixes

Only after runtime is verified.

Update active docs if needed:

- `README.md`
- `Backend/README.md`
- `Frontend/README.md`
- `docs/05_database_etl.md`
- `docs/08_testing_local_run.md`
- `docs/STAGING_DEPLOYMENT_GUIDE.md`
- `.claude/context/00_project_overview.md`
- `.claude/context/06_ops_workflow_ci.md`

Add/update report:

```text
docs/REPORTS/00136_local_runtime_image_fix_report.md
```

Docs/report must explain:

- image source folder `asserts/images/`
- canonical runtime folder `Backend/static/img/`
- DB path shape `/img/...`
- `AnhDaiDien.*` as city cover
- missing images use placeholder
- how to verify local `/img/...`
- how Docker/Render includes static assets
- whether `docker-compose.yml` mounts `Backend/static`
- data/image gaps remaining

Do not write local absolute paths. Use `<repo-root>`.

## Step 16: Staging And PR

Do not use `git add .`.

Usually stage only:

```text
Backend/static/img/...
Backend/alembic/versions/<new-migration>.py
Backend/tests/...
Frontend/src/app/pages/TripWorkspace.tsx
Frontend/src/app/utils/placeImage.ts
docker-compose.yml
docs/REPORTS/00136_image_import_mapping.csv
docs/REPORTS/00136_local_runtime_image_fix_report.md
docs/REPORTS/EVIDENCE/00136_local_runtime_image_fix/...
```

Do not stage:

```text
docs/REPORTS/00133_claude_code_runtime_data_asset_supervisor_prompt.md
docs/REPORTS/00134_claude_code_live_runtime_uiux_auth_ai_cost_prompt.md
docs/REPORTS/00135_claude_code_etl_runtime_end_user_taxonomy_prompt.md
raw asserts/images/ unless user explicitly approves
```

Commit message:

```text
fix: [#00136] stabilize local runtime image paths
```

Open PR using repo template and wait for CI.

## Required Final Report

Return in Vietnamese:

1. Branch/base
2. Skills used
3. Sub-agents and findings
4. Docker/API status
5. Whether any new Docker image/container was created
6. Current dirty files classified
7. Image source inventory count
8. Destination covers mapped
9. Destinations still on placeholder
10. Place/hotel images mapped
11. Unmatched images needing manual review
12. DB image paths updated
13. `ha-noi` image path fixed or not
14. Static `/img/...` HTTP verification
15. Home card browser verification
16. Auth/user flow verification
17. AI/TripWorkspace/chat verification
18. Cost/budget/0đ verdict
19. TripWorkspace/accommodation verdict
20. Chat/propose/apply verdict
21. Share flow verdict
22. Hạ Long taxonomy verdict
23. Data copy/import guidance
24. Bugs fixed
25. Bugs still blocked
26. Docs synced
27. Verification commands run
28. Browser evidence folder
29. PR/CI status
30. Whether safe to merge/redeploy

Do not hide failures.
Do not claim all good without browser/runtime proof.
Do not conflate missing image data with static serving bugs.
