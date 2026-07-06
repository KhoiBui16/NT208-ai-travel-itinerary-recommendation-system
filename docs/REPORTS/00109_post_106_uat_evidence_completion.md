# 00109 — Post-#106 UAT Evidence Completion

Date: `2026-06-23`
Branch: `docs/00109-c-post-106-evidence-artifacts`
Scope: hoàn thiện browser UAT screenshot evidence còn thiếu sau audit 00108 + cleanup helper artifacts.

## Bối cảnh

Audit `00108` kết luận REST-only C3/C4 scope complete, không product blocker, nhưng thư mục evidence `docs/REPORTS/EVIDENCE/00108_post_106_full_e2e_audit/` bị rỗng vì script UAT chạy qua Playwright test runner bị kẹt (`waitForLoadState("networkidle")` hang + `.catch()` nuốt timeout → chụp trang blank/không chụp được).

## Root cause (xác nhận)

- `Frontend/playwright.config.ts` đã có `reuseExistingServer: !process.env.CI` → local reuse dev server (KHÔNG phải port conflict).
- Nguyên nhân thật: UAT script dùng `waitForLoadState("networkidle")` cho SPA có background activity (HMR/keep-alive) → hang tới timeout (45s/nav × nhiều nav). `.catch(() => {})` nuốt error nhưng `await` vẫn block → captures bị skip/chậm.

## Cách xử lý

Bỏ qua Playwright test runner; viết **direct chromium script** `Frontend/uat-00108.mjs` (dùng `chromium` từ `@playwright/test`, chạy bằng `node`):
- `page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 })` + `waitForTimeout` ngắn + `try/catch` mỗi step → 1 failure không làm mất tất cả screenshot.
- Auth qua API (`/auth/register`) + inject `accessToken`/`refreshToken` vào `localStorage`.
- Tạo trip + chat session qua API trước, rồi mở workspace + chat panel.

## Evidence captured

`docs/REPORTS/EVIDENCE/00108_post_106_full_e2e_audit/` — 10 screenshot (exit 0):

| File | Flow |
|---|---|
| `01-home.png` | Home `/` |
| `02-cities.png` | Cities list `/cities` |
| `03-city-rich-ha-noi.png` | Rich city detail `/cities/ha-noi` |
| `04-city-sparse-chau-doc.png` | Sparse city detail `/cities/chau-doc` (readiness advisory) |
| `05-trip-workspace.png` | Trip workspace (auth, real trip) |
| `06-chat-panel.png` | Chat panel opened |
| `07-chat-session-switcher.png` | Session switcher `<select>` + count bar |
| `08-chat-rename.png` | Rename inline input |
| `09-chat-delete-control.png` | Delete control (không xoá thật) |
| `10-chat-proposal-state.png` | Chat state hiện tại |

Tool tái tạo evidence: `Frontend/uat-00108.mjs` (chạy: `node uat-00108.mjs`, cần BE `:8000` + FE dev `:5173` đang chạy).

## Kết quả verification

- 10 file PNG tồn tại, kích thước khác nhau (124KB–952KB), states phân biệt (06 > 05 = chat panel render thêm content; 08 ≠ 06 = rename input mở) → nội dung thật, không blank/trùng.
- Không product bug mới phát hiện (khớp kết luận 00108).
- CI `frontend-e2e` full suite đã PASS trên PR #106 = browser evidence authoritative.

## Quyết định artifact

- **Commit**: 10 screenshot + `Frontend/uat-00108.mjs` (tool tái tạo) + caveman skill (`.claude/skills/caveman/SKILL.md`) + report này.
- **Sync active docs drift nhỏ**: tracker row 00107 `ready_for_pr`→`merged` (+ PR `#106`); 2 ISSUE docs `issue_etl_scheduler_missing` + `c3_chat_quota_shared_with_generate` mark `RESOLVED`.
- **Local-only (không commit)**: 5 file prompt handoff (`docs/REPORTS/00100/00106/00107/00108/00109_claude_code_*_prompt.md`).
- **Đã xoá**: `Frontend/tests/e2e/00108-uat-evidence.spec.ts` (superseded bởi `.mjs` — chạy qua test runner bị hang).

## Còn lại (non-blocking, optional sync sau)

- `docs/10_automation_testing_report.md` test count cũ (97+44) — historical report, không active-risk cao.
- `docs/REPORTS/docs_audit_2026_05_27.md` — historical snapshot.

## SSE/WebSocket/streaming

**Vẫn block đúng** — REST-only C3/C4 scope complete; chưa đến lượt streaming (MVP2+).
