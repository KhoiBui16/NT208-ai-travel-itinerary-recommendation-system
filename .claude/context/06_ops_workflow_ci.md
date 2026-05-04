# 06 Ops Workflow CI

## Purpose

Tóm tắt branch/commit/PR/CI sau cleanup docs.

## Current truth

- Tracker mới: `docs/09_execution_tracker.md`.
- Docs chính: `docs/`.
- GitHub Actions có PR policy, backend CI, frontend build và frontend e2e.

## Target state

- Mỗi ticket đi trên branch riêng.
- Final branch có 1 commit sạch.
- PR body đúng template.
- `main` chỉ merge khi required checks pass và ruleset thỏa.

## Key invariants

Branch regex:

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

Commit format:

```text
<type>: [#<Task-ID>] <description>
```

Required checks:

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
- `frontend-build`
- `frontend-e2e`

## Do next

- Cập nhật `docs/09_execution_tracker.md`.
- Chạy local verification theo scope.
- Squash/amend còn 1 commit trước PR.
- Check CI/CD sau khi PR mở.

## Do not do

- Không direct push main.
- Không bỏ qua PR approval nếu ruleset yêu cầu.
- Không để PR body placeholder.

## Acceptance checkpoints

- Branch đúng regex.
- Commit đúng Conventional Commit + Task ID.
- PR title trùng commit title.
- CI xanh hoặc có báo cáo lỗi/fix rõ ràng.

## Read more

- `../../docs/07_workflow_ci.md`
- `../../docs/08_testing_local_run.md`
- `../../docs/09_execution_tracker.md`
