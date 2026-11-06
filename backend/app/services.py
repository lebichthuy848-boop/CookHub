from pathlib import PurePosixPath
from difflib import SequenceMatcher
import re
import unicodedata
from urllib.parse import urlparse
from .cloudinary_media import cloudinary_image_url, original_image_path, is_cloudinary_image, image_map
from uuid import uuid4
from fastapi import HTTPException
from sqlalchemy import select, delete, text
from . import models as m
from .config import MEDIA_ROOT

def new_id(prefix):
    return (prefix + uuid4().hex)[:20]

def allocate_code(db, kind, fallback_prefix=None):
    """Allocate a schema-compliant code through SQL Server's locked allocator.

    SQLite test databases do not contain SpCapMaMoi, so they retain the old
    test-only fallback. Production SQL Server writes always use this path.
    """
    if db.bind is not None and db.bind.dialect.name == 'mssql':
        result = db.execute(text('''DECLARE @MaMoi NVARCHAR(20);
            EXEC dbo.SpCapMaMoi @LoaiMa=:kind, @MaMoi=@MaMoi OUTPUT;
            SELECT @MaMoi AS MaMoi;'''),
                            {'kind': kind}).mappings().first()
        value = result.get('MaMoi') if result else None
        if not value:
            raise RuntimeError(f'SpCapMaMoi không trả về mã cho {kind}')
        return value
    return new_id(fallback_prefix or kind[:3].upper())

def require(db, model, key):
    row = db.get(model, key)
    if row is None:
        raise HTTPException(404, 'Không tìm thấy dữ liệu.')
    return row

def rows(db, model):
    return list(db.scalars(select(model)))

INGREDIENT_ALIASES = {
    'thit lon': 'thit heo', 'heo': 'thit heo', 'canh ga': 'thit ga',
    'ga ta': 'thit ga', 'xi dau': 'nuoc tuong', 'tuong dau': 'nuoc tuong',
    'ca chua bi': 'ca chua', 'tom': 'tom tuoi', 'rau xanh': 'rau cai'
}

def normalize_ingredient_text(value):
    value = (value or '').strip().casefold().replace('đ', 'd')
    value = ''.join(char for char in unicodedata.normalize('NFKD', value)
                    if not unicodedata.combining(char))
    value = re.sub(r'[^a-z0-9]+', ' ', value).strip()
    return INGREDIENT_ALIASES.get(value, value)

def ingredient_similarity(left, right):
    left, right = normalize_ingredient_text(left), normalize_ingredient_text(right)
    if not left or not right:
        return 0
    if left == right:
        return 1
    if left in right or right in left:
        return .9
    left_words, right_words = set(left.split()), set(right.split())
    token_score = len(left_words & right_words) / max(1, len(left_words | right_words))
    return max(token_score, SequenceMatcher(None, left, right).ratio())

def _image_slug(value):
    value = (value or '').replace('đ', 'd').replace('Đ', 'D')
    normalized = unicodedata.normalize('NFKD', value or '')
    ascii_text = ''.join(char for char in normalized if not unicodedata.combining(char))
    return re.sub(r'[^a-z0-9]+', '-', ascii_text.lower()).strip('-')

def local_image(path, dish_name=None):
    if is_cloudinary_image(path):
        return path
    path = (path or '').replace('\\', '/').lstrip('/')
    cloud_url = cloudinary_image_url(path)
    if cloud_url:
        return cloud_url
    target = (MEDIA_ROOT / path).resolve()
    image_root = (MEDIA_ROOT / 'images').resolve()
    if target.is_relative_to(image_root) and target.is_file():
        return path
    # Resolve legacy database paths from the dish name in the canonical
    # images/mon-an directory.
    slug = _image_slug(dish_name)
    if slug:
        for extension in ('jpg', 'png', 'webp', 'jpeg'):
            candidate = image_root / 'mon-an' / f'{slug}.{extension}'
            cloud_url = cloudinary_image_url(f'images/mon-an/{slug}.{extension}')
            if cloud_url:
                return cloud_url
            if candidate.is_file():
                return f'images/mon-an/{slug}.{extension}'
    return 'images/logo.jpg'

def local_images(path, dish_name=None):
    """Return only image variants belonging to this dish."""
    primary = local_image(path, dish_name)
    slug = _image_slug(dish_name)
    if not slug:
        return [primary]
    primary_path = PurePosixPath(original_image_path(primary) or primary or '')
    if not primary_path.parts or primary_path.parts[0] != 'images':
        return [primary]
    root = (MEDIA_ROOT / primary_path.parent).resolve()
    variant_slug = primary_path.stem
    variants = []
    for extension in ('jpg', 'png', 'webp', 'jpeg'):
        prefix = str(primary_path.parent / f'{variant_slug}-')
        for local_path, url in sorted(image_map().items()):
            if local_path.startswith(prefix) and re.fullmatch(
                    r'\d+\.' + extension, local_path[len(prefix):]):
                variants.append(url)
        for candidate in sorted(root.glob(f'{variant_slug}-*.{extension}')):
            if not re.fullmatch(re.escape(variant_slug) + r'-\d+\.' + extension, candidate.name):
                continue
            local_path = str(primary_path.parent / candidate.name)
            url = cloudinary_image_url(local_path) or local_path
            if url not in variants:
                variants.append(url)
    if primary not in variants and primary != 'images/logo.jpg':
        variants.insert(0, primary)
    return variants or [primary]

def validate_media(path, kind='image'):
    parsed = urlparse(path)
    if kind == 'image' and is_cloudinary_image(path):
        return path
    if kind == 'image':
        mapped = cloudinary_image_url(path)
        if mapped:
            return mapped
    if kind == 'video' and parsed.scheme in {'http', 'https'} and parsed.netloc:
        return path
    clean = PurePosixPath(path.replace('\\', '/'))
    allowed = ('images',) if kind == 'image' else ('videos',)
    if clean.is_absolute() or '..' in clean.parts or not clean.parts or clean.parts[0] not in allowed:
        raise HTTPException(422, 'Đường dẫn tệp không hợp lệ.')
    target = (MEDIA_ROOT / clean).resolve()
    if not target.is_relative_to((MEDIA_ROOT / allowed[0]).resolve()) or not target.is_file():
        raise HTTPException(422, 'Tệp không tồn tại. Hãy tải tệp lên trước.')
    return str(clean)

def recipe_data(db):
    ingredients = {x.maNguyenLieu: x for x in rows(db, m.NguyenLieu)}
    units = {x.maDonVi: x for x in rows(db, m.DonViTinh)}
    components, steps, videos = {}, {}, {}
    for x in rows(db, m.ThanhPhanCongThuc):
        recipe_key = (x.maCongThuc or '').strip().upper()
        components.setdefault(recipe_key, []).append(dict(
            name=(ingredients[x.maNguyenLieu].tenNguyenLieu + ('\n' + (ingredients[x.maNguyenLieu].moTa or '').strip() if (ingredients[x.maNguyenLieu].moTa or '').strip().startswith('(') else '')), note=((ingredients[x.maNguyenLieu].moTa or '').strip() if (ingredients[x.maNguyenLieu].moTa or '').strip().startswith('(') else ''), ingredient_id=x.maNguyenLieu,
            quantity=float(x.soLuong or 0), unit_id=x.maDonVi, unit=units[x.maDonVi].kyHieu))
    for x in sorted(rows(db, m.BuocCheBien), key=lambda x: x.thuTu or 0):
        recipe_key = (x.maCongThuc or '').strip().upper()
        steps.setdefault(recipe_key, []).append(x.noiDung)
    for x in rows(db, m.DoanPhimHuongDan):
        recipe_key = (x.maCongThuc or '').strip().upper()
        videos.setdefault(recipe_key, []).append(dict(id=x.maDoanPhim, recipe_id=recipe_key,
            title=x.tieuDe, path=x.duongDan, description=x.moTa or ''))
    return [dict(id=(x.maCongThuc or '').strip().upper(), dish_id=x.maMonAn, description=x.moTa or '',
                 image=local_image(x.duongDanAnh, x.maCongThuc) if x.duongDanAnh else None,
                 servings=x.soKhauPhanChuan or 1, ingredients=components.get((x.maCongThuc or '').strip().upper(), []),
                 steps=steps.get((x.maCongThuc or '').strip().upper(), []), videos=videos.get((x.maCongThuc or '').strip().upper(), []))
            for x in rows(db, m.CongThuc)]

def dish_data(db):
    categories = {x.maDanhMuc: x.tenDanhMuc for x in rows(db, m.DanhMucMonAn)}
    dish_categories = {}
    for link in rows(db, m.MonAnDanhMuc):
        dish_categories.setdefault(link.maMonAn, []).append(link.maDanhMuc)
    recipes = {x['dish_id']: x for x in recipe_data(db)}
    reviews, favorites, diets = {}, {}, {}
    diet_names = {x.maCheDoAn: x.tenCheDoAn for x in rows(db, m.CheDoAn)}
    for x in db.scalars(select(m.DanhGiaMonAn).where(m.DanhGiaMonAn.trangThaiKiemDuyet == 'Đã duyệt')):
        reviews.setdefault(x.maMonAn, []).append(x.soSao or 0)
    for x in rows(db, m.MonYeuThich):
        favorites[x.maMonAn] = favorites.get(x.maMonAn, 0) + 1
    for x in rows(db, m.CheDoAnMonAn):
        diets.setdefault(x.maMonAn, []).append(dict(id=x.maCheDoAn, name=diet_names[x.maCheDoAn]))
    result = []
    for x in rows(db, m.MonAn):
        category_ids = list(dict.fromkeys([
            x.maDanhMuc,
            *dish_categories.get(x.maMonAn, []),
        ]))
        recipe = recipes.get(x.maMonAn)
        ratings = reviews.get(x.maMonAn, [])
        step_count = len(recipe['steps']) if recipe else 0
        cooking_time = x.thoiGianCheBien or 0
        auto_difficulty = 'Dễ' if cooking_time < 30 and step_count <= 5 else 'Khó' if cooking_time > 60 or step_count > 10 else 'Trung bình'
        result.append(dict(id=x.maMonAn, name=x.tenMonAn, category_id=x.maDanhMuc,
            category_ids=category_ids,
            categories=[dict(id=category_id, name=categories[category_id])
                        for category_id in category_ids if category_id in categories],
            category=' · '.join(dict.fromkeys(categories[category_id] for category_id in category_ids if category_id in categories)) or categories[x.maDanhMuc], description=x.moTa or '', prep_time=x.thoiGianChuanBi or 0, time=cooking_time,
            difficulty=auto_difficulty, step_count=step_count, image=local_image(x.duongDanAnh, x.tenMonAn), images=local_images(x.duongDanAnh, x.tenMonAn), rating=round(sum(ratings)/len(ratings), 1) if ratings else 0,
            review_count=len(ratings), favorite_count=favorites.get(x.maMonAn, 0),
            diets=diets.get(x.maMonAn, []), recipe=recipe,
            home_display=True, foods_display=True, home_order=0, foods_order=0))
    return result

def resolve_ingredient(db, name, group=None):
    clean_name = ' '.join(name.strip().split())
    ingredients = rows(db, m.NguyenLieu)
    normalized_name = unicodedata.normalize('NFC', clean_name).casefold()
    row = next((item for item in ingredients
                if unicodedata.normalize('NFC', ' '.join(item.tenNguyenLieu.strip().split())).casefold() == normalized_name), None)
    if row is None:
        description = f'Nguyên liệu do người dùng bổ sung · Nhóm: {group}' if group else 'Nguyên liệu do người dùng bổ sung'
        row = m.NguyenLieu(maNguyenLieu=allocate_code(db, 'NguyenLieu', 'NL'), tenNguyenLieu=clean_name, moTa=description)
        db.add(row)
        db.flush()
    return row

def save_recipe(db, data, recipe_id=None, commit=True):
    require(db, m.MonAn, data.dish_id)
    record = require(db, m.CongThuc, recipe_id) if recipe_id else m.CongThuc(maCongThuc=allocate_code(db, 'CongThuc', 'CT'), daCongBo=0)
    record.maMonAn, record.moTa, record.soKhauPhanChuan = data.dish_id, data.description, data.servings
    record.daCongBo = 0
    db.add(record)
    db.flush()
    for model in (m.ThanhPhanCongThuc, m.BuocCheBien):
        db.execute(delete(model).where(model.maCongThuc == record.maCongThuc))
    for item in data.ingredients:
        require(db, m.DonViTinh, item.unit_id)
        ingredient = resolve_ingredient(db, item.name)
        db.add(m.ThanhPhanCongThuc(maThanhPhan=allocate_code(db, 'ThanhPhanCongThuc', 'TP'), maCongThuc=record.maCongThuc,
               maNguyenLieu=ingredient.maNguyenLieu, maDonVi=item.unit_id, soLuong=item.quantity))
    for order, text in enumerate(data.steps, 1):
        if not text.strip():
            raise HTTPException(422, 'Bước chế biến không được để trống.')
        db.add(m.BuocCheBien(maBuoc=allocate_code(db, 'BuocCheBien', 'BCB'), maCongThuc=record.maCongThuc, thuTu=order, noiDung=text))
    db.flush()
    record.daCongBo = 1
    if commit:
        db.commit()
    else:
        db.flush()
    return {'id': record.maCongThuc}

def delete_recipe(db, recipe_id):
    require(db, m.CongThuc, recipe_id)
    for model in (m.DoanPhimHuongDan, m.ThanhPhanCongThuc, m.BuocCheBien):
        db.execute(delete(model).where(model.maCongThuc == recipe_id))
    db.execute(delete(m.CongThuc).where(m.CongThuc.maCongThuc == recipe_id))

def delete_dish(db, dish_id):
    require(db, m.MonAn, dish_id)
    for key in db.scalars(select(m.CongThuc.maCongThuc).where(m.CongThuc.maMonAn == dish_id)):
        delete_recipe(db, key)
    for model in (m.DanhGiaMonAn, m.MonYeuThich, m.MonKhongThich,
                  m.KhauViMonAn, m.CheDoAnMonAn, m.ChiTietThucDon):
        db.execute(delete(model).where(model.maMonAn == dish_id))
    db.execute(delete(m.MonAn).where(m.MonAn.maMonAn == dish_id))
    db.commit()






