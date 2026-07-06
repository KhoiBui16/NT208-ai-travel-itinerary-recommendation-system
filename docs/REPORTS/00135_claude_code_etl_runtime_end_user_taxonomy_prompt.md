You are working directly inside the current repository:
`NT208-ai-travel-itinerary-recommendation-system`

Do NOT create another worktree.
Do NOT clone another repo.
Do NOT switch sang local copy khác.
Do NOT tạo Docker stack mới hay DB/Redis volume mới.

You must work inside the current repo only.

## Goal

Continue from updated `main` and perform a focused **runtime + ETL/data + end-user flow audit/fix pass** for the current deployed and local system.

This pass is not docs-first. It is runtime-first and data-first.

You must verify and, if needed, fix:

1. ETL / destination taxonomy truth
2. end-user flows actually used in browser
3. AI generate / workspace / accommodation / chat / cost behavior
4. image/data fallback leakage
5. whether `Vịnh Hạ Long` should stay a separate destination or become a place under `Hạ Long`

Do not assume previous reports are correct. Re-verify source + DB + runtime.

## Hard Scope Boundary

Do NOT start:

- SSE / WebSocket / streaming
- Text-to-SQL / analytics write-back
- broad backend OOP refactor
- broad frontend redesign
- fake data just to hide bugs
- broad docs sync before runtime/data issues are stabilized

AI in this pass must stay inside current contract:

- generate itinerary
- companion chat
- explicit propose/confirm/apply flow

Do not expand AI into arbitrary DB mutation.

## Core Principle

Do not trust:

- old screenshots
- old reports
- docs over runtime
- user hypothesis without verification

You must verify with:

- current source code
- current local runtime
- current deployed runtime
- current DB data
- real browser evidence
- API payloads

before concluding anything.

## Latest Audit Findings To Re-Verify Before Fixing

The latest sub-agent audit reported the following current findings. Treat them as strong starting evidence, not as final truth. Re-verify each item against current `main`, current DB, and runtime before patching.

### F1 — Hạ Long / Vịnh Hạ Long taxonomy

Starting finding:

- `Hạ Long` and `Vịnh Hạ Long` are currently modeled as peer destinations.
- Source candidates reported:
  - `Backend/src/etl/config.yaml` lists both names.
  - `Backend/src/core/config.py` also lists both names.
  - `Backend/src/etl/data/hotels.yaml` comments that `Vịnh Hạ Long` is an FE alias.
  - tests may currently lock the duplicate city list.
- DB candidates reported:
  - `ha-long` has real data and includes a place named `Vịnh Hạ Long`.
  - `vinh-ha-long` is sparse/noisy.
  - no current `trips`, `trip_days`, or `accommodations` reference the `vinh-ha-long` destination id in the audited DB.

Required action:

- Re-verify source and DB evidence.
- If still true, implement Option B: merge `vinh-ha-long` into canonical `ha-long`.
- The smallest correct fix may include config cleanup, ETL keyword cleanup, tests, and an Alembic data migration/backfill.
- Do not delete or reassign data without proving FK safety.

### F2 — AI validation status code

Starting finding:

- `Backend/src/itineraries/pipeline.py` currently surfaces itinerary validation failures as `503 SERVICE_UNAVAILABLE`.
- This is misleading because validation failures are client/business-contract failures, while provider timeout/unavailable should remain `503`.

Required action:

- Re-verify the exact exception path.
- If still true, split validation failures from provider/timeout failures.
- Expected behavior: validation failure returns `422`; provider/timeout remains `503`.
- Add or update targeted backend tests.

### F3 — Image/static asset contract

Starting finding:

- DB stores destination/hotel image paths like `/img/...`.
- FE resolves `/img/...` through API base in `Frontend/src/app/utils/placeImage.ts`.
- Backend currently does not mount static files at `/img`.
- Docker/Render currently do not serve those `/img/...` paths.
- Result: destination/hotel image paths are broken, and FE fallback hides part of the issue.

Required action:

- Re-verify current source and HTTP behavior.
- If still true, implement the chosen asset contract.
- The latest audit proposed Option B: backend-served static assets, because DB and FE already assume `/img/...`.
- If choosing Option B, verify:
  - backend mounts `/img`
  - `Backend/Dockerfile` includes static files
  - local backend returns `200` for sample `/img/...`
  - deployed Render backend returns `200` after deploy
  - FE still falls back cleanly when a specific image is absent
- Do not add fake real-world images. Use only deterministic placeholders or a documented empty-state fallback until the user provides real assets.

### F4 — Sparse cities

Starting finding:

- Sparse/empty candidates reported:
  - `Châu Đốc`
  - `Côn Đảo`
  - `Tây Ninh`
- They may be sparse because targeted ETL was cut by rate limit or because they were never crawled.

Required action:

- Re-verify current local and Render data.
- Do not silently remove cities or recrawl with Goong quota without explicit user decision.
- In the report, give a concrete recommendation:
  - crawl targeted sparse cities
  - temporarily hide/gate sparse cities
  - or keep them with degraded UX warnings

### F5 — Cost truth

Starting finding:

- `0đ` line items may be caused by sparse/zero `avg_cost` and backend defaults, not necessarily FE mapping.
- `totalCost` may exceed budget because the pipeline permits a tolerance around budget, reportedly around 20%.

Required action:

- Re-verify with current payloads and browser UI.
- Separate:
  - expected `nature = 0`
  - missing cost data
  - backend cost inference
  - FE cost calculation/rendering
  - AI output validation
- If the product should not exceed budget, change backend policy and tests rather than only changing UI copy.

## Non-Negotiable Constraints

- Use Windows PowerShell only.
- Always anchor commands from repo root.
- Read `.claude`, agents, context, and skills before acting.
- Use focused sub-agents with narrow scopes.
- Use existing local Docker DB/Redis only.
- Do not log secrets from `.env`, dashboards, screenshots, or runtime config.
- Do not paste tokens/keys into reports, commits, PR bodies, or screenshots.
- Do not use `git add .`.
- If code changes are needed, branch from updated `main`, commit, push, open PR, and wait CI.
- If the blocker is ETL/data contamination or sparse data, say so directly.

## Read First

Read these first and actually use them:

1. `CLAUDE.md`
2. `AGENTS.md`
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
13. `.claude/skills/db-migration/SKILL.md` only if schema/migration/backfill is needed
14. `.claude/agents/product-flow-reviewer.md`
15. `.claude/agents/security-auditor.md`
16. latest active reports around `00133`, `00134`
17. current CSV inventories:
   - `docs/REPORTS/00134_destination_place_inventory.csv`
   - `docs/REPORTS/00134_destination_hotel_inventory.csv`

Before implementation, explicitly state which local skills you are using and why.

Minimum expected:

- `caveman`
- `fullstack-browser-debug`
- `goong-etl-readiness-review`
- `code-review`
- `git-pr-workflow`

## Step 0: Refresh Main And Confirm Safe Base

Run:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
git fetch origin main
git checkout main
git pull origin main
git status --short --branch
git branch --show-current
git log --oneline --decorate -n 10
```

Report:

- current branch
- HEAD commit
- whether local `main` matches `origin/main`
- tracked dirty files
- untracked local files
- whether you are safe to branch from this `main`

If tracked product files are dirty, stop and report before editing.

## Step 1: Exhaustive File Discovery

Do not rely only on obvious files.

Run and keep the output for yourself:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
New-Item -ItemType Directory -Force -Path .codex-run-logs | Out-Null
rg --files Backend Frontend .claude docs .github | Set-Content .codex-run-logs\00135_file_inventory.txt
rg -n "TripWorkspace|TripAccommodation|useAccommodation|useTripSync|useTripCost|ChatPanel|generateItinerary|estimatedCost|budget|totalCost|placeholder|mock|image|Ha Long|Hạ Long|Vịnh Hạ Long|slug|destination|place/detail|autocomplete|etl|scraped_sources|saved place|forgot password|reset password|share" Backend Frontend .claude docs | Set-Content .codex-run-logs\00135_keyword_inventory.txt
```

Do not dump giant inventories in final answer.

## Step 2: Supervisor + Narrow Fan-Out Model

Use a **Supervisor** model with narrow sub-agents.

Rules:

- hard cap: max 5 agents in one batch
- each agent: one bounded scope
- each agent: findings only
- each agent: file-path-first evidence
- if scope too large: return `too-big`

Required output schema for every sub-agent:

```text
path:line — finding — evidence — impact — recommended fix — status
```

Allowed status values:

- `ok`
- `warn`
- `bug`
- `stale`
- `missing`
- `blocked`

## Step 3: Required Sub-Agents (Batch 1)

### Sub-Agent 1: ETL / Destination Taxonomy / Hạ Long Audit

Scope:

- `Backend/src/etl/`
- `Backend/src/geo/`
- `Backend/src/places/`
- `Backend/src/destinations/`
- `Backend/src/models/`
- `Backend/alembic/`
- ETL tests
- SQL evidence from current DB
- current inventories in `docs/REPORTS/00134_*.csv`

Tasks:

- verify current destination list actually stored in DB
- verify place counts per destination
- verify sparse / zero-data destinations
- verify contamination for representative cities
- verify whether `Vịnh Hạ Long` is modeled as:
  - a separate destination
  - or should be a place under `Hạ Long`
- do not assume the user is right; verify by source, DB rows, UI implications, ETL inputs, and slug semantics
- if taxonomy is wrong, determine smallest correct fix:
  - canonical slug merge
  - alias mapping
  - ETL keyword change
  - destination backfill / migration
- verify impact on:
  - FE city picker
  - trip generation destination names
  - URLs / slugs
  - docs / inventories

Required DB evidence:

- destination table rows for `ha-long`, `vinh-ha-long`, or equivalent
- places belonging to each
- hotels belonging to each
- source/provider tags

### Sub-Agent 2: End-User Browser Flow Audit

Scope:

- local FE + local BE
- deployed FE + deployed BE
- actual browser flows
- route protection
- auth state
- trip create/generate flows
- workspace flows

Seed files:

- `Frontend/src/app/routes.tsx`
- `Frontend/src/app/pages/Home.tsx`
- `Frontend/src/app/pages/CreateTrip.tsx`
- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/pages/DailyItinerary.tsx`
- `Frontend/src/app/pages/Login.tsx`
- `Frontend/src/app/pages/Register.tsx`
- `Frontend/src/app/pages/ForgotPassword.tsx`
- `Frontend/src/app/pages/ResetPassword.tsx`

Tasks:

- test as logged out user
- test as logged in user
- verify protected route behavior
- verify AI generate flow
- verify manual trip flow
- verify `TripWorkspace`
- verify `Nơi ở` tab
- verify `Thay đổi thiết lập`
- verify chat session creation and messaging
- verify share flow behavior and whether it is surfaced in the right page/context
- verify real end-user error messages for:
  - login
  - register
  - forgot password
  - reset password
- classify each issue as:
  - runtime bug
  - UX debt
  - data issue
  - deploy/env mismatch

### Sub-Agent 3: AI Generate / Cost / Runtime Contract Audit

Scope:

- `Backend/src/itineraries/`
- `Backend/src/agent/`
- `Frontend/src/app/hooks/useTripCost.ts`
- `Frontend/src/app/hooks/trips/useTripSync.ts`
- `Frontend/src/app/utils/tripResponseMapper.ts`
- `Frontend/src/app/components/TripTimeline.tsx`
- `Frontend/src/app/components/ChatPanel.tsx`
- related tests

Tasks:

- verify AI generate succeeds reliably or not
- verify current root cause of intermittent `503 AI itinerary generation failed validation`
- verify why some trips exceed budget
- verify why some activities show `0đ` in some cases
- separate:
  - BE payload issue
  - FE mapping issue
  - FE rendering issue
  - sparse metadata issue
  - AI output validation issue
- verify current companion chat remains proposal-first and does not silently persist
- verify whether confirm/apply state is reflected correctly in FE

### Sub-Agent 4: Image / Placeholder / Asset Mapping Audit

Scope:

- `Frontend/src/app/utils/placeImage.ts`
- any image fallback components
- `Frontend/public/`
- `Frontend/src/assets/`
- `Frontend/vite.config.*`
- `Backend` static/image serving if present
- `Backend/Dockerfile`
- `render.yaml`
- `vercel.json` if present
- inventories in `docs/REPORTS/00134_*.csv`
- current browser network evidence

Tasks:

- verify which images come from DB
- verify which images are empty
- verify which images point to `/img/...`
- verify whether backend actually serves those paths
- distinguish:
  - DB image empty
  - DB image path invalid
  - FE fallback expected
  - stale mock leakage
- produce a clean inventory the user can use later to map real images into `assets/`
- decide the correct asset contract for this repo:
  - whether DB image fields should point to Vercel-served frontend public assets
  - whether DB image fields should point to Render-served backend static assets
  - whether external HTTPS image URLs are acceptable
  - which fallback placeholder path is canonical
- explicitly explain why `Frontend/src/assets` is or is not safe for DB-stored image paths under Vite
- verify local and deployed HTTP status for sample image paths:
  - placeholder image
  - destination image
  - hotel image
  - place image if present
- do not add fake images in this pass

### Sub-Agent 5: Docs / Runtime Drift Audit

Scope:

- active docs only:
  - `README.md`
  - `Backend/README.md`
  - `Frontend/README.md`
  - `docs/`
  - `.claude/context/`
  - `CLAUDE.md`
- compare only against current runtime truth found by agents 1–4

Tasks:

- detect active docs that would mislead the next data/runtime fix
- detect stale claims about:
  - deployed domain
  - generate/chat/workspace behavior
  - ETL/data coverage
  - image/path assumptions
  - destination taxonomy
- do not drift into full docs-sync rewrite
- only identify active drift that blocks correct engineering decisions

## Step 4: Optional Batch 2

Only if Batch 1 proves needed.

### Sub-Agent 6: DB Inventory Export Refresh

Scope:

- current local Docker DB actually used by app

Tasks:

- refresh destination/place/hotel inventory CSVs
- include slugs, names, image, source, location, rating, review_count
- explicitly flag `sparse`, `empty-image`, `invalid-path`, `contaminated`

### Sub-Agent 7: Security / Auth Truth Check

Scope:

- auth reset flow
- token storage
- guest/owner boundaries
- share/claim boundaries

Tasks:

- verify current behavior is truthful and safe
- verify error wording does not lie
- verify no accidental public mutation path exists

## Step 5: Required Local Runtime Verification

Use only existing stack.

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
docker compose up -d db redis api
docker compose ps
```

If backend is not healthy via Docker API on `8000`, run local backend explicitly:

```powershell
Set-Location "$ROOT\Backend"
uv run alembic upgrade head
$env:AGENT_TIMEOUT_SECONDS="120"
uv run uvicorn src.main:app --host localhost --port 8020
```

Frontend:

```powershell
Set-Location "$ROOT\Frontend"
$env:VITE_API_URL="http://127.0.0.1:8000"
npm run dev -- --host localhost --port 5173
```

If backend must use `8020`, then set FE accordingly and report it clearly.

Required local flows:

- Home as guest
- Login/Register
- Create trip by AI
- Manual trip
- TripWorkspace
- `Nơi ở` -> `Thay đổi thiết lập`
- AI Chat
- one city known to work
- one city known to be problematic

## Step 6: Required Deployed Runtime Verification

Deployed FE:

- `https://nt-208-ai-travel-itinerary-recommen.vercel.app`

Deployed BE:

- `https://dulichviet-api.onrender.com`

Required deployed checks:

- home
- city list
- auth behavior
- AI generate
- workspace
- chat
- accommodation tab if reachable
- at least one problematic city

Required API checks:

```text
GET https://dulichviet-api.onrender.com/api/v1/health
GET https://dulichviet-api.onrender.com/api/v1/places/destinations
GET representative destination detail endpoints
```

If deployed and local differ, classify clearly:

- code issue
- data mismatch
- deploy mismatch
- env mismatch
- cold start only

## Step 7: Required DB / SQL Evidence

Run bounded SQL checks against current local DB.

At minimum:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker compose exec -T db psql -U postgres -d dulichviet -c "select slug, name from destinations order by name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, d.name, count(p.id) as places_count from destinations d left join places p on p.destination_id=d.id group by d.id order by d.name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select d.slug, d.name, count(h.id) as hotels_count from destinations d left join hotels h on h.destination_id=d.id group by d.id order by d.name;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select p.source, count(*) from places p group by p.source order by p.source;"
docker compose exec -T db psql -U postgres -d dulichviet -c "select ss.source_name, count(*) from scraped_sources ss group by ss.source_name order by ss.source_name;"
```

Add targeted SQL for:

- `ha-long`
- `vinh-ha-long`
- `vung-tau`
- sparse cities
- image fields
- contamination patterns

## Step 8: Required Output Files

Create or update only what the evidence justifies.

Minimum expected:

1. `docs/REPORTS/00135_runtime_etl_end_user_audit_report.md`
2. `docs/REPORTS/00135_destination_place_inventory.csv` if refreshed
3. `docs/REPORTS/00135_destination_hotel_inventory.csv` if refreshed
4. fresh evidence folder:
   - `docs/REPORTS/EVIDENCE/00135_runtime_etl_end_user_audit/`

Evidence should include:

- fresh screenshots
- concise console/network captures
- API payload samples
- local vs deployed comparison for at least one key issue

Do not recycle old screenshots as if they are new.

## Step 9: Asset Storage / DB Image Contract Decision

This is a special required decision.

The user wants to collect real images later and put them into an asset folder, then update DB/image paths so the UI no longer shows broken images or stale mock placeholders.

You must decide and document the correct contract before writing any code:

### Option A: Frontend-served assets

Use this if the browser should load images from Vercel static files.

Expected shape:

- files live under `Frontend/public/...`
- DB stores stable public paths such as `/images/destinations/ha-noi.jpg`, not `src/assets/...`
- Vite/Vercel serves the files directly from the production FE domain
- FE fallback uses stable public paths such as `/images/placeholders/place.jpg`
- Render/backend does not need to serve those images

You must verify:

- local `http://localhost:5173/<path>` returns `200`
- deployed `https://nt-208-ai-travel-itinerary-recommen.vercel.app/<path>` returns `200`
- browser console has no image path errors

### Option B: Backend-served assets

Use this if API/image paths should come from Render backend.

Expected shape:

- files live under a backend static folder, for example `Backend/static/...`
- FastAPI mounts a static route such as `/img`
- `Backend/Dockerfile` copies the static files into the image
- Render service serves `https://dulichviet-api.onrender.com/img/...`
- DB stores backend-served paths only if FE resolves them correctly to the backend origin

You must verify:

- local backend returns `200` for sample image paths
- deployed Render backend returns `200` for sample image paths
- Docker image includes the static files

### Option C: External HTTPS assets

Use this only if the project intentionally stores external image URLs.

You must verify:

- URLs are stable
- CORS/ORB/browser loading works
- no `example.com` placeholder remains in production data

### Required conclusion

Pick exactly one canonical contract for this project and explain:

- where the user should place real image files
- what DB `image` values should look like
- how Docker/Render/Vercel will serve them
- how placeholders work when an image is missing
- whether a migration, SQL backfill, ETL update, or FE mapping update is needed
- how the user can later add more images without changing code

Do not store raw binary images inside Postgres.
Do not store `Frontend/src/assets/...` as DB image paths unless source proves the app has a stable import mapping layer.
Do not silently rewrite missing real images to random mock photos.

## Step 10: Hạ Long / Vịnh Hạ Long Decision Rule

This is a special required decision.

You must explicitly conclude one of these:

### Option A
`Vịnh Hạ Long` should remain a separate destination

Only choose this if source/data/product behavior prove it is intentionally modeled as a top-level trip destination.

### Option B
`Vịnh Hạ Long` should become a place or subgroup under `Hạ Long`

Only choose this if source/data/product behavior prove the current split is causing ETL duplication, sparse-city problems, or incorrect city taxonomy.

For whichever option you choose, provide:

- exact evidence
- impact on ETL
- impact on FE destination picker
- impact on existing trips/slugs
- whether code/data migration is needed

Do not treat the user preference as automatic truth. Verify it first.

## Step 11: Vercel / Render Runtime Verification Matrix

You must check both server/platform sides clearly.

### Vercel frontend

Verify:

- current production deployment commit
- project root directory is `Frontend`
- `VITE_API_URL` points to `https://dulichviet-api.onrender.com`
- frontend public assets are included in the built output if Option A is chosen
- SPA routes still work after refresh
- image paths used by FE return `200` or fall back cleanly

### Render backend

Verify:

- current backend deployment commit
- service health endpoint returns `200`
- `DATABASE_URL` uses asyncpg-compatible scheme
- `REDIS_URL` points to Render Key Value/Valkey and app behavior is stable
- `CORS_ORIGINS` includes the authoritative Vercel production domain
- backend static serving returns `200` if Option B is chosen
- API payload image fields match the chosen asset contract

### Docker/local

Verify:

- local Docker DB/Redis/API are healthy
- local FE uses the same image contract as deployed FE
- if backend static serving is chosen, Docker image/container can serve the same static files

Do not conflate:

- Vercel static asset issue
- Render backend static issue
- DB image field issue
- FE fallback issue

## Step 12: Fix Priority If Changes Are Needed

Fix in this order:

1. destination taxonomy/data modeling blockers
2. runtime AI generate / validation / budget / cost blockers
3. `TripWorkspace` / `Nơi ở` / `Thay đổi thiết lập`
4. image serving/path/fallback blockers
5. auth UX truthfulness blockers
6. docs drift only if needed to avoid wrong future work

Do not start UI polish before runtime/data blockers are stabilized.

Execution guidance:

- F1, F2, and F3 may be implemented in this pass if re-verification confirms the findings.
- Keep the fix branch reviewable. If the combined diff becomes large, split into separate PRs:
  - taxonomy/data migration
  - AI status-code/cost validation
  - static image contract
- F4 must not be implemented without explicit user input if the action is:
  - spending Goong quota
  - removing cities from config
  - hiding cities from FE
  - changing production data policy
- If F4 remains undecided, document it as a data/deploy follow-up with exact commands and risks.

## Step 13: If Code Fixes Are Needed

Before branching, inspect:

- `docs/09_execution_tracker.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/`

Create one focused fix branch from updated `main`.

Use repo naming policy.

Commit format:

```text
fix: [#00135] <short description>
```

Do not use `git add .`.
Stage only targeted files.

## Step 14: Required Verification Before Commit

At minimum:

```powershell
$ROOT = git rev-parse --show-toplevel

Set-Location "$ROOT\Backend"
uv run ruff check src tests

Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\00135-runtime
```

Plus:

- real local browser verification
- real deployed browser verification
- if backend logic changed: targeted pytest for touched modules

Do not claim pass if you did not execute the flow.

## Step 15: Code Review / PR / CI

Before PR:

- run local review with `code-review` skill
- confirm no secret exposure
- confirm no broad docs sync creep
- confirm evidence is fresh

If changes are made:

- push branch
- open PR with repo template
- wait required CI checks
- report exact CI state

## Required Final Report

Return in Vietnamese and include:

1. `Branch/base đang dùng`
2. `Skills và agents đã dùng`
3. `Sub-agent đã tạo và kết quả`
4. `Current authoritative FE domain`
5. `Current authoritative BE domain`
6. `ETL/data current truth`
7. `Kết luận riêng cho Hạ Long / Vịnh Hạ Long`
8. `Cities nào sparse / contaminated / image rỗng`
9. `End-user flows nào pass / fail / degraded`
10. `AI generate / workspace / chat / cost hiện ra sao`
11. `0đ estimated cost là do đâu`
12. `Budget overshoot là do đâu`
13. `Nơi ở / Thay đổi thiết lập hiện ra sao`
14. `Auth UX / reset-password truth hiện ra sao`
15. `Image path / fallback / mock leakage hiện ra sao`
16. `Asset contract đề xuất: lưu file ở đâu, DB lưu path gì`
17. `Vercel asset/runtime verification`
18. `Render asset/API/runtime verification`
19. `Docker/local asset/runtime verification`
20. `Data inventory file đã tạo hoặc refresh`
21. `Fix nào đã làm`
22. `Fix nào chưa làm và vì sao`
23. `Verify local`
24. `Verify deployed`
25. `PR/CI status nếu có`
26. `Có sẵn sàng merge + redeploy chưa`
27. `Bước tiếp theo đúng nhất`

Do not hide failures.
Do not present assumptions as facts.
Do not claim “đã ổn” without browser/runtime proof.
Do not conflate data problems with deploy problems.
