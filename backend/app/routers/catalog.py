from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session
from .. import models as m
from ..database import get_db
from ..security import current_user
from ..services import dish_data, require, rows, ingredient_similarity, normalize_ingredient_text
from ..nutrition import dish_nutrition
from ..personalization import load_preferences, rank_dishes

router = APIRouter(tags=['Catalog'], dependencies=[Depends(current_user)])

@router.get('/categories')
def categories(db: Session = Depends(get_db)):
    return [dict(id=x.maDanhMuc, name=x.tenDanhMuc, description=x.moTa or '') for x in rows(db, m.DanhMucMonAn)]

@router.get('/units')
def units(db: Session = Depends(get_db)):
    return [dict(id=x.maDonVi, name=x.tenDonVi, symbol=x.kyHieu) for x in rows(db, m.DonViTinh)]

@router.get('/ingredients')
def ingredients(q: str = '', db: Session = Depends(get_db)):
    result = [dict(id=x.maNguyenLieu, name=x.tenNguyenLieu) for x in rows(db, m.NguyenLieu)]
    if q:
        result = [item for item in result if ingredient_similarity(q, item['name']) >= .45]
        result.sort(key=lambda item: ingredient_similarity(q, item['name']), reverse=True)
    return result[:20] if q else result

@router.get('/recipe-generator')
def recipe_generator(ingredient: str = ''):
    names = [name.strip() for name in ingredient.split(',') if name.strip()]
    display = ', '.join(names[:4]) or 'nguyên liệu trong tủ'
    return {
        'title': f'Món áp chảo sáng tạo với {display}',
        'description': 'Công thức gợi ý được tạo khi CookHub chưa tìm thấy công thức phù hợp trong thư viện.',
        'ingredients': names,
        'steps': [
            'Sơ chế và cắt các nguyên liệu thành miếng vừa ăn.',
            'Làm nóng chảo, cho nguyên liệu lâu chín vào trước và đảo đều.',
            'Nêm gia vị vừa ăn, thêm các nguyên liệu còn lại rồi nấu chín hoàn toàn.',
            'Kiểm tra độ chín và điều chỉnh gia vị trước khi dùng.'
        ]
    }

@router.get('/dishes')
def dishes(q: str = '', category: list[str] = Query(default=[]),
           max_time: int | None = Query(default=None, ge=1), difficulty: str = '',
           ingredient: str = '', display: Literal['all', 'home', 'foods'] = 'all', include_drafts: bool = False,
           db: Session = Depends(get_db)):
    result = dish_data(db)
    if not include_drafts:
        result = [x for x in result if x.get('recipe')]
    ingredient_terms = [term.strip() for term in ingredient.split(',') if term.strip()]
    normalized_q = normalize_ingredient_text(q)
    def matches_query(item):
        if not normalized_q:
            return True
        text = normalize_ingredient_text(item['name'] + ' ' + item['description'])
        query_words = normalized_q.split()
        return normalized_q in text or all(any(word in part for part in text.split()) for word in query_words) or ingredient_similarity(normalized_q, item['name']) >= .45
    result = [x for x in result if matches_query(x)
              and (not category or x['category_id'] in category)
              and (max_time is None or x['time'] <= max_time)
              and (not difficulty or x['difficulty'] == difficulty)
              and (not ingredient_terms or any(ingredient_similarity(term, i['name']) >= .62
                   for term in ingredient_terms
                   for i in (x['recipe'] or {}).get('ingredients', [])))
              and (display == 'all' or x[display + '_display'])]
    if display != 'all':
        result.sort(key=lambda x: x[display + '_order'])
    return result

@router.get('/dishes/{dish_id}')
def dish(dish_id: str, user=Depends(current_user), db: Session = Depends(get_db)):
    require(db, m.MonAn, dish_id)
    result = next((x for x in dish_data(db) if x['id'] == dish_id and x.get('recipe')), None)
    if result is None:
        raise HTTPException(404, 'Món ăn chưa có công thức hoặc chưa được xuất bản.')
    result['is_favorited'] = db.scalar(select(m.MonYeuThich).where(
        m.MonYeuThich.maNguoiDung == user.maNguoiDung,
        m.MonYeuThich.maMonAn == dish_id)) is not None
    return result

@router.get('/dishes/{dish_id}/nutrition')
def nutrition(dish_id: str, servings: int = Query(default=1, ge=1, le=1000), db: Session = Depends(get_db)):
    return dish_nutrition(db, dish_id, servings, date.today())

@router.get('/dishes/{dish_id}/reviews')
def reviews(dish_id: str, db: Session = Depends(get_db)):
    require(db, m.MonAn, dish_id)
    people = {x.maNguoiDung: x.hoTen for x in rows(db, m.NguoiDung)}
    return [dict(id=x.maDanhGia, name=people[x.maNguoiDung], rating=x.soSao,
                 comment=x.noiDung, date=x.ngayDanhGia)
            for x in db.scalars(select(m.DanhGiaMonAn).where(
                                m.DanhGiaMonAn.maMonAn == dish_id,
                                m.DanhGiaMonAn.trangThaiKiemDuyet == 'Đã duyệt')
                                .order_by(m.DanhGiaMonAn.ngayDanhGia.desc()))]

@router.get('/recommendations')
def recommendations(mode: Literal['for_you', 'taste', 'quick', 'healthy', 'trending'] = 'for_you',
                    sort_by: Literal['popular', 'rating', 'favorites'] = 'popular',
                    direction: Literal['asc', 'desc'] = 'desc',
                    user=Depends(current_user), db: Session = Depends(get_db)):
    answers = load_preferences(db, user.maNguoiDung)
    if answers and mode in {'for_you', 'taste'}:
        if mode == 'taste':
            answers = {**answers, 'ingredients': [], 'occasions': [], 'tools': [], 'time': '',
                       'regions': [], 'budget': '', 'skill': '', 'meals': []}
        return rank_dishes(db, user.maNguoiDung, answers)
    if mode == 'healthy':
        mode = 'quick'
    result = [x for x in dish_data(db) if x.get('recipe')]
    hidden = set(db.scalars(select(m.MonKhongThich.maMonAn)
                           .where(m.MonKhongThich.maNguoiDung == user.maNguoiDung)))
    preferred = set()
    if mode == 'taste':
        tastes = set(db.scalars(select(m.SoThichKhauVi.maKhauVi).where(m.SoThichKhauVi.maNguoiDung == user.maNguoiDung)))
        preferred = {x.maMonAn for x in rows(db, m.KhauViMonAn) if x.maKhauVi in tastes}
    elif mode == 'quick':
        result = [x for x in result if x['time'] <= 20 and x['difficulty'] == 'Dễ']
    if mode == 'taste':
        result.sort(key=lambda x: (x['id'] not in preferred, x['id']))
    elif mode == 'trending':
        if sort_by == 'rating':
            result = [x for x in result if x['rating'] > 0]
        elif sort_by == 'favorites':
            result = [x for x in result if x['favorite_count'] >= 1]
        key = {'rating': lambda x: x['rating'], 'favorites': lambda x: x['favorite_count'], 'popular': lambda x: x['favorite_count'] + x['review_count']}[sort_by]
        result.sort(key=key, reverse=direction == 'desc')
    else:
        result.sort(key=lambda x: (-x['favorite_count'], -x['rating']))
    return [x for x in result if x['id'] not in hidden]



