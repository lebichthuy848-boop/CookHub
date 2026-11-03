# Rà soát và tối ưu Cài đặt người dùng CookHub

Ngày: 31/10/2026. Phạm vi: route `/settings` của người dùng thường. Không thay đổi database, API đăng nhập, phân quyền hay trang quản trị hệ thống.

## 1. Hiện trạng ban đầu

`frontend/src/pages/SettingsPage.jsx` có 6 tab. `SettingsProvider` trong `frontend/src/settings-context.jsx` lưu các lựa chọn bằng `localStorage` theo khóa `cookhub:settings:v1:<user-id>`; không có API đồng bộ các lựa chọn này giữa thiết bị. Theme còn có khóa tương thích `cookhub-theme`. Cookie phiên đăng nhập do backend quản lý, không nằm trong JSON xuất cài đặt. Một route cũ `/system-settings` còn dùng component khác trong `Personal.jsx`; route chính của người dùng là `/settings`.

| Chức năng | Nguồn trạng thái | Nơi sử dụng trước thay đổi | Thực trạng | Phương án |
|---|---|---|---|---|
| Theme, cỡ chữ, mật độ, giảm chuyển động | localStorage + CSS root | Toàn ứng dụng | Có hiệu lực | Giữ |
| Sidebar thu gọn/cố định/ghi nhớ | localStorage + CSS root | Layout | Thu gọn có hiệu lực; nút đặt xa sidebar | Chuyển nút thu gọn vào sidebar, giữ cố định mặc định |
| Kiểu xem món | localStorage + CSS root | Trước đây ảnh hưởng toàn bộ `.dish-grid`; trang Khám phá có state riêng | Hai nguồn trạng thái không nhất quán | Chuyển vào Khám phá và dùng một nguồn trạng thái |
| Ẩn hình ảnh | localStorage + CSS root | Nhiều thẻ món | Có thể ẩn ảnh toàn ứng dụng | Bỏ giao diện; ảnh trở về mặc định |
| Hiện dinh dưỡng | localStorage + CSS root | Các phần dinh dưỡng | Chỉ ẩn hiển thị | Giữ trong Giao diện |
| Âm báo, âm lượng | localStorage | Nút nghe thử Cài đặt | Có phát âm tổng hợp; chưa có luồng thông báo chung dùng âm này | Giữ, ghi rõ phạm vi |
| Wake Lock, đọc hướng dẫn | localStorage | Chưa nối với trang công thức chính | Chỉ lưu lựa chọn | Nối với hướng dẫn món, kích hoạt theo thao tác/ngữ cảnh |
| Tự phát video kế tiếp | localStorage | `Dish.jsx` | Có xử lý video khi món có video | Giữ |
| Xóa cache | localStorage | Tiền tố `cookhub:cache:` | Chưa thấy nơi tạo cache tương ứng | Giữ thao tác giới hạn và thông báo không có gì để xóa |
| Nhập/xuất JSON | SettingsProvider | Cài đặt | Nhập trước đây cho phép file sai cấu trúc bị lặng lẽ đổi thành mặc định | Gộp giao diện, xác thực nghiêm ngặt và xác nhận |
| Hỗ trợ/góp ý | State tại trang | Tab hỗ trợ | Chỉ sao chép clipboard, không gửi | Chuyển thành nút Trợ giúp |

Không phát hiện việc lưu token, mật khẩu trong `SettingsProvider`. Không đọc hoặc in giá trị phiên đăng nhập. Các thay đổi Git có sẵn trước lượt này được giữ nguyên.

## 2. Kết quả 13 hạng mục

| STT | Hạng mục | Trạng thái | File đã sửa | Kết quả |
|---|---|---|---|---|
| 1 | Ba tab Cài đặt | Hoàn thành | `SettingsPage.jsx` | Giao diện, Khi nấu ăn, Dữ liệu & khôi phục |
| 2 | URL tab cũ, Back/Forward | Hoàn thành | `SettingsPage.jsx` | Dùng search params; tab cũ ánh xạ về tab mới |
| 3 | Sidebar thu gọn trực tiếp | Hoàn thành | `Layout.jsx`, `settings-page-review.css` | Nút trên sidebar, lưu theo tài khoản qua context |
| 4 | Kiểu xem ở Khám phá | Hoàn thành | `Catalog.jsx`, `settings-context.jsx` | Grid/list đọc và ghi cùng `dishView`; không đổi bộ lọc |
| 5 | Bỏ ẩn ảnh món | Hoàn thành | `SettingsPage.jsx`, `settings-context.jsx` | Bỏ công tắc; không áp dụng class ẩn ảnh |
| 6 | Hiển thị dinh dưỡng | Hoàn thành | `SettingsPage.jsx` | Giữ tùy chọn CSS hiển thị, không sửa dữ liệu dinh dưỡng |
| 7 | Âm báo/âm lượng | Hoàn thành một phần | `SettingsPage.jsx` | Nghe thử hoạt động; chưa có thông báo ứng dụng dùng âm báo này |
| 8 | Wake Lock | Hoàn thành một phần | `Dish.jsx`, `SettingsPage.jsx` | Chỉ ở trang món, xử lý tab ẩn/rời trang; cần kiểm tra trên thiết bị hỗ trợ |
| 9 | Đọc hướng dẫn | Hoàn thành một phần | `Dish.jsx`, `SettingsPage.jsx` | Chỉ đọc sau khi bấm; dừng khi rời trang; cần thử giọng Việt thực tế |
| 10 | Video | Hoàn thành | `SettingsPage.jsx` | Giữ tùy chọn phát video kế tiếp đang được `Dish.jsx` sử dụng |
| 11 | Sao lưu/nhập JSON | Hoàn thành | `SettingsPage.jsx`, `settings-context.jsx` | Chỉ xuất khóa hợp lệ; nhập xác thực, giới hạn 100 KB, xác nhận |
| 12 | Xóa cache/khôi phục mặc định | Hoàn thành | `SettingsPage.jsx` | Chỉ xóa tiền tố cache, reset chỉ cài đặt, đều có xác nhận |
| 13 | Trợ giúp, responsive | Hoàn thành một phần | `SettingsPage.jsx`, `settings-page-review.css` | Nút Trợ giúp hoạt động; CSS đã chỉnh, chưa kiểm chứng trực quan đủ 6 viewport |

## 3. File thay đổi

- `frontend/src/pages/SettingsPage.jsx`: ba tab, Trợ giúp, âm báo, nhập/xuất, xác nhận xóa/reset.
- `frontend/src/settings-context.jsx`: xác thực JSON, giới hạn khóa xuất, tránh ghi cài đặt tài khoản cũ sang khóa tài khoản mới, bỏ áp dụng ẩn ảnh và kiểu xem toàn ứng dụng.
- `frontend/src/components/Layout.jsx`: nút thu gọn sidebar trực tiếp cho người dùng thường.
- `frontend/src/pages/Catalog.jsx`: kiểu xem Khám phá dùng cài đặt đã lưu.
- `frontend/src/pages/Dish.jsx`: Wake Lock theo trang công thức; đọc các bước bằng Speech Synthesis sau khi người dùng bấm.
- `frontend/src/settings-page-review.css`: bố cục tab, nút, focus và kích thước nhỏ.
- `frontend/src/pages/SettingsPage.test.jsx`: kiểm thử tab, import JSON, lưu qua reload giả lập.

## 4. Kiểm thử

- `npm test -- --run`: **27 đạt, 0 thất bại**.
- `npm run build`: **đạt**. Build vẫn cảnh báo 2 ảnh auth chưa resolve và bundle lớn; không phát sinh từ trang Cài đặt.
- `git diff --check`: không có lỗi whitespace.
- Repository không có lệnh lint trong `frontend/package.json`; không tuyên bố đã chạy lint.
- Test tự động xác nhận đúng 3 tab, ánh xạ tab `food`, lưu theme qua remount, từ chối khóa JSON lạ/âm lượng sai. Chưa chạy kiểm tra trực quan ở 1920×1080, 1440×900, 1366×768, 1024×768, 768×1024 và 390×844; chưa thử Wake Lock, giọng đọc và âm báo trên thiết bị thật. Phiên trình duyệt sẵn có ở trang login nên không có phiên người dùng để kiểm thử UI trực tiếp.

## 5. An toàn dữ liệu

Lượt này chỉ chỉnh frontend và test; không chạy migration, không ghi database thật, không xóa dữ liệu người dùng. Xóa bộ nhớ tạm chỉ đụng các khóa `cookhub:cache:`; không gọi `localStorage.clear()` hoặc xóa Cache Storage. JSON chỉ xuất các khóa cài đặt được liệt kê, không có cookie hay token. File nhập phải hợp lệ trước khi hiển thị xác nhận và trước khi thay đổi state. Test không ghi dữ liệu nghiệp vụ thật.

## 6. Hạn chế

Cài đặt chỉ lưu trong trình duyệt, không đồng bộ giữa thiết bị. Âm báo mới chỉ có chức năng nghe thử vì ứng dụng chưa có luồng thông báo dùng nó. Wake Lock và giọng đọc phụ thuộc khả năng trình duyệt, chưa được thử trên thiết bị thật. Route cũ `/system-settings` có cơ chế localStorage riêng, không thuộc trang Cài đặt chính và được giữ nguyên để tránh mở rộng phạm vi. Các khóa cài đặt cũ vẫn được chấp nhận khi nhập nhằm không làm mất dữ liệu đã lưu, nhưng các tùy chọn đã bỏ không còn xuất hiện trong giao diện mới.
