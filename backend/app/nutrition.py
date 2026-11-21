from datetime import date
from sqlalchemy import text
from . import models as m
from .services import require

METRICS = ('nang_luong', 'chat_dam', 'chat_bot_duong', 'chat_beo', 'chat_xo', 'natri')
SQL_COLUMNS = {'nang_luong':'NangLuong','chat_dam':'ChatDam','chat_bot_duong':'ChatBotDuong','chat_beo':'ChatBeo','chat_xo':'ChatXo','natri':'natri'}

def _value(values, key):
    if key in values:
        return values[key]
    target = key.casefold()
    return next((value for name, value in values.items() if str(name).casefold() == target), None)

def _is_unspecified_unit(values):
    unit = _value(values, 'DonViTinhKyHieu')
    normalized = ' '.join(str(unit or '').casefold().split())
    return normalized in {'ít', '1 ít'}


def _result(rows, ingredient_names=None):
    ingredient_names = ingredient_names or {}
    totals = {key: 0.0 for key in METRICS}; missing = []; partial = []
    processing_issues = []
    breakdown = []
    for row in rows:
        values = dict(row)
        if _value(values, 'ThieuLuongAnDuoc'):
            ingredient_id = _value(values, 'MaNguyenLieu') or _value(values, 'MaNguyenLieuGoc')
            name = ingredient_names.get(ingredient_id, ingredient_id or 'không xác định')
            missing.append(name)
            issue = {
                'ingredient_id': ingredient_id,
                'name': name,
                'reason': _value(values, 'LyDoLuongAnDuoc') or 'Chưa xác định lượng thực sự ăn vào.',
                'source': _value(values, 'NguonLuongAnDuoc'),
            }
            if issue not in processing_issues:
                processing_issues.append(issue)
            # Prepared frying oil/bones are not proven intake. Even a legacy
            # caller supplying numeric values must not turn them into a total.
            continue
        # Older SQL functions mark conversion as missing when kcal is NULL,
        # even though other nutrients were successfully calculated.
        has_known_nutrients = any(_value(values, column) is not None for column in SQL_COLUMNS.values())
        if not has_known_nutrients and (_value(values, 'ThieuDinhDuong') or _value(values, 'ThieuQuyDoiDinhDuong')):
            ingredient_id = _value(values, 'MaNguyenLieu') or _value(values, 'MaNguyenLieuGoc')
            # Lượng tùy ý vẫn hiện trong công thức, nhưng không gây cảnh báo thiếu.
            if not _is_unspecified_unit(values):
                missing.append(ingredient_names.get(ingredient_id, ingredient_id or 'không xác định'))
            continue
        row_missing = False
        for key, column in SQL_COLUMNS.items():
            value = _value(values, column)
            if value is None:
                row_missing = True
                continue
            totals[key] += float(value)
        if row_missing and not _is_unspecified_unit(values):
            ingredient_id = _value(values, 'MaNguyenLieu')
            partial.append(ingredient_names.get(ingredient_id, ingredient_id or 'không xác định'))
        if _value(values, 'NangLuong') is not None:
            breakdown.append({
                'ingredient_id': _value(values, 'MaNguyenLieu'),
                'nang_luong': round(float(_value(values, 'NangLuong') or 0), 2),
            })
    return {'totals': {key: round(value, 2) for key, value in totals.items()},
            # Không cảnh báo các dòng thiếu có đơn vị ít/1 ít; đơn vị khác giữ nguyên.
            'complete': not missing and not partial,
            'missing_ingredients': sorted(set(missing)),
            'partial_ingredients': sorted(set(partial)),
            'processing_issues': processing_issues,
            'breakdown': breakdown}

def _dish_profile(rows):
    """A candidate is usable only when every tracked nutrient is known."""
    result=_result(rows)
    totals=dict(result['totals'])
    for key,column in SQL_COLUMNS.items():
        if any(_value(dict(row),'ThieuLuongAnDuoc') or _value(dict(row),column) is None for row in rows):
            totals[key]=None
    return totals

def _dish_profile_with_coverage(rows):
    """Return known nutrient sums plus the metrics that still have unknown inputs."""
    rows=list(rows)
    result=_result(rows)
    missing=set()
    processing_issues=[]
    for row in rows:
        values=dict(row)
        if _value(values,'ThieuLuongAnDuoc'):
            missing.update(METRICS)
            issue=_value(values,'LyDoLuongAnDuoc') or 'Chưa xác định lượng thực sự ăn vào.'
            if issue not in processing_issues:
                processing_issues.append(issue)
            continue
        unspecified=_is_unspecified_unit(values)
        has_known=any(_value(values,column) is not None for column in SQL_COLUMNS.values())
        if not has_known and (_value(values,'ThieuDinhDuong') or _value(values,'ThieuQuyDoiDinhDuong')):
            if not unspecified:
                missing.update(METRICS)
            continue
        for key,column in SQL_COLUMNS.items():
            if _value(values,column) is None and not unspecified:
                missing.add(key)
    return {**result['totals'],'missing_metrics':sorted(missing),
            'complete':not missing,'processing_issues':processing_issues}

def dish_nutrition(db, dish_id: str, servings: int, used_on: date):
    require(db, m.MonAn, dish_id)
    if db.bind.dialect.name != 'mssql':
        return {'totals': None, 'complete': False, 'missing_ingredients': ['Cần SQL Server để quy đổi đơn vị dinh dưỡng']}
    rows = db.execute(text('SELECT f.*, dv.KyHieu AS DonViTinhKyHieu FROM dbo.FnTinhMonAn(:dish_id,:servings,:used_on,NULL) f LEFT JOIN dbo.DonViTinh dv ON dv.MaDonVi=f.MaDonVi'),
        {'dish_id': dish_id, 'servings': servings, 'used_on': used_on}).mappings().all()
    ingredient_names = {x.maNguyenLieu: x.tenNguyenLieu for x in rows_for_ingredients(db, rows)}
    return {**_result(rows, ingredient_names), 'servings': servings, 'source': 'FnTinhMonAn'}

def rows_for_ingredients(db, nutrition_rows):
    ids = {dict(row).get('MaNguyenLieu') or dict(row).get('MaNguyenLieuGoc') for row in nutrition_rows}
    ids.discard(None)
    return db.scalars(__import__('sqlalchemy').select(m.NguyenLieu).where(m.NguyenLieu.maNguyenLieu.in_(ids))).all()

def menu_nutrition(db, user_id: str, used_on: date):
    plans = db.scalars(__import__('sqlalchemy').select(m.ThucDon).where(
        m.ThucDon.maNguoiDung == user_id, m.ThucDon.ngayBatDau <= used_on, m.ThucDon.ngayKetThuc >= used_on)).all()
    raw_rows = None
    ingredient_names = {}
    if db.bind.dialect.name != 'mssql':
        calculated = {'totals': None, 'complete': False, 'missing_ingredients': ['Cần SQL Server để quy đổi đơn vị dinh dưỡng']}
    else:
        rows = []
        for plan in plans:
            rows.extend(db.execute(text('SELECT f.*, dv.KyHieu AS DonViTinhKyHieu FROM dbo.FnTinhChiTietThucDon(:plan_id,NULL) f LEFT JOIN dbo.DonViTinh dv ON dv.MaDonVi=f.MaDonVi WHERE f.NgayDung=:used_on'), {'plan_id': plan.maThucDon, 'used_on': used_on}).mappings().all())
        raw_rows = rows
        ingredient_names = {x.maNguyenLieu: x.tenNguyenLieu for x in rows_for_ingredients(db, rows)}
        calculated = _result(rows, ingredient_names)
    target = db.scalar(__import__('sqlalchemy').select(m.MucTieuDinhDuong).where(m.MucTieuDinhDuong.maNguoiDung == user_id))
    goals = {'nang_luong': float(target.nangLuong) if target and target.nangLuong else 2200.0, 'chat_dam': float(target.chatDam) if target and target.chatDam else 100.0, 'chat_bot_duong': float(target.chatBotDuong) if target and target.chatBotDuong else 250.0, 'chat_beo': float(target.chatBeo) if target and target.chatBeo is not None else 70.0, 'chat_xo': float(target.chatXo) if target and target.chatXo is not None else 25.0, 'natri': float(target.natri) if target and target.natri is not None else 2300.0}
    percentages = {key: round(calculated['totals'][key] / goal * 100, 1) if calculated['totals'] and goal else None for key, goal in goals.items()}
    from .household import read_state, distribution
    state = read_state(db, user_id)[2]
    items = db.scalars(__import__('sqlalchemy').select(m.ChiTietThucDon).where(
        m.ChiTietThucDon.maThucDon.in_([p.maThucDon for p in plans]),
        m.ChiTietThucDon.ngayDung == used_on)).all() if state.get('members') else []
    household = distribution(state, used_on, items, raw_rows, ingredient_names)
    rows_by_item = {}
    for row in raw_rows or []:
        item_id = _value(row, 'MaChiTiet')
        if item_id:
            rows_by_item.setdefault(item_id.strip(), []).append(row)
    item_totals = {item_id: _dish_profile_with_coverage(rows) for item_id, rows in rows_by_item.items()}
    return {**calculated, 'date': used_on, 'goals': goals, 'percentages': percentages,
            'household': household, 'item_totals': item_totals, 'source': 'FnTinhChiTietThucDon'}

