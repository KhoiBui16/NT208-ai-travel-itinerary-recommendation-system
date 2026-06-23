# 00116 — Technical Development Docs Sync Report

**Task:** Xây dựng & đồng bộ bộ tài liệu kỹ thuật phát triển tiếng Việt theo source truth hiện tại.
**Branch:** `docs/00116-d-technical-development-docs` (từ `main` `759b934`)
**Loại:** Docs-only (không đổi product code).
**Ngày:** 2026-06-24

---

## 1. Branch / HEAD

- Base: `main` @ `759b934 fix: [#00114] close business uat polish backlog (#109)` (Phase C.0–C.4 đã merge).
- Branch mới: `docs/00116-d-technical-development-docs` (khớp regex `^(feat|fix|docs|...)/[0-9]+-(...)-d-[a-z0-9-]+$`).
- Product code SACH; không tạo worktree/clone/Docker stack mới (đúng hard scope).

## 2. Sub-agent đã tạo và kết quả

| Sub-agent (Explore) | Scope | Kết quả |
|---|---|---|
| README ownership map | Map 2302 dòng README → owner (keep/move/delete) | Trả bảng section-by-section; xác nhận ~80% nội dung ĐÃ CÓ trong `docs/` (arch/DB/AI/auth/ETL/tests duplicate); phát hiện duplicate section 5.3, thiếu section 4.5; đề xuất landing-page TOC ~10 mục |
| Stale-claim audit | Grep active docs + README + context cho claim cũ | Bắt test count `199 passed/30 skipped` + `148 unit/67 integration`, C.4 `wip`, C3C apply-patch "còn thiếu"; xác nhận KHÔNG có file nào claim C.5 done (đúng) |

Cả 2 hoàn tất (không gặp 429 như task 00115).

## 3. Skills đã dùng

- `source-plan-sync-review`: so docs vs source truth (test count, phase status, endpoint).
- `git-pr-workflow`: branch regex + squash commit `docs: [#00116] ...` + PR body 4 header VN.
- `code-review`: review diff cuối (no product code, no secret, no absolute path).
- `goong-etl-readiness-review`: tham chiếu ETL/Goong/data claims trong docs.
- `db-migration`: verify schema/migration claims (alembic check clean, 9 migrations).
- Không cần `c3-c4-readiness-review` (C3/C4 đã merge).

## 4. Files audited

`README.md` (108KB/2302 dòng), `Backend/README.md`, `Frontend/README.md`, `docs/{01,02,03,04,05,06,08,09,10,11}_*.md`, `docs/INDEX.md`, `docs/STAGING_DEPLOYMENT_GUIDE.md`, `.claude/context/*.md`, `CLAUDE.md`, `AGENTS.md`, `Backend/src/core/config.py`, `docker-compose.yml`.

## 5. Documentation architecture decision

- **Root README = landing page** (108KB → ~430 dòng). Deep content (arch/DB/API/auth/AI/ETL/tests) **đã tồn tại** trong `docs/` → chỉ link, không copy.
- **Không tạo doc file mới** (`12_api_reference`/`13_configuration`/`14_deployment`/`15_developer_guide`) vì các chủ đề đã có owner: API → `docs/03` + `Backend/README`; config → `STAGING_DEPLOYMENT_GUIDE` env table + `config.py`; deploy → `STAGING_DEPLOYMENT_GUIDE`. Đúng nguyên tắc "prefer existing, don't duplicate".
- **Backend/README + Frontend/README** giữ vai trò sub-system README (đã tốt, chỉ fix stale).
- **`docs/INDEX.md`** = canonical TOC (refresh ngày + con trỏ current-status).

## 6. Root README changes

- Viết lại toàn bộ: header/badges, Mô tả, Tính năng (fix C.3B `review-ready`→done, C.4 `partial`→done), Tech Stack (giữ nguyên), **Tổng quan kiến trúc** (1 mermaid mới + đoạn ngắn + link `docs/02`), Cấu trúc repo (condensed, số liệu mới), Quick Start (giữ 2 cách, PowerShell-safe), Tình trạng phát triển (phase table C.0–C.4 merged/C.5 optional), Testing (187 unit + 77 integration/14 specs), Deployment (link runbook), Tài liệu chi tiết (link `docs/`), Team, Video.
- Xóa: section 1.1 verbose, 3 High-Level (dup `docs/02`), 4 Low-Level (dup `docs/03`/`04`), 5 DB/ERD (dup `docs/05`), 5.3 duplicate, 6 API, 7 User Flow, 8 AI Pipeline (dup `docs/06`), 9 Auth/Security, 10 Phase C (dup `docs/06`), 13 Tests (dup `docs/08`), 14 ETL (dup `docs/05`).

## 7. Backend README/docs changes

- `Backend/README.md`: status C.3B/C.3C → merged (#105), thêm row C.4 merged (#106), "Remaining AI" → chỉ C.5; test count `199/30` → `187 unit + 77 integration`; thêm namespace `rate:ai:apply_patch:user:*` vào bảng quota.
- `docs/03_backend.md`: section "## 11. Backend còn thiếu" viết lại — C3B/C3C/C4 → merged; C.5 → optional/deferred chưa implement.

## 8. Frontend README/docs changes

- `Frontend/README.md`: "Remaining AI UI" (session switcher còn polish) → C.4 session management merged (#106); e2e `17 spec/33 passed` → `14 spec files`, CI green #109.

## 9. AI docs changes

- Qua `docs/03` section 11 + `docs/11` snapshot + `README` phase table: C.1/C.2/C.3A/C.3B/C.3C/C.4 → merged; C.5 Analytics → optional/deferred (chưa implement, `/agent/analytics` route absent, `enable_analytics=false`). Không claim happy-path AI (Gemini provider).

## 10. ETL/database/Redis docs changes

- Không đổi `docs/05_database_etl.md` (đã current 06-22). Qua `README` architecture + deploy section ghi rõ: ETL scheduler opt-in (compose profile `etl`, seed một lần), Redis TCP client (KHÔNG Upstash REST), rate-limit fail-closed, 9 migrations, alembic check clean.

## 11. API/testing/deploy/config docs changes

- **API:** tham chiếu `docs/03` + `Backend/README` (6 router prefix `/auth /users /itineraries /shared /places /agent` + `/health`, 29 route handlers).
- **Testing:** `docs/08_testing_local_run.md` + `docs/01_overview.md` test count → `187 unit + 77 integration`; e2e 14 specs.
- **Deploy:** `docs/STAGING_DEPLOYMENT_GUIDE.md` section 14 viết lại (C3A–C4 → merged), framing "trước C3A" → "HEAD #109", row `ENABLE_ANALYTICS` → "C.5 chưa implement".
- **Config:** qua `config.py` verify env map (6 secrets + AI rate limits + 28 ETL cities + production validator). Không tạo `docs/13_configuration.md` (đã có trong deploy guide).

## 12. Diagrams added/updated

- README: **1 mermaid mới** `flowchart` kiến trúc tổng quan (Frontend → /api/v1 routers → services → PostgreSQL/Redis → Gemini/Goong). Hợp lệ (fenced ```mermaid).

## 13. Source evidence used

- `pytest --collect-only`: **187 unit + 77 integration**.
- Routers: `agent, auth, itineraries (+shared), places, main(health)` — **29 route handlers**; **9 migrations**; alembic head `20260622_0009`.
- FE: **26 pages, 25 routes, 6 services, 2 type files, 14 e2e specs**.
- `config.py`: env priority init>env>.env>config.yaml>defaults; production validator block dev JWT + analytics-without-db.
- `docker-compose.yml`: api:8000, db:5432 (postgres:16), redis:6379 (LRU 128mb), scheduler gated profile `etl`.

## 14. Checks/tests đã chạy

| Check | Kết quả |
|---|---|
| `uv run ruff check src tests` | **All checks passed!** (cảnh báo EPERM `.ruff_cache` = artifact Windows, không phải lint fail) |
| `uv run alembic check` | **No new upgrade operations detected** (schema clean) |
| `npm run build -- --outDir .build-tmp/docs-spec` | **✓ built in 17.15s** (chunk 1.2MB warning — non-blocking, pre-existing) |
| Stale grep active docs | Sạch (chỉ còn dated-log cell `docs/11:88` 2026-06-20 = historical) |

## 15. Files intentionally NOT touched

- `docs/09_execution_tracker.md` (historical tracker — snapshot-at-time).
- `docs/02_architecture.md`, `docs/04_frontend.md`, `docs/05_database_etl.md`, `docs/06_ai_roadmap.md` (đã current, cập nhật 06-22).
- `docs/11_phase_roadmap.md:88` (dated verification-log cell, historical).
- `.claude/settings.json` (harness local-only, không bao giờ commit).
- Evidence PNGs, prompt `.md` handoff (không commit trừ khi yêu cầu).
- `06_backend_phases.md` (historical phase doc).

## 16. Remaining documentation gaps

- FE bundle 1.2MB — đề xuất code-splitting (optimization, không blocker).
- Đã có thể bổ sung `docs/12_api_reference.md` (tách endpoint detail) nếu muốn API reference độc lập — hiện đủ trong `docs/03` + `Backend/README`.
- Không có doc load/performance testing (LOW priority, INDEX đã note).

## 17. PR / CI status

- Commit: `docs: [#00116] build technical development documentation` (squash, no Co-Authored-By).
- PR title trùng commit title; body 4 header VN (`Mô tả` / `Thay đổi chính` / `Cách kiểm tra` / `Lưu ý khác`).
- CI: docs-only nên mong đợi `backend-lint/unit/integration/migrations` + `frontend-build` + `frontend-e2e` xanh (không đổi code).

## 18. Merge readiness verdict

**READY.** Docs-only, không product code. Verify ruff/alembic/build pass. Active docs đã source-verified, không còn claim cũ (trừ dated historical cells cố ý giữ). README từ 108KB → landing page ~430 dòng, cấu trúc 3 tầng rõ ràng (root README → sub-README → docs/NN).
