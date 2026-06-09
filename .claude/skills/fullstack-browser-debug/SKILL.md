---
name: fullstack-browser-debug
description: Use when debugging or verifying real FE-BE behavior in this repo: start Docker/Postgres/Redis, run Backend and Frontend dev servers, verify Vite API base, exercise browser flows with Playwright, capture screenshots/traces/logs, classify failures from FE logic, BE API, Redis quota, DB, or external AI providers, and avoid UI/UX changes unless explicitly requested.
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(docker:*), Bash(uv:*), Bash(pytest:*), Bash(ruff:*), Bash(npm:*), Bash(node:*), Bash(curl:*), Bash(netstat:*), Bash(powershell:*), Bash(Get-NetTCPConnection:*), Bash(Get-Process:*)
---

# Fullstack Browser Debug Skill

Use this skill for real local verification of FE-BE behavior. The goal is evidence, not guesses.

## Non-Negotiables

- Do not change UI/UX while debugging. Logic-only fixes are allowed when root cause is proven.
- Do not log or print secrets: `.env`, `GOONG_API_KEY`, `GEMINI_API_KEY`, JWTs, refresh tokens.
- Do not write logs to `C:\tmp`; use `.codex-run-logs/` in repo root.
- Do not trust one screenshot alone. Pair screenshots with API status, BE logs, browser console/network, and server port state.
- If ports are polluted by stale processes, use clean alternate ports and clearly report them.

## Read First

1. `CLAUDE.md`
2. `.claude/context/00_project_overview.md`
3. Relevant phase context, often `.claude/context/05_ai_services.md` or `.claude/context/06_ops_workflow_ci.md`
4. `docs/08_testing_local_run.md`
5. Current files touched by the failing flow

## Standard Local Stack

Use PowerShell on Windows.

```powershell
docker compose up -d db redis
docker compose ps
```

Backend:

```powershell
cd Backend
uv run alembic upgrade head
$env:AGENT_TIMEOUT_SECONDS="120"   # only for AI generate smoke if needed
$env:AGENT_MIN_ACTIVITIES_PER_DAY="5"
$env:AGENT_MAX_ACTIVITIES_PER_DAY="5"
uv run uvicorn src.main:app --host localhost --port 8000
```

Frontend:

```powershell
cd Frontend
$env:VITE_API_URL="http://localhost:8000"
npm run dev -- --host localhost --port 5173
```

If `8000` is polluted, use a clean BE port such as `8020`, but keep FE on `5173` unless CORS has been adjusted.

## Start Servers As Background Helpers

When launching background servers from the agent, use hidden windows and repo-local logs:

```powershell
New-Item -ItemType Directory -Force -Path .codex-run-logs | Out-Null
Start-Process -WindowStyle Hidden -FilePath powershell.exe -WorkingDirectory Backend `
  -RedirectStandardOutput .codex-run-logs/backend.out.log `
  -RedirectStandardError .codex-run-logs/backend.err.log `
  -ArgumentList @("-NoProfile", "-Command", "uv run uvicorn src.main:app --host localhost --port 8020")
```

Use the same pattern for Vite. Escape `$env:` correctly when building a nested PowerShell command.

## Preflight Checklist

1. Branch and dirty tree:
   ```powershell
   git status --short --branch
   git log --oneline --decorate -5
   ```

2. Docker dependencies:
   ```powershell
   docker compose ps
   ```

3. Port ownership:
   ```powershell
   Get-NetTCPConnection -State Listen -ErrorAction SilentlyContinue |
     Where-Object { $_.LocalPort -in 8000,8001,8020,5173,5432,6379 } |
     Select-Object LocalAddress,LocalPort,OwningProcess
   ```

4. Backend health:
   ```powershell
   curl.exe -i http://localhost:8000/api/v1/health
   ```

5. Verify Vite API base. Fetch the served source and confirm `VITE_API_URL`:
   ```powershell
   (Invoke-WebRequest -Uri "http://localhost:5173/src/app/services/api.ts" -UseBasicParsing).Content |
     Select-String -Pattern "VITE_API_URL|localhost:8000|localhost:8000"
   ```

Vite only exposes `VITE_*` env vars to browser code and env changes require restarting the dev server.

## Browser Debug Workflow

Use Playwright for real browser behavior.

Minimum evidence per failing flow:

- full-page screenshot before action
- full-page screenshot after action or failure
- network request/response status and body for target API
- browser console errors
- current URL
- BE stdout/stderr tail around the same timestamp

Recommended shape:

```javascript
const { chromium } = require("@playwright/test");
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 920 } });
const page = await context.newPage();
page.on("response", async (response) => {
  if (response.url().includes("/api/v1/itineraries/generate")) {
    console.log(response.status(), await response.text());
  }
});
page.on("console", (message) => {
  if (message.type() === "error") console.log("console-error", message.text());
});
await page.screenshot({ path: "../.codex-run-logs/flow.png", fullPage: true });
```

For complex failures, enable Playwright traces:

```javascript
await context.tracing.start({ screenshots: true, snapshots: true });
// perform flow
await context.tracing.stop({ path: "../.codex-run-logs/trace.zip" });
```

Open traces locally:

```powershell
cd Frontend
npx playwright show-trace ..\.codex-run-logs\trace.zip
```

## AI Generate Debug Checklist

Before blaming FE:

1. Confirm FE called the expected BE URL.
2. Inspect BE status:
   - `201`: itinerary generated; next failure is likely FE navigation/render/auth.
   - `422`: missing/insufficient Goong DB context or request validation.
   - `429`: Redis AI quota exhausted.
   - `503`: Gemini timeout/provider unavailable or Redis fail-closed.
   - `500`: BE bug; inspect stack trace.
3. Inspect AI logs:
   - `ai_generate_context_loaded`
   - `ai_generate_llm_attempt_started`
   - `gemini_request_timeout`
   - `ai_generate_llm_attempt_invalid`
   - `ai_generate_llm_attempt_validated`
   - `ai_generate_completed`
4. For local-only repeated guest tests, report quota first, then clear only local AI rate keys if needed:
   ```powershell
   docker compose exec redis redis-cli --scan --pattern "rate:ai:*" |
     ForEach-Object { docker compose exec redis redis-cli DEL $_ }
   ```

## Auth And Guest Flow Checks

- Guest generate should receive `claimToken`.
- FE should store pending claim in `sessionStorage`, not localStorage.
- Route-protected workspace may redirect guest to `/login`; this is expected unless the route is made public.
- After login/register, pending claim should call `POST /api/v1/itineraries/{tripId}/claim`.
- Login redirect must preserve query string, e.g. `/trip-workspace?tripId=125`.
- Authenticated generate should navigate directly to workspace and `GET /api/v1/itineraries/{tripId}` should return 200.

## Failure Classification

Report failures using this structure:

```markdown
## Fullstack Debug Result

### Environment
- Branch:
- FE URL:
- BE URL:
- Docker services:
- Ports:

### Evidence
- Screenshots:
- API statuses:
- BE log events:
- Browser console/network:

### Root Cause
- FE logic / BE API / Redis quota / DB data / external provider / local process pollution

### Fix Scope
- Logic-only changes:
- UI/UX changes: none

### Verification
- Commands run:
- Browser flows tested:
- Remaining risk:
```

## Phase C3 Browser Flows (when implemented)

When testing C3 companion chat, verify these specific flows:

1. **Guest generate → login → claim → workspace**: Guest generates trip, receives `claimToken`, registers, claims trip, lands in workspace.
2. **Auth generate → workspace**: Authenticated user generates trip, navigates to workspace.
3. **Auth open own trip → FloatingAIChat**: Open own trip, FloatingAIChat is visible and functional.
4. **Send chat greeting → response**: Send message to companion, receive response with `requiresConfirmation`.
5. **Ask add activity → proposedOperations render**: Ask to add activity, verify `proposedOperations` display.
6. **Confirm patch → activity appears**: Click confirm, new activity appears in itinerary, DB updated.
7. **Cancel patch → DB unchanged**: Click cancel, no DB change.
8. **Refresh page → trip correct**: Refresh workspace, trip data still correct, chat context preserved.
9. **Open 2 tabs same trip → no message jump**: Two tabs same trip, messages stay in correct tab.
10. **Open 2 trips different → chat context isolated**: Chat context for Trip A stays separate from Trip B.
11. **User A trip → User B cannot access**: User B login, cannot access User A's trip/companion chat.
12. **SharedTripView → read-only**: Open shared link, companion chat is NOT visible or functional.

### C3 Non-Negotiables for Browser Testing

- FloatingAIChat only works in own trip workspace.
- SharedTripView has no companion chat UI.
- Guest must claim trip before chat is available.
- No global chatroom in C3.

## Useful Official References

- Playwright Trace Viewer: records actions, DOM snapshots, screenshots, network, console, and timing.
- Playwright Screenshots: use `page.screenshot({ fullPage: true })`.
- Vite Env: only `VITE_*` variables are exposed to client code; restart Vite after env changes.
