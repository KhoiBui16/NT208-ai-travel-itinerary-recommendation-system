## Mô tả

Đây là PR docs/design review cho `00060B` nhằm kiểm tra kiến trúc hệ thống hiện tại và đưa ra quyết định Go/No-Go trước khi bắt đầu `C3` và `C4`.

Suggested PR title:

```txt
docs: [#00060] add architecture review and c3 c4 readiness plan
```

PR này không sửa production code. Phần trọng tâm là:

- đối chiếu product flow hiện tại với yêu cầu C3/C4
- chốt current architecture cho frontend/backend/data model
- xác định chat phải trip-bound, owner-only, không phải global chatbot
- kết luận mức readiness thực tế trước khi sang branch feature

## Thay đổi chính

- thêm `docs/ARCHITECTURE_C3_C4_READINESS.md`
- thêm `docs/C3_C4_IMPLEMENTATION_PLAN.md`
- thêm report `docs/REPORTS/00060b_architecture_c3_c4_readiness.md`
- cập nhật `docs/REPORTS/REPORT.md` với snapshot `00060B`
- đưa ra decision `GO_WITH_LIMITATIONS`
  - `C3A`: có thể bắt đầu
  - `C3B`: chưa nên bắt đầu trực tiếp
  - `C4`: chưa nên bắt đầu trực tiếp

## Cách kiểm tra (Testing)

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

git diff --check

git fetch origin --prune
git checkout main
git pull origin main
git log --oneline --decorate -30
git log --oneline --decorate --all --grep="00060" -80
```

Đối chiếu nội dung docs mới với:

- `docs/REPORTS/00059c_real_end_user_manual_uat.md`
- `docs/REPORTS/00060a_nested_subresource_authz_fix.md`
- `docs/USER_JOURNEY_UAT.md`
- `Backend/src/itineraries/models/chat.py`
- `Frontend/src/app/pages/TripWorkspace.tsx`
- `Frontend/src/app/components/FloatingAIChat.tsx`
- `Backend/src/core/rate_limiter.py`

## Lưu ý khác

- Phase này là docs/design review, không implement C3/C4.
- Không gọi Gemini/Goong/ETL thật trong branch này.
- Readiness decision cố ý không overclaim `GO` hoàn toàn.
- Khuyến nghị branch tiếp theo:

```txt
C3A — Chat Session Foundation
```
