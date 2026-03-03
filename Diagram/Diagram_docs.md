# 📊 Mô tả chi tiết các Diagram trong hệ thống MVP #1

> Tài liệu mô tả chi tiết các sơ đồ thiết kế hệ thống. Các mô tả dưới đây được **xác nhận trực tiếp từ nội dung file ảnh PNG** kết hợp với tài liệu use-cases (doc-MVP#1.md) và requirements (requirement_MVP#1.md).

---

## 📁 Danh sách Diagram

| File                    | Loại sơ đồ                        | Mô tả ngắn                               |
| ----------------------- | --------------------------------- | ---------------------------------------- |
| `Database_MVP.png`      | ERD (Entity Relationship Diagram) | Thiết kế CSDL PostgreSQL cho MVP #1      |
| `DFD.png`               | Data Flow Diagram                 | Luồng dữ liệu trong hệ thống             |
| `Sequence_Guest.png`    | Sequence Diagram                  | Luồng tương tác của Guest (chưa đăng ký) |
| `Sequence_Register.png` | Sequence Diagram                  | Luồng tương tác của Registered User      |
| `UML-Guest.png`         | UML Use Case Diagram              | Use cases cho Guest                      |
| `UML-Register.png`      | UML Use Case Diagram              | Use cases cho Registered User            |

---

## 1. `Database_MVP.png` — ERD (Sơ đồ Cơ sở dữ liệu MVP)

### Mục đích

Thể hiện cấu trúc cơ sở dữ liệu PostgreSQL cho giai đoạn MVP #1, bao gồm các bảng chính, khóa chính, khóa ngoại và mối quan hệ giữa các bảng.

### Các bảng thực tế (từ hình ảnh ERD)

#### Bảng `USER`

| Type   | Column    | Key |
| ------ | --------- | --- |
| int    | user_id   | PK  |
| string | full_name |     |
| string | email     | ★   |
| string | password  |     |
| string | role      |     |

> **Ghi chú:** Cột `email` có ký hiệu ★ (Unique constraint). Bảng USER lưu thông tin tài khoản người dùng, bao gồm vai trò (role) để phân quyền.

#### Bảng `TRIP`

| Type   | Column      | Key |
| ------ | ----------- | --- |
| int    | trip_id     | PK  |
| int    | user_id     | FK  |
| string | destination |     |
| int    | total_days  |     |
| float  | budget      |     |

> **Ghi chú:** Bảng TRIP lưu thông tin chuyến đi, liên kết với USER qua `user_id` (FK). Chứa điểm đến, số ngày, và ngân sách.

#### Bảng `PLACE`

| Type   | Column           | Key |
| ------ | ---------------- | --- |
| int    | place_id         | PK  |
| string | place_name       |     |
| string | category         |     |
| float  | rating           |     |
| float  | popularity_score |     |

> **Ghi chú:** Bảng PLACE lưu thông tin địa điểm du lịch, bao gồm phân loại (category), đánh giá (rating) và điểm phổ biến (popularity_score).

#### Bảng `TRIP_PLACE` (Bảng trung gian — quan hệ N-N)

| Type | Column        | Key |
| ---- | ------------- | --- |
| int  | trip_place_id | PK  |
| int  | trip_id       | FK  |
| int  | place_id      | FK  |
| int  | day_number    |     |
| int  | visit_order   |     |

> **Ghi chú:** Bảng trung gian giải quyết quan hệ nhiều-nhiều giữa TRIP và PLACE. Mỗi record xác định 1 địa điểm cụ thể trong 1 chuyến đi, bao gồm ngày thứ mấy (`day_number`) và thứ tự tham quan trong ngày (`visit_order`).

### Mối quan hệ (từ hình ảnh)

```
USER (1) ←──── (N) TRIP           [1 user có nhiều trips]
TRIP (1) ←──── (N) TRIP_PLACE     [1 trip có nhiều trip_places]
PLACE (1) ←──── (N) TRIP_PLACE    [1 place xuất hiện trong nhiều trip_places]
```

### ⚠️ So sánh ERD vs Code FE hiện tại

| ERD (Database_MVP.png)                 | Code FE hiện tại (auth.ts)                         |
| -------------------------------------- | -------------------------------------------------- |
| `USER.user_id` (int, PK)               | `User.id` (string, timestamp-based)                |
| `USER.full_name`                       | `User.name`                                        |
| `USER.role`                            | Chưa có trường role trong FE                       |
| `TRIP` (chuyến đi)                     | `Itinerary` (lịch trình) — khác tên nhưng tương tự |
| `TRIP.total_days`                      | Tính từ `startDate` và `endDate`                   |
| `PLACE` (bảng riêng)                   | Activities nằm inline trong Itinerary              |
| `TRIP_PLACE` (bảng trung gian N-N)     | `ItineraryDay.activities[]` (array lồng nhau)      |
| `TRIP_PLACE.day_number`, `visit_order` | `ItineraryDay.day`, activity index                 |

> **Lưu ý quan trọng:** ERD thiết kế theo chuẩn normalized (bảng `PLACE` riêng biệt, quan hệ N-N qua `TRIP_PLACE`), trong khi code FE hiện tại dùng cấu trúc denormalized (activities nằm inline). Backend cần theo ERD nhưng API response nên flatten cho FE dễ sử dụng.

---

## 2. `DFD.png` — Data Flow Diagram (Biểu đồ luồng dữ liệu)

### Mục đích

Thể hiện cách dữ liệu đi vào hệ thống, được xử lý, và lưu trữ. DFD này áp dụng cho toàn bộ hệ thống MVP #1.

### Cấu trúc DFD thực tế (từ hình ảnh)

#### External Entities (Thực thể bên ngoài)

- **Người dùng** (hình chữ nhật, bên trái) — Người sử dụng hệ thống
- **Quản trị viên** (hình chữ nhật, giữa dưới) — Quản lý dữ liệu địa điểm

#### Processes (Tiến trình xử lý — hình tròn)

| ID  | Tên process                             | Chức năng                                          |
| --- | --------------------------------------- | -------------------------------------------------- |
| P1  | Nhập & xử lý; xử lý thông tin chuyến đi | Thu thập và validate dữ liệu đầu vào từ người dùng |
| P2  | Đề xuất lộ trình bằng AI                | Xử lý dữ liệu hợp lệ + AI tạo lịch trình           |
| P3  | Ước tính chi phí                        | Tính toán chi phí dự kiến cho lộ trình             |
| P4  | Quản lý lộ trình                        | Lưu, cập nhật, quản lý lộ trình                    |

#### Data Stores (Kho dữ liệu — hình trụ)

| ID  | Tên             | Chức năng                        |
| --- | --------------- | -------------------------------- |
| D1  | CSDL Người dùng | Lưu thông tin tài khoản user     |
| D2  | CSDL Địa điểm   | Dữ liệu master về địa điểm       |
| D3  | CSDL Lộ trình   | Lưu trữ lộ trình đã tạo/lưu      |
| D4  | CSDL Phản hồi   | Lưu feedback/đánh giá người dùng |

#### Luồng dữ liệu chính (từ hình ảnh)

```
Người dùng ──[Thông tin chuyến đi]──→ P1: Nhập & xử lý thông tin chuyến đi
P1 ──[Dữ liệu hợp lệ]──→ P2: Đề xuất lộ trình bằng AI

P2 ──[Truy vấn địa điểm]──→ D2: CSDL Địa điểm
D2 ──[Dữ liệu địa điểm]──→ P2

P2 ──[Lộ trình đề xuất]──→ P3: Ước tính chi phí
P3 ──[Chi phí dự kiến]──→ Người dùng

P2 ──[Lộ trình]──→ P4: Quản lý lộ trình
P4 ──[Lưu / cập nhật]──→ D3: CSDL Lộ trình

D4: CSDL Phản hồi ──[Dữ liệu học]──→ P2 (AI học từ phản hồi)
Người dùng ──[Phản hồi]──→ D4: CSDL Phản hồi

Người dùng ←──[Lộ trình đã lưu]──── D3 (hoặc qua P4)

Quản trị viên ──[Cập nhật dữ liệu]──→ D2: CSDL Địa điểm
Quản trị viên ←──[Dữ liệu địa điểm]── D2
```

### Mapping DFD → Tech Stack

| DFD Element        | Implementation                                      |
| ------------------ | --------------------------------------------------- |
| Người dùng         | React Frontend (Browser)                            |
| Quản trị viên      | Admin panel (chưa có trong MVP #1)                  |
| P1, P2, P3, P4     | FastAPI Backend (routers + services)                |
| D1 CSDL Người dùng | PostgreSQL `users` table                            |
| D2 CSDL Địa điểm   | PostgreSQL `destinations` / `places` table          |
| D3 CSDL Lộ trình   | PostgreSQL `itineraries` + `trip_place` tables      |
| D4 CSDL Phản hồi   | PostgreSQL `itineraries.rating` + `feedback` fields |

---

## 3. `Sequence_Guest.png` — Sequence Diagram cho Guest

### Mục đích

Thể hiện trình tự tương tác giữa Guest (người dùng chưa đăng ký) với hệ thống, từ lúc truy cập đến khi xem lịch trình.

### Lifelines (từ hình ảnh)

- **Guest** (Actor — stick figure, bên trái)
- **Web Interface** (UI/Browser)
- **Server** (Backend)
- **Database** (PostgreSQL)
- **AI Recommendation Engine** (External AI service)

### Sequence chính (từ hình ảnh)

```
=== UC01 - Truy cập website ===
Guest → Web Interface: UC01 - Truy cập website
Web Interface → Server: Request trang chủ
Server → Web Interface: Response giao diện
Web Interface → Guest: Hiển thị website

=== UC02 - Nhập thông tin chuyến đi ===
Guest → Web Interface: UC02 - Nhập thông tin chuyến đi
Web Interface → Server: Gửi dữ liệu chuyến đi
Server → Database: Lưu dữ liệu tạm thời
Database → Server: Xác nhận lưu

=== UC03 - Yêu cầu tạo lộ trình ===
Server → AI Recommendation Engine: UC03 - Yêu cầu tạo lộ trình
AI Recommendation Engine → Server: Lộ trình đề xuất
Server → Web Interface: Trả kết quả lộ trình
Web Interface → Guest: Hiển thị lộ trình

=== UC04 - Xem chi tiết địa điểm ===
Guest → Web Interface: UC04 - Xem chi tiết địa điểm
Web Interface → Server: Yêu cầu thông tin địa điểm
Server → AI Recommendation Engine: Lấy dữ liệu địa điểm
Server → Database: Truy vấn địa điểm
Database → Server: Thông tin chi tiết
Server → Web Interface: Trả dữ liệu
Web Interface → Guest: Hiển thị chi tiết địa điểm

=== UC05 - Xem lộ trình trên bản đồ ===
Guest → Web Interface: UC05 - Xem lộ trình trên bản đồ
Web Interface → Server: Yêu cầu dữ liệu bản đồ
Server → Web Interface: Dữ liệu tọa độ
Web Interface → Guest: Hiển thị bản đồ lộ trình

=== UC07 - Chỉnh sửa lộ trình ===
Guest → Web Interface: UC07 - Chỉnh sửa lộ trình
Web Interface → Server: Gửi thay đổi lộ trình
Server → AI Recommendation Engine: Tối ưu lại lộ trình
AI Recommendation Engine → Server: Lộ trình mới
Server → Web Interface: Trả lộ trình cập nhật
Web Interface → Guest: Hiển thị lộ trình mới

=== UC06 - Gợi ý đăng ký tài khoản ===
Web Interface → Guest: UC06 - Gợi ý đăng ký tài khoản
Web Interface → Guest: Hiển thị thông báo đăng ký
```

---

## 4. `Sequence_Register.png` — Sequence Diagram cho Registered User

### Mục đích

Thể hiện trình tự tương tác của người dùng đã đăng ký, bao gồm xác thực, tạo lịch trình, lưu trữ, đánh giá, và nhận đề xuất từ lịch sử.

### Lifelines (từ hình ảnh)

- **RegisteredUser** (Actor — stick figure, bên trái)
- **Web Interface** (UI/Browser)
- **Server** (Backend)
- **Database** (PostgreSQL)
- **AI Recommendation Engine** (External AI service)

### Sequence chính (từ hình ảnh)

```
=== UC08 - Đăng ký / Đăng nhập ===
RegisteredUser → Web Interface: UC08 - Đăng ký / Đăng nhập
Web Interface → Server: Gửi thông tin xác thực
Server → Database: Kiểm tra / lưu tài khoản
Database → Server: Kết quả xác thực
Server → Web Interface: Trạng thái đăng nhập
Web Interface → RegisteredUser: Đăng nhập thành công

=== UC09 - Cập nhật thông tin cá nhân ===
RegisteredUser → Web Interface: UC09 - Cập nhật thông tin cá nhân
Web Interface → Server: Gửi dữ liệu cập nhật
Server → Database: Cập nhật hồ sơ người dùng
Database → Server: Xác nhận cập nhật
Server → Web Interface: Phản hồi thành công
Web Interface → RegisteredUser: Hiển thị thông tin mới

=== UC10 - Nhập thông tin chuyến đi ===
RegisteredUser → Web Interface: UC10 - Nhập thông tin chuyến đi
Web Interface → Server: Gửi dữ liệu chuyến đi
Server → Database: Lưu dữ liệu chuyến đi

=== UC11 - Yêu cầu tạo lộ trình cá nhân hóa ===
Server → AI Recommendation Engine: UC11 - Yêu cầu tạo lộ trình cá nhân hóa
AI Recommendation Engine → Database: Lấy dữ liệu địa điểm + lịch sử người dùng
Database → AI Recommendation Engine: Dữ liệu tổng hợp
AI Recommendation Engine → Server: Lộ trình cá nhân hóa
Server → Web Interface: Trả kết quả lộ trình
Web Interface → RegisteredUser: Hiển thị lộ trình

=== UC12 - Yêu cầu ước tính chi phí ===
RegisteredUser → Web Interface: UC12 - Yêu cầu ước tính chi phí
Web Interface → Server: Gửi yêu cầu tính chi phí
Server → Database: Lấy dữ liệu giá dịch vụ
Server → Web Interface: Kết quả chi phí dự kiến
Web Interface → RegisteredUser: Hiển thị chi phí

=== UC13 - Lưu lộ trình ===
RegisteredUser → Web Interface: UC13 - Lưu lộ trình
Web Interface → Server: Gửi yêu cầu lưu
Server → Database: Lưu lộ trình
Database → Server: Xác nhận lưu
Server → Web Interface: Phản hồi thành công

=== UC14 - Xem lịch trình đã lưu ===
RegisteredUser → Web Interface: UC14 - Xem lịch trình đã lưu
Web Interface → Server: Yêu cầu danh sách lịch trình
Server → Database: Truy vấn lịch trình
Database → Server: Danh sách lịch trình
Server → Web Interface: Trả dữ liệu
Web Interface → RegisteredUser: Hiển thị lịch trình

=== UC15 - Đánh giá / phản hồi ===
RegisteredUser → Web Interface: UC15 - Đánh giá / phản hồi
Web Interface → Server: Gửi đánh giá
Server → Database: Lưu phản hồi
Database → Server: Xác nhận lưu

=== UC16 - Phân tích lịch sử & phản hồi ===
Server → AI Recommendation Engine: UC16 - Phân tích lịch sử & phản hồi
AI Recommendation Engine → Database: Truy vấn lịch sử người dùng
Database → AI Recommendation Engine: Dữ liệu lịch sử
AI Recommendation Engine → Server: Đề xuất mới
Server → Web Interface: Trả đề xuất
Web Interface → RegisteredUser: Hiển thị đề xuất mới
```

---

## 5. `UML-Guest.png` — Use Case Diagram cho Guest

### Mục đích

Thể hiện tất cả use cases mà Guest (người dùng chưa đăng ký) có thể thực hiện trên hệ thống.

### Cấu trúc thực tế (từ hình ảnh)

#### Actor

- **Guest** (stick figure ở bên trái)

#### Use Cases (elipses — bên phải, trong system boundary)

| ID   | Use Case                 | Mô tả                                             |
| ---- | ------------------------ | ------------------------------------------------- |
| UC01 | Truy cập website         | Mở trang chủ, xem thông tin giới thiệu            |
| UC02 | Nhập thông tin chuyến đi | Điền form: điểm đến, ngày, ngân sách, sở thích    |
| UC03 | Nhận lộ trình đề xuất    | Xem lịch trình do AI tạo                          |
| UC04 | Xem chi tiết địa điểm    | Xem thông tin từng activity (giờ, chi phí, mô tả) |
| UC05 | Xem lộ trình trên bản đồ | Mở map view hiển thị các điểm                     |
| UC06 | Gợi ý đăng ký tài khoản  | Hệ thống gợi ý đăng ký khi muốn lưu               |
| UC07 | Chỉnh sửa lộ trình       | Xóa / thay đổi activities trong lịch trình        |

#### Layout

- Guest nối trực tiếp đến tất cả 7 use cases bằng các đường thẳng
- Không có relationship `<<include>>` hay `<<extend>>` hiển thị trong diagram
- Use cases sắp xếp dọc theo thứ tự UC01 → UC07

---

## 6. `UML-Register.png` — Use Case Diagram cho Registered User

### Mục đích

Thể hiện tất cả use cases mà Registered User (người dùng đã đăng ký) có thể thực hiện.

### Cấu trúc thực tế (từ hình ảnh)

#### Actor

- **Registered User** (stick figure ở bên trái)

#### Use Cases (elipses — bên phải, trong system boundary)

| ID   | Use Case                     | Mô tả                                                |
| ---- | ---------------------------- | ---------------------------------------------------- |
| UC08 | Đăng ký / Đăng nhập          | Tạo tài khoản hoặc đăng nhập bằng email + password   |
| UC09 | Quản lý thông tin cá nhân    | Chỉnh sửa name, phone, interests trên /profile       |
| UC10 | Nhập thông tin chuyến đi     | Giống UC02 nhưng với cá nhân hóa                     |
| UC11 | Nhận lộ trình AI cá nhân hóa | AI sử dụng interests + lịch sử để đề xuất tốt hơn    |
| UC12 | Ước tính chi phí             | Xem breakdown chi phí (activities, lưu trú, ăn uống) |
| UC13 | Lưu lộ trình                 | Lưu lịch trình vào tài khoản (saved-itineraries)     |
| UC14 | Xem lại lịch trình đã lưu    | Duyệt danh sách hành trình đã lưu                    |
| UC15 | Đánh giá và phản hồi         | Rate 1-5 sao + viết feedback cho lịch trình          |
| UC16 | Nhận đề xuất theo lịch sử    | Hệ thống cải thiện đề xuất dựa trên data tích lũy    |

#### Layout

- Registered User nối trực tiếp đến tất cả 9 use cases
- Không có relationship `<<include>>` hay `<<extend>>` hiển thị trong diagram
- Use cases sắp xếp dọc theo thứ tự UC08 → UC16
- **Lưu ý:** Diagram này KHÔNG hiển thị kế thừa từ Guest, các UC01-UC07 của Guest không xuất hiện

---

## 📋 Tổng hợp & Recommendations

### Mức độ hoàn thiện Diagram hiện tại

| Diagram                     | Cần cho MVP #1                 | Status                       |
| --------------------------- | ------------------------------ | ---------------------------- |
| Database ERD                | ✅ Bắt buộc                    | ✓ Có (Database_MVP.png)      |
| DFD                         | ✅ Bắt buộc                    | ✓ Có (DFD.png)               |
| Sequence - Guest            | ✅ Bắt buộc                    | ✓ Có (Sequence_Guest.png)    |
| Sequence - Registered       | ✅ Bắt buộc                    | ✓ Có (Sequence_Register.png) |
| UML Use Case - Guest        | ✅ Bắt buộc                    | ✓ Có (UML-Guest.png)         |
| UML Use Case - Registered   | ✅ Bắt buộc                    | ✓ Có (UML-Register.png)      |
| System Architecture Diagram | ✅ Bắt buộc (theo requirement) | ❌ Chưa có                   |
| Class Diagram               | 🟡 Nên có                      | ❌ Chưa có                   |

### ⚠️ Điểm cần lưu ý giữa ERD và Code

1. **ERD dùng tên bảng khác FE:** `USER`/`TRIP`/`PLACE`/`TRIP_PLACE` (ERD) vs `User`/`Itinerary`/`Activity` (FE code)
2. **ERD có bảng PLACE riêng biệt** với `rating`, `popularity_score` — FE hiện tại không có concept này (activities nằm inline)
3. **ERD dùng quan hệ N-N** qua bảng trung gian `TRIP_PLACE` — FE dùng array lồng nhau
4. **ERD chưa có các trường:** `startDate`, `endDate`, `interests`, `totalCost`, `rating`, `feedback` trong bảng TRIP — cần bổ sung khi implement BE
5. **DFD có thêm actor Quản trị viên** — FE hiện tại chưa có admin panel

### Diagram còn thiếu theo requirement MVP #1

1. **System Architecture Diagram** — Sơ đồ tổng quan kiến trúc hệ thống (FE ↔ BE ↔ DB ↔ AI Service). Requirement #3 yêu cầu bắt buộc.
2. **Class Diagram** (optional) — Sơ đồ lớp cho Backend modules.

### Đề xuất bổ sung

- Nên tạo thêm **System Architecture Diagram** theo yêu cầu requirement #3
- Cần **cập nhật ERD** để thêm các trường còn thiếu (`start_date`, `end_date`, `interests`, `total_cost`, `rating`, `feedback`) hoặc đồng bộ với `plan_be.md`
- UML diagrams nên bổ sung thêm **relationships** (`<<include>>`, `<<extend>>`) giữa các use cases
