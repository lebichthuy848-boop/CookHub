from datetime import date, datetime

from app import models as m
from app.routers.admin import system_overview, system_reports, users


def test_overview_and_user_list_use_database_rows(setup):
    _, factory = setup
    with factory() as db:
        first = db.get(m.NguoiDung, 'ND001')
        first.ngayTao = datetime(2026, 10, 10, 12, 0)
        db.add(m.NguoiDung(
            maNguoiDung='ND002', hoTen='System', thuDienTu='system@test.local',
            matKhauBam='unused', vaiTro='Quản trị hệ thống', trangThai='Tạm khóa',
            ngayTao=datetime(2026, 10, 11, 12, 0),
        ))
        db.commit()
        overview = system_overview(user=object(), db=db)
        listed = users(user=object(), db=db)

    assert overview['users'] == {'total': 2, 'active': 1, 'locked': 1}
    assert sum(role['count'] for role in overview['roles']) == 2
    assert overview['audit_supported'] is False
    assert overview['recent_activity']['new_recipes'] is None
    assert next(row for row in listed if row['id'] == 'ND002')['created_at'].startswith('2026-10-11')


def test_report_uses_inclusive_dates_and_nonoverlapping_comparison(setup):
    _, factory = setup
    with factory() as db:
        first = db.get(m.NguoiDung, 'ND001')
        first.ngayTao = datetime(2026, 10, 10, 23, 59)
        db.add(m.NguoiDung(
            maNguoiDung='ND002', hoTen='Second', thuDienTu='second@test.local',
            matKhauBam='unused', vaiTro='Người dùng', trangThai='Đang hoạt động',
            ngayTao=datetime(2026, 10, 11, 0, 0),
        ))
        db.commit()
        report = system_reports(from_date=date(2026, 10, 10), to_date=date(2026, 10, 10),
                                user=object(), db=db)

    assert report['kpis']['new_users'] == 1
    assert report['comparison_by_metric']['new_users'] == {
        'current': 1, 'previous': 0, 'change': None,
    }
    assert report['trends']['new_users'] == [{'date': '2026-10-10', 'value': 1}]
