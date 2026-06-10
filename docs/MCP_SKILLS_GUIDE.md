# Guide MCP/Skills cho Browser Testing và Token Efficiency

`★ Insight ─────────────────────────────────────`
**Ba công cụ khác nhau:**
- Browserbase → Automate browser (local/remote)
- Caveman → Tiết kiệm token output (65-75%)
- SkillsMP → Marketplace tìm skills (KHÔNG chạy test)
`─────────────────────────────────────────────────`

## 1. Browserbase Skills - Automate BROWSER_TEST_PLAN.md

### Website Sources
- **GitHub:** https://github.com/browserbase/skills
- **Docs:** https://www.browserbase.com/SKILL.md
- **Skills:** browser, browserbase-cli, functions, site-debugger, ui-test, fetch, search

### Installation

```powershell
# Step 1: Install browse CLI
npm install -g @browserbasehq/browse-cli

# Step 2: Verify installation
browse --help

# Step 3: For Claude Code integration (optional)
/plugin marketplace add browserbase/skills
/plugin install browse@browserbase
```

### Mode Selection

```powershell
# Local mode - Dùng Chrome trên máy (FREE, cho localhost)
browse env local                    # Clean isolated browser
browse env local --auto-connect     # Reuse existing Chrome với cookies

# Remote mode - Browserbase cloud (cần API key)
browse env remote                   # Anti-bot, CAPTCHA solving, proxies
```

### Commands để Automate BROWSER_TEST_PLAN.md

```powershell
# Test Case 1 - Auth Flow (Register)
browse open http://localhost:5173/register
browse snapshot
browse fill "input[name='email']" "test@example.com"
browse fill "input[name='password']" "password123"
browse fill "input[name='confirmPassword']" "password123"
browse click "button[type='submit']"
browse wait load
browse get url
browse screenshot test-result.png

# Test Case 4 - AI Generate (3 days trip)
browse open http://localhost:5173
browse fill "input[placeholder*='đến']" "Hà Nội"
browse fill "input[type='number']" "3"
browse click "button:has-text('Tạo lịch trình')"
browse wait load --timeout 30000
browse get text "[data-testid='trip-title']"

# Cleanup
browse stop
```

### Pros/Cons

| Pros | Cons |
|------|------|
| Tự động hóa repetitive tests | Cần học `browse` commands |
| Lặp lại exact steps | KHÔNG thay human judgment |
| Screenshots cho evidence | Edge cases vẫn cần manual |
| Local mode FREE | Setup time upfront |

---

## 2. Start Services cho Manual Testing

### Backend & Database (PowerShell)

```powershell
# Anchor từ repo root
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

# Start Docker containers (db, redis)
Set-Location "$ROOT\Backend"
docker compose up -d db redis

# Verify containers
docker compose ps

# Start Backend API (development mode)
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend (PowerShell)

```powershell
# Terminal mới - Start Frontend dev server
Set-Location "$ROOT\Frontend"
npm run dev -- --host localhost --port 5173
```

### Endpoint Mapping

| Service | URL | Docs |
|---------|-----|------|
| Frontend | http://localhost:5173 | — |
| Backend API | http://localhost:8000 | http://localhost:8000/docs |
| API Spec | http://localhost:8000/openapi.json | — |

### Quick Test Flow (Manual)

1. **Test Case 1 - Auth** (5 phút)
   - Đăng ký → Verify dashboard
   - Đăng xuất → Đăng nhập lại

2. **Test Case 4 - AI Generate ngắn** (10 phút)
   - Input: Hà Nội, 3 ngày, 2 người
   - Verify: Trip tạo, có activities, có住宿

3. **Test Case 13 - Guest Claim** (10 phút)
   - Guest tạo trip → Copy link → Login → Paste → Claim

**Sau khi test xong:**
- PASS → Có thể bắt đầu Phase C3/C4
- FAIL → Report bugs để fix trước C3/C4

---

## 3. Caveman - Tiết kiệm Token cho Daily Workflow

### Website Source
- **GitHub:** https://github.com/JuliusBrussee/caveman
- **Purpose:** Cuts 65-75% output tokens, keeps 100% technical accuracy
- **Ecosystem:** caveman, caveman-code, cavemem, cavekit, cavegemma

### Installation (Windows PowerShell)

```powershell
# Windows (PowerShell 5.1+)
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

### Available Commands

```bash
/caveman [lite|full|ultra|wenyan]    # Compress every reply
/caveman-commit                       # Commit messages ≤50 char
/caveman-review                       # One-line PR comments
/caveman-stats                        # Track token savings
/caveman-compress <file>              # Rewrite memory files
```

### Levels of Grunt

| Level | Description | Use case |
|-------|-------------|----------|
| `lite` | Drop filler words | Daily conversation |
| `full` | Default caveman | General coding |
| `ultra` | Telegraphic | Maximum compression |
| `wenyan` | Classical Chinese | Even shorter |

### Benchmarks (Real Token Counts)

| Task | Normal | Caveman | Saved |
|------|--------|---------|-------|
| React re-render bug | 1180 | 159 | 87% |
| Auth middleware fix | 704 | 121 | 83% |
| PostgreSQL setup | 2347 | 380 | 84% |
| **Average** | **1214** | **294** | **65%** |

### Example Output

**Normal Claude (69 tokens):**
> "The reason your React component is re-rendering is likely because you're creating a new object reference on each render cycle. When you pass an inline object as a prop, React's shallow comparison sees it as a different object every time, which triggers a re-render. I'd recommend using useMemo to memoize the object."

**Caveman Claude (19 tokens):**
> "New object ref each render. Inline object prop = new ref = re-render. Wrap in `useMemo`."

---

## Summary Comparison

| Tool | Purpose | Installation | Best for |
|------|---------|--------------|----------|
| **Browserbase** | Browser automation | `npm install -g @browserbasehq/browse-cli` | Automate BROWSER_TEST_PLAN.md |
| **Caveman** | Token savings | `irm https://...install.ps1 \| iex` | Daily workflow efficiency |
| **SkillsMP** | Discover skills | Browse https://skillsmp.com | Finding new tools |

## Recommended Workflow

**Phase 1 - Manual Testing (CẦN LÀM TRƯỚC):**
```powershell
# Start services
Set-Location "$ROOT\Backend"
docker compose up -d db redis
uv run uvicorn src.main:app --reload --host 0.0.0.0 --port 8000

Set-Location "$ROOT\Frontend"
npm run dev -- --host localhost --port 5173
```
→ Thực hiện 10 P0 BLOCKER tests trong BROWSER_TEST_PLAN.md

**Phase 2 - Automation (OPTIONAL):**
```powershell
# Install Browserbase skill
npm install -g @browserbasehq/browse-cli
browse env local
browse open http://localhost:5173
# ... automation commands
```

**Phase 3 - Token Optimization (OPTIONAL):**
```powershell
# Install Caveman cho daily workflow
irm https://raw.githubusercontent.com/JuliusBrussee/caveman/main/install.ps1 | iex
```

---

## Which to Choose?

| Scenario | Solution |
|----------|----------|
| Test trip planner manually | Start services + follow BROWSER_TEST_PLAN.md |
| Automate repetitive tests | Install Browserbase + write browse scripts |
| Save tokens daily conversation | Install Caveman + use `/caveman` |
| Explore new tools | Browse SkillsMP marketplace |

---

## References

- Browserbase GitHub: https://github.com/browserbase/skills
- Browserbase Docs: https://www.browserbase.com/SKILL.md
- Caveman GitHub: https://github.com/JuliusBrussee/caveman
- SkillsMP: https://skillsmp.com/
- BROWSER_TEST_PLAN.md: docs/BROWSER_TEST_PLAN.md

---

**Created:** 2026-06-10  
**Purpose:** Tổng hợp MCP/Skills cho browser testing và token optimization
