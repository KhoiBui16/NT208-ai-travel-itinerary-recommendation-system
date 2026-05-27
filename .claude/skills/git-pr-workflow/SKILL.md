---
name: git-pr-workflow
description: Enforce branch regex, squash commit format, and PR title/body policy. Use before creating any commit or PR in this repo. Combines the rules from the /commit and /pr commands with Phase C3/C4 additions.
allowed-tools: Bash(git:*), Bash(gh:*), Read
---

# Git PR Workflow

Enforce this workflow for every branch and PR in this repo.

## Branch Name

Branch phai dung regex:

```text
^(feat|fix|docs|style|refactor|chore)/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$
```

Vi du:

```
feat/00051-c-c3-companion-chat
fix/00053-c-c3-rate-limit-fix
docs/00050-c-c3-design-readiness-audit
chore/00056-c-c3-ci-workflow
```

### Phase suffixes

| Suffix | Phase |
|--------|-------|
| `c` | Phase C (AI companion) |
| `c3` | Phase C.3 companion chat |
| `c4` | Phase C.4 chat history |
| `c5` | Phase C.5 analytics (optional) |
| `d` | Docs / sync / cleanup |

Khong dung prefix khac nhu `feature/`, `bugfix/`, `hotfix/`.

## Commit

### Branch check

```bash
git branch --show-current
```

Neu khong dung regex, dung `git checkout -b` tao branch dung truoc khi commit.

### Pre-commit verification

Truoc khi commit, dam bao:

```bash
# BE lint
cd Backend && uv run ruff check src tests
cd Backend && uv run ruff format --check src tests

# BE migrations
cd Backend && uv run alembic upgrade head
cd Backend && uv run alembic check

# BE tests (phu hop voi pham vi ticket)
cd Backend && uv run pytest tests/unit/ -q --tb=short

# FE build
cd Frontend && npm run build
```

Neu ticket la docs/sync, chi can lint + migration + tracker sync.

### Squash format

Neu branch co nhieu hon 1 commit, squash truoc khi xem la final.

Final squash commit:

```text
<type>: [#<Task-ID>] <description>
```

| Type | Dung khi |
|------|----------|
| `feat` | Feature moi |
| `fix` | Bug fix |
| `docs` | Tai lieu, khong doi code logic |
| `style` | Chi format, khong doi logic |
| `refactor` | Refactor noi bo, khong feature |
| `chore` | Tooling, config |

Vi du:

```
feat: [#00051] add companion chat REST endpoint
fix: [#00053] fix guest generate quota bypass
docs: [#00049] sync docs to source code after C.2 merge
```

Luu y:
- Khong Co-Authored-By trong commit message
- Description bat dau bang dong tu, viet thuong
- Khong co dau cham cuoi
- Duoi 72 ky tu

## Pull Request

### PR title format

PR title phai trung y chang final squash commit title:

```text
<type>: [#<Task-ID>] <description>
```

### PR body template

```markdown
## Mô tả
- Giai thich tom tat nhung thay doi trong PR nay.
- Task ID: [#NNNNN](https://[REDACTED]/t/NNNNN)

## Thay đổi chính
- [ ] Item 1
- [ ] Item 2
- [ ] Item 3

## Cách kiểm tra (Testing)
- Buoc 1: ...
- Buoc 2: ...
- Ket qua mong muon: ...

## Lưu ý khác
- Config/migration/env/contract changes neu co.
```

### Required checks tren GitHub

- `pr-policy`
- `backend-lint`
- `backend-unit`
- `backend-integration`
- `backend-migrations`
- `frontend-build`
- `frontend-e2e`

Khong mo PR neu required checks chua pass locally.

### Auto-merge

Auto-merge co the bat sau khi review + tat ca required checks pass.

## Phase C3/C4 Additions

Khi tao PR cho C3 hoac C4, them vao PR body:

```markdown
## C3/C4 Phase Contract

- [ ] Companion chat la trip-bound, khong phai global chatroom
- [ ] C3 MVP dung REST, khong WebSocket/SSE
- [ ] Chat tra proposedOperations, khong tu persist itinerary
- [ ] companion_service.py nam trong src/itineraries/, khong trong src/agent/
- [ ] apply-patch co owner-check
- [ ] Guest phai claim trip truoc khi chat
```