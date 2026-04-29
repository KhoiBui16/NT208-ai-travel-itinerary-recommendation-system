---
description: Create a pull request using the repo's locked title/body policy
argument-hint: [base-branch]
allowed-tools: Bash(git:*), Bash(gh:*), Read
---

# Pull Request

## Required reading

- `CLAUDE.md`
- `.claude/context/06_ops_workflow_ci.md`
- `plan/17_execution_tracker.md`

## Your Task

Tao PR dung quy trinh cua repo:

1. Xac nhan branch da squash thanh 1 final commit sach
2. Xac nhan PR title trung final squash commit title
3. Xac nhan tracker row da sync
4. Xac nhan local verification phu hop da pass
5. Tao PR body dung template ben duoi
6. Nhac required checks va auto-merge rule

$ARGUMENTS

## Required title format

```text
<type>: [#<Task-ID>] <description>
```

## Required PR body template

```markdown
## Mô tả
- Giải thích tóm tắt những thay đổi trong PR này.
- Task ID: [#12345](https://app.clickup.com/t/12345)

## Thay đổi chính
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## Cách kiểm tra (Testing)
- Bước 1: ...
- Bước 2: ...
- Kết quả mong đợi: ...

## Lưu ý khác
- Config/migration/env/contract changes neu co.
```

## Required checks on GitHub

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
