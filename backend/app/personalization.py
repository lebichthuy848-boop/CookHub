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


AVOID_WORDS = {
    'seafood_allergy': ['cá', 'tôm', 'cua', 'mực', 'nghêu', 'sò', 'ốc', 'hàu', 'hải sản', 'cá ngừ'],
    'peanut': ['đậu phộng', 'lạc', 'đậu nành', 'đậu tương', 'dầu đậu nành', 'bơ đậu phộng', 'nước tương', 'xì dầu', 'đậu hũ', 'đậu phụ'],
    'lactose': ['sữa', 'phô mai', 'pho mai', 'kem', 'bơ', 'sữa chua', 'sữa đặc'],
    'spicy_avoid': ['ớt', 'sa tế', 'tương ớt', 'ớt bột'],
}


def contains_phrase(text, phrases):
    return any(' ' + phrase + ' ' in ' ' + text + ' ' for phrase in phrases)


def conflicts_with_avoid(dish, avoid):
    selected = set(avoid or []) - {'none'}
    if not selected:
        return False
    recipe = dish.get('recipe') or {}
    # Include the dish name: imported recipes can have an incomplete ingredient list.
    ingredients = normalize(' '.join(i['name'] for i in recipe.get('ingredients', [])) + ' ' + dish['name'])
    return any(contains_phrase(ingredients, AVOID_WORDS[tag]) for tag in selected if tag in AVOID_WORDS)


REGION_WORDS = {
    'north': ['miền bắc', 'hà nội', 'bắc bộ'], 'central': ['miền trung', 'huế', 'quảng nam', 'đà nẵng'],
    'south': ['miền nam', 'miền tây', 'sài gòn', 'nam bộ'],
    'asia': ['món á', 'hàn quốc', 'nhật bản', 'trung quốc', 'thái lan', 'việt nam'],
    'western': ['món âu', 'ý', 'pháp', 'pasta', 'pizza'],
}


MEAL_WORDS = {
    'breakfast': ['phở', 'bún', 'mì', 'cháo', 'bánh mì'],
    'lunch': ['cơm', 'bún', 'mì', 'canh'],
    'dinner': ['cơm', 'canh', 'lẩu', 'salad'],
    'snack': ['ăn nhẹ', 'tráng miệng', 'đồ uống', 'sinh tố', 'bánh'],
}


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
        if dish['id'] in hidden or not dish['recipe'] or (answers and conflicts_with_avoid(dish, answers.get('avoid'))):
            continue
        if not answers:
            result.append(dish)
            continue
        recipe = dish['recipe']
        ingredients = normalize(' '.join(i['name'] for i in recipe['ingredients']) or dish['name'])
        text = normalize(' '.join([dish['name'], dish['description'], *recipe['steps']]))
        taste_text = normalize(' '.join(dish_tastes.get(dish['id'], [])) + ' ' + dish['description'] + ' ' + dish['name'])
        diet_text = normalize(' '.join(d['name'] or '' for d in dish['diets']))
        hits = [any(matches(ingredients, tag) for tag in answers.get('ingredients', []))]
        occasion = any(
            (tag == 'solo' and recipe['servings'] == 1) or
            (tag == 'family' and recipe['servings'] >= 2) or
            (tag in {'healthy', 'low_carb'} and matches(diet_text, tag)) or
            (tag in {'children', 'friends'} and matches(text, tag))
            for tag in answers.get('occasions', []))
        hits += [occasion, any(matches(taste_text, tag) for tag in answers.get('tastes', []))]
        minutes = dish['time']
        preferred_time = answers.get('time', '')
        hits += [bool(preferred_time) and minutes > 0 and (minutes < 15 if preferred_time == 'quick' else 15 <= minutes <= 30 if preferred_time == 'medium' else minutes > 45)]
        hits += [any(matches(text, tag) for tag in answers.get('tools', []))]
        labels = ['Nguyên liệu ưa thích', 'Bối cảnh / chế độ ăn', 'Khẩu vị', 'Thời gian nấu', 'Dụng cụ (suy luận từ công thức)']
        weights = [30, 20, 20, 20, 10]
        active = [bool(answers.get(k)) for k in ['ingredients', 'occasions', 'tastes', 'time', 'tools']]
        # The remaining survey answers affect ranking when there is enough dish data.
        combined = normalize(dish['name'] + ' ' + dish['category'] + ' ' + dish['description'])
        regions = answers.get('regions', [])
        meals = answers.get('meals', [])
        budget = answers.get('budget', '')
        skill = answers.get('skill', '')
        cost = dish.get('cost') or 0
        hits += [any(contains_phrase(combined, REGION_WORDS.get(tag, [])) for tag in regions)]
        hits += [bool(cost) and (cost < 50000 if budget == 'saving' else cost <= 150000 if budget == 'normal' else cost > 150000)]
        hits += [dish['difficulty'] in ({'beginner': {'Dễ'}, 'basic': {'Dễ', 'Trung bình'}, 'chef': {'Dễ', 'Trung bình', 'Khó'}}.get(skill, set()))]
        hits += [any(contains_phrase(combined, MEAL_WORDS.get(tag, [])) for tag in meals)]
        labels += ['Vùng miền / phong cách', 'Ngân sách', 'Kỹ năng nấu', 'Loại bữa ăn']
        weights += [10, 10, 10, 10]
        active += [bool(regions), bool(budget and cost), bool(skill), bool(meals)]
        total = sum(w for w, used in zip(weights, active) if used)
        score = round(100 * sum(weight for weight, hit in zip(weights, hits) if hit) / total) if total else 0
        result.append({**dish, 'match_percent': score, 'match_reasons': [label for label, hit in zip(labels, hits) if hit]})
    result.sort(key=lambda d: (-d.get('match_percent', 0), -d['favorite_count'], -d['rating'], d['id']))
    return [dish for dish in result if dish.get('match_percent', 0) >= 30][:10]
