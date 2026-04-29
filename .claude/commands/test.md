---
description: Run repo-appropriate tests using current-state or target-state commands
argument-hint: [test-pattern] [--coverage] [-v]
allowed-tools: Bash(uv:*), Bash(pytest:*), Bash(python:*), Read, Edit
---

# Test

## Required reading

- `CLAUDE.md`
- `.claude/context/00_project_overview.md`
- File phase phu hop trong `.claude/context/`

## Your Task

Detect repo mode truoc khi chay test:

### Mode A - Current repo truth

Dung mode nay neu backend van o dang:
- `Backend/app/`
- `Backend/main.py`
- `Backend/requirements.txt`
- chua co `Backend/src/` + `Backend/tests/` theo target plan

Trong mode nay:
- Tim nhung test script that su ton tai trong `Backend/`
- Chay nhung test phu hop voi current structure
- Neu unit/integration layout chua ton tai, note ro day la current limitation

### Mode B - Target repo truth

Dung mode nay neu da co:
- `Backend/pyproject.toml`
- `Backend/src/`
- `Backend/tests/unit/`
- `Backend/tests/integration/`

Trong mode nay, uu tien:

```bash
cd Backend
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
```

$ARGUMENTS

## Output Format

```markdown
## Test mode
- Current repo truth / Target repo truth

### Summary
- Commands run
- What passed
- What failed

### Gaps
- Missing tests or missing target structure

### Recommended next action
- ...
```
