from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy import select, delete, func, text, bindparam, Unicode
from sqlalchemy.exc import SQLAlchemyError, IntegrityError
import logging
from sqlalchemy.orm import Session
from .. import models as m, schemas as s
from ..database import get_db
from ..security import current_user, public_user
from ..services import require, rows, new_id, allocate_code, resolve_ingredient, dish_data
from .auth import by_email
from ..nutrition import menu_nutrition, dish_nutrition

router = APIRouter(tags=['Personal'], dependencies=[Depends(current_user)])
logger = logging.getLogger(__name__)

def _collection_sql_error(exc):
    orig = getattr(exc, 'orig', exc)
    args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    message = str(args[1] if len(args) > 1 else orig)
    logger.exception('Favorite collection SQL failure: number=%s procedure=%s message=%s',
                     number, getattr(orig, 'procedure', None), message)
    if number == 54012:
        return HTTPException(409, 'Tên bộ sưu tập đã tồn tại.')
    if number in {54010, 54011}:
        return HTTPException(422, message)
    if number in {54020, 547}:
        return HTTPException(404 if number == 54020 else 409, message)
    return HTTPException(500, 'Không thể xử lý bộ sưu tập. Kiểm tra log backend.')

@router.get('/favorite-collections')
def favorite_collections(user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        result = db.execute(text('EXEC dbo.SpLayDanhSachBoSuuTapYeuThich @MaNguoiDung=:user_id'),
                            {'user_id': user.maNguoiDung}).mappings().all()
        return [dict(row) for row in result]
    except SQLAlchemyError as exc:
        raise _collection_sql_error(exc)

@router.post('/favorite-collections', status_code=201)
def create_favorite_collection(payload: dict = Body(...), user=Depends(current_user), db: Session = Depends(get_db)):
    name = str(payload.get('name') or payload.get('TenBoSuuTap') or '').strip()
    description = payload.get('description', payload.get('MoTa'))
    private = payload.get('private', payload.get('LaRiengTu', True))
    try:
        row = db.execute(text('''EXEC dbo.SpTaoBoSuuTapYeuThich
            @MaNguoiDung=:user_id, @TenBoSuuTap=:name, @MoTa=:description, @LaRiengTu=:private'''),
            {'user_id': user.maNguoiDung, 'name': name, 'description': description, 'private': bool(private)}).mappings().first()
        db.commit()
        return dict(row) if row else {'name': name}
    except SQLAlchemyError as exc:
        db.rollback(); raise _collection_sql_error(exc)

@router.get('/favorite-collections/for-dish/{dish_id}')
def favorite_collections_for_dish(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        rows = db.execute(text('''EXEC dbo.SpLayBoSuuTapTheoMonAn
            @MaNguoiDung=:user_id, @MaMonAn=:dish_id'''),
            {'user_id': user.maNguoiDung, 'dish_id': dish_id}).mappings().all()
        return [dict(row) for row in rows]
    except SQLAlchemyError as exc:
        raise _collection_sql_error(exc)

@router.post('/favorite-collections/{collection_id}/dishes', status_code=204)
def add_dish_to_collection(collection_id: str, payload: dict = Body(...), user=Depends(current_user), db: Session = Depends(get_db)):
    dish_id = str(payload.get('dish_id') or payload.get('MaMonAn') or '').strip()
    try:
        db.execute(text('''EXEC dbo.SpThemMonVaoBoSuuTap
            @MaNguoiDung=:user_id, @MaBoSuuTap=:collection_id, @MaMonAn=:dish_id'''),
            {'user_id': user.maNguoiDung, 'collection_id': collection_id, 'dish_id': dish_id})
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback(); raise _collection_sql_error(exc)

@router.delete('/favorite-collections/{collection_id}/dishes/{dish_id}', status_code=204)
def remove_dish_from_collection(collection_id: str, dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        db.execute(text('''EXEC dbo.SpXoaMonKhoiBoSuuTap
            @MaNguoiDung=:user_id, @MaBoSuuTap=:collection_id, @MaMonAn=:dish_id'''),
            {'user_id': user.maNguoiDung, 'collection_id': collection_id, 'dish_id': dish_id})
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback(); raise _collection_sql_error(exc)

@router.patch('/favorite-collections/{collection_id}')
def update_favorite_collection(collection_id: str, payload: dict = Body(...), user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        row = db.execute(text('''EXEC dbo.SpSuaBoSuuTapYeuThich
            @MaNguoiDung=:user_id, @MaBoSuuTap=:collection_id,
            @TenBoSuuTap=:name, @MoTa=:description, @LaRiengTu=:private'''), {
                'user_id': user.maNguoiDung, 'collection_id': collection_id,
                'name': str(payload.get('name') or '').strip(), 'description': payload.get('description'),
                'private': bool(payload.get('private', True))}).mappings().first()
        db.commit(); return dict(row) if row else {'id': collection_id}
    except SQLAlchemyError as exc:
        db.rollback(); raise _collection_sql_error(exc)

@router.delete('/favorite-collections/{collection_id}', status_code=204)
def delete_favorite_collection(collection_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    try:
        db.execute(text('EXEC dbo.SpXoaBoSuuTapYeuThich @MaNguoiDung=:user_id, @MaBoSuuTap=:collection_id'),
                   {'user_id': user.maNguoiDung, 'collection_id': collection_id})
        db.commit()
    except SQLAlchemyError as exc:
        db.rollback(); raise _collection_sql_error(exc)

@router.get('/profile')
def profile(user=Depends(current_user), db: Session = Depends(get_db)):
    budget = db.scalar(select(m.NganSachAnUong).where(m.NganSachAnUong.maNguoiDung == user.maNguoiDung)
                       .order_by(m.NganSachAnUong.ngayBatDau.desc()).limit(1))
    diets = db.scalars(select(m.CheDoAn.tenCheDoAn).join(m.CheDoAnNguoiDung,
        m.CheDoAn.maCheDoAn == m.CheDoAnNguoiDung.maCheDoAn)
        .where(m.CheDoAnNguoiDung.maNguoiDung == user.maNguoiDung)).all()
    return {**public_user(user), 'budget': float(budget.mucNganSach or 0) if budget else 0, 'diets': diets}

@router.put('/profile')
def update_profile(data: s.Profile, user=Depends(current_user), db: Session = Depends(get_db)):
    other = by_email(db, data.email)
    if other and other.maNguoiDung != user.maNguoiDung:
        raise HTTPException(409, 'Email đã được sử dụng.')
    user.hoTen, user.thuDienTu = data.name, data.email
    db.commit()
    return public_user(user)

@router.get('/favorites')
def favorites(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(m.MonYeuThich.maMonAn)
        .where(m.MonYeuThich.maNguoiDung == user.maNguoiDung)).all()

@router.get('/favorites/counts')
def favorite_counts(user=Depends(current_user), db: Session = Depends(get_db)):
    rows = db.execute(select(m.MonYeuThich.maMonAn, func.count(m.MonYeuThich.maNguoiDung))
        .group_by(m.MonYeuThich.maMonAn)).all()
    return {dish_id: int(count) for dish_id, count in rows}

@router.get('/favorites/details')
def favorite_details(user=Depends(current_user), db: Session = Depends(get_db)):
    favorite_ids = set(db.scalars(select(m.MonYeuThich.maMonAn)
        .where(m.MonYeuThich.maNguoiDung == user.maNguoiDung)).all())
    result = []
    for dish in dish_data(db):
        if dish['id'] not in favorite_ids:
            continue
        nutrition = dish_nutrition(db, dish['id'], 1, date.today())
        totals = nutrition.get('totals') or {}
        result.append({**dish, 'calories': round(float(totals.get('nang_luong') or 0))})
    return result

@router.put('/favorites/{dish_id}', status_code=204)
def add_favorite(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.MonAn, dish_id)
    if not db.scalar(select(m.MonYeuThich).where(m.MonYeuThich.maNguoiDung == user.maNguoiDung, m.MonYeuThich.maMonAn == dish_id)):
        # SQL Server's schema uses MYT followed by digits for this key.  UUID
        # fragments can violate that CHECK constraint, so allocate the next
        # numeric key from existing rows (and keep the operation transactional).
        key = allocate_code(db, 'MonYeuThich', 'MYT')
        db.add(m.MonYeuThich(maMonYeuThich=key, maNguoiDung=user.maNguoiDung,
                             maMonAn=dish_id, ngayThem=date.today()))
        try:
            db.commit()
        except IntegrityError as error:
            db.rollback()
            logger.exception("SQL favorite insert failed: number=%s message=%s orig=%s",
                             getattr(error.orig, 'number', None), str(error), repr(error.orig))
            # A concurrent request may have inserted the same favorite. Treat
            # that idempotently; surface other constraint violations clearly.
            if db.scalar(select(m.MonYeuThich).where(
                    m.MonYeuThich.maNguoiDung == user.maNguoiDung,
                    m.MonYeuThich.maMonAn == dish_id)):
                return
            raise HTTPException(409, 'Không thể lưu món yêu thích do dữ liệu không hợp lệ.')

@router.delete('/favorites/{dish_id}', status_code=204)
def remove_favorite(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(m.MonYeuThich).where(
        m.MonYeuThich.maNguoiDung == user.maNguoiDung,
        m.MonYeuThich.maMonAn == dish_id))
    db.commit()

@router.put('/hidden/{dish_id}', status_code=204)
def hide(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.MonAn, dish_id)
    if not db.get(m.MonKhongThich, (user.maNguoiDung, dish_id)):
        db.execute(delete(m.MonYeuThich).where(m.MonYeuThich.maNguoiDung == user.maNguoiDung, m.MonYeuThich.maMonAn == dish_id))
        db.add(m.MonKhongThich(maNguoiDung=user.maNguoiDung, maMonAn=dish_id, ngayThem=datetime.utcnow()))
        db.commit()

@router.get('/hidden')
def hidden(user=Depends(current_user), db: Session = Depends(get_db)):
    return db.scalars(select(m.MonKhongThich.maMonAn)
        .where(m.MonKhongThich.maNguoiDung == user.maNguoiDung)).all()

@router.delete('/hidden/{dish_id}', status_code=204)
def unhide(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    db.execute(delete(m.MonKhongThich).where(
        m.MonKhongThich.maNguoiDung == user.maNguoiDung,
        m.MonKhongThich.maMonAn == dish_id))
    db.commit()

@router.post('/dishes/{dish_id}/reviews', status_code=201)
def add_review(dish_id: str, data: s.Review, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.MonAn, dish_id)
    key = allocate_code(db, 'DanhGiaMonAn', 'DGMA')
    db.add(m.DanhGiaMonAn(maDanhGia=key, maNguoiDung=user.maNguoiDung,
        maMonAn=dish_id, soSao=data.rating, noiDung=data.comment, ngayDanhGia=date.today(),
        trangThaiKiemDuyet='Chờ duyệt'))
    db.commit()
    return {'id': key}

@router.get('/pantry')
def pantry(user=Depends(current_user), db: Session = Depends(get_db)):
    ingredients = {x.maNguyenLieu: x.tenNguyenLieu for x in rows(db, m.NguyenLieu)}
    units = {x.maDonVi: x.kyHieu for x in rows(db, m.DonViTinh)}
    recipe_ingredients = set(db.scalars(select(m.ThanhPhanCongThuc.maNguyenLieu)).all())
    return [dict(id=x.maChiTiet, name=ingredients[x.maNguyenLieu], quantity=float(x.soLuong or 0),
                 unit=units[x.maDonVi], unit_id=x.maDonVi, date=x.ngayCapNhat,
                 custom=x.maNguyenLieu not in recipe_ingredients)
            for x in db.scalars(select(m.NguyenLieuHienCo).where(m.NguyenLieuHienCo.maNguoiDung == user.maNguoiDung))]

@router.post('/pantry', status_code=201)
def add_pantry(data: s.Ingredient, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.DonViTinh, data.unit_id)
    ingredient = resolve_ingredient(db, data.name, data.group)
    existing = db.scalar(select(m.NguyenLieuHienCo).where(
        m.NguyenLieuHienCo.maNguoiDung == user.maNguoiDung,
        m.NguyenLieuHienCo.maNguyenLieu == ingredient.maNguyenLieu,
        m.NguyenLieuHienCo.maDonVi == data.unit_id))
    if existing:
        existing.soLuong = float(existing.soLuong or 0) + data.quantity
        existing.ngayCapNhat = date.today()
        db.commit()
        return {'id': existing.maChiTiet}
    key = new_id('NHC')
    db.add(m.NguyenLieuHienCo(maChiTiet=key, maNguoiDung=user.maNguoiDung,
        maNguyenLieu=ingredient.maNguyenLieu, maDonVi=data.unit_id,
        soLuong=data.quantity, ngayCapNhat=date.today()))
    db.commit()
    return {'id': key}

@router.put('/pantry/{item_id}')
def update_pantry(item_id: str, data: s.PantryQuantity, user=Depends(current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(m.NguyenLieuHienCo).where(
        m.NguyenLieuHienCo.maChiTiet == item_id, m.NguyenLieuHienCo.maNguoiDung == user.maNguoiDung))
    if row is None:
        raise HTTPException(404, 'Không tìm thấy nguyên liệu.')
    if data.quantity == 0:
        db.delete(row)
    else:
        row.soLuong = data.quantity
        row.ngayCapNhat = date.today()
    db.commit()
    return {'id': item_id, 'quantity': data.quantity}

@router.delete('/pantry/{item_id}', status_code=204)
def remove_pantry(item_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(m.NguyenLieuHienCo).where(
        m.NguyenLieuHienCo.maChiTiet == item_id, m.NguyenLieuHienCo.maNguoiDung == user.maNguoiDung))
    if row is None:
        raise HTTPException(404, 'Không tìm thấy nguyên liệu.')
    db.delete(row)
    db.commit()

@router.get('/menu')
def menu(start: date, end: date, user=Depends(current_user), db: Session = Depends(get_db)):
    if (end-start).days not in range(0, 367):
        raise HTTPException(422, 'Khoảng ngày phải từ 0 đến 366 ngày.')
    meal_labels = {'Bữa sáng': 'Sáng', 'Bữa trưa': 'Trưa', 'Bữa tối': 'Tối', 'Bữa phụ': 'Ăn nhẹ'}
    return [dict(id=x.maChiTiet, dish_id=x.maMonAn, date=x.ngayDung,
            meal=meal_labels.get((x.buaAn or '').strip(), (x.buaAn or '').strip()), servings=x.soKhauPhan)
            for x in db.scalars(select(m.ChiTietThucDon).join(m.ThucDon,
                m.ThucDon.maThucDon == m.ChiTietThucDon.maThucDon).where(
                m.ThucDon.maNguoiDung == user.maNguoiDung, m.ChiTietThucDon.ngayDung >= start,
                m.ChiTietThucDon.ngayDung <= end).order_by(m.ChiTietThucDon.ngayDung))]

@router.get('/menu/nutrition')
def menu_nutrition_for_day(on: date, user=Depends(current_user), db: Session = Depends(get_db)):
    return menu_nutrition(db, user.maNguoiDung, on)

@router.post('/menu', status_code=201)
def add_menu(data: s.MenuItem, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.MonAn, data.dish_id)
    meal = {'Sáng': 'Bữa sáng', 'Trưa': 'Bữa trưa', 'Tối': 'Bữa tối', 'Ăn nhẹ': 'Bữa phụ'}.get(data.meal)
    if not meal:
        raise HTTPException(422, 'Bữa ăn không hợp lệ.')
    if data.servings <= 0:
        raise HTTPException(422, 'Số khẩu phần phải lớn hơn 0.')

    # SQLite is used only by the automated test suite. SQL Server always uses
    # the two procedures so ownership, constraints and counters stay central.
    if db.bind.dialect.name != 'mssql':
        recipe = db.scalar(select(m.CongThuc).where(m.CongThuc.maMonAn == data.dish_id))
        if recipe is None:
            raise HTTPException(409, 'Chỉ có thể thêm món có công thức đã công bố.')
        plan = db.scalar(select(m.ThucDon).where(m.ThucDon.maNguoiDung == user.maNguoiDung,
            m.ThucDon.ngayBatDau <= data.date, m.ThucDon.ngayKetThuc >= data.date)
            .order_by(m.ThucDon.ngayBatDau.desc()).limit(1))
        if plan is None:
            plan = m.ThucDon(maThucDon=new_id('TD'), maNguoiDung=user.maNguoiDung,
                tenThucDon='Thực đơn của tôi', loaiThucDon='Ngày', ngayBatDau=data.date,
                ngayKetThuc=data.date, trangThai='Đang dùng')
            db.add(plan); db.flush()
        key = new_id('CTTD')
        db.add(m.ChiTietThucDon(maChiTiet=key, maThucDon=plan.maThucDon, maMonAn=data.dish_id,
            ngayDung=data.date, buaAn=meal, soKhauPhan=data.servings))
        db.commit()
        return {'id': key}

    try:
        plan = db.scalar(select(m.ThucDon).where(
            m.ThucDon.maNguoiDung == user.maNguoiDung,
            m.ThucDon.loaiThucDon == 'Tuần',
            m.ThucDon.ngayBatDau <= data.date,
            m.ThucDon.ngayKetThuc >= data.date,
        ).order_by(m.ThucDon.ngayBatDau.desc()).limit(1))
        if plan is None:
            monday = data.date - timedelta(days=data.date.weekday())
            sunday = monday + timedelta(days=6)
            plan_id = _next_code(db, 'ThucDon')
            db.execute(text("""
                DECLARE @plan_type NVARCHAR(30) = NCHAR(84)+NCHAR(117)+NCHAR(7847)+NCHAR(110);
                DECLARE @plan_status NVARCHAR(30) = NCHAR(272)+NCHAR(97)+NCHAR(110)+NCHAR(103)+NCHAR(32)+NCHAR(100)+NCHAR(249)+NCHAR(110)+NCHAR(103);
                EXEC dbo.SpTaoThucDon
                    @MaThucDon=:plan_id, @MaNguoiDung=:user_id,
                    @TenThucDon='CookHub week',
                    @LoaiThucDon=@plan_type,
                    @NgayBatDau=:start_date, @NgayKetThuc=:end_date,
                    @TrangThai=@plan_status
            """ ).bindparams(
            ), {'plan_id': plan_id, 'user_id': user.maNguoiDung,
                'start_date': monday, 'end_date': sunday})
            plan_id_value = plan_id
        else:
            plan_id_value = plan.maThucDon

        duplicate = db.scalar(select(m.ChiTietThucDon).where(
            m.ChiTietThucDon.maThucDon == plan_id_value,
            m.ChiTietThucDon.maMonAn == data.dish_id,
            m.ChiTietThucDon.ngayDung == data.date,
            m.ChiTietThucDon.buaAn == meal,
        ))
        if duplicate:
            raise HTTPException(409, 'Món này đã có trong bữa ăn đã chọn.')

        item_id = _next_code(db, 'ChiTietThucDon')
        db.execute(text("""
            DECLARE @meal NVARCHAR(30) = CASE :meal_code
                WHEN 'breakfast' THEN NCHAR(66)+NCHAR(7919)+NCHAR(97)+NCHAR(32)+NCHAR(115)+NCHAR(225)+NCHAR(110)+NCHAR(103)
                WHEN 'lunch' THEN NCHAR(66)+NCHAR(7919)+NCHAR(97)+NCHAR(32)+NCHAR(116)+NCHAR(114)+NCHAR(432)+NCHAR(97)
                WHEN 'dinner' THEN NCHAR(66)+NCHAR(7919)+NCHAR(97)+NCHAR(32)+NCHAR(116)+NCHAR(7889)+NCHAR(105)
                ELSE NCHAR(66)+NCHAR(7919)+NCHAR(97)+NCHAR(32)+NCHAR(112)+NCHAR(104)+NCHAR(7909)
            END;
            EXEC dbo.SpThemHoacCapNhatChiTietThucDon
                @MaChiTiet=:item_id, @MaThucDon=:plan_id,
                @MaMonAn=:dish_id, @NgayDung=:used_on,
                @BuaAn=@meal, @SoKhauPhan=:servings,
                @MaNguoiDung=:user_id
        """), {'item_id': item_id, 'plan_id': plan_id_value, 'dish_id': data.dish_id,
               'used_on': data.date, 'meal_code': {'Bữa sáng':'breakfast','Bữa trưa':'lunch','Bữa tối':'dinner','Bữa phụ':'snack'}[meal], 'servings': data.servings,
               'user_id': user.maNguoiDung})
        db.commit()
        return {'id': item_id}
    except SQLAlchemyError as exc:
        db.rollback()
        _log_sql_error('add_menu', exc)
        raise _menu_sql_http_error(exc)


def _next_code(db, kind):
    result = db.execute(text("""
        DECLARE @R TABLE (MaMoi NVARCHAR(20), LoaiMa SYSNAME);
        DECLARE @M NVARCHAR(20);
        INSERT INTO @R EXEC dbo.SpCapMaMoi @LoaiMa=:kind, @MaMoi=@M OUTPUT;
        SELECT @M AS MaMoi;
    """), {'kind': kind}).mappings().first()
    value = result.get('MaMoi') if result else None
    if not value:
        raise HTTPException(500, 'Không thể cấp mã dữ liệu mới.')
    return value


def _log_sql_error(operation, exc):
    orig = getattr(exc, 'orig', exc); args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    message = str(args[1] if len(args) > 1 else orig)
    logger.exception('SQL menu failure operation=%s number=%s message=%s constraint=%s procedure=%s line=%s',
                     operation, number, message, getattr(orig, 'constraint', None),
                     getattr(orig, 'procedure', None), getattr(orig, 'line', None))


def _menu_sql_http_error(exc):
    orig = getattr(exc, 'orig', exc); args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    messages = {50013: 'Số khẩu phần phải lớn hơn 0.', 50014: 'Bữa ăn không hợp lệ.',
                50015: 'Ngày nằm ngoài tuần thực đơn.', 51005: 'Món chưa có công thức công bố.',
                51006: 'Mã chi tiết đã thuộc thực đơn khác.', 2601: 'Món đã tồn tại trong thực đơn.'}
    if number in messages:
        return HTTPException(409 if number in {51005, 51006, 2601} else 422, messages[number])
    if number == 547:
        return HTTPException(409, 'Dữ liệu vi phạm ràng buộc cơ sở dữ liệu.')
    return HTTPException(500, 'Không thể thêm món vào thực đơn. Kiểm tra log backend để xem lỗi SQL chi tiết.')

@router.delete('/menu/{item_id}', status_code=204)
def remove_menu(item_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    row = db.scalar(select(m.ChiTietThucDon).join(m.ThucDon,
        m.ThucDon.maThucDon == m.ChiTietThucDon.maThucDon).where(
        m.ChiTietThucDon.maChiTiet == item_id, m.ThucDon.maNguoiDung == user.maNguoiDung))
    if row is None:
        raise HTTPException(404, 'Không tìm thấy mục thực đơn.')
    db.delete(row)
    db.commit()

@router.get('/menu/history')
def history(user=Depends(current_user), db: Session = Depends(get_db)):
    result = []
    plans = db.scalars(select(m.ThucDon).where(m.ThucDon.maNguoiDung == user.maNguoiDung)
        .order_by(m.ThucDon.ngayBatDau.desc())).all()
    for plan in plans:
        items = db.scalars(select(m.ChiTietThucDon).where(
            m.ChiTietThucDon.maThucDon == plan.maThucDon)).all()
        day_count = max(1, (plan.ngayKetThuc - plan.ngayBatDau).days + 1)
        daily_energy = []
        for offset in range(min(day_count, 7)):
            nutrition = menu_nutrition(db, user.maNguoiDung, plan.ngayBatDau + timedelta(days=offset))
            energy = float(nutrition.get('totals', {}).get('nang_luong') or 0)
            if energy:
                daily_energy.append(energy)
        expected_meals = day_count * 3
        result.append(dict(id=plan.maThucDon, name=plan.tenThucDon, start=plan.ngayBatDau,
            end=plan.ngayKetThuc, total_meals=len(items),
            completion=min(100, round(len(items) / expected_meals * 100)) if expected_meals else 0,
            avg_kcal=round(sum(daily_energy) / len(daily_energy)) if daily_energy else 0))
    return result



