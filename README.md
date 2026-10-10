# CookHub — FastAPI, React và SQL Server 2022

Ứng dụng chạy trên SQL Server 2022 database `QuanLyThucDon`, FastAPI và React/Vite. Không dùng Apache, PHP hay MySQL/XAMPP.

## Địa chỉ khi chạy

- Giao diện web: <http://127.0.0.1:5173>
- API: <http://127.0.0.1:8000>
- Tài liệu API: <http://127.0.0.1:8000/docs>

`localhost` và `127.0.0.1` đều là máy hiện tại.

## Chạy dự án theo thứ tự

### 1. Khởi động SQL Server

Mở **SQL Server Configuration Manager** và xác nhận dịch vụ `SQL Server (SQLEXPRESS)` có trạng thái **Running**.

Database cần dùng là `QuanLyThucDon` trên instance:

```text
DESKTOP-RIDON54\SQLEXPRESS
```

Nếu chưa có database, mở SSMS và chạy file [QuanLyThucDon.sql](QuanLyThucDon.sql) để tạo schema và dữ liệu mẫu.

### 2. Mở backend

Mở một cửa sổ **Command Prompt** mới, chạy:

```cmd
cd C:\Users\BThuyy\Desktop\KLCN\GiaoDienThucDon\backend
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload
```

Chờ đến khi thấy:

```text
Application startup complete.
```

Giữ nguyên cửa sổ này trong khi dùng web. Backend chạy ở cổng `8000`.

> Cấu hình kết nối SQL Server nằm trong `backend/.env`. Không đổi file này nếu không thay đổi instance SQL Server hoặc tài khoản kết nối.

### 3. Mở frontend

Mở **cửa sổ Command Prompt thứ hai**, chạy:

```cmd
cd C:\Users\BThuyy\Desktop\KLCN\GiaoDienThucDon\frontend
set "PATH=%CD%\.tools\node-v22.16.0-win-x64;%PATH%"
npm run dev
```

Chờ Vite hiển thị:

```text
Local: http://127.0.0.1:5173/
```

Giữ nguyên cửa sổ này. Frontend gọi API qua proxy tới backend ở cổng `8000`.

### 4. Mở web

Mở trình duyệt tại:

```text
http://127.0.0.1:5173
```

Nếu giao diện hiện “Không thể hoàn tất yêu cầu”, kiểm tra cửa sổ backend còn hiển thị `Application startup complete` hay không.

## Đăng nhập thử

Tài khoản có thể đăng ký trực tiếp tại giao diện. Mật khẩu được lưu dưới dạng bcrypt trong cột `MatKhauBam`; không thể xem lại mật khẩu gốc từ database.

## Kiểm tra hệ thống

Backend, dùng Command Prompt:

```cmd
cd C:\Users\BThuyy\Desktop\KLCN\GiaoDienThucDon\backend
.\.venv\Scripts\python.exe -m pytest tests -q
.\.venv\Scripts\python.exe -m pytest tests\test_real_db.py -q --real-db
```

Frontend, dùng Command Prompt:

```cmd
cd C:\Users\BThuyy\Desktop\KLCN\GiaoDienThucDon\frontend
set "PATH=%CD%\.tools\node-v22.16.0-win-x64;%PATH%"
npm test
npm run build
```

## Cấu trúc chính

```text
QuanLyThucDon.sql     Schema SQL Server 2022 và dữ liệu mẫu
backend/              FastAPI, ORM SQLAlchemy, API, ảnh/video
frontend/             React/Vite
```