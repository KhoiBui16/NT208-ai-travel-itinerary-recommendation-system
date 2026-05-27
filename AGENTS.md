# Agents and Skills Guide

File nay la bang dieu phoi ngan gon cho Claude trong repo nay. Chi giu nhung agent, skill, va command dang co gia tri that cho project.

## Read first

1. `CLAUDE.md`
2. `.claude/context/00_project_overview.md`
3. File phase phu hop trong `.claude/context/`

## Custom agents giu lai

| Agent | Khi nao dung | Scope chinh |
|---|---|---|
| `security-auditor` | Truoc merge cac thay doi nhay cam ve auth, token, SQL, AI, config, secrets | JWT/refresh/share/claim token, SQL guardrails, `.claude/settings*.json`, rate limit, prompt injection |
| `doc-generator` | Khi can sync tai lieu hoac tao docs moi dung roadmap hien tai | `CLAUDE.md`, `AGENTS.md`, condensed context pack, long plan docs, README, PR/CI docs |

## Skills uu tien

| Task | Skill |
|---|---|
| Review code, review PR, check readiness truoc commit/PR | `.claude/skills/code-review/SKILL.md` |
| Sua models, schema, Alembic, migration, PK/FK, token tables | `.claude/skills/db-migration/SKILL.md` |
| Debug/test FE-BE that qua Docker, dev server, browser, screenshot, log, Playwright | `.claude/skills/fullstack-browser-debug/SKILL.md` |
| So source code voi plan/docs/README, tao report/issue de tranh lech tai lieu | `.claude/skills/source-plan-sync-review/SKILL.md` |

## Skill invocation rules — Phase C3/C4

| Khi nao | Bat buoc dung skill |
|---|---|
| So source code voi Drive plans/docs | `.claude/skills/source-plan-sync-review/SKILL.md` |
| Audit readiness truoc C3/C4 (generate pipeline, rate limit, auth/AuthZ, data readiness) | `.claude/skills/c3-c4-readiness-review/SKILL.md` |
| Kiem tra browser/FE-BE flow that | `.claude/skills/fullstack-browser-debug/SKILL.md` |
| Kiem tra Goong/ETL/data readiness | `.claude/skills/goong-etl-readiness-review/SKILL.md` |
| Review code truoc PR | `.claude/skills/code-review/SKILL.md` |
| Migration/schema change | `.claude/skills/db-migration/SKILL.md` |
| Commit/PR theo CI/CD | `.claude/skills/git-pr-workflow/SKILL.md` |

## Phase C3/C4 non-negotiables

- C3 la trip-bound companion chat, khong phai global chatroom.
- C3 MVP dung REST, khong WebSocket/SSE. WebSocket/SSE la MVP2+.
- Chat tra `requiresConfirmation` + `proposedOperations`, khong tu persist itinerary.
- `apply-patch` moi update DB sau confirm.
- `companion_service.py` nam trong `Backend/src/itineraries/`, khong trong `Backend/src/agent/`.
- `Backend/src/agent/` chi chua AI infra chung.
- Guest phai claim trip truoc khi chat trong companion.
- Paid AI rate limit khong duoc fail-open khi Redis down.
- Khong implement C5 Analytics khi C3/C4 chua on.

## Commands co san

| Command | Muc dich |
|---|---|
| `/analyze-project` | Phan tich repo theo current truth vs target MVP2 |
| `/test` | Chay test theo dual-mode current repo / target repo |
| `/lint-fix` | Lint/format theo current repo hoac target repo |
| `/commit` | Tao final squash commit dung branch/commit policy |
| `/pr` | Tao PR dung title/body template cua repo |

## Dieu khong con active

Nhung thu sau khong duoc xem la infrastructure active cua project nay:

- GitNexus
- FastMCP
- generic hook scripts khong ton tai
- MCP integrations duoc mo ta nhu da san sang khi repo chua co that

Neu muon dua mot integration tro lai, phai them ha tang that vao repo truoc roi moi dua vao `CLAUDE.md` va `.claude/`.