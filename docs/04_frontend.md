# 04. Frontend MVP2

## Runtime hiện tại

Frontend source nằm trong `Frontend/`, dùng Vite + React + TypeScript.

```text
Frontend/
├── src/
│   ├── main.tsx
│   └── app/
│       ├── components/
│       ├── data/
│       ├── hooks/
│       ├── pages/
│       ├── types/
│       └── utils/
├── package.json
└── vite.config.ts
```

Root `index.html` đã trỏ tới `Frontend/src/main.tsx` để root build không bị hỏng.

## Contract quan trọng

`Frontend/src/app/types/trip.types.ts` là nguồn đối chiếu public response shape cho itinerary.

Các field cần giữ:

- `Activity.name`, không đổi thành `title`.
- `adultPrice`, `childPrice`, `extraExpenses`.
- `Day.activities`.
- API public trả `camelCase`.

## Trạng thái dữ liệu FE

FE vẫn còn nhiều data mock/localStorage:

- `cities.ts`
- `destinations.ts`
- `places.ts`
- `tripConstants.ts`
- một số flow AI/chat vẫn mock.

Điểm cần làm sau:

- Nối đầy đủ city/hotel/place views sang BE places endpoints.
- Đồng bộ dữ liệu hotel/place theo ETL thay vì chỉ mock vài thành phố.
- Nối FloatingAIChat sang AI companion endpoint sau khi Phase C xong.
- Nối generate itinerary sang AI pipeline thật khi BE sẵn sàng.

## Known CI issue đã fix

GitHub Actions chạy Linux phân biệt chữ hoa/thường. Import FE phải đúng case với tên file. Ví dụ:

```ts
import { TripSidebar } from "../components/TripSidebar";
```

