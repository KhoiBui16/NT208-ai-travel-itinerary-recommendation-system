# Website hệ thống đề xuất du lịch thông minh bằng AI

## 1. Người dùng & Phân tích nhu cầu (Use-cases)

### 1.1. Phân loại người dùng hệ thống

- **Người sử dụng website**: những người có nhu cầu tìm kiếm, lên kế hoạch cho các chuyến du lịch một cách nhanh chóng, chi tiết đi kèm với sự cá nhân hóa
- Website Hệ thống đề xuất lộ trình du lịch thông minh dựa trên AI có các nhóm người dùng sau:

#### 1.1.1. Người dùng chưa đăng ký (Guest)

- Truy cập website mà không cần tài khoản
- Chỉ sử dụng các chức năng cơ bản

#### 1.1.2. Người dùng đã đăng ký (Registered User)

- Có tài khoản cá nhân
- Được cá nhân hóa trải nghiệm
- Lưu trữ và quản lý lịch trình du lịch

### 1.2. Nhu cầu người dùng & các Use-cases

#### 1.2.1. Người dùng chưa đăng ký (Guest)

- UC01: Truy cập website
- UC02: Nhập thông tin chuyến đi (điểm đến, thời gian, ngân sách, sở thích)
- UC03: Nhận lộ trình du lịch được đề xuất
- UC04: Xem chi tiết địa điểm tham quan
- UC05: Xem lộ trình trên bản đồ
- UC06: Được gợi ý đăng ký tài khoản để lưu lịch trình
- UC07: Chỉnh sửa lộ trình (thêm / xóa / thay đổi địa điểm)

#### 1.2.2. Người dùng đã đăng ký (Registered User)

- UC08: Đăng ký / đăng nhập tài khoản
- UC09: Quản lý thông tin cá nhân
- UC10: Nhập thông tin chuyến đi
- UC11: Nhận lộ trình du lịch cá nhân hóa bằng AI
- UC12: Ước tính chi phí chuyến đi
- UC13: Lưu lộ trình du lịch
- UC14: Xem lại lịch trình đã lưu
- UC15: Đánh giá và phản hồi lộ trình
- UC16: Nhận đề xuất mới dựa trên lịch sử và phản hồi

### 1.3. Tính năng giữ chân người dùng (Retention)

Trong quá trình lên kế hoạch du lịch, người dùng thường cần thử nhiều phương án khác nhau trước khi đưa ra quyết định cuối cùng. Hệ thống được thiết kế để hỗ trợ quá trình này thay vì chỉ tạo một lịch trình duy nhất.

**Các tính năng cụ thể:**

- Lưu và quản lý toàn bộ lịch trình đã tạo dưới dạng thư viện cá nhân
- Cho phép chỉnh sửa ngân sách và địa điểm, hệ thống cập nhật chi phí và điểm số theo thời gian thực
- Ghi nhận các dữ liệu như: sở thích, cấu trúc ngân sách,... từ các lịch trình trước đó để cải thiện đề xuất về sau

**Lý do giữ chân người dùng:**
Ngay từ lần đầu sử dụng, các người dùng sẽ được trải nghiệm những tính năng độc đáo, và cực kỳ hữu ích:

- Có thể thử và tối ưu nhiều phương án mà không phải bắt đầu lại từ đầu
- Cảm thấy mình đang chủ động kiểm soát kế hoạch thay vì chỉ nhận gợi ý
- Tiết kiệm thời gian được nhiều thời gian trong các lần lập kế hoạch sau
- Dễ dàng đánh giá được mức độ phù hợp của kế hoạch nhờ hệ thống chấm điểm thông minh

Người dùng sau khi đã có được trải nghiệm ấn tượng ngay từ ban đầu sẽ càng sử dụng nhiều hơn, các đề xuất sau này càng chính xác và phù hợp hơn, tạo động lực để họ quay lại cho những lần sử dụng tiếp theo

## 2. Phân tích Cạnh tranh & Chiến lược khác biệt

### 2.1. Đối thủ cạnh tranh

| Loại đối thủ | Tên tiêu biểu                       | Đặc điểm                                                                                                                                                                                                                           |
| ------------ | ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Trực tiếp    | iPlan.ai, GuideGeek, Roam Around    | Sử dụng các mô hình AI lớn để tạo lịch trình nhanh. Ưu điểm là tốc độ, nhưng nhược điểm là dữ liệu có thể thiếu độ tin cậy, không được cập nhật theo thời gian thực, đồng thời thiếu sự phản ánh tình hình thực tế tại địa phương. |
| Gián tiếp    | Google Maps, TripAdvisor, Wanderlog | Chứa kho dữ liệu địa điểm phong phú cùng nhiều đánh giá thực tế từ người dùng. Tuy nhiên, người dùng phải tự xây dựng và sắp xếp lịch trình thủ công, gây tốn thời gian và thiếu sự tối ưu tổng thể.                               |

### 2.2. Lợi thế cạnh tranh

#### 2.2.1. Đề xuất thông minh có ràng buộc rõ ràng

Khác với việc chỉ sinh ra một đoạn văn bản gợi ý, hệ thống xây dựng lịch trình dựa trên các ràng buộc định lượng cụ thể:

- Ngân sách tối đa
- Số ngày du lịch
- Sở thích cá nhân
- Chi phí trung bình từng địa điểm

Hệ thống không chỉ đưa ra những gợi ý tốt, mà còn đảm bảo lịch trình thỏa điều kiện người dùng đặt ra, giúp tránh tình trạng vượt ngân sách hoặc phân bổ thời gian thiếu hợp lý.

#### 2.2.2. Sử dụng kiến trúc dữ liệu có cấu trúc, có thể tối ưu và mở rộng

Hệ thống không xử lý lịch trình như văn bản tự do, mà mô hình hóa chúng thành các thực thể dữ liệu liên kết với nhau trong cơ sở dữ liệu. Điều này cho phép hệ thống:

- Có thể lưu – chỉnh sửa – tối ưu lại lịch trình
- Có thể áp dụng thuật toán tối ưu chi phí / thời gian
- Có nền tảng để phát triển cơ chế cá nhân hóa, thông qua việc lưu trữ lịch sử chuyến đi, sở thích và hành vi của từng người dùng, từ đó cải thiện chất lượng đề xuất theo thời gian

#### 2.2.3. Bản địa hóa dữ liệu cho thị trường Việt Nam

Hệ thống **chủ động xây dựng và chuẩn hóa dữ liệu địa điểm phù hợp với bối cảnh Việt Nam**, bao gồm:

- Quán ăn địa phương
- Địa điểm du lịch ngách
- Mức chi tiêu sát thực tế
  Nhờ đó, đề xuất mang tính thực tiễn cao hơn so với việc phụ thuộc hoàn toàn vào dữ liệu tổng quát từ các sản phẩm ở ngoài nước

### 2.3 Chống sao chép

Mặc dù các tính năng bề ngoài có thể bị sao chép, hệ thống vẫn có những yếu tố tạo rào cản nhất định:

#### 2.3.1. Cơ sở dữ liệu được xây dựng và chuẩn hóa riêng

Hệ thống không chỉ lấy dữ liệu công khai và hiển thị lại, mà **chủ động xây dựng một bộ dữ liệu có cấu trúc phục vụ trực tiếp cho việc tối ưu lịch trình và ngân sách**
Thay vì chỉ lưu thông tin cơ bản như **tên, địa chỉ, đánh giá, hệ thống bổ sung và chuẩn hóa** thêm các thuộc tính quan trọng như:

- Chi phí trung bình theo người (VNĐ)
- Phân loại mức giá (bình dân / trung cấp / cao cấp)
- Loại hình trải nghiệm (ẩm thực địa phương, tham quan văn hóa, check-in…)
- Thời gian tham quan trung bình
- Mức độ phù hợp với từng nhóm ngân sách

Nhờ đó, dữ liệu không chỉ để hiển thị, mà còn có thể dùng làm đầu vào cho thuật toán phân bổ ngân sách và tối ưu lịch trình

**Ví dụ:**
Từ Google Maps, một quán ăn chỉ có:

- Tên, Địa chỉ, Rating 4.3
  Sau khi được hệ thống chuẩn hóa, quán đó được bổ sung thêm:
- Chi phí trung bình 45.000đ/người – Phân loại bình dân – Thời gian ăn 60 phút – Phù hợp ngân sách thấp.
  Nhờ vậy, hệ thống có thể tự động chọn đúng địa điểm khi người dùng đặt ngân sách giới hạn, thay vì chỉ hiển thị danh sách ngẫu nhiên.

#### 2.3.2. Logic đề xuất và tối ưu được thiết kế theo mô hình riêng

Hệ thống sử dụng thuật toán thông minh để tối ưu chi phí, thời gian dựa trên cấu trúc dữ liệu nội bộ. Ngay cả khi đối thủ có ý tưởng tương tự, họ vẫn phải nghiên cứu và xây dựng lại toàn bộ kiến trúc dữ liệu và thuật toán xử lý từ đầu

#### 2.3.3. Sự tích lũy dữ liệu người dùng theo thời gian

Khi hệ thống lưu trữ lịch sử chuyến đi và hành vi người dùng, chất lượng đề xuất sẽ cải thiện dần theo thời gian. Đối thủ mới tham gia thị trường sẽ không có ngay được lượng dữ liệu hành vi này, khiến họ khó đạt cùng mức độ cá nhân hóa trong giai đoạn đầu

#### 2.3.4. Tập trung vào thị trường ngách (Việt Nam)

Việc tập trung bản địa hóa sâu cho thị trường Việt Nam giúp hệ thống xây dựng lợi thế trong một phân khúc cụ thể, thay vì cạnh tranh trực tiếp với các nền tảng toàn cầu
2.3.2.4 Unique Selling Proposition (USP)
USP của hệ thống là khả năng xây dựng lịch trình dựa trên cấu trúc phân bổ ngân sách ngay từ đầu, đồng thời tự động đánh giá mức độ khả thi của kế hoạch thông qua cơ chế chấm điểm đặc biệt
Khác với các công cụ chỉ tạo ra danh sách gợi ý hoặc đoạn văn mô tả hành trình, hệ thống:

- Phân bổ ngân sách theo từng nhóm chi tiêu (ăn uống, tham quan, di chuyển, dự phòng) trước khi lựa chọn địa điểm.
- Lựa chọn và sắp xếp địa điểm dựa trên ràng buộc tổng ngân sách và số ngày
- Tính toán tổng chi phí ước tính của toàn bộ chuyến đi.
- Đánh giá mức độ hợp lý của lịch trình dựa trên mật độ hoạt động, thời lượng mỗi ngày và mức độ tuân thủ cơ cấu ngân sách
  Cơ chế chấm điểm không chỉ kiểm tra tổng chi phí có vượt ngân sách hay không, mà còn xem xét mức độ lệch so với phân bổ ban đầu.

**Ví dụ minh họa:**

- Người dùng nhập:
  - Địa điểm: Đà Nẵng
  - Thời gian: 3 ngày
  - Ngân sách: 5.000.000 VNĐ

- Hệ thống phân bổ:
  - 40% ăn uống → 2.000.000 VNĐ
  - 30% tham quan → 1.500.000 VNĐ
  - 20% di chuyển → 1.000.000 VNĐ
  - 10% dự phòng → 500.000 VNĐ

- Sau khi lựa chọn địa điểm, kết quả:
  - Ăn uống: 2.400.000 VNĐ (vượt 20%)
  - Tham quan: 1.300.000 VNĐ
  - Di chuyển: 900.000 VNĐ
  - Dự phòng: 300.000 VNĐ
  - Tổng chi phí: 4.900.000 VNĐ (không vượt ngân sách)

Trong trường hợp này lịch trình chỉ bị trừ điểm nhẹ do nhóm ăn uống vượt tỷ lệ phân bổ ban đầu. ví dụ được 95/100 điểm mức độ phù hợp ( -5 điểm do ngân sách ăn uống vượt mức ). Nhờ đó, người dùng không chỉ biết lịch trình có nằm trong ngân sách hay không, mà còn có thể đánh giá xem nó có phù hợp với kế hoạch và cơ cấu chi tiêu ban đầu ở mức độ nào
