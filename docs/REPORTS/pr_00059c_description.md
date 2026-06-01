## Mô tả

Branch này bổ sung bằng chứng manual UAT theo góc nhìn end-user thật cho phase `00059C`, dựa trên source hiện tại của `main` sau khi `00059A` và `00059B` đã merge. Phạm vi chỉ gồm tài liệu/evidence, không sửa production code, không gọi real Gemini, không gọi real Goong, và không chạy ETL thật.

PR title đề xuất:

`docs: [#00059] add real end-user manual UAT evidence`

## Thay đổi chính

- Thêm `docs/REPORTS/00059c_real_end_user_manual_uat.md`:
  - merge verification cho `00059A` và `00059B`
  - evidence startup local app theo guide hiện tại
  - sanity test evidence
  - real browser/manual UAT cho guest/auth/share/workspace/edit flows
  - API-level reproduction cho nested subresource authz gap
- Cập nhật `docs/USER_JOURNEY_UAT.md` với trạng thái evidence thực tế từ `00059C`
- Cập nhật `docs/REPORTS/ISSUES/issue_nested_trip_subresource_membership_authz_gap.md` với bằng chứng exploit cụ thể
- Cập nhật `docs/REPORTS/REPORT.md` để index phase `00059C`

## Cách kiểm tra (Testing)

Đã verify bằng local commands PowerShell-safe:

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

git checkout main
git pull origin main
git log --oneline --decorate --all --grep="00059" -40

docker compose up -d db redis

Set-Location "$ROOT\Backend"
uv run ruff check src tests
uv run ruff format --check src tests
uv run pytest tests/unit/ -v --tb=short
uv run uvicorn src.main:app --host localhost --port 8000

Set-Location "$ROOT\Frontend"
npm run build -- --outDir .build-tmp\verify-00059c-manual-uat
npx playwright test --reporter=list
npm run dev -- --host localhost --port 5173
```

Manual UAT evidence recorded in `docs/REPORTS/00059c_real_end_user_manual_uat.md`:

- homepage / CTA
- guest pending claim
- auth register/login/logout/session
- trip library/workspace
- edit persistence
- share/public shared route
- partial city warning
- mocked 429 / 422 / 503 UX
- API reproduction of nested subresource ownership bypass

## Lưu ý khác

- `00059C` xác nhận có thể đi tiếp sang phase review `00060`, nhưng chưa nên đi thẳng vào implementation-heavy C3/C4.
- Nested activity/accommodation membership authz gap vẫn là `OPEN / HIGH`.
- Artifact local như `.build-tmp*`, `test-results/`, screenshots/logs local không thuộc scope stage/commit của PR này.
