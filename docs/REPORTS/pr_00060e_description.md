## Mô tả

PR này hoàn tất phase `00060E` trên branch docs-only trước khi bắt đầu `C3A`: sửa lỗi render Mermaid ERD trong `README.md`, thêm phần giải thích ngắn cho các Mermaid diagram quan trọng, re-check active docs/source sync sau `00060D-FIX`, và cập nhật report index tương ứng.

Suggested title:

`docs: [#00060] fix final docs sync and mermaid rendering`

## Thay đổi chính

- fix Mermaid ERD trong `README.md` bằng cách thay các field có adjacent multi-key marker kiểu `FK` + `UK` sang `FK "unique"` để tương thích với GitHub Mermaid parser
- thêm mục `#### Cách đọc ERD` ngay sau Mermaid block để giải thích các bảng chính, quan hệ one-to-one hiện tại, và ý nghĩa của `FK "unique"`
- bổ sung giải thích ngắn sau các Mermaid block quan trọng trong `README.md` (backend/frontend architecture, generate/suggest, auth/claim, ETL) để reviewer đọc sơ đồ nhanh hơn mà không cần mở phase report
- verify lại toàn bộ active Mermaid blocks và static scan cho các pattern multi-key Mermaid attribute
- xác nhận active docs vẫn khớp current truth sau `00060D-FIX`:
  - `FloatingAIChat` wrong-city đã `FIXED_PRE_C3A`
  - browser `429` submit UX là `PASS`
  - pending claim flow dùng `sessionStorage (pendingClaim)` thay vì stale `localStorage (pendingClaims)`
  - frontend docs/test-count snapshot đã sync lại với current truth
  - chat session/message API vẫn deferred đến `C3A/C3B`
  - chat quota vẫn deferred đến `C3B`
- thêm report `docs/REPORTS/00060e_final_docs_sync_mermaid_fix.md`
- cập nhật `docs/REPORTS/REPORT.md` với snapshot `00060E`

## Cách kiểm tra (Testing)

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

git checkout main
git pull origin main

Select-String -Path README.md,docs/**/*.md -Pattern "\b(PK|FK|UK)\s+(PK|FK|UK)\b"

python - <<'PY'
from pathlib import Path
import re

files = [Path("README.md")] + list(Path("docs").rglob("*.md"))
out = Path(".tmp-mermaid-check")
out.mkdir(exist_ok=True)

count = 0
for path in files:
    text = path.read_text(encoding="utf-8")
    for i, m in enumerate(re.finditer(r"```mermaid\n(.*?)```", text, re.S), start=1):
        count += 1
        safe = str(path).replace("\\", "_").replace("/", "_").replace(":", "_")
        (out / f"{count:03d}_{safe}_{i}.mmd").write_text(m.group(1), encoding="utf-8")

print(f"extracted {count} mermaid blocks to {out}")
PY

$mmdFiles = Get-ChildItem .tmp-mermaid-check -Filter *.mmd
foreach ($f in $mmdFiles) {
  npx -y @mermaid-js/mermaid-cli -i $f.FullName -o "$($f.FullName).svg"
}

git diff --check
git diff --name-only -- Backend/src Frontend/src

Remove-Item -Recurse -Force .tmp-mermaid-check -ErrorAction SilentlyContinue
```

Expected:

- không còn match multi-key Mermaid attribute
- không có production source change
- Mermaid ERD trong `README.md` render được hoặc ít nhất không còn parser blocker do adjacent multi-key marker
- các Mermaid block quan trọng trong `README.md` đều có explanation ngắn ngay sau sơ đồ

## Lưu ý khác

- Phase này không sửa `Backend/src` hay `Frontend/src`.
- Không implement `C3A/C3B/C4`.
- Nếu Mermaid CLI thiếu Chromium/runtime dependency cục bộ, phải report rõ là `SKIPPED_WITH_REASON`, không được che lỗi.
- Các mục giải thích diagram được giữ ngắn để README vẫn là entrypoint gọn, không biến thành phase report dài.
