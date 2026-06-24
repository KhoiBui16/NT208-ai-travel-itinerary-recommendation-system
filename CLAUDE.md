# Claude Project Memory - NT208 AI Travel Itinerary Recommendation System

## Muc dich

File nay la project memory chinh cho Claude Code trong repo nay. Muc tieu la giup Claude doc nhanh, nho dung, va implement dung roadmap BE/AI da chot, thay vi bi keo ve mot template FastAPI generic.

Ngon ngu uu tien: giai thich bang tieng Viet, giu nguyen keyword, command, regex, endpoint, va format tieng Anh khi can chinh xac cu phap.

## Source of truth order

Claude phai doc theo thu tu nay:

1. `CLAUDE.md`
2. `.claude/context/00_project_overview.md`
3. File phase phu hop trong `.claude/context/`
4. `docs/*.md` duoc link trong file condensed
5. Codebase that te

Neu docs va code xung dot:

- Uu tien docs moi nhat trong `docs/`
- Sau do doi chieu voi code that te
- Neu code da lech docs, phai noi ro mismatch truoc khi sua tiep

## Current repo truth (2026-06-11)

- Backend runtime hien tai la MVP2 trong `Backend/src/`
- Backend dung `uv`, `pyproject.toml`, `uv.lock`, Alembic, async SQLAlchemy, Redis, Docker Compose
- BE local suite: 187 unit pass + 77 integration collected (43 int pass / 34 CI-gated skip) (full suite xanh trên CI postgres)
- Frontend runtime hien tai nam trong `Frontend/`
- Playwright suite hiện có 17 spec files trong `Frontend/tests/e2e/` (14 top-level + 3 `b3/`; CI `frontend-e2e` green)
- Public contract cho trip va nested data lay tu `Frontend/src/app/types/trip.types.ts`
- Register page bypass OTP cho den khi BE email OTP san sang
- `docs/` la bo tai lieu chi tiet cho user va reviewer
- `.claude/` la lop operational memory cho Claude, phai bam theo project nay
- **00062 fixes merged** (PR #86-90): SQLAlchemy async, dynamic timeout, Redis config, destination matching, trip_days seeding, FE error handling
- **00093 slugify fix merged** (PR #92): Shared `core/slugify.py`, places service fuzzy matching, itineraries refactor, browser test automation
- **00094 C3A chat session merged** (PR #98-100): Chat session REST APIs, FE ChatPanel component, e2e tests
- **00107 post-PR#105 completion** (branch `feat/00107-c-post-105-completion`): ETL cross-city contamination guard (`src.etl.transformers.city_match`) + idempotent cleanup CLI (`python -m src.etl.cleanup`); scheduler wired vào compose qua profile `etl`; apply-patch rate limit riêng (`rate_limit_ai_apply_patch_user`, namespace `rate:ai:apply_patch:*`); C4 session management (PATCH rename + DELETE + FE switcher/load-more); migration 0009 `chat_sessions.title`. Image/review sparsity là giới hạn provider Goong (không trả photo/rating), không phải bug.

## Target MVP2 decisions da chot

- MVP2 core co `41` `/api/v1` routes (14 GET / 16 POST / 5 PUT / 5 DELETE / 1 PATCH; logical EP-0 đến EP-39, trong đó EP-37/38/39 chat + apply-patch mở rộng thành nhiều route); `EP-34 /agent/analytics` la optional/deferred (C.5)
- Public JSON contract theo FE va dung `camelCase`
- `GET /api/v1/itineraries/{id}` la owner-only
- Public share chi doc qua `GET /api/v1/shared/{shareToken}`
- Guest claim bat buoc dung `claimToken` one-time, luu hash + expiry
- `POST /api/v1/itineraries/generate` di direct `ItineraryPipeline`, khong qua Supervisor
- Companion chat tra `requiresConfirmation` + `proposedOperations`, khong tu persist DB
- `SuggestionService` la DB-only service, khong goi LLM
- Chat history projection dung `chat_sessions` + `chat_messages` (C3A merged: REST APIs foundation ready)
- AI rate limit khong duoc fail-open im lang khi Redis down

## Read order truoc khi code

Luon doc:

1. `.claude/context/00_project_overview.md`
2. Mot file phase phu hop:
   - Foundation -> `01_foundation.md`
   - Auth/Users -> `02_auth_users.md`
   - Trip/Share/Claim -> `03_itineraries_share_claim.md`
   - Places/Cache -> `04_places_cache.md`
   - AI services -> `05_ai_services.md`
   - Workflow/CI -> `06_ops_workflow_ci.md`
3. Cac file docs nguon duoc link trong section `Read more`
4. File code se sua

## Workflow rules

- Daily execution phai sync vao `docs/09_execution_tracker.md`
- Roadmap/trang thai phase lon nam trong `docs/01_overview.md` va `docs/09_execution_tracker.md`
- Branch that te phai theo regex:

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

- Final squash commit phai theo format:

```text
<type>: [#<Task-ID>] <description>
```

- PR title phai trung final squash commit title
- Khong mo PR neu local verification chua pass theo pham vi ticket

## Local-first verification

Neu repo da len target structure:

```bash
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
uv run uvicorn src.main:app
```

```bash
cd Frontend
npm run build
npm run test:e2e          # Playwright e2e (requires BE running)
npm run test:e2e:headed   # headed mode
```

### Local execution environment (Windows PowerShell)

User's local environment is Windows with PowerShell. When running local verification:

**PowerShell-safe commands:**

```powershell
# Anchor from repo root
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

# Backend verification
Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
uv run pytest tests/integration/ -v --tb=short

# Frontend verification
Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify
npx playwright test tests\e2e\ --reporter=list
```

**Rules:**
- Always anchor commands from repo root using `$ROOT = git rev-parse --show-toplevel`
- Use PowerShell path syntax (`\` not `/`) in local commands
- Use `<repo-root>` placeholder in docs/reports instead of local absolute paths
- Do NOT write local machine path/hostname/private IP into docs
- CI/GitHub Actions uses Linux Bash only, but local instructions must be PowerShell-safe
- When Bash `cd` fails due to Windows path issues, use `Set-Location` with full path

## CI va PR rules

Required checks tren GitHub:

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
- `frontend-build`
- `frontend-e2e`

Rules:

- Khong direct push vao `main`
- Chi merge qua PR
- Squash merge only
- Auto-merge co the bat sau khi review + required checks pass

## Claude assets map

| Asset                                  | Muc dich                                            |
| -------------------------------------- | --------------------------------------------------- |
| `.claude/commands/analyze-project.md`  | Phan tich repo theo current truth vs target plan    |
| `.claude/commands/test.md`             | Chay test theo dual-mode current repo / target repo |
| `.claude/commands/lint-fix.md`         | Lint/format theo dual-mode, khong hardcode template |
| `.claude/commands/commit.md`           | Tao final commit message dung branch/commit policy  |
| `.claude/commands/pr.md`               | Tao PR dung title/body template cua repo            |
| `.claude/commands/browserbase-test.md` | Browserbase browser automation test skill           |
| `.claude/skills/code-review/SKILL.md`  | Review theo invariant cua project nay               |
| `.claude/skills/db-migration/SKILL.md` | Migration/schema rules theo MVP2                    |
| `.claude/agents/security-auditor.md`   | Audit secret, auth, token, SQL, AI guardrails       |
| `.claude/agents/doc-generator.md`      | Sync docs dai, docs rut gon, README, CI/PR docs     |

## Security rules

- Khong commit secret vao repo
- Khong de token trong shared `.claude/settings.json`
- `.claude/settings.local.json` la personal-only override, khong phai source of truth
- Khong doc hoac commit `.env` neu user khong yeu cau ro
- Khong gia dinh repo nay da co MCP, GitNexus, hook scripts, logging scripts, hay external infra neu chua ton tai that
- Neu thay dau vet token da commit, treat as compromised va khuyen nghi rotate

## Always do

- Doc condensed context truoc khi sua code
- Sync tracker khi bat dau task va truoc khi dat `review_ready`
- Boi canh hoa task bang current repo shape truoc, target shape sau
- Kiem tra contract public bang `Frontend/src/app/types/trip.types.ts`
- Ghi ro assumption neu docs va code dang lech nhau
- Khi viet Playwright test: dung `getByRole()` hoac `locator()` thay vi `getByText()` voi tieng Viet (strict mode violation do multiple matches)

## Never do

- Khong tin vao template generic neu repo that te khac
- Khong dua moi request AI qua Supervisor
- Khong public trip bang integer ID
- Khong claim guest trip chi dua vao `user_id IS NULL`
- Khong de docs condensed phat minh policy moi ngoai plan nguon
- Khong xem `.claude/settings.local.json` la tai lieu shared

## Phase C3/C4 execution lock

Day la project Phase C3/C4 bootstrap. Mot so co dinh phai giu dung truoc khi bat dau bat ky feature nao:

### C3 companion chat invariants

- C3 la **trip-bound companion chat**, khong phai global ChatGPT-like chatroom.
- C3 MVP dung **REST**, khong WebSocket/SSE. WebSocket/SSE la MVP2+.
- Chat tra `requiresConfirmation` + `proposedOperations`; **khong tu persist** itinerary khi user chua confirm.
- `apply-patch` moi update DB sau khi user confirm.
- `companion_service.py` nam trong `Backend/src/itineraries/`, khong nam trong `Backend/src/agent/`.
- `Backend/src/agent/` chi chua AI infra chung (LLM client, prompts, schemas).
- Guest phai claim trip sau login/regiter roi moi duoc chat trong companion.
- Paid AI rate limit **khong duoc fail-open** khi Redis down.

### Khong implement C5 Analytics khi C3/C4 chua on

C5 la optional. Khong duoc chuyen sang C5 khi C3 hoac C4 con loi.

### Truoc khi implement C3/C4

**Bat buoc chay skill `c3-c4-readiness-review`** de tao reports kiem tra:
- Generate pipeline (pipeline.py, rate_limiter.py)
- Rate limit auth user vs guest
- Auth/AuthZ use cases cho companion chat
- Goong/ETL data readiness
- C3/C4 API contract

**Khong implement C3/C4 khi reports chua xong hoac con issue unresolved.**
Output cua audit: `docs/REPORTS/generate_pipeline_readiness.md`, `docs/REPORTS/rate_limit_policy_review.md`, `docs/REPORTS/phase_c3_design_readiness.md`, va issue notes trong `docs/REPORTS/ISSUES/`.

## Quick entry points

- Tong quan: `.claude/context/00_project_overview.md`
- Foundation: `.claude/context/01_foundation.md`
- Auth/Users: `.claude/context/02_auth_users.md`
- Itinerary/Share/Claim: `.claude/context/03_itineraries_share_claim.md`
- Places/Cache: `.claude/context/04_places_cache.md`
- AI: `.claude/context/05_ai_services.md`
- Workflow/CI: `.claude/context/06_ops_workflow_ci.md`
- Docs chi tiet: `docs/01_overview.md`
