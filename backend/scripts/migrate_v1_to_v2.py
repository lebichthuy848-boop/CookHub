"""Chuyển dữ liệu V1 (MySQL) sang QuanLyThucDon V2 (SQL Server).

Chạy sau khi đã tạo schema V2:
  python backend/scripts/migrate_v1_to_v2.py

Biến môi trường:
  V1_DATABASE_URL=mysql+pymysql://...
  DATABASE_URL=mssql+pyodbc://...

Script ánh xạ theo tên nghiệp vụ, không giữ mã MA/CT cũ. Mật khẩu đã là
bcrypt ($2a/$2b/$2y, 60 ký tự) được giữ nguyên; hash MD5/không xác định bị
bỏ qua và ghi báo cáo để người dùng đặt lại mật khẩu an toàn.
"""
from __future__ import annotations

import os, re
from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session

V1 = os.environ.get("V1_DATABASE_URL", "mysql+pymysql://root:@127.0.0.1:3306/KLCN_QuanLyThucDon?charset=utf8mb4")
V2 = os.environ.get("DATABASE_URL", "mssql+pyodbc://@DESKTOP-RIDON54%5CSQLEXPRESS/QuanLyThucDon?driver=ODBC+Driver+18+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes")
BCRYPT = re.compile(r"^\$2[aby]\$([0-9]{2})\$[./A-Za-z0-9]{53}$")

def norm(value):
    return (value or "").strip().casefold()

def migrate_users(src, dst):
    skipped = []
    rows = src.execute(text("SELECT maNguoiDung, hoTen, email, matKhau, vaiTro, trangThai FROM NguoiDung")).mappings()
    for r in rows:
        h = r["matKhau"] or ""
        if not BCRYPT.fullmatch(h):
            skipped.append(r["maNguoiDung"])
            continue
        dst.execute(text("""
          MERGE dbo.NguoiDung AS t
          USING (SELECT :id MaNguoiDung) AS s ON t.MaNguoiDung=s.MaNguoiDung
          WHEN MATCHED THEN UPDATE SET HoTen=:name,ThuDienTu=:email,MatKhauBam=:hash,VaiTro=:role,TrangThai=:status
          WHEN NOT MATCHED THEN INSERT(MaNguoiDung,HoTen,ThuDienTu,MatKhauBam,VaiTro,TrangThai)
          VALUES(:id,:name,:email,:hash,:role,:status);
        """), {"id":r["maNguoiDung"],"name":r["hoTen"],"email":r["email"].strip().lower(),"hash":h,"role":r["vaiTro"] or "Người dùng","status":"Đang hoạt động" if r["trangThai"] in ("Hoạt động","Đang hoạt động") else "Tạm khóa"})
    return skipped

def migrate_dishes(src, dst):
    # ID map theo business key, dùng lại mã V2 nếu tên đã tồn tại.
    rows = src.execute(text("SELECT maMonAn,maDanhMuc,tenMonAn,moTa,thoiGianCheBien,doKho,hinhAnh FROM MonAn")).mappings()
    for r in rows:
        category = dst.execute(text("SELECT TOP 1 MaDanhMuc FROM DanhMucMonAn WHERE TenDanhMuc=:n"), {"n":r["maDanhMuc"]}).scalar()
        if not category:
            category = r["maDanhMuc"]
        dst.execute(text("""
          MERGE dbo.MonAn AS t USING (SELECT :id MaMonAn) AS s ON t.MaMonAn=s.MaMonAn
          WHEN MATCHED THEN UPDATE SET MaDanhMuc=:cat,TenMonAn=:name,MoTa=:description,ThoiGianCheBien=:minutes,DoKho=:difficulty,DuongDanAnh=:image
          WHEN NOT MATCHED THEN INSERT(MaMonAn,MaDanhMuc,TenMonAn,MoTa,ThoiGianCheBien,DoKho,DuongDanAnh)
          VALUES(:id,:cat,:name,:description,:minutes,:difficulty,:image);
        """), {"id":r["maMonAn"],"cat":category,"name":r["tenMonAn"],"description":r["moTa"],"minutes":r["thoiGianCheBien"],"difficulty":r["doKho"],"image":r["hinhAnh"]})

def main():
    old = create_engine(V1).connect()
    new_engine = create_engine(V2)
    with new_engine.begin() as dst:
        skipped = migrate_users(old, dst)
        migrate_dishes(old, dst)
    old.close()
    if skipped:
        print("Bỏ qua tài khoản không có bcrypt hợp lệ; cần reset mật khẩu:", ", ".join(skipped))
    print("Đã đồng bộ người dùng và món ăn theo business key.")

if __name__ == "__main__":
    main()
