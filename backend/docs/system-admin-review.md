# Rà soát trang Quản trị hệ thống CookHub

Ngày rà soát: 30/10/2026. Phạm vi: Tổng quan, Người dùng & Phân quyền, Báo cáo & Thống kê, Tài khoản & bảo mật. Không sửa schema hoặc ghi dữ liệu vào database thật.

## 1. Kiểm tra ban đầu

Frontend React/Vite dùng `SystemAdminLayout` với các route `/system-admin`, `/system-admin/users`, `/system-admin/reports`, `/system-admin/account`. Backend FastAPI dùng SQLAlchemy và SQL Server; các API quản trị hệ thống yêu cầu `system_user`. Phiên đăng nhập là cookie HTTP-only có chữ ký; logout xóa cookie hiện tại, kiến trúc chưa có danh sách thu hồi phiên.

Đã đọc schema SQL Server bằng truy vấn chỉ đọc. Tại thời điểm kiểm tra: 10 tài khoản (8 người dùng, 1 quản trị nội dung, 1 quản trị hệ thống), 65 món ăn, 64 công thức, 9 thực đơn, 21 lượt yêu thích. `NguoiDung.NgayTao`, `ThucDon.NgayTao`, `MonYeuThich.NgayThem` hỗ trợ thống kê theo thời gian. `MonAn` và `CongThuc` chỉ có ngày cập nhật, không có ngày tạo. Chưa có bảng lịch sử thao tác quản trị, lần đăng nhập gần nhất, ngày đổi mật khẩu hay lý do khóa. Ngày tạo của dữ liệu mẫu có thể là thời điểm nạp database, không nhất thiết là ngày người thật đăng ký.

Vấn đề ban đầu: một số vai trò và trạng thái dịch vụ hiển thị bằng chuỗi cố định; số liệu lỗi có thể hiện thành 0; biểu đồ 0 vẫn có cột; bộ lọc ngày dùng UTC gây lệch ngày địa phương; danh sách thiếu tìm/lọc/sắp xếp/phân trang và xác nhận khóa; vai trò ở phiên tài khoản bị ghi cứng là quản trị nội dung; luồng đăng xuất của trang quản trị hệ thống không có bộ nghe sự kiện từ layout người dùng thường.

## 2. Hạng mục

| Hạng mục | Trạng thái | File đã sửa | Kết quả kiểm thử | Ghi chú |
|---|---|---|---|---|
| 6 KPI tổng quan, phân bố vai trò, trạng thái | Hoàn thành | `admin.py`, `SystemOverview.jsx` | Backend fixture và build đạt | Dữ liệu từ bảng thật; trạng thái không có nghĩa đang trực tuyến |
| Hoạt động 30 ngày, cảnh báo tài khoản | Hoàn thành một phần | `admin.py`, `SystemOverview.jsx` | Backend fixture đạt | Công thức mới và audit log chưa có dữ liệu nguồn |
| Danh sách, lọc, sắp xếp, phân trang, chi tiết | Hoàn thành | `admin.py`, `SystemUsers.jsx` | Test frontend đạt | Phân trang phía client, phù hợp dữ liệu hiện tại |
| Khóa/mở khóa có xác nhận | Hoàn thành một phần | `SystemUsers.jsx` | Test frontend dùng API giả lập đạt | Chưa lưu lý do và lịch sử vì thiếu schema; backend vẫn kiểm tra quyền |
| Bộ lọc kỳ, xu hướng, so sánh kỳ | Hoàn thành | `admin.py`, `SystemReports.jsx` | Backend fixture và test frontend đạt | Các trường có ngày tạo/lưu được thống kê; dữ liệu mẫu được ghi rõ |
| Tình trạng backend, SQL, ảnh Cloudinary | Hoàn thành | `admin.py`, `SystemReports.jsx` | Truy vấn thực chỉ đọc đạt | Mẫu ảnh được kiểm tra bằng HTTP HEAD; không đại diện mọi ảnh |
| CSV | Hoàn thành | `SystemReports.jsx` | Build đạt | Có BOM UTF-8, escape CSV và bảo vệ công thức bảng tính; chưa thử mở bằng Excel thật |
| Vai trò tài khoản và đăng xuất | Hoàn thành một phần | `AdminAccount.jsx` | Test frontend giả lập đạt | Logout xóa cookie hiện tại; chưa có thu hồi token đa thiết bị |
| Responsive 5 kích thước | Hoàn thành một phần | `system-admin-review.css` | Đã rà CSS/build | Chưa xác minh bằng ảnh chụp tại cả 5 viewport vì phiên trình duyệt đang ở trang login và chưa có phiên quản trị |

## 3. Thay đổi mã nguồn

- `backend/app/routers/admin.py`: trả về KPI/hoạt động/so sánh kỳ từ dữ liệu thật, ngày tạo tài khoản, trạng thái dịch vụ ảnh và thời gian kiểm tra. Nhánh SQLite trong thống kê ngày phục vụ test, SQL Server giữ cách nhóm bằng `CAST(... AS DATE)`.
- `frontend/src/pages/SystemOverview.jsx`: 6 KPI, vai trò thực, trạng thái, hoạt động 30 ngày, tài khoản tạm khóa và thông báo rõ giới hạn audit.
- `frontend/src/pages/SystemUsers.jsx`: tìm kiếm tên/email/mã, lọc kết hợp, sắp xếp ổn định, phân trang, ngày tạo, chi tiết, xác nhận khóa/mở khóa, xử lý tải/lỗi.
- `frontend/src/pages/SystemReports.jsx`: khoảng ngày địa phương, biểu đồ rỗng đúng, so sánh từng chỉ số, trạng thái dịch vụ thật, CSV an toàn.
- `frontend/src/pages/AdminAccount.jsx`: vai trò lấy từ `/profile`, xác nhận đăng xuất và gọi logout trong layout quản trị hệ thống.
- `frontend/src/hooks.js`: bỏ qua request khi kỳ tùy chỉnh chưa hợp lệ.
- `frontend/src/system-admin-review.css`: bố cục bảng, lọc, biểu đồ, hộp thoại ở các breakpoint hiện có.
- `backend/tests/test_system_admin_reporting.py`, `frontend/src/pages/SystemAdmin.review.test.jsx`: kiểm thử các số liệu và luồng chính, dùng fixture/mock; không ghi database thật.

Các file khác đã có thay đổi chưa commit từ trước khi bắt đầu lượt rà soát này; không được hoàn nguyên hay gom vào kết luận của lượt này.

## 4. Kiểm thử

- `backend/.venv/Scripts/python.exe -m pytest -q` trong `backend`: **23 đạt, 5 bỏ qua, 0 thất bại**. Fixture xác nhận tổng tài khoản, phân bố vai trò, ngày tạo và ranh giới kỳ báo cáo.
- `npm test -- --run` trong `frontend`: **24 đạt, 0 thất bại**. Test mới xác nhận lọc/phân trang, khóa cần xác nhận, khoảng ngày tùy chỉnh không hợp lệ và vai trò/đăng xuất.
- `npm run build` trong `frontend`: **đạt**. Build cảnh báo hai ảnh auth `/images/auth-background.png` và `/images/auth-responsive-v2.png` chưa resolve; cảnh báo này có trước lượt rà soát.
- Truy vấn trực tiếp các API báo cáo/tổng quan với SQL Server được thực hiện ở chế độ chỉ đọc, số tài khoản và món ăn khớp truy vấn nguồn tại thời điểm kiểm tra.
- Chưa kiểm tra tương tác trên trình duyệt bằng tài khoản quản trị thật, xuất CSV mở bằng Excel, hoặc ảnh chụp ở 1920×1080, 1366×768, 1440×900, 1024×768, 768×1024. Không coi đây là các bài test đã đạt.

## 5. Đề xuất database, chưa thực hiện

Nếu cần nhật ký quản trị: thêm bảng audit với người thao tác, đối tượng, hành động, giá trị cũ/mới, thời điểm và lý do; ghi trong cùng transaction với thay đổi. Nếu cần thống kê món/công thức mới: thêm ngày tạo riêng, không dùng ngày cập nhật thay thế. Nếu cần bảo mật phiên sâu hơn: lưu lần đăng nhập, ngày đổi mật khẩu và cơ chế thu hồi phiên; cần thiết kế bảo mật và migration riêng. Không sửa schema trong lượt này.

## 6. Giới hạn còn tồn tại

Không thể hiển thị hoạt động quản trị gần đây, lý do khóa, lần đăng nhập hay lần đổi mật khẩu vì database hiện không lưu. Logout chỉ kết thúc cookie ở trình duyệt hiện tại; chưa thể vô hiệu hóa bản sao token đã phát hành. Kiểm tra ảnh chỉ đo một URL mẫu. Dữ liệu nạp sẵn được tính trong KPI thời gian theo ngày lưu trong bảng. Phân trang người dùng ở client có thể cần API phân trang nếu số tài khoản tăng lớn. Kiểm tra responsive trực quan và luồng thật còn chờ một phiên quản trị có thể sử dụng; không dùng tài khoản giả trong database thật để kiểm tra.
