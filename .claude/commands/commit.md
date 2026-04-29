---
description: Create the final project-specific squash commit message and verify branch policy
argument-hint: [type] [task-id]
allowed-tools: Bash(git:*), Read
---

# Commit

## Required reading

- `CLAUDE.md`
- `.claude/context/06_ops_workflow_ci.md`
- `plan/17_execution_tracker.md`

## Rules

- Branch phai dung regex:

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

- Final squash commit phai theo format:

```text
<type>: [#<Task-ID>] <description>
```

| Type | Description |
|------|-------------|
| feat | New feature |
| fix | Bug fix |
| docs | Documentation only |
| style | Formatting only |
| refactor | Internal refactor, no new feature |
| chore | Tooling or config work |

## Your Task

1. Kiem tra branch name
2. Doi chieu task voi row trong `plan/17_execution_tracker.md`
3. Kiem tra code/docs/test/local verify da du dieu kien `review_ready` cho final branch state chua
4. Chon type phu hop
5. Tao message cuoi cung dung format cua repo
6. Neu branch con nhieu commit lam viec, nhac squash truoc khi xem day la final review-ready state

$ARGUMENTS

## Message Guidelines

- Description bat dau bang dong tu
- Viet thuong chu cai dau
- No period at the end
- Keep under 72 characters
- Khong dung `fix`, `update`, `part 2`, `final`, `temp`

## Examples

```
feat: [#12345] add refresh token endpoint
fix: [#67890] fix itinerary owner authorization
docs: [#22222] update claude workflow docs
```
