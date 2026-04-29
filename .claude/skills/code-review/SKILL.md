---
name: code-review
description: Project-specific code review checklist for this travel itinerary repo. Use for PR review, pre-commit review, and quality checks against the locked BE/AI plan.
allowed-tools: Read, Grep, Glob, Bash(git:*), Bash(pytest:*), Bash(ruff:*), Bash(uv:*)
---

# Code Review Skill

Dung skill nay khi review code trong repo nay. Day khong phai checklist FastAPI generic; no bam vao contract, security, AI, va workflow da chot cua project.

## Read first

- `CLAUDE.md`
- `.claude/context/00_project_overview.md`
- File phase lien quan trong `.claude/context/`

## Review Checklist

### 1. Public contract and FE compatibility

- [ ] Public JSON dung `camelCase`
- [ ] Contract bam `Frontend/src/app/types/trip.types.ts`
- [ ] `Activity.name` dung thay vi `title`
- [ ] Field gia tien/extra expenses khong bi doi ten sai (`adultPrice`, `childPrice`, `extraExpenses`)

### 2. Object ownership and tokenized public access

- [ ] Moi endpoint theo integer `/{id}` co owner check
- [ ] Public share chi qua `shareToken`
- [ ] Guest claim can `claimToken` one-time, hash, expiry, consume-once
- [ ] Khong co IDOR o trip, saved place, chat history, share, claim

### 3. AI architecture invariants

- [ ] `POST /itineraries/generate` di direct `ItineraryPipeline`
- [ ] Companion chat chi tra `requiresConfirmation` + `proposedOperations`
- [ ] Chat khong tu persist DB neu user chua confirm
- [ ] `SuggestionService` la DB-only, khong goi LLM
- [ ] Analytics neu co thi van la optional va co guardrails

### 4. Database and migration safety

- [ ] Schema change co Alembic plan phu hop
- [ ] Tables nhay cam dung design da chot: `share_links`, `guest_claim_tokens`, `chat_sessions`, `chat_messages`
- [ ] Token nhay cam khong luu raw neu policy da chot hash
- [ ] Integer IDs duoc dung nhat quan cho public/DB model theo plan

### 5. Auth, config, and secret hygiene

- [ ] Khong hardcode secrets/token
- [ ] Shared `.claude/settings.json` khong chua secret
- [ ] `.claude/settings.local.json` khong bi xem la shared config
- [ ] Refresh/logout/token flow khop security plan

### 6. Layering and code quality

- [ ] Router -> service -> repository boundary ro rang
- [ ] Function public co type hints, ten ro nghia business
- [ ] Comment giai thich `why`, docstring cho class/public function
- [ ] Khong co catch-all im lang

### 7. Test and workflow readiness

- [ ] Logic moi co unit test
- [ ] Endpoint moi/sua endpoint co integration test
- [ ] Tracker/docs duoc sync neu thay doi policy, CI, contract, schema
- [ ] Branch/commit/PR conventions khong bi pha vo khi review docs/.github

## Output Format

Provide feedback in this structure:

```markdown
## Code Review Summary

### 🔴 Critical Issues (Must Fix)
- Issue description with file:line reference and suggested fix

### 🟡 Warnings (Should Fix)
- Warning description with file:line reference

### 🟢 Suggestions (Nice to Have)
- Suggestion with rationale

### ✅ Positive Observations
- What was done well
```

## Useful commands

```bash
git diff --staged
git diff
git status --short
uv run ruff check .
uv run pytest -v
```
