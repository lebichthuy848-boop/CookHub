"""Validated preference storage and deterministic, explainable recipe ranking."""
import json
import unicodedata
import re
from sqlalchemy import select
from . import models as m
from .services import dish_data


def normalize(text):
    # Preserve Vietnamese accents to distinguish cá/cà and bò/bơ.
    text = unicodedata.normalize('NFC', text.casefold())
    return ' '.join(re.sub(r'[^\w\s-]', ' ', text).split())


WORDS = {
    'chicken': ['gà'], 'pork': ['heo', 'lợn', 'sườn'], 'seafood': ['cá', 'tôm', 'cua', 'mực', 'hải sản'],
    'beef': ['bò'], 'vegetables': ['rau', 'chay', 'nấm'], 'eggs_tofu': ['trứng', 'đậu hũ', 'đậu phụ'],
    'savory': ['mặn', 'đậm đà', 'kho', 'muối'], 'spicy': ['cay', 'ớt'],
    'sweet_sour': ['chua', 'ngọt'], 'light': ['thanh', 'hấp', 'luộc'], 'rich': ['béo', 'cốt dừa', 'kem'],
    'healthy': ['healthy', 'ăn kiêng', 'ít béo', 'eat clean'], 'low_carb': ['low carb', 'low-carb', 'keto', 'eat clean'],
    'children': ['trẻ', 'cháo', 'súp'], 'friends': ['nhậu', 'lẩu', 'nướng'],
    'stove': ['xào', 'chiên', 'kho', 'luộc', 'hấp', 'canh', 'cháo'],
    'air_fryer': ['nồi chiên không dầu'], 'pressure_cooker': ['hầm', 'nồi áp suất'],
    'oven': ['lò nướng'], 'no_cook': ['không cần nấu', 'salad', 'sinh tố'],
}


def matches(text, tag):
    # Compare complete words and phrases, preserving accents.
    return any(' ' + word + ' ' in ' ' + text + ' ' for word in WORDS.get(tag, []))


def load_preferences(db, user_id):
    row = db.get(m.UserPreferences, user_id)
    return json.loads(row.answers) if row and row.completed else None


def rank_dishes(db, user_id, answers):
    hidden = set(db.scalars(select(m.MonKhongThich.maMonAn).where(m.MonKhongThich.maNguoiDung == user_id)))
    tastes = {x.maKhauVi: x.tenKhauVi or '' for x in db.scalars(select(m.KhauVi))}
    dish_tastes = {}
    for row in db.scalars(select(m.KhauViMonAn)):
        dish_tastes.setdefault(row.maMonAn, []).append(tastes.get(row.maKhauVi, ''))
    result = []
    for dish in dish_data(db):
        if dish['id'] in hidden or not dish['recipe']:
            continue
        if not answers:
            result.append(dish)
            continue
        recipe = dish['recipe']
        ingredients = normalize(' '.join(i['name'] for i in recipe['ingredients']) or dish['name'])
        text = normalize(' '.join([dish['name'], dish['description'], *recipe['steps']]))
        taste_text = normalize(' '.join(dish_tastes.get(dish['id'], [])) + ' ' + dish['description'] + ' ' + dish['name'])
        diet_text = normalize(' '.join(d['name'] or '' for d in dish['diets']))
        hits = [any(matches(ingredients, tag) for tag in answers['ingredients'])]
        occasion = any(
            (tag == 'solo' and recipe['servings'] == 1) or
            (tag == 'family' and recipe['servings'] >= 2) or
            (tag in {'healthy', 'low_carb'} and matches(diet_text, tag)) or
            (tag in {'children', 'friends'} and matches(text, tag))
            for tag in answers['occasions'])
        hits += [occasion, any(matches(taste_text, tag) for tag in answers['tastes'])]
        minutes = dish['time']
        hits += [bool(answers['time']) and minutes > 0 and (minutes < 15 if answers['time'] == 'quick' else 15 <= minutes <= 30 if answers['time'] == 'medium' else minutes > 45)]
        hits += [any(matches(text, tag) for tag in answers['tools'])]
        labels = ['Nguyên liệu ưa thích', 'Bối cảnh / chế độ ăn', 'Khẩu vị', 'Thời gian nấu', 'Dụng cụ (suy luận từ công thức)']
        weights = [30, 20, 20, 20, 10]
        active = [bool(answers[k]) for k in ['ingredients', 'occasions', 'tastes', 'time', 'tools']]
        total = sum(w for w, used in zip(weights, active) if used)
        score = round(100 * sum(weight for weight, hit in zip(weights, hits) if hit) / total) if total else 0
        result.append({**dish, 'match_percent': score, 'match_reasons': [label for label, hit in zip(labels, hits) if hit]})
    result.sort(key=lambda d: (-d.get('match_percent', 0), -d['favorite_count'], -d['rating'], d['id']))
    return [dish for dish in result if dish.get('match_percent', 0) >= 30][:10]
