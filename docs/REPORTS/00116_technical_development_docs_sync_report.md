# 00116 — Technical Development Docs Sync Report (fix-up pass)

**Task:** Đồng bộ bộ tài liệu kỹ thuật phát triển tiếng Việt theo source truth hiện tại (HEAD `#109`).
**Branch:** `docs/00116-d-technical-development-docs` (từ `main` `759b934`).
**Loại:** Docs-only (không đổi product code; duy nhất một sửa docstring comment-only trong `companion_service.py` — đã ghi rõ lý do ở mục 9).
**Ngày:** 2026-06-24.

> Bản report này thay thế nội dung report cũ của commit `a7c3505`. Audit theo dõi (post-#109) phát hiện docs chưa đồng bộ thật (số liệu FE/BE cũ, claim C3/C4 "todo/planned", framing Gemini "tool-calling", broken links trong INDEX). Pass này sửa dứt điểm trên cùng branch/PR #110.

---

## 1. Branch / HEAD

- Base: `main` @ `759b934 fix: [#00114] close business uat polish backlog (#109)` (Phase C.0–C.4 đã merge).
- Branch: `docs/00116-d-technical-development-docs` (khớp regex `^(feat|fix|docs|...)/[0-9]+-(...)-d-[a-z0-9-]+$`).
- Commit đầu: `a7c3505 docs: [#00116] build technical development documentation`; commit fix-up `e3395c3 docs: [#00116] complete technical docs source sync`; pass finalize này = commit thứ ba (`docs: [#00116] finalize report and wording sync`) trên cùng branch.
- Product code sạch; không tạo worktree/clone/Docker stack mới (đúng hard scope).

## 2. Source truth được dùng làm chuẩn (authoritative, verify lại pass này)

| Metric | Giá trị | Phương pháp verify |
|---|---|---|
| `/api/v1` routes | **41** (14 GET / 16 POST / 5 PUT / 5 DELETE / 1 PATCH) | `from src.main import app` + enumerate `app.routes` |
| Itinerary + chat + shared routes | **23** (14 CRUD + 8 chat/apply-patch + 1 shared) | grep `@router.*` trong `itineraries/router.py` |
| FE pages | **27** | `find Frontend/src/app/pages -name "*.tsx"` |
| FE routes | **26** | grep `path:` trong `routes.tsx` |
| FE services / type files | 6 / 2 | `ls services/` + `types/` |
| E2e spec files | **17** (14 top-level + 3 `b3/`) | `find Frontend/tests -name "*.spec.*"` |
| E2e test cases | **36** | `npx playwright test --list` ("Total: 36 tests in 17 files") |
| BE tests | **187 unit + 77 integration** (43 int pass + 34 CI-gated skip local) | `pytest --collect-only` |
| Migrations | **9** (head `20260622_0009`) | `alembic` + `versions/` |
| `CamelCaseModel` path | `Backend/src/core/schema.py` (KHÔNG phải `schemas/common.py`) | grep |

## 3. Sub-agent audit (Explore, scope hẹp)

| Sub-agent | Scope | Kết quả |
|---|---|---|
| AI/ETL/.claude stale | `docs/06`, `docs/02`, `.claude/context/05`, `STAGING`, `companion_service.py`, `docs/03` | 23 stale claim: C3/C4 "todo", Gemini "tool-calling", apply-patch "future", count cũ, missing env knobs |
| Frontend docs stale | `docs/04`, `Frontend/README`, `docs/08`, `docs/10`, `LOCAL_MANUAL_UAT`, `USER_JOURNEY_UAT`, `00109` | 12 điểm: count test "35/32", thiếu `chat.ts`, overclaim cancel/stale e2e, "14 spec" |
| Overview/INDEX/README-cut | `docs/01`, `docs/INDEX`, root `README`, sub-README "Latest" labels | 9 điểm: 2 broken link INDEX, 3 date/label, 4 claim C4 partial/AI pending; xác nhận toàn bộ section README cắt đều có owner doc |

Cả 3 hoàn tất (không gặp 429).

## 4. Root README cut — kiểm tra migrated content

Root README giảm từ 2302 dòng → ~430 dòng (landing page). Mọi section kỹ thuật bị cắt đều **đã tồn tại** trong doc owner (xác nhận bởi sub-agent):

| Section cắt khỏi README | Owner doc | Có nội dung? |
|---|---|---|
| High-Level Architecture | `docs/02_architecture.md` | ✅ |
| Low-Level (Backend/Frontend) | `docs/03_backend.md` + `docs/04_frontend.md` | ✅ |
| Database/ERD | `docs/05_database_etl.md` | ✅ |
| API Reference | `docs/03_backend.md` | ✅ |
| AI Pipeline | `docs/06_ai_roadmap.md` | ✅ |
| Auth/Security | `docs/02` + `docs/03` | ✅ |
| Tests | `docs/08_testing_local_run.md` + `docs/10` | ✅ |
| ETL | `docs/05_database_etl.md` | ✅ |

README giữ vai trò landing page: Mô tả, Tech Stack, kiến trúc tổng quan (1 mermaid), cấu trúc repo, Quick Start (PowerShell-safe), phase status, testing, deployment, link `docs/`. Sub-README (`Backend/`, `Frontend/`) độc lập, dùng được riêng.

## 5. 23-topic technical coverage matrix

Mỗi chủ đề kỹ thuật có đúng một owner doc (nguyên tắc prefer-existing, không duplicate, không tạo file mới):

| # | Chủ đề | Owner doc | Trạng thái sync |
|---|---|---|---|
| 1 | Tổng quan dự án | `README.md` + `docs/01_overview.md` | ✅ C0–C4 merged |
| 2 | Kiến trúc tổng quan FE-BE-DB-Redis-AI | `docs/02_architecture.md` + README mermaid | ✅ |
| 3 | Tech stack | `README.md` | ✅ |
| 4 | Backend runtime structure | `docs/03_backend.md` + `Backend/README.md` | ✅ |
| 5 | API reference (41 routes) | `docs/03_backend.md` | ✅ (thêm 8 route chat/apply-patch) |
| 6 | Auth/JWT/refresh/reset | `docs/03_backend.md` | ✅ |
| 7 | Itinerary CRUD/share/claim/rating | `docs/03_backend.md` | ✅ |
| 8 | Companion chat + apply-patch (C.3) | `docs/06_ai_roadmap.md` + `docs/03_backend.md` | ✅ merged #98-105 |
| 9 | Chat session management (C.4) | `docs/03_backend.md` + `docs/06` | ✅ merged #106 |
| 10 | Places/cache/Redis fail-open | `docs/03_backend.md` + `docs/05` | ✅ |
| 11 | Suggestion service DB-only (C.2) | `docs/06_ai_roadmap.md` + `docs/03` | ✅ merged #49 |
| 12 | AI generate pipeline (C.1) | `docs/06_ai_roadmap.md` | ✅ merged #42 |
| 13 | Gemini integration (JSON MIME + Pydantic) | `docs/06` + `.claude/context/05` | ✅ (sửa tool-calling→prompt-driven) |
| 14 | Rate limit policy (fail-closed) | `Backend/README.md` + `.claude/context/05` | ✅ (gồm apply-patch quota) |
| 15 | Database schema/ERD | `docs/05_database_etl.md` | ✅ |
| 16 | ETL pipeline (Goong/OSM) | `docs/05_database_etl.md` + `Backend/README.md` | ✅ |
| 17 | Migrations (Alembic, 9) | `docs/05_database_etl.md` + `Backend/README.md` | ✅ |
| 18 | Frontend routing/components | `docs/04_frontend.md` + `Frontend/README.md` | ✅ |
| 19 | FE API client + auth/guest-claim flow | `docs/04_frontend.md` + `Frontend/README.md` | ✅ |
| 20 | Testing (unit/integration/e2e/UAT) | `docs/08` + `docs/10` + `LOCAL_MANUAL_UAT_GUIDE` | ✅ (count thật) |
| 21 | Config/env vars | `docs/03_backend.md` + `STAGING_DEPLOYMENT_GUIDE` + `Backend/README.md` | ⚠️ partial (by design — xem mục 6) |
| 22 | Deployment (staging) | `STAGING_DEPLOYMENT_GUIDE.md` | ✅ |
| 23 | Workflow/CI/PR rules | `docs/07_workflow_ci.md` + `CLAUDE.md` | ✅ |

Bonus: C.5 Analytics Text-to-SQL — optional/deferred, owner `docs/06_ai_roadmap.md` mục 6; KHÔNG claim done.

**Quyết định kiến trúc docs:** KHÔNG tạo `12_api_reference` / `13_configuration` / `14_deployment` / `15_developer_guide` mới — các chủ đề đã có owner ở trên (đúng nguyên tắc prefer-existing).

## 6. Stale claim đã sửa (pass fix-up này)

**Backend/API (`docs/03_backend.md`, `CLAUDE.md`, `Backend/README.md`):**
- `docs/03`: header "Itinerary endpoints (14)" → "(22)"; total "35 endpoints ... merge C.2" → "41 `/api/v1` endpoints ... merge C.4"; test count "125 unit/51 integration" → "187/77"; `schemas/common.py` → `src/core/schema.py`; comment `/agent` "chat/apply-patch chưa implement" → "nằm trong itineraries router"; `TODO C.3 tools/` → "JSON prompt-driven". **Thêm bảng "Chat & apply-patch endpoints (8 routes)"** vào API reference.
- `CLAUDE.md`: "39 endpoints" → "41 `/api/v1` routes"; "14 spec files" → "17 spec files".
- `Backend/README.md`: nhãn "Latest" report → snapshot-dated.

**Kiến trúc/AI (`docs/02_architecture.md`, `docs/06_ai_roadmap.md`, `.claude/context/05`):**
- `docs/02`: gate "future target C3B/C3C, chưa có /agent/chat" → "Phase C.3–C.4 merged #98-106"; endpoint `/agent/chat` + `/agent/apply-patch` → `/itineraries/.../messages` + `/itineraries/{tripId}/apply-patch`; "Call LLM với tool definitions" → "Build JSON prompt + call Gemini (JSON MIME)"; `companion_service.py` "Service (planned)" → "đã implement"; FE file-map `ChatPanel`/`chat.ts` planned → merged.
- `docs/06`: "Call Gemini JSON mode" → "JSON MIME (response_mime_type)"; structured-output row → "JSON MIME + Pydantic"; "Call LLM với tool definitions"/"gọi tool" → "JSON prompt template/structured JSON response"; status "current branch 00101 chốt C3C, C4 follow-up" → "C.0–C.4 merged #98-106"; priority table companion chat + chat history "todo" → "merged"; `companion_service` "planned" → "đã implement".
- `.claude/context/05`: C.4 "partial" → "merged #106"; "apply-patch rate-limit to-do" + "ETL scheduler wiring to-do" → "đã có"; "intent routing/tool-calling" → "JSON prompt-driven".

**Frontend (`docs/04_frontend.md`, `Frontend/README.md`):**
- `docs/04`: thêm `chat.ts` vào services tree; "35 tests/32 passed" → "36 tests/17 specs (33 passed, 3 skipped)"; overclaim "cover apply/cancel/stale" → "e2e assert apply; cancel/stale có browser evidence (00101) chưa có e2e spec riêng".
- `Frontend/README`: "14 spec files" (x2) → "17 spec files"; nhãn "Latest" → snapshot-dated.

**Overview/INDEX (`docs/01_overview.md`, `docs/INDEX.md`):**
- `docs/01`: "AI pending" → "C.0–C.4 merged"; status block "C3C_RUNTIME_VERIFIED_ETL_PENDING"/"C4 partial" → "C4_MERGED"; "14 spec"/"11 FE e2e" → "17 specs/36 tests"; "Chưa hoàn thành" companion "phần còn lại history-UX/ETL/rate-limit" → đã merge, chỉ còn C.5 + sparse data; conclusion đồng bộ.
- `docs/INDEX`: broken link `[README.md](README.md)` → `../README.md`; broken `00060k_r1_critical_data_fixes.md` → `00060k_r1_critical_data_contract_fixes.md`; metrics date 2026-06-08 → 2026-06-24; "14 e2e specs" (x2) → "17".

**Testing/Deploy/Config (`docs/08`, `docs/LOCAL_MANUAL_UAT_GUIDE`, `docs/STAGING_DEPLOYMENT_GUIDE`):**
- `docs/08`: "14 spec files" → "17 spec files".
- `LOCAL_MANUAL_UAT_GUIDE`: backend count "125/51" → "187/77"; Playwright "19 passed, 3 skipped" → "36 tests/17 specs".
- `STAGING_DEPLOYMENT_GUIDE`: env table thêm 6 knob (`RATE_LIMIT_AI_FREE`, `RATE_LIMIT_AI_CHAT_USER`, `RATE_LIMIT_AI_APPLY_PATCH_USER`, `AI_RATE_LIMIT_FAIL_MODE`, `ETL_UPDATE_INTERVAL_DAYS`, `ETL_MAX_PLACES_PER_CITY`).
- **Env/config coverage = partial (by design):** `config.py` hỗ trợ đủ 6 knob AI/ETL với safe default (app boot không cần set); `STAGING_DEPLOYMENT_GUIDE` + `Backend/README` tài liệu hóa chúng. `Backend/.env.example` (template secrets-focused) và `docker-compose.yml` KHÔNG surface 6 knob — docker-compose pass-through qua `env_file: ./Backend/.env`, chỉ hardcode 3 var compose-network (`DATABASE_URL`/`REDIS_URL`/`FRONTEND_URL`). Đây là design đúng (knob có default), không phải gap runtime; mark `partial` vì example-file surface chưa liệt kê 6 knob.

**Source docstring (`companion_service.py`):** xem mục 9.

## 7. Verification đã chạy

| Check | Lệnh | Kết quả |
|---|---|---|
| Backend lint | `uv run ruff check src tests` | All checks passed! |
| Migrations | `uv run alembic check` | No new upgrade operations detected |
| FE build | `npm run build` | ✓ built (chunk-size warning non-blocking, pre-existing) |
| Stale grep active docs | sweep "File cần tạo"/"future confirm UI"/"(planned)"/"được planned"/"14 Playwright spec"/"tool-calling"/"Service (planned)"/"14 spec"/"35 endpoint" | Sạch trong active docs sau pass này (`docs/02`, `docs/06`, `README`, `docs/01`). Match còn lại: legacy `plan/` (không active), `docs/REPORTS/*` + `docs/09` (historical snapshot cố ý giữ), và negation đúng "KHÔNG dùng tool-calling" trong `docs/06` |

## 8. Files intention­ally NOT touched

- `docs/09_execution_tracker.md` — historical tracker (snapshot-at-time; "14 e2e test files" tại merge #98/#99 là đúng theo thời điểm).
- `docs/REPORTS/*` (00058b, 00059*, 00060*, phase_*, docs_audit_*, pr_*) — dated snapshots; số liệu cũ là lịch sử đúng.
- `docs/10_automation_testing_report.md` — snapshot nhánh `feat/00047` (đã ghi nhánh); giữ làm historical.
- `docs/05_database_etl.md:761` — đã current (phản ánh C merged + sparse gap Goong).
- `docs/USER_JOURNEY_UAT.md:80` — backlog "share-link browser UAT" vẫn **hợp lệ mở** (journey matrix `UJ-AUTH-05` = "Partial, no valid share browser UAT in this run"); không xóa.
- `.claude/settings.json`, evidence PNG, prompt handoff `.md` — local/historical, không commit.

## 9. Source docstring fix (justified)

`Backend/src/itineraries/companion_service.py` docstring nói "chờ phase apply-patch ở bước sau" (apply-patch là phase tương lai). Thực tế apply-patch ĐÃ implement ngay trong service này (`POST /itineraries/{trip_id}/apply-patch`, merged #105). Sửa comment-only thành "user xác nhận qua endpoint riêng `apply-patch` (cũng nằm trong service này, merged #105) mới ghi DB". Đây là sửa docstring, KHÔNG đổi logic; được phép theo hard scope (docstring-only khi có lý do). Giữ nguyên câu "Service này KHÔNG tự apply patch" — đúng theo thiết kế (message flow không auto-apply).

## 10. Merge readiness verdict

**READY (sau pass finalize này).** Docs-only, không đổi product code (pass trước có 1 docstring comment-only). Ruff/alembic/build pass. Pass này đóng dứt điểm các từ "planned/todo/future/File cần tạo" còn sót: `docs/02` (`được planned`→merged), `docs/06` (5 header "File cần tạo"→"File (C.x đã merge)" + "future confirm UI"→"confirm UI" + "(planned)"→"đã merge"), `README` ("14 Playwright spec files"→17), `docs/01` ("(planned)" deploy→"manual-first"). Env/config mark `partial` (by design — mục 6). Active docs đã source-verified; match "tool-calling/planned" còn lại chỉ là negation đúng trong `docs/06` ("KHÔNG dùng tool-calling") hoặc legacy `plan/` + historical `docs/REPORTS/*`/`docs/09`. 23 chủ đề kỹ thuật đều có owner doc. PR #110 sẵn sàng merge khi CI 7 checks xanh.
