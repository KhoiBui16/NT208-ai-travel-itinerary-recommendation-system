# 06 Ops Workflow CI

## Purpose

Tom tat ticket workflow, branch/commit/PR rules, tracker, va GitHub quality gates de Claude khong lam lech process.

## Current truth

- Repo da co plan branch/commit/PR/CI rules moi
- `plan/17_execution_tracker.md` track thuc thi hang ngay
- `.github/` da co quality-gate docs/workflows cho local-first setup

## Target state

- Moi ticket di tren branch rieng `type/task-phase-scope`
- Moi PR duoc squash thanh 1 commit cuoi sach
- `main` chi nhan code qua PR
- GitHub rules block direct push va chi merge khi checks pass, khong conflict

## Key invariants

- Branch regex:

```text
^(feat|fix|docs|style|refactor|chore)\/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

- Final commit format:

```text
<type>: [#<Task-ID>] <description>
```

- PR title = final squash commit title
- Required checks:
  - `pr-policy`
  - `backend-lint`
  - `backend-unit`
  - `backend-integration`
  - `backend-migrations`

## Do next

- Cap nhat tracker row truoc va sau khi code
- Chay local verification phu hop voi scope ticket
- Dong bo docs neu quyet dinh lon doi
- Chi mo PR khi branch da squash va template day du

## Do not do

- Khong direct push vao `main`
- Khong mo PR khi test/local verify chua pass
- Khong dung generic PR template khac voi repo
- Khong doi ten required checks tuy y neu da set ruleset tren GitHub

## Acceptance checkpoints

- Tracker, branch, commit, PR body, local verify deu sync
- Required checks dung ten va co the map vao GitHub GUI
- Docs condensed khop voi plan dai khi quyet dinh doi

## Read more

- `../../plan/11_cicd_docker_plan.md`
- `../../plan/15_todo_checklist.md`
- `../../plan/17_execution_tracker.md`
- `../../plan/08_coding_standards.md`
