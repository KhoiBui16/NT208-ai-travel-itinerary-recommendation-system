## Mô tả

PR này bổ sung `00060D-FIX` trên branch `00060D`: sửa pre-C3A UX blockers còn lại ở frontend, gồm fix context bug của `FloatingAIChat`, browser-level submit-path `429` regression không gọi Gemini thật, và sync lại README/report tương ứng.

Suggested title:

`fix: [#00060] harden pre-c3a browser uat blockers`

## Thay đổi chính

- fix `Frontend/src/app/pages/TripWorkspace.tsx` để derive chat cities từ current trip state thay vì hardcode `Hà Nội`
- fix `Frontend/src/app/components/FloatingAIChat.tsx` để greeting/subtitle cập nhật theo trip context hiện tại
- harden `Frontend/src/app/pages/CreateTrip.tsx` với vùng lỗi `role="alert"` cho submit-path UX
- cập nhật `Frontend/src/app/utils/errorHandler.ts` để message `429` nói rõ thời gian chờ nếu có `Retry-After`
- thêm 2 Playwright regressions:
  - submit-path `429` UX qua route interception, không gọi Gemini
  - floating chat context cho non-`Hà Nội` trip
- sync `README.md`, `docs/REPORTS/00060d_real_fullstack_c3a_entry_verification.md`, `docs/REPORTS/REPORT.md`, và `docs/C3_C4_IMPLEMENTATION_PLAN.md` theo current truth mới

## Cách kiểm tra (Testing)

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

docker compose ps
Invoke-WebRequest -Uri "http://localhost:8000/api/v1/health" -UseBasicParsing
Invoke-WebRequest -Uri "http://localhost:5173" -UseBasicParsing

Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
uv run pytest tests/integration/ -v --tb=short

Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00060d-fix-pre-c3a
npx playwright test tests/e2e/00060d-pre-c3a-429-submit-ux.spec.ts --reporter=list
npx playwright test tests/e2e/00060d-pre-c3a-floating-chat-context.spec.ts --reporter=list
npx playwright test --reporter=list
```

Expected:

- frontend build pass
- 2 regression tests mới pass
- full Playwright suite pass
- report `00060D` kết luận:
  - `FloatingAIChat` wrong-city: `FIXED_PRE_C3A`
  - browser `429` submit UX: `PASS`
  - `C3A`: YES

## Lưu ý khác

- Phase này không implement `C3A/C3B/C4`.
- Không thêm ChatSession API hoặc ChatMessage flow.
- Submit-path `429` test đi qua browser thật nhưng intercept endpoint để không tiêu Gemini quota.
- `FloatingAIChat` vẫn chỉ là mock UI; fix này chỉ harden context bug trước khi vào `C3A`.
