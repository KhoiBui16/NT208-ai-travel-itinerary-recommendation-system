# 00 — Tổng quan toàn bộ thay đổi MVP1 → MVP2

> **Mục đích file này:** Giải thích cho bất kỳ ai — developer, reviewer, giảng viên — hiểu
> TOÀN BỘ những gì sẽ thay đổi khi refactor Backend, TẠI SAO phải làm, và cách các phần
> liên kết với nhau. Đọc file này TRƯỚC khi đọc các file chi tiết Part 1–16.

> **Decision lock v4.1 (2026-04-24):** MVP2 core có **33 endpoints**. `EP-34 /agent/analytics`
> là optional/MVP2+ sau khi bật feature flag và guardrails Text-to-SQL. `POST /itineraries/generate`
> đi **direct ItineraryPipeline**, không qua Supervisor vì intent đã rõ. TravelSupervisor chỉ điều phối
> các request AI dạng ngôn ngữ tự nhiên như chat/analytics. Public share dùng `shareToken`, guest claim
> dùng `claimToken`, mọi API public-facing dùng camelCase theo `Frontend/src/app/types/trip.types.ts`.

---

## Cách đọc plan

> [!TIP]
> Neu dung Claude Code hoac AI assistant de implement, hay doc theo lop operational truoc:
> [../CLAUDE.md](../CLAUDE.md) -> [../.claude/context/00_project_overview.md](../.claude/context/00_project_overview.md)
> -> file phase phu hop trong `../.claude/context/`. Bo condensed nay KHONG thay the plan dai; no chi giup
> agent doc nhanh ma khong sot invariant.

Toàn bộ kế hoạch hiện có **21 file Markdown** trong thư mục `plan/`. Mỗi file phục vụ một mục đích riêng.
Nếu bạn chỉ đọc được 1 file, hãy đọc file này (`00_overview_changes.md`).
Nếu có thời gian đọc thêm, đọc theo thứ tự bên dưới (core docs + các file phân tích bổ sung):

```
Bước 1: Đọc file này (00) — Hiểu tổng quan BIG PICTURE
                ↓
Bước 2: Đọc 13_architecture_overview.md — Hiểu toàn bộ system architecture (NEW)
                ↓
Bước 3: Đọc 01_mvp1_analysis.md — Hiểu hệ thống HIỆN TẠI có gì, yếu gì
                ↓
Bước 4: Đọc 02_fe_revamp_analysis.md — Hiểu FE MỚI cần gì từ BE
                ↓
Bước 5: Đọc 08_coding_standards.md — Quy tắc OOP, import, config, logger
                ↓
Bước 6: Đọc 14_config_plan.md — Config centralized + feature flags/security tokens
                ↓
Bước 7: Đọc 09_database_design.md — ERD 16 core bảng, constraints, indexes
                ↓
Bước 8: Đọc 03_be_refactor_plan.md — Kế hoạch chi tiết TỪ FILE NÀO, HÀM NÀO
                ↓
Bước 9: Đọc 04_ai_agent_plan.md — Kế hoạch tích hợp AI Agent
                ↓
Bước 10: Đọc 10_use_cases_test_plan.md — 22 use cases + 65 test cases
                ↓
Bước 10b: Đọc 16_unit_test_specs.md — Unit test specs (input/output/mock) 🆕
                ↓
Bước 10c: Đọc 17_execution_tracker.md — Daily tracker cho branch/task/test/PR sync 🆕
                ↓
Bước 11: Đọc 11_cicd_docker_plan.md — CI/CD + Docker deploy
                ↓
Bước 12: Đọc 12_be_crud_endpoints.md — ⭐ 33 core endpoints + EP-34 optional request/response
                ↓
Bước 13: Đọc implementation_plan.md — Master plan (workflow, endpoint map, git)
                ↓
Bước 14 (optional): 05, 06, 07 — ETL, Scaling, README
```

> [!TIP]
> Claude/AI implementation read order de nghi:
> `CLAUDE.md` -> `.claude/context/00_project_overview.md` -> file phase lien quan ->
> long plan docs duoc link trong section `Read more` cua condensed file.

### File inventory đã xác nhận

Bảng dưới đây được đếm trực tiếp từ file hiện tại bằng newline count để tránh sai lệch do encoding/CRLF:

| File | Dòng |
|---|---:|
| `00_overview_changes.md` | 724 |
| `01_mvp1_analysis.md` | 303 |
| `02_fe_revamp_analysis.md` | 548 |
| `03_be_refactor_plan.md` | 2688 |
| `04_ai_agent_plan.md` | 2619 |
| `05_data_pipeline_plan.md` | 661 |
| `06_scalability_plan.md` | 577 |
| `07_readme_plan.md` | 362 |
| `08_coding_standards.md` | 1065 |
| `09_database_design.md` | 784 |
| `10_use_cases_test_plan.md` | 1675 |
| `11_cicd_docker_plan.md` | 817 |
| `12_be_crud_endpoints.md` | 1337 |
| `13_architecture_overview.md` | 498 |
| `14_config_plan.md` | 511 |
| `15_todo_checklist.md` | 1143 |
| `16_unit_test_specs.md` | 832 |
| `17_execution_tracker.md` | 87 |
| `implementation_plan.md` | 561 |
| `multi_agent_analysis.md` | 432 |
| `plan_files_diagram.md` | 34 |

Tổng cộng sau khi cập nhật plan: **18,258 dòng**.

---

## Phần 1: Tại sao phải refactor?

### Bối cảnh dự án

Hệ thống "DuLichViet" là ứng dụng web gợi ý lộ trình du lịch bằng AI. Dự án có 2 phần: **Frontend** (React + Vite) và **Backend** (FastAPI + PostgreSQL). Phiên bản đầu tiên (MVP1) đã chạy được — user đăng ký, đăng nhập, và tạo lộ trình bằng AI (Gemini).

**Vấn đề:** Trong khi Backend giữ nguyên từ MVP1, Frontend đã được **đại tu hoàn toàn** trên branch `feat/frontend-revamp`. FE mới có 25 trang (thay vì 8), thêm hàng loạt tính năng: quản lý chi phí, kéo thả hoạt động, AI chatbot, bookmark địa điểm, chia sẻ trip... Nhưng tất cả đều chạy **offline** — dữ liệu lưu trong `localStorage` của trình duyệt, không gọi Backend.

Nói cách khác: **FE mới đã vượt xa khả năng của BE cũ**. BE cũ chỉ có 10 endpoint, FE mới cần **33 endpoint core** (31 gốc + EP-32 Guest Claim + EP-33 Chat History). `EP-34 Analytics` giữ trong docs như tính năng optional/MVP2+ vì Text-to-SQL có rủi ro bảo mật cao hơn. BE cũ có 4 bảng DB, FE mới cần mở rộng schema để lưu trip/day/activity/accommodation/saved places/share/claim/chat history. Nếu không refactor BE, FE mới sẽ mãi chạy offline — dữ liệu mất khi clear browser, không sync giữa các thiết bị, không có AI chatbot thật.

### 10 vấn đề cụ thể của BE hiện tại

**Vấn đề 1 — Router chứa business logic (vi phạm Single Responsibility)**

Trong kiến trúc chuẩn, Router chỉ nên làm 3 việc: nhận request, gọi Service, trả response. Nhưng `routers/trips.py` hiện tại vừa validate dữ liệu, vừa xử lý logic nghiệp vụ, vừa format response. Điều này khiến code khó test (phải mock HTTP) và khó tái sử dụng (logic bị gắn chặt vào HTTP context).

**Vấn đề 2 — Service gọi DB trực tiếp (không qua Repository)**

File `itinerary_service.py` hiện tại dài **654 dòng**, bên trong trộn lẫn SQL query (`session.execute(select(...))`) với business logic (tính chi phí, gọi AI). Theo nguyên tắc Clean Architecture, Service không nên biết về SQL — Service chỉ nên gọi Repository (`self.repo.get_by_id(42)`) và để Repository xử lý chi tiết SQL.

Tại sao điều này quan trọng? Vì nếu sau muốn đổi database (ví dụ từ PostgreSQL sang MongoDB), chỉ cần đổi Repository — Service code không thay đổi. Ngoài ra, khi viết unit test cho Service, có thể swap Repository bằng một fake repo (trả dữ liệu giả) mà không cần database thật.

**Vấn đề 3 — Không có Abstract Base Class**

MVP1 không có interface/ABC cho Repository hay Service. Mỗi service viết theo cách riêng — `auth_service` có method `register_user`, `itinerary_service` có method `generate_itinerary`. Không có contract chung, không có pattern nhất quán. MVP2 sẽ định nghĩa `BaseRepository[T]` với 5 method bắt buộc (`get_by_id`, `get_all`, `create`, `update`, `delete`). Mọi concrete repo PHẢI implement đủ, đảm bảo nhất quán.

**Vấn đề 4 — Schema FE ≠ Schema BE**

Đây là vấn đề NGHIÊM TRỌNG NHẤT. FE mới định nghĩa `Activity.name` (tên hoạt động), nhưng BE trả về `Activity.title`. FE dùng `id: number` (số nguyên), BE dùng `id: UUID` (chuỗi UUID). FE có `adultPrice`, `childPrice`, `endTime`... BE hoàn toàn không có các field này. Tổng cộng có **15 breaking changes** — mỗi cái đều khiến FE không đọc được response từ BE.

**Vấn đề 5 — AI dùng raw SDK, parse JSON thủ công**

BE hiện tại gọi Gemini bằng `google.generativeai` SDK thô. AI trả về text, BE dùng `json.loads()` để parse. Nếu Gemini trả response kèm markdown (```json ... ```) hoặc comment, `json.loads()` sẽ crash. Khi crash, BE fallback về `FALLBACK_DATA` — một dict hardcoded cho 4 thành phố. User nhận kết quả và NGHĨ là AI tạo ra, nhưng thực tế là data cứng.

MVP2 sẽ dùng `langchain-google-genai` với `.with_structured_output(AgentItinerary)`. Gemini sẽ trả về **Pydantic object trực tiếp** — 100% parse thành công, không cần `json.loads()`. Nếu AI thật sự fail (network, quota), BE trả HTTP 503 rõ ràng — không lừa user bằng data giả.

**Vấn đề 6 — Không có Alembic (database migration)**

MVP1 dùng `Base.metadata.create_all(engine)` để tạo bảng. Cách này chỉ TẠO bảng mới, không UPDATE bảng có sẵn. Nghĩa là nếu thêm column `end_time` vào bảng `activities`, `create_all` sẽ KHÔNG thêm column đó. Phải DROP toàn bộ DB rồi tạo lại — MẤT TOÀN BỘ DỮ LIỆU.

Alembic giải quyết vấn đề này. Mỗi thay đổi schema = 1 file migration có version. `alembic upgrade head` chỉ apply những thay đổi chưa chạy. `alembic downgrade -1` rollback được. Toàn bộ bảo toàn dữ liệu.

**Vấn đề 7 — JWT không có Refresh Token**

MVP1 tạo 1 JWT duy nhất (expiry 24h). Khi hết hạn, user phải login lại. Khi user nhấn "Logout", FE chỉ xóa token khỏi localStorage — nhưng token vẫn VALID trên server cho đến khi expire. Nghĩa là nếu ai đó copy token trước khi logout, họ vẫn dùng được trong 24h.

MVP2 thêm Refresh Token: Access token ngắn (15 phút, giảm rủi ro leak), Refresh token dài (30 ngày, lưu hash trong DB). Logout = revoke refresh token trong DB → attacker không thể lấy token mới.

**Vấn đề 8 — Config hardcoded, secret hygiene chưa đủ rõ**

Repo hiện tại đã ignore `.env` và có `.env.example`, nhưng code vẫn có default secret yếu và một số config/logging còn dễ lộ thông tin nhạy cảm nếu deploy production. MVP2 giữ `.env.example` làm template, fail-fast nếu thiếu secret bắt buộc, dùng `SecretStr`/redaction khi log, và yêu cầu rotate ngay nếu API key từng bị commit hoặc chia sẻ ra ngoài.

**Vấn đề 9 — FE hoạt động hoàn toàn offline**

Toàn bộ workflow trip trên FE mới — tạo trip, thêm hoạt động, lưu trip — đều dùng `localStorage`. Nghĩa là:
- Dữ liệu MẤT khi clear browser
- Không sync giữa laptop và điện thoại
- Không có history thật trên server
- Không có AI thật (chỉ `setTimeout` giả lập)

MVP2 sẽ thay toàn bộ localStorage bằng API calls. FE gọi BE, BE lưu PostgreSQL, data persistent và accessible từ mọi thiết bị.

**Vấn đề 10 — Error handling generic**

MVP1: `raise HTTPException(status_code=500, detail="Internal server error")`. FE không biết lỗi gì — email trùng? token hết hạn? trip không tồn tại? Tất cả đều trả 500.

MVP2 sẽ có custom exceptions: `NotFoundException` (404), `ConflictException` (409, email trùng), `ForbiddenException` (403, không phải owner), `RateLimitException` (429, hết quota AI). Response format chuẩn: `{"detail": "Email already registered", "error_code": "CONFLICT", "status_code": 409}`.

---

## Phần 2: Tổng quan — Cái gì thay đổi?

Đây là bảng tổng hợp TẤT CẢ thay đổi, mỗi dòng là 1 khía cạnh của hệ thống. Cột "Đọc thêm" chỉ đến file chi tiết tương ứng.

| Khía cạnh | MVP1 (hiện tại) | MVP2 (mục tiêu) | Đọc thêm |
|----------|----------------|-----------------|----------|
| **Cấu trúc folder** | `Backend/app/` — 4 thư mục phẳng | `Backend/src/` — 8 layer tách biệt | [Phần 3](#phần-3) |
| **Package manager** | `pip` + `requirements.txt` | `uv` + `pyproject.toml` + `uv.lock` | [Phần 4](#phần-4) |
| **Database** | 4 bảng, UUID, `create_all()` | 16 core bảng, Integer ID, Alembic | [Phần 5](#phần-5) |
| **Architecture** | 2 layer (Router→Service→DB) | 3 layer (Router→Service→Repo→DB) + ABC | [Phần 6](#phần-6) |
| **Authentication** | JWT 24h, không refresh, không logout | JWT 15min + Refresh 30 days + logout thật | [Phần 7](#phần-7) |
| **API endpoints** | 10 | 33 core + EP-34 optional analytics | [Phần 8](#phần-8) |
| **AI pipeline** | Raw Gemini SDK + json.loads + mock fallback | Direct structured-output pipeline + LangGraph companion | [Phần 9](#phần-9) |
| **FE-BE schema** | Không khớp (15 breaking changes) | CamelCaseModel auto-convert | [Phần 10](#phần-10) |
| **Error handling** | HTTPException(500) | Custom exceptions (404/403/409/422/429/503) | [Phần 11](#phần-11) |
| **Caching** | Không có | Redis cache + rate limiting | [Phần 12](#phần-12) |
| **Data source** | `seed_data.py` hardcoded | ETL pipeline (Goong + OSM API) | [Phần 13](#phần-13) |
| **Testing** | Manual test files | pytest + async fixtures + coverage | [Phần 14](#phần-14) |
| **Deployment** | Manual uvicorn | Docker Compose (BE + FE + PG + Redis) | [Phần 15](#phần-15) |

---

## Phần 3: Cấu trúc Folder — Tại sao tổ chức lại?

### Hiện tại: Mọi thứ gộp trong `app/`

```
Backend/app/
├── models/     ← 4 file model, mỗi file vừa model vừa relationship logic
├── schemas/    ← Request + Response trộn lẫn trong cùng 1 file
├── routers/    ← 4 file, mỗi file vừa parse HTTP vừa xử lý logic
├── services/   ← 3 file, itinerary_service.py dài 654 dòng (!)
└── utils/      ← security + dependencies gộp chung
```

Vấn đề chính: **không có ranh giới rõ ràng giữa các tầng**. Router import trực tiếp service, service gọi thẳng database. Khi cần thay đổi 1 thứ (ví dụ đổi query SQL), phải sửa xuyên suốt từ router đến service.

### Mục tiêu: 8 layer tách biệt trong `src/`

```
Backend/src/
│
├── core/           ← "NỀN TẢNG" — Cấu hình hệ thống
│   Đây là tầng thấp nhất, chứa những thứ mọi phần khác đều cần.
│   Giống như "móng nhà" — không chứa nội thất (business logic), 
│   chỉ chứa điện nước (config, database connection, security).
│   Bất kỳ layer nào cũng có thể import từ core/.
│
├── base/           ← "BẢN VẼ" — Abstract Base Classes
│   Chứa các "hợp đồng" mà Repository và Service phải tuân theo.
│   Ví dụ: BaseRepository[T] yêu cầu mọi repo phải có get_by_id(), 
│   create(), update(), delete(). Nếu quên implement → Python báo lỗi
│   ngay khi khởi chạy, không đợi đến runtime mới crash.
│
├── models/         ← "BẢNG DB" — Mỗi file = 1 bảng PostgreSQL
│   SQLAlchemy ORM models. Chỉ định nghĩa cấu trúc bảng (columns, 
│   relationships, constraints). KHÔNG chứa business logic.
│   KHÔNG bao giờ trả model trực tiếp từ API — phải qua schema.
│
├── schemas/        ← "HỢP ĐỒNG DỮ LIỆU" — Pydantic DTOs
│   Hai loại schema tách riêng:
│   • Request schemas: validate dữ liệu FE gửi lên (VD: TripGenerateRequest)
│   • Response schemas: format dữ liệu BE trả về (VD: ItineraryResponse)
│   Schema tự động convert snake_case (Python) → camelCase (JavaScript) 
│   nhờ CamelCaseModel base class.
│
├── repositories/   ← "KHO DỮ LIỆU" — Chỉ SQL, không logic
│   Mỗi file xử lý 1 loại entity (UserRepository, TripRepository...).
│   Chỉ chứa SQL queries và ORM operations.
│   Service gọi repo.get_by_id(42) — repo lo phần SELECT * WHERE id=42.
│   KHÔNG chứa business logic (VD: không validate "user phải là owner").
│
├── services/       ← "BỘ NÃO" — Business logic thuần túy
│   Xử lý logic nghiệp vụ: validate quyền sở hữu, tính chi phí, 
│   phối hợp nhiều repo. Gọi Repository để lấy/lưu data.
│   QUAN TRỌNG: Service KHÔNG biết về HTTP (không import Request, 
│   không biết status code). Service KHÔNG biết về SQL.
│
├── api/v1/         ← "CỔNG GIAO TIẾP" — HTTP routers
│   Chỉ làm 3 việc: (1) parse request, (2) gọi service, (3) trả response.
│   KHÔNG có business logic. Mỗi endpoint = ~10 dòng code.
│   Versioned (v1/) để sau có thể thêm v2/ mà không break client cũ.
│
├── agent/          ← "BỘ NÃO AI" — LangChain + LangGraph + Supervisor vừa đủ
│   Module độc lập, có thể test riêng. Chứa:
│   • TravelSupervisor: orchestrator cho chat/analytics natural-language 🆕
│   • ItineraryPipeline: sinh lộ trình từ Gemini (5-step direct pipeline)
│   • Companion Agent: chatbot AI (LangGraph state machine + 6 tools)
│   • SuggestionService: gợi ý thay thế bằng DB query, không gọi LLM
│   • AnalyticsWorker: Text-to-SQL optional/MVP2+ (7-step pipeline, read-only) 🆕
│   • Prompts, schemas, tools, guardrails — tách file riêng
│
└── helpers/        ← "HỘP ĐỒ NGHỀ" — Tiện ích thuần túy
    Functions nhỏ, stateless, không phụ thuộc service/repo.
    Ví dụ: format_currency(5000000) → "5.000.000 VND"
    Bất kỳ layer nào cũng có thể dùng.
```

### Quy tắc quan trọng: Ai được import ai?

```
api/v1/ → services/        ← Router gọi Service ✅
services/ → repositories/  ← Service gọi Repo ✅
services/ → agent/         ← Service gọi Agent ✅
repositories/ → models/    ← Repo dùng Model ✅

api/v1/ → repositories/    ← Router gọi Repo ❌ KHÔNG ĐƯỢC
services/ → fastapi.*      ← Service import FastAPI ❌ KHÔNG ĐƯỢC
repositories/ → ?logic?    ← Repo chứa logic ❌ KHÔNG ĐƯỢC
```

Tại sao quy tắc này quan trọng? Vì nó tạo ra **dependency flow 1 chiều**. Khi debug, bạn biết chắc: nếu lỗi ở tầng data → sửa repo. Nếu lỗi ở logic → sửa service. Nếu lỗi ở HTTP response → sửa router. Không bao giờ phải tìm kiếm "logic nằm ở đâu" — vì logic CHỈ ở service.

> 📖 Chi tiết từng file, từng function: [03_be_refactor_plan.md](03_be_refactor_plan.md)

---

## Phần 4: Package Manager — Tại sao đổi sang `uv`?

`pip` + `requirements.txt` là cách truyền thống của Python. Nó hoạt động, nhưng có 3 vấn đề:

1. **Chậm:** Cài 33 packages mất khoảng 45 giây. `uv` cài xong trong 2 giây (nhanh 10-100x).

2. **Không deterministic:** `requirements.txt` chỉ ghi tên package, nhiều khi không pin version chính xác. Người A cài phiên bản 1.2.3, người B cài 1.3.0 — code chạy khác nhau. `uv.lock` ghi chính xác mọi phiên bản, SHA hash, đảm bảo ai cài cũng giống nhau.

3. **Config phân tán:** MVP1 dùng `requirements.txt` cho dependencies, file riêng cho ruff config, file riêng cho pytest config. `pyproject.toml` gộp TẤT CẢ vào 1 file theo chuẩn PEP 621.

**Commands sẽ thay đổi:**

Thay vì `pip install -r requirements.txt` → dùng `uv sync` (cài từ lock file).
Thay vì `pip install package` → dùng `uv add package` (cài + tự thêm vào pyproject.toml).
Thay vì `python -m pytest` → dùng `uv run pytest` (chạy trong virtual env đúng).

> 📖 Setup chi tiết: [07_readme_plan.md](07_readme_plan.md)

---

## Phần 5: Database — Từ 4 bảng lên 16 core bảng

### Tại sao cần nhiều bảng hơn?

MVP1 chỉ có 4 bảng: `users`, `trips`, `places`, `trip_places`. Điều này đủ cho chức năng cơ bản: user tạo trip, trip chứa danh sách places.

Nhưng FE mới cần nhiều hơn thế. Cụ thể:

**Bảng `trip_days` (MỚI):** FE có khái niệm "Ngày" — mỗi ngày có label ("Ngày 1 - Hà Nội"), ngày tháng, và tên thành phố riêng (vì 1 trip có thể đi nhiều thành phố). MVP1 chỉ có `day_number` trong `trip_places` — không đủ chỗ chứa label và destinationName.

**Bảng `activities` (MỚI):** FE cần CRUD riêng từng hoạt động — thêm, sửa, xóa, kéo thả đổi thứ tự. MVP1 dùng `trip_places` làm junction table — thiếu hàng loạt field như `endTime`, `adultPrice`, `childPrice`, `customCost`, `transportation`, `busTicketPrice`, `taxiCost`. Thêm 9 column vào junction table sẽ làm nó quá phức tạp, nên tách ra bảng riêng.

**Bảng `hotels` + `trip_accommodations` (MỚI):** FE có chức năng thêm khách sạn vào trip, gán hotel vào các ngày cụ thể, theo dõi chi phí lưu trú. MVP1 hoàn toàn không có khái niệm hotel.

**Bảng `extra_expenses` (MỚI):** FE cho phép user thêm chi phí phát sinh cho từng hoạt động (VD: "Tiền xe ôm 50k") hoặc từng ngày (VD: "Tip hướng dẫn viên 200k"). Cần 1 bảng linh hoạt, có thể gắn vào activity HOẶC trip_day.

**Bảng `refresh_tokens` (MỚI):** Để support refresh token rotation (xem Phần 7). Mỗi row lưu hash của refresh token, ngày hết hạn, trạng thái revoked. Khi logout → mark revoked = true.

**Bảng `saved_places` (MỚI):** FE có trang SavedPlaces (bookmark). User save place → tạo row. Unsave → xóa row. Junction table giữa `users` và `places`.

**Bảng `share_links` (MỚI):** FE có nút Share trip. Tạo link unique bằng opaque `shareToken`; ai có token được xem read-only qua `GET /shared/{shareToken}`. Không public `GET /itineraries/{id}` vì integer ID dễ đoán.

**Bảng `guest_claim_tokens` (MỚI):** Guest có thể tạo trip trước khi đăng nhập. BE trả `claimToken` một lần, lưu hash + expiry trong DB. Sau login, FE phải gửi token này khi gọi `POST /itineraries/{id}/claim`; chỉ check `user_id IS NULL` là không đủ an toàn.

**Bảng `chat_sessions` + `chat_messages` (MỚI):** LangGraph checkpoint dùng cho memory/replay nội bộ, nhưng API chat history cần projection sạch, dễ phân trang và không lộ state nội bộ. Vì vậy lưu message history riêng.

**Bảng `scraped_sources` (MỚI):** Theo dõi dữ liệu crawl — lần cuối crawl khi nào, bao nhiêu items, status. Giúp biết khi nào cần chạy lại ETL (xem Phần 13).

### Thay đổi ID: UUID → Integer

FE mới định nghĩa rõ trong `trip.types.ts`:
```typescript
export interface Activity { id: number; ... }
export interface Day { id: number; ... }
```

`number` trong TypeScript = số nguyên. Nếu BE trả `"550e8400-e29b-41d4-a716-446655440000"` (UUID string), FE sẽ nhận `NaN` khi parse. Vì vậy MVP2 chuyển toàn bộ sang `Integer auto-increment` — đơn giản hơn, performant hơn, và khớp với typesafe ID mà FE đang dùng.

### Thay đổi migration: `create_all()` → Alembic

Hãy tưởng tượng bạn đang xây nhà. `create_all()` giống như xây mới hoàn toàn — muốn thêm 1 phòng thì phải đập nhà, xây lại từ đầu. Alembic giống như cơi nới — muốn thêm phòng thì chỉ xây thêm, phần cũ giữ nguyên.

Mỗi migration là 1 file Python:
```python
# alembic/versions/001_initial.py
def upgrade():
    op.create_table('trip_days', ...)  # Thêm bảng mới
    op.add_column('trips', Column('adults_count', Integer))  # Thêm column

def downgrade():
    op.drop_column('trips', 'adults_count')  # Rollback
    op.drop_table('trip_days')
```

> 📖 ER Diagram đầy đủ 16 core bảng: [09_database_design.md](09_database_design.md) Section 1-2

---

## Phần 6: Architecture — 2 layer → 3 layer

### Vấn đề của 2 layer

MVP1 có 2 tầng chính: **Router** (nhận HTTP) và **Service** (làm mọi thứ). Service vừa validate, vừa query DB, vừa gọi AI, vừa tính toán. File `itinerary_service.py` dài 654 dòng là hậu quả — nó trở thành "God Object" biết tất cả, làm tất cả.

### Giải pháp: thêm Repository layer

MVP2 tách thành 3 tầng rõ ràng:

```
ROUTER: "Tôi chỉ biết HTTP"
  Nhận request → gọi service → trả response
  Không biết SQL. Không biết business rule.
  Mỗi handler = ~10 dòng code.

SERVICE: "Tôi chỉ biết nghiệp vụ"  
  Validate quyền truy cập. Orchestrate workflow.
  Gọi repo để lấy data. Gọi agent để chạy AI.
  Không biết HTTP. Không biết SQL query cụ thể.
  
REPOSITORY: "Tôi chỉ biết SQL"
  SELECT, INSERT, UPDATE, DELETE. Join. Eager load.
  Không biết business rule (VD: trip.user_id == user.id).
  Chỉ return raw data, Service sẽ xử lý tiếp.
```

**Ví dụ cụ thể — "Xóa trip":**

MVP1 (trộn lẫn):
```python
# Router LÀM HẾT:
@router.delete("/{trip_id}")
async def delete_trip(trip_id, db, user):
    trip = await db.execute(select(Trip).where(Trip.id == trip_id))  # SQL trong router!
    if trip.user_id != user.id:  # Logic trong router!
        raise HTTPException(403, "Not owner")
    await db.delete(trip)  # SQL trong router!
```

MVP2 (tách biệt):
```python
# Router (10 dòng, CHỈ HTTP):
@router.delete("/{trip_id}")
async def delete_trip(trip_id: int, user = Depends(get_current_user), 
                      service = Depends(get_itinerary_service)):
    await service.delete(trip_id, user.id)  # Delegate hết cho service

# Service (10 dòng, CHỈ logic):
async def delete(self, trip_id: int, user_id: int) -> None:
    trip = await self.trip_repo.get_by_id(trip_id)  # Gọi repo
    if not trip:
        raise NotFoundException("Trip not found")
    if trip.user_id != user_id:
        raise ForbiddenException("Not trip owner")  # Business rule
    await self.trip_repo.delete(trip_id)  # Gọi repo

# Repository (5 dòng, CHỈ SQL):
async def delete(self, id: int) -> bool:
    result = await self.session.execute(delete(Trip).where(Trip.id == id))
    await self.session.commit()
    return result.rowcount > 0
```

Thấy sự khác biệt chứ? Mỗi layer chỉ lo 1 nhiệm vụ. Code ngắn hơn, rõ ràng hơn, test được độc lập.

### Dependency Injection (DI) — Tự động kết nối layer

FastAPI có cơ chế `Depends()` để tự động tạo và truyền object qua các hàm. Khi 1 request đến, FastAPI tự động:

1. Mở connection DB → tạo `AsyncSession`
2. Tạo `TripRepository(session)` 
3. Tạo `ItineraryService(trip_repo, place_repo)`
4. Truyền service vào router handler

Developer không cần tạo object thủ công. Chuỗi DI được định nghĩa 1 lần trong `core/dependencies.py` và auto-resolve cho mọi request.

> 📖 DI chain diagram + function signatures: [03_be_refactor_plan.md](03_be_refactor_plan.md) Section 2-3

---

## Phần 7: Authentication — Bảo mật hơn

### JWT + Refresh Token hoạt động thế nào?

Hãy tưởng tượng Access Token là **thẻ vào cổng** (hết hạn sau 15 phút), và Refresh Token là **thẻ thành viên** (hết hạn sau 30 ngày).

Khi login: BE trả cả 2 thẻ. FE lưu cả 2.

Khi gọi API: FE gửi Access Token trong header `Authorization: Bearer <token>`.

Khi Access Token hết hạn (sau 15 min): FE nhận lỗi 401 → FE tự động gọi `POST /auth/refresh` kèm Refresh Token → BE trả Access Token mới. User KHÔNG cần login lại.

Khi Logout: FE gọi `POST /auth/logout` → BE đánh dấu Refresh Token là "revoked" trong DB → attacker có lấy được Refresh Token cũ cũng không dùng được.

> 📖 Chi tiết implementation: [03_be_refactor_plan.md](03_be_refactor_plan.md) Section 6.1

---

## Phần 8: API Endpoints — Từ 10 lên 33 core

FE mới có 25 trang, mỗi trang cần API riêng. Đây là **23 endpoint MỚI** cần xây trong MVP2 core (21 gốc + EP-32 Guest Claim + EP-33 Chat History), nhóm theo chức năng. `EP-34 /agent/analytics` nằm trong docs nhưng là optional/MVP2+ vì cần hardening Text-to-SQL.

### Nhóm Auth (thêm 2 endpoint mới)
- `POST /auth/refresh` — Gia hạn token không cần login lại
- `POST /auth/logout` — Logout thật, revoke token trên server

### Nhóm Itinerary (thêm 8 endpoint mới)
- `POST /itineraries` — Tạo trip thủ công (user tự thêm ngày, không cần AI)
- `PUT /itineraries/{id}` — Auto-save: FE gửi toàn bộ trip data mỗi 3 giây sau khi user edit. Đây là endpoint quan trọng nhất cho UX.
- `POST /itineraries/{id}/share` — Tạo link chia sẻ (unique token)
- `POST /itineraries/{id}/activities` — Thêm 1 hoạt động vào ngày
- `PUT /itineraries/{id}/activities/{aid}` — Sửa hoạt động (đổi giờ, giá, tên)
- `POST /itineraries/{id}/accommodations` — Thêm khách sạn
- `DELETE /itineraries/{id}/accommodations/{aid}` — Bỏ khách sạn

### Nhóm Places (thêm 5 endpoint mới)
- `GET /destinations/{name}/detail` — Chi tiết thành phố kèm danh sách places
- `GET /places/search` — Tìm kiếm theo keyword + category + city
- `GET /places/{id}` — Chi tiết 1 địa điểm
- `GET/POST/DELETE /users/saved-places` — Bookmark địa điểm yêu thích

### Nhóm AI Agent (4 endpoint hoàn toàn mới)
- `POST /agent/chat` — AI chat (REST, cho FE không hỗ trợ WebSocket)
- `WS /ws/agent-chat/{trip_id}` — AI chat real-time qua WebSocket
- `GET /agent/suggest/{activity_id}` — Gợi ý thay thế (không cần AI, chỉ query DB)
- `GET /agent/rate-limit-status` — Kiểm tra còn bao nhiêu lượt AI hôm nay

> 📖 Bảng mapping đầy đủ 33 core endpoints + EP-34 optional → function: [implementation_plan.md](implementation_plan.md) Endpoint Table

---

## Phần 9: AI System — 4 Cơ Chế AI + Supervisor Orchestration

### Thay đổi cốt lõi

MVP1 gọi Gemini như gọi API bình thường: gửi string prompt, nhận string response, parse thủ công bằng `json.loads()`. Nếu AI trả sai format → crash → fallback sang mock data giả.

MVP2 dùng **LangChain framework** với **structured output** + **LangGraph state machine** + **Supervisor Pattern vừa đủ**. Không phải 1 agent làm tất cả, và cũng không phải request nào cũng qua Supervisor. Generate itinerary là endpoint explicit nên đi thẳng qua `ItineraryPipeline`; chat/analytics là natural-language nên mới cần `TravelSupervisor` phân loại intent.

### 4 Cơ chế AI + Supervisor — Tại sao tách?

| | 🤖 Cơ chế #1: Itinerary Generator | 💬 Agent #2: Companion Chatbot | 📊 SuggestionService DB-only | 📈 Agent #4: AnalyticsWorker optional 🆕 |
|---|---|---|---|---|
| **Làm gì** | Sinh lộ trình hoàn chỉnh | Chat hỏi-đáp, chỉnh sửa trip | Gợi ý thay thế activity | Truy vấn analytics bằng NL |
| **User trigger** | Nhấn "Tạo lộ trình" | Mở chat bubble, gõ tin nhắn | Click "Gợi ý thay thế" | Hỏi "Tôi đã tạo mấy trips?" |
| **Dùng AI?** | ✅ Gemini (RAG Pipeline 5 bước) | ✅ Gemini (LangGraph + 6 Tools) | ❌ KHÔNG — pure DB query | ✅ Gemini (SQL generation) |
| **Stateful?** | ❌ 1 request = 1 trip | ✅ Multi-turn chat (PostgreSQL) | ❌ Stateless | ❌ Stateless |
| **Latency** | 5-20 giây | 2-10 giây/tin nhắn | <100ms | 2-5 giây |

**TravelSupervisor (Orchestrator):** chỉ nhận request AI dạng ngôn ngữ tự nhiên cần định tuyến, ví dụ chat multi-turn hoặc analytics. CRUD requests đi thẳng Service layer; generate itinerary đi direct `ItineraryPipeline`; suggest alternatives đi direct `SuggestionService`.

**Tại sao tách 4 cơ chế thay vì 1 agent duy nhất?** Vì mỗi cơ chế có độ phức tạp khác nhau. Itinerary Generator là pipeline tuần tự → KHÔNG cần LangGraph. Companion cần AI tự quyết định tool → CẦN LangGraph. SuggestionService chỉ query DB nên không gọi là agent AI. AnalyticsWorker là Text-to-SQL optional với guardrails (read-only, self-user).

### Luồng FE ↔ BE ↔ AI

```
User nhấn "Tạo lộ trình" → POST /itineraries/generate → ItineraryService
  → ItineraryPipeline direct (5 steps: validate → RAG fetch → prompt → Gemini structured output → save DB)
  → 201 Created → FE hiện lộ trình

User mở chat "Thêm phở ngày 1" → WS /ws/agent-chat/42 → Supervisor
  → CompanionWorker: Gemini → search_places_db → build proposedOperations
  → WS {"type":"response", "requiresConfirmation":true, "proposedOperations":[...]}
  → FE confirm → PUT /itineraries/{id} hoặc POST /agent/apply-patch → DB mới thay đổi

User click "Gợi ý" → GET /agent/suggest/99 → SuggestionService/PlaceService (direct, no Supervisor)
  → DB: SELECT same category, same city, sort rating DESC LIMIT 5
  → 200 OK [] → FE hiện 5 cards

User hỏi "Tôi đi Đà Nẵng mấy lần?" → POST /agent/analytics → Supervisor  🆕 optional/MVP2+
  → AnalyticsWorker: Text-to-SQL → query checker → execute → format
  → 200 OK {"answer": "Bạn đã đi Đà Nẵng 3 lần", "sql": "SELECT..."}
```

> 📖 Architecture diagrams + sequence diagrams chi tiết: [04_ai_agent_plan.md §0, §9, §10](04_ai_agent_plan.md)
> 📖 Tool signatures + WebSocket protocol: [04_ai_agent_plan.md §4-6](04_ai_agent_plan.md)
> 📖 Prompt Framework 4 trụ cột: [04_ai_agent_plan.md §11](04_ai_agent_plan.md)

---

## Phần 10: FE-BE Schema — Tại sao cần CamelCaseModel?

JavaScript/TypeScript dùng camelCase: `adultPrice`, `endTime`, `busTicketPrice`.
Python dùng snake_case: `adult_price`, `end_time`, `bus_ticket_price`.

Nếu BE trả `{"adult_price": 50000}`, FE đọc `response.adultPrice` sẽ ra `undefined`. Phải mapping thủ công.

MVP2 giải quyết bằng `CamelCaseModel` — Pydantic base class tự convert:
```python
class ActivityResponse(CamelCaseModel):
    adult_price: int    # Code Python dùng snake_case
    # JSON output tự động: {"adultPrice": 50000}  ← FE đọc được
```

Một base class, dùng cho TẤT CẢ response schemas. Developer viết code Python chuẩn (snake_case), FE nhận chuẩn (camelCase). Zero manual mapping.

---

## Phần 11: Error Handling — Structured errors

MVP1 trả lỗi kiểu: `{"detail": "Internal server error"}` — FE không biết phải hiển thị gì.

MVP2 trả lỗi kiểu: `{"detail": "Email đã được đăng ký", "error_code": "CONFLICT", "status_code": 409}` — FE biết chính xác vấn đề, có thể hiển thị message phù hợp (highlight ô email, thay vì popup generic "Có lỗi xảy ra").

Mỗi loại lỗi có exception class riêng:
- `NotFoundException(404)` — Trip/user không tồn tại
- `ConflictException(409)` — Email đã đăng ký, duplicate data
- `ForbiddenException(403)` — Không phải owner của trip
- `UnauthorizedException(401)` — Token hết hạn hoặc sai
- `RateLimitException(429)` — Vượt quota AI (3 lần/ngày)
- `ServiceUnavailableException(503)` — Gemini API down

---

## Phần 12: Caching & Rate Limiting — Redis

### Caching giải quyết gì?

Mỗi khi user mở trang CityList, FE gọi `GET /destinations`. Danh sách 12 thành phố KHÔNG thay đổi thường xuyên (chỉ khi chạy ETL). Nhưng mỗi request vẫn query PostgreSQL → lãng phí.

Redis cache: lần đầu query DB, lưu kết quả vào Redis (TTL 60 phút). 59 phút tiếp theo → trả từ Redis (<5ms thay vì ~50ms).

### Rate Limiting giải quyết gì?

Gemini API có chi phí. Nếu user (hoặc attacker) spam `POST /itineraries/generate` 1000 lần → tốn tiền.

Rate limiter: mỗi user chỉ được gọi AI **3 lần/ngày** (free tier). Redis lưu counter per user per day. Lần thứ 4 → HTTP 429 "Rate limit exceeded, remaining: 0, reset: tomorrow 00:00 UTC".

> 📖 Chi tiết Redis config: [06_scalability_plan.md](06_scalability_plan.md)

---

## Phần 13: Data Pipeline — Thay seed_data.py

MVP1 dùng file `seed_data.py` chạy 1 lần để nhét ~20 places vào DB. Data này là hardcoded, không cập nhật, chỉ cover 4 thành phố. AI Agent cần ít nhất 25-50 places/city để có đủ context.

MVP2 sẽ có ETL pipeline:
1. **Extract:** Gọi Goong API (geocoding, chi tiết địa điểm) + OSM Overpass API (POI — nhà hàng, bảo tàng, công viên)
2. **Transform:** Normalize dữ liệu — gán category (food/attraction/nature...), clean tên, validate fields
3. **Load:** Upsert (INSERT nếu mới, UPDATE nếu đã có) vào PostgreSQL

12 thành phố × 25-50 places = **300-600 places**. Chạy lại mỗi 7 ngày để data luôn fresh.

> 📖 Chi tiết ETL: [05_data_pipeline_plan.md](05_data_pipeline_plan.md)

---

## Phần 14: Testing

MVP1 có vài file test thủ công. MVP2 dùng `pytest` + `pytest-asyncio` với fixture shared:

- `conftest.py` cung cấp: async DB session (SQLite in-memory cho test), test client, sample user/trip
- Mỗi domain 1 file test: `test_auth.py`, `test_users.py`, `test_itinerary.py`, `test_places.py`, `test_agent.py`
- Coverage report: `uv run pytest --cov=src --cov-report=html`
- **65 test cases** chi tiết với input/output cụ thể (bao gồm Supervisor, Analytics optional, Guardrails)
- Coverage target: **≥ 80%** tổng thể

> 📖 Chi tiết use cases + test cases: [10_use_cases_test_plan.md](10_use_cases_test_plan.md)

---

## Phần 15: Deployment — Docker Compose

MVP1: chạy `python main.py` trên terminal, PostgreSQL cài local, không container.

MVP2: 1 lệnh `docker compose up --build` khởi chạy toàn bộ stack:
- **PostgreSQL 16** — database, port 5432
- **Redis 7** — cache + rate limit, port 6379
- **Backend** — FastAPI + uv, port 8000 (multi-stage Docker image ~405 MB)
- **Frontend** — Vite + React, port 3000

Developer mới clone repo chỉ cần: (1) cài Docker, (2) tạo `.env`, (3) `docker compose up`. Không cần cài Python, PostgreSQL, Redis trên máy local.

CI/CD: GitHub Actions tự động chạy lint + test + build Docker → merge chỉ được khi mọi checks pass.

> 📖 Docker + CI/CD chi tiết: [11_cicd_docker_plan.md](11_cicd_docker_plan.md)
> 📖 README setup guide: [07_readme_plan.md](07_readme_plan.md)

---

## Phần 16: File inventory — Xóa / Giữ / Thêm

### Files XÓA (sau khi migrate xong)

Toàn bộ folder `Backend/app/` sẽ bị xóa sau khi code `src/` tương ứng hoàn thành. Ngoài ra, các file config ở root (`render.yaml`, `vercel.json`, root-level `package.json`...) cũng xóa vì chuyển sang Docker.

### Files GIỮ (logic giữ nguyên, di chuyển + refactor)

Logic từ 6 file cũ sẽ được extract và refactor vào file mới tương ứng. Ví dụ: `app/utils/security.py` (JWT + bcrypt) → `src/core/security.py` (giữ logic, thêm refresh token).

### Files MỚI (~55 files)

Tổng cộng cần tạo khoảng 55 file mới trong `src/`, cộng thêm `pyproject.toml`, `config.yaml`, `Dockerfile`, `docker-compose.yml`, và thư mục `alembic/`.

---

## Phần 17: Lịch trình — 8 tuần, 5 PR buckets

Mỗi phase = 1 **roadmap bucket**. Execution thật nên dùng branch ticket nhỏ theo format
`type/task-phase-scope`, rồi squash còn 1 commit cuối trước khi mở PR.

```
Tuần 1-2: Phase A bucket   → nhiều branch ticket nhỏ cho uv/core/models/Alembic/Docker/README
Tuần 3:   Phase B1 bucket  → nhiều branch ticket nhỏ cho Auth + User + tests
Tuần 4:   Phase B2 bucket  → nhiều branch ticket nhỏ cho Trip CRUD + tests
Tuần 5:   Phase B3 bucket  → nhiều branch ticket nhỏ cho Places + Saved Places + Redis + tests
Tuần 6-7: Phase C bucket   → nhiều branch ticket nhỏ cho Itinerary Agent + Companion + WS + tests
Tuần 8:   Phase D bucket   → nhiều branch ticket nhỏ cho ETL, FE-BE testing, documentation
```

**Ưu tiên nếu thiếu thời gian:** Phase A + B1 + B2 là BẮT BUỘC (Foundation + CRUD). B3 quan trọng. C (AI) có thể đẩy sau.

---

## Cross-reference: Khi cần biết gì → đọc file nào

| Câu hỏi | File | Section |
|---------|------|---------|
| "Hệ thống hiện tại có gì?" | [01_mvp1_analysis.md](01_mvp1_analysis.md) | Toàn bộ |
| "FE mới cần BE làm gì?" | [02_fe_revamp_analysis.md](02_fe_revamp_analysis.md) | Section 3-6 |
| "Schema FE vs BE khác gì?" | [02_fe_revamp_analysis.md](02_fe_revamp_analysis.md) | Section 1-2 |
| "File X có function gì?" | [03_be_refactor_plan.md](03_be_refactor_plan.md) | Section 3-9 |
| "DI chain hoạt động thế nào?" | [03_be_refactor_plan.md](03_be_refactor_plan.md) | Section 2 |
| "Endpoint X mất bao lâu?" | [03_be_refactor_plan.md](03_be_refactor_plan.md) | Section 4-5 |
| "AI tools nhận input gì, trả output gì?" | [04_ai_agent_plan.md](04_ai_agent_plan.md) | Section 4 |
| "WebSocket giao tiếp format gì?" | [04_ai_agent_plan.md](04_ai_agent_plan.md) | Section 6 |
| "Có cần MCP không?" | [04_ai_agent_plan.md](04_ai_agent_plan.md) | Section 1 |
| "Data crawl từ đâu?" | [05_data_pipeline_plan.md](05_data_pipeline_plan.md) | Section 2-3 |
| "Redis cache cái gì, bao lâu?" | [06_scalability_plan.md](06_scalability_plan.md) | Section 2 |
| "Rate limit bao nhiêu?" | [06_scalability_plan.md](06_scalability_plan.md) | Section 2.4 |
| "Chạy project thế nào?" | [07_readme_plan.md](07_readme_plan.md) | Toàn bộ |
| "OOP, import, config quy tắc?" | [08_coding_standards.md](08_coding_standards.md) | Toàn bộ |
| "Logger cấu hình thế nào?" | [08_coding_standards.md](08_coding_standards.md) | Section 5 |
| "Database ERD 16 core bảng?" | [09_database_design.md](09_database_design.md) | Section 1-2 |
| "Migration thứ tự ra sao?" | [09_database_design.md](09_database_design.md) | Section 4 |
| "Use case nào cần test?" | [10_use_cases_test_plan.md](10_use_cases_test_plan.md) | Section 2 |
| "Test case input/output?" | [10_use_cases_test_plan.md](10_use_cases_test_plan.md) | Section 4 |
| "CI/CD pipeline thế nào?" | [11_cicd_docker_plan.md](11_cicd_docker_plan.md) | Section 2 |
| "Docker build tối ưu?" | [11_cicd_docker_plan.md](11_cicd_docker_plan.md) | Section 3 |
| "Merge rules, PR quy tắc?" | [11_cicd_docker_plan.md](11_cicd_docker_plan.md) | Section 2.3 |
| "Endpoint X request/response gì?" | [12_be_crud_endpoints.md](12_be_crud_endpoints.md) | Tìm EP-XX |
| "Code endpoint nào trước?" | [12_be_crud_endpoints.md](12_be_crud_endpoints.md) | Implementation Order |
| "Full ItineraryResponse?" | [12_be_crud_endpoints.md](12_be_crud_endpoints.md) | Cuối file |
| "Endpoint nào gọi function nào?" | [implementation_plan.md](implementation_plan.md) | Mapping table |
| "Workflow từ FE → BE → DB ra sao?" | [implementation_plan.md](implementation_plan.md) | 4 Workflows |
| "Git branch nào cho phase nào?" | [implementation_plan.md](implementation_plan.md) | Git section |
| **"Toàn bộ system architecture?"** | **[13_architecture_overview.md](13_architecture_overview.md)** 🆕 | **5-layer, tech stack, deploy** |
| **"Config params ở đâu?"** | **[14_config_plan.md](14_config_plan.md)** 🆕 | **30+ params, yaml/.env/.pydantic** |
| **"Guest claim trip thế nào?"** | **[04_ai_agent_plan.md](04_ai_agent_plan.md)** | **§4.10** |
| **"5 trips limit logic?"** | **[06_scalability_plan.md](06_scalability_plan.md)** | **§7.1** |
| **"Khi nào hệ thống fail?"** | **Phần 18 bên dưới** | **Failure Modes** |
| **"Task nào cần làm hôm nay?"** | **[15_todo_checklist.md](15_todo_checklist.md)** 🆕 | **90 tasks, branch mapping, progress %** |

---

## Phần 18: System Failure Modes & Mitigation 🆕

Bảng dưới liệt kê các kịch bản lỗi quan trọng nhất của hệ thống và cách xử lý. Developer nên hiểu các failure mode này TRƯỚC khi implement, để viết code xử lý lỗi đúng cách.

| # | Failure Scenario | Ảnh hưởng | Mitigation | Response cho User |
|---|-----------------|-----------|------------|-------------------|
| F1 | **Gemini API down / timeout** | AI generation + Chat không hoạt động | Circuit breaker: sau 3 lần fail liên tiếp → trả 503 ngay (không retry). FE hiện "AI tạm thời không khả dụng" | HTTP 503 `{"error_code": "AI_UNAVAILABLE"}` |
| F2 | **Redis down** | Cache miss → mọi request query DB. Rate limiting không hoạt động | Graceful degradation: bỏ qua cache, query DB trực tiếp. Log warning. Rate limit fallback về in-memory counter (chấp nhận không chính xác) | Transparent — user không biết |
| F3 | **PostgreSQL down** | Toàn bộ API fail | Health check endpoint trả 503. Docker restart policy `on-failure`. FE hiển thị "Service maintenance" page | HTTP 503 `{"error_code": "DB_UNAVAILABLE"}` |
| F4 | **JWT Secret bị leak** | Attacker có thể forge token, truy cập mọi account | Rotate `JWT_SECRET_KEY` trong `.env` → restart server. Toàn bộ token cũ invalidate. Force re-login tất cả user | Maintenance mode |
| F5 | **Rate limit Redis key corruption** | User bị block sai hoặc bypass limit | TTL auto-expire (24h). Manual fix: `DEL rate:ai:*` trong Redis CLI | Nếu bị block sai → tự hết sau 24h |
| F6 | **ETL pipeline fail giữa chừng** | Một số city có data, một số không | Partial success: mỗi city là 1 unit. City fail → skip + log. Chạy lại cho city fail: `--cities "Hà Nội"` | Transparent — user thấy data cũ (vẫn valid) |
| F7 | **WebSocket disconnect** | Chat session mất kết nối | FE auto-reconnect (exponential backoff 1s→2s→4s→8s max). Chat history persist trong DB → không mất tin nhắn | FE hiện "Đang kết nối lại..." |
| F8 | **Goong API key expired** | ETL geocoding fail, Places search degraded | Fallback: dùng OSM coords (thay vì Goong). Log error + alert team | ETL continues with OSM data only |

> [!NOTE]
> **Single Point of Failure Analysis:** PostgreSQL là SPOF duy nhất. Redis down = degraded (chậm hơn, không rate limit chính xác). Gemini down = AI features disabled nhưng CRUD vẫn hoạt động. Trong MVP3, thêm DB replica để loại bỏ SPOF.
