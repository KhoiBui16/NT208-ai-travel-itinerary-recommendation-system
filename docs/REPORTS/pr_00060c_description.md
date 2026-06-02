## Mô tả

PR này sync lại `README.md`, technical docs, và report index với current source truth sau `00060A` và `00060B`, rồi chốt entry gate trước khi bắt đầu `C3A`.

Suggested title:

`docs: [#00060] add source docs readme sync and c3a entry gate`

## Thay đổi chính

- sync `README.md` với current readiness `GO_WITH_LIMITATIONS`
- sync active technical docs với source hiện tại:
  - chat tables đã có trong initial migration
  - `FloatingAIChat` vẫn là mock local-state
  - chưa có chat/session/message API trên `main`
  - `C3A` là next allowed phase; `C3B/C4` chưa direct start
- thêm `docs/REPORTS/00060c_source_docs_readme_sync_c3a_entry_gate.md`
- cập nhật `docs/REPORTS/REPORT.md` để index `00060C`
- bổ sung risk-to-phase mapping và `C3A must not do` vào C3/C4 plan docs

## Cách kiểm tra (Testing)

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location $ROOT

git diff --name-only -- Backend/src Frontend/src
git diff --check

git grep -n -E "chat_sessions|chat_messages|FloatingAIChat|rate:ai:|claimToken|shareToken" README.md docs Backend/src Frontend/src
git grep -n -E "C3A|C3B|GO_WITH_LIMITATIONS|shared viewer|guest.*claim.*chat" README.md docs docs/REPORTS
```

Expected:

- no production code changes
- no whitespace blocker
- active docs consistently say:
  - `C3A`: YES
  - `C3B` direct: NO
  - `C4` direct: NO
  - real AI not required for `C3A`

## Lưu ý khác

- Phase này không implement C3A/C3B/C4.
- Không gọi Gemini thật, Goong thật, hoặc ETL thật.
- Historical reports vẫn được giữ nguyên như snapshot evidence; current truth được chốt lại ở `00060C`.
