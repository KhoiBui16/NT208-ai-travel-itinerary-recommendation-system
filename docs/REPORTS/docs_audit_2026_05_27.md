# Docs Audit Report — 2026-05-27

## Tóm tắt

Docs nhìn chung **khá đồng bộ** với source code thực tế. Các vấn đề chính:
1. `docs/03_backend.md` mô tả cấu trúc thư mục sai (dùng `api/v1/`, `models/`, `repositories/`, `services/` — nhưng thực tế code dùng by-domain pattern: `auth/`, `itineraries/`, `places/`, `agent/`).
2. `docs/06_ai_roadmap.md` mô tả `companion.py` nằm trong `src/itineraries/` nhưng thực tế file này **chưa tồn tại**.
3. `docs/10_automation_testing_report.md` có một số số liệu test cũ (75 unit, 42 integration) chưa được xóa khỏi bảng "Cách Đánh Giá Pass/Fail".
4. `docs/11_phase_roadmap.md` ghi C.2 là `review_ready` nhưng theo tracker task 00047 đã `merged` (PR #49).
5. `docs/03_backend.md` thiếu module `src/geo/` và `src/shared/` đang tồn tại trong source code.
6. `services/agent.ts` ở FE **chưa tồn tại** nhưng docs/06 và plan C.3 đã mô tả như cần tạo — đây là gap đúng, không phải lỗi docs.

---

## 1. Trạng thái từng file docs/

| File | Trạng thái | Vấn đề chính |
|---|---|---|
| `docs/01_overview.md` | ✅ OK | Phản ánh đúng trạng thái tổng thể; C.2 merged, C.3/C.4 chưa có |
| `docs/03_backend.md` | ⚠️ Cần update | Cấu trúc thư mục sai (mô tả flat `api/v1/`, `models/`, `repositories/`, `services/` thay vì by-domain); thiếu `src/geo/`, `src/shared/`; EP count 34 nhưng thực tế agent router chỉ có 1 endpoint |
| `docs/04_frontend.md` | ✅ OK | Đúng với source code; `services/agent.ts` chưa có là đúng (C.3 chưa implement) |
| `docs/05_database_etl.md` | ✅ OK | Schema ERD khớp với ORM models; ETL flow khớp với `runner.py` |
| `docs/06_ai_roadmap.md` | ⚠️ Cần update | `companion.py` được mô tả là `src/itineraries/companion.py` nhưng file chưa tồn tại; `src/agent/` thực tế thiếu `tools/` và `graph/` subdirs; C.2 status cần update sang merged |
| `docs/09_execution_tracker.md` | ✅ OK | Task 00047 ghi `merged` (PR #49) — đúng; task 00048 đã có |
| `docs/10_automation_testing_report.md` | ⚠️ Cần update | Bảng "Cách Đánh Giá Pass/Fail" vẫn ghi "Unit tests (75) và integration tests (42)" — số cũ; số hiện tại là 97 unit + 44 integration |
| `docs/11_phase_roadmap.md` | ⚠️ Cần update | C.2 ghi `review_ready` nhưng đã `merged` (PR #49 theo tracker); branch C.3 ghi `feat/00048` nhưng task 00048 đã dùng cho docs/system-test |

---

## 2. Những gì docs chưa phản ánh đúng source code

### docs/03_backend.md

**Thiếu/Sai:**
- Mục "1. Runtime Structure" mô tả cấu trúc `src/api/v1/`, `src/models/`, `src/repositories/`, `src/schemas/`, `src/services/` — **không tồn tại trong source code thực tế**. Source code dùng by-domain pattern: mỗi domain (`auth/`, `itineraries/`, `places/`, `agent/`) chứa router, service, repository, schemas, models riêng.
- Thiếu `src/geo/` module (tồn tại trong source).
- Thiếu `src/shared/` module (tồn tại trong source).
- `src/agent/` thực tế chỉ có: `__init__.py`, `config.py`, `llm.py`, `router.py`, `prompts/`, `schemas/` — **không có** `tools/` và `graph/` subdirs (chưa implement C.3).
- Mục "Tổng: 34 endpoints" — cần kiểm tra lại: agent router hiện chỉ có 1 endpoint (EP-30 suggest), không có chat/apply-patch.

**Cần thêm:**
- Cập nhật Runtime Structure theo by-domain pattern thực tế.
- Thêm ghi chú về `src/geo/` và `src/shared/`.
- Cập nhật agent router: chỉ có EP-30, chưa có EP-31/32 chat/apply-patch.

### docs/04_frontend.md

**Thiếu/Sai:**
- `services/agent.ts` được liệt kê trong "Known Gaps" là chưa có — **đúng**, không phải lỗi.
- Không có `services/agent.ts` trong `Frontend/src/app/services/` (chỉ có: `api.ts`, `auth.ts`, `itinerary.ts`, `places.ts`, `users.ts`) — phản ánh đúng C.3 chưa implement.

**Không cần sửa** — docs đã ghi đúng.

### docs/05_database_etl.md

**Thiếu/Sai:**
- ETL runner flow trong docs khớp với `runner.py` thực tế (Goong-first, OSM fallback, hotels YAML, Redis invalidate).
- Schema ERD khớp với ORM models.
- Không có vấn đề lớn.

**Cần thêm (nhỏ):**
- `src/geo/` module tồn tại trong source nhưng không được đề cập trong docs ETL.

### docs/06_ai_roadmap.md

**Thiếu/Sai:**
- Mục "3.5 File cần tạo" liệt kê `src/itineraries/companion.py` — file này **chưa tồn tại** (C.3 chưa implement). Đây là roadmap nên có thể chấp nhận, nhưng cần ghi rõ "chưa implement".
- `src/agent/` thực tế **không có** `tools/` và `graph/` subdirs — docs mô tả như đã có (trong phần "Companion Chat").
- Mục "7. Thứ tự ưu tiên" ghi C.2 là `✅ merged feat/00047 (PR #47)` — nhưng PR thực tế là #49 theo tracker.
- Mục "9. File tổng hợp" liệt kê `src/itineraries/companion.py` — chưa tồn tại.

**Cần thêm:**
- Ghi rõ trạng thái từng file: đã tồn tại / chưa implement.
- Cập nhật PR number C.2: #49 (không phải #47).

---

## 3. Plan vs Source Code — Implementation Gaps

| Plan | Trạng thái plan | Source code | Gap |
|---|---|---|---|
| C.0 Goong ETL | merged (#40) | ✅ `etl/extractors/goong_extractor.py` tồn tại | OK |
| C.1 Generate Pipeline | merged (#42) | ✅ `itineraries/pipeline.py` tồn tại | OK |
| C.2 Suggestion Service | merged (#49) | ✅ `places/suggestion_service.py` tồn tại; `agent/router.py` có EP-30 | OK |
| C.3 Companion Chat | todo | ❌ `itineraries/companion_service.py` chưa có; `agent/tools/` chưa có; `agent/graph/` chưa có | Chưa implement |
| C.4 Chat History | todo | ❌ `itineraries/chat_service.py` chưa có; chat endpoints chưa có | Chưa implement |
| C.5 Analytics | optional | ❌ `agent/analytics_service.py` chưa có; EP-34 chưa có | Chưa implement (optional) |
| FE `services/agent.ts` | todo (C.3) | ❌ File chưa tồn tại trong `Frontend/src/app/services/` | Chưa implement |
| FE `FloatingAIChat.tsx` wire | todo (C.3) | ⚠️ Component tồn tại nhưng vẫn dùng mock data | Chưa wire API |

---

## 4. Endpoint count thực tế vs docs

### Thực tế từ source code

| Router | Endpoints | Danh sách |
|---|---|---|
| `health_router` | 1 | `GET /health` |
| `auth_router` | 6 | register, login, refresh, logout, forgot-password, reset-password |
| `user_router` | 3 | GET/PUT profile, PUT password |
| `itineraries_router` | 15 | generate, CRUD (5), rating, share, claim, activities CRUD (3), accommodations CRUD (2) |
| `shared_router` | 1 | `GET /shared/{share_token}` |
| `places_router` | 8 | destinations (2), search, detail, saved (3) |
| `agent_router` | 1 | `GET /agent/suggest/{activity_id}` |
| **Tổng** | **35** | — |

### So sánh với docs

| Docs | Số ghi | Thực tế | Chênh lệch |
|---|---|---|---|
| `docs/03_backend.md` | "Tổng: 34 endpoints" | 35 endpoints | Thiếu 1 (EP-0 health không đếm, hoặc đếm sai) |
| `docs/01_overview.md` | "33 BE core endpoints (EP-0 đến EP-32)" | 35 | Thiếu EP-30 (suggest) và EP-0 health |
| `docs/09_execution_tracker.md` | "33 BE core endpoints" (FE-BE Integration Status) | 35 | Cũ — chưa cập nhật sau C.2 |

**Lưu ý:** `docs/03_backend.md` ghi "34 endpoints trên branch feat/00047" — đây là số đúng tại thời điểm đó (trước khi merge). Sau merge C.2, tổng là 35 (thêm EP-30). Tuy nhiên cách đếm có thể khác nhau tùy có tính EP-0 health hay không.

---

## 5. Test count thực tế vs docs

### Số liệu trong `docs/10_automation_testing_report.md`

| Mục | Số ghi trong docs | Thực tế (theo tracker 00048) | Đúng/Sai |
|---|---|---|---|
| Backend unit tests | **97 tests** (bảng tổng quan) | 97 | ✅ Đúng |
| Backend integration tests | **44 collected** (bảng tổng quan) | 44 collected, 43 pass, 1 fail (test pollution) | ✅ Đúng |
| Frontend e2e tests | **13 tests** | 13 | ✅ Đúng |
| Full-stack smoke | 16 flows | 16 | ✅ Đúng |
| **Bảng "Cách Đánh Giá Pass/Fail"** | "Unit tests (75) và integration tests (42)" | 97 unit + 44 integration | ❌ **Sai — số cũ** |

**Vấn đề:** Mục "Cách Đánh Giá Pass/Fail" vẫn ghi ngưỡng cũ `75 unit + 42 integration`. Cần cập nhật thành `97 unit + 44 integration`.

---

## 6. Những gì cần update ngay

### Ưu tiên cao:

1. **`docs/03_backend.md` — Mục "1. Runtime Structure"**: Cập nhật cấu trúc thư mục từ flat pattern sang by-domain pattern thực tế. Thêm `src/geo/`, `src/shared/`. Cập nhật `src/agent/` chỉ có `config.py`, `llm.py`, `router.py`, `prompts/`, `schemas/` (không có `tools/`, `graph/` vì C.3 chưa implement).

2. **`docs/10_automation_testing_report.md` — Mục "Cách Đánh Giá Pass/Fail"**: Sửa "Unit tests (75) và integration tests (42)" → "Unit tests (97) và integration tests (44)".

3. **`docs/11_phase_roadmap.md` — C.2 status**: Sửa `review_ready` → `merged`; cập nhật PR number nếu cần.

### Ưu tiên trung bình:

4. **`docs/06_ai_roadmap.md` — Trạng thái C.3 files**: Ghi rõ `src/agent/tools/`, `src/agent/graph/`, `src/itineraries/companion_service.py` là **chưa tồn tại** (todo C.3), không phải đã có.

5. **`docs/09_execution_tracker.md` — FE-BE Integration Status**: Cập nhật "33 BE core endpoints" → "35 endpoints" (sau C.2 merge).

6. **`docs/11_phase_roadmap.md` — C.3 branch**: Branch `feat/00048` đã được dùng cho `docs/00048-d-system-test-fixes`. C.3 companion chat cần branch mới (ví dụ `feat/00051-c3-companion-chat`).

### Ưu tiên thấp:

7. **`docs/03_backend.md` — Endpoint count**: Cập nhật "Tổng: 34 endpoints" → "Tổng: 35 endpoints" (sau C.2 merge EP-30).

8. **`docs/06_ai_roadmap.md` — PR number C.2**: Sửa "PR #47" → "PR #49".

---

## 7. Kết luận

Docs nhìn chung **đồng bộ tốt** với source code — đặc biệt là schema DB, ETL flow, FE hooks, và auth flow. Vấn đề lớn nhất là `docs/03_backend.md` mô tả cấu trúc thư mục theo kiến trúc cũ (flat pattern) thay vì by-domain pattern thực tế đang dùng. Ngoài ra có một số số liệu test và endpoint count cần cập nhật nhỏ. Không có trường hợp docs mô tả tính năng đã implement nhưng thực tế chưa có (ngoại trừ C.3/C.4 là roadmap chưa implement — đây là đúng theo thiết kế).

**Tổng số vấn đề:**
- ❌ Sai cần sửa ngay: 2 (cấu trúc thư mục docs/03, test count docs/10)
- ⚠️ Cần update: 4 (C.2 status docs/11, C.3 file status docs/06, endpoint count docs/09, branch name docs/11)
- ✅ OK không cần sửa: 4 (docs/01, docs/04, docs/05, docs/09 phần lớn)
