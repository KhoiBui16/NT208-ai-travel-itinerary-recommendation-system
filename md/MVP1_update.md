# 📋 MVP #1 Update — So sánh Mô tả (doc-MVP#1.md) vs Code Hiện tại

> Tài liệu phân tích chi tiết tình hình code hiện tại so với mô tả trong `doc-MVP#1.md`.
> **Mục đích:** Xác định những gì đã implement, những gì còn thiếu, và mức độ hoàn thiện.
> **Ngày cập nhật:** $(date)

---

## 1. Tổng quan tình hình hiện tại

### Tech Stack đã triển khai

| Layer        | Mô tả trong doc          | Thực tế code                            | Status |
| ------------ | ------------------------ | --------------------------------------- | ------ |
| **Frontend** | React SPA                | React 18 + TypeScript + Tailwind + Vite | ✅     |
| **Backend**  | (không mô tả cụ thể)     | FastAPI + SQLAlchemy 2.0 async          | ✅     |
| **Database** | (không mô tả cụ thể)     | PostgreSQL 16 + asyncpg                 | ✅     |
| **AI**       | AI tạo lịch trình        | Google Gemini 1.5-flash + fallback mock | ✅     |
| **Auth**     | Đăng ký / Đăng nhập      | JWT (python-jose) + bcrypt              | ✅     |
| **FE-BE**    | (implicit qua use-cases) | api.ts centralized service layer        | ✅     |

### Kiến trúc hiện tại

```
Browser (React SPA)
  → api.ts (HTTP layer, token management)
    → FastAPI (http://localhost:8000/api/v1)
      → SQLAlchemy async → PostgreSQL
      → Google Gemini API (AI generation)
```

### Số liệu code

| Metric           | Giá trị                               |
| ---------------- | ------------------------------------- |
| FE pages         | 8 pages                               |
| FE utils         | 3 files (api, auth, itinerary)        |
| FE UI components | 30+ (shadcn/Radix UI)                 |
| BE Python files  | 20+ files                             |
| BE API endpoints | 12 endpoints                          |
| DB tables        | 4 (users, trips, places, trip_places) |
| Seed data        | 23 places, 4 cities                   |
| API test results | 19/19 pass                            |

---

## 2. Phân tích Use Cases — doc-MVP#1.md vs Code

### 2.1 Guest Use Cases (UC01 - UC07)

#### ✅ UC01 — Truy cập website

- **Doc mô tả:** Xem trang chủ, thông tin giới thiệu, điểm đến phổ biến
- **Code hiện tại:** `Home.tsx` — Hero section, 4 features, 6 popular destinations (ảnh Unsplash), CTA buttons
- **Đánh giá:** **Hoàn chỉnh** — Đúng theo mô tả

#### ✅ UC02 — Nhập thông tin chuyến đi

- **Doc mô tả:** Điểm đến, thời gian, ngân sách, sở thích
- **Code hiện tại:** `TripPlanning.tsx` — Form: select destination (10 điểm đến hardcoded), date start/end, budget (VND), interests (5 options toggle)
- **Đánh giá:** **Hoàn chỉnh** — Form có đầy đủ 4 trường yêu cầu. Có thêm auto-fill destination từ URL params khi click từ Home.

#### ✅ UC03 — Nhận lộ trình du lịch được đề xuất

- **Doc mô tả:** AI tạo lịch trình
- **Code hiện tại:** `itinerary.ts` gọi `apiGenerateItinerary()` → BE `POST /itineraries/generate` → Gemini AI tạo JSON activities → lưu DB → trả về FE. Nếu BE down, fallback mock data local (4 cities).
- **Đánh giá:** **Hoàn chỉnh** — AI hoạt động (Gemini 1.5-flash). Có fallback mock data khi offline.

#### ✅ UC04 — Xem chi tiết địa điểm tham quan

- **Doc mô tả:** Xem ảnh, mô tả, chi phí, thời lượng mỗi activity
- **Code hiện tại:** `ItineraryView.tsx` — Mỗi activity hiển thị: ảnh, tên, mô tả, giờ, thời lượng, địa điểm, chi phí. Data từ BE API `GET /itineraries/{id}`.
- **Đánh giá:** **Hoàn chỉnh**

#### ⚠️ UC05 — Xem lộ trình trên bản đồ

- **Doc mô tả:** Hiển thị tất cả điểm trên bản đồ tương tác
- **Code hiện tại:** `ItineraryView.tsx` có toggle "Xem Bản Đồ" nhưng chỉ hiển thị **placeholder text** — **CHƯA** tích hợp map API thực tế (Google Maps/Leaflet/Mapbox)
- **DB đã hỗ trợ:** Bảng `places` có fields `latitude`, `longitude` (NUMERIC). Seed data chưa có toạ độ (null).
- **Đánh giá:** **Thiếu** — Cần tích hợp map library + populate toạ độ cho places

#### ✅ UC06 — Gợi ý đăng ký tài khoản

- **Doc mô tả:** Modal popup gợi ý đăng ký khi muốn lưu
- **Code hiện tại:** `ItineraryView.tsx` — Modal "Save Prompt" tự động hiện khi guest chưa lưu, gợi ý đăng ký
- **Đánh giá:** **Hoàn chỉnh**

#### ⚠️ UC07 — Chỉnh sửa lộ trình

- **Doc mô tả:** Thêm / xóa / thay đổi địa điểm trong lịch trình
- **Code hiện tại:**
  - ✅ **Xóa activity:** `ItineraryView.tsx` edit mode → nút Xóa → `apiRemoveActivity()` → `DELETE /itineraries/{id}/activities/{aid}`
  - ❌ **Thêm activity:** Chưa có UI hoặc API cho thêm activity mới
  - ❌ **Thay đổi activity:** Chưa có UI hoặc API cho sửa activity
- **Đánh giá:** **Thiếu 2/3** — Chỉ implement xóa, chưa có thêm và thay đổi

---

### 2.2 Registered User Use Cases (UC08 - UC16)

#### ✅ UC08 — Đăng ký / Đăng nhập

- **Doc mô tả:** Đăng ký (tên, email, password) + đăng nhập
- **Code hiện tại:**
  - `Register.tsx` → `registerUser()` → `apiRegister()` → `POST /auth/register` (name, email, password) → JWT token + user object
  - `Login.tsx` → `loginUser()` → `apiLogin()` → `POST /auth/login` (email, password) → JWT token + user object
  - BE: bcrypt hash password, JWT access token (HS256, 24h expiry)
- **Đánh giá:** **Hoàn chỉnh** — Bảo mật đầy đủ (bcrypt + JWT)

#### ✅ UC09 — Quản lý thông tin cá nhân

- **Doc mô tả:** Chỉnh sửa thông tin
- **Code hiện tại:** `Profile.tsx` → `updateUserProfile()` → `apiUpdateProfile()` → `PUT /users/profile`. Fields: name (editable), email (disabled), phone, interests (8 options multi-select). Hiển thị ngày tạo + account ID.
- **Đánh giá:** **Hoàn chỉnh**

#### ✅ UC10 — Nhập thông tin chuyến đi (registered)

- **Doc mô tả:** Giống UC02 nhưng gắn với tài khoản
- **Code hiện tại:** `TripPlanning.tsx` gọi `generateItinerary()` → BE nhận JWT token → tạo trip với `user_id` → tự động lưu vào DB
- **Đánh giá:** **Hoàn chỉnh** — BE phân biệt guest (user_id=null) vs registered (user_id=uuid)

#### ⚠️ UC11 — Nhận lộ trình cá nhân hóa bằng AI

- **Doc mô tả:** AI dùng **sở thích + lịch sử** để tối ưu đề xuất
- **Code hiện tại:**
  - ✅ AI dùng **sở thích** (interests từ form) trong Gemini prompt
  - ✅ AI nhận **ngân sách** + **số ngày** để tạo lịch trình phù hợp
  - ❌ AI **CHƯA** dùng lịch sử chuyến đi trước đó để cải thiện
  - ❌ AI **CHƯA** dùng thông tin profile (interests từ Profile.tsx) để cá nhân hóa
- **Đánh giá:** **Một phần** — AI hoạt động cơ bản nhưng chưa cá nhân hóa sâu dựa trên lịch sử

#### ✅ UC12 — Ước tính chi phí chuyến đi

- **Doc mô tả:** Breakdown chi phí
- **Code hiện tại:** `ItineraryView.tsx` — 3 cost cards: Hoạt động (tổng activities), Lưu trú & Ăn uống (days × 800,000 VND), Tổng Chi Phí. Data từ BE `totalCost` field.
- **Đánh giá:** **Hoàn chỉnh** — Có breakdown rõ ràng

#### ✅ UC13 — Lưu lộ trình

- **Doc mô tả:** Lưu lịch trình vào tài khoản
- **Code hiện tại:** BE **tự động lưu** khi generate (INSERT trip + trip_places). Registered user: trip gắn `user_id`. Guest: trip có `user_id=null`.
- **Lưu ý:** `saveItinerary()` trong auth.ts là no-op vì BE đã tự lưu
- **Đánh giá:** **Hoàn chỉnh** — Cải tiến hơn doc (auto-save thay vì manual save)

#### ✅ UC14 — Xem lại lịch trình đã lưu

- **Doc mô tả:** Danh sách tất cả lịch trình đã lưu
- **Code hiện tại:** `SavedItineraries.tsx` → `getSavedItineraries()` → `apiGetItineraries()` → `GET /itineraries/` (BE filter by user_id từ JWT). Grid cards hiển thị: destination, dates, rating, cost, interests, feedback. Actions: "Xem Chi Tiết", "Xóa".
- **Đánh giá:** **Hoàn chỉnh**

#### ✅ UC15 — Đánh giá và phản hồi lộ trình

- **Doc mô tả:** Rate + nhận xét
- **Code hiện tại:** `ItineraryView.tsx` — Modal rating: chọn 1-5 sao + nhập feedback text → `rateItinerary()` → `apiRateItinerary()` → `PUT /itineraries/{id}/rating`. Rating + feedback được lưu trong bảng `trips`.
- **Đánh giá:** **Hoàn chỉnh**

#### ❌ UC16 — Nhận đề xuất mới dựa trên lịch sử và phản hồi

- **Doc mô tả:** AI cải thiện đề xuất dựa trên feedback tích lũy
- **Code hiện tại:**
  - ✅ BE **lưu** rating + feedback trong bảng `trips`
  - ✅ BE **lưu** interests, budget, destination history
  - ❌ BE **CHƯA** có logic đọc lịch sử + feedback để cải thiện prompt AI
  - ❌ FE **CHƯA** có UI "đề xuất dựa trên lịch sử"
- **Đánh giá:** **Chưa implement** — Dữ liệu đã được thu thập nhưng chưa được sử dụng

---

## 3. Phân tích Tính năng Retention — doc vs Code

### 3.1 Thư viện lịch trình cá nhân

| Aspect               | Doc mô tả                   | Code hiện tại                               | Status |
| -------------------- | --------------------------- | ------------------------------------------- | ------ |
| Tạo nhiều lịch trình | ✅ User tạo nhiều phương án | ✅ Mỗi lần generate tạo trip mới trong DB   | ✅     |
| So sánh lịch trình   | ✅ So sánh, chọn tốt nhất   | ❌ Chưa có UI so sánh side-by-side          | ❌     |
| Lịch sử đầy đủ       | ✅ Quay lại xem             | ✅ SavedItineraries.tsx + GET /itineraries/ | ✅     |

### 3.2 Chỉnh sửa real-time

| Aspect              | Doc mô tả                       | Code hiện tại                                      | Status |
| ------------------- | ------------------------------- | -------------------------------------------------- | ------ |
| Xóa địa điểm        | ✅                              | ✅ DELETE /itineraries/{id}/activities/{aid}       | ✅     |
| Thêm địa điểm       | ✅                              | ❌ Chưa có UI/API                                  | ❌     |
| Thay đổi địa điểm   | ✅                              | ❌ Chưa có UI/API                                  | ❌     |
| Tự cập nhật chi phí | ✅ Thay đổi → hệ thống tính lại | ⚠️ Xóa activity chưa tự động recalculate totalCost | ⚠️     |
| Tự cập nhật điểm số | ✅ Thay đổi → score cập nhật    | ❌ Score không recalculate khi edit                | ❌     |

### 3.3 Tích lũy dữ liệu hành vi

| Aspect                | Doc mô tả                    | Code hiện tại                        | Status |
| --------------------- | ---------------------------- | ------------------------------------ | ------ |
| Lưu sở thích          | ✅ Từ profile + trips        | ✅ users.interests + trips.interests | ✅     |
| Lưu lịch sử ngân sách | ✅ Cấu trúc chi tiêu         | ✅ trips.budget + trips.total_cost   | ✅     |
| Lưu feedback          | ✅                           | ✅ trips.rating + trips.feedback     | ✅     |
| AI dùng dữ liệu này   | ✅ Đề xuất sau cải thiện hơn | ❌ AI prompt chưa query lịch sử      | ❌     |

### 3.4 Hệ thống chấm điểm thông minh

| Aspect                        | Doc mô tả                          | Code hiện tại                                          | Status |
| ----------------------------- | ---------------------------------- | ------------------------------------------------------ | ------ |
| Score field                   | ✅ Điểm số mức phù hợp             | ✅ trips.score (INTEGER, nullable)                     | ✅     |
| Auto-calculate score          | ✅ Dựa trên tỷ lệ lệch ngân sách   | ⚠️ BE có calculate_score nhưng logic đơn giản          | ⚠️     |
| Phân bổ ngân sách 40/30/20/10 | ✅ Ăn/Tham quan/Di chuyển/Dự phòng | ❌ Chưa implement phân bổ theo tỷ lệ cụ thể            | ❌     |
| FE hiển thị score             | ✅ User thấy ngay                  | ❌ FE chỉ hiển thị user rating (1-5), không auto-score | ❌     |
| Trừ điểm theo tỷ lệ lệch      | ✅ Ví dụ: vượt 20% → -5 điểm       | ❌ Chưa implement chi tiết                             | ❌     |

---

## 4. Phân tích USP (Unique Selling Proposition) — doc vs Code

### 4.1 Phân bổ ngân sách thông minh

**Doc mô tả:**

- Phân bổ ngân sách trước: 40% ăn uống, 30% tham quan, 20% di chuyển, 10% dự phòng
- Chọn địa điểm dựa trên ràng buộc ngân sách + số ngày
- Tính tổng chi phí ước tính

**Code hiện tại:**

- ✅ BE nhận budget + interests → gửi prompt cho Gemini → AI tạo activities với cost
- ✅ BE tính `total_cost` = sum(all activity costs)
- ⚠️ Gemini prompt có yêu cầu "phân bổ ngân sách hợp lý" nhưng **không enforce tỷ lệ 40/30/20/10** cụ thể
- ❌ Chưa có logic phân bổ ngân sách trước → rồi chọn địa điểm fit vào từng nhóm
- ❌ Chưa có breakdown chi phí theo nhóm (ăn/tham quan/di chuyển/dự phòng) trên FE

**Đánh giá:** **Một phần** — AI có tạo lịch trình theo ngân sách, nhưng chưa đúng theo cơ chế phân bổ tỷ lệ chi tiết mô tả trong doc.

### 4.2 Cơ chế chấm điểm đặc biệt

**Doc mô tả:**

- Đánh giá mức độ hợp lý dựa trên: mật độ hoạt động, thời lượng mỗi ngày, mức tuân thủ cơ cấu ngân sách
- Ví dụ: Ngân sách 5tr, ăn uống phân bổ 2tr nhưng thực tế 2.4tr → trừ 5 điểm → score 95/100

**Code hiện tại:**

- ✅ DB có field `trips.score` (INTEGER)
- ⚠️ BE `itinerary_service.py` có `calculate_score` nhưng logic đơn giản (chưa match doc)
- ❌ Chưa có phân tích theo nhóm chi tiêu (ăn uống vs tham quan vs di chuyển)
- ❌ FE **không hiển thị** auto-score (chỉ hiển thị user rating 1-5 sao)

**Đánh giá:** **Thiếu** — Đây là USP core nhưng chưa implement đúng theo mô tả.

---

## 5. Phân tích Cạnh tranh — Lợi thế đã hiện thực hóa

### 5.1 Đề xuất thông minh có ràng buộc

| Ràng buộc          | Doc | Code | Chi tiết                                      |
| ------------------ | --- | ---- | --------------------------------------------- |
| Ngân sách tối đa   | ✅  | ✅   | Gemini prompt nhận budget, tạo activities fit |
| Số ngày du lịch    | ✅  | ✅   | BE tính total_days, tạo days array            |
| Sở thích cá nhân   | ✅  | ✅   | interests gửi trong prompt                    |
| Chi phí trung bình | ✅  | ⚠️   | Places có cost field nhưng AI có thể override |

### 5.2 Kiến trúc dữ liệu có cấu trúc

| Feature                    | Doc | Code                        |
| -------------------------- | --- | --------------------------- |
| Lưu – chỉnh sửa lịch trình | ✅  | ⚠️ Chỉ lưu + xóa activity   |
| Thuật toán tối ưu chi phí  | ✅  | ❌ Chưa implement riêng     |
| Cá nhân hóa từ lịch sử     | ✅  | ❌ Data lưu nhưng chưa dùng |

### 5.3 Bản địa hóa Việt Nam

| Feature                  | Doc | Code | Chi tiết                                     |
| ------------------------ | --- | ---- | -------------------------------------------- |
| Quán ăn địa phương       | ✅  | ✅   | Seed data có quán ăn VN (Bún chả, Phở, ...)  |
| Địa điểm du lịch ngách   | ✅  | ⚠️   | 23 places nhưng chỉ 4 cities, chưa ngách lắm |
| Mức chi tiêu sát thực tế | ✅  | ✅   | Cost in VNĐ, formatCurrency()                |
| Chi phí theo người       | ✅  | ❌   | Chưa có khái niệm "cost per person"          |
| Phân loại mức giá        | ✅  | ❌   | Chưa có bình dân/trung cấp/cao cấp           |

---

## 6. Tổng kết — Mức độ hoàn thiện theo doc-MVP#1.md

### 6.1 Scorecard tổng quan

| Hạng mục                           | Mô tả trong doc | Đã implement                   | Mức hoàn thiện |
| ---------------------------------- | --------------- | ------------------------------ | -------------- |
| **Guest Use Cases (UC01-07)**      | 7 UC            | 5 full + 2 partial             | **~80%**       |
| **Registered Use Cases (UC08-16)** | 9 UC            | 7 full + 1 partial + 1 missing | **~78%**       |
| **Tính năng Retention**            | 4 features      | 1 full + 2 partial + 1 missing | **~40%**       |
| **USP: Phân bổ ngân sách**         | Core feature    | Partially (AI basic)           | **~30%**       |
| **USP: Cơ chế chấm điểm**          | Core feature    | DB field only                  | **~15%**       |
| **Phân tích cạnh tranh**           | 3 lợi thế       | 2 partial + 1 basic            | **~50%**       |

### 6.2 Những gì ĐÃ HOÀN THÀNH tốt (vượt kỳ vọng)

1. ✅ **Full-stack architecture** — FE + BE + DB + AI hoạt động end-to-end
2. ✅ **JWT authentication** — Bảo mật đúng chuẩn (bcrypt + JWT token)
3. ✅ **API-first design** — api.ts centralized layer, 11 functions
4. ✅ **Fallback mechanism** — Khi BE down, FE vẫn hoạt động với mock data
5. ✅ **Auto-save** — BE tự lưu trip khi generate (cải tiến hơn doc)
6. ✅ **19/19 API tests pass** — Backend ổn định
7. ✅ **Responsive UI** — 8 pages, 30+ UI components
8. ✅ **Loading states** — Loader2 spinner, disabled buttons khi chờ API

### 6.3 Những gì CÒN THIẾU so với doc

| Priority | Feature                             | Doc section    | Effort ước tính |
| -------- | ----------------------------------- | -------------- | --------------- |
| 🔴 High  | Map integration (UC05)              | §1.2.1 UC05    | Medium          |
| 🔴 High  | Scoring system chi tiết (USP)       | §2.3.2.4 USP   | High            |
| 🔴 High  | Phân bổ ngân sách 40/30/20/10 (USP) | §2.3.2.4 USP   | High            |
| 🟡 Med   | Thêm/sửa activity (UC07)            | §1.2.1 UC07    | Medium          |
| 🟡 Med   | AI cá nhân hóa từ lịch sử (UC11)    | §1.2.2 UC11    | High            |
| 🟡 Med   | Đề xuất từ feedback (UC16)          | §1.2.2 UC16    | High            |
| 🟡 Med   | So sánh lịch trình side-by-side     | §1.3 Retention | Low             |
| 🟢 Low   | Chi phí theo người (per person)     | §2.3.1 Data    | Low             |
| 🟢 Low   | Phân loại mức giá (bình dân/cao)    | §2.3.1 Data    | Low             |
| 🟢 Low   | Tự recalculate cost khi edit        | §1.3 Retention | Medium          |
| 🟢 Low   | System Architecture Diagram         | Requirement #3 | Low             |

### 6.4 Đánh giá tổng thể

**MVP #1 đã implement thành công ~75% các tính năng mô tả trong doc-MVP#1.md.**

**Điểm mạnh:**

- Toàn bộ luồng nghiệp vụ cốt lõi (Guest + Registered User) hoạt động end-to-end
- Architecture vững chắc: FE → api.ts → BE → DB, dễ mở rộng
- AI integration cơ bản hoạt động (Gemini) với fallback mechanism
- Authentication + Authorization đúng chuẩn bảo mật

**Điểm yếu:**

- USP core (phân bổ ngân sách + scoring) là điểm khác biệt được mô tả chi tiết nhất trong doc nhưng chưa implement đúng mức
- Map integration là feature visible nhưng vẫn placeholder
- AI chưa tận dụng dữ liệu lịch sử đã thu thập

**Khuyến nghị cho phiên bản tiếp:**

1. Ưu tiên implement scoring system + budget allocation — đây là USP tạo khác biệt
2. Tích hợp map (Leaflet miễn phí) — tăng trải nghiệm thị giác
3. Enhance AI prompt với lịch sử user — tăng giá trị retention
