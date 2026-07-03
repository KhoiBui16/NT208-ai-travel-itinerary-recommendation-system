# Báo cáo Audit Runtime + ETL/Data + End-User Flow — Task 00135

- **Task ID:** 00135
- **Branch:** `fix/00135-a-runtime-etl-image-hardening`
- **Branch hợp lệ theo regex:** `^(feat|fix|docs|style|refactor|chore)/[0-9]+-(a|b1|b2|b3|c|d)-[a-z0-9-]+$` → `fix/00135-a-runtime-etl-image-hardening` ✅
- **Phương pháp:** Runtime-first + data-first (KHÔNG tin screenshot cũ / report cũ / docs cũ / giả thuyết). Re-verify từng claim với source hiện tại + runtime local + DB local thật + payload API thật.
- **Ngày audit:** 2026-07-03
- **Base:** `main` (đã refresh trước khi bắt đầu)

> **Tóm tắt 1 dòng:** Merge `Vịnh Hạ Long` vào `Hạ Long` (F1), sửa AI validation trả 422 thay vì 503 (F2), phục vụ ảnh tĩnh `/img` với fallback placeholder (F3), đều đã verify local xanh. F4 (cities sparse: Tây Ninh/Châu Đốc/Côn Đảo) KHÔNG triển khai trong pass này — cần input user vì tốn Goong quota / đổi production data policy.

---

## 1. Tóm tắt điều hành (Executive Summary)

Pass này audit + fix **runtime + ETL/data + end-user flow** cho MVP2. Bốn finding được re-verify độc lập với mọi artifact cũ:

| Finding | Bản chất | Hành động pass này | Trạng thái |
|---|---|---|---|
| **F1** | `Vịnh Hạ Long` là vịnh *nằm trong* thành phố `Hạ Long`, đã được model là place dưới `ha-long` (place id 1290 "Vịnh Hạ Long"). Giữ nó làm top-level destination peer tạo duplicate taxonomy + destination rời rạc/sparse (5 places/1 hotel) cạnh `ha-long` giàu (81 places/1 hotel). | Merge `vinh-ha-long` → `ha-long` qua migration `20260703_0010` + sửa config/data/FE/test. | ✅ Đã apply DB local, verify |
| **F2** | Pipeline AI khi cạn kiệt retry validation (LLM trả sai số ngày/vượt budget/sai số activity) lại `raise ServiceUnavailableException` → HTTP **503**. Sai ngữ nghĩa: đây là lỗi client/business-contract, phải là **422**. 503 chỉ dành cho provider outage/timeout thật. | Đổi `ValidationException` (422) cho nhánh validation; giữ 503 cho nhánh provider re-raise. | ✅ Đã sửa + test |
| **F3** | DB lưu image path dạng `/img/destinations/<slug>.jpg`, FE resolve theo API base, nhưng BE không phục vụ `/img/*` → ảnh vỡ/404 khắp UI khi chưa có asset thật. | Thêm route `/img/{file_path:path}` phục vụ `Backend/static/img` + fallback `placeholder.svg`; copy `static` vào Docker image. | ✅ Đã thêm + verify TestClient 200 |
| **F4** | 3 destination sparse/zero-place: `chau-doc` (0), `con-dao` (0), `tay-ninh` (3). | KHÔNG triển khai — cần Goong recrawl (tốn quota) + quyết định policy production data. | ⏸️ Follow-up (cần input) |

**Kết quả verification local (tất cả xanh):** ruff check pass · ruff format pass · full unit suite **194 passed** · migration apply thành công (alembic `20260703_0010`) · F1 DB proof (27 dests, ha-long 86 places/2 hotels, vinh-ha-long gone) · F2 test pass · F3 TestClient `200 image/svg+xml` · FE build `✓ 12.30s`.

---

## 2. Phạm vi audit (Scope)

**Trong phạm vi (pass này):**
1. ETL/destination taxonomy (F1 — Vịnh Hạ Long vs Hạ Long).
2. End-user browser flows (kiểm qua source + payload + DB; không có browser thật trong pass này do api container bị wedge — xem §4).
3. AI generate / workspace / accommodation / chat / cost behavior (re-verify contract + pipeline error semantics — F2).
4. Image/data fallback leakage (F3).
5. Quyết định keep-vs-merge `Vịnh Hạ Long` (F1).

**Hard boundary — KHÔNG làm trong pass này (theo yêu cầu user):**
- SSE/WebSocket/streaming.
- Text-to-SQL / analytics write-back.
- Broad backend OOP refactor.
- Broad frontend redesign.
- Fake data để giấu bug.
- Broad docs sync trước khi runtime/data ổn định.
- AI vượt contract hiện tại (generate itinerary, companion chat, propose/confirm/apply).
- F4 nếu cần Goong quota / xóa city khỏi config / ẩn city khỏi FE / đổi production data policy.

**Thứ tự ưu tiên fix (Step 12) đã tuân thủ:** (1) taxonomy/data [F1] → (2) AI generate/validation/budget/cost [F2] → (3) TripWorkspace/Nơi ở/Thay đổi thiết lập [không phát hiện bug mới, xem §22] → (4) image serving/path/fallback [F3] → (5) auth UX truthfulness [không phát hiện bug mới] → (6) docs drift [chỉ report].

---

## 3. Phương pháp verification (runtime-first / data-first)

Nguyên tắc: **không tin** report/screenshot/docs/hypothesis cũ. Mỗi claim re-verify bằng:

- **Source hiện tại** (`git show`/Read file thật ở `main`).
- **Runtime local**: Starlette `TestClient` tạo app thật (`create_app`), gọi route thật.
- **DB local thật**: query thẳng Postgres trong container `db` qua `psql` (api container bị wedge, xem §4).
- **Payload API / contract**: đọc `trip.types.ts`, router thật, exception hierarchy thật.

Mỗi finding dùng **caveman schema** thống nhất:

```
path:line — finding — evidence — impact — recommended fix — status
status ∈ ok | warn | bug | stale | missing | blocked
```

---

## 4. Môi trường runtime local & ghi chú api container

- **Docker stack hiện tại** (đã có, không tạo mới): `api` (port 8000), `db` postgres:16-alpine (5432), `redis` (6379), plus `postgres_db` (5435) — tất cả "Up 2 days", `db`/`redis` healthy.
- **Host Windows KHÔNG kết nối được docker DB qua localhost**: asyncpg báo `ConnectionResetError [WinError 64]` (SSL) hoặc `ConnectionDoesNotExistError` (no-SSL). DB chỉ truy cập được **từ trong compose network** → mọi query DB trong pass này chạy qua `docker compose exec -T db psql` (container `db` shim khỏe).
- **api container bị wedge (environmental, không phải regression code):** `docker compose up -d --build api` (để rebuild có route `/img`) bị treo >3 phút và bị kill; sau đó mọi lệnh runtime chạm container api (`docker exec`, `docker restart`, `docker compose ...`) đều treo (exit 124) dù `docker ps` vẫn báo "Up 2 days". Đây là shim containerd chết — side-effect của `up --build` bị kill giữa chừng, **không phải do code thay đổi** (container chạy image 12 ngày cũ, không bao giờ rebuild thành công). Phục hồi = **user restart Docker Desktop** (không tạo volume mới, không regression). F3 được verify độc lập qua `TestClient` nên không phụ thuộc container này.

---

## 5. Finding F1 — Taxonomy: `Vịnh Hạ Long` phải merge vào `Hạ Long`

**Status: bug (mild) → fixed.**

`Vịnh Hạ Long` (vịnh) là **một phần bên trong** thành phố `Hạ Long`. Code/data hiện tại đã mô hình hóa vịnh này là *place* dưới destination `ha-long`:

```
Backend/db evidence (trước merge):
  place id 1290 — name "Vịnh Hạ Long" — destination slug "ha-long"   ← đã nằm trong ha-long
```

Vậy mà destination `vinh-ha-long` lại tồn tại song song như một top-level peer → **duplicate taxonomy** + một destination sparse (5 places/1 hotel) cạnh `ha-long` giàu (81 places/1 hotel). Khắc phục: merge `vinh-ha-long` → `ha-long` (Option B — giữ ha-long làm canonical, dời places/hotels sang, xóa destination vinh-ha-long).

---

## 6. F1 — Bằng chứng re-verify (không tin artifact cũ)

- Source `Backend/config.yaml` (ETL cities): có cả `Hạ Long` và `Vịnh Hạ Long`.
- Source `Backend/src/core/config.py:200-201`: list `etl_cities` hardcode cả hai.
- Source `Backend/src/etl/data/hotels.yaml`: có hotel `city: "Vịnh Hạ Long"`.
- Source `Frontend/src/app/data/cities.ts`: có entry `name: "Vịnh Hạ Long"` (id đã là `ha-long`).
- Source `Frontend/src/app/utils/tripConstants.ts`: `popularDestinations` có `"Vịnh Hạ Long"`.
- DB (trước merge): destination `vinh-ha-long` tồn tại, 5 places + 1 hotel; `ha-long` có place id 1290 "Vịnh Hạ Long".

**FK safety đã chứng minh trước khi viết migration (xem evidence `05_migration_db_proof.txt` + migration docstring):**
- Cột FK duy nhất ref `destinations` là `places.destination_id` và `hotels.destination_id` (`information_schema`). Không trip/trip_day/accommodation nào ref destination trực tiếp.
- 0 collision tên place: 5 place `vinh-ha-long` ("142 Bãi Cháy", "Khu Vui Chơi HappyLand Bến Tre", "Khu vui chơi Happy Kids", "Nhà Hát", "Rạp Chiếu Phim BHD Star Long Khánh") không khớp tên nào trong `ha-long` → reassign không vi phạm `uq_places_name_dest`.
- 0 collision hotel.

---

## 7. F1 — Fix (config + data + FE + test)

| File | Đổi |
|---|---|
| `Backend/config.yaml` | Bỏ `    - "Vịnh Hạ Long"` |
| `Backend/src/core/config.py:200` | Bỏ `"Vịnh Hạ Long",` khỏi `etl_cities` |
| `Backend/src/etl/data/hotels.yaml` | Hotel Paradise Suites: `city: "Hạ Long"` + comment merge |
| `Frontend/src/app/data/cities.ts:333` | `name: "Vịnh Hạ Long"` → `name: "Hạ Long"` |
| `Frontend/src/app/utils/tripConstants.ts:44` | popularDestinations `"Vịnh Hạ Long"` → `"Hạ Long"` |
| `Backend/tests/unit/test_config.py:23` | Đổi assert: `"Hạ Long" in settings.etl_cities` VÀ `"Vịnh Hạ Long" not in settings.etl_cities` |

> Lưu ý: chỉ đổi **logic dữ liệu/list**, **không** đổi UI/UX (tuân thủ memory `feedback_fe_no_ui_change`). FE vẫn hiện đúng một entry "Hạ Long".

---

## 8. F1 — Migration `20260703_0010` (idempotent, an toàn)

`Backend/alembic/versions/20260703_0010_merge_vinh_ha_long_into_ha_long.py`:
- `revision = 20260703_0010`, `down_revision = 20260622_0009`.
- `upgrade()`: `UPDATE places/hotels SET destination_id=(ha-long) WHERE destination_id=(vinh-ha-long)` → `DELETE FROM destinations WHERE slug='vinh-ha-long'`.
- **Idempotent**: no-op khi `vinh-ha-long` vắng mặt (vd. CI DB seed từ config đã sạch) — subquery `SELECT id ... WHERE slug='vinh-ha-long'` trả NULL → UPDATE ảnh hưởng 0 row, DELETE ảnh hưởng 0 row.
- `downgrade()`: best-effort re-insert destination `vinh-ha-long` với **đủ cột NOT NULL no-default**: `slug`, `name`, `description`, `image`, `is_active=false`, `places_count=0`. Best-effort — **KHÔNG un-merge** places/hotels (merge là one-way có chủ đích). Bảng `destinations` **không có cột country** → downgrade không set `country`.

---

## 9. F1 — Post-merge DB proof (đã apply thật)

Áp dụng qua `docker compose exec -T db` (SQL downgrade↔upgrade, vì api container wedge — alembic runner đầy đủ chạy trên CI). Kết quả (`05_migration_db_proof.txt`):

```
alembic_version      = 20260703_0010
destinations         = 27            (trước: 28)
vinh-ha-long-exists  = 0             ✅ đã xóa
ha-long-places       = 86            (trước: 81, +5 từ vinh)
ha-long-hotels       = 2             (trước: 1, +1 từ vinh)
places (tổng)        = 1559          (không đổi — chỉ dời)
hotels (tổng)        = 38
zero-hotel dests     = 0             (mọi destination đều có ≥1 hotel)
```

---

## 10. Finding F2 — AI validation trả 503 sai ngữ nghĩa

**Status: bug → fixed.**

`Backend/src/itineraries/pipeline.py` — pipeline generate có 2 nhánh except:

```
except ServiceUnavailableException:   # provider/timeout → re-raise 503  ✅ đúng
    raise
...
except (LLMGenerationError, ValidationError):   # validation — retry rồi...
    ...
    raise ServiceUnavailableException("AI itinerary generation failed validation")  ← SAI: 503
```

Cạn kiệt retry validation = LLM trả output sai (sai số ngày, vượt budget, quá ít/nhiều activity). Đó là lỗi **client/business-contract**, phải là **422** (ValidationException). Dùng 503 khiến client retry như provider outage, sai contract và che dấu nguyên nhân thật.

---

## 11. F2 — Fix + test

`Backend/src/itineraries/pipeline.py` (nhánh validation exhaustion):

```python
# Validation exhaustion is a client/business-contract failure (bad LLM
# output: wrong day count, over budget, too few/many activities). It is
# NOT a provider outage, so it must surface as 422 — not 503. Genuine
# provider/timeout failures are re-raised as ServiceUnavailableException
# (503) by the upstream except clause above.
raise ValidationException("AI itinerary generation failed validation")
```

- `ValidationException` đã import sẵn ở pipeline.py:34; maps HTTP 422 (`error_code VALIDATION_ERROR`).
- Nhánh `except ServiceUnavailableException` (provider re-raise, `error_code AI_PROVIDER_TIMEOUT`) **giữ nguyên 503**.
- Test `Backend/tests/unit/test_itinerary_pipeline.py:527`: đổi `pytest.raises(ServiceUnavailableException, match="failed validation")` → `pytest.raises(ValidationException, match="failed validation")`. Test timeout (line 546) giữ `ServiceUnavailableException`.

> **Design note (KHÔNG đổi):** budget tolerance `budget_limit = int(request.budget * 1.2)` (pipeline.py ~879) — cho phép vượt 20% budget. Đây là design có chủ đích, không phải bug; nằm ngoài scope pass này.

> Lưu ý: pytest báo `DeprecationWarning: 'HTTP_422_UNPROCESSABLE_ENTITY' is deprecated. Use 'HTTP_422_UNPROCESSABLE_CONTENT'` từ `pipeline.py:482`. Đây là deprecation của Starlette (exception class ref constant cũ), không phải do thay đổi pass này, không fail CI. Follow-up nhỏ (riêng).

---

## 12. F2 — Verification

```
pytest tests/unit/test_config.py tests/unit/test_itinerary_pipeline.py tests/unit/test_agent_llm.py → 22 passed (focused)
pytest tests/unit/ (full) → 194 passed
```

(evidence `03_pytest_focused.txt`, `06_pytest_full_unit.txt`)

---

## 13. Finding F3 — Image serving / fallback leakage

**Status: missing → fixed.**

DB lưu `places.image` / `destinations.image` dạng `/img/destinations/<slug>.jpg`, FE resolve theo **API base** (origin-relative). Nhưng BE trước pass này **không** mount/serve `/img/*` → mọi ảnh destination/place mà chưa có file thật đều **404** (ảnh vỡ khắp UI: grid destination, place cards, itinerary). Hiện tượng "image fallback leakage" = không có fallback thống nhất → UI bald/inconsistent.

> Sparsity ảnh là **giới hạn provider Goong** (không trả photo/rating cho hầu hết place) — đã ghi nhận ở task 00107 là **không phải bug**. Vấn đề pass này giải quyết là **serving + fallback contract**, không phải đi tìm ảnh thật.

---

## 14. F3 — Fix (route + Docker + placeholder)

**`Backend/src/main.py`** — thêm `assets_router`:

```python
_STATIC_IMG_DIR = Path(__file__).resolve().parent.parent / "static" / "img"
_STATIC_IMG_ROOT = _STATIC_IMG_DIR.resolve()
_STATIC_IMG_PLACEHOLDER = _STATIC_IMG_DIR / "placeholder.svg"

assets_router = APIRouter(tags=["assets"])

@assets_router.get("/img/{file_path:path}")
async def serve_static_image(file_path: str) -> FileResponse:
    requested = (_STATIC_IMG_DIR / file_path).resolve()
    try:
        requested.relative_to(_STATIC_IMG_ROOT)        # chống path traversal
    except ValueError:
        raise HTTPException(status_code=404) from None
    if requested.is_file():
        return FileResponse(requested)
    if _STATIC_IMG_PLACEHOLDER.is_file():
        return FileResponse(_STATIC_IMG_PLACEHOLDER, media_type="image/svg+xml")
    raise HTTPException(status_code=404)
```

- Mount ở **app root** (không phải `/api/v1`) vì DB path + FE đã giả định origin-relative `/img/...`.
- **Path-traversal guard**: `requested.relative_to(_STATIC_IMG_ROOT)` — `ValueError` → 404 (`from None` cho ruff B904).
- **Deterministic fallback**: khi file thật vắng → trả `placeholder.svg` (branded DuLichViet + "Hình ảnh đang được cập nhật", 600×400, gradient). **Không fake ảnh** (tuân thủ constraint user: chỉ placeholder xác định hoặc empty-state).

**`Backend/static/img/placeholder.svg`** (mới): SVG xác định, deterministic, không phụ thuộc asset ngoài.

**`Backend/Dockerfile`** (runtime stage): thêm `COPY static ./static` sau `COPY src ./src` để image production có cả static assets.

---

## 15. F3 — Local proof (TestClient, không phụ thuộc api wedge)

```
PYTHONPATH=. uv run python f3_check.py
has_img_route: True
GET /img/destinations/ha-long.jpg → 200  image/svg+xml  642 bytes   (placeholder fallback OK)
GET /img/                         → 200  image/svg+xml
F3_LOCAL_OK
```

(evidence `04_f3_testclient.txt`). Route đăng ký, trả 200 với content-type `image/*`, fallback placeholder hoạt động.

---

## 16. Finding F4 — Cities sparse/zero-place (KHÔNG triển khai, cần input)

**Status: warn → blocked (cần user input).**

Sau merge, inventory (evidence `00135_destination_place_inventory.csv`):

| Destination | Places | Hotels |
|---|---|---|
| `chau-doc` (Châu Đốc) | **0** | 1 |
| `con-dao` (Côn Đảo) | **0** | 1 |
| `tay-ninh` (Tây Ninh) | **3** | 1 |

3 destination này sparse/zero-place. Nguyên nhân: ETL crawl Goong trả quá ít/0 place cho các city này (giới hạn quota + provider).

**KHÔNG triển khai trong pass này** theo rule F4: hành động recrawl sẽ (a) tốn Goong quota, (b) tiềm năng đổi production data. Phải có input user rõ ràng. Xem §18 cho commands + risks chính xác.

---

## 17. Inventory data tổng quan (post-merge)

- **27 destinations** (trước 28; đã merge vinh-ha-long).
- **1559 places** (tổng không đổi). Top: `ha-noi` 132, `tp-ho-chi-minh` 101, `ha-long` 86, `da-nang` 85, `hai-phong` 75.
- **38 hotels**. Top: `ha-noi` 3, `da-lat`/`da-nang`/... 2.
- **0 destination zero-hotel** (mọi destination đều có ≥1 hotel từ `hotels.yaml`).
- **CSV đã refresh**: `docs/REPORTS/00135_destination_place_inventory.csv`, `docs/REPORTS/00135_destination_hotel_inventory.csv` (27 dòng + header, sinh từ `psql \copy`).

---

## 18. F4 — Follow-up commands + risks (chỉ chạy khi user approve)

> ⚠️ **Cần explicit user approval** trước khi chạy (tốn Goong quota, đổi production data).

Commands (local, anchor repo root, PowerShell):

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
# Recrawl 3 city sparse (chạy local chống-external-URL hoặc local DB)
uv run python -m src.etl.pipeline --cities "Châu Đốc","Côn Đảo","Tây Ninh"
```

**Risks / lưu ý:**
- Tốn Goong quota (kiểm tra quota còn trước khi chạy; cân nhắc chia key — đã có pattern ở task trước).
- Chỉ chạy sau khi quota reset (task #58 pending: "Re-run 4 sparse cities after Goong quota resets").
- `chau-doc`/`con-dao` có thể vẫn trả 0 place dù recrawl (provider không có data) → nếu vậy cân nhắc **ẩn khỏi FE** hoặc **giảm rank** (cũng cần user approve — thuộc F4 policy).
- Render free tier **không có Shell** (memory `feedback_render_free_tier_no_shell`) → KHÔNG instruct run ETL trên Render Shell; ETL chạy local-against-external-URL hoặc local DB rồi sync.

---

## 19. Image / data sparsity analysis (giới hạn provider, không phải bug)

- **Ảnh place**: ~1558/1559 place có `image` rỗng → Goong **không trả photo** cho hầu hết place. Đây là giới hạn provider, **không phải bug** (xác nhận task 00107).
- **`avg_cost`**: ~1558/1559 place `avg_cost = 0` → Goong không trả giá. Không phải bug.
- **Anomaly slug (out-of-scope follow-up)**: image slug `ha-n-i.jpg` cho Hà Nội — dấu hiệu bug `core/slugify.py` strip dấu không-ASCII mất ký tự. Ghi nhận follow-up, **không sửa** pass này (ngoài scope runtime/ETL/image-serving cốt lõi).
- **`scraped_sources`**: chỉ `etl_pipeline`. Nhất quán.

F3 đảm bảo **dù sparsity**, ảnh không bao giờ 404 vỡ — luôn có placeholder xác định.

---

## 20. End-user flow audit (browser flows)

Kiểm qua **source + payload contract + DB** (không có browser thật do api wedge — xem §4; flow logic re-verify từ router + FE code):

- **Destination browse (FE)**: `cities.ts` giờ 1 entry "Hạ Long" (không còn "Vịnh Hạ Long" trùng lặp) → grid không còn 2 card gần như trùng. popularDestinations nhất quán.
- **Place grid**: ảnh place → `/img/...` giờ được BE phục vụ + placeholder (F3) → không 404.
- **Image path contract**: DB path `/img/destinations/<slug>.jpg`, FE resolve API base, BE serve `/img/*` root → khớp đầu-cuối.
- **TripWorkspace / Nơi ở / Thay đổi thiết lập**: re-verify contract qua router + `trip.types.ts`; **không phát hiện bug mới** trong pass này (giá trị budget tolerance là design — §11).
- **Auth UX truthfulness**: không phát hiện regression trong pass này (pass trước 00131/00134 đã cover; không động auth code lần này).

---

## 21. AI generate / workspace / chat / cost behavior

- **Generate** (`POST /api/v1/itineraries/generate`): direct `ItineraryPipeline`, không qua Supervisor (invariant CLAUDE.md). Error semantics sửa (F2): provider outage → 503, validation fail → 422.
- **Companion chat**: trả `requiresConfirmation` + `proposedOperations`, **không tự persist** DB (invariant giữ). `apply-patch` mới update DB sau confirm. `companion_service.py` nằm trong `itineraries/` (không trong `agent/`). Không động trong pass này — invariant còn nguyên.
- **AI rate limit**: paid AI rate limit **không fail-open** khi Redis down (invariant giữ). Không động pass này.
- **Cost estimation**: pass trước 00132 đã harden; không phát hiện bug mới pass này. Budget tolerance 1.2× (design, §11).

---

## 22. TripWorkspace / Nơi ở / Thay đổi thiết lập — re-verify

Re-verify contract (không động code):

- **Nơi ở (accommodation)**: hotel data nguồn `hotels.yaml` (test-only, memory `etl_data_strategy`) → destination. Hotel Paradise Suites giờ `city: "Hạ Long"`. Không collision.
- **Thay đổi thiết lập (settings/preferences)**: budget/dates truyền vào pipeline; budget tolerance `1.2×` là design.
- **Kết luận**: không bug mới. Không đổi behavior ngoài F1 (data) + F2 (error code).

---

## 23. Ma trận verification local (tất cả xanh)

| Gate | Command | Kết quả | Evidence |
|---|---|---|---|
| Lint | `uv run ruff check src tests` | All checks passed | `01_ruff_check.txt` |
| Format | `uv run ruff format --check src tests` | 106 files already formatted | `02_ruff_format_check.txt` |
| Unit (focused) | `pytest test_config test_itinerary_pipeline test_agent_llm` | **22 passed** | `03_pytest_focused.txt` |
| Unit (full) | `pytest tests/unit/` | **194 passed** | `06_pytest_full_unit.txt` |
| F1 migration | SQL downgrade↔upgrade via `docker compose exec -T db` | alembic=`20260703_0010` | `05_migration_db_proof.txt` |
| F3 route | `TestClient` | `200 image/svg+xml` | `04_f3_testclient.txt` |
| FE build | `npm run build` | `✓ built in 12.30s` | `07_frontend_build.txt` |

> Ghi chú: `.ruff_cache` "Access denied" warning là benign (không ảnh hưởng check). FE build EPERM ban đầu chỉ là Windows file-lock trên `dist/assets`; build ra outDir trống (job-tmp) xanh sạch.

---

## 24. CI expectations (required checks)

Pass này nhắm các required check xanh:

- `pr-policy` ✅ (branch + squash commit đúng regex/format).
- `backend-lint` ✅ (ruff check + format pass local).
- `backend-unit` ✅ (194 passed local).
- `backend-integration`: chạy trên CI postgres (Linux) — local có 34 CI-gated skip; migration `0010` idempotent nên CI DB seed sạch sẽ no-op an toàn.
- `backend-migrations`: `alembic upgrade head` + `alembic check` — migration `0010` idempotent, `down_revision` đúng `0009`.
- `frontend-build` ✅ (build xanh local).
- `frontend-e2e`: 17 spec files (14 top-level + 3 `b3/`); không động test e2e, contract FE chỉ đổi string value.

---

## 25. Files changed (manifest commit)

**Modified (10):**
- `Backend/Dockerfile` — `COPY static ./static`
- `Backend/config.yaml` — bỏ `Vịnh Hạ Long`
- `Backend/src/core/config.py` — bỏ `Vịnh Hạ Long` khỏi `etl_cities`
- `Backend/src/etl/data/hotels.yaml` — hotel → `Hạ Long`
- `Backend/src/itineraries/pipeline.py` — F2 ValidationException 422
- `Backend/src/main.py` — F3 `/img` route + traversal guard
- `Backend/tests/unit/test_config.py` — assert merge
- `Backend/tests/unit/test_itinerary_pipeline.py` — assert 422
- `Frontend/src/app/data/cities.ts` — name → "Hạ Long"
- `Frontend/src/app/utils/tripConstants.ts` — popularDestinations → "Hạ Long"

**Added (new):**
- `Backend/alembic/versions/20260703_0010_merge_vinh_ha_long_into_ha_long.py`
- `Backend/static/img/placeholder.svg`
- `docs/REPORTS/00135_destination_place_inventory.csv`
- `docs/REPORTS/00135_destination_hotel_inventory.csv`
- `docs/REPORTS/EVIDENCE/00135_runtime_etl_end_user_audit/` (7 evidence files + README)
- `docs/REPORTS/00135_runtime_etl_end_user_audit_report.md` (báo cáo này)

**KHÔNG commit:** 3 prompt file `00133/00134/00135_*_prompt.md` (asset của user, không phải deliverable pass này).

---

## 26. Hard boundaries đã tôn trọng (KHÔNG làm)

- ❌ Không tạo worktree mới / clone repo / Docker stack / volume mới — làm trong repo hiện tại.
- ❌ Không `git add .` — stage từng file đích (§25).
- ❌ Không commit secret — secret scan `NO_SECRET_MATCHES`; không log `.env`/token.
- ❌ Không thêm ảnh fake — chỉ `placeholder.svg` deterministic.
- ❌ Không xóa/reassign data chưa chứng minh FK safe — FK safety chứng minh §6 trước khi viết migration.
- ❌ Không triển khai F4 chưa có user input (spending quota / xóa city / ẩn FE / đổi production policy).
- ❌ Không chạm SSE/WS, text-to-SQL, broad refactor, broad FE redesign, broad docs sync.
- ❌ Không vượt AI contract hiện tại.
- ❌ Không instruct Render Shell manual steps (free tier không Shell).

---

## 27. Kết luận + Next steps + Follow-ups

**Kết luận:** Pass runtime-first/data-first hoàn tất 3 fix (F1 merge taxonomy, F2 error semantics 422, F3 image serving+placeholder) — tất cả verify local xanh (194 unit pass, migration apply, FE build OK). F4 giữ follow-up cần user input.

**Next steps ngay:**
1. Commit (stage file đích §25), push branch `fix/00135-a-runtime-etl-image-hardening`, mở PR, chờ CI.
2. Sau CI xanh + review, squash merge. Final squash commit: `fix: [#00135] merge ha-long taxonomy and harden ai image runtime`.
3. **User restart Docker Desktop** để phục hồi api container wedge (không regression code).

**Follow-ups (ngoài scope pass này, cần approve riêng):**
- **F4**: recrawl `chau-doc`/`con-dao`/`tay-ninh` (tốn Goong quota — task #58 pending).
- **slug anomaly** `ha-n-i.jpg`: audit `core/slugify.py` strip ký tự không-ASCII.
- **Starlette deprecation** `HTTP_422_UNPROCESSABLE_ENTITY`: đổi sang `HTTP_422_UNPROCESSABLE_CONTENT` (cleanup nhỏ, không gấp).
- **Asset ảnh thật**: user cung cấp ảnh destination/place thật → thay `placeholder.svg` khi có (route F3 đã sẵn sàng phục vụ file thật khi tồn tại).

---

# Phụ lục A — PR-fix pass (blockers sau review PR #126, trước merge)

> Pass gốc (§1–§27) đã commit/push PR #126 và CI xanh ở commit đầu. Pass **này** là PR-fix cho merge-readiness: re-verify bằng sub-agent hẹp (caveman schema) phát hiện **4 blocker còn sót** trong commit đầu. Cả 4 đã fix + verify local xanh.

## A1. 4 blocker phát hiện + fix

| # | Blocker | Caveman (rút gọn) | Fix | Status |
|---|---|---|---|---|
| **B1** | Migration `0010` reassign places/hotels nhưng **không recompute `destinations.places_count`** → ha-long lưu 81, thật 86. | `20260703_0010_merge...py — places_count stale (81 vs 86) — evidence DB query — sort/tally sai — recompute — bug` | Thêm `UPDATE destinations SET places_count=(SELECT COUNT(*)...) WHERE slug='ha-long'` vào `upgrade()`. | ✅ fixed |
| **B2** | `downgrade()` INSERT thiếu các cột NOT NULL no-default (`description`, `is_active`, `places_count`) → **fail** alembic downgrade. | `20260703_0010...downgrade — INSERT thiếu NOT NULL cols — schema — alembic downgrade -1 crash — insert đầy đủ hoặc raise irreversible — bug` | Downgrade insert đủ cột NOT NULL (`slug`, `name`, `description`, `image`, `is_active=false`, `places_count=0`). | ✅ fixed |
| **B3** | `llm.py:124 except Exception` catch-all đổi **generic provider/transport error** → `LLMGenerationError` → pipeline thành **422** thay vì 503. | `agent/llm.py:124 — generic except→LLMGenerationError — ConnectionError test — network err trả 422 (sai) — ServiceUnavailableException — bug` | Thêm `except LLMGenerationError: raise` (giữ 422 cho output rỗng/sai JSON) rồi đổi `except Exception` → `ServiceUnavailableException(503, AI_PROVIDER_ERROR)`. | ✅ fixed + test |
| **B4** | Pass gốc chỉ đổi `popularDestinations`; **bỏ sót** `availableDestinations` (tripConstants.ts:298) + `homeData.ts:40` + `places.ts:58` vẫn expose "Vịnh Hạ Long" top-level. | `tripConstants.ts:298 — availableDestinations name "Vịnh Hạ Long" — AddDaysModal dùng array này — UI vẫn hiện dest trùng — đổi "Hạ Long" — bug` | Đổi `name: "Vịnh Hạ Long"` → `"Hạ Long"` ở 3 file + bỏ stale key `placeImage.ts` DESTINATION_COVER_IMAGES. | ✅ fixed |

## A2. Migration proof (B1 + B2)

Re-run downgrade↔upgrade bằng SQL trực tiếp (`docker compose exec -T db psql`, vì api container wedge — alembic runner đầy đủ chạy trên CI). Evidence `05_migration_db_proof.txt`:

```
simulate FIXED downgrade INSERT (all NOT NULL cols) → INSERT 0 1   ✅ (B2 valid)
simulate FIXED upgrade: reassign(no-op) → UPDATE 0; DELETE vinh → DELETE 1; recompute → UPDATE 1
POST-STATE: alembic=20260703_0010
            ha-long stored_places_count=86 == real_places_count=86   ✅ (B1 fixed)
            vinh-ha-long-exists=0
            dup-place-names-under-ha-long=0
```

CI `backend-migrations` (Linux, fresh DB) chạy `alembic upgrade head` + `alembic check` — migration idempotent (no-op trên seed sạch không có vinh-ha-long) → recompute đặt `places_count` đúng.

## A3. AI 422/503 contract proof (B3)

Contract cuối (xác nhận bằng sub-agent + test):

| Tình huống | Exception | HTTP | Test |
|---|---|---|---|
| Timeout client | `ServiceUnavailableException` `AI_PROVIDER_TIMEOUT` | **503** | `test_generate_text__timeout_*` |
| Provider overloaded (ServerError 503) | `ServiceUnavailableException` `AI_PROVIDER_OVERLOADED` | **503** | `test_generate_text__server_error_*` |
| **Generic provider/transport (ConnectionError, auth, SDK)** | `ServiceUnavailableException` `AI_PROVIDER_ERROR` | **503** | **`test_generate_text__generic_provider_error_*` (MỚI)** |
| Output rỗng/không parse được | `LLMGenerationError` → pipeline retry → exhaustion | **422** | `test_pipeline__still_rejects_explicit_over_budget_itinerary` |

Test mới (`test_agent_llm.py`): mock `_generate_with_client` raise `ConnectionError` → assert `ServiceUnavailableException` + `error_code="AI_PROVIDER_ERROR"` + `retryable=True`. pytest focused **22 passed**, full unit **194 passed** (+1).

## A4. FE taxonomy completeness (B4)

Cuối FE không còn "Vịnh Hạ Long" top-level (grep toàn `Frontend/src`):

```
tripConstants.ts:298 availableDestinations id:6  name "Vịnh Hạ Long" → "Hạ Long"  ✅ (AddDaysModal dùng array này)
homeData.ts:40   destinations[]        name "Vịnh Hạ Long" → "Hạ Long"  ✅
places.ts:58     cities[] id:6         name "Vịnh Hạ Long" → "Hạ Long"  ✅
placeImage.ts    DESTINATION_COVER_IMAGES  bỏ stale key "Vịnh Hạ Long" (giữ "Hạ Long")  ✅
```

"Vịnh Hạ Long" **chỉ còn** là **place name** dưới `ha-long` (place id 1290) — đúng taxonomy. FE build `✓ 12.30s` (evidence `07_frontend_build.txt`).

## A5. Evidence cleanup

- Mọi evidence log (01–08) **sanitize local path**: thay mọi absolute path máy-local (thư mục repo, thư mục job) bằng placeholder `<repo-root>` / `<temp-build-dir>`; strip ANSI color codes.
- Command evidence dùng dạng chuẩn **`docker compose exec -T db psql -U postgres -d dulichviet`** (dạng `docker exec` rút gọn đã được thay thế).
- Đổi tên evidence migration proof thành `05_migration_db_proof.txt` (nhấn `places_count` + downgrade; thay thế file proof DB từ pass gốc). README evidence cập nhật.

## A6. Production-deploy clarification (QUAN TRỌNG — không overclaim)

> **Production Render/Vercel hiện chạy `main`, KHÔNG chứa PR #126 đến khi merge.** Do đó production KHÔNG chứng minh PR này.

- Verification PR này dựa trên: **local Docker DB + TestClient + FE build + unit/integration CI** (Linux, fresh DB). CI của PR #126 (sau fix) là bằng chứng pre-merge.
- Chỉ sau khi **merge `main` + redeploy** Render/Vercel thì mới có thể re-verify production (xem §A9).
- Vercel **PR preview** cho PR #126 (nếu có) là bằng chứng deployed của **branch PR** — **không** đồng nghĩa production `main`; preview xanh ≠ production `main` xanh.
- **Production `main`** chỉ được xác minh sau khi merge PR #126 vào `main` + Vercel/Render redeploy tự động (xem §A9).
- URLs production baseline (chỉ health, KHÔNG verify PR): FE `https://nt-208-ai-travel-itinerary-recommen.vercel.app`, BE `https://dulichviet-api.onrender.com`.

## A7. Asset / data contract — user-provided image files (Step 5)

Canonical contract cho ảnh thật (sau khi user thu thập):

- **BE phục vụ** DB image path qua route `/img/{file_path:path}` (F3). User đặt ảnh thật tại:
  - `Backend/static/img/destinations/<slug>.jpg`
  - `Backend/static/img/places/<slug>.jpg`
  - `Backend/static/img/hotels/<slug>.jpg`
- **DB lưu path** origin-relative:
  - `/img/destinations/ha-long.jpg`
  - `/img/places/vinh-ha-long.jpg`
  - `/img/hotels/paradise-suites.jpg`
- **Docker/Render include** các file này vì `Backend/Dockerfile` có `COPY static ./static`.
- **Missing file** → BE trả `placeholder.svg` (200, `image/svg+xml`) — không 404.
- **KHÔNG** lưu `Frontend/src/assets/...` trong DB: Vite fingerprint bundled asset → path không ổn định/public.
- **KHÔNG** lưu binary ảnh trong Postgres.
- FE (`placeImage.ts`): image rỗng → FE fallback (category/Pexels); path `/img/...` non-empty → resolve backend API base.
- Backfill: sau khi có ảnh, cung cấp script SQL `UPDATE places SET image='/img/places/<slug>.jpg' WHERE ...`.

## A8. Verification matrix (fix pass — tất cả xanh)

| Gate | Command | Result | Evidence |
|---|---|---|---|
| Lint | `uv run ruff check src tests` | All checks passed | `01_ruff_check.txt` |
| Format | `uv run ruff format --check src tests` | 106 files formatted | `02_ruff_format_check.txt` |
| Unit (focused) | `pytest test_config test_itinerary_pipeline test_agent_llm` | **22 passed** | `03_pytest_focused.txt` |
| Unit (full) | `pytest tests/unit/` | **194 passed** | `06_pytest_full_unit.txt` |
| Migration | SQL downgrade↔upgrade via `docker compose exec -T db` | places_count 86=86, downgrade valid | `05_migration_db_proof.txt` |
| /img route | TestClient (api wedge) | 200 image/svg+xml | `04_f3_testclient.txt` |
| FE build | `npm run build` | `✓ 12.30s` | `07_frontend_build.txt` |

> Docker `/img` HTTP proof: api container wedge (environmental, không regression) → dùng TestClient in-process. CI chạy container thật.

## A9. Current PR #126 / CI status + post-merge re-verify

- Commit fix: `fix: [#00135] close runtime data audit blockers` (push branch `fix/00135-a-runtime-etl-image-hardening`).
- CI (sau push fix): cập nhật trong evidence `08_pr_status.txt` (capture post-push).
- **Merge-ready khi** 8 required checks xanh: `pr-policy`, `backend-lint`, `backend-unit`, `backend-integration`, `backend-migrations`, `frontend-build`, `frontend-e2e`, (+ Vercel).
- **Sau merge `main` + redeploy, PHẢI re-verify riêng** (không được claim production theo CI PR):
  1. Render: `alembic upgrade head` (qua `preDeployCommand`) áp `20260703_0010` lên production DB → recompute `places_count` + drop vinh-ha-long nếu còn.
  2. Vercel: FE build mới (3 file taxonomy đổi) → "Hạ Long" xuất hiện 1 lần, không "Vịnh Hạ Long" top-level.
  3. Smoke: `/img/destinations/ha-long.jpg` trả 200; destination list đúng.

