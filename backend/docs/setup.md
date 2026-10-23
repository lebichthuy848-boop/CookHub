# Cài đặt CookHub

Xem [README ở thư mục gốc](../../README.md) để cài Python, Node.js, SQL Server 2022, chạy `QuanLyThucDon.sql` rồi `Bo-sung.sql`, tạo `backend/.env` và khởi động hai server.

Project hiện dùng SQL Server. Các hướng dẫn MySQL/XAMPP trong bản tài liệu cũ không áp dụng cho nhánh này.

`backend/.env` giữ `DATABASE_URL`, và nếu cần upload ảnh mới thì thêm `CLOUDINARY_URL`. Không commit file này. Ảnh đã chuyển lên Cloudinary được ánh xạ trong hai file JSON của backend và frontend; xem [hướng dẫn Cloudinary](cloudinary.md).
