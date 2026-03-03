# 📋 Tổng hợp & Phân tích MVP #1 — Hệ thống Đề xuất Du lịch Thông minh bằng AI

> Tài liệu tổng hợp, làm rõ và giải thích chi tiết ý tưởng, yêu cầu và tình trạng hiện tại của MVP #1 dựa trên `doc-MVP#1.md` và `requirement_MVP#1.md`.

---

## 🎯 Tổng quan dự án

**Tên dự án:** Website Hệ thống Đề xuất Lộ trình Du lịch Thông minh bằng AI  
**Mã môn:** NT208 - Lập trình Web  
**Giai đoạn:** MVP #1 (Minimum Viable Product - phiên bản tối thiểu khả dụng)  
**Tech Stack:** React (FE) + FastAPI (BE) + PostgreSQL (DB) + AI Service

### Ý tưởng cốt lõi

Xây dựng một website giúp người dùng **tự động tạo lịch trình du lịch cá nhân hóa** dựa trên:

- Điểm đến mong muốn
- Thời gian chuyến đi
- Ngân sách giới hạn
- Sở thích cá nhân

Hệ thống sẽ sử dụng AI để **phân bổ ngân sách thông minh**, **lựa chọn địa điểm phù hợp**, và **đánh giá mức độ hợp lý** của lịch trình được tạo.

---

## 📖 Phân tích chi tiết `doc-MVP#1.md`

### 1. Người dùng & Phân loại

Hệ thống phân biệt **2 nhóm người dùng:**

#### 👤 Guest (Người dùng chưa đăng ký)

- **Đặc điểm:** Truy cập tự do, không cần tài khoản
- **Quyền hạn:** Chỉ sử dụng chức năng cơ bản
- **Giới hạn:** Không thể lưu lịch trình, không nhận đề xuất cá nhân hóa
- **Mục đích:** Cho phép trải nghiệm nhanh để quyết định đăng ký

#### 👤 Registered User (Người dùng đã đăng ký)

- **Đặc điểm:** Có tài khoản, thông tin cá nhân
- **Quyền hạn:** Toàn bộ chức năng hệ thống
- **Ưu điểm:** Cá nhân hóa, lưu trữ, đề xuất cải thiện theo thời gian

### 2. Use Cases chi tiết

#### Use Cases cho Guest (UC01 - UC07)

| UC   | Tên                      | Chi tiết                                               | Status hiện tại                                |
| ---- | ------------------------ | ------------------------------------------------------ | ---------------------------------------------- |
| UC01 | Truy cập website         | Xem trang chủ, thông tin giới thiệu, điểm đến phổ biến | ✅ Đã có (`Home.tsx`)                          |
| UC02 | Nhập thông tin chuyến đi | Form: điểm đến, ngày đi/về, ngân sách, sở thích        | ✅ Đã có (`TripPlanning.tsx`)                  |
| UC03 | Nhận lộ trình đề xuất    | AI tạo lịch trình → hiển thị kết quả                   | ✅ Đã tích hợp BE (Gemini AI + fallback mock)  |
| UC04 | Xem chi tiết địa điểm    | Xem ảnh, mô tả, chi phí, thời lượng mỗi activity       | ✅ Đã có (`ItineraryView.tsx`)                 |
| UC05 | Xem lộ trình trên bản đồ | Hiển thị tất cả điểm trên bản đồ tương tác             | ⚠️ Placeholder (chưa tích hợp map API thực tế) |
| UC06 | Gợi ý đăng ký tài khoản  | Modal popup gợi ý đăng ký khi muốn lưu                 | ✅ Đã có (modal trong `ItineraryView.tsx`)     |
| UC07 | Chỉnh sửa lộ trình       | Thêm/xóa/thay đổi địa điểm trong lịch trình            | ⚠️ Chỉ có xóa activity (chưa có thêm/thay đổi) |

#### Use Cases cho Registered User (UC08 - UC16)

| UC   | Tên                       | Chi tiết                                          | Status hiện tại                                                  |
| ---- | ------------------------- | ------------------------------------------------- | ---------------------------------------------------------------- |
| UC08 | Đăng ký / Đăng nhập       | Form đăng ký (name, email, pass) + form đăng nhập | ✅ Đã có + tích hợp BE (`Login.tsx`, `Register.tsx` → JWT)       |
| UC09 | Quản lý thông tin cá nhân | Chỉnh sửa name, phone, interests                  | ✅ Đã có + tích hợp BE (`Profile.tsx` → `PUT /users/profile`)    |
| UC10 | Nhập thông tin chuyến đi  | Giống UC02 nhưng gắn với tài khoản                | ✅ Đã có (BE nhận JWT token từ user đăng nhập)                   |
| UC11 | Nhận lộ trình cá nhân hóa | AI dùng sở thích + lịch sử để tối ưu              | ⚠️ Có AI (Gemini) nhưng chưa dùng lịch sử để cá nhân hóa sâu     |
| UC12 | Ước tính chi phí          | Breakdown: activities + lưu trú + ăn uống + tổng  | ✅ Đã có (cost summary trong `ItineraryView.tsx`)                |
| UC13 | Lưu lộ trình              | Lưu lịch trình vào tài khoản với userId           | ✅ Đã có (BE tự động lưu khi generate, userId từ JWT)            |
| UC14 | Xem lại lịch trình đã lưu | Danh sách tất cả lịch trình đã lưu                | ✅ Đã có (`SavedItineraries.tsx` → `GET /itineraries/`)          |
| UC15 | Đánh giá & phản hồi       | Rate 1-5 sao + viết nhận xét                      | ✅ Đã có (modal rating → `PUT /itineraries/{id}/rating`)         |
| UC16 | Nhận đề xuất từ lịch sử   | AI cải thiện đề xuất dựa trên feedback tích lũy   | ❌ Chưa có (BE lưu rating/feedback nhưng chưa dùng để cải thiện) |

### 3. Tính năng giữ chân (Retention) — Giải thích

Document mô tả 4 chiến lược retention:

1. **Thư viện lịch trình cá nhân** — User có thể tạo nhiều lịch trình, so sánh, chọn tốt nhất
   - _Ý nghĩa:_ Không phải dùng 1 lần rồi bỏ, mà quay lại thử nhiều phương án
   - _Status:_ ✅ `SavedItineraries.tsx` + BE `GET /itineraries/` — Đã hoạt động đầy đủ

2. **Chỉnh sửa real-time** — Thay đổi ngân sách/địa điểm → hệ thống tự cập nhật chi phí + điểm số
   - _Ý nghĩa:_ User chủ động tối ưu kế hoạch thay vì nhận gợi ý thụ động
   - _Status:_ ⚠️ Chỉ hỗ trợ xóa activities (`DELETE /itineraries/{id}/activities/{aid}`), chưa có thêm/thay đổi, chưa tự động tính lại tổng chi phí khi xóa

3. **Tích lũy dữ liệu hành vi** — Sở thích + ngân sách + cấu trúc chi tiêu từ lịch sử
   - _Ý nghĩa:_ Lần sử dụng sau càng chính xác hơn
   - _Status:_ ⚠️ BE lưu rating + feedback + interests trong DB, nhưng chưa có AI pipeline dùng dữ liệu này để cải thiện đề xuất

4. **Hệ thống chấm điểm thông minh** — Đánh giá mức phù hợp của lịch trình
   - _Ý nghĩa:_ User biết lịch trình tốt hay không ngay lập tức
   - _Status:_ ⚠️ BE có field `score` trong bảng `trips` và hàm `calculate_score` trong `itinerary_service.py`, nhưng chưa expose rõ ràng lên FE (FE không hiển thị auto-score)

### 4. Phân tích cạnh tranh — Tóm tắt

| Khía cạnh             | Chi tiết                                                                            |
| --------------------- | ----------------------------------------------------------------------------------- |
| **Đối thủ trực tiếp** | iPlan.ai, GuideGeek, Roam Around — AI tạo lịch trình nhưng thiếu độ tin cậy dữ liệu |
| **Đối thủ gián tiếp** | Google Maps, TripAdvisor, Wanderlog — Dữ liệu phong phú nhưng user phải tự làm      |
| **Lợi thế 1**         | Ràng buộc định lượng: ngân sách, số ngày, sở thích → lịch trình khả thi             |
| **Lợi thế 2**         | Dữ liệu có cấu trúc → tối ưu thuật toán, không phải văn bản tự do                   |
| **Lợi thế 3**         | Bản địa hóa VN: quán ăn, địa điểm ngách, mức chi tiêu sát thực tế                   |
| **Chống sao chép**    | CSDL chuẩn hóa riêng + logic đề xuất riêng + dữ liệu hành vi tích lũy               |

### 5. USP (Unique Selling Proposition)

**Core USP:** Phân bổ ngân sách thông minh + Cơ chế chấm điểm lịch trình

Hệ thống **khác biệt** so với đối thủ ở chỗ:

1. **Phân bổ ngân sách trước** → rồi mới chọn địa điểm (không ngược lại)
   - 40% ăn uống, 30% tham quan, 20% di chuyển, 10% dự phòng
2. **Chọn địa điểm dựa trên ràng buộc** ngân sách + số ngày
3. **Tính tổng chi phí ước tính** toàn bộ chuyến đi
4. **Chấm điểm mức độ hợp lý** — xem mức lệch so với phân bổ ban đầu

_Ví dụ: Ngân sách 5tr, ăn uống phân bổ 2tr nhưng thực tế 2.4tr → trừ 5 điểm → score 95/100_

**⚠️ Status:** BE `itinerary_service.py` có hàm tính score và field `score` trong bảng `trips`. Gemini prompt yêu cầu AI phân bổ ngân sách khi tạo lịch trình. Tuy nhiên, FE chưa hiển thị auto-score một cách nổi bật — chỉ hiển thị user rating (1-5 sao). Cơ chế chấm điểm chi tiết (trừ điểm theo tỷ lệ lệch ngân sách) chưa được implement đầy đủ.

---

## 📖 Phân tích chi tiết `requirement_MVP#1.md`

File requirement liệt kê **6 hạng mục bắt buộc** cho MVP #1:

### Requirement #1: Người dùng & Use-cases

- **Yêu cầu:** Phân loại nhóm user, liệt kê use-cases, tính năng retention
- **Status:** ✅ Đã hoàn thành trong `doc-MVP#1.md`

### Requirement #2: Phân tích cạnh tranh

- **Yêu cầu:** Đối thủ, lợi thế, chống sao chép, USP
- **Status:** ✅ Đã hoàn thành trong `doc-MVP#1.md`

### Requirement #3: Sơ đồ Kiến trúc Hệ thống

- **Yêu cầu:** Sơ đồ FE ↔ BE ↔ DB ↔ Services, mô tả modules
- **Status:** ⚠️ Có DFD nhưng **thiếu System Architecture Diagram** riêng biệt
- **Cần bổ sung:** Sơ đồ tổng quan thể hiện rõ React ↔ FastAPI ↔ PostgreSQL ↔ AI Service

### Requirement #4: Thiết kế Luồng dữ liệu & UML

- **Yêu cầu:** DFD + Use-case Diagram + Sequence Diagram
- **Status:** ✅ Đã có đầy đủ
  - `DFD.png` — Data Flow Diagram
  - `UML-Guest.png` + `UML-Register.png` — Use Case Diagrams
  - `Sequence_Guest.png` + `Sequence_Register.png` — Sequence Diagrams

### Requirement #5: Thiết kế Cơ sở dữ liệu

- **Yêu cầu:** ERD với bảng, khóa chính, khóa ngoại, mối quan hệ (PostgreSQL)
- **Status:** ✅ Đã có `Database_MVP.png`

### Requirement #6: Minimum Viable Product

- **Yêu cầu:** MVP chạy được luồng nghiệp vụ cốt lõi, giải thích tech stack, UI cơ bản, UX trơn tru
- **Status:**
  - ✅ FE đã hoàn thiện giao diện cho tất cả luồng (8 pages)
  - ✅ Backend FastAPI đã triển khai (auth, user, itinerary, places endpoints)
  - ✅ PostgreSQL database với 4 bảng ERD + seed data
  - ✅ AI tích hợp (Google Gemini) + fallback mock data
  - ✅ FE-BE integration hoàn chỉnh qua `api.ts` service layer
  - ✅ JWT authentication (bcrypt hash, token-based)
  - ✅ UX luồng chính smooth (19/19 API tests pass)

---

## 📊 Ma trận hoàn thiện MVP #1

| Hạng mục                | Yêu cầu                  | Hiện trạng                             | Cần làm                             |
| ----------------------- | ------------------------ | -------------------------------------- | ----------------------------------- |
| **FE - Pages**          | 8 pages                  | ✅ 8/8 pages                           | —                                   |
| **FE - Auth flow**      | Register/Login/Logout    | ✅ JWT + API (bcrypt, token-based)     | —                                   |
| **FE - Trip Planning**  | Form nhập + AI generate  | ✅ API-first + fallback mock           | —                                   |
| **FE - Itinerary View** | Xem chi tiết + chỉnh sửa | ⚠️ Xem OK, chỉ xóa activity            | Thêm chức năng thêm/sửa activity    |
| **FE - Map**            | Bản đồ tương tác         | ⚠️ Placeholder                         | Tích hợp Map API (Google/Leaflet)   |
| **FE - Scoring**        | Chấm điểm lịch trình     | ⚠️ BE có score field, FE chưa hiển thị | Expose auto-score lên FE            |
| **FE-BE Integration**   | FE gọi BE API            | ✅ api.ts service layer (11 functions) | —                                   |
| **BE - API**            | FastAPI endpoints        | ✅ 12 endpoints (4 routers)            | —                                   |
| **BE - Auth**           | JWT + bcrypt             | ✅ Hoàn chỉnh (register/login/protect) | —                                   |
| **BE - AI**             | Generate itinerary       | ✅ Gemini 1.5-flash + fallback mock    | Tuning prompt, dùng lịch sử         |
| **DB - PostgreSQL**     | Tables theo ERD          | ✅ 4 bảng + relationships + seed data  | Alembic migrations                  |
| **Diagrams**            | DFD, UML, Sequence, ERD  | ✅ 6 diagrams                          | Bổ sung System Architecture Diagram |
| **Documentation**       | Doc + Requirements       | ✅ Đầy đủ (7+ files)                   | —                                   |
| **Testing**             | API test suite           | ✅ 19/19 tests pass                    | —                                   |

---

## 🔑 Kết luận & Ưu tiên tiếp theo

### Đã hoàn thành tốt:

1. ✅ Toàn bộ giao diện FE (8 pages, responsive, UX smooth)
2. ✅ Backend FastAPI hoàn chỉnh (12 endpoints, 4 routers, service layer)
3. ✅ PostgreSQL database (4 bảng ERD, seed data 23 places, 4 cities)
4. ✅ AI Integration — Google Gemini 1.5-flash + fallback mock data
5. ✅ FE-BE Integration — `api.ts` service layer (11 API functions)
6. ✅ JWT Authentication — bcrypt password hashing, token-based auth
7. ✅ Documentation đầy đủ (FE_docs, BE_docs, plan_be, README, diagrams)
8. ✅ 6 diagrams (DFD, UML Guest/Register, Sequence Guest/Register, ERD)
9. ✅ Test suite — 19/19 API tests pass

### Cần ưu tiên (cho phiên bản tiếp theo):

1. 🟡 **Map Integration** — Tích hợp bản đồ thực tế (Google Maps / Leaflet)
2. 🟡 **Scoring System** — Expose auto-score từ BE lên FE, implement chi tiết cơ chế chấm điểm theo tỷ lệ phân bổ ngân sách
3. 🟡 **Edit Activities** — Thêm chức năng thêm/thay đổi activity (hiện chỉ có xóa)
4. 🟡 **AI Personalization** — Dùng lịch sử + feedback để cải thiện đề xuất (UC16)
5. 🟡 **System Architecture Diagram** — Bổ sung theo requirement #3
6. 🟢 **Alembic Migrations** — Database version control
7. 🟢 **State Management** — React Context hoặc Zustand cho global state
8. 🟢 **Environment Variables** — Chuyển `API_BASE_URL` từ hardcoded sang `.env`
9. 🟢 **Admin Panel** — DFD có admin actor nhưng chưa implement
