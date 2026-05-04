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

Repo da o target structure voi `Backend/src/` + `Backend/tests/`.

### Backend tests

```bash
cd Backend
uv run pytest tests/unit/ -v
uv run pytest tests/integration/ -v
```

### Frontend e2e tests (requires BE running)

```bash
cd Frontend
npm run test:e2e          # headless
npm run test:e2e:headed   # with browser
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
