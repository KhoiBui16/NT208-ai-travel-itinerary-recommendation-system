# ETL & Goong API Coverage Analysis — 2026-05-27

## 1. Goong REST API Endpoints hiện tại đang dùng

### Đã implement trong `src/geo/goong_client.py`

| Endpoint | Method | Path | Dùng cho | Trạng thái |
|---|---|---|---|---|
| Place Autocomplete | GET | `/place/autocomplete` | `extract_pois()` — tìm POIs theo keyword + city | ✅ |
| Place Detail | GET | `/place/detail` | `extract_pois()` — enrich từng prediction | ✅ |
| Geocoding | GET | `/geocode` | `_city_bias_location()` — bias location cho autocomplete | ✅ |

### Goong không dùng — có tiềm năng thêm

| Endpoint | Method | Path | Tiềm năng | Notes |
|---|---|---|---|---|
| Direction | GET | `/direction` | Tính thời gian/distance giữa 2 điểm | C.3 companion: build route optimization |
| Distance Matrix | GET | `/distance` | Matrices cho nhiều origin/destination | Phức tạp, tốn API quota |
| Map Matching | GET | `/map matching` | Snap GPS coords vào đường | Chưa cần |
| Tile | GET | `/tile` | Static map images | FE có thể dùng riêng |

---

## 2. GoongExtractor — Chi tiết luồng hiện tại

```text
extract_pois(city, max_items=75)
  │
  ├── _city_bias_location(city)
  │     └── goong.geocode("Hà Nội") → {"lat", "lng"} → "21.0278,105.8342"
  │
  ├── for category in 5 categories:
  │     ├── for keyword in 3 keyword templates:
  │     │     └── goong.autocomplete("nhà hàng Hà Nội", location="lat,lng")
  │     │           → predictions[]
  │     │           → for each prediction: goong.place_detail(place_id)
  │     └── stop khi đạt max_items=75
  │
  └── return raw_pois[] — validated xong → transform()
```

**Keyword/category breakdown:**

| Category | Keywords |
|---|---|
| `food` | "nhà hàng {city}", "quán ăn {city}", "cafe {city}" |
| `attraction` | "địa điểm du lịch {city}", "bảo tàng {city}", "di tích {city}" |
| `nature` | "công viên {city}", "vườn hoa {city}", "khu sinh thái {city}" |
| `entertainment` | "khu vui chơi {city}", "rạp chiếu phim {city}", "nhà hát {city}" |
| `shopping` | "chợ {city}", "trung tâm thương mại {city}", "phố mua sắm {city}" |

**= 5 categories × 3 keywords = 15 autocomplete calls → 15+ place_detail calls**

---

## 3. Vấn đề cần xem xét

### 3.1 Place data coverage có đủ cho AI generate không?

**Source code guard:**
```python
# pipeline.py
MAX_CONTEXT_PLACES = 15        # chỉ lấy 15 places
_minimum_required_places(day_count):
    return min(max(day_count * 2, 2), 6)  # 1 ngày = 2 places, 3+ ngày = 6 places
```

**Tính toán:**
- 1 ngày → cần ≥ 2 places → 15 places OK
- 3 ngày → cần ≥ 6 places → 15 places OK
- 5 ngày → cần ≥ 6 places → 15 places OK
- **Kết luận**: `MAX_CONTEXT_PLACES=15` đủ cho mọi trip 1-14 ngày

### 3.2 Có thiếu data fields từ Goong không?

**Goong.place_detail trả về** (theo ghi chú trong code `geocode failed for address: %s`):
```json
{
  "result": {
    "name": "...",
    "formatted_address": "...",
    "geometry": {"location": {"lat": ..., "lng": ...}},
    "opening_hours": {"weekday_text": [...]},
    "description": "...",
    "photos": [...],
    "rating": 4.2,
    "user_ratings_total": 128,
    "types": [...],
    "website": "...",
    "formatted_phone_number": "..."
  }
}
```

**Những gì hiện tại lưu vào DB (place_transformer):**

| Goong field | DB column | Ghi chú |
|---|---|---|
| `name` | `name` | ✅ |
| `geometry.location` | `latitude`, `longitude` | ✅ |
| `formatted_address` / `description` | `location`, `description` | ✅ |
| `rating`, `user_ratings_total` | `rating`, `review_count` | ✅ |
| `opening_hours.weekday_text` | `opening_hours` | ✅ (format string) |
| `types` → category | `category` | ⚠️ **Manual gán từ keyword** — không dùng Goong types |
| `photos` | `image` | ❌ **Bỏ qua photos** |
| `website` | — | ❌ Không lưu |
| `formatted_phone_number` | — | ❌ Không lưu |

### 3.3 Chỗ thiếu nghiêm trọng

**1. Image (photos) không được lưu vào DB**
- Goong có `photos[]` từ `Place Details` — thường chứa ảnh chất lượng cao
- Hiện chỉ có `image=""` (empty) sau transform
- **Tác động**: Trip workspace hiển thị place không có ảnh đẹp
- **Fix potential**: Lấy `photos[0].photo_reference` + Goong Image API (`/place/photo`) để build image URL

**2. Category chỉ từ keyword search**
- GoongDetail trả về `types` array (VD: `["point_of_interest", "establishment"]`)
- Hiện tại gán category = `category` param truyền vào lúc search (từ `GOONG_CATEGORY_KEYWORDS`)
- Một place có thể đúng trong nhiều category — không được reflect
- **Tác động**: AI generate bị giới hạn category; cùng một place không thể hiện là cả `food` lẫn `attraction`

**3. OSM fallback chỉ là API, không cached**
- OSM Overpass API rate-limit thấp (~5 request/s)
- Không có retry logic cho OSM
- OSM không trả `rating`, `review_count`, `opening_hours`

**4. Hotels ETL chỉ từ YAML, không từ Goong**
- `hotels.yaml` là test-only seed data (hiện tại ~3 hotels mỗi city)
- Không có API lấy hotels từ Goong (và Goong cũng không có dedicated hotel endpoint)
- **Tác động**: AI generate có lớp context hotel rất nghèo nàn

---

## 4. Recommendations cho Goong/ETL

### Ưu tiên cao

1. **Thêm Goong Image URL** → lưu `image` vào `places`: Lấy `place.photos[0].photo_reference`, gọi Goong Photo API để build URL → lưu vào `raw_metadata` hoặc tạo `image_url` column

2. **Thêm `source_types` vào `raw_metadata`**: Lưu Goong `types` array vào `places.raw_metadata` để C.3 companion chat có thể dùng mà không phải re-query Goong

### Ưu tiên trung bình

3. **Tăng `MAX_CONTEXT_PLACES`** từ 15 → 30: Với 5 categories, 15 autocomplete mỗi city lấy 15 places, nhưng mỗi category chỉ có ~3 keywords. Tăng lên 5 keywords/category = 25 calls → lấy đủ 30 places giúp AI generate多样性 tốt hơn

4. **Thêm OSM retry + cache**: OSM có thể trả lời không đầy đủ — nên cache OSM results cho 1 city để không re-query liên tục

5. **Expand `hotels.yaml`**: Thêm 10-20 hotels mỗi city với data thực tế (name, rating, price, location, amenities, image) cho đến khi có nguồn hotel API riêng

---

## 5. Current coverage per city (ước tính sau ETL 2026-05-25)

| City | Places loaded | Categories covered | Hotels | Context OK cho AI? |
|---|---|---|---|---|
| Hà Nội | ~60 | food, attraction, nature, entertainment, shopping | ~3 | ✅ (15 context places đủ) |
| Đà Nẵng | 0 (chưa ETL) | — | 0 | ❌ (cần ETL trước generate) |
| TP.HCM | 0 (chưa ETL) | — | 0 | ❌ (cần ETL trước generate) |

---

## 6. Gaps sẽ ảnh hưởng AI generate quality

| Gap | Hệ quả | Mức độ |
|---|---|---|
| `image=""` (không có ảnh) | Trip workspace activities không hiển thị ảnh đẹp | Trung bình |
| Category chỉ từ search keyword | Cùng 1 place không thể vừa là `food` vừa là `attraction` | Thấp |
| Hotels nghèo nàn (3/city) | AI chỉ suggest khách sạn rất hạn chế | Cao |
| Chưa có Đà Nẵng, TP.HCM data | Không generate được trip cho 2 city phổ biến | Cao |
