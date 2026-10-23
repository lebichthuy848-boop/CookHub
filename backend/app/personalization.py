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
    'children': ['trẻ', 'cháo', 'súp'], 'friends': ['nhậu', 'lẩu', 'nướng'],
    'stove': ['xào', 'chiên', 'kho', 'luộc', 'hấp', 'canh', 'cháo'],
    'air_fryer': ['nồi chiên không dầu'], 'pressure_cooker': ['hầm', 'nồi áp suất'],
    'oven': ['lò nướng'], 'no_cook': ['không cần nấu', 'salad', 'sinh tố'],
}

# The survey's diet choices must use the labels assigned to dishes in CheDoAn.
DIET_NAMES = {
    'healthy': {'cân bằng', 'nhiều rau củ'},
    'low_carb': {'ít tinh bột'},
}

AVOID_INGREDIENTS = {
    'seafood_allergy': ('cá', 'tôm', 'cua', 'mực', 'nghêu', 'sò', 'ốc', 'hàu',
                        'hải sản', 'nước mắm', 'mắm ruốc', 'mắm tôm'),
    'peanut': ('đậu phộng', 'lạc', 'đậu nành', 'đậu tương', 'đậu hũ', 'đậu phụ',
               'tàu hũ', 'nước tương', 'xì dầu', 'sữa đậu nành'),
    'lactose': ('sữa', 'bơ lạt', 'bơ sữa', 'kem tươi', 'phô mai', 'váng sữa', 'whey'),
    'spicy_avoid': ('ớt', 'sa tế', 'tương ớt'),
}


def conflicts_with_avoid(dish, avoid):
    selected = set(avoid or []) - {'none'}
    if not selected:
        return False
    recipe = dish.get('recipe') or {}
    ingredient_names = [item.get('name') or '' for item in recipe.get('ingredients', [])]
    text = normalize(' '.join([dish.get('name') or '', *ingredient_names,
                               *(recipe.get('steps') or [])]))
    return any(' ' + normalize(term) + ' ' in ' ' + text + ' '
               for tag in selected for term in AVOID_INGREDIENTS.get(tag, ()))


def within_budget(dish, budget):
    limit = {'saving': 50000, 'normal': 150000}.get(budget)
    if limit is None:
        return True
    cost = dish.get('cost')
    if cost is None:
        return False
    servings = (dish.get('recipe') or {}).get('servings') or 1
    per_serving = cost / servings
    return per_serving < limit if budget == 'saving' else per_serving <= limit


def matches(text, tag):
    # Compare complete words and phrases, preserving accents.
    return any(' ' + word + ' ' in ' ' + text + ' ' for word in WORDS.get(tag, []))


def matches_diet(dish, tag):
    names = {normalize(diet.get('name') or '') for diet in dish.get('diets', [])}
    return bool(names & DIET_NAMES.get(tag, set()))


def load_preferences(db, user_id):
    row = db.get(m.UserPreferences, user_id)
    if not row or not row.completed:
        return None
    answers = json.loads(row.answers)
    if not isinstance(answers, dict):
        return None
    keys = ('ingredients', 'occasions', 'tastes', 'time', 'tools', 'avoid', 'budget')
    return answers if any(answers.get(key) for key in keys) else None


def rank_dishes(db, user_id, answers):
    if answers:
        answers = {key: answers.get(key, '' if key in {'time', 'budget'} else [])
                   for key in ('ingredients', 'occasions', 'tastes', 'time', 'tools', 'avoid', 'budget')}
    selected_diets = set(answers['occasions']) & DIET_NAMES.keys() if answers else set()
    hidden = set(db.scalars(select(m.MonKhongThich.maMonAn).where(m.MonKhongThich.maNguoiDung == user_id)))
    tastes = {x.maKhauVi: x.tenKhauVi or '' for x in db.scalars(select(m.KhauVi))}
    dish_tastes = {}
    for row in db.scalars(select(m.KhauViMonAn)):
        dish_tastes.setdefault(row.maMonAn, []).append(tastes.get(row.maKhauVi, ''))
    result = []
    for dish in dish_data(db):
        if (dish['id'] in hidden or not dish['recipe'] or
                (answers and (conflicts_with_avoid(dish, answers['avoid']) or
                              not within_budget(dish, answers['budget']))) or
                (selected_diets and not any(matches_diet(dish, tag) for tag in selected_diets))):
            continue
        if not answers:
            result.append(dish)
            continue
        recipe = dish['recipe']
        ingredients = normalize(' '.join(i['name'] for i in recipe['ingredients']) or dish['name'])
        text = normalize(' '.join([dish['name'], dish['description'], *recipe['steps']]))
        taste_text = normalize(' '.join(dish_tastes.get(dish['id'], [])) + ' ' + dish['description'] + ' ' + dish['name'])
        hits = [any(matches(ingredients, tag) for tag in answers['ingredients'])]
        occasion = any(
            (tag == 'solo' and recipe['servings'] == 1) or
            (tag == 'family' and recipe['servings'] >= 2) or
            (tag in DIET_NAMES and matches_diet(dish, tag)) or
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
    minimum_score = 20 if selected_diets else 30
    return [dish for dish in result if dish.get('match_percent', 0) >= minimum_score][:10]
