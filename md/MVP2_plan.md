# 🗺️ MVP #2 — Kế hoạch phát triển

> **Cập nhật:** 2025-03-03
> **Baseline:** MVP #1 hoàn thành (23 commits pushed)

---

## 1. Tổng quan MVP #2

MVP #2 tập trung vào 3 trụ cột:

| # | Trụ cột                  | Mô tả                                                  | Ưu tiên |
|---|-------------------------|---------------------------------------------------------|---------|
| 1 | **Google Maps Data Crawl** | Thay seed_data bằng dữ liệu thực từ Google Maps API   | 🔴 Cao  |
| 2 | **Deploy Production**    | Render (BE) + Vercel (FE) + PostgreSQL cloud           | 🔴 Cao  |
| 3 | **Map Integration**      | Hiển thị bản đồ tương tác trên FE (Leaflet/Google Maps)| 🟡 TB   |

---

## 2. Google Maps API — Crawl Data thay Seed Data

### 2.1 Tại sao thay đổi?

| Seed Data (hiện tại)                         | Google Maps Crawl (MVP #2)                     |
|----------------------------------------------|------------------------------------------------|
| 22 places cứng trong seed_data.py            | Hàng trăm/ngàn places thực tế                 |
| Thiếu tọa độ (lat, lng)                     | Có tọa độ chính xác cho bản đồ                |
| Thiếu rating, reviews                       | Có rating + user_ratings_total                 |
| Hình ảnh từ Unsplash (không liên quan)       | Hình ảnh thực từ Google Maps Photos API        |
| Chỉ 4 thành phố                             | Mở rộng thêm nhiều thành phố                  |
| Dữ liệu tĩnh, không cập nhật               | Có thể re-crawl định kỳ                        |

### 2.2 Google Maps APIs cần dùng

| API                     | Mục đích                                  | Pricing (sau $200 free/tháng) |
|-------------------------|-------------------------------------------|-------------------------------|
| **Places API (New)**    | Tìm kiếm places theo text/nearby          | $32/1000 requests             |
| **Place Details**       | Lấy chi tiết: rating, phone, hours        | $17/1000 requests             |
| **Place Photos**        | Lấy ảnh thực của địa điểm                 | $7/1000 requests              |
| **Geocoding** (tuỳ)    | Chuyển địa chỉ → tọa độ (nếu cần)        | $5/1000 requests              |

> 💰 **Chi phí:** Google cho **$200 free credit mỗi tháng**. Crawl 1 lần ~500 places ≈ $16-25 (dư sức free tier).

### 2.3 Kế hoạch crawl

**Strategy:** Crawl 1 lần, lưu vào DB, không gọi API runtime (tiết kiệm chi phí).

```
Bước 1: Định nghĩa danh sách thành phố + loại địa điểm
Bước 2: Gọi Text Search / Nearby Search cho mỗi (thành phố × loại)
Bước 3: Lấy Place Details cho top results
Bước 4: Download & lưu ảnh (hoặc lưu photo_reference)
Bước 5: Insert vào bảng places (upsert by google_place_id)
```

### 2.4 Schema mở rộng cho bảng `places`

```sql
-- Thêm columns mới vào bảng places (Alembic migration)
ALTER TABLE places ADD COLUMN google_place_id VARCHAR(255) UNIQUE;
ALTER TABLE places ADD COLUMN latitude DOUBLE PRECISION;
ALTER TABLE places ADD COLUMN longitude DOUBLE PRECISION;
ALTER TABLE places ADD COLUMN rating FLOAT;              -- Google rating 1-5
ALTER TABLE places ADD COLUMN user_ratings_total INTEGER; -- Số lượt đánh giá
ALTER TABLE places ADD COLUMN address VARCHAR(500);       -- Formatted address
ALTER TABLE places ADD COLUMN phone VARCHAR(20);
ALTER TABLE places ADD COLUMN website VARCHAR(500);
ALTER TABLE places ADD COLUMN opening_hours JSONB;        -- Giờ mở cửa
ALTER TABLE places ADD COLUMN photo_url VARCHAR(500);     -- URL ảnh đã download
ALTER TABLE places ADD COLUMN types TEXT[];                -- Google place types
ALTER TABLE places ADD COLUMN crawled_at TIMESTAMP DEFAULT NOW();
```

### 2.5 Script crawl (backend/crawl_places.py)

```python
# Pseudo-code cho script crawl
"""
crawl_places.py — Crawl dữ liệu từ Google Maps Places API
Chạy 1 lần: cd Backend && python crawl_places.py
"""

import asyncio
import httpx
from app.config import settings

GOOGLE_MAPS_API_KEY = settings.GOOGLE_MAPS_API_KEY  # Thêm vào .env

# Danh sách thành phố cần crawl
CITIES = [
    {"name": "Hà Nội", "lat": 21.0285, "lng": 105.8542},
    {"name": "TP. Hồ Chí Minh", "lat": 10.8231, "lng": 106.6297},
    {"name": "Đà Nẵng", "lat": 16.0544, "lng": 108.2022},
    {"name": "Hội An", "lat": 15.8801, "lng": 108.3380},
    {"name": "Huế", "lat": 16.4637, "lng": 107.5909},
    {"name": "Nha Trang", "lat": 12.2388, "lng": 109.1967},
    {"name": "Đà Lạt", "lat": 11.9404, "lng": 108.4583},
    {"name": "Phú Quốc", "lat": 10.2270, "lng": 103.9640},
]

# Loại địa điểm cần tìm
PLACE_TYPES = [
    "tourist_attraction",
    "museum",
    "temple",       # Chùa, đền
    "restaurant",
    "cafe",
    "park",
    "beach",        # Bãi biển
    "shopping_mall",
]

async def search_places(city, place_type):
    """Tìm places bằng Nearby Search."""
    url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json"
    params = {
        "location": f"{city['lat']},{city['lng']}",
        "radius": 15000,  # 15km
        "type": place_type,
        "language": "vi",
        "key": GOOGLE_MAPS_API_KEY,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        return resp.json()["results"]

async def get_place_details(place_id):
    """Lấy chi tiết 1 place."""
    url = "https://maps.googleapis.com/maps/api/place/details/json"
    params = {
        "place_id": place_id,
        "fields": "name,formatted_address,geometry,rating,"
                   "user_ratings_total,formatted_phone_number,"
                   "website,opening_hours,photos,types",
        "language": "vi",
        "key": GOOGLE_MAPS_API_KEY,
    }
    async with httpx.AsyncClient() as client:
        resp = await client.get(url, params=params)
        return resp.json()["result"]

async def crawl_all():
    """Main crawl function."""
    for city in CITIES:
        for ptype in PLACE_TYPES:
            places = await search_places(city, ptype)
            for p in places[:10]:  # Top 10 mỗi loại
                details = await get_place_details(p["place_id"])
                # Upsert vào DB...
                await upsert_place(city["name"], details)

# Ước tính: 8 cities × 8 types × 10 places = 640 places
# API calls: 64 search + 640 details = 704 calls ≈ $22 (trong free tier $200)
```

### 2.6 So sánh với Seed Data

| Metric               | seed_data.py | crawl_places.py |
|-----------------------|-------------|-----------------|
| Số places             | 22          | ~500-640        |
| Có tọa độ            | ❌           | ✅               |
| Có rating             | ❌           | ✅               |
| Có ảnh thực           | ❌           | ✅               |
| Có giờ mở cửa        | ❌           | ✅               |
| Tích hợp bản đồ      | ❌           | ✅               |
| Chi phí               | $0          | $0 (free tier)   |
| Thời gian chạy        | <1s         | ~5-10 phút       |

---

## 3. Deploy Production

### 3.1 Kiến trúc Deploy

```
┌─────────────────┐     HTTPS      ┌──────────────────┐
│   Vercel (FE)   │ ──────────────▶│   Render (BE)    │
│   React + Vite  │    API calls   │   FastAPI         │
│   CDN global    │                │   Python 3.12     │
└─────────────────┘                └────────┬─────────┘
                                            │
                                   ┌────────▼─────────┐
                                   │  Render PostgreSQL│
                                   │  Free tier        │
                                   └──────────────────┘
```

### 3.2 Render — Backend FastAPI

**File cấu hình:** `render.yaml` (đã tạo ở root project)

**Các bước deploy:**

1. Đăng nhập https://render.com (dùng GitHub)
2. New → Blueprint → Chọn repo → Render đọc `render.yaml`
3. Review services → Deploy
4. Sau deploy, vào Environment tab:
   - Sửa `DATABASE_URL`: thay `postgresql://` → `postgresql+asyncpg://`
   - Set `GEMINI_API_KEY`: paste API key
   - Set `FRONTEND_URL`: URL Vercel (sau khi deploy FE)
5. Manual Deploy lại sau khi sửa env vars

**Lưu ý Render Free Tier:**
- Server tự tắt sau 15 phút không có request (cold start ~30s)
- PostgreSQL free: 1GB storage, tự xóa sau 90 ngày
- Upgrade Starter ($7/month) nếu cần always-on

### 3.3 Vercel — Frontend React

**File cấu hình:** `vercel.json` (đã tạo ở root project)

**Các bước deploy:**

1. Đăng nhập https://vercel.com (dùng GitHub)
2. Add New Project → Import repo
3. Framework Preset: **Vite** (auto-detect)
4. Root Directory: `.` (root, vì package.json ở root)
5. Build Command: `npm run build` (auto)
6. Output Directory: `dist` (auto)
7. Environment Variables:
   - `VITE_API_BASE_URL` = `https://dulichviet-api.onrender.com/api/v1`
8. Deploy

**Lưu ý:**
- Mỗi push lên `main` sẽ auto-deploy
- Preview deployments cho mỗi PR
- CDN toàn cầu, load nhanh

### 3.4 Sau khi deploy cả 2

Update CORS trên Render:
```bash
# Render Dashboard → Environment Variables
FRONTEND_URL=https://your-app.vercel.app
```

Kiểm tra:
```bash
# Health check
curl https://dulichviet-api.onrender.com/health

# Swagger
open https://dulichviet-api.onrender.com/docs
```

---

## 4. Map Integration — Bản đồ tương tác

### 4.1 Thư viện đề xuất

| Thư viện              | Ưu điểm                         | Nhược điểm             |
|-----------------------|----------------------------------|------------------------|
| **React Leaflet** ⭐  | Free, open-source, nhẹ          | Map tiles chất lượng TB|
| Google Maps React     | Chất lượng cao, Street View      | Cần API key, tốn phí  |
| Mapbox GL             | Đẹp, customizable               | Cần API key            |

**Đề xuất:** Dùng **React Leaflet** (free) + OpenStreetMap tiles. Nếu đã có Google Maps API key thì dùng Google Maps.

### 4.2 Tích hợp vào ItineraryView.tsx

```tsx
// Pseudo-code: Hiển thị bản đồ với các điểm du lịch
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';

<MapContainer center={[cityLat, cityLng]} zoom={13}>
  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
  {activities.map(act => (
    <Marker position={[act.latitude, act.longitude]}>
      <Popup>{act.place_name} — {act.description}</Popup>
    </Marker>
  ))}
</MapContainer>
```

### 4.3 Route Optimization

Sử dụng Google Directions API hoặc OSRM (free) để:
- Vẽ tuyến đường giữa các điểm
- Tính thời gian di chuyển thực tế
- Tối ưu thứ tự thăm quan (TSP solver)

---

## 5. Các tính năng khác MVP #2

| #  | Feature                     | Mô tả                                           | Ưu tiên |
|----|-----------------------------|--------------------------------------------------|---------|
| 5  | Alembic migrations          | DB version control thay create_all()             | 🔴 Cao  |
| 6  | AI Enhancement              | Tuning Gemini prompt, dùng crawled data context  | 🟡 TB   |
| 7  | Scoring system              | Expose auto-score từ BE → FE                     | 🟡 TB   |
| 8  | Edit activities             | Thêm/sửa activities (hiện chỉ xóa)              | 🟡 TB   |
| 9  | Destination normalization   | Fix "Ha Noi" vs "Hà Nội" duplicate              | 🟢 Thấp|
| 10 | Admin panel                 | Quản lý users, places, trips                     | 🟢 Thấp|
| 11 | Unit tests (pytest)         | pytest + httpx async test client                 | 🟡 TB   |
| 12 | Security hardening          | Rate limiting, input sanitization, HTTPS          | 🔴 Cao  |

---

## 6. Timeline đề xuất

```
Tuần 1-2:  Deploy (Render + Vercel) + Fix production issues
Tuần 3-4:  Google Maps API crawl + Schema migration (Alembic)
Tuần 5-6:  Map integration (React Leaflet) + Route display
Tuần 7-8:  AI Enhancement + Scoring + Edit activities
Tuần 9-10: Testing + Security + Polish
```

---

## 7. Environment Variables tổng hợp

### Backend (.env production — Render)

```dotenv
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dulichviet
JWT_SECRET_KEY=<auto-generated-by-render>
JWT_ALGORITHM=HS256
GEMINI_API_KEY=<your-key>
GOOGLE_MAPS_API_KEY=<your-key>          # MVP #2 mới
FRONTEND_URL=https://your-app.vercel.app
DEBUG=False
```

### Frontend (Vercel env vars)

```dotenv
VITE_API_BASE_URL=https://dulichviet-api.onrender.com/api/v1
```
