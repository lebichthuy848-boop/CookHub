# Cài đặt và vận hành CookHub

Ứng dụng gồm FastAPI, React và MySQL. Không có runtime PHP, không cần Apache.

## Backend — Windows

Tại thư mục gốc:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python -m pip install -r requirements.lock.txt
# Chỉ tạo .env nếu chưa có, không ghi đè cấu hình đang dùng:
if (-not (Test-Path .env)) { Copy-Item .env.example .env }
.\.venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

## Backend — Linux/macOS

```bash
cd backend
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.lock.txt
test -f .env || cp .env.example .env
.venv/bin/python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Yêu cầu Python 3.10+. Trên máy hiện tại môi trường đã được cài.

## Cấu hình database

Tất cả thông tin kết nối được nạp từ `backend/.env` hoặc biến môi trường `DATABASE_URL`.
Không có fallback thông tin tài khoản trong code Python và không đọc file PHP.

Ví dụ cho XAMPP với tài khoản root, mật khẩu trống:

```dotenv
DATABASE_URL=mysql+pymysql://root:@127.0.0.1:3306/KLCN_QuanLyThucDon?charset=utf8mb4
CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173"]
COOKIE_SECURE=false
FRONTEND_URL=http://127.0.0.1:5173
```

Nếu mật khẩu có ký tự đặc biệt, percent-encode phần username/password của URL.
Không commit `.env`. Biến môi trường hệ điều hành được ưu tiên hơn file.
Thiếu DATABASE_URL sẽ báo lỗi cấu hình ngay lúc khởi động.

**MySQL hiện tại đã sẵn sàng:** không import hoặc chạy lại migration để dọn PHP.
Quá trình dọn PHP chỉ đổi file/thư mục, không thay đổi database.

**Máy mới:** tạo database từ `backend/database/KLCN_QuanLyThucDon_MySQL_Full.sql`
chỉ khi database mới/trống. SQL này có DROP TABLE nên không import vào database cần giữ.
Sau khi sao lưu database cần migrate, tại backend:

```powershell
.\.venv\Scripts\python -m app.migrate
.\.venv\Scripts\python -m app.migrate --apply
```

Trên Linux thay executable bằng `.venv/bin/python`.
Migration thêm bảng xác thực/hiển thị nếu thiếu và unique index tiền tố email 191 ký tự
để tương thích InnoDB cũ; hai email có cùng tiền tố 191 ký tự bị xem là trùng.
Dữ liệu nghiệp vụ không được import lại khi chạy API.
Bản sao lưu trước migration nằm ở `backend/backups/before-python-migration.sql`.

## Frontend — terminal riêng

Cần Node.js 22 LTS:

```bash
cd frontend
npm ci
npm run dev -- --port 5173 --strictPort
```

Trên Windows máy hiện tại, `frontend/start.ps1` tự tìm Node portable tại
`frontend/.tools/node-v22.16.0-win-x64`.
Nếu chạy lệnh trực tiếp khi npm chưa có trong PATH, tại frontend:

```powershell
$env:PATH = (Resolve-Path .tools/node-v22.16.0-win-x64).Path + ';' + $env:PATH
npm run dev -- --port 5173 --strictPort
```

Mở http://127.0.0.1:5173. Vite proxy `/api`, `/images`, `/media` sang Python cổng 8000.
Cookie HttpOnly lưu phiên; không lưu token vào localStorage.

Tài khoản mẫu (nếu chưa đổi):
- minhanh@example.com / 123456 — người dùng.
- content@thucdon.local / 123456 — quản trị nội dung.
- admin@thucdon.local / 123456 — quản trị hệ thống.

## Assets và cấu trúc

Ảnh nằm tại `backend/media/images/`, video tại `backend/media/videos/`.
URL và giá trị lưu trong MySQL giữ nguyên. Phải triển khai cả `backend/media/` cùng ứng dụng.
Ảnh thiết kế không dùng lúc chạy nằm tại `frontend/design/references/`.
Script sinh model chỉ đọc SQL trong `backend/database/`; không cần PHP.

Các file `.htaccess` còn lại chỉ chặn Apache truy cập cấu hình/bản sao lưu khi dự án vẫn
nằm dưới htdocs; chúng không phải code PHP và không được Python/React dùng để vận hành.

## Email và phạm vi chức năng

Điền SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, SMTP_STARTTLS trong .env
để bật khôi phục mật khẩu. Chưa cấu hình thì API trả 503 và không giả báo gửi thành công.
Đổi mật khẩu hoạt động độc lập với SMTP.

Các phần PHP cũ chỉ là demo như avatar, thông báo, dị ứng và biểu đồ dinh dưỡng không được
giả lập thành nghiệp vụ thật. Ngân sách/chế độ ăn hiện được đọc từ DB, chưa có màn hình sửa.
Các chức năng món ăn/công thức/video, tìm kiếm, gợi ý, yêu thích, đánh giá, nguyên liệu,
thực đơn, hồ sơ, phân quyền và thống kê dùng API thật.

## Production

`npm run build` tạo `frontend/dist/`.
Web server phục vụ dist, fallback các route React về index.html và proxy
`/api`, `/images`, `/media` tới FastAPI. Không proxy `/videos` vì đó là trang React.
Dùng HTTPS, COOKIE_SECURE=true, CORS đúng domain và FRONTEND_URL thực tế.
Không dùng Vite dev server cho production. Không phục vụ thư mục gốc dự án công khai.

Rate limiter hiện theo process; nhiều worker cần kho chung hoặc giới hạn ở reverse proxy.
Catalog hiện đọc toàn bộ danh sách; bổ sung phân trang khi dữ liệu lớn.
File upload mồ côi chưa được tự động xóa.

## Tài liệu

- [FastAPI](https://fastapi.tiangolo.com/)
- [SQLAlchemy ORM](https://docs.sqlalchemy.org/en/20/orm/quickstart.html)
- [Vite](https://vite.dev/guide/)

