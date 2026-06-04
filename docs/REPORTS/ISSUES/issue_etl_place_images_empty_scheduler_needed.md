# Issue: ETL Place Images Empty — Scheduler/Crawler Needed

**Phase:** `00060K`
**Severity:** P1 — ảnh hưởng UX demo/production
**Status:** Open — category fallback workaround deployed

---

## Tóm tắt

Tất cả 618/618 places trong DB có `image = ''` (empty string). ETL Goong extractor không crawl được image URLs vì Goong Place Detail API không trả về photo URLs trong response hiện tại.

**Hệ quả:**
- Mọi activity image trong AI-generated trip đều blank
- CityDetail API places section không có ảnh thực
- `_activity_image_for_generated_activity` trong pipeline luôn trả empty string

**Workaround đang dùng (00060J):**
`resolvePlaceImageWithCategory(image, category)` → nếu image rỗng, dùng category fallback từ Pexels:
- `food` → `https://images.pexels.com/photos/1640777/...`
- `attraction` → `https://images.pexels.com/photos/2166553/...`
- `nature` → `https://images.pexels.com/photos/1179229/...`
- `entertainment` → `https://images.pexels.com/photos/1105666/...`
- `shopping` → `https://images.pexels.com/photos/1884581/...`

Đây chỉ là giải pháp tạm — tất cả card cùng category sẽ hiện cùng 1 ảnh.

---

## Root cause

`Backend/src/etl/extractors/goong_extractor.py` — Goong Autocomplete + Place Detail không trả `photos` field. Cần crawl từ nguồn khác (Google Places, Foursquare, hay web scraping với alt sources).

---

## Required fix

1. Implement image crawler từ alternative source (Google Places API, OpenStreetMap, web scraping)
2. Hoặc: thêm image seeding vào `hotels.yaml`-style YAML file cho places
3. Backfill `places.image` trong DB sau khi crawl
4. Thêm ETL scheduler để định kỳ update ảnh

---

## Impact if not fixed

- Activity images trong AI trips sẽ tiếp tục dùng category fallback
- CityDetail places section dùng category fallback
- Không thể distinguish các địa điểm cùng category bằng ảnh

---

## Follow-up tag

`00060K` — ETL image crawl/scheduler
