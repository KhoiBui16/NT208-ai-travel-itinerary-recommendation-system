# Phase C3 Data Readiness — Goong/ETL — 2026-05-28

## Audit Result: PARTIALLY READY

Xem `docs/REPORTS/phase_goong_etl_coverage_analysis.md` (2026-05-27) cho chi tiết đầy đủ. Báo cáo này tóm tắt và bổ sung thêm cho Phase C3/C4.

---

## Summary từ báo cáo trước

| Metric | Status | Chi tiết |
|---|---|---|
| Goong endpoints used | ✅ | autocomplete, place_detail, geocode |
| Goong endpoints NOT used | ⚠️ | Directions, Distance Matrix |
| Rating/review_count | ✅ | Có trong DB |
| Lat/lng | ✅ | Có trong DB |
| Opening hours | ✅ | Format string |
| Place images | ❌ | `image=""` (empty) |
| Hotel data | ❌ | 3/city từ YAML (test-only) |
| Hà Nội | ✅ | ~60 places |
| Đà Nẵng | ❌ | 0 (chưa ETL) |
| TP.HCM | ❌ | 0 (chưa ETL) |

---

## Impact on C3/C4

### C3 Companion Chat

- **Place context**: 60 places Hà Nội đủ cho demo/development
- **Travel time**: Không có Goong Directions → companion chat không tối ưu route
- **Place images**: Activities không hiển thị ảnh đẹp (image empty)

### C4 Chat History

- Không liên quan Goong/ETL — chat history dùng DB `chat_sessions`/`chat_messages`

---

## Recommended actions

| Action | Priority | Khi nào |
|---|---|---|
| Expand `hotels.yaml` (15-20/city) | Cao | Trước C3 full verification |
| Add Goong photo URL extraction | Trung bình | C3 feature enhancement |
| ETL Đà Nẵng + TP.HCM | Cao | Scale production |
| Add Goong Directions caching | Thấp | C3+ route optimization |

---

## Data Readiness: PARTIALLY READY

Hà Nội đủ cho development/demo C3/C4. Đà Nẵng + TP.HCM cần ETL trước production scale.