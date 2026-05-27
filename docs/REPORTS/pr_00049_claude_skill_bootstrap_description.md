## Mô tả

Bootstrap Claude Code instruction system de chuan bi cho Phase C3/C4.

PR nay khong implement C3/C4 feature. Muc tieu la lam ro rule, skill routing va workflow de cac task sau khong bi lech system design truoc khi trien khai Companion Chat va Chat History.

- Task ID: [#00049](https://[REDACTED]/t/00049)

## Thay đổi chính

- [x] Cap nhat `CLAUDE.md` voi Phase C3/C4 execution lock.
- [x] Cap nhat `AGENTS.md` de route task sang dung skill.
- [x] Them hoac cap nhat skill lien quan:
  - `c3-c4-readiness-review` — audit generate pipeline, rate limit, auth/AuthZ, data readiness
  - `source-plan-sync-review` — cap nhat C3/C4 additions
  - `fullstack-browser-debug` — them C3 browser flows
  - `goong-etl-readiness-review` — kiem tra Goong/ETL/data readiness
  - `git-pr-workflow` — gop /commit + /pr rules voi C3/C4 PR contract
- [x] Chong duong rule C3/C4:
  - C3 la trip-bound companion chat, khong phai global chatroom.
  - C3 MVP dung REST truoc, khong WebSocket/SSE.
  - Chat khong tu persist itinerary.
  - `apply-patch` moi update itinerary sau khi user confirm.
  - `companion_service.py` thuoc `Backend/src/itineraries/`.
  - Paid AI rate limit khong duoc fail-open khi Redis down.
- [x] Cap nhat vi du branch name theo dung format CI: `type/task-phase-scope`.

## Cách kiểm tra (Testing)

### Buoc 1: Kiem tra branch dung format

```bash
git status --short --branch
```

Expected branch:

```
chore/00049-c-claude-skill-bootstrap
```

### Buoc 2: Kiem tra diff

```bash
git diff main...HEAD
```

### Buoc 3: Review instruction/skill files

Review cac file:

```
CLAUDE.md
AGENTS.md
.claude/skills/
```

### Ket qua mong muon

- Branch name dung format `type/task-phase-scope`.
- Khong co thay doi business logic.
- Khong co thay doi UI/UX.
- Khong implement C3/C4.
- `CLAUDE.md` co execution lock ngan gon.
- `AGENTS.md` route dung skill.
- Khong tao skill trung lap.
- Khong con vi du branch sai format.

## Lưu ý khác

- Khong co thay doi `.env`.
- Khong co migration/schema change.
- Khong co API contract change.
- Khong can secret/config moi.
- PR nay chi chuan bi instruction system cho Claude Code truoc khi chay branch audit `docs/00050-c-c3-design-readiness-audit`.
