# 00136 — Local Runtime & Image Path Stabilization Report

> Ngày: 2026-07-04 · Branch: `fix/00136-a-local-runtime-end-user-flow` · Task-ID: 00136
> Phạm vi: đợt sửa lỗi runtime/hình ảnh/dữ liệu **first-pass**, doc-sync sau.
> Nguyên tắc: chỉ sửa bug runtime đã chứng minh; **không** đổi contract AI, **không**
> gán ảnh random để giấu dữ liệu thiếu, **không** tạo Docker image/volume mới.

---

## 1. Bối cảnh

Trước PR này, end-user flow cục bộ có nhiều vết nứt runtime mà docs/ETL chưa phản ánh:

- Ảnh trong DB trỏ tới file **không tồn tại** trên đĩa (ETL sinh path `/img/hotels/<short>.jpg`
  nhưng chưa bao giờ download byte) → trình duyệt load `<img>` gãy.
- Cover destination dùng sai **extension** (luôn giả định `.jpg` dù 9 thư mục crawl là
  `.webp` + 1 thư mục `.png`) và có typo `ha-n-i.jpg`.
- Starlette `FileResponse` dùng `mimetypes.guess_type` để đặt `Content-Type`; trên
  CPython 3.12 Windows, `.webp` trả `(None, None)` → serve `text/plain` → `<img>` gãy
  dù byte đúng.
- User vừa crawl xong bộ ảnh mới nằm trong `asserts/images/` (239 file, ~84 MB) nhưng
  chưa được đưa vào runtime contract, và chưa commit lên GitHub.

Bộ ảnh crawl `asserts/images/` là **source-of-truth** do user thu thập. PR này nhập bộ
ảnh đó vào runtime contract chính thống, sửa các path sai, và commit luôn raw archive.

---

## 2. Canonical runtime image contract

| Lớp                   | Đường dẫn                         | Vai trò                                                       |
| --------------------- | --------------------------------- | ------------------------------------------------------------- |
| **Crawl archive**     | `asserts/images/`                 | Nguồn gốc do user crawl (239 file, ~84 MB, **đã commit**). KHÔNG serve trực tiếp. |
| **Runtime served**    | `Backend/static/img/`             | Subset phục vụ thực tế qua FastAPI `/img/{file_path}`.       |
| **DB stored path**    | `/img/destinations/<slug>.<ext>`  | Origin-relative; FE resolve theo API base.                    |
| **Placeholder**       | `Backend/static/img/placeholder.svg` | Fallback khi DB path rỗng hoặc file thiếu — không bao giờ 404. |

Quy ước đặt tên nguồn crawl:

- `asserts/images/<CityFolder>/AnhDaiDien.<ext>` → cover destination (mỗi thành phố 1 cover).
- `asserts/images/AnhBia.jpg` → hero ảnh trang Home.
- Các file còn lại trong folder → places/hotels, match theo **exact Vietnamese slug**
  của tên file stem với tên trong DB (cùng destination).

**Mapping folder → slug** (23 thành phố có nguồn): `BuonMaThuat→buon-ma-thuot`,
`DANANG→da-nang`, `Dalat→da-lat`, `Hanoi→ha-noi`, `TPHCM→tp-ho-chi-minh`,
`HaLong→ha-long`, `Hagiang→ha-giang`, … (đầy đủ trong `match_images.py`,
mirror đúng `Backend/src/core/slugify.py`).

4 thành phố **KHÔNG** có thư mục nguồn crawl: `chau-doc`, `con-dao`, `mui-ne`, `phong-nha`
→ DB image clear về `''` (FE render placeholder sạch thay vì round-trip 404).

---

## 3. Đã commit raw crawl archive

`asserts/images/` (239 file, ~84 MB) giờ **đã được commit** lên repo theo yêu cầu owner
(là crawl archive, source-of-truth). Folder này KHÔNG nằm trong `.gitignore` và KHÔNG
phục vụ trực tiếp qua API — runtime chỉ serve subset từ `Backend/static/img/`.

- File lớn nhất: `asserts/images/QuyNhon/nha-hang-hai-nam-quy-nhon.jpg` ≈ 4.5 MB
  (tất cả đều dưới ngưỡng 100 MB của GitHub).
- Phân loại: 212 `.jpg`, 18 `.webp`, 3 `.png`, 3 `.jpeg`, 2 `.avif`, 1 `.JPG`.

> Lưu ý lâu dài: commit binary lớn làm tăng repo size/history. Đây là quyết định chủ
> quan của owner vì bộ crawl là dữ liệu gốc cần lưu vết. Nếu sau này cần tách ra, dùng
> Git LFS hoặc chuyển archive sang release asset.

---

## 4. Import vào runtime (`Backend/static/img/`)

Tổng cộng **55 file runtime** (placeholder.svg đã tracked từ trước, ngoài subset này):

| Loại                | Số lượng | Đích                                       |
| ------------------- | -------- | ------------------------------------------ |
| Home hero           | 1        | `home/hero.jpg`                            |
| Destination covers  | 23       | `destinations/<slug>.<ext>` (ext đúng)     |
| Place images        | 18       | `places/<slug>/<stem>.<ext>`               |
| Hotel images        | 12       | `hotels/<slug>/<stem>.<ext>`               |

Toàn bộ file runtime đã verify **sạch CR ở cuối tên** (lỗi từng làm `cp` từ shell script
CRLF sinh ra tên file chứa `\r`, khiến Windows-native `stat`/`Path.is_file()` fail mà
`ls` MSYS vẫn hiện bình thường). Verify bằng PowerShell `Get-ChildItem`: tất cả tên file
đều kết thúc bằng ký tự ASCII hợp lệ, `Test-Path = True`.

Full traceability: [`00136_image_import_mapping.csv`](./00136_image_import_mapping.csv)
— 269 dòng dữ liệu (54 exact match, 30 placeholder/blank, 185 manual_needed chưa match).

---

## 5. Bug runtime & image đã sửa (proven, first-pass)

| #  | Bug | Sửa | File |
| -- | --- | --- | ---- |
| 1  | Docker runtime 3 container exit (255) sau restart Docker Desktop | `docker compose up -d --no-build db redis` rồi `up -d --no-build api` (không build, không prune) | (ops, không commit) |
| 2  | `.webp`/`.avif` serve `text/plain` → `<img>` gãy (CPython 3.12 Win `guess_type('.webp')=(None,None)`) | Đăng ký MIME tường minh `mimetypes.add_type` cho `.webp`, `.avif` | `Backend/src/main.py` |
| 3  | Cover destination sai extension (9 `.webp`+1 `.png` bị ép `.jpg`) + typo `ha-n-i.jpg` | Migration set 23 cover với extension THẬT + sửa `ha-noi` | `Backend/alembic/versions/20260703_0012_…` |
| 4  | Hotel path `/img/hotels/<short>.jpg` do ETL sinh nhưng không có byte | Clear về `''` (blank-before-set), rồi set 12 match chính xác | migration 0012 |
| 5  | 4 destination không có nguồn crawl giữ path dối | Clear về `''` → placeholder | migration 0012 |
| 6  | Container api cũ không thấy file static mới (compose không mount static) | Thêm bind mount read-only `./Backend/static:/app/static:ro` | `docker-compose.yml` |
| 7  | `TripWorkspace.tsx` parse `tripId` param không chống NaN (`Number("")=0`, `Number("abc")=NaN`) | Guard `Number.isFinite` trước khi set state | `Frontend/src/app/pages/TripWorkspace.tsx` |

> KHÔNG đổi UI/UX ở FE (chỉ thêm guard logic theo feedback [[feedback_fe_no_ui_change]]).
> Contract AI (generate itinerary, companion chat, proposedOperations, confirm/apply)
> giữ nguyên — không trong phạm vi.

---

## 6. Migration `20260703_0012_import_crawled_image_paths`

- `down_revision = 20260703_0010` (gộp luôn ý định của WIP 0011 — strip example.com,
  vốn là no-op vì 0 row `example.com` tồn tại).
- **Idempotent**: re-run set lại cùng giá trị.
- **Stable giữa local Docker DB và Render prod**: destinations UPDATE theo `slug`;
  places/hotels UPDATE theo `(name, destination slug)` qua subquery (KHÔNG dùng id số,
  vì id local ≠ id Render). `(name, destination_id)` unique (`uq_places_name_dest` +
  analogue hotels) → mỗi UPDATE trúng đúng 1 row.
- **Safe trên CI fresh DB**: mọi UPDATE là no-op khi row không tồn tại (không raise).
- Downgrade là no-op (enrichment một chiều, giống 0010/0011).

Thứ tự trong `upgrade()`:
1. Strip example.com (defensive, no-op).
2. 23 cover destination theo slug + extension thật + sửa `ha-noi`.
3. Clear 4 destination thiếu nguồn → `''`.
4. 18 place match (name + destination slug).
5a. `UPDATE hotels SET image='' WHERE image LIKE '/img/hotels/%'` (xóa path dối).
5b. 12 hotel match (order quan trọng: blank-before-set).

---

## 7. Cách verify cục bộ (Windows PowerShell)

```powershell
$ROOT = git rev-parse --show-toplevel
Set-Location "$ROOT\Backend"
uv run alembic upgrade head      # apply 0012
uv run alembic check             # "No new upgrade operations detected"

# Serve ảnh đúng content-type cho mọi extension:
curl.exe -i "http://localhost:8000/img/destinations/da-nang.webp"   # 200 image/webp
curl.exe -i "http://localhost:8000/img/hotels/da-nang/<stem>.webp"  # 200 image/webp
curl.exe -i "http://localhost:8000/img/hotels/da-lat/<stem>.avif"   # 200 image/avif
curl.exe -i "http://localhost:8000/img/destinations/da-lat.webp"    # 200 image/webp
```

Smoke đã chạy trên cả Docker `:8000` và host `:8020` — toàn bộ cover webp/avif + place/hotel
trả `200` với `Content-Type` đúng.

---

## 8. Static serving trên Docker & Render

- **Docker local**: `Backend/Dockerfile` đã `COPY static/` vào image; ngoài ra
  `docker-compose.yml` thêm bind mount read-only `./Backend/static:/app/static:ro` để
  file crawl mới thêm dưới host được serve live không cần rebuild image.
- **Render prod**: `Dockerfile` `COPY static/` đủ serve; render build image từ Dockerfile
  nên static có sẵn. Không cần bước thủ công (Render free tier không có Shell —
  [[feedback_render_free_tier_no_shell]]).

---

## 9. Gaps còn lại (KHÔNG phải bug, không block)

- **26 hotel trên placeholder** (trong 38 hotel có DB row): không có nguồn crawl exact-slug
  match → giữ placeholder. Đây là giới hạn dữ liệu crawl, KHÔNG phải lỗi runtime.
- **185 file crawl `manual_needed`**: có ảnh crawl nhưng không match exact-slug với tên
  DB place/hotel (tên file crawl ≠ tên DB). Cần review thủ công nếu muốn nhập thêm —
  ngoài phạm vi first-pass này. Xem cột `match_status=manual_needed` trong mapping CSV.
- **Places phần lớn rỗng**: provider Goong không trả photo cho place (giới hạn provider,
  đã ghi nhận từ 00107), nên chỉ 18 place có ảnh exact-match.
- **1 file `.JPG` chữ hoa** trong crawl (`find` phân biệt hoa thường trên Linux CI, nhưng
  đây là file archive không serve trực tiếp nên không ảnh hưởng runtime).

---

## 10. Verify matrix (local, pre-PR)

| Check | Kết quả |
| ----- | ------- |
| `alembic upgrade head` | DB tại head `20260703_0012` |
| `alembic check` | "No new upgrade operations detected" (không drift) |
| BE unit tests | 194 passed |
| `ruff check src tests` | PASS |
| `ruff format --check src tests` | PASS |
| FE `npm run build` | PASS (24.74s) |
| Docker `:8000` serve ảnh (webp/avif/jpg) | 200, content-type đúng |
| Host `:8020` serve ảnh | 200, content-type đúng |
| Sub-agent audit (foundation/security) | 0 bug, 2 warning (by design) |
| Migration safe vs test assertions | grep tests: không test nào assert path mà 0012 đổi |

CI bắt buộc sẽ chạy: `pr-policy`, `backend-lint`, `backend-unit`, `backend-integration`,
`backend-migrations`, `frontend-build`, `frontend-e2e` (+ Vercel preview).

---

## Phase B — Second-pass image coverage + trip-snapshot fix (2026-07-05)

> Tiếp nối Phase A. Nguyên tắc giữ nguyên: chỉ gán ảnh **đã verify tồn tại trên đĩa**,
> không gán random để giấu thiếu. Mọi UPDATE đều dùng predicate `(name, destination_id)`
> để chạy giống nhau ở local và Render.

### B1. Root-cause audit (ground-truth, không đoán)

Query trực tiếp DB lấy **toàn bộ** image path rồi check tồn tại + khớp case trong
`Backend/static/img/`:

| Lớp | Số path trong DB | Resolve OK |
| --- | ---------------- | ---------- |
| Destinations | 23 | 23/23 ✅ |
| Places (sau 0012) | 18 | 18/18 ✅ |
| Hotels (sau 0012) | 12 | 12/12 ✅ |
| **Tổng Phase A** | **53** | **53/53 ✅** |

→ Foundation Phase A **đã đúng**: `/cities` và `/cities/{slug}` lấy ảnh từ DB,
path đều resolve → hiển thị đúng. `data/cities.ts` + `data/places.ts` là **dead code**
(không page nào import), không phải nguồn lỗi.

### B2. Hai bug thật còn sót

1. **`DailyItinerary.tsx` (dòng ~364, ~463)**: `<img src={item.image}>` và
   `<img src={suggestion.image}>` **không** dùng `resolvePlaceImage` + **không có `onError`**
   → khi path rỗng hoặc URL ngoài gãy, trình duyệt hiện **icon vỡ** thay vì placeholder.
   → **Fix**: import `applyPlaceImageFallback, resolvePlaceImage`; bọc cả hai `<img>`:
   `src={resolvePlaceImage(x.image)}` + `onError={applyPlaceImageFallback}`. (Sửa function,
   không đổi UI.)

2. **Trip snapshot đóng băng ảnh (gốc rễ "trip 837 hiện mock")**:
   `GET /api/v1/itineraries/{id}` trả `activities.image` là **snapshot lưu lúc generate**
   (pipeline `pipeline.py:_activity_image_for_generated_activity` resolve từ `place.image`
   **lúc sinh trip**). Trip generate trước khi có thư viện ảnh → activity.image rỗng mãi.
   Migration 0012/0013 chỉ sửa `places`, **không** sửa trip đã sinh. `accommodations`
   **không** có cột `image` (chỉ lưu `hotel_id`, resolve live) → "nơi ở" đúng khi
   `hotels.image` đúng.

### B3. Migration 0013 (bản ĐÃ SỬA, verified)

Bản nháp sub-agent ban đầu **sai**: 6 path trỏ file không tồn tại (`cho-nha-trang.jpg`,
`hang-mua.jpg`, `trang-an.jpg`, `bai-sao.jpg`, `cong-vien-vinwonders.jpg`, `mui-ne-doi-cat.jpg`)
+ 8 file lệch HOA/thường (`baotanghagiang.jpg` vs `BaoTangHaGiang.jpg`) → 404 trên Linux
Render. **Đã viết lại**, chỉ giữ 14 match đã **verify tay**: DB name tồn tại (query live)
**và** file crawl tồn tại với **đúng tên + extension**. Copy 14 file vào static giữ nguyên
case/extension (Linux-safe).

### B4. Migration 0014 (backfill activity images)

```sql
UPDATE activities a SET image = p.image
FROM places p
WHERE a.place_id = p.id AND p.image<>'' AND (a.image IS NULL OR a.image='')
```

SAFE + idempotent: chỉ fill activity image rỗng khi place liên kết có ảnh thật; không
ghi đè snapshot tốt. Áp dụng cho **mọi** trip cũ.

### B5. Kết quả verify (local docker, end-to-end)

| Check | Kết quả |
| --- | --- |
| `alembic upgrade head` | head `20260703_0014` |
| `alembic check` | No drift |
| `ruff check` migration mới | PASS |
| Ground-truth re-audit | 67/67 path resolve (23D + 31P + 13H) |
| **Trip 837** activities | 2/5 museum giờ có ảnh thật (`/img/places/tp-ho-chi-minh/...`);
  3/5 generic meal (Breakfast/Lunch/Dinner, không phải POI thật, không `place_id`) → rỗng →
  fallback category (đúng) |
| Trip 837 "nơi ở" | hotel `Liberty Central Saigon Riverside` (id 78) **không có** file crawl →
  fallback (đúng, không có ảnh thật) |
| Docker `:8000` serve ảnh trip 837 | `bao_tang_my_thuat.webp` 200 (131KB), `bao-tang-lich-su.jpg` 200 (2.7MB) |
| API `/api/v1/places/destinations` | 27 dest, path đúng |
| API `/api/v1/places/144` | `Bảo tàng Mỹ thuật TP.HCM` → path ảnh mới đúng |
| `FE npm run build` | PASS (21.6s) |

### B6. Render sync — KHÔNG cần dump lại DB

Migrations 0013/0014 dùng predicate portable + file static đã commit → Render tự cập nhật
qua `preDeployCommand: alembic upgrade head` khi deploy code mới (commit → PR → merge).
Dump toàn bộ local→Render sẽ **overwrite** dữ liệu người dùng đã tạo trên Render (rủi ro)
→ **không khuyến nghị**. Chỉ dump lại nếu Render bị lệch schema nặng.

### B7. Goong map — chưa ship (cần verify visually)

Map hiện là placeholder (`DailyItinerary.tsx:512-562`). Data lat/lng **đã có** trong DB
(`destinations.latitude/longitude`, `places.latitude/longitude`; pipeline đã expose ở
suggestion context `pipeline.py:981-982`). Cần: (1) BE expose lat/lng trên
`DestinationResponse`/`PlaceResponse`; (2) FE `npm i @goongmaps/goong-js`; (3) component
`GoongMap` + `VITE_GOONG_MAP_API_KEY`; (4) verify render thực (Playwright bị block trong
Claude bg trên Windows → cần user check bằng mắt). Quyết định **không** ship code map mù
(không verify được) để tránh hỏng build đã xanh; data layer sẵn sàng cho bước kế tiếp.

### B8. Còn lại (non-blocker)

- ~141 file crawl chưa match DB place/hotel (landmark lớn như Hồ Hoàn Kiếm, Văn Miếu, Chùa
  Một Cột chưa có row tương ứng trong DB — ETL ưu tiên POI thực tế). Cần enrich DB hoặc thêm
  row rồi set path theo cùng quy ước verify.

