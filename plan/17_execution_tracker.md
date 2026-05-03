# Part 17: Execution Tracker — Daily Ticket Sync

> **CHANGE-ID:** `execution-tracker-20260425-v1`
> **Generated:** 2026-04-25
> **Source of truth:** [15_todo_checklist.md](15_todo_checklist.md) cho phase roadmap,
> [11_cicd_docker_plan.md](11_cicd_docker_plan.md) cho branch/commit/PR/CI rules.
> Operational summary cho Claude/AI assistant: [../CLAUDE.md](../CLAUDE.md) va
> [../.claude/context/06_ops_workflow_ci.md](../.claude/context/06_ops_workflow_ci.md).

## Mục đích file này

File này dùng để track **trạng thái thực thi thật mỗi ngày** giữa:
- source code
- docs/plan
- tests
- local verification
- PR status

`15_todo_checklist.md` trả lời câu hỏi "roadmap phase nào làm gì".
File này trả lời câu hỏi "ticket đang làm tới đâu, branch nào, đã test chưa, đã sẵn sàng review chưa".

> [!IMPORTANT]
> Chỉ được set `Code Status = review_ready` khi:
> - code xong
> - docs sync xong
> - test tương ứng pass
> - local verify pass
> - branch đã được squash còn 1 commit cuối đúng format

## Quy ước trạng thái

| Cột | Giá trị hợp lệ |
|-----|----------------|
| `Code Status` | `todo`, `in_progress`, `review_ready`, `merged`, `blocked` |
| `Doc Status` | `not_started`, `synced`, `pending_update` |
| `Test Status` | `not_started`, `unit_pass`, `integration_pass`, `failed` |
| `Local Verify` | `not_started`, `passed`, `failed` |
| `PR Status` | `not_created`, `ready_for_review`, `in_review`, `merged` |

## Cách dùng

1. Chọn ticket sẽ làm.
2. Tạo branch theo format `type/task-phase-scope`.
3. Thêm hoặc update 1 row trong bảng dưới.
4. Mỗi lần đổi trạng thái code/test/docs/local verify thì update file ngay.
5. Sau merge: ghi PR link hoặc final commit hash vào `Notes`.

## Template branch/commit

**Branch:**

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

**Final squash commit:**

```text
<type>: [#<Task-ID>] <description>
```

Ví dụ:

```text
feat/12345-b1-auth-register
fix/67890-b2-itinerary-owner-check
feat: [#12345] add refresh token endpoint
```

## Tracker Table

| Task ID | Phase | Branch | Scope | Code Status | Doc Status | Test Status | Local Verify | PR Status | Owner | Last Updated | Notes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 00000 | A | `feat/00000-a-foundation-bootstrap` | Phase A foundation bootstrap | `merged` | `synced` | `integration_pass` | `passed` | `merged` | `@codex` | 2026-04-28 | Merged via PR #1 (squash merge). 28/28 tasks done. |
| 00001 | B1 | `feat/00001-b1-auth-users` | Phase B1 auth + users: 7 endpoints (EP 1-7), repos, services, routers, unit + integration tests, CI event-loop fix | `merged` | `synced` | `integration_pass` | `passed` | `merged` | `@KhoiBui16` | 2026-04-29 | Merged via PR #2. 13/13 tasks done. |
| 00002 | B2 | `feat/00002-b2-itineraries` | Phase B2 itineraries: 14 endpoints (EP 8-20, 32), CRUD, share, claim, rating | `merged` | `synced` | `integration_pass` | `passed` | `merged` | `@KhoiBui16` | 2026-04-29 | Merged via PR #3. 16/16 tasks done. Critical fix: `get_db()` now wraps session in `session.begin()` for auto-commit. |
| 00003 | B3 | `feat/00003-b3-places-cache` | Phase B3 places: 7 endpoints (EP 21-27), Redis cache, saved places | `merged` | `synced` | `integration_pass` | `passed` | `merged` | `@KhoiBui16` | 2026-04-30 | Merged via PR #4. 10/10 tasks done. 17 unit + 11 integration tests. Cache fail-open on Redis down. |
| 00004 | D | `feat/00004-d-etl-pipeline` | Phase D1 ETL pipeline: Goong+OSM extractors, transformers, DB upsert loader, runner CLI, test hotel data, 16 unit tests | `merged` | `synced` | `unit_pass` | `passed` | `merged` | `@KhoiBui16` | 2026-05-02 | PR #5. 6/9 tasks done (D1 complete, D2 pending). CI passed. D2.1 needs real API key. |
| 00005 | D | `fix/00005-d-etl-backend-readiness` | ETL schema/local readiness: missing Alembic schema, ETL config cities, Docker API env, FE build entry, CI gates | `review_ready` | `synced` | `integration_pass` | `passed` | `ready_for_review` | `@KhoiBui16` | 2026-05-03 | Local verify: Docker db/redis/API healthy, ruff check+format, alembic upgrade/check, unit 66, integration 42, full 108, ETL hotels-only, FE builds. PR opened from this branch. |
| 12346 | A | `chore/12346-a-ci-bootstrap` | GitHub Actions + PR template + tracker bootstrap | `merged` | `synced` | `integration_pass` | `passed` | `merged` | `@KhoiBui16` | 2026-04-28 | CI workflows already live and working. |

## Daily Review Checklist

```text
□ Branch name đúng regex
□ Task row đã tạo hoặc đã update
□ Docs bị ảnh hưởng đã sync
□ Unit test đã viết nếu có logic mới
□ Integration test đã viết nếu có endpoint mới/sửa endpoint
□ Local verify pass
□ Branch đã squash còn 1 commit final
□ PR title = final squash commit title
□ PR body đúng template
```
