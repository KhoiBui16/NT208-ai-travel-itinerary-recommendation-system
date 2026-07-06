You are working directly inside the current repository:
`NT208-ai-travel-itinerary-recommendation-system`

Do NOT create another worktree.
Do NOT clone another repo.
Do NOT switch sang local copy khác.
Do NOT tạo Docker stack mới hay DB/Redis volume mới.

You must work inside the current repo only.

## Goal

Audit and fix the **real runtime issues that end-users are hitting right now** on updated `main`, with emphasis on:

1. live deployed FE/BE connectivity
2. TripWorkspace runtime and accommodation flow
3. auth UX and reset-password truthfulness
4. AI generate / chat / cost consistency
5. data/image fallback leakage and asset inventory
6. responsive / scrollbar / UI/UX issues proven by real browser evidence

This is a **runtime + UX + data** pass, not a docs-sync pass.

If docs are stale, use that only as context. Do **not** drift into broad docs cleanup in this task.

## Hard Scope Boundary

Do NOT start:

- SSE / WebSocket / streaming
- Text-to-SQL / analytics writer flow
- broad backend OOP refactor
- broad frontend redesign without proof from runtime evidence
- fake data added just to hide bugs
- mass docs sync before runtime issues are fixed

AI in this pass must stay inside current contract:

- generate itinerary
- companion chat
- proposed patch + explicit confirm/apply flow

Do not expand AI to mutate arbitrary DB state.

## Core Principle

Do not trust old screenshots.
Do not trust old reports.
Do not trust docs over runtime.

You must verify:

- source code
- local runtime
- deployed runtime
- API payloads
- browser console/network
- current DB data

before concluding root cause.

## Non-Negotiable Constraints

- Use Windows PowerShell only.
- Always anchor commands from repo root.
- Read `.claude` context, agents, and skills before acting.
- Use focused sub-agents with narrow scope and exact output schema.
- Do not log secrets from `.env`, dashboard screenshots, or runtime config.
- Do not paste tokens/keys into reports, commits, PR bodies, or screenshots.
- Do not use `git add .`.
- If code changes are needed, branch from updated `main`, commit, push, open PR, and wait CI.
- If the blocker is data contamination or sparse ETL data, say so directly. Do not hide it behind UI patches.

## Use Existing Repo Memory First

Read these first:

1. `CLAUDE.md`
2. `.claude/AGENTS.md`
3. `.claude/context/00_project_overview.md`
4. `.claude/context/05_ai_services.md`
5. `.claude/context/06_ops_workflow_ci.md`
6. `.claude/skills/caveman/SKILL.md`
7. `.claude/skills/fullstack-browser-debug/SKILL.md`
8. `.claude/skills/code-review/SKILL.md`
9. `.claude/skills/git-pr-workflow/SKILL.md`
10. `.claude/skills/goong-etl-readiness-review/SKILL.md`
11. `.claude/agents/frontend-e2e-ux-tester.md`
12. `.claude/agents/product-flow-reviewer.md`
13. `docs/08_testing_local_run.md`
14. `docs/09_execution_tracker.md`
15. `docs/STAGING_DEPLOYMENT_GUIDE.md`
16. latest runtime reports around `00130`, `00131`, `00132`, `00133`

State clearly which local skills you are using and why.

Minimum expected:

- `caveman`
- `fullstack-browser-debug`
- `code-review`
- `git-pr-workflow`
- `goong-etl-readiness-review`

## External UI/UX Skill Research You Must Use As Audit Rubric

Before judging FE UI/UX, read these sources and use them as audit rubrics, not as blind rewrite instructions:

1. `https://github.com/bergside/awesome-design-skills`
   - understand `SKILL.md` + `DESIGN.md` split
2. `https://github.com/voltagent/awesome-design-md`
   - understand what `DESIGN.md` is and when it belongs at repo root
3. `https://github.com/nextlevelbuilder/ui-ux-pro-max-skill`
   - use for structured UI/UX review dimensions
4. `https://www.tasteskill.dev/`
   - use for “anti-generic UI” polish heuristics only after runtime issues are proven
5. `https://www.ui-skills.com/skills/addyosmani/frontend-ui-engineering/`
   - component architecture / responsive / maintainability rubric
6. `https://www.ui-skills.com/skills/addyosmani/web-quality-audit/`
   - audit across responsive behavior, accessibility, and implementation quality
7. `https://www.ui-skills.com/skills/pbakaus/impeccable/`
   - technical UI quality audit
8. `https://designmd.ai/what-is-design-md`
   - only to decide whether a future `DESIGN.md` should be created after this pass

Important:

- Do **not** install or vendor third-party skills into the repo unless explicitly justified.
- In this task, external skills are audit references.
- If you conclude the project now needs a root `DESIGN.md`, recommend it as a follow-up, not as a stealth extra in this runtime-fix pass.

## Step 0: Refresh Main And Confirm Scope

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
- whether local main matches origin/main
- tracked dirty files
- untracked local files
- whether you are safe to branch from this main

If tracked product files are dirty, stop and report before editing.

## Step 1: Exhaustive File Discovery Before Audit

You must avoid “forgotten files”.

Run discovery and keep the output for yourself:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
rg --files Backend Frontend .claude docs .github | Set-Content .codex-run-logs\\00134_file_inventory.txt
rg -n "TripWorkspace|TripAccommodation|useAccommodation|useTripSync|useTripCost|ChatPanel|PlaceSelectionModal|VITE_API_URL|ForgotPassword|ResetPassword|login|register|claim|apply-patch|proposedOperations|estimatedCost|cost|budget|image|placeholder|mock" Backend Frontend .claude docs | Set-Content .codex-run-logs\\00134_keyword_inventory.txt
```

Do not dump giant file inventories into the final answer.
Use them to avoid reading only the obvious files.

## Step 2: Required Supervisor Model

Use a **Supervisor + narrow fan-out** model.

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

### Sub-Agent 1: Live FE/BE Domain And Connectivity Truth

Scope:

- deployed frontend
- deployed backend
- FE environment wiring
- BE CORS wiring
- Vercel production domain truth
- Render backend truth

Must verify:

- current authoritative production FE domain
- current authoritative backend domain
- which FE bundle is live
- whether `VITE_API_URL` on deployed FE points to Render
- whether BE `CORS_ORIGINS` matches the actual FE production domain
- whether FE failures are from domain mismatch, stale deploy, CORS, bad API URL, or backend payloads

Absolute URLs to test:

- `https://nt-208-ai-travel-itinerary-recommen.vercel.app`
- `https://dulichviet-api.onrender.com`

Do not assume any other Vercel domain is valid unless runtime confirms it.

### Sub-Agent 2: TripWorkspace Runtime / Accommodation / Session Sync

Scope seed files:

- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/components/TripAccommodation.tsx`
- `Frontend/src/app/hooks/trips/useAccommodation.ts`
- `Frontend/src/app/hooks/trips/useTripSync.ts`
- `Frontend/src/app/hooks/useTripCost.ts`
- `Frontend/src/app/utils/tripResponseMapper.ts`
- `Frontend/tests/e2e/00133-tripworkspace-accommodation-runtime.spec.ts`

Tasks:

- verify `Nơi ở` tab runtime
- verify `Thay đổi thiết lập` button behavior
- verify save success -> authoritative API response -> FE state -> session restore
- verify no stale local/session cache wins over server truth
- verify generated trips and manual trips both behave correctly
- verify auth session mismatch inside workspace/chat if present

### Sub-Agent 3: Auth UX / Reset Truth / Error Specificity

Scope seed files:

- `Frontend/src/app/pages/Login.tsx`
- `Frontend/src/app/pages/Register.tsx`
- `Frontend/src/app/pages/ForgotPassword.tsx`
- `Frontend/src/app/pages/ResetPassword.tsx`
- `Frontend/src/app/contexts/AuthContext.tsx`
- `Frontend/src/app/utils/authErrorHandler.ts`
- `Frontend/src/app/utils/errorHandler.ts`
- `Backend/src/auth/`
- `Frontend/tests/e2e/auth.spec.ts`

Tasks:

- verify real login failure messages
- verify register failure messages
- verify whether “forgot password” is truthful or intentionally privacy-preserving
- verify reset-password email flow is real vs placeholder
- verify network error vs credential error vs validation error distinction
- verify auth failure does not break unrelated images/layout

### Sub-Agent 4: AI Generate / Chat / Cost Consistency

Scope seed files:

- `Backend/src/itineraries/pipeline.py`
- `Backend/src/itineraries/companion_service.py`
- `Backend/src/itineraries/service.py`
- `Backend/src/itineraries/router.py`
- `Backend/src/agent/`
- `Frontend/src/app/hooks/useTripCost.ts`
- `Frontend/src/app/components/ChatPanel.tsx`
- `Frontend/src/app/components/TripTimeline.tsx`
- `Frontend/src/app/utils/tripSummary.ts`
- `Backend/tests/unit/test_itinerary_pipeline.py`
- `Backend/tests/unit/test_companion_service.py`

Tasks:

- verify AI generate still works on current main
- verify cause of `0đ` estimated cost on activities
- verify why total budget can exceed while visible line items look small
- verify whether issue is BE cost inference, FE mapping, sparse place metadata, or AI output normalization
- verify chat confirm/apply behavior
- verify whether AI is only proposing and not persisting until confirm
- verify why some user actions feel like reload instead of applied change

### Sub-Agent 5: UI/UX / Responsive / Scrollbar / Visual Evidence Audit

Scope:

- actual runtime pages in browser
- responsive behavior
- scrollbar overflow
- modal sizing
- navigation clarity
- notification clarity

Seed files:

- `Frontend/src/app/pages/Home.tsx`
- `Frontend/src/app/pages/DailyItinerary.tsx`
- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/components/Header.tsx`
- `Frontend/src/app/components/PlaceSelectionModal.tsx`
- `Frontend/src/app/components/TripTimeline.tsx`
- `Frontend/src/styles/`
- all directly related components discovered from imports

Tasks:

- capture **new** screenshots, do not rely on repo-old evidence
- verify extra scrollbars / overflow / clipped modal behavior
- verify date ordering in itinerary UI
- verify notification clarity and error specificity
- verify image breakage / placeholder leakage in real pages
- classify each issue as runtime bug, UX debt, data issue, or aesthetic improvement

Use external design skill sources above only as audit rubric.

## Step 4: Optional Batch 2 Sub-Agents

Only if Batch 1 proves needed:

### Sub-Agent 6: DB Inventory / Image Mapping / Sparse Cities

Scope:

- local Docker Postgres actually used by the app
- deployed backend API payloads
- ETL tables and destination/place/hotel data

Tasks:

- extract all destinations
- extract places per destination
- extract hotels per destination if present
- identify sparse cities
- identify zero-data cities
- identify contaminated cities
- identify broken/missing image fields
- prepare usable inventory for user to map real images later

### Sub-Agent 7: FE Mock Leakage / Placeholder Path Audit

Scope:

- `Frontend/src/app/data/`
- `Frontend/src/app/utils/placeImage.ts`
- image fallback components
- any hardcoded asset path discovered transitively

Tasks:

- find every remaining mock data entry that can still leak into runtime
- distinguish intentional placeholder from stale mock fallback
- identify wrong asset path vs missing DB image vs missing FE mapping

## Step 5: Local Runtime Verification

Use the existing local stack only.

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT
New-Item -ItemType Directory -Force -Path .codex-run-logs | Out-Null
docker compose up -d db redis
docker compose ps
```

Backend:

```powershell
Set-Location "$ROOT\\Backend"
uv run alembic upgrade head
$env:AGENT_TIMEOUT_SECONDS="120"
uv run uvicorn src.main:app --host localhost --port 8020
```

Frontend:

```powershell
Set-Location "$ROOT\\Frontend"
$env:VITE_API_URL="http://localhost:8020"
npm run dev -- --host localhost --port 5173
```

Required local checks:

- `http://localhost:8020/api/v1/health`
- `http://localhost:5173`
- one real trip flow in browser

If ports are polluted, use clean alternates and report them.

## Step 6: Deployed Runtime Verification

You must compare local and deployed behavior.

Required deployed checks:

- FE home loads
- FE city list loads
- FE create/generate path
- FE workspace with real tripId if accessible
- BE health
- destination list endpoint
- at least 3 city detail payloads

Minimum API checks:

```text
GET https://dulichviet-api.onrender.com/api/v1/health
GET https://dulichviet-api.onrender.com/api/v1/places/destinations
GET https://dulichviet-api.onrender.com/api/v1/places/destinations/{slug-or-name}
```

If deployed FE and deployed BE disagree with local behavior, classify it clearly:

- code regression
- stale deployment
- env mismatch
- data mismatch
- CORS mismatch
- cold start only

## Step 7: Evidence You Must Produce

Create a fresh evidence folder for this pass:

```text
docs/REPORTS/EVIDENCE/00134_live_runtime_uiux_audit/
```

Minimum expected evidence:

- full-page screenshots of key failing pages
- console/network dump or concise log capture
- API payload examples
- at least one responsive/mobile screenshot
- one screenshot proving or disproving extra scrollbar issue

Do not copy old screenshots as if they were new.

## Step 8: Data / Inventory Output

If image/data issues are confirmed, create or refresh:

1. `docs/REPORTS/00134_runtime_uiux_audit_report.md`
2. `docs/REPORTS/00134_destination_place_inventory.csv`
3. `docs/REPORTS/00134_destination_hotel_inventory.csv`

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
- `source`

The report must clearly separate:

- data exists
- data is sparse
- data is contaminated
- image field is empty
- FE path mapping is broken
- mock data still leaks

## Step 9: Fix Priority

Fix in this order:

1. deployed FE/BE domain or env mismatch
2. runtime crash / broken interaction in `TripWorkspace`
3. auth UX truthfulness / error specificity
4. `0đ` / cost inconsistency with proven root cause
5. mock or broken image fallback leakage
6. responsive / overflow / scrollbar issues that are true runtime bugs

Do not start broad UI polish before runtime blockers are stabilized.

## Step 10: If Code Fixes Are Needed

Branch from updated `main`.

Before branching, inspect:

- `docs/09_execution_tracker.md`
- `.github/PULL_REQUEST_TEMPLATE.md`
- `.github/workflows/`

Create one focused fix branch for this batch.
Keep runtime/data fixes together only if they are tightly coupled and reviewable.

Use repo naming policy.

Commit format:

```text
fix: [#00134] <short description>
```

Do not use `git add .`.
Stage only targeted files.

## Step 11: Required Verification Before Commit

At minimum:

```powershell
$ROOT = git rev-parse --show-toplevel

Set-Location "$ROOT\\Backend"
uv run ruff check src tests
uv run pytest tests\\unit\\test_itinerary_pipeline.py -q --tb=short
uv run pytest tests\\unit\\test_companion_service.py -q --tb=short

Set-Location "$ROOT\\Frontend"
npm run build -- --outDir .build-tmp\\00134-runtime
```

Plus:

- one real local browser verification
- one deployed runtime verification

Do not claim pass if you did not execute the browser flow.

## Step 12: Code Review And PR

Before PR:

- run local review with `code-review` skill
- confirm no secret exposure
- confirm no docs sync creep
- confirm evidence is fresh

If changes are made:

- push branch
- open PR with repo template
- wait required CI checks
- report exact CI state

## Required Final Report

Return in Vietnamese and include:

1. `Branch/base đang dùng`
2. `Skills local + external audit rubrics đã dùng`
3. `Sub-agent đã tạo và kết quả`
4. `Current authoritative FE domain`
5. `Current authoritative BE domain`
6. `Vercel -> Render có nối đúng không`
7. `Root cause theo từng nhóm lỗi`
8. `TripWorkspace / Nơi ở / Thay đổi thiết lập hiện ra sao`
9. `Auth UX / reset-password truth hiện ra sao`
10. `AI generate / chat / cost hiện ra sao`
11. `0đ estimated cost là do đâu`
12. `Mock image / placeholder / broken path còn leak ở đâu`
13. `Responsive / scrollbar / modal / notification issues`
14. `Data inventory file đã tạo`
15. `Cities/places/hotels còn sparse hoặc contaminated`
16. `Fix nào đã làm`
17. `Fix nào chưa làm và vì sao`
18. `Verify local`
19. `Verify deployed`
20. `PR/CI status`
21. `Có sẵn sàng merge + redeploy chưa`
22. `Có nên tạo DESIGN.md follow-up không`

Do not hide failures.
Do not claim “all good” without browser/runtime proof.
Do not conflate deploy problems with data problems.

