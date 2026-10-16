from datetime import datetime, date, timedelta
import logging
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy import text, cast
from sqlalchemy import Date as SQLDate
from sqlalchemy import select, delete, func
from sqlalchemy.orm import Session
from .. import models as m, schemas as s
from ..database import get_db
from ..security import content_user, system_user, dish_editor, review_moderator, roles, public_user, passwords
from ..services import (require, rows, new_id, allocate_code, dish_data, recipe_data, save_recipe,
                        delete_recipe, delete_dish, validate_media)
from .auth import by_email

router = APIRouter(prefix='/admin', tags=['Administration'])
logger = logging.getLogger(__name__)

@router.get('/system-health')
def system_health(user=Depends(system_user), db: Session = Depends(get_db)):
    checked_at = datetime.now().isoformat(timespec='seconds')
    try:
        db.execute(text('SELECT 1'))
        return {'backend': 'Hoạt động', 'database': 'Kết nối thành công', 'checked_at': checked_at}
    except SQLAlchemyError:
        return {'backend': 'Hoạt động', 'database': 'Kết nối thất bại', 'checked_at': checked_at}

@router.get('/dishes')
def admin_dishes(user=Depends(roles('Quản trị nội dung', 'Quản trị hệ thống')), db: Session = Depends(get_db)):
    categories = {row.maDanhMuc: row.tenDanhMuc for row in rows(db, m.DanhMucMonAn)}
    return [dict(id=row.maMonAn, name=row.tenMonAn, category_id=row.maDanhMuc,
                 category=categories.get(row.maDanhMuc, ''), description=row.moTa or '',
                 time=row.thoiGianCheBien or 0, image=row.duongDanAnh or '')
            for row in rows(db, m.MonAn)]

@router.get('/categories')
def admin_categories(user=Depends(roles('Quản trị nội dung', 'Quản trị hệ thống')), db: Session = Depends(get_db)):
    """Return every category row for the management screen, including rows
    that are not currently referenced by a dish.
    """
    return [dict(id=row.maDanhMuc, name=row.tenDanhMuc,
                 description=row.moTa or '')
            for row in db.scalars(select(m.DanhMucMonAn).order_by(m.DanhMucMonAn.maDanhMuc))]

@router.get('/stats')
def stats(user=Depends(roles('Quản trị nội dung', 'Quản trị hệ thống')), db: Session = Depends(get_db)):
    tables = {'users':m.NguoiDung,'categories':m.DanhMucMonAn,'dishes':m.MonAn,
              'recipes':m.CongThuc,'videos':m.DoanPhimHuongDan,'reviews':m.DanhGiaMonAn,'menus':m.ThucDon}
    counts = {name: db.scalar(select(func.count()).select_from(model)) for name, model in tables.items()}
    counts['roles'] = [dict(role=role, total=total) for role, total in db.execute(
        select(m.NguoiDung.vaiTro, func.count()).group_by(m.NguoiDung.vaiTro))]
    favorite_dishes = sorted(
        (dish for dish in dish_data(db) if dish['favorite_count'] > 0),
        key=lambda dish: (-dish['favorite_count'], dish['name'])
    )
    counts['favorite_dishes'] = favorite_dishes
    counts['favorite_dish_count'] = len(favorite_dishes)
    counts['top_dishes'] = favorite_dishes[:5]
    return counts

@router.get('/system-overview')
def system_overview(user=Depends(system_user), db: Session = Depends(get_db)):
    users = list(db.scalars(select(m.NguoiDung)))
    role_names = ['Người dùng', 'Quản trị nội dung', 'Quản trị hệ thống']
    roles_data = [{'name': role, 'count': sum(1 for row in users if row.vaiTro == role)} for role in role_names]
    status_data = [{'name': 'Đang hoạt động', 'count': sum(1 for row in users if row.trangThai == 'Đang hoạt động')},
                   {'name': 'Tạm khóa', 'count': sum(1 for row in users if row.trangThai == 'Tạm khóa')}]
    locked = [{'id': row.maNguoiDung, 'name': row.hoTen, 'email': row.thuDienTu, 'role': row.vaiTro, 'status': row.trangThai}
              for row in users if row.trangThai == 'Tạm khóa'][:5]
    return {'users': {'total': len(users), 'active': status_data[0]['count'], 'locked': status_data[1]['count']},
            'roles': roles_data, 'content': {'dishes': db.scalar(select(func.count()).select_from(m.MonAn)) or 0},
            'meal_plans': db.scalar(select(func.count()).select_from(m.ThucDon)) or 0,
            'planned_items': db.scalar(select(func.count()).select_from(m.ChiTietThucDon)) or 0,
            'locked_users': locked}

@router.get('/system-reports')
def system_reports(from_date: date | None = Query(None), to_date: date | None = Query(None),
                   user=Depends(system_user), db: Session = Depends(get_db)):
    """Operational reporting based only on planned menu rows in the selected period."""
    if from_date and to_date and from_date > to_date:
        raise HTTPException(422, 'Ngày bắt đầu không được lớn hơn ngày kết thúc.')
    end = to_date or date.today()
    start = from_date or (end - timedelta(days=29))
    item_filter = [m.ChiTietThucDon.ngayDung >= start, m.ChiTietThucDon.ngayDung <= end]
    period_days = (end - start).days + 1
    previous_start, previous_end = start - timedelta(days=period_days), start - timedelta(days=1)
    rows_items = db.execute(select(m.ChiTietThucDon, m.MonAn.tenMonAn).join(
        m.MonAn, m.MonAn.maMonAn == m.ChiTietThucDon.maMonAn).where(*item_filter)).all()
    previous_count = db.scalar(select(func.count()).select_from(m.ChiTietThucDon).where(
        m.ChiTietThucDon.ngayDung >= previous_start, m.ChiTietThucDon.ngayDung <= previous_end)) or 0
    favorite_count = db.scalar(select(func.count()).select_from(m.MonYeuThich).where(
        m.MonYeuThich.ngayThem >= start, m.MonYeuThich.ngayThem <= end)) or 0
    new_users = db.scalar(select(func.count()).select_from(m.NguoiDung).where(
        m.NguoiDung.ngayTao >= start, m.NguoiDung.ngayTao < end + timedelta(days=1))) or 0
    new_menus = db.scalar(select(func.count()).select_from(m.ThucDon).where(
        m.ThucDon.ngayTao >= start, m.ThucDon.ngayTao < end + timedelta(days=1))) or 0
    def daily_counts(model, column):
        result = db.execute(select(cast(column, SQLDate), func.count()).where(
            column >= start, column < end + timedelta(days=1)).group_by(
                cast(column, SQLDate))).all()
        return {day.isoformat(): count for day, count in result if day}
    user_trend = daily_counts(m.NguoiDung, m.NguoiDung.ngayTao)
    menu_trend = daily_counts(m.ThucDon, m.ThucDon.ngayTao)
    favorite_trend = daily_counts(m.MonYeuThich, m.MonYeuThich.ngayThem)
    calendar = [(start + timedelta(days=offset)).isoformat() for offset in range(period_days)]
    top = {}
    trend = {}
    for item, name in rows_items:
        key = item.maMonAn
        entry = top.setdefault(key, {'id': key, 'name': name or key, 'selections': 0, 'servings': 0})
        entry['selections'] += 1
        entry['servings'] += int(item.soKhauPhan or 0)
        day = item.ngayDung.isoformat() if item.ngayDung else None
        if day: trend[day] = trend.get(day, 0) + 1
    ingredients = {}
    ingredient_rows = db.execute(select(m.ThanhPhanCongThuc, m.NguyenLieu.tenNguyenLieu,
                                        m.DonViTinh.tenDonVi).join(
        m.CongThuc, m.CongThuc.maCongThuc == m.ThanhPhanCongThuc.maCongThuc).join(
        m.ChiTietThucDon, m.ChiTietThucDon.maMonAn == m.CongThuc.maMonAn).join(
        m.NguyenLieu, m.NguyenLieu.maNguyenLieu == m.ThanhPhanCongThuc.maNguyenLieu).join(
        m.DonViTinh, m.DonViTinh.maDonVi == m.ThanhPhanCongThuc.maDonVi).where(*item_filter)).all()
    for part, name, unit in ingredient_rows:
        key = part.maNguyenLieu
        row = ingredients.setdefault(key, {'id': key, 'name': name or key, 'unit': unit or '', 'quantity': 0})
        row['quantity'] += float(part.soLuong or 0)
    total_servings = sum(row['servings'] for row in top.values())
    taste_counts = {}
    taste_rows = db.execute(select(m.KhauVi.maKhauVi, m.KhauVi.tenKhauVi).join(
        m.KhauViMonAn, m.KhauViMonAn.maKhauVi == m.KhauVi.maKhauVi).join(
        m.ChiTietThucDon, m.ChiTietThucDon.maMonAn == m.KhauViMonAn.maMonAn).where(*item_filter)).all()
    for taste_id, taste_name in taste_rows:
        key = taste_id
        taste_counts[key] = {'id': key, 'name': taste_name or key, 'selections': taste_counts.get(key, {}).get('selections', 0) + 1}
    change = None if previous_count == 0 else round((len(rows_items) - previous_count) / previous_count * 100, 1)
    return {'period': {'from': start.isoformat(), 'to': end.isoformat()},
            'kpis': {'planned_items': len(rows_items), 'selections': len(rows_items),
                     'planned_servings': total_servings, 'new_users': new_users,
                     'new_menus': new_menus, 'favorite_saves': favorite_count},
            'kpi_sources': {'new_users': 'NguoiDung.NgayTao trong kỳ.',
                           'new_menus': 'ThucDon.NgayTao trong kỳ.',
                           'favorite_saves': 'MonYeuThich.NgayThem'},
            'trends': {
                'new_users': [{'date': day, 'value': user_trend.get(day, 0)} for day in calendar],
                'new_menus': [{'date': day, 'value': menu_trend.get(day, 0)} for day in calendar],
                'favorite_saves': [{'date': day, 'value': favorite_trend.get(day, 0)} for day in calendar],
            },
            'comparison': {'current': len(rows_items), 'previous': previous_count, 'change': change},
            'active_days': len(trend),
            'trend': [{'date': (start + timedelta(days=offset)).isoformat(),
                       'selections': trend.get((start + timedelta(days=offset)).isoformat(), 0)}
                      for offset in range(period_days)],
            'top_dishes': sorted(top.values(), key=lambda x: (-x['selections'], x['name']))[:10],
            'ingredients': sorted(ingredients.values(), key=lambda x: -x['quantity'])[:10],
            'taste': sorted(taste_counts.values(), key=lambda x: (-x['selections'], x['name']))}

@router.post('/categories', status_code=201)
def create_category(data: s.Category, user=Depends(content_user), db: Session = Depends(get_db)):
    # Reuse an existing row with the same name so a category that was
    # previously removed from the UI can be added again without a duplicate
    # constraint error from the database.
    name = data.name.strip()
    existing = next((row for row in db.scalars(select(m.DanhMucMonAn))
                     if (row.tenDanhMuc or '').strip().casefold() == name.casefold()), None)
    if existing:
        existing.tenDanhMuc, existing.moTa = name, data.description
        db.commit()
        return {'id': existing.maDanhMuc}
    # The code counter can lag behind after an import/migration. Pick an
    # unused key and retry a few times instead of surfacing a generic
    # duplicate/foreign-key error to the user.
    existing_keys = [row.maDanhMuc for row in db.scalars(select(m.DanhMucMonAn))]
    numbers = [int(key[2:]) for key in existing_keys
               if isinstance(key, str) and key.startswith('DM') and key[2:].isdigit()]
    next_number = max(numbers or [0]) + 1
    for _ in range(5):
        key = 'DM' + str(next_number).zfill(3)
        next_number += 1
        if db.get(m.DanhMucMonAn, key):
            continue
        try:
            db.add(m.DanhMucMonAn(maDanhMuc=key, tenDanhMuc=name, moTa=data.description))
            db.commit()
            return {'id':key}
        except IntegrityError:
            db.rollback()
            existing = next((row for row in db.scalars(select(m.DanhMucMonAn))
                             if (row.tenDanhMuc or '').strip().casefold() == name.casefold()), None)
            if existing:
                existing.tenDanhMuc, existing.moTa = name, data.description
                db.commit()
                return {'id': existing.maDanhMuc}
    raise HTTPException(409, 'Không thể cấp mã danh mục mới. Vui lòng thử lại.')

@router.put('/categories/{key}')
def update_category(key: str, data: s.Category, user=Depends(content_user), db: Session = Depends(get_db)):
    row = require(db, m.DanhMucMonAn, key)
    row.tenDanhMuc, row.moTa = data.name, data.description
    db.commit()
    return {'id':key}

@router.delete('/categories/{key}', status_code=204)
def remove_category(key: str, user=Depends(content_user), db: Session = Depends(get_db)):
    row = require(db, m.DanhMucMonAn, key)
    # Xóa toàn bộ dữ liệu phụ thuộc của món trong danh mục trước khi xóa
    # danh mục, để thao tác Xóa thực sự loại bỏ dữ liệu khỏi DB.
    dish_ids = list(db.scalars(select(m.MonAn.maMonAn).where(m.MonAn.maDanhMuc == key)))
    for dish_id in dish_ids:
        delete_dish(db, dish_id)
    db.delete(row)
    db.commit()

def store_dish(db, data, key=None):
    require(db, m.DanhMucMonAn, data.category_id)
    image = validate_media(data.image)
    row = require(db, m.MonAn, key) if key else m.MonAn(maMonAn=allocate_code(db, 'MonAn', 'MA'))
    row.tenMonAn, row.maDanhMuc, row.moTa = data.name, data.category_id, data.description
    row.thoiGianCheBien, row.doKho, row.duongDanAnh = data.time, data.difficulty, image
    db.add(row)
    db.flush()
    db.commit()
    return {'id':row.maMonAn}

@router.post('/dishes', status_code=201)
def create_dish(data: s.Dish, user=Depends(dish_editor), db: Session = Depends(get_db)):
    return store_dish(db, data)

@router.put('/dishes/{key}')
def update_dish(key: str, data: s.Dish, user=Depends(dish_editor), db: Session = Depends(get_db)):
    return store_dish(db, data, key)

@router.delete('/dishes/{key}', status_code=204)
def remove_dish(key: str, user=Depends(content_user), db: Session = Depends(get_db)):
    delete_dish(db, key)

@router.get('/recipes')
def recipes(user=Depends(content_user), db: Session = Depends(get_db)):
    return recipe_data(db)

@router.post('/recipes', status_code=201)
def create_recipe(data: s.Recipe, user=Depends(content_user), db: Session = Depends(get_db)):
    return save_recipe(db, data)

@router.put('/recipes/{key}')
def update_recipe(key: str, data: s.Recipe, user=Depends(content_user), db: Session = Depends(get_db)):
    return save_recipe(db, data, key)

@router.delete('/recipes/{key}', status_code=204)
def remove_recipe(key: str, user=Depends(content_user), db: Session = Depends(get_db)):
    delete_recipe(db, key)
    db.commit()

@router.post('/import', status_code=201)
def import_content(payload: list[dict], user=Depends(content_user), db: Session = Depends(get_db)):
    if not payload:
        raise HTTPException(422, 'Tệp JSON không có dữ liệu để nhập.')
    if len(payload) > 1000:
        raise HTTPException(422, 'Mỗi lần chỉ được nhập tối đa 1.000 bản ghi.')
    imported_dishes = imported_recipes = 0
    try:
        for index, item in enumerate(payload, 1):
            dish_source = item.get('dish') or item
            if not isinstance(dish_source, dict) or not dish_source.get('name'):
                raise HTTPException(422, f'Bản ghi {index} thiếu thông tin món ăn.')
            dish_id = dish_source.get('id') or item.get('dish_id') or allocate_code(db, 'MonAn', 'MA')
            dish_input = s.Dish(
                name=dish_source.get('name'), category_id=dish_source.get('category_id'),
                description=dish_source.get('description', ''), time=dish_source.get('time', 15),
                difficulty=dish_source.get('difficulty', 'Dễ'), image=dish_source.get('image', 'images/logo.jpg'),
                home_display=dish_source.get('home_display', True), foods_display=dish_source.get('foods_display', True))
            require(db, m.DanhMucMonAn, dish_input.category_id)
            dish_row = db.get(m.MonAn, dish_id) or m.MonAn(maMonAn=dish_id)
            try:
                image = validate_media(dish_input.image)
            except HTTPException:
                if dish_row.maMonAn and dish_row.duongDanAnh:
                    image = dish_row.duongDanAnh
                else:
                    raise HTTPException(422, f'Ảnh ở bản ghi {index} không tồn tại. Hãy tải ảnh lên trước.')
            dish_row.tenMonAn, dish_row.maDanhMuc, dish_row.moTa = dish_input.name, dish_input.category_id, dish_input.description
            dish_row.thoiGianCheBien, dish_row.doKho, dish_row.duongDanAnh = dish_input.time, dish_input.difficulty, image
            db.add(dish_row)
            db.flush()
            imported_dishes += 1

            is_recipe = not item.get('dishOnly') and ('ingredients' in item or 'steps' in item)
            if is_recipe:
                ingredients = [{key: value for key, value in ingredient.items()
                                if key in {'name', 'quantity', 'unit_id', 'group'}}
                               for ingredient in (item.get('ingredients') or [])]
                steps = item.get('steps') or []
                if not ingredients or not steps:
                    raise HTTPException(422, f'Công thức ở bản ghi {index} phải có nguyên liệu và bước chế biến.')
                recipe_input = s.Recipe(dish_id=dish_id, description=item.get('description', ''),
                    servings=item.get('servings', 1), ingredients=ingredients, steps=steps)
                existing_id = db.scalar(select(m.CongThuc.maCongThuc).where(m.CongThuc.maMonAn == dish_id))
                source_id = item.get('id') if not str(item.get('id', '')).startswith('dish-') else None
                save_recipe(db, recipe_input, existing_id or (source_id if source_id and db.get(m.CongThuc, source_id) else None), commit=False)
                imported_recipes += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {'dishes': imported_dishes, 'recipes': imported_recipes}

@router.get('/videos')
def videos(user=Depends(content_user), db: Session = Depends(get_db)):
    return [dict(id=x.maDoanPhim, recipe_id=x.maCongThuc, title=x.tieuDe, path=x.duongDan, description=x.moTa or '')
            for x in rows(db, m.DoanPhimHuongDan)]

def store_video(db, data, user, key=None):
    require(db, m.CongThuc, data.recipe_id)
    path = validate_media(data.path, 'video')
    # SQL Server deployments can centralize video writes in the stored procedure.
    # Keep the ORM fallback for SQLite/MySQL and test environments.
    if db.bind is not None and db.bind.dialect.name == 'mssql' and not key:
        # MaDoanPhim is allocated by the database allocator, never by UUID or MAX+1.
        video_id = key or allocate_code(db, 'DoanPhimHuongDan', 'DP')
        try:
            db.execute(text('''EXEC dbo.SpLuuVideoHuongDan
                @MaQuanTri=:admin_id, @MaDoanPhim=:video_id, @MaCongThuc=:recipe_id,
                @TieuDe=:title, @DuongDan=:path, @MoTa=:description'''), {
                'admin_id': getattr(user, 'id', None) or getattr(user, 'maNguoiDung', None) or 'ND001',
                'video_id': video_id, 'recipe_id': data.recipe_id, 'title': data.title,
                'path': path, 'description': data.description
            })
            db.commit()
            return {'id': video_id}
        except SQLAlchemyError as exc:
            db.rollback()
            orig = getattr(exc, 'orig', exc)
            args = getattr(orig, 'args', ()) or ()
            number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
            logger.exception('POST /api/admin/videos failed at SpLuuVideoHuongDan: number=%s procedure=%s line=%s params=[MaQuanTri,MaDoanPhim,MaCongThuc,TieuDe,DuongDan,MoTa]',
                             number, getattr(orig, 'procedure', None), getattr(orig, 'line', None))
            if number in {51029, 51031, 51215, 51216}:
                raise HTTPException(422, 'Dữ liệu video không hợp lệ.') from exc
            if number in {51001, 51002, 51003, 51004}:
                raise HTTPException(403, 'Tài khoản không có quyền thêm video.') from exc
            if number == 51217:
                raise HTTPException(404, 'Không tìm thấy công thức.') from exc
            raise HTTPException(500, 'Lỗi máy chủ khi lưu video.') from exc
    row = require(db, m.DoanPhimHuongDan, key) if key else m.DoanPhimHuongDan(maDoanPhim=new_id('DP'))
    row.maCongThuc, row.tieuDe, row.duongDan, row.moTa = data.recipe_id, data.title, path, data.description
    db.add(row)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(422, 'Không thể lưu video. Công thức được chọn không hợp lệ hoặc video đã tồn tại.') from exc
    return {'id':row.maDoanPhim}

@router.post('/videos', status_code=201)
def create_video(data: s.Video, user=Depends(content_user), db: Session = Depends(get_db)):
    return store_video(db, data, user)

@router.put('/videos/{key}')
def update_video(key: str, data: s.Video, user=Depends(content_user), db: Session = Depends(get_db)):
    return store_video(db, data, user, key)

@router.delete('/videos/{key}', status_code=204)
def remove_video(key: str, user=Depends(content_user), db: Session = Depends(get_db)):
    db.delete(require(db, m.DoanPhimHuongDan, key))
    db.commit()

def review_result(row, images):
    value = dict(row)
    return dict(id=value['MaDanhGia'], user_id=value['MaNguoiDung'], user_name=value.get('HoTenNguoiDanhGia') or value['MaNguoiDung'],
                dish_id=value['MaMonAn'], dish_name=value.get('TenMonAn') or value['MaMonAn'], dish_image=images.get(value['MaMonAn']),
                rating=value['SoSao'], comment=value.get('NoiDung') or '', date=value['NgayDanhGia'],
                status=value.get('TrangThaiKiemDuyet') or 'Chờ duyệt', moderator_id=value.get('MaNguoiKiemDuyet'),
                moderator_name=value.get('HoTenNguoiKiemDuyet'), moderated_at=value.get('NgayKiemDuyet'), note=value.get('GhiChuKiemDuyet'))

@router.get('/reviews')
def reviews(user=Depends(review_moderator), db: Session = Depends(get_db)):
    images = {x.maMonAn:x.duongDanAnh for x in rows(db, m.MonAn)}
    if db.bind is not None and db.bind.dialect.name == 'mssql':
        result = db.execute(text('EXEC dbo.SpQuanTriLayDanhGiaMonAn @MaQuanTri=:admin_id, @TrangThaiKiemDuyet=NULL, @MaMonAn=NULL'),
                            {'admin_id':user.maNguoiDung}).mappings().all()
        return [review_result(row, images) for row in result]
    people = {x.maNguoiDung:x.hoTen for x in rows(db, m.NguoiDung)}
    return [dict(id=x.maDanhGia, user_id=x.maNguoiDung, user_name=people.get(x.maNguoiDung) or x.maNguoiDung,
                 dish_id=x.maMonAn, dish_name=db.get(m.MonAn, x.maMonAn).tenMonAn, dish_image=images.get(x.maMonAn),
                 rating=x.soSao, comment=x.noiDung or '', date=x.ngayDanhGia,
                 status=x.trangThaiKiemDuyet or 'Chờ duyệt', moderator_id=x.maNguoiKiemDuyet,
                 moderator_name=people.get(x.maNguoiKiemDuyet), moderated_at=x.ngayKiemDuyet, note=x.ghiChuKiemDuyet)
            for x in rows(db, m.DanhGiaMonAn)]

@router.put('/reviews/{key}/moderation')
def moderate_review(key: str, data: s.ReviewModeration, user=Depends(review_moderator), db: Session = Depends(get_db)):
    if db.bind is not None and db.bind.dialect.name == 'mssql':
        db.execute(text('EXEC dbo.SpKiemDuyetDanhGiaMonAn @MaQuanTri=:admin_id, @MaDanhGia=:review_id, @TrangThaiMoi=:status, @GhiChu=:note'),
                   {'admin_id':user.maNguoiDung, 'review_id':key, 'status':data.status, 'note':data.note or None})
    else:
        row = require(db, m.DanhGiaMonAn, key)
        row.trangThaiKiemDuyet, row.maNguoiKiemDuyet = data.status, user.maNguoiDung
        row.ngayKiemDuyet, row.ghiChuKiemDuyet = datetime.now(), data.note or None
    db.commit()
    return {'id':key, 'status':data.status}

@router.delete('/reviews/{key}', status_code=204)
def remove_review(key: str, user=Depends(review_moderator), db: Session = Depends(get_db)):
    if db.bind is not None and db.bind.dialect.name == 'mssql':
        db.execute(text('EXEC dbo.SpQuanTriXoaDanhGiaMonAn @MaQuanTri=:admin_id, @MaDanhGia=:review_id'),
                   {'admin_id':user.maNguoiDung, 'review_id':key})
    else:
        db.delete(require(db, m.DanhGiaMonAn, key))
    db.commit()

@router.get('/users')
def users(user=Depends(system_user), db: Session = Depends(get_db)):
    return [public_user(x) for x in rows(db, m.NguoiDung)]

@router.put('/users/{key}')
def update_user(key: str, data: s.UserUpdate, user=Depends(system_user), db: Session = Depends(get_db)):
    row = require(db, m.NguoiDung, key)
    if key == user.maNguoiDung and (data.role not in ('Quản trị hệ thống', 'Quản trị nội dung') or data.status != 'Đang hoạt động'):
        raise HTTPException(409, 'Không thể tự khóa hoặc bỏ quyền quản trị của mình.')
    other = by_email(db, data.email)
    if other and other.maNguoiDung != key:
        raise HTTPException(409, 'Email đã được sử dụng.')
    row.hoTen, row.thuDienTu, row.vaiTro, row.trangThai = data.name, data.email, data.role, data.status
    if data.password:
        row.matKhauBam = passwords.hash(data.password)
    db.commit()
    return public_user(row)

