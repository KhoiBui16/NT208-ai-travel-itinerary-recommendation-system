# 07. Workflow, branch, commit, PR và CI

## Branch

Format:

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

Ví dụ:

```text
docs/00006-d-docs-cleanup
fix/00005-d-etl-backend-readiness
```

## Commit

Final commit sau squash:

```text
<type>: [#<Task-ID>] <description>
```

Ví dụ:

```text
docs: [#00006] consolidate project documentation
fix: [#00005] fix ETL schema and local readiness
```

## PR body

PR phải có:

```markdown
## Mô tả
- ...
- Task ID: [#00006](https://app.clickup.com/t/00006)

## Thay đổi chính
- [x] ...

## Cách kiểm tra (Testing)
- Bước 1: ...
- Kết quả mong đợi: ...

## Lưu ý khác
- Config/migration/schema/API contract/env changes nếu có.
```

## Required checks

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
- `frontend-build`
- `frontend-e2e`

## Merge rules

- Không push trực tiếp vào `main`.
- Merge qua PR.
- Squash merge.
- Nếu ruleset yêu cầu approval, người mở PR không tự approve được chính PR của mình.

