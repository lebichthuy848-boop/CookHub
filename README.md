# CookHub

Ứng dụng FastAPI + React/Vite dùng **SQL Server 2022**. Ảnh món ăn và ảnh giao diện được tải từ Cloudinary; video mẫu vẫn nằm trong repo.

## Máy mới cần có

- Python 3.11 trở lên và Node.js 22 trở lên.
- SQL Server 2022 đang chạy, cùng tài khoản có quyền tạo database hoặc một database `QuanLyThucDon` đã được chuẩn bị.
- Internet để cài thư viện và tải ảnh từ Cloudinary.

Clone Git không tự cài Python, Node hay SQL Server, và **không chứa `backend/.env`**. Không dùng tên máy hoặc mật khẩu SQL Server của người khác.

## Cài lần đầu trên Windows

1. Clone repo và mở PowerShell tại thư mục gốc.
2. Tạo database mới bằng SSMS ở chế độ **Query → SQLCMD Mode**: chạy [QuanLyThucDon.sql](QuanLyThucDon.sql), sau đó bắt buộc chạy [Bo-sung.sql](Bo-sung.sql). Cả hai file tạo schema và seed dữ liệu; sau bước này có 9 tài khoản mẫu, 65 món, 64 công thức, 100 nguyên liệu, 90 dòng dinh dưỡng và 3 video. Bốn tài khoản mẫu ND006–ND009 dùng mật khẩu `CookHub123!` để kiểm thử local/demo. File đầu chỉ dành cho database chưa tồn tại. Không chạy lại trên database đang có dữ liệu.
3. Chạy `powershell -ExecutionPolicy Bypass -File .\setup.ps1`. Script tạo Python virtual environment, cài thư viện backend và frontend, tạo `backend/.env` nếu thiếu, hỏi `DATABASE_URL` của máy này và kiểm tra schema.
4. Mở hai terminal tại thư mục gốc:

   ```powershell
   .\backend\start.ps1
   ```

   ```powershell
   .\frontend\start.ps1
   ```

5. Mở <http://127.0.0.1:5173> và đăng ký tài khoản mới.

Ví dụ `DATABASE_URL` với SQL Authentication (đổi user, password, host và port theo máy):

```dotenv
DATABASE_URL=mssql+pymssql://USER:PASSWORD@127.0.0.1:1433/QuanLyThucDon
```

Nếu mật khẩu chứa ký tự đặc biệt, mã hóa URL cho phần user/password. Với Windows Authentication, có thể dùng `mssql+pyodbc` và ODBC Driver 18 for SQL Server. Xem mẫu trong [backend/.env.example](backend/.env.example); không commit `.env`.

Đã cài xong thì kiểm tra lại bằng `powershell -ExecutionPolicy Bypass -File .\setup.ps1 -CheckOnly`.

## Cloudinary và ảnh

Hai file [manifest backend](backend/app/cloudinary_images.json) và [manifest frontend](frontend/src/cloudinary-images.json) phải có trong commit khi push. Chúng chứa URL ảnh công khai, không chứa API secret. Người clone **xem được ảnh cũ mà không cần khóa Cloudinary**.

Muốn **upload ảnh mới từ trang quản trị**, mỗi máy chạy backend cần `CLOUDINARY_URL` trong `backend/.env`. Chủ tài khoản Cloudinary phải cấp khóa qua kênh riêng hoặc cấu hình nó trực tiếp trên máy đó. Không đưa API secret lên Git. Nếu chưa có khóa, các phần còn lại vẫn chạy; ảnh upload mới chỉ được lưu cục bộ trên máy đó.

Chi tiết chuyển ảnh và khôi phục: [backend/docs/cloudinary.md](backend/docs/cloudinary.md).

## Kiểm tra

```powershell
cd backend
.\.venv\Scripts\python.exe -m pytest tests -q
cd ..\frontend
npm test
npm run build
```

Frontend: <http://127.0.0.1:5173> · API: <http://127.0.0.1:8000> · API docs: <http://127.0.0.1:8000/docs>.
