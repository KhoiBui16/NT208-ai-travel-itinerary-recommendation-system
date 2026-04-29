---
description: Analyze this repo using the real current structure and the locked BE/AI roadmap
argument-hint: [optional-focus-area]
allowed-tools: Read, Grep, Glob, Bash(rg:*), Bash(git:*)
---

# Analyze Project

## Required reading

- `CLAUDE.md`
- `.claude/context/00_project_overview.md`
- File phase phu hop trong `.claude/context/` neu user da noi ro scope

## Rules

- Luon phan biet `current repo truth` va `target MVP2 plan`
- Khong gia dinh `Backend/src/`, `Backend/pyproject.toml`, `alembic.ini`, hay `tests/` da ton tai
- Repo nay hien tai co current backend o `Backend/app/`, `Backend/main.py`, `Backend/requirements.txt`
- Public contract cho FE lay tu `Frontend/src/app/types/trip.types.ts`

## Your task

Phan tich repo theo cau truc that te va roadmap da lock:

1. Xac nhan current repo shape
2. Tach ro `current truth` vs `target state`
3. Chi ra gap lon nhat giua codebase va plan
4. Xac nhan phase nao dang lien quan den task
5. Neu co scope FE/BE contract, doi chieu voi `trip.types.ts`
6. Neu co scope AI, nho 4 invariants:
   - generate direct pipeline
   - chat patch-confirm
   - suggest la DB-only
   - analytics la optional
7. De xuat `next safe tickets` nho, theo order local-first

$ARGUMENTS

## Output format

```markdown
## Current truth
- ...

## Target state
- ...

## Main gaps
- ...

## Risks
- ...

## Recommended next tickets
- ...
```
