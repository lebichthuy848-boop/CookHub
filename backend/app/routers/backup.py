"""Portable, account-scoped backup of profile preferences and planned meals."""
import json
from datetime import date, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select, text
from sqlalchemy.orm import Session

from .. import models as m
from ..database import get_db
from ..security import current_user
from ..services import new_id
from .personal import _next_code

router = APIRouter(prefix='/account-backup', tags=['Account backup'])


class Meal(BaseModel):
    model_config = ConfigDict(extra='forbid')
    dish_id: str = Field(min_length=1, max_length=50)
    date: date
    meal: str = Field(pattern='^(Sáng|Trưa|Tối|Ăn nhẹ)$')
    servings: int = Field(ge=1, le=1000)


class AccountData(BaseModel):
    model_config = ConfigDict(extra='forbid')
    name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=3, max_length=255)
    preferences: dict | None = None
    menu: list[Meal] = Field(default_factory=list, max_length=2000)


class Backup(BaseModel):
    model_config = ConfigDict(extra='forbid')
    version: int = Field(ge=1, le=1)
    account: AccountData


MEALS = {'Bữa sáng': 'Sáng', 'Bữa trưa': 'Trưa', 'Bữa tối': 'Tối', 'Bữa phụ': 'Ăn nhẹ'}
DB_MEALS = {value: key for key, value in MEALS.items()}


@router.get('')
def export_backup(user=Depends(current_user), db: Session = Depends(get_db)):
    preferences = db.get(m.UserPreferences, user.maNguoiDung)
    items = db.scalars(select(m.ChiTietThucDon).join(
        m.ThucDon, m.ThucDon.maThucDon == m.ChiTietThucDon.maThucDon).where(
        m.ThucDon.maNguoiDung == user.maNguoiDung).order_by(
        m.ChiTietThucDon.ngayDung, m.ChiTietThucDon.maChiTiet)).all()
    return {'version': 1, 'account': {
        'name': user.hoTen, 'email': user.thuDienTu,
        'preferences': json.loads(preferences.answers) if preferences else None,
        'menu': [{'dish_id': item.maMonAn, 'date': item.ngayDung,
                  'meal': MEALS.get((item.buaAn or '').strip(), (item.buaAn or '').strip()),
                  'servings': item.soKhauPhan} for item in items]}}


@router.post('/restore')
def restore_backup(backup: Backup, user=Depends(current_user), db: Session = Depends(get_db)):
    account = backup.account
    if account.email.casefold() != user.thuDienTu.casefold():
        raise HTTPException(422, 'File sao lưu thuộc tài khoản khác.')
    if account.preferences is not None:
        # Accept the same preference payload as the survey, plus the optional avatar.
        from ..schemas import Preferences
        preferences = dict(account.preferences)
        avatar = preferences.pop('avatar', None)
        if preferences:
            Preferences.model_validate(preferences)
        if avatar is not None and (not isinstance(avatar, str) or len(avatar) > 2000000):
            raise HTTPException(422, 'Ảnh đại diện trong file không hợp lệ.')
    keys = [(item.dish_id, item.date, item.meal) for item in account.menu]
    if len(keys) != len(set(keys)):
        raise HTTPException(422, 'File sao lưu có món trùng trong cùng bữa ăn.')
    dish_ids = set(db.scalars(select(m.MonAn.maMonAn).where(
        m.MonAn.maMonAn.in_({item.dish_id for item in account.menu}))))
    missing = sorted({item.dish_id for item in account.menu} - dish_ids)
    if missing:
        raise HTTPException(422, 'Món ăn không còn trong thư viện: ' + ', '.join(missing[:10]))
    published = set(db.scalars(select(m.CongThuc.maMonAn).where(
        m.CongThuc.maMonAn.in_(dish_ids), m.CongThuc.daCongBo == 1)))
    unavailable = sorted(dish_ids - published)
    if unavailable:
        raise HTTPException(422, 'Món chưa có công thức công bố: ' + ', '.join(unavailable[:10]))

    existing_rows = db.execute(select(m.ChiTietThucDon.maMonAn,
        m.ChiTietThucDon.ngayDung, m.ChiTietThucDon.buaAn).join(
        m.ThucDon, m.ThucDon.maThucDon == m.ChiTietThucDon.maThucDon).where(
        m.ThucDon.maNguoiDung == user.maNguoiDung)).all()
    existing = {(dish, used_on, MEALS.get((meal or '').strip(), (meal or '').strip()))
                for dish, used_on, meal in existing_rows}
    added = 0
    try:
        user.hoTen = account.name
        if account.preferences is not None:
            row = db.get(m.UserPreferences, user.maNguoiDung)
            if row is None:
                row = m.UserPreferences(user_id=user.maNguoiDung)
                db.add(row)
            row.answers = json.dumps(account.preferences, ensure_ascii=False)
            has_survey = bool({key: value for key, value in account.preferences.items()
                               if key != 'avatar' and value})
            row.completed = int(has_survey)
            row.survey_shown = int(has_survey)
        plans = {}
        for item in account.menu:
            key = (item.dish_id, item.date, item.meal)
            if key in existing:
                continue
            monday = item.date - timedelta(days=item.date.weekday())
            sunday = monday + timedelta(days=6)
            if (monday, sunday) not in plans:
                plan = db.scalar(select(m.ThucDon).where(
                    m.ThucDon.maNguoiDung == user.maNguoiDung,
                    m.ThucDon.ngayBatDau <= item.date,
                    m.ThucDon.ngayKetThuc >= item.date).order_by(
                    m.ThucDon.ngayBatDau.desc()).limit(1))
                if plan is None:
                    plan_id = _next_code(db, 'ThucDon') if db.bind.dialect.name == 'mssql' else new_id('TD')
                    if db.bind.dialect.name == 'mssql':
                        db.execute(text("""
                            DECLARE @plan_type NVARCHAR(30) = NCHAR(84)+NCHAR(117)+NCHAR(7847)+NCHAR(110);
                            DECLARE @plan_status NVARCHAR(30) = NCHAR(272)+NCHAR(97)+NCHAR(110)+NCHAR(103)+NCHAR(32)+NCHAR(100)+NCHAR(249)+NCHAR(110)+NCHAR(103);
                            EXEC dbo.SpTaoThucDon @MaThucDon=:plan_id,
                                @MaNguoiDung=:user_id, @TenThucDon='CookHub week',
                                @LoaiThucDon=@plan_type, @NgayBatDau=:start_date,
                                @NgayKetThuc=:end_date, @TrangThai=@plan_status
                        """), {'plan_id': plan_id, 'user_id': user.maNguoiDung,
                               'start_date': monday, 'end_date': sunday})
                    else:
                        plan = m.ThucDon(maThucDon=plan_id, maNguoiDung=user.maNguoiDung,
                            tenThucDon='CookHub week', loaiThucDon='Tuần',
                            ngayBatDau=monday, ngayKetThuc=sunday, trangThai='Đang dùng',
                            ngayTao=datetime.now())
                        db.add(plan)
                        db.flush()
                else:
                    plan_id = plan.maThucDon
                plans[(monday, sunday)] = plan_id
            item_id = _next_code(db, 'ChiTietThucDon') if db.bind.dialect.name == 'mssql' else new_id('CTTD')
            if db.bind.dialect.name == 'mssql':
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
                """), {'item_id': item_id, 'plan_id': plans[(monday, sunday)],
                       'dish_id': item.dish_id, 'used_on': item.date,
                       'meal_code': {'Sáng':'breakfast', 'Trưa':'lunch',
                                     'Tối':'dinner', 'Ăn nhẹ':'snack'}[item.meal],
                       'servings': item.servings, 'user_id': user.maNguoiDung})
            else:
                db.add(m.ChiTietThucDon(maChiTiet=item_id,
                    maThucDon=plans[(monday, sunday)], maMonAn=item.dish_id,
                    ngayDung=item.date, buaAn=DB_MEALS[item.meal], soKhauPhan=item.servings))
                db.flush()
            existing.add(key)
            added += 1
        db.commit()
    except Exception:
        db.rollback()
        raise
    return {'restored_menu_items': added, 'existing_menu_items': len(account.menu) - added}
