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
                        THEN 1 ELSE 0 END
        """)).scalar()
    if ready != 1:
        raise RuntimeError('Thiếu bảng MonAn hoặc BoSuuTapYeuThich.')
except Exception:
    print('Không kết nối được database CookHub hoặc thiếu schema. Kiểm tra DATABASE_URL; tạo database từ QuanLyThucDon.sql rồi chạy Bo-sung.sql.', file=sys.stderr)
    raise SystemExit(1)

print('Database CookHub: OK')
