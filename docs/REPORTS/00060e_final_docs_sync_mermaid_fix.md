# 00060E Final Docs Sync + Mermaid Render Fix

Ngày cập nhật: 2026-06-02
Branch báo cáo: `docs/00060-e-final-docs-sync-mermaid-fix`
PR title đề xuất: `docs: [#00060] fix final docs sync and mermaid rendering`

## 1. Executive summary

- Mermaid ERD render fixed? `YES`
- Static Mermaid multi-key scan pass? `YES`
- Mermaid CLI render pass? `YES`
- README diagram explanations added? `YES`
- Active technical docs audited against current source? `YES`
- Source/docs sync status: `SYNCED`
- Can proceed to `C3A`? `YES`
- Can proceed to `00060F` deployment readiness after merge? `YES`

## 2. Root cause

GitHub Mermaid ERD parser không chấp nhận nhiều attribute key marker trên cùng một field theo kiểu hai marker liền nhau:

```txt
int trip_id FK + UK
```

Với các field vừa là foreign key vừa unique, syntax an toàn hơn là chỉ giữ một key marker và chuyển semantics còn lại thành comment:

```txt
int trip_id FK "unique"
```

Điều này giữ đúng meaning của source model nhưng tránh parser error khi GitHub render block Mermaid trong `README.md`.

## 3. Files updated

| File | Change | Why |
|---|---|---|
| `README.md` | Sửa Mermaid ERD `FK "unique"`, thêm `Cách đọc ERD`, bổ sung giải thích ngắn sau các Mermaid block quan trọng, và sync lại vài dòng drift `pendingClaim/sessionStorage` + Playwright count | Fix parser blocker, giúp reviewer đọc sơ đồ dễ hơn, và giữ README bám current source sau `00060D-FIX` |
| `docs/04_frontend.md` | Sync lại `pendingClaim` dùng `sessionStorage`, cập nhật Playwright count, và note `FloatingAIChat` context bug đã được fix pre-C3A | Loại bỏ drift giữa docs FE và source/runtime hiện tại |
| `docs/ARCHITECTURE_C3_C4_READINESS.md` | Bỏ mô tả hardcoded `Hà Nội`, thay bằng current truth: context derive từ trip nhưng panel vẫn mock | Giữ readiness doc khớp `00060D-FIX` |
| `docs/REPORTS/REPORT.md` | Thêm snapshot/index cho `00060E` | Ghi nhận phase docs-only cuối trước `C3A` |
| `docs/REPORTS/00060e_final_docs_sync_mermaid_fix.md` | Tạo report phase `00060E` | Lưu root cause, validation, và readiness decision |
| `docs/REPORTS/pr_00060e_description.md` | Tạo PR body đúng template | Chuẩn bị PR docs-only nếu user approve |

## 4. Diagram validation

| Check | Status | Evidence |
|---|---|---|
| Base `main` contains `00060D-FIX` | `PASS` | `60bc041 fix: [#00060] harden pre-c3a browser uat blockers (#71)` |
| Mermaid block inventory completed | `PASS` | Active Mermaid blocks found in `README.md` and `docs/ARCHITECTURE_C3_C4_READINESS.md` |
| Static scan for multi-key attributes before fix | `FOUND_2` | `README.md:673`, `README.md:681` |
| Static scan for multi-key attributes after fix | `PASS` | No matches for `\\b(PK|FK|UK)\\s+(PK|FK|UK)\\b` in active docs |
| Mermaid CLI render | `PASS` | `@mermaid-js/mermaid-cli` rendered all 14 extracted Mermaid blocks successfully (`FAIL_COUNT=0`) |
| README diagram explanations | `PASS` | Added concise explanation sections after key Mermaid blocks in architecture, auth, AI flow, and ETL sections |

## 5. Source/docs sync check

| Topic | Status | Notes |
|---|---|---|
| `FloatingAIChat` wrong-city fixed before `C3A` | `PASS` | Active docs still say `FIXED_PRE_C3A` after `00060D-FIX` |
| Browser `429` submit UX | `PASS` | Active docs still say browser submit-path regression is `PASS` |
| Chat session/message API deferred | `PASS` | Docs keep `C3A/C3B` boundary intact |
| Chat quota deferred to `C3B` | `PASS` | No active doc overclaims chat quota as implemented |
| Pending claim storage location | `PASS` | README and `docs/04_frontend.md` now match `sessionStorage (pendingClaim)` instead of stale `localStorage (pendingClaims)` wording |
| Playwright regression counts | `PASS` | README file tree and `docs/04_frontend.md` now align with current 24-test / 21 passed, 3 skipped snapshot |
| `C3A` does not call Gemini | `PASS` | README + plan still keep real AI out of `C3A` |
| Shared view has no owner chat controls | `PASS` | Active docs preserve the shared/public boundary |
| README diagram semantics are understandable to reviewer | `PASS` | Added short explanations for ERD, backend/frontend architecture, generate/suggest, auth/claim, and ETL flows |

## 6. Remaining issues

| Issue | Target phase | Reason |
|---|---|---|
| Chat session/message API chưa có | `C3A` / `C3B` | Đây vẫn là implementation work, không phải docs fix |
| Chat quota riêng chưa có | `C3B` | `00060E` chỉ sửa docs/render blocker |
| `FloatingAIChat` vẫn là mock UI | `C3A` | Context bug đã fix, nhưng session-aware panel chưa được implement |
