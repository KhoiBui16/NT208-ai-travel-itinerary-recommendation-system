# Issue: Multi-city ETL Required Before Multi-city Generate

## Status
OPEN

## Evidence
- **B2 API Matrix** (2026-05-28):
  - `POST /generate {"destination":"Thanh pho Ho Chi Minh",...}` → 422
  - `POST /generate {"destination":"TP. Ho Chi Minh",...}` → 422
  - `POST /generate {"destination":"Da Nang",...}` → 422
  - Response: `{"detail":"Destination data not found. Please run ETL for this destination first.","error_code":"VALIDATION_ERROR","status_code":422}`
- **DB query**: `SELECT id, name FROM destinations` → 1 row (Hà Nội only)
- **FE cities.ts**: 12 thành phố hiển thị, chỉ 1 có data

## Impact
- 11/12 thành phố FE hiển thị sẽ fail 422 khi user generate
- C3 companion chat không thể test multi-city
- C2 suggestions trả empty cho mọi thành phố ngoài Hà Nội
- Demo/presentation chỉ có thể dùng Hà Nội

## Reproduction
1. `POST /api/v1/itineraries/generate` với `destination: "Ho Chi Minh City"`
2. Response: 422 `Destination data not found`

## Expected
- TP.HCM, Đà Nẵng, Hội An, Nha Trang có data trong DB
- Generate pipeline hoạt động cho ít nhất 5 thành phố chính

## Actual
- DB chỉ có Hà Nội: 68 places, 3 hotels
- TP.HCM: 0 places, 0 hotels
- Đà Nẵng: 0 places, 0 hotels

## Suggested fix
Chạy ETL cho các thành phố ưu tiên:
```bash
# Từ Backend/
uv run python -m src.etl --cities "Thành phố Hồ Chí Minh"
uv run python -m src.etl --cities "Đà Nẵng"
uv run python -m src.etl --cities "Hội An"
uv run python -m src.etl --cities "Nha Trang"
```

Cần `GOONG_API_KEY` trong environment.

## Recommended branch
`feat/00052-c-etl-goong-data-expansion`
