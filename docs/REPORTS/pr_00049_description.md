# PR #49 — Docs Sync: Runtime Structure, Migration History, Test Counts, C.2 Status

## Mô tả

Sync toàn bộ docs/ với source code thực tế trên nhánh `docs/00049-d-readme-rewrite`. Không thay đổi logic, API contract, hay FE UI — chỉ cập nhật tài liệu sau khi merge C.2 SuggestionService (PR #49).

Bao gồm 3 report mới:
- `docs/REPORTS/docs_audit_2026_05_27.md` — Chi tiết 7 file docs audit vs source code
- `docs/REPORTS/phase_automation_testing_comprehensive.md` — Full automation test results
- `docs/REPORTS/phase_goong_etl_coverage_analysis.md` — Goong API coverage + gaps

## Thay đổi chính

### `docs/03_backend.md`
- **Xoá phần mô tả cấu trúc flat trùng lặp** (45 dòng `│   │   └── place.py` ... `└── Dockerfile`) — kiến trúc cũ không tồn tại
- **Runtime Structure by-domain đúng**: `auth/`, `itineraries/`, `places/`, `agent/`, `core/`, `etl/`, `geo/`, `shared/`
- **Thêm `src/geo/` + `src/shared/`**
- **Endpoint count**: 34 → 35 (thêm EP-30 suggest)
- **C.2 status**: `review_ready` → `merged` (PR #49)
- **Branch names Phase C**: C.3: `feat/00051-c3-companion-chat`, C.4: `feat/00052-c4-chat-history`, C.5: `feat/00053-c5-analytics-optional`

### `docs/05_database_etl.md`
- **Migration History**: Thêm `20260525_0004` (Goong metadata), `20260525_0005` (external_id→512), `20260525_0006` (chat tables future)

### `docs/06_ai_roadmap.md`
- **PR number C.2**: `#47` → `#49`, branch names C.3/C.4/C.5

### `docs/09_execution_tracker.md`
- **FE-BE summary**: 33→35 endpoints, 93+42+11→97+44+13 tests, thêm AI C.1 (#42) + C.2 (#49)

### `docs/10_automation_testing_report.md`
- **Pass/Fail criteria**: 11 e2e → 13 e2e

### `docs/11_phase_roadmap.md`
- **C.2**: `review_ready` → `merged` (PR #49)

### `docs/01_overview.md`
- **C.2**: `review_ready` → `merged`

## Cách kiểm tra (Testing)

```powershell
# Backend lint + unit (no DB)
cd Backend
uv run ruff check src tests
uv run pytest tests/unit/ -q --tb=short
# Expected: All checks passed, 97 passed

# Backend integration (cần Docker)
docker compose up -d
uv run pytest tests/integration/ -q --tb=short
# Expected: 37 passed, 7 skipped

# Verify docs vs source
ls Backend/src/           # by-domain pattern
ls Backend/alembic/versions/  # 6 migration files
```

## Lưu ý khác

- Không thay đổi API contract, không thay đổi FE UI
- Audit chi tiết: `docs/REPORTS/docs_audit_2026_05_27.md`
- Automation results: `docs/REPORTS/phase_automation_testing_comprehensive.md`
- Goong ETL gaps: `docs/REPORTS/phase_goong_etl_coverage_analysis.md`
- Gap còn lại: Phase C.3/C.4/C.5 chưa implement (đúng theo roadmap)
