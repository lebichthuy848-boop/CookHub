# Cá nhân hóa CookHub: thiết kế và triển khai

Tính năng được tích hợp vào React/Vite + FastAPI + SQL Server hiện có. Bảng `UserPreferences` bổ sung vào 30 bảng lõi V2; migration đã được áp dụng trên database cấu hình tại máy này.

## Luồng và cấu trúc component

```text
Auth (đăng ký)
  → POST /api/auth/register
  → Set-Cookie: cookhub_session (HttpOnly) + User Info
  → setUser(result)
  → Navigate /home
Catalog /home
  ├─ OnboardingSurvey
  │    └─ SurveyDialog
  │         ├─ BubbleChoices × 5 câu hỏi (state trong React)
  │         ├─ POST preferences/preview → tối đa 10 Mini Match Cards
  │         ├─ PUT/DELETE favorites/{id} → lưu trái tim ngay
  │         └─ POST preferences → setUser → đóng → Sparkles → reload gợi ý
  └─ HomeDashboard → GET recommendations?mode=for_you
Profile /profile hoặc /settings
  └─ PreferencesSettings → BubbleChoices theo section → cập nhật sở thích
```

Mã component: `frontend/src/components/Personalization.jsx`. Kiểu dáng và keyframes: `frontend/src/components/Personalization.css`. Điểm gắn vào trang chủ: `frontend/src/pages/Catalog.jsx`; form hồ sơ: `frontend/src/pages/Personal.jsx`.

## Thiết kế giao diện

- Modal kính mờ ở giữa, nền emerald trong suốt và backdrop blur 12px, viền sáng vàng/emerald, rộng tối đa 820px.
- Bong bóng có lớp sáng bên trong tạo chiều sâu, emoji nổi và dấu chọn; mỗi lựa chọn dùng một gradient riêng trong cùng nhóm. Chọn/bỏ chọn bằng button `aria-pressed`.
- Desktop: ba cột bong bóng; màn hình nhỏ: hai cột. Modal giới hạn chiều cao theo `100dvh` và có vùng cuộn.
- CSS `bubble-float` tạo nhịp nổi ±7px; Framer Motion xử lý nhấn/nẩy, xuất hiện modal và chuyển câu hỏi bằng `AnimatePresence`.
- Thanh tiến trình tăng 20% mỗi câu, gradient emerald–gold và bóng sáng. Bước kết quả đạt 100%.
- Kết quả: hai hàng card, cuộn ngang và scroll snap; card có ảnh, thời gian, nhãn Hợp vị, trái tim và sao vàng khi lưu.
- Khi API lưu thành công: modal đóng, confetti hình sao xuất hiện và dữ liệu trang chủ tải lại.
- Trong hồ sơ: các section cố định, bong bóng không tự trôi; nút cập nhật chỉ bật khi cả năm nhóm có lựa chọn.
- Có khóa cuộn nền, focus trap, Escape/Để sau, trả focus sau khi đóng, thông báo lỗi, chống thao tác khi đang lưu và hỗ trợ `prefers-reduced-motion`.

Ví dụ animation đang dùng:

```css
.preference-bubble.picked {
  background: linear-gradient(135deg, var(--bubble-colors));
  box-shadow: inset 2px 3px 8px #ffffff80, 0 8px 25px #72957b33;
}
.floating .preference-bubble {
  animation: bubble-float 4s ease-in-out infinite;
  animation-delay: var(--float-delay);
}
@keyframes bubble-float {
  0%, 100% { translate: 0 0; }
  50% { translate: 0 -7px; }
}
```

## Auto-login và khảo sát đúng một lần

Hệ thống dùng session token ký HMAC lưu trong cookie HttpOnly. API đăng ký đã tạo phiên; trình duyệt lưu cookie qua `credentials: 'include'`, React nhận User Info rồi chuyển `/home`. Token không được đưa vào localStorage hay trả công khai trong JSON; cơ chế cookie hiện có đáp ứng auto-login và được dùng cho các API cá nhân hóa.

```jsx
const result = await api('/auth/register', { method: 'POST', body: form });
setUser(result); // Auth render Navigate replace to /home
```

Cờ trong database gồm `survey_shown` và `completed`. Tài khoản mới có một record với hai cờ bằng 0; tài khoản cũ không bị ép khảo sát. `survey_pending` và `has_completed_survey` xuất hiện trong User Info.

`POST /api/v1/user/survey/claim` cập nhật có điều kiện `survey_shown = 0 AND completed = 0`, chỉ một request được quyền mở modal, kể cả nhiều tab. Cờ được ghi ngay trước khi hiện modal để không tự hiện lại khi reload hoặc đăng nhập lần sau. Đóng khảo sát giữa chừng không lưu câu trả lời; người dùng thiết lập tiếp trong hồ sơ. Nếu rời trang ngay sau claim, khảo sát cũng không tự mở lại.

## Hợp đồng API

Mọi API bên dưới yêu cầu phiên đăng nhập. Yêu cầu ghi gửi header `X-CookHub-Client: web` theo cơ chế bảo vệ sẵn có.

| API | Công dụng |
| --- | --- |
| GET `/api/v1/user/preferences` | Lấy answers hoặc null, cùng cờ completed |
| POST `/api/v1/user/survey/claim` | Trả `{show: true/false}`, đánh dấu đã hiện |
| POST `/api/v1/user/preferences/preview` | Xếp hạng tối đa 10 món; không lưu sở thích |
| POST `/api/v1/user/preferences` | Lưu toàn bộ answers, đánh dấu completed/shown, trả User Info |
| GET `/api/recommendations?mode=for_you` | Xếp hạng theo sở thích đã lưu |
| PUT/DELETE `/api/favorites/{id}` | Lưu/bỏ yêu thích trực tiếp từ kết quả |

Payload mẫu:

```json
{
  "ingredients": ["chicken", "seafood"],
  "occasions": ["family", "healthy"],
  "tastes": ["light", "sweet_sour"],
  "time": "medium",
  "tools": ["stove", "air_fryer"]
}
```

Pydantic kiểm tra enum, số lựa chọn, nhóm bắt buộc và loại bỏ tag trùng. Client không gửi user_id: server lấy người dùng từ phiên để tách dữ liệu giữa tài khoản. Chỉ gửi payload tổng khi xem trước hoặc lưu cuối cùng.

## Thuật toán và giới hạn dữ liệu

`backend/app/personalization.py` dùng thuật toán có trọng số, có thể giải thích:

| Tiêu chí | Trọng số | Dữ liệu |
| --- | ---: | --- |
| Nguyên liệu | 30 | Thành phần công thức; tên món khi thiếu thành phần |
| Bối cảnh/chế độ | 20 | Khẩu phần, tag chế độ ăn; từ khóa cho trẻ/tụ tập |
| Khẩu vị | 20 | KhauViMonAn + mô tả/tên món |
| Thời gian | 20 | Thời gian chế biến thực tế |
| Dụng cụ | 10 | Suy luận từ nội dung bước nấu/tên món |

Mỗi nhóm nhiều lựa chọn dùng OR. Điểm Hợp vị là tổng trọng số nhóm khớp (0–100), không phải xác suất hay phần trăm do AI dự đoán. Với tab Khẩu vị/Chế độ ăn, chỉ tính và chuẩn hóa trọng số nhóm tương ứng. Khi bằng điểm, dùng số lượt yêu thích, đánh giá rồi mã món để thứ tự ổn định.

Món đã ẩn và món không có công thức không nằm trong kết quả cá nhân hóa. Nếu thư viện có ít hơn 10 món đủ điều kiện, hiển thị đúng số có thật. Các lựa chọn thời gian giữ đúng yêu cầu: <15, 15–30, >45 phút; món 31–45 phút không khớp tiêu chí thời gian nhưng vẫn có thể khớp tiêu chí khác.

Schema chưa có tag dụng cụ và bối cảnh riêng cho từng món, nên hai nhóm này còn dựa vào suy luận từ công thức. Điểm số có `match_reasons` và UI ghi rõ phần dụng cụ suy luận. Hệ thống không xem lựa chọn sở thích là điều kiện loại trừ dị ứng hoặc bảo đảm chế độ ăn. Để tăng độ chính xác sau này, bổ sung metadata dụng cụ/bối cảnh chuẩn hóa trên món ăn.

## Migration và cách kiểm tra

Migration riêng, có thể chạy lại, không dựng lại database:

```powershell
cd backend
.venv/Scripts/python.exe scripts/migrate_personalization.py
```

Script SQL nằm tại `backend/scripts/personalization.sql`, cũng được bổ sung cuối `QuanLyThucDon.sql` cho cài đặt mới. Với database đang dùng, chạy migration riêng thay vì chạy lại toàn bộ SQL dữ liệu mẫu.

Kiểm tra thủ công:

1. Đăng ký tài khoản mới → vào trang chủ ngay và thấy modal.
2. Chọn cả năm câu → kiểm tra thứ tự món và trái tim đã lưu.
3. Hoàn tất → thấy sao confetti, trang chủ cập nhật điểm Hợp vị.
4. Reload/đăng nhập lại → modal không hiện lại.
5. Trong Hồ sơ, đổi thời gian/nguyên liệu → lưu → xem trang chủ/Đề xuất.
6. Đóng modal giữa chừng → reload không tự mở lại; thiết lập được trong Hồ sơ.
7. Thử mất kết nối khi xem trước/lưu → lỗi hiển thị, answers vẫn giữ để thử lại.

Các test mới kiểm tra phiên tự đăng nhập, claim một lần, lưu/cập nhật/tách sở thích từng tài khoản, validation, điểm gợi ý, món bị ẩn, luồng năm câu, yêu thích, lỗi lưu và form hồ sơ.

## Kết quả kiểm tra triển khai

- Frontend: 13 test đạt; bản build production tạo thành công.
- Backend: 10 test đạt, 5 bài tích hợp database được skip trong chế độ SQLite.
- Kiểm tra tích hợp riêng trên SQL Server: schema UserPreferences và xếp hạng món thật đạt (1 test).
- Migration đã áp dụng thành công trên SQL Server tại máy này.
- Chưa kiểm tra hình ảnh/animation trực tiếp trong trình duyệt; đã kiểm tra tương tác bằng Testing Library và build.
