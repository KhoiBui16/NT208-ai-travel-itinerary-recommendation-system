---
name: db-migration
description: Project-specific migration skill for the MVP2 schema plan. Use when touching models, Alembic, PK/FK design, token tables, or chat history tables.
allowed-tools: Read, Grep, Glob, Bash(uv:*), Bash(cat:*)
---

# DB Migration Skill

Dung skill nay khi lam viec voi schema va migration cua repo nay. Day la checklist theo target MVP2, khong phai Alembic guide generic.

## Read first

- `CLAUDE.md`
- `.claude/context/01_foundation.md`
- `.claude/context/03_itineraries_share_claim.md` neu dong vao trip/share/claim
- `.claude/context/05_ai_services.md` neu dong vao chat/history/AI tables

## Migration Safety Checklist

### 1. Current-truth vs target-state check

- [ ] Repo da o target Alembic structure chua?
- [ ] Neu van o MVP1 `create_all()` mode, note ro day la khoang cach can vuot qua
- [ ] Neu co requirement preserve production data, dung lai va danh gia lai ke hoach migration

### 2. Schema invariants cua project

- [ ] Bang core MVP2 theo plan da du scope can sua
- [ ] Dac biet luu y: `share_links`, `guest_claim_tokens`, `chat_sessions`, `chat_messages`
- [ ] Integer ID duoc dung nhat quan theo target schema
- [ ] FK/index cho trip/day/activity/place/share/claim/chat co day du

### 3. Token and security tables

- [ ] `shareToken` va `claimToken` khong luu raw neu policy da chot hash
- [ ] Claim token co expiry va consumed flag
- [ ] Refresh token strategy khop security plan

### 4. Alembic and dev workflow

- [ ] Dung Alembic-first, khong quay lai `create_all()` lam migration path chinh
- [ ] Migration co `upgrade()` va `downgrade()` hop ly
- [ ] Co note ro neu migration chi an toan cho dev-reset va chua nham preserve prod data
- [ ] Co test/verify `alembic upgrade head`

## Common Alembic Commands

```bash
uv run alembic current
uv run alembic history --verbose
uv run alembic upgrade head
uv run alembic downgrade -1
```

## Output Format

When proposing migrations, provide:

```markdown
## Migration Plan

### Purpose
What this migration accomplishes and why

### Current truth
- ...

### Target state
- ...

### Tables / columns touched
- ...

### Risks
- ...

### Rollback Plan
- ...

### Estimated Impact
- ...
```
