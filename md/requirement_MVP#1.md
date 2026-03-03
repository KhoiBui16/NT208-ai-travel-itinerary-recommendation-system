# Requirements MVP#1

1. Người dùng & Phân tích Nhu cầu (Use-cases)

- Ai là người sử dụng website? Phân loại rõ các nhóm người dùng (khi đã đăng ký thành viên).
- Nhu cầu của họ là gì? Liệt kê chi tiết và phân loại tất cả các trường hợp sử dụng (Use-cases) có thể xảy ra của từng nhóm người dùng.
- Tính năng giữ chân người dùng (Retention): Trình bày rõ tính năng "đinh" nào sẽ khiến người dùng quay lại website của em bạn thay vì dùng một lần rồi bỏ.

2. Phân tích Cạnh tranh & Chiến lược khác biệt

- Đối thủ là ai? Xác định các đối thủ trực tiếp và gián tiếp trên thị trường hiện tại. Nếu không có trang web nào đối thủ thì ghi không.
- Lợi thế cạnh tranh: Sản phẩm của nhóm có gì ưu việt hơn đối thủ (nhanh hơn, UI/UX tốt hơn, tích hợp AI, rẻ hơn,...)?
- Chống sao chép: Điều gì ngăn cản đối thủ (hoặc các nhóm khác) copy hoàn toàn tính năng của em? (Có thể là thuật toán riêng, nguồn dữ liệu độc quyền, hoặc cách tiếp cận ngách).
- Unique Selling Proposition (USP): Đâu là ý tưởng/tính năng ĐỘC ĐÁO NHẤT mà chưa trang web nào trên thị trường có?

3. Sơ đồ Kiến trúc Hệ thống (System Architecture)

- Vẽ sơ đồ tổng quan thể hiện sự tương tác giữa Front-end, Back-end, Database, và các dịch vụ bên thứ 3 (API bên ngoài, dịch vụ AI, Cloud storage,...).
- Mô tả rõ các module chính và chức năng tương ứng của từng module.

4. Thiết kế Luồng dữ liệu & UML

- Biểu đồ luồng dữ liệu (Data Flow Diagram - DFD): Thể hiện cách dữ liệu đi vào, được xử lý và lưu trữ trong hệ thống.
- Sơ đồ UML (Unified Modeling Language): Bắt buộc có Use-case Diagram (gắn liền với Phần I) và Sequence Diagram cho các chức năng quan trọng nhất.

5. Thiết kế Cơ sở dữ liệu

- Mô hình Dữ liệu Quan hệ (SQL): Nếu dùng RDBMS (MySQL, PostgreSQL,...), yêu cầu vẽ lược đồ quan hệ thực thể (ERD) chỉ rõ các bảng, khóa chính, khóa ngoại và mối quan hệ (1-1, 1-n, n-n).
- Mô hình NoSQL: Nếu hệ thống sử dụng NoSQL (MongoDB, Firebase,...), yêu cầu thiết kế cấu trúc Collection/Document và cung cấp các mẫu demo JSON thể hiện chính xác cách dữ liệu sẽ được lưu trữ.

6. Minimum Viable Product (MVP)

- Hoàn thiện phiên bản MVP của website: Không yêu cầu phải có toàn bộ chức năng, nhưng bắt buộc phải chạy mô phỏng được luồng nghiệp vụ cốt lõi nhất đã định nghĩa.
- Lựa chọn Công nghệ (Tech Stack) & Quản lý nhóm. Yêu cầu: sinh viên giải thích ngắn gọn tại sao chọn ngôn ngữ/framework đó (ví dụ: làm realtime cảnh báo thiên tai thì dùng Node.js/Socket.io; làm AI thì dùng Python/FastAPI backend).
- Cung cấp minh chứng làm việc nhóm trong 1 tháng qua (chụp ảnh màn hình Trello/Jira, hoặc lịch sử commit trên Github/Gitlab/ Hoặc lịch sử chat nhóm).
- Giao diện (UI) ở mức cơ bản, nhưng Trải nghiệm (UX) luồng chính phải trơn tru, không lỗi (crash)
