## Mô tả

Audit design readiness trước khi implement Phase C3 (companion chat) và C4 (chat history).

PR này không implement C3/C4 feature. Mục tiêu là tạo bộ báo cáo evidence-based để team biết C3/C4 đã sẵn sàng chưa, gap nào cần fix trước, và branch roadmap ra sao.

- Task ID: [#00050](https://[REDACTED]/t/00050)

## Thay đổi chính

- [x] `generate_pipeline_readiness.md` — Audit 13 checkpoints trên C.1 pipeline: direct pipeline, DB context, Pydantic validation, retry, budget tolerance, transaction/rollback, logs, guest claimToken. **Kết luận: READY với 3 gaps không block.**
- [x] `rate_limit_policy_review.md` — Review rate limit auth user vs guest: generate quota, chat quota, Redis fail-closed. **Kết luận: Quota companion chat shared với generate — HIGH priority fix khi C3 implement.**
- [x] `auth_authorization_use_cases_for_c3.md` — Checklist 17 use cases: 10 đã implement (MVP2), 7 cần verify khi C3/C4 code.
- [x] `phase_c3_design_readiness.md` — Tổng hợp 4 design gaps: stale patch handling, chat quota riêng, session lifecycle, API contract schema.
- [x] `phase_c3_data_readiness.md` — Goong/ETL readiness: Hà Nội đủ dev, Đà Nẵng + TP.HCM chưa ETL.
- [x] `REPORT.md` — Cập nhật index với Phase C3/C4 readiness audits.
- [x] Issue: `c3_stale_patch_handling_missing.md` — Stale patch race condition chưa có mechanism (HIGH).
- [x] Issue: `c3_chat_quota_shared_with_generate.md` — Companion chat quota shared với generate, will block UX (HIGH).

## Cách kiểm tra (Testing)

### Bước 1: Review reports

```bash
git log --oneline main..HEAD
```

### Bước 2: Đọc reports

```
docs/REPORTS/generate_pipeline_readiness.md
docs/REPORTS/rate_limit_policy_review.md
docs/REPORTS/auth_authorization_use_cases_for_c3.md
docs/REPORTS/phase_c3_design_readiness.md
docs/REPORTS/phase_c3_data_readiness.md
docs/REPORTS/phase_c3_verification_results.md
docs/REPORTS/REPORT.md
docs/REPORTS/ISSUES/c3_stale_patch_handling_missing.md
docs/REPORTS/ISSUES/c3_chat_quota_shared_with_generate.md
```

### Bước 3: Kiểm tra không có code C3/C4

```bash
git diff main...HEAD -- "Backend/src/**" "Frontend/src/**"
```

### Bước 4: Real verification (xác nhận audit không block C3/C4)

```bash
cd Backend
uv run ruff check src tests         # ✅ Must pass
uv run ruff format --check src tests # ✅ Must pass
uv run alembic check               # ✅ Must show (head)
uv run pytest tests/unit/ -v       # ✅ 97 passed
uv run pytest tests/integration/ -v # ✅ 37 passed
cd ../Frontend
npm run build                      # ⚠️ Known local EPERM block
npm run test:e2e                   # ⏸️ Skipped if FE build blocked
```

### Verification Results Summary (2026-05-28)

| Gate | Status |
|---|---|
| BE lint + format | ✅ PASS |
| Alembic | ✅ `20260525_0005 (head)` |
| BE unit (97 tests) | ✅ PASS |
| BE integration (37 tests) | ✅ PASS |
| HTTP /health | ✅ 200 |
| HTTP /places/destinations | ✅ 200 |
| FE build | ❌ EPERM (known local issue) |
| FE e2e | ⏸️ Skipped (FE build block) |

**Conclusion**: BE codebase READY for C3/C4. FE build block is local environment issue, not code issue.

### Kết quả mong đợi

- Branch name đúng format: `docs/00050-c-c3-design-readiness-audit`
- Không có thay đổi business logic
- Không implement C3/C4
- Reports đúng format, evidence-based
- Issues rõ ràng, prioritized

## Lưu ý khác

- Không có thay đổi `.env`
- Không có migration/schema change
- Không có API contract change
- **Recommended next branch**: `feat/00051-c-c3-chat-session-foundation` (xây chat sessions table + API trước companion chat)

## C3/C4 Phase Contract

- [x] companion chat la trip-bound, khong phai global chatroom
- [x] C3 MVP dung REST, khong WebSocket/SSE
- [x] Chat tra proposedOperations, khong tu persist itinerary
- [x] companion_service.py nam trong src/itineraries/, khong trong src/agent/
- [x] apply-patch co owner-check
- [x] Guest phai claim trip truoc khi chat
