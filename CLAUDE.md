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

## Current repo truth (2026-05-05)

- Backend runtime hien tai la MVP2 trong `Backend/src/`
- Backend dung `uv`, `pyproject.toml`, `uv.lock`, Alembic, async SQLAlchemy, Redis, Docker Compose
- 117 BE tests (75 unit + 42 integration)
- Frontend runtime hien tai nam trong `Frontend/`
- 11 Playwright e2e tests trong `Frontend/tests/e2e/`
- Public contract cho trip va nested data lay tu `Frontend/src/app/types/trip.types.ts`
- Register page bypass OTP cho den khi BE email OTP san sang
- `docs/` la bo tai lieu chi tiet cho user va reviewer
- `.claude/` la lop operational memory cho Claude, phai bam theo project nay

## Target MVP2 decisions da chot

- MVP2 core co `33` endpoints; `EP-34 /agent/analytics` la optional/MVP2+
- Public JSON contract theo FE va dung `camelCase`
- `GET /api/v1/itineraries/{id}` la owner-only
- Public share chi doc qua `GET /api/v1/shared/{shareToken}`
- Guest claim bat buoc dung `claimToken` one-time, luu hash + expiry
- `POST /api/v1/itineraries/generate` di direct `ItineraryPipeline`, khong qua Supervisor
- Companion chat tra `requiresConfirmation` + `proposedOperations`, khong tu persist DB
- `SuggestionService` la DB-only service, khong goi LLM
- Chat history projection dung `chat_sessions` + `chat_messages`
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

## Quick entry points

- Tong quan: `.claude/context/00_project_overview.md`
- Foundation: `.claude/context/01_foundation.md`
- Auth/Users: `.claude/context/02_auth_users.md`
- Itinerary/Share/Claim: `.claude/context/03_itineraries_share_claim.md`
- Places/Cache: `.claude/context/04_places_cache.md`
- AI: `.claude/context/05_ai_services.md`
- Workflow/CI: `.claude/context/06_ops_workflow_ci.md`
- Docs chi tiet: `docs/README.md`
