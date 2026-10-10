"""Read-only SQL Server V2 integration checks.

Run with: python -m pytest tests/test_real_db.py -q --real-db
"""
import re
import pytest
from sqlalchemy import text

pytestmark = pytest.mark.usefixtures("real_db")

V2_TABLES = {
    "NguoiDung", "KhauVi", "CheDoAn", "SoThichKhauVi", "CheDoAnNguoiDung",
    "NganSachAnUong", "MucTieuDinhDuong", "DonViTinh", "NguyenLieu",
    "QuyDoiDonViNguyenLieu", "NguyenLieuThayThe", "NguyenLieuHienCo",
    "GiaNguyenLieu", "ThongTinDinhDuong", "DanhMucMonAn", "MonAn",
    "KhauViMonAn", "CheDoAnMonAn", "MonYeuThich", "CongThuc",
    "ThanhPhanCongThuc", "BuocCheBien", "DoanPhimHuongDan", "ThucDon",
    "ChiTietThucDon", "DanhGiaMonAn", "MonKhongThich",
    "DanhGiaDinhDuongThucDon", "TuyBienNguyenLieuThucDon", "PhanHoiCheBien",
}

def test_sql_server_v2_schema(real_db):
    assert real_db.execute(text("SELECT CAST(DATABASEPROPERTYEX(DB_NAME(), 'Version') AS INT)")).scalar() is not None
    compatibility = real_db.execute(text("SELECT compatibility_level FROM sys.databases WHERE name=DB_NAME()" )).scalar_one()
    assert compatibility == 160
    tables = set(real_db.execute(text("SELECT name FROM sys.tables WHERE schema_id=SCHEMA_ID('dbo')")).scalars())
    assert V2_TABLES <= tables

def test_v2_programmable_objects_exist(real_db):
    procedures = set(real_db.execute(text("SELECT name FROM sys.procedures WHERE schema_id=SCHEMA_ID('dbo')")).scalars())
    functions = set(real_db.execute(text("SELECT name FROM sys.objects WHERE schema_id=SCHEMA_ID('dbo') AND type IN ('FN','IF','TF')")).scalars())
    triggers = set(real_db.execute(text("SELECT name FROM sys.triggers WHERE parent_class_desc='OBJECT_OR_COLUMN'")).scalars())
    assert "SpKiemTraNguoiDungHoatDong" in procedures
    assert "SpTimKiemMonAn" in procedures
    assert functions
    assert triggers

def test_passwords_roles_and_statuses_match_v2(real_db):
    rows = real_db.execute(text("SELECT MatKhauBam,VaiTro,TrangThai FROM dbo.NguoiDung")).all()
    bcrypt = re.compile(r"^\$2[aby]\$(0[4-9]|[12][0-9]|3[01])\$[./A-Za-z0-9]{53}$")
    for password_hash, role, status in rows:
        assert bcrypt.fullmatch(password_hash)
        assert role in {"Người dùng", "Quản trị viên"}
        assert status in {"Đang hoạt động", "Tạm khóa"}

def test_nutrition_json_is_valid(real_db):
    invalid = real_db.execute(text("""
        SELECT COUNT(*) FROM dbo.DanhGiaDinhDuongThucDon
        WHERE ISJSON(DuLieuTinhJson, ARRAY)<>1 OR ISJSON(DoiChieuJson, OBJECT)<>1
    """)).scalar_one()
    assert invalid == 0

def test_personalization_schema_and_ranking(real_db):
    from app import models as m
    from app.personalization import rank_dishes
    from sqlalchemy import select
    assert real_db.execute(text("SELECT OBJECT_ID(N'dbo.UserPreferences', N'U')")).scalar_one() is not None
    columns = real_db.execute(text("SELECT name FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.UserPreferences')")).scalars().all()
    assert set(columns) == {'user_id', 'answers', 'completed', 'survey_shown'}
    user_id = real_db.scalar(select(m.NguoiDung.maNguoiDung))
    answers = {'ingredients':['chicken'],'occasions':['family'],'tastes':['light'],'time':'medium','tools':['stove']}
    result = rank_dishes(real_db, user_id, answers)
    assert all(0 <= dish['match_percent'] <= 100 for dish in result)
    assert [dish['match_percent'] for dish in result] == sorted([dish['match_percent'] for dish in result], reverse=True)
