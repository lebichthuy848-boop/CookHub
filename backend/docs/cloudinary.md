# Ảnh CookHub trên Cloudinary

- Khai báo `CLOUDINARY_URL` trong `backend/.env` theo mẫu `backend/.env.example`. Không commit file `.env`.
- 188 ảnh cũ được ánh xạ trong `backend/app/cloudinary_images.json` và `frontend/src/cloudinary-images.json`. Giữ hai file này trong Git khi chia sẻ project.
- `MonAn.DuongDanAnh` của 60 món lưu URL Cloudinary. Bản sao đường dẫn trước khi đổi nằm trong `backend/backups/cloudinary-image-paths-*.json` trên máy đã chạy chuyển đổi.
- Ảnh quản trị mới được backend upload lên Cloudinary. Video vẫn theo cơ chế cũ.

Khi cần thêm ảnh cũ hoặc chạy lại chuyển đổi:

```powershell
cd D:\KLCN\backend
.\.venv\Scripts\python.exe scripts\migrate_images_to_cloudinary.py --upload --verify
.\.venv\Scripts\python.exe scripts\migrate_images_to_cloudinary.py --apply-db
```

Script upload có thể chạy tiếp sau khi bị ngắt và không xóa ảnh cục bộ. Khởi động lại backend sau khi thay manifest. Nếu muốn hoàn tác, dùng bản sao đường dẫn trong `backend/backups` để cập nhật lại `MonAn.DuongDanAnh` và khôi phục ảnh từ Git. Việc bỏ ảnh khỏi commit hiện tại không xóa ảnh khỏi các commit Git cũ; muốn giảm dung lượng clone lịch sử cần xử lý lịch sử Git riêng.
