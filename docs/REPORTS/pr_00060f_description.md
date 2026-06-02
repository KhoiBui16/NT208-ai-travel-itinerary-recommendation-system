## Mô tả

PR này tạo phase `00060F` cho deployment readiness trước khi đi xa hơn ở `C3A`: inventory source/config hiện tại, chốt kiến trúc staging phù hợp, thêm guide deploy staging theo current truth, và sync report index tương ứng.

PR title đề xuất:

`docs: [#00060] add staging deployment readiness and ci cd plan`

## Thay đổi chính

- Tạo `docs/STAGING_DEPLOYMENT_GUIDE.md` với:
  - kiến trúc staging đề xuất;
  - platform decision Vercel / Render / Postgres / Redis;
  - env var checklist;
  - migration strategy manual-first;
  - CORS settings theo source thật;
  - smoke test checklist;
  - rollback và known limitations trước `C3A/C3B/C4`.
- Tạo `docs/REPORTS/00060f_staging_deployment_readiness.md` để ghi:
  - source deployment inventory;
  - option comparison;
  - required user-provided values;
  - manual-first deploy recommendation trước khi bật auto-deploy.
- Tạo `docs/REPORTS/pr_00060f_description.md` đúng template repo.
- Update `docs/REPORTS/REPORT.md` để thêm snapshot `00060F`.
- Mở track lại `Frontend/vercel.json` trong `.gitignore` để SPA rewrite config thật sự đi cùng PR.
- Thêm `Frontend/vercel.json` để Vercel xử lý SPA deep-link fallback cho `createBrowserRouter`.
- Thêm pointer ngắn trong `README.md` sang staging deployment guide.

## Cách kiểm tra (Testing)

Đã verify trong workspace:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

git diff --check
git diff --name-only -- Backend/src Frontend/src

Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00060f-staging

Set-Location "$ROOT\Backend"
uv run alembic check

Set-Location $ROOT
# Chạy lại local-path scan và secret scan theo prompt 00060F
```

Expected:

- Không có `Backend/src` hoặc `Frontend/src` production source change
- `Frontend/vercel.json` có rewrite SPA hợp lệ
- `npm run build` pass
- `uv run alembic check` pass
- Docs/report active không chứa local machine path hoặc secret thật

## Lưu ý khác

- `00060F` là branch docs/config sạch từ `main` sau khi `00060E-R2` đã merge.
- Phase này chỉ chuẩn bị readiness + runbook, chưa deploy thật.
- Chưa thêm GitHub Actions deploy workflow vì current recommendation là manual-first rồi mới bật auto-deploy khi staging smoke ổn định.
