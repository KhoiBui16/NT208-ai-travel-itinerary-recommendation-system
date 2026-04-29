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
| 00000 | A | `feat/00000-a-foundation-bootstrap` | Phase A foundation bootstrap: `Backend/src`, core config/db/security, models, schemas, Alembic, Docker, README, basic tests | `in_progress` | `synced` | `integration_pass` | `passed` | `not_created` | `@codex` | 2026-04-28 | Local verify passed; awaiting real ClickUp Task ID before rename branch + final squash commit. Placeholder Task ID; replace with real ID before PR. `uv sync` with managed Python 3.12.13 OK; `uv run ruff check src tests` OK; `uv run pytest tests` = 6 passed; Docker Postgres/Redis healthy; `uv run alembic upgrade head` OK; DB has 16 core tables; `uv run uvicorn src.main:app` health check OK. `gh` CLI unavailable locally, so PR should be opened via GitHub GUI/app after push |
| 12345 | B1 | `feat/12345-b1-auth-register` | Register endpoint + service + unit tests | `todo` | `not_started` | `not_started` | `not_started` | `not_created` | `@owner` | 2026-04-25 | Replace sample row when starting work |
| 12346 | A | `chore/12346-a-ci-bootstrap` | GitHub Actions + PR template + tracker bootstrap | `todo` | `not_started` | `not_started` | `not_started` | `not_created` | `@owner` | 2026-04-25 | CI fallback allowed until refactor structure lands |

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
