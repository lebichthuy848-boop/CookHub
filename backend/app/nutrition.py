from datetime import date
from sqlalchemy import text
from . import models as m
from .services import require

METRICS = ('nang_luong', 'chat_dam', 'chat_bot_duong', 'chat_beo', 'chat_xo', 'natri')
SQL_COLUMNS = {'nang_luong':'NangLuong','chat_dam':'ChatDam','chat_bot_duong':'ChatBotDuong','chat_beo':'ChatBeo','chat_xo':'ChatXo','natri':'natri'}

def _result(rows):
    totals = {key: 0.0 for key in METRICS}; missing = []
    for row in rows:
        values = dict(row)
        if values.get('ThieuDinhDuong') or values.get('ThieuQuyDoiDinhDuong'):
            missing.append(values.get('MaNguyenLieu') or values.get('MaNguyenLieuGoc') or 'không xác định')
            continue
        for key, column in SQL_COLUMNS.items():
            if values.get(column) is None:
                missing.append(values.get('MaNguyenLieu') or 'không xác định'); break
            totals[key] += float(values[column])
    return {'totals': {key: round(value, 2) for key, value in totals.items()} if not missing else None,
            'complete': not missing, 'missing_ingredients': sorted(set(missing))}

def dish_nutrition(db, dish_id: str, servings: int, used_on: date):
    require(db, m.MonAn, dish_id)
    if db.bind.dialect.name != 'mssql':
        return {'totals': None, 'complete': False, 'missing_ingredients': ['Cần SQL Server để quy đổi đơn vị dinh dưỡng']}
    rows = db.execute(text('SELECT * FROM dbo.FnTinhMonAn(:dish_id,:servings,:used_on,NULL)'),
        {'dish_id': dish_id, 'servings': servings, 'used_on': used_on}).mappings().all()
    return {**_result(rows), 'servings': servings, 'source': 'FnTinhMonAn'}

def menu_nutrition(db, user_id: str, used_on: date):
    plans = db.scalars(__import__('sqlalchemy').select(m.ThucDon).where(
        m.ThucDon.maNguoiDung == user_id, m.ThucDon.ngayBatDau <= used_on, m.ThucDon.ngayKetThuc >= used_on)).all()
    if db.bind.dialect.name != 'mssql':
        calculated = {'totals': None, 'complete': False, 'missing_ingredients': ['Cần SQL Server để quy đổi đơn vị dinh dưỡng']}
    else:
        rows = []
        for plan in plans:
            rows.extend(db.execute(text('SELECT * FROM dbo.FnTinhChiTietThucDon(:plan_id,NULL) WHERE NgayDung=:used_on'), {'plan_id': plan.maThucDon, 'used_on': used_on}).mappings().all())
        calculated = _result(rows)
    target = db.scalar(__import__('sqlalchemy').select(m.MucTieuDinhDuong).where(m.MucTieuDinhDuong.maNguoiDung == user_id))
    goals = {'nang_luong': float(target.nangLuong) if target and target.nangLuong else 2200.0, 'chat_dam': float(target.chatDam) if target and target.chatDam else 100.0, 'chat_bot_duong': float(target.chatBotDuong) if target and target.chatBotDuong else 250.0, 'chat_beo': float(target.chatBeo) if target and target.chatBeo is not None else 70.0, 'chat_xo': float(target.chatXo) if target and target.chatXo is not None else 25.0, 'natri': float(target.natri) if target and target.natri is not None else 2300.0}
    percentages = {key: round(calculated['totals'][key] / goal * 100, 1) if calculated['totals'] and goal else None for key, goal in goals.items()}
    return {**calculated, 'date': used_on, 'goals': goals, 'percentages': percentages, 'source': 'FnTinhChiTietThucDon'}

