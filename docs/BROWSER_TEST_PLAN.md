# Kế Hoạch Test Browser Thật — C3B Hardening Và Fullstack Verification

**Ngày tạo:** 2026-06-09  
**Mục tiêu:** Kiểm tra toàn bộ tính năng hiện tại của ứng dụng và khóa current truth sau khi C3B message flow đã có trên source  
**Thời gian dự kiến:** 45-60 phút  
**Người test:** Non-technical user (không cần biết code)

---

## Snapshot đã verify (2026-06-19)

Kế hoạch này vẫn là source test-plan, nhưng current live verification gần nhất đã xác nhận:

- `TC01` auth register/login: PASS
- `TC02` destinations list + slug navigation: PASS
- `TC04` AI generate trip ngắn: PASS trên stack thật FE -> BE -> DB -> Redis
- `TC10` city detail: PASS cho cả sparse cities (`Cần Thơ`) và city đã được bù ETL (`Buôn Ma Thuột`), cùng với ready cities (`Hà Nội`, `Đà Nẵng`, `TP. Hồ Chí Minh`)
- `TC12` share + shared read-only view: PASS
- `TC13` guest claim after login: PASS
- `C3A` chat session foundation: PASS
- `C3B` chat message send/history contract: PASS trên stack thật FE -> BE -> DB -> Redis
- Full Playwright regression: `33 passed`, `3 skipped` trên `36` tests / `17` spec files

Lưu ý phase:

- `C3B` message flow đã có trên current source; đây không còn là pre-`C3B` baseline.
- Phần còn lại trước khi xem companion ổn hơn là patch-specific rate limit, scheduler wiring, history-management UX, và docs/PR sync; `apply-patch` core + `FloatingAIChat` runtime cleanup đã có.

---

## Chuẩn Bị Trước Khi Test

### Bước 1: Đảm bảo Backend đang chạy

**Cách kiểm tra:**

1. Mở browser (Chrome/Edge/Firefox)
2. Truy cập: http://localhost:8000/docs
3. **Kết quả mong đợi:** Hiển thị trang Swagger UI với danh sách API endpoints
4. **Nếu thất bại:**
   - Mở PowerShell tại thư mục `<repo-root>`
   - Chạy lệnh:
   ```powershell
   docker compose up -d db redis
   Set-Location .\Backend
   uv run uvicorn src.main:app --host localhost --port 8000
   ```
   - Đợi khoảng 10-15 giây rồi thử lại

### Bước 2: Đảm bảo Frontend đang chạy

**Cách kiểm tra:**

1. Mở browser tại http://localhost:5173
2. **Kết quả mong đợi:** Hiển thị trang chủ với hình ảnh ruộng bậc thang và nút "Bắt đầu lên lịch trình đầu tiên"
3. **Nếu thất bại:**
   - Mở terminal tại thư mục `<repo-root>`
   - Chạy lệnh:
   ```powershell
   cd Frontend
   npm run dev
   ```
   - Đợi khoảng 5-10 giây rồi refresh lại browser

### Bước 3: Chuẩn bị tài khoản test

**Tài khoản test có thể tạo mới:**
- Email: Bất kỳ email định dạng hợp lệ (ví dụ: test@example.com)
- Mật khẩu: Tự chọn (tối thiểu 6 ký tự)

**Lưu ý:**
- Ứng dụng hiện **BYPASS OTP** → không cần mã xác thực email
- Có thể test WITHOUT login (guest mode) cho một số tính năng

---

## Test Case 1: Đăng Ký Và Đăng Nhập

### Mục đích
Kiểm tra auth flow hoạt động đúng, user có thể tạo tài khoản và đăng nhập thành công.

### Các bước thực hiện

1. **Truy cập trang chủ**
   - Mở http://localhost:5173
   - Click vào nút "Đăng nhập" ở góc trên bên phải

2. **Chuyển sang form đăng ký**
   - Click vào link "Chưa có tài khoản? Đăng ký ngay"

3. **Điền thông tin đăng ký**
   - Email: `test@example.com` (hoặc email khác)
   - Mật khẩu: `password123`
   - Xác nhận mật khẩu: `password123`
   - Click "Đăng ký"

4. **Kiểm tra kết quả đăng ký**
   - [ ] Trang redirect về trang chủ HOẶC ở lại trang login với message thành công
   - [ ] Nút "Đăng nhập" ở góc phải thay đổi thành avatar/user email

5. **Đăng xuất và đăng nhập lại**
   - Click vào avatar/email → Chọn "Đăng xuất"
   - Click "Đăng nhập" lại
   - Nhập email và mật khẩu vừa tạo
   - Click "Đăng nhập"

### Kết quả mong đợi

- [ ] Đăng ký thành công không lỗi
- [ ] Đăng nhập thành công với đúng email/mật khẩu
- [ ] Session được lưu (refresh trang không bị đăng xuất)
- [ ] Đăng xuất hoạt động đúng
- [ ] UI hiển thị đúng trạng thái đã đăng nhập

### Nếu thất bại

- **Lỗi đăng ký:** Ghi lại message lỗi hiển thị trên màn hình
- **Lỗi đăng nhập:** Kiểm tra lại email/password có đúng không
- **Lỗi network:** Mở DevTools (F12) → Tab Console → Chụp màn hình lỗi

---

## Test Case 2: Trang Chủ Và Danh Sách Điểm Đến

### Mục đích
Kiểm tra trang chủ hiển thị đúng và danh sách điểm đến được load từ backend.

### Các bước thực hiện

1. **Kiểm tra Hero section**
   - Scroll lên đầu trang http://localhost:5173
   - [ ] Hình ảnh ruộng bậc thang hiển thị rõ nét
   - [ ] Tiêu đề "Khám Phá Việt Nam Với Trí Tuệ Nhân Tạo" hiển thị đúng
   - [ ] Nút "Bắt đầu lên lịch trình đầu tiên" có màu cam nổi bật

2. **Kiểm tra danh sách điểm đến phổ biến**
   - Scroll xuống section "Điểm Đến Phổ Biến"
   - [ ] Hiển thị ít nhất 3 thành phố (Hà Nội, Đà Nẵng, TP. Hồ Chí Minh, v.v.)
   - [ ] Mỗi thành phố có hình ảnh, tên, và mô tả
   - [ ] Click vào một thành phố (ví dụ: Hà Nội)

3. **Kiểm tra City Detail page**
   - Click vào thành phố "Hà Nội" (hoặc TP. Hồ Chí Minh)
   - [ ] Navigate đến trang chi tiết thành phố
   - [ ] Hiển thị tiêu đề tên thành phố
   - [ ] Có danh sách địa điểm (places) tại thành phố đó

### Kết quả mong đợi

- [ ] Trang chủ load hoàn toàn trong vòng 3 giây
- [ ] Danh sách điểm đến hiển thị đúng
- [ ] Click vào thành phố navigate đúng trang chi tiết
- [ ] Không có lỗi 404 hoặc hình ảnh bị gãy

### Nếu thất bại

- **Không load được danh sách:** Mở DevTools (F12) → Tab Network → Tìm request `/api/v1/places/destinations`
- **Lỗi 404:** Ghi lại URL bị lỗi
- **Hình ảnh gãy:** Chụp screenshot với lỗi image broken

---

## Test Case 3: Tạo Lịch Trình Thủ Công

### Mục đích
Kiểm tra user có thể tạo lịch trình thủ công (không dùng AI) và trip_days được tạo đúng.

### Các bước thực hiện

1. **Đi đến trang tạo lịch trình**
   - Từ trang chủ, click "Bắt đầu lên lịch trình đầu tiên"
   - Hoặc truy cập trực tiếp: http://localhost:5173/create-trip

2. **Chọn "Tự tạo lịch trình thủ công"**
   - Scroll xuống dưới cùng
   - Click nút "Tự tạo lịch trình thủ công"

3. **Điền thông tin cơ bản**
   - Nhập tên chuyến đi: "Chuyến đi test thủ công"
   - Chọn điểm đến: Gõ "Hà Nội" và chọn từ gợi ý
   - Chọn ngày bắt đầu: Chọn ngày mai
   - Chọn ngày kết thúc: Chọn ngày mai + 2 ngày
   - Click "Tiếp tục"

4. **Kiểm tra Trip Workspace**
   - [ ] Navigate đến trang `/trip-workspace`
   - [ ] Hiển thị sidebar với danh sách ngày (Ngày 1, Ngày 2, Ngày 3)
   - [ ] Mỗi ngày có activities ban đầu (có thể trống)
   - [ ] Hiển thị panel Budget bên phải

### Kết quả mong đợi

- [ ] Trip được tạo thành công
- [ ] Trip có đúng số ngày (3 ngày)
- [ ] Mỗi ngày có `dayId` riêng (kiểm tra trong DevTools Network → Tab Response)
- [ ] User có thể thêm activities vào mỗi ngày

### Để kiểm tra kỹ hơn (nếu có DevTools):

1. Mở DevTools (F12)
2. Tab Network
3. Tìm request `POST /api/v1/itineraries`
4. Click vào request → Tab Response
5. **Kiểm tra:**
   - Response có `id` (trip ID)
   - Response có `days` array với 3 items
   - Mỗi day có `id`, `label`, `date`

### Nếu thất bại

- **Lỗi validation:** Ghi lại message lỗi hiển thị trên form
- **Lỗi API:** Chụp màn hình Tab Network với request fail
- **Trip không có ngày:** Kiểm tra response có field `days` không

---

## Test Case 4: Tạo Lịch Trình Bằng AI — Trip Ngắn (3 ngày) ⭐ BLOCKER CHO C3/C4

### Mục đích
**CRITICAL** - Kiểm tra AI generate pipeline hoạt động đúng sau fix 00062. Đây là feature quan trọng nhất của Phase C.

### Các bước thực hiện

1. **Đi đến trang tạo lịch trình AI**
   - Truy cập http://localhost:5173/create-trip
   - Đảm bảo đang ở tab "Tạo Lịch Trình Với AI"

2. **Điền thông tin cho trip ngắn**
   - Điểm đến: Gõ "Hà Nội" và chọn từ gợi ý (hoặc "TP. Hồ Chí Minh", "Đà Nẵng")
   - Thời gian: Chọn 3 ngày (ví dụ: 15/07/2026 → 17/07/2026)
   - Bạn đi với ai: Chọn "Cặp đôi" (2 người)
   - Mức ngân sách: Chọn "Trung bình" (5,000,000 VND)
   - Sở thích: Chọn ít nhất 2 loại (ví dụ: "Ẩm thực" + "Văn hóa")

3. **Kiểm tra warning (nếu có)**
   - [ ] Nếu hiển thị warning "Dữ liệu giới hạn" → Vẫn tiếp tục (test case)
   - [ ] Nếu hiển thị warning "Thành phố không được hỗ trợ" → Chọn thành phố khác

4. **Click "Tạo Lịch Trình Với AI"**
   - [ ] Button chuyển sang loading state
   - [ ] Hiển thị spinner và message "Đang chuẩn bị dữ liệu điểm đến..."
   - [ ] Message thay đổi qua các bước:
     - "Đang gửi yêu cầu tới AI..."
     - "Đang kiểm tra và lưu lịch trình..."
     - "Hoàn tất, đang mở lịch trình..."

5. **Chờ quá trình hoàn tất**
   - **Thời gian mong đợi:** 20-60 giây cho trip 3 ngày
   - [ ] Không timeout sau 60 giây
   - [ ] Navigate đến `/trip-workspace?tripId={id}`

6. **Kiểm tra kết quả**
   - [ ] Trip được tạo với đúng số ngày (3 ngày)
   - [ ] Mỗi ngày có 3-5 activities
   - [ ] Mỗi activity có: tên, thời gian, địa điểm, loại (food/attraction), chi phí
   - [ ] Có accommodation (khách sạn) gợi ý
   - [ ] Tổng chi phí (totalCost) được tính toán
   - [ ] Traveler info hiển thị đúng số người (2 người)

### Kết quả mong đợi

- [ ] AI generate thành công không lỗi
- [ ] Response time < 60 giây cho trip 3 ngày
- [ ] Trip có đầy đủ days, activities, accommodations
- [ ] Chi phí hợp lý (không quá vọt so với budget)
- [ ] Activities có thời gian sắp xếp hợp lý (không conflict)

### Để kiểm tra kỹ hơn (nếu có DevTools):

1. Mở DevTools (F12)
2. Tab Network
3. Tìm request `POST /api/v1/itineraries/generate`
4. **Kiểm tra:**
   - Status code = 200 (hoặc 201)
   - Response time < 60000ms
   - Response có đầy đủ:
     ```json
     {
       "id": 123,
       "destination": "Hà Nội",
       "days": [...],  // có 3 items
       "accommodations": [...],  // có ít nhất 1 item
       "travelerInfo": {"adults": 2, "children": 0, "total": 2},
       "totalCost": 4500000  // hợp lý
     }
     ```

### Nếu thất bại

**Lỗi 503 Service Unavailable:**
- AI service đang có vấn đề
- Ghi lại message lỗi detail
- Chụp màn hình Network tab với full response

**Lỗi 422 Unprocessable Entity:**
- Validation fail (điểm đến không có data, không đủ places)
- Ghi lại message: "Destination data not found" hoặc "Not enough destination places"
- Thử với thành phố khác (TP. Hồ Chí Minh, Đà Nẵng)

**Timeout sau 60+ giây:**
- LLM response quá chậm
- Kiểm tra Network tab → xem request vẫn pending hay fail
- Ghi lại thời gian timeout

**Response thiếu days hoặc activities:**
- Pipeline parse fail
- Chụp màn hình Response data

---

## Test Case 5: Tạo Lịch Trình Bằng AI — Trip Dài (14 ngày) ⭐ BLOCKER CHO C3/C4

### Mục đích
Kiểm tra AI generate với trip dài để verify dynamic timeout và context sizing.

### Các bước thực hiện

1. **Đi đến trang tạo lịch trình AI**
   - Truy cập http://localhost:5173/create-trip

2. **Điền thông tin cho trip dài**
   - Điểm đến: "Hà Nội" (hoặc thành phố có đủ data)
   - Thời gian: Chọn 14 ngày (ví dụ: 15/07/2026 → 28/07/2026)
   - Bạn đi với ai: "Gia đình" (2 người lớn + 1 trẻ em)
   - Mức ngân sách: "Cao" (10,000,000 VND)
   - Sở thích: Chọn 3-4 loại

3. **Click "Tạo Lịch Trình Với AI"**
   - [ ] Button chuyển sang loading state
   - [ ] Hiển thị message tương tự Test Case 4

4. **Chờ quá trình hoàn tất**
   - **Thời gian mong đợi:** 60-120 giây cho trip 14 ngày
   - [ ] Không timeout sau 120 giây
   - [ ] Navigate đến trip workspace

5. **Kiểm tra kết quả**
   - [ ] Trip có đúng 14 ngày
   - [ ] Mỗi ngày có 2-5 activities (không bị trống)
   - [ ] Có accommodation gợi ý
   - [ ] TotalCost hợp lý với budget

### Kết quả mong đợi

- [ ] AI generate thành công cho trip dài
- [ ] Response time < 120 giây
- [ ] Context size không bị truncate (prompt quá dài)
- [ ] Activities có variety (không lặp lại đơn điệu)

### Để kiểm tra kỹ hơn:

**Check Network tab (DevTools):**
- `POST /api/v1/itineraries/generate`
- Response time < 120000ms
- Response có 14 days trong array

### Nếu thất bại

**Timeout sau 120+ giây:**
- Dynamic timeout không hoạt động
- Report bug: PERF-01 hoặc PERF-02

**Response chỉ có < 14 ngày:**
- LLM fail sinh đủ days
- Ghi lại số days thực tế nhận được

**Activities quá lặp:**
- Context size quá nhỏ
- Report bug: PERF-02

---

## Test Case 6: Chỉnh Sửa Traveler Info (Số Người) ⭐ BUG-BE-001

### Mục đích
Kiểm tra travelerInfo được update đúng khi user chỉnh sửa số người trong trip (verify BUG-BE-001 fix).

### Các bước thực hiện

1. **Mở một trip có sẵn** (tạo mới từ Test Case 3 hoặc 4)
   - Vào `/trip-workspace?tripId={id}`

2. **Click chỉnh sửa số người**
   - Tìm section "Traveler Info" hoặc "Người đi" (thường ở top bar hoặc sidebar)
   - Click nút "Edit" hoặc icon chỉnh sửa

3. **Thay đổi số người**
   - Adults: 2 → 4
   - Children: 0 → 2
   - Click "Lưu" hoặc "Update"

4. **Kiểm tra kết quả ngay lập tức**
   - [ ] UI hiển thị số người mới (6 người)
   - [ ] Total cost thay đổi (nếu activities có price per person)

5. **Click "Lưu lịch trình"**
   - Click nút "Lưu" ở top bar
   - [ ] Hiển thị toast "Đã lưu lịch trình" (hoặc tương tự)

6. **Refresh trang**
   - Nhấn F5 hoặc click refresh browser
   - [ ] Số người vẫn hiển thị đúng (6 người)
   - [ ] Total cost không bị revert về giá cũ

### Kết quả mong đợi

- [ ] Traveler info update thành công
- [ ] Số người được lưu vào database
- [ ] Total cost được tính lại với số người mới
- [ ] Refresh trang không bị revert

### Để kiểm tra kỹ hơn:

1. **Trước khi edit:** Mở DevTools → Network → Tab Response
2. Gọi `GET /api/v1/itineraries/{trip_id}`
3. Ghi lại `travelerInfo`: `{"adults": 2, "children": 0, "total": 2}`
4. **Sau khi edit và save:**
5. Gọi lại `GET /api/v1/itineraries/{trip_id}`
6. **Kiểm tra:** `travelerInfo` phải là `{"adults": 4, "children": 2, "total": 6}`

### Nếu thất bại

**UI update nhưng không lưu:**
- BUG-BE-001 chưa fix hoàn toàn
- Ghi lại: travelerInfo trước và sau save

**Toast error "Không thể lưu":**
- Backend validation fail
- Chụp màn hình error message

**Refresh làm mất dữ liệu:**
- Data không được lưu vào DB
- Check Network tab → request PUT có success không

---

## Test Case 7: Thêm Hoạt Động Với Chi Phí Phụ (Extra Expenses) ⭐ BUG-BE-002

### Mục đích
Kiểm tra extraExpenses được lưu và hiển thị đúng (verify BUG-BE-002 fix).

### Các bước thực hiện

1. **Mở một trip có sẵn**
   - Vào `/trip-workspace?tripId={id}`

2. **Chọn một ngày bất kỳ**
   - Click vào "Ngày 1" hoặc "Ngày 2"

3. **Thêm một activity mới**
   - Click nút "Thêm hoạt động" hoặc "+" ở timeline
   - Điền thông tin:
     - Tên: "Ăn trưa"
     - Thời gian: "12:00"
     - Loại: "Ẩm thực" (food)
     - Giá người lớn: 100,000 VND
   - **QUAN TRỌNG:** Tìm section "Chi phí phụ" hoặc "Extra Expenses"
   - Click "Thêm chi phí phụ"
   - Điền:
     - Tên: "Đồ uống"
     - Số tiền: 50,000 VND
     - Loại: "Ẩm thực"
   - Click "Lưu" hoặc "Thêm"

4. **Kiểm tra kết quả ngay lập tức**
   - [ ] Activity hiển thị trong timeline
   - [ ] Có icon hoặc badge hiển thị "Extra expenses"
   - [ ] Total cost của activity bao gồm cả extra expenses

5. **Click "Lưu lịch trình"**
   - Click nút "Lưu" ở top bar

6. **Refresh trang**
   - Nhấn F5
   - Click vào activity vừa tạo
   - [ ] Extra expenses vẫn hiển thị (không bị mất)
   - [ ] Số tiền và tên chi phí phụ còn nguyên

### Kết quả mong đợi

- [ ] Extra expenses được thêm thành công
- [ ] Extra expenses hiển thị trong UI
- [ ] Extra expenses được lưu vào database
- [ ] Refresh không làm mất extra expenses
- [ ] Total cost bao gồm cả extra expenses

### Để kiểm tra kỹ hơn:

1. **Check API response:**
   - DevTools → Network → Tab Response
   - `POST /api/v1/itineraries/{trip_id}/activities`
   - **Kiểm tra:** Response có `extraExpenses` array với items

2. **Check GET response:**
   - `GET /api/v1/itineraries/{trip_id}`
   - **Kiểm tra:** `days[0].activities[0].extraExpenses` không rỗng

### Nếu thất bại

**Extra expenses biến mất sau refresh:**
- BUG-BE-002 chưa fix
- Chụp màn hình trước và sau refresh
- Ghi lại: Response data từ API

**UI không hiển thị extra expenses:**
- FE không parse field này
- Chụp màn hình UI activity detail

**Toast error khi save:**
- Backend reject extra expenses
- Ghi lại error message

---

## Test Case 8: Tìm Kiếm Địa Điểm (Places Search) ⭐ BUG-BE-003

### Mục đích
Kiểm tra tìm kiếm địa điểm hoạt động với cả tiếng Việt có dấu và không dấu (verify BUG-BE-003 fix).

### Các bước thực hiện

1. **Mở một trip có sẵn**
   - Vào `/trip-workspace?tripId={id}`

2. **Mở modal tìm kiếm địa điểm**
   - Click tab "Địa điểm" (nếu đang ở tab "Nơi ở")
   - Click nút "Thêm địa điểm" hoặc "Tìm kiếm"

3. **Tìm kiếm với tên có dấu**
   - Nhập vào ô tìm kiếm: "Hà Nội"
   - [ ] Hiển thị gợi ý "Hà Nội" trong dropdown
   - [ ] Click chọn "Hà Nội"

4. **Tìm kiếm với tên không dấu**
   - Nhập: "Ha Noi" (không dấu, không space giữa từ)
   - [ ] **CRITICAL:** Vẫn phải gợi ý "Hà Nội"
   - [ ] Không được báo "Không tìm thấy"

5. **Tìm kiếm với tên có space không dấu**
   - Nhập: "Ha Noi" hoặc "ho chi minh"
   - [ ] Vẫn phải gợi ý đúng thành phố

6. **Tìm kiếm địa điểm cụ thể**
   - Chọn một ngày trong trip (ví dụ: Ngày 1)
   - Nhập: "Phở" hoặc "bún chả"
   - [ ] Hiển thị danh sách nhà hàng/địa điểm liên quan
   - [ ] Click vào một địa điểm → Thêm vào itinerary

### Kết quả mong đợi

- [ ] Tìm kiếm "Hà Nội" (có dấu) → OK
- [ ] Tìm kiếm "Ha Noi" (không dấu) → **PHẢI OK** (BUG-BE-003 fix)
- [ ] Tìm kiếm "ho chi minh" (thường, không dấu) → **PHẢI OK**
- [ ] Tìm kiếm địa điểm cụ thể ("Phở") → Hiển thị kết quả
- [ ] Không có lỗi 404 khi tìm kiếm

### Để kiểm tra kỹ hơn:

1. **Test với API trực tiếp:**
   - Mở DevTools → Console
   - Gõ:
   ```javascript
   fetch('http://localhost:8000/api/v1/places/destinations/Ha%20Noi')
     .then(r => r.json())
     .then(d => console.log(d))
   ```
   - [ ] Phải trả về destination object (không phải 404)

2. **Test search API:**
   ```javascript
   fetch('http://localhost:8000/api/v1/places/search?query=Ha%20Noi')
     .then(r => r.json())
     .then(d => console.log(d))
   ```
   - [ ] Phải trả về array places (không rỗng)

### Nếu thất bại

**"Ha Noi" trả về 404:**
- BUG-BE-003 chưa fix
- Ghi lại: Request URL và Response status

**Search không ra kết quả:**
- Fuzzy matching không hoạt động
- Chụp màn hình search results rỗng

**Trường hợp đặc biệt:**
- Test với "TP. Hồ Chí Minh" vs "ho chi minh"
- Test với "Đà Nẵng" vs "da nang"

---

## Test Case 9: Lỗi Khi Backend Chết ⭐ BUG-FE-007

### Mục đích
Kiểm tra FE hiển thị error message khi Backend die hoặc timeout (verify BUG-FE-007 fix).

### Các bước thực hiện

1. **Mở một trip để edit**
   - Vào `/trip-workspace?tripId={id}`

2. **Dừng Backend container**
   - Mở terminal
   - Chạy:
   ```bash
   cd <repo-root>/Backend
   docker compose stop api
   ```
   - [ ] Chờ khoảng 5 giây

3. **Thử edit activity trong FE**
   - Click vào một activity bất kỳ
   - Thay đổi tên hoặc thời gian
   - Click "Lưu"
   - [ ] **CRITICAL:** Phải hiển thị toast error message
   - [ ] Message không được trống (không phải silent fail)
   - [ ] Message phải user-friendly (ví dụ: "Không thể kết nối đến máy chủ")

4. **Thử thêm activity mới**
   - Click "Thêm hoạt động"
   - Điền thông tin cơ bản
   - Click "Lưu"
   - [ ] Phải hiển thị error toast
   - [ ] Activity không được thêm vào UI (hoặc bị rollback)

5. **Khởi động lại Backend**
   - Chạy:
   ```bash
   docker compose up -d
   ```
   - Đợi 10 giây

6. **Thử lại thao tác**
   - Edit activity và lưu lại
   - [ ] Lưu thành công
   - [ ] Toast success hiển thị

### Kết quả mong đợi

- [ ] Khi Backend down → error toast hiển thị rõ ràng
- [ ] Error message không phải generic "Error" hoặc undefined
- [ ] UI không bị crash (app vẫn hoạt động)
- [ ] Operations fail gracefully (optimistic updates được rollback)
- [ ] Khi Backend up again → operations thành công lại

### Để kiểm tra kỹ hơn:

1. **Mở DevTools → Console**
   - [ ] Không được có uncaught errors
   - [ ] Error handlers được gọi

2. **Mở DevTools → Network**
   - [ ] Request `/api/v1/...` fail với status 0 hoặc 503
   - [ ] FE handle error status

### Nếu thất bại

**Không có toast error:**
- BUG-FE-007 chưa fix
- Silent failure → user không biết gì
- Chụp màn hình UI (không có toast)

**Toast error nhưng message rỗng:**
- Error handler không parse error đúng
- Chụp màn hình toast content

**UI bị crash:**
- Unhandled error
- Chụp màn hình Console tab với stack trace

**Backend restart nhưng FE vẫn báo lỗi:**
- Connection pooling issue
- Ghi lại: Thời gian restart và thời điểm test

---

## Test Case 10: Xem Chi Tiết Thành Phố (City Detail Page)

### Mục đích
Kiểm tra city detail page load và hiển thị đúng thông tin thành phố.

### Các bước thực hiện

1. **Từ trang chủ**
   - Scroll đến section "Điểm Đến Phổ Biến"
   - Click vào một thành phố (ví dụ: "Hà Nội")

2. **Kiểm tra City Detail page**
   - [ ] Navigate đến URL: `/cities/ha-noi` (hoặc slug tương ứng)
   - [ ] Hiển thị tên thành phố lớn, rõ
   - [ ] Có hình ảnh cover của thành phố
   - [ ] Có mô tả ngắn về thành phố

3. **Kiểm tra danh sách địa điểm**
   - [ ] Có danh sách places tại thành phố này
   - [ ] Mỗi place có: tên, loại (food/attraction), hình ảnh, rating
   - [ ] Có bộ lọc (filter) theo loại: Tất cả, Ẩm thực, Du lịch, Mua sắm, v.v.

4. **Test filter**
   - Click filter "Ẩm thực"
   - [ ] Chỉ hiển thị places loại "food"
   - Click filter "Du lịch"
   - [ ] Chỉ hiển thị places loại "attraction"

5. **Test save place**
   - Click vào icon trái tim (heart) của một place
   - [ ] Nếu chưa login → Hiển thị modal "Đăng nhập để lưu"
   - Nếu đã login → Icon heart đổi màu (đã lưu)
   - [ ] Click lại → Hủy lưu

### Kết quả mong đợi

- [ ] City detail page load thành công
- [ ] Places list hiển thị đúng
- [ ] Filter hoạt động đúng
- [ ] Save/unsave place hoạt động đúng
- [ ] Không có lỗi 404 hoặc lỗi hình ảnh

### Nếu thất bại

**URL không navigate:**
- Click không work
- Chụp màn hình với cursor trên link

**Places list rỗng:**
- Backend không có data cho thành phố này
- Chụp màn hình section trống

**Filter không work:**
- FE logic error
- Ghi lại: Filter chọn được nhưng UI không lọc

**Save place không work:**
- Auth hoặc API error
- Chụp màn hình Console tab

---

## Test Case 11: Lưu/Xóa Địa Điểm Yêu Thích (Saved Places)

### Mục đích
Kiểm tra user có thể lưu và xóa địa điểm yêu thích, và danh sách saved places load đúng.

### Các bước thực hiện

1. **Đăng nhập** (nếu chưa)
   - Vào http://localhost:5173
   - Click "Đăng nhập"
   - Nhập email/password từ Test Case 1

2. **Đi đến trang Saved Places**
   - Click vào menu/avatar → Chọn "Địa điểm đã lưu"
   - Hoặc truy cập: http://localhost:5173/saved-places
   - [ ] Hiển thị trang danh sách địa điểm đã lưu

3. **Lưu một place mới**
   - Click "Trở về trang chủ" hoặc "Tìm kiếm địa điểm"
   - Tìm một place bất kỳ (từ City Detail page)
   - Click icon heart để lưu
   - [ ] Icon đổi màu (đã lưu)
   - [ ] Toast message "Đã lưu địa điểm" (hoặc tương tự)

4. **Quay lại Saved Places**
   - Vào lại http://localhost:5173/saved-places
   - [ ] Place vừa lưu hiển thị trong danh sách

5. **Xóa (unsave) một place**
   - Click icon heart của một place trong danh sách
   - [ ] Icon mất màu (chưa lưu)
   - [ ] Place biến mất khỏi danh sách (hoặc có message "Đã xóa")

6. **Test error handling**
   - Dừng Backend (như Test Case 9)
   - Thử save/unsave place
   - [ ] **CRITICAL:** Phải hiển thị error toast
   - [ ] Place không được mark là saved/unsaved (rollback)

### Kết quả mong đợi

- [ ] Save place thành công
- [ ] Unsave place thành công
- [ ] Saved places list load đúng
- [ ] Error handling hoạt động khi Backend down

### Để kiểm tra kỹ hơn:

1. **Check API calls:**
   - DevTools → Network
   - `POST /api/v1/places/saved` → status 201
   - `DELETE /api/v1/places/saved/{id}` → status 204

2. **Check error handling:**
   - Khi Backend down → `POST` hoặc `DELETE` fail
   - FE phải hiển thị toast error

### Nếu thất bại

**Save không work:**
- Auth error hoặc API error
- Chụp màn hình Console tab

**Unsave không work:**
- API endpoint error
- Ghi lại URL và status

**No error toast when Backend down:**
- Empty catch block (BUG-FE-006 hoặc BUG-FE-007)
- Chụp màn hình UI không có toast

---

## Test Case 12: Chia Sẻ Lịch Trình (Share Trip) ⭐ BLOCKER CHO C3/C4

### Mục đích
Kiểm tra share token flow hoạt động đúng và public share link hoạt động.

### Các bước thực hiện

1. **Mở một trip (đã đăng nhập)**
   - Vào `/trip-workspace?tripId={id}`
   - Đảm bảo trip này có data (activities, accommodations)

2. **Click "Chia sẻ"**
   - Tìm nút "Chia sẻ" hoặc "Share" (thường ở top bar)
   - Click nút này

3. **Kiểm tra Share modal**
   - [ ] Hiển thị modal với share URL
   - [ ] URL có format: `http://localhost:5173/shared/{token}` (hoặc tương tự)
   - [ ] Có nút "Copy link" hoặc "Sao chép"

4. **Copy share link**
   - Click "Copy link"
   - [ ] Toast message "Đã sao chép link" (hoặc tương tự)

5. **Test share link ở tab ẩn**
   - Mở tab mới hoặc ẩn (incognito/private window)
   - Dán share link vào address bar
   - Enter
   - [ ] **CRITICAL:** Hiển thị trip ở chế độ read-only
   - [ ] Không có nút "Edit" hoặc "Lưu"
   - [ ] Có badge "Được chia sẻ" hoặc "Shared view"

6. **Verify data integrity**
   - [ ] Tất cả days hiển thị đúng
   - [ ] Activities hiển thị đầy đủ
   - [ ] Accommodations hiển thị
   - [ ] Budget và total cost hiển thị đúng

7. **Test security**
   - Trong shared view, thử edit một activity
   - [ ] Không cho phép edit (hoặc button edit bị disable/ẩn)
   - [ ] Thử save → Không có nút save hoặc bị block

### Kết quả mong đợi

- [ ] Share link tạo thành công
- [ ] Share token là opaque token (không phải trip ID)
- [ ] Public share link hoạt động không cần login
- [ ] Shared view là read-only
- [ ] Data trong shared view khớp với original trip

### Để kiểm tra kỹ hơn:

1. **Check share API:**
   - DevTools → Network
   - `POST /api/v1/itineraries/{trip_id}/share`
   - Response có `shareUrl` và `shareToken`

2. **Check shared API:**
   - Trong tab ẩn, DevTools → Network
   - `GET /api/v1/shared/{token}`
   - Response có đầy đủ trip data

3. **Test tampered token:**
   - Thay đổi token trong URL
   - [ ] Phải trả về 404 hoặc "Link không hợp lệ"

### Nếu thất bại

**Share link không tạo:**
- API error
- Chụp màn hình Console tab

**Share link trả về 404:**
- Token invalid hoặc expired
- Ghi lại URL và error message

**Shared view cho phép edit:**
- Security issue
- Chụp màn hình với nút edit

**Data không khớp:**
- Partial response issue
- Ghi lại: Missing fields

---

## Test Case 13: Guest Tạo AI Rồi Claim ⭐ BLOCKER CHO C3/C4

### Mục đích
**CRITICAL** - Kiểm tra guest có thể tạo AI trip và sau đó claim khi login/register (verify guest claim flow).

### Các bước thực hiện

1. **Đăng xuất** (nếu đã login)
   - Click avatar/email → "Đăng xuất"
   - [ ] Confirm về trang chủ hoặc trang login

2. **Tạo AI trip như guest**
   - Vào http://localhost:5173/create-trip
   - Điền thông tin:
     - Điểm đến: "Hà Nội"
     - Thời gian: 3 ngày
     - Click "Tạo Lịch Trình Với AI"
   - [ ] AI generate thành công
   - [ ] Navigate đến `/trip-workspace?tripId={id}`

3. **Kiểm tra guest state**
   - [ ] UI hiển thị warning hoặc badge "Chưa đăng nhập"
   - [ ] Có nút "Đăng nhập để lưu" hoặc tương tự
   - [ ] **QUAN TRỌNG:** Lưu lại `claimToken` nếu có hiển thị (hoặc check trong DevTools)

4. **Đăng nhập**
   - Click nút "Đăng nhập"
   - Đăng nhập với tài khoản từ Test Case 1
   - [ ] Sau khi đăng nhập → Trip vẫn hiển thị

5. **Claim trip**
   - **Tùy UI:** Có thể claim tự động hoặc cần click nút "Claim"
   - Nếu có nút "Claim" hoặc "Giữ lại lịch trình":
     - Click nút này
   - [ ] Toast message "Đã giữ lại lịch trình thành công" (hoặc tương tự)

6. **Verify ownership**
   - Vào "Lịch trình của tôi" hoặc trip history
   - [ ] Trip vừa tạo hiển thị trong danh sách
   - [ ] Trip có đúng số ngày, activities
   - [ ] Click vào trip → Có thể edit và save

7. **Test claim token one-time**
   - Đăng xuất
   - Thử đăng nhập với tài khoản khác
   - Thử truy cập lại trip (nếu còn URL)
   - [ ] **CRITICAL:** Không thể claim lại (token đã dùng)

### Kết quả mong đợi

- [ ] Guest có thể tạo AI trip
- [ ] Guest trip có claimToken
- [ ] Sau khi đăng nhập → Claim thành công
- [ ] Trip transfer ownership sang user
- [ ] Claim token one-time (không thể dùng lại)

### Để kiểm tra kỹ hơn:

1. **Check claimToken:**
   - DevTools → Network → Tab Response
   - `POST /api/v1/itineraries/generate` hoặc `GET /api/v1/itineraries/{id}`
   - Response có field `claimToken` (string)

2. **Check claim API:**
   - DevTools → Network
   - `POST /api/v1/itineraries/{trip_id}/claim`
   - Request body: `{"claimToken": "..."}`
   - Response: `{"claimed": true, "tripId": 123}`

3. **Verify DB:**
   - Sau khi claim, trip phải có `user_id` (không NULL)
   - `claim_token_hash` phải bị consume

### Nếu thất bại

**Không có claimToken:**
- Backend không issue token
- Chụp màn hình Response data

**Claim thất bại:**
- Token invalid hoặc expired
- Ghi lại error message

**Claim nhưng không transfer ownership:**
- Logic error
- Test bằng cách đăng xuất và login lại → Trip vẫn thuộc user cũ

**Claim token không one-time:**
- Security issue
- Test claim lại 2 lần → lần 2 phải fail

---

## Test Case 14: Rate Limit — AI Generation Quota

### Mục đích
Kiểm tra rate limit hoạt động đúng cho AI generation (auth user vs guest).

### Các bước thực hiện

### 14a. Test Guest Rate Limit (3 lượt/ngày)

1. **Đăng xuất** (nếu đã login)

2. **Tạo AI trip lần 1**
   - Vào http://localhost:5173/create-trip
   - Tạo trip AI ngắn (3 ngày) với "Hà Nội"
   - [ ] Generate thành công
   - [ ] Note lại thời điểm hiện tại

3. **Tạo AI trip lần 2**
   - Vào lại /create-trip
   - Tạo trip AI tiếp theo
   - [ ] Generate thành công

4. **Tạo AI trip lần 3**
   - Vào lại /create-trip
   - Tạo trip AI tiếp theo
   - [ ] Generate thành công

5. **Tạo AI trip lần 4 (phải fail)**
   - Vào lại /create-trip
   - Thử tạo trip AI lần 4
   - [ ] **CRITICAL:** Phải hiển thị error message về rate limit
   - [ ] Message phải rõ ràng: "Bạn đã dùng hết 3 lượt tạo lịch trình AI hôm nay"
   - [ ] Không cho phép tạo trip

### 14b. Test Auth User Rate Limit

1. **Đăng nhập** với tài khoản từ Test Case 1

2. **Tạo AI trip**
   - Vào /create-trip
   - Tạo trip AI
   - [ ] Generate thành công
   - [ ] Check quota message (nếu có hiển thị)

3. **Kiểm tra rate limit headers**
   - Mở DevTools → Network
   - Tìm request `POST /api/v1/itineraries/generate`
   - Tab Headers → Response Headers
   - [ ] Phải có headers:
     - `X-RateLimit-Limit: ...` (số lượt tối đa)
     - `X-RateLimit-Remaining: ...` (số lượt còn lại)
     - `X-RateLimit-Reset: ...` (thời gian reset)

### Kết quả mong đợi

- [ ] Guest: 3 lượt/ngày, lần 4 bị block
- [ ] Auth user: Có quota riêng (có thể cao hơn)
- [ ] Rate limit headers hiển thị đúng
- [ ] Error message user-friendly

### Để kiểm tra kỹ hơn:

1. **Test Redis dependency:**
   - Dừng Redis container:
   ```bash
   docker compose stop redis
   ```
   - Thử tạo AI trip
   - [ ] **CRITICAL:** Không được fail-open (vẫn phải enforce limit)

2. **Test reset time:**
   - Note lại `X-RateLimit-Reset`
   - Convert timestamp →-readable time
   - [ ] Reset time phải là 00:00 ngày hôm sau

### Nếu thất bại

**Guest có thể tạo > 3 trips:**
- Rate limit không enforcement
- Security issue → report ngay

**Không có rate limit headers:**
- Backend không set headers
- Chụp màn hình Response Headers

**Rate limit fail-open khi Redis down:**
- Critical security issue
- Test: Dừng Redis → thử tạo trip → vẫn bị block (đúng)

**Error message không rõ ràng:**
- Generic error "Too many requests"
- Yêu cầu message có số lượt cụ thể

---

## Test Case 15: Budget Tracker và Total Cost

### Mục đích
Kiểm tra budget tracker hiển thị đúng total cost và breakdown by category.

### Các bước thực hiện

1. **Mở một trip có activities**
   - Vào `/trip-workspace?tripId={id}` (từ Test Case 4 hoặc 6)

2. **Kiểm tra Budget sidebar**
   - [ ] Panel "Ngân sách" hiển thị ở bên phải
   - [ ] Hiển thị "Tổng chi phí" (total cost)
   - [ ] Hiển thị "Ngân sách" (budget)
   - [ ] Hiển thị progress bar hoặc % (total vs budget)

3. **Click vào chi tiết**
   - Click nút "Xem chi tiết" hoặc "Chi tiết ngân sách"
   - [ ] Modal hiển thị breakdown by category:
     - Ẩm thực (food)
     - Du lịch (attraction)
     - Vui chơi giải trí (entertainment)
     - Mua sắm (shopping)
     - Di chuyển (transportation)

4. **Verify calculations**
   - Kiểm tra một activity có giá:
     - Ví dụ: Activity "Ăn trưa" có adultPrice = 100,000 VND
   - [ ] Total cost của category "Ẩm thực" phải bao gồm 100,000 VND này
   - [ ] Total cost tổng cộng phải bằng sum tất cả categories

5. **Test với extra expenses**
   - Thêm extra expense vào một activity (như Test Case 7)
   - [ ] Total cost phải tăng thêm số tiền extra expense
   - [ ] Category breakdown phải bao gồm extra expense

6. **Test budget warning**
   - Nếu total cost > budget:
     - [ ] Progress bar màu đỏ hoặc warning icon
   - Nếu total cost <= budget:
     - [ ] Progress bar màu xanh hoặc xanh lá

### Kết quả mong đợi

- [ ] Total cost tính toán đúng
- [ ] Category breakdown chính xác
- [ ] Extra expenses được cộng vào total
- [ ] Budget warning hiển thị đúng

### Để kiểm tra kỹ hơn:

1. **Manual calculation:**
   - Sum tất cả activity costs bằng calculator
   - [ ] Khớp với total cost trong UI

2. **Check API response:**
   - DevTools → Network
   - `GET /api/v1/itineraries/{trip_id}`
   - [ ] `totalCost` field không = 0

### Nếu thất bại

**Total cost = 0:**
- Backend không calculate
- BUG-BE-001 hoặc data issue

**Category breakdown sai:**
- FE calculation error
- Ghi lại: Expected vs Actual

**Extra expenses không được tính:**
- BUG-BE-002 chưa fix
- Chụp màn hình trước/sau thêm extra expense

---

## Test Case 16: Timeline và Drag-Drop Activities

### Mục đích
Kiểm tra timeline hiển thị đúng và drag-drop hoạt động.

### Các bước thực hiện

1. **Mở một trip có nhiều activities trong 1 ngày**
   - Vào `/trip-workspace?tripId={id}`
   - Chọn một ngày có 3+ activities

2. **Kiểm tra timeline layout**
   - [ ] Activities hiển thị theo chronological order (theo thời gian)
   - [ ] Mỗi activity có: thời gian (time), tên, icon loại
   - [ ] Có đường line connect các activities

3. **Test drag-drop**
   - Click và hold vào một activity
   - Drag lên/xuống
   - [ ] Other activities phải "dịch chuyển" để nhường chỗ
   - [ ] Có visual feedback (shadow, placeholder)
   - Thả ra (drop)
   - [ ] Activity mới ở vị trí đúng
   - [ ] Thời gian được recalculated (nếu có tính năng này)

4. **Test time conflicts**
   - Edit một activity: Đổi thời gian trùng với activity khác
   - [ ] Hiển thị warning "Xung đột thời gian"
   - [ ] Activity bị đánh dấu màu đỏ hoặc icon warning

5. **Test delete activity**
   - Click icon "Xóa" hoặc "Delete" của một activity
   - [ ] Activity biến mất khỏi timeline
   - [ ] Các activities khác vẫn giữ nguyên vị trí

### Kết quả mong đợi

- [ ] Timeline layout đúng
- [ ] Drag-drop hoạt động mượt
- [ ] Time conflict detection work
- [ ] Delete activity work

### Nếu thất bại

**Drag-drop không work:**
- FE issue hoặc browser compatibility
- Ghi lại: Browser và version

**Time conflict không detect:**
- Logic error
- Ghi lại: Test case (2 activities cùng thời gian)

**Delete không sync:**
- API error
- Check Network tab

---

## Tổng Kết: Những Gì Cần Kiểm Tra TRƯỚC KHI Bắt Đầu C3/C4

### Checklist Critical (PHẢI PASS)

| # | Test Case | Ảnh hưởng C3/C4 | Ưu tiên | Status |
|---|-----------|-----------------|---------|--------|
| 1 | Auth flow | Guest claim flow cần auth | P0 | ☐ |
| 4 | AI generate — Trip ngắn (3 ngày) | AI pipeline core feature | **P0 BLOCKER** | ☐ |
| 5 | AI generate — Trip dài (14 ngày) | Dynamic timeout verification | **P0 BLOCKER** | ☐ |
| 6 | Edit travelerInfo | BUG-BE-001 fix verification | **P0 BLOCKER** | ☐ |
| 7 | Extra expenses | BUG-BE-002 fix verification | **P0 BLOCKER** | ☐ |
| 8 | Places search (fuzzy) | BUG-BE-003 fix verification | **P0 BLOCKER** | ☐ |
| 9 | Error handling (Backend die) | BUG-FE-007 fix verification | **P0 BLOCKER** | ☐ |
| 12 | Share trip | Share token flow core feature | **P0 BLOCKER** | ☐ |
| 13 | Guest create + claim | Guest claim flow core feature | **P0 BLOCKER** | ☐ |
| 14 | Rate limit | AI quota enforcement | **P0 BLOCKER** | ☐ |

### Checklist Important (NÊN PASS)

| # | Test Case | Ảnh hưởng C3/C4 | Ưu tiên | Status |
|---|-----------|-----------------|---------|--------|
| 2 | Trang chủ + Destinations | UI sanity check | P1 | ☐ |
| 3 | Tạo lịch trình thủ công | Manual create flow | P1 | ☐ |
| 10 | City detail page | Places browse flow | P1 | ☐ |
| 11 | Saved places | Save/unsave flow | P1 | ☐ |
| 15 | Budget tracker | Cost calculation verification | P1 | ☐ |
| 16 | Timeline + drag-drop | UI interaction sanity | P1 | ☐ |

---

## Nếu Một Test Thất Bại

### Quy trình báo lỗi

1. **Dừng test ngay** nếu là Critical (P0) test
2. **Ghi lại thông tin:**
   - Test Case number và tên
   - Bước đang thực hiện khi lỗi
   - Screenshot (chụp màn hình)
   - URL lúc lỗi
   - Thời gian lỗi (timestamp)
   - Error message (nếu có)
   - Browser và version

3. **Kiểm tra DevTools (nếu có thể):**
   - Tab Console: Chụp bất kỳ error logs
   - Tab Network: Chụp request fail (status code, response)

4. **Báo cáo:**
   - Nếu là BUG-BE-xxx, BUG-FE-xxx từ fix plan → Report là "Regression" hoặc "Not fixed"
   - Nếu là bug mới → Report với đủ thông tin trên

### Quyển tắc "stop the line"

**DỪNG TẤT CẢ và BÁO NGAY nếu:**

- AI generate (Test Case 4/5) thất bại → C3/C4 không thể bắt đầu
- Guest claim (Test Case 13) thất bại → Guest flow không usable
- Share trip (Test Case 12) thất bại → Public share không work
- Rate limit (Test Case 14) fail-open → Security issue
- Error handling (Test Case 9) silent fail → Data loss risk
- BUG-BE-001/002/003 not fixed → Data contract broken

**CÓ THỂ TIẾP TỤC nhưng phải note nếu:**

- UI issues (layout, styling) → Cosmetic, không block logic
- Performance (load chậm nhưng không timeout) → Optimize sau
- Edge cases (odd user behavior) → P2, fix sau

---

## Ghi Chú Cho Người Test

### Tips chung

- **Test chậm, kỹ:** Đừng rush, mỗi test case 5-10 phút là bình thường
- **Ghi lại mọi thứ:** Screenshot tốt hơn mô tả bằng lời
- **DevTools là bạn:** F12 → Console và Network giúp diagnosis rất nhiều
- **Test với nhiều browser:** Nếu có thể, test trên Chrome + Firefox

### Các lỗi thường gặp

1. **"Không thể kết nối đến máy chủ"**
   - Backend không chạy → Start lại Docker containers
   - Check: `docker compose ps`

2. **"404 Not Found"**
   - URL sai hoặc Backend route không match
   - Check spelling: `/trip-workspace` không phải `/tripworkspace`

3. **"500 Internal Server Error"**
   - Backend crash → Check Docker logs: `docker compose logs api --tail 50`

4. **AI generate quá chậm**
   - LLM API slow hoặc timeout
   - Đợi tối đa 2 phút cho trip dài, sau đó report

### Sau khi test xong

1. **Tổng hợp kết quả:**
   - Mark ☐ thành ☑ cho test cases pass
   - Mark ❌ cho test cases fail
   - Ghi lại số liệu: Response times, error counts

2. **Prioritize bugs:**
   - P0: Block C3/C4 → Fix ngay
   - P1: Important → Fix trong tuần
   - P2: Nice to have → Fix sau

3. **Report:**
   - Gửi kết quả cho developer team
   - Đính kèm screenshots và DevTools exports
   - Ghi rõ môi trường test (OS, Browser, thời điểm)

---

## Appendix: Cheatsheet

### Shortcuts

- **F12**: Open DevTools
- **Ctrl+Shift+R** (Windows) hoặc **Cmd+Shift+R** (Mac): Hard refresh
- **Ctrl+Shift+I**: Open Inspect Element
- **Ctrl+U**: View Page Source

### DevTools Navigation

- **Tab Console**: Error logs, debug messages
- **Tab Network**: API requests, response times
- **Tab Application**: LocalStorage, SessionStorage, Cookies
- **Tab Elements**: DOM inspector

### Docker Commands

```bash
# Check containers status
docker compose ps

# Restart Backend
docker compose restart api

# Restart Frontend (nếu chạy trong Docker)
docker compose restart frontend

# View logs
docker compose logs api --tail 100

# Stop all
docker compose down

# Start all
docker compose up -d
```

### URLs Handy

- Frontend: http://localhost:5173
- Backend API docs: http://localhost:8000/docs
- Backend API root: http://localhost:8000/api/v1
- Trip Workspace: http://localhost:5173/trip-workspace
- Create Trip: http://localhost:5173/create-trip
- Saved Places: http://localhost:5173/saved-places
- Cities List: http://localhost:5173/cities

---

**Plan created:** 2026-06-09  
**Author:** Claude Code (based on 00062 audit reports)  
**Status:** READY FOR EXECUTION  
**Version:** 1.0
