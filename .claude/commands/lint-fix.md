---
description: Run repo-appropriate lint and formatting without assuming the target structure already exists
argument-hint: [path] [--check-only]
allowed-tools: Bash(uv:*), Read, Edit
---

# Lint and Fix

## Required reading

- `CLAUDE.md`
- `.claude/context/00_project_overview.md`
- File phase phu hop trong `.claude/context/`

## Your Task

Repo da o target structure voi `Backend/pyproject.toml` + `Backend/src/`.

- Uu tien `uv run ruff ...` trong `Backend/`
- Neu chi check-only, khong duoc sua file

$ARGUMENTS

## Preferred target-state commands

```bash
cd Backend
uv run ruff check src/ --fix
uv run ruff format src/ tests/
```

## Output Format

```markdown
## Lint mode
- Current repo truth / Target repo truth

### Auto-Fixed Issues
- ...

### Remaining Issues (Manual Fix Required)
- ...

### Commands Run
- ...
```
