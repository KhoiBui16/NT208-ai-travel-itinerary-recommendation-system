# 00097 Post-C3A Docs Sync + Browser Validation

**Ngày:** 2026-06-11  
**Branch:** `fix/00097-d-post-c3a-docs-sync`  
**Scope:** Sync tài liệu active sau C3A, chạy lại local verification đầy đủ, và xác nhận browser flows quan trọng theo tinh thần của `docs/BROWSER_TEST_PLAN.md`.

## 1. Phạm vi đã sync

- Root docs: `README.md`, `CLAUDE.md`
- Runtime docs: `Backend/README.md`, `Frontend/README.md`
- Active project docs: `docs/01_overview.md`, `docs/02_architecture.md`, `docs/06_ai_roadmap.md`, `docs/09_execution_tracker.md`, `docs/11_phase_roadmap.md`, `docs/ARCHITECTURE_C3_C4_READINESS.md`
- Claude ops docs: `.claude/context/00_project_overview.md`, `.claude/commands/analyze-project.md`, `.claude/agents/doc-generator.md`
- Report index: `docs/REPORTS/REPORT.md`

## 2. Current truth đã chốt lại

- `C3A` đã merge (`PR #98-100`), không còn là “next gate”.
- Chat session foundation hiện là owner-only, trip-scoped, REST-based; chưa có real companion message flow hay chat history persistence.
- Playwright suite hiện có `33` test cases trong `15` spec files.
- Local Playwright full run hiện tại: `30 passed`, `3 skipped`.
- Backend test inventory hiện tại: `148` unit tests, `67` integration tests collected; full local integration run hiện ra `40 passed`, `27 skipped`.
- `FloatingAIChat` vẫn là mock/promo UI; chat thật hiện đi qua `ChatPanel`.

## 3. Runtime/browser fixes phải làm trong branch này

### 3.1 Trip generate e2e selector drift

**Vấn đề:**  
`Frontend/tests/e2e/trips.spec.ts` đang tìm placeholder cứng kiểu `Hà Nội|Phú Quốc`, trong khi `CreateTrip` hiện render placeholder động theo backend destinations.

**Fix:**  
Đổi sang selector ổn định hơn (`textbox` đầu tiên) để test không phụ thuộc copy runtime.

### 3.2 City browse -> city detail route contract mismatch

**Vấn đề phát hiện qua browser smoke:**  
`/cities` render destinations từ API nhưng link theo `id` số, trong khi `CityDetail` route contract lại đọc `slug` như `ha-noi`, `buon-ma-thuot`.

**Fix đã áp dụng:**

- `CityList` route API destinations bằng slug tạo từ tên thành phố
- `CityDetail` fallback sang API-backed rendering khi slug không nằm trong mock `cityData`

**Smoke evidence sau fix:**  
`/cities -> /cities/buon-ma-thuot` hiển thị `h1 = "Buôn Ma Thuột"` và không còn rơi vào `"Thành phố không tồn tại"`.

### 3.3 C3A chat session test quá brittle

**Vấn đề:**  
E2E đang khóa vào exact copy `3 phiên`, trong khi UI/runtime count có thể dao động do dữ liệu session thực.

**Fix:**  
Đổi assertion sang pattern ổn định hơn: hiển thị count dạng `\d+ phiên` và parse `count > 0`.

## 4. Verification commands

### Backend

```powershell
cd Backend
uv run ruff check src tests
uv run ruff format --check src tests
uv run alembic upgrade head
uv run alembic check
uv run pytest tests/unit -q --tb=short
uv run pytest tests/integration -q --tb=short
```

**Kết quả:**

- `ruff check`: PASS
- `ruff format --check`: PASS
- `alembic upgrade head`: PASS
- `alembic check`: PASS
- `pytest tests/unit`: PASS (`148 passed`)
- `pytest tests/integration`: PASS (`40 passed`, `27 skipped`)

### Frontend

```powershell
cd Frontend
npm run build -- --outDir .build-tmp\verify-00097d
$env:E2E_API_URL="http://localhost:8000"
npx playwright test --reporter=list
```

**Kết quả:**

- `npm run build`: PASS
- `playwright`: PASS (`30 passed`, `3 skipped`)

## 5. Browser coverage map vs `BROWSER_TEST_PLAN.md`

### Đã cover tốt trong 00097

- Test Case 1 Auth: `auth.spec.ts` cover register, login, protected redirect, guest claim sau login/register reload
- Test Case 2 Home/destination browse: `public.spec.ts` + smoke `/cities -> /cities/buon-ma-thuot`
- Test Case 4 AI generate short trip / readiness / timeout / 429 UX: `00057`, `00058`, `00060d`, `00060h`
- C3A browser flows: `00096-c3a-chat-session.spec.ts`
- Trip CRUD / workspace navigation: `trips.spec.ts`

### Chưa re-smoke đầy đủ trong branch 00097

- Full manual trip creation wizard end-to-end
- Public share-link view end-to-end
- Các legacy `b3` observation flows vẫn đang `skipped`

## 6. Đánh giá hiện tại

**Docs sync:** `PASS`  
Các file active không còn mô tả C3A như future phase, không còn giữ counts Playwright cũ, và không còn trỏ active docs về `docs/README.md` đã bị xoá.

**Runtime/browser stability:** `GOOD_WITH_LIMITATIONS`  
Core local stack hiện đủ ổn để mở PR cho branch sync này. Các flow auth, trip CRUD, guest claim continuity, C3A chat session foundation, city browse/detail contract, và rate-limit/timeout UX đã có bằng chứng browser-level.

## 7. Known non-blocking notes

- Suite vẫn còn `3 skipped` legacy `b3` flows.
- `00058` vẫn giữ note rằng full E2E 429 UX sâu hơn còn phụ thuộc issue lịch sử của calendar modal; tuy nhiên current suite vẫn PASS và không chặn PR này.
- Companion chat thực (`C3B`) và persisted history (`C4`) vẫn chưa implement; branch này không mở rộng scope sang các phase đó.

## 8. Kết luận

Branch `fix/00097-d-post-c3a-docs-sync` hiện đã:

- đồng bộ tài liệu active theo source truth sau C3A,
- sửa các drift browser/test phát hiện trong lúc verify,
- và đạt local verification đủ để mở PR và theo dõi CI.
