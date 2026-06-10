---
description: Run browser automation tests using browse CLI v0.8.3 for critical test cases from BROWSER_TEST_PLAN.md
argument-hint: [test-case] [--local] [--keep-session]
allowed-tools: Bash(browse:*), Bash(curl:*), Bash(docker:*), Bash(npm:*), Read
---

# Browserbase Browser Automation Test

## Required reading

- CLAUDE.md
- docs/BROWSER_TEST_PLAN.md (16 test cases)
- .claude/context/03_itineraries_share_claim.md
- .claude/context/05_ai_services.md

## Your Task

Chay browser automation test dung browse CLI v0.8.3 de verify critical test cases truoc khi bat dau Phase C3/C4.

$ARGUMENTS

## Prerequisites check

### 1. Check browse CLI installed

```bash
browse --version
```

Expected output: browse 0.8.3 or higher

If missing:
```bash
npm install -g browse@0.8.3
```

### 2. Check services running

PowerShell:
```powershell
curl http://localhost:8000/health
curl http://localhost:5173
cd <repo-root>\Backend
docker compose ps
```

Bash:
```bash
curl http://localhost:8000/health
curl http://localhost:5173
cd <repo-root>/Backend
docker compose ps
```

Expected results:
- Backend health: {"status": "ok"} or similar
- Frontend: HTML response (not 404)
- Docker: All containers (db, redis, api) showing "Up"

## Service startup commands

Start Backend (PowerShell):
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
docker compose up -d
```

Start Backend (Bash):
```bash
cd <repo-root>/Backend
docker compose up -d
```

Start Frontend (PowerShell):
```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Frontend"
npm run dev
```

Start Frontend (Bash):
```bash
cd <repo-root>/Frontend
npm run dev
```

## Test execution

### TC-01: Auth (Register + Login)

Purpose: Verify auth flow and session persistence

```bash
browse open http://localhost:5173/register --local
browse fill "Email" "browserbase-test@example.com"
browse fill "Mật khẩu" "Password123"
browse fill "Xác nhận mật khẩu" "Password123"
browse click "Đăng ký"
browse wait load
browse snapshot
browse click "Đăng xuất"
browse wait load
browse fill "Email" "browserbase-test@example.com"
browse fill "Mật khẩu" "Password123"
browse click "Đăng nhập"
browse wait load
browse snapshot
```

Expected results:
- Registration successful
- Login successful  
- Session persists after page reload

### TC-04: AI Generate (3-day trip)

Purpose: CRITICAL - Verify AI generate pipeline works after fix 00062

```bash
browse open http://localhost:5173/create-trip --local
browse click "Tạo Lịch Trình Với AI"
browse fill "Điểm đến" "Hà Nội"
browse fill "Thời gian" "3"
browse fill "Bạn đi với ai" "Cặp đôi"
browse fill "Mức ngân sách" "Trung bình"
browse fill "Sở thích" "Ẩm thực"
browse click "Tạo Lịch Trình Với AI"
browse wait load
browse snapshot
browse screenshot -p <repo-root>/docs/REPORTS/tc04-ai-generate-result.png
```

Expected results:
- AI generate completes in < 60 seconds
- Trip created with 3 days
- Each day has 3-5 activities
- Accommodations suggested
- Total cost calculated

### TC-08: Places Search (fuzzy)

Purpose: Verify BUG-BE-003 fix - fuzzy search works with Vietnamese

```bash
browse open "http://localhost:5173/trip-workspace?tripId={existing-trip-id}" --local
browse click "Địa điểm"
browse click "Tìm kiếm"
browse fill "Tìm kiếm" "Hà Nội"
browse wait load
browse screenshot -p <repo-root>/docs/REPORTS/tc08-search-accented.png
browse fill "Tìm kiếm" "Ha Noi"
browse wait load
browse screenshot -p <repo-root>/docs/REPORTS/tc08-search-no-accent.png
browse fill "Tìm kiếm" "ho chi minh"
browse wait load
browse screenshot -p <repo-root>/docs/REPORTS/tc08-search-lowercase.png
browse snapshot
```

Expected results:
- Hà Nội (accented) -> Results found
- Ha Noi (no accent) MUST find results (BUG-BE-003 fix)
- ho chi minh (lowercase) -> Results found
- No 404 errors

### TC-12: Share Trip

Purpose: Verify share token flow and public share link

```bash
browse open "http://localhost:5173/trip-workspace?tripId={existing-trip-id}" --local
browse click "Chia sẻ"
browse wait load
browse snapshot
browse screenshot -p <repo-root>/docs/REPORTS/tc12-share-modal.png
browse open "http://localhost:5173/shared/{share-token}" --local
browse wait load
browse snapshot
browse screenshot -p <repo-root>/docs/REPORTS/tc12-shared-view.png
```

Expected results:
- Share link generated with token format
- Shared view loads without login
- Shared view is read-only (no edit/save buttons)
- Data integrity maintained (all days, activities visible)

### TC-13: Guest Claim

Purpose: CRITICAL - Verify guest can create trip then claim after login

```bash
browse open http://localhost:5173/logout --local
browse open http://localhost:5173/create-trip --local
browse fill "Điểm đến" "Hà Nội"
browse fill "Thời gian" "3"
browse click "Tạo Lịch Trình Với AI"
browse wait load
browse screenshot -p <repo-root>/docs/REPORTS/tc13-guest-trip-created.png
browse open http://localhost:5173/login --local
browse fill "Email" "browserbase-test@example.com"
browse fill "Mật khẩu" "Password123"
browse click "Đăng nhập"
browse wait load
browse open "http://localhost:5173/trip-workspace?tripId={guest-trip-id}&claimToken={token}" --local
browse wait load
browse click "Giữ lại lịch trình"
browse wait load
browse screenshot -p <repo-root>/docs/REPORTS/tc13-claim-success.png
browse open http://localhost:5173/my-trips --local
browse snapshot
```

Expected results:
- Guest can create AI trip
- Trip has claimToken
- After login, claim succeeds
- Trip appears in My Trips
- Claim token is one-time (second attempt fails)

## Evidence collection

Save screenshots to reports:
```bash
mkdir -p <repo-root>/docs/REPORTS
browse screenshot -p <repo-root>/docs/REPORTS/{test-case-name}.png
```

Snapshot commands:
```bash
browse snapshot > <repo-root>/docs/REPORTS/{test-case-name}-snapshot.html
```

Full test session evidence:
```bash
browse open http://localhost:5173 --local --log-file <repo-root>/docs/REPORTS/browser-test-session.log
```

## Session management tips

Handle daemon timeout:
```bash
browse stop
browse open http://localhost:5173 --local
```

Use --local flag:
```bash
browse open <url> --local
```

Cleanup after testing:
```bash
browse stop
# Windows (PowerShell):
Get-Process | Where-Object {$_.Name -like "*browse*"} | Stop-Process
# Linux/Mac:
pkill -f browse
```

## Troubleshooting

Browse CLI not found:
```bash
npm install -g browse@0.8.3
```

Backend not responding:
```bash
cd <repo-root>/Backend
docker compose up -d
docker compose logs api --tail 50
```

Frontend not running:
```bash
cd <repo-root>/Frontend
npm run dev
```

Browse daemon timeout:
```bash
browse stop
browse open http://localhost:5173 --local
```

Element not found:
- Verify page loaded: browse wait load
- Check element text matches exactly (Vietnamese accents)
- Use browse snapshot to inspect current page state

## Reference: Browse CLI v0.8.3 commands

| Command | Purpose | Example |
|---------|---------|---------|
| browse open <url> --local | Open URL in local browser | browse open http://localhost:5173 --local |
| browse fill "<label>" "<value>" | Fill form field | browse fill "Email" "test@example.com" |
| browse click "<button_text>" | Click button/link | browse click "Đăng ký" |
| browse wait load | Wait for page load | browse wait load |
| browse snapshot | Get page HTML | browse snapshot |
| browse screenshot -p <path> | Save screenshot | browse screenshot -p ./screenshot.png |
| browse stop | Stop daemon | browse stop |

## Test case priority mapping

From docs/BROWSER_TEST_PLAN.md:

P0 BLOCKER (must pass for C3/C4):
- TC-01: Auth flow
- TC-04: AI generate (3-day trip)
- TC-08: Places search (fuzzy)
- TC-12: Share trip
- TC-13: Guest claim
- TC-14: Rate limit (AI quota)

P1 Important:
- TC-02: Homepage + Destinations
- TC-03: Manual trip creation
- TC-06: Edit travelerInfo (BUG-BE-001)
- TC-07: Extra expenses (BUG-BE-002)
- TC-09: Error handling (BUG-FE-007)
- TC-10: City detail page
- TC-11: Saved places
- TC-15: Budget tracker
- TC-16: Timeline drag-drop

P2 Optional:
- TC-05: AI generate (14-day trip) - Performance verification

## Stop-the-line rules

HALT IMMEDIATELY if:
- TC-04 (AI generate) fails -> C3/C4 blocked
- TC-13 (Guest claim) fails -> Guest flow broken
- TC-12 (Share trip) fails -> Public share broken
- TC-14 (Rate limit) fail-open -> Security issue
- BUG-BE-001/002/003 regression -> Data contract broken

Report findings to:
- docs/REPORTS/browserbase-test-results.md
- Create issue notes in docs/REPORTS/ISSUES/ for failures

---

Browse CLI version: 0.8.3
Test plan reference: docs/BROWSER_TEST_PLAN.md
Phase: Pre-C3/C4 verification
Last updated: 2026-06-10
