"""Check that a fresh checkout can reach the required SQL Server schema."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

try:
    from sqlalchemy import text
    from app.database import engine

    with engine.connect() as connection:
        ready = connection.execute(text("""
            SELECT CASE WHEN OBJECT_ID(N'dbo.MonAn', N'U') IS NOT NULL
                         AND OBJECT_ID(N'dbo.BoSuuTapYeuThich', N'U') IS NOT NULL
                         AND OBJECT_ID(N'dbo.ThongTinDinhDuong', N'U') IS NOT NULL
                         AND OBJECT_ID(N'dbo.QuyDoiDonViNguyenLieu', N'U') IS NOT NULL
                        THEN 1 ELSE 0 END
        """)).scalar()
    if ready != 1:
        raise RuntimeError('Thiếu bảng CookHub cần thiết.')
    with engine.connect() as connection:
        dishes = connection.execute(text("SELECT COUNT(*) FROM dbo.MonAn")).scalar()
        nutrition = connection.execute(text("SELECT COUNT(*) FROM dbo.ThongTinDinhDuong")).scalar()
        conversions = connection.execute(text("SELECT COUNT(*) FROM dbo.QuyDoiDonViNguyenLieu")).scalar()
    if dishes < 67 or nutrition < 107 or conversions < 31:
        raise RuntimeError('Thiếu dữ liệu của QuanLyThucDon.sql.')
except Exception:
    print('Database CookHub chưa hoàn chỉnh. Kiểm tra DATABASE_URL và chạy QuanLyThucDon.sql trên database mới.', file=sys.stderr)
    raise SystemExit(1)

print('Database CookHub: OK')
