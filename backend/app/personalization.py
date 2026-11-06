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
    'beef': ['bò'], 'vegetables': ['rau', 'chay', 'nấm'],
    'eggs': ['trứng'], 'tofu': ['đậu hũ', 'đậu phụ', 'tàu hũ'],
    'eggs_tofu': ['trứng', 'đậu hũ', 'đậu phụ', 'tàu hũ'],
    'savory': ['mặn', 'đậm đà', 'kho', 'muối'], 'spicy': ['cay', 'ớt'],
    'sweet_sour': ['chua', 'ngọt'], 'light': ['thanh', 'hấp', 'luộc'], 'rich': ['béo', 'cốt dừa', 'kem'],
    'children': ['trẻ', 'cháo', 'súp'], 'friends': ['nhậu', 'lẩu', 'nướng'],
    'stove': ['xào', 'chiên', 'kho', 'luộc', 'hấp', 'canh', 'cháo'],
    'air_fryer': ['nồi chiên không dầu'], 'pressure_cooker': ['hầm', 'nồi áp suất'],
    'oven': ['lò nướng'], 'no_cook': ['không cần nấu', 'salad', 'sinh tố'],
}

# The survey's diet choices must use the labels assigned to dishes in CheDoAn.
DIET_NAMES = {
    'balanced': {'cân bằng', 'nhiều rau củ'},
    'low_carb': {'ít tinh bột'},
    'vegetarian': {'ăn chay'},
}

DISH_TYPE_NAMES = {
    'rice_noodles': ('cơm', 'cháo', 'món nước'),
    'soup': ('món canh', 'canh và súp', 'món lẩu'),
    'salad': ('món gỏi', 'salad', 'món cuốn', 'món chay'),
    'snack': ('món bánh', 'ăn vặt'),
    'dessert': ('món chè', 'món kem', 'món tráng miệng', 'sinh tố', 'thức uống', 'nước ép'),
}

AVOID_INGREDIENTS = {
    'fish': ('cá', 'nước mắm', 'mắm cá', 'cá cơm'),
    'shellfish': ('tôm', 'cua', 'mực', 'nghêu', 'sò', 'ốc', 'hàu', 'mắm ruốc', 'mắm tôm'),
    'soy': ('đậu nành', 'đậu tương', 'đậu hũ', 'đậu phụ', 'tàu hũ', 'nước tương', 'xì dầu', 'sữa đậu nành'),
    'dairy': ('sữa', 'bơ lạt', 'bơ sữa', 'kem tươi', 'phô mai', 'váng sữa', 'whey'),
    'seafood_allergy': ('cá', 'tôm', 'cua', 'mực', 'nghêu', 'sò', 'ốc', 'hàu',
                        'hải sản', 'nước mắm', 'mắm ruốc', 'mắm tôm'),
    'peanut': ('đậu phộng', 'lạc'),
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


def matches(text, tag):
    # Compare complete words and phrases, preserving accents.
    return any(' ' + word + ' ' in ' ' + text + ' ' for word in WORDS.get(tag, []))


def matches_diet(dish, tag):
    names = {normalize(diet.get('name') or '') for diet in dish.get('diets', [])}
    if names & DIET_NAMES.get(tag, set()):
        return True
    # Older catalogs have no dish-to-diet links; these are ranking hints only.
    recipe = dish.get('recipe') or {}
    ingredients = normalize(' '.join(item.get('name') or '' for item in recipe.get('ingredients', [])))
    recipe_text = normalize(' '.join([dish.get('name') or '', ingredients, *(recipe.get('steps') or [])]))
    if tag == 'vegetarian':
        animal = ('thịt', 'gà', 'heo', 'bò', 'cá', 'tôm', 'cua', 'mực', 'sườn', 'nước mắm', 'mắm tôm')
        return bool(ingredients) and not any(' ' + term + ' ' in ' ' + recipe_text + ' ' for term in animal)
    if tag == 'low_carb':
        starch = ('gạo', 'cơm', 'bún', 'phở', 'mì', 'bánh', 'bột', 'khoai', 'đường', 'cháo')
        return bool(ingredients) and not any(' ' + term + ' ' in ' ' + ingredients + ' ' for term in starch)
    if tag == 'balanced':
        return any(term in ingredients for term in ('rau', 'cải', 'cà chua', 'dưa leo', 'nấm')) and \
            any(term in ingredients for term in ('thịt', 'gà', 'cá', 'trứng', 'đậu hũ', 'đậu phụ'))
    return False


def load_preferences(db, user_id):
    row = db.get(m.UserPreferences, user_id)
    if not row or not row.completed:
        return None
    answers = json.loads(row.answers)
    if not isinstance(answers, dict):
        return None
    if isinstance(answers.get('occasions'), list):
        # The former peanut option also covered soy; preserve that restriction.
        old_avoid = answers.get('avoid') or []
        if 'peanut' in old_avoid:
            answers['avoid'] = list(dict.fromkeys([*old_avoid, 'soy']))
    keys = ('ingredients', 'occasions', 'tastes', 'time', 'tools', 'dish_types', 'avoid', 'method', 'skill', 'meals')
    return answers if any(answers.get(key) for key in keys) else None


def rank_dishes(db, user_id, answers):
    if answers:
        diet = answers.get('occasions', '')
        if isinstance(diet, list):
            diet = next((tag for tag in ('low_carb', 'healthy', 'vegetarian') if tag in diet), 'none')
        answers = {key: answers.get(key, '' if key in {'time', 'method', 'skill'} else [])
                   for key in ('ingredients', 'tastes', 'time', 'tools', 'dish_types', 'avoid', 'method', 'skill', 'meals')}
        answers['occasions'] = 'balanced' if diet == 'healthy' else diet
    selected_diet = answers['occasions'] if answers and answers['occasions'] in DIET_NAMES else None
    hidden = set(db.scalars(select(m.MonKhongThich.maMonAn).where(m.MonKhongThich.maNguoiDung == user_id)))
    tastes = {x.maKhauVi: x.tenKhauVi or '' for x in db.scalars(select(m.KhauVi))}
    dish_tastes = {}
    for row in db.scalars(select(m.KhauViMonAn)):
        dish_tastes.setdefault(row.maMonAn, []).append(tastes.get(row.maKhauVi, ''))
    result = []
    for dish in dish_data(db):
        if (dish['id'] in hidden or not dish['recipe'] or
                (answers and conflicts_with_avoid(dish, answers['avoid'])) or
                (selected_diet == 'vegetarian' and not matches_diet(dish, selected_diet))):
            continue
        if not answers:
            result.append(dish)
            continue
        recipe = dish['recipe']
        ingredients = normalize(' '.join([dish['name'], *(i['name'] for i in recipe['ingredients'])]))
        text = normalize(' '.join([dish['name'], dish['description'], *recipe['steps']]))
        taste_text = normalize(' '.join(dish_tastes.get(dish['id'], [])) + ' ' + dish['description'] + ' ' + dish['name'])
        categories = normalize(' '.join(category['name'] for category in dish['categories']))
        hits = [any(matches(ingredients, tag) for tag in answers['ingredients'])]
        hits += [bool(selected_diet) and matches_diet(dish, selected_diet),
                 any(matches(taste_text, tag) for tag in answers['tastes'])]
        minutes = dish['time']
        hits += [bool(answers['time']) and minutes > 0 and (minutes < 15 if answers['time'] == 'quick' else 15 <= minutes <= 30 if answers['time'] == 'medium' else minutes > 30)]
        hits += [any(matches(text, tag) for tag in answers['tools'])]
        hits += [any(any(term in categories for term in DISH_TYPE_NAMES.get(tag, ())) for tag in answers['dish_types'])]
        method_terms = {'stir_fry': ('xào', 'áp chảo'), 'steam': ('hấp', 'luộc'),
                        'grill': ('nướng',), 'stew': ('hầm', 'kho')}
        method = answers['method']
        hits += [bool(method) and any(term in text for term in method_terms.get(method, ()))]
        difficulty = {'beginner': 'Dễ', 'basic': 'Trung bình', 'chef': 'Khó'}.get(answers['skill'])
        hits += [bool(difficulty) and dish['difficulty'] == difficulty]
        snack = any(term in categories for term in (*DISH_TYPE_NAMES['snack'], *DISH_TYPE_NAMES['dessert']))
        breakfast = any(normalize(diet.get('name') or '') == 'ăn sáng' for diet in dish['diets']) or \
            any(term in categories for term in ('cháo', 'món nước', 'món bánh'))
        hits += [any((tag == 'breakfast' and breakfast) or (tag == 'snack' and snack) or
                     (tag in {'lunch', 'dinner'} and not snack and not breakfast)
                     for tag in answers['meals'])]
        labels = ['Nguyên liệu yêu thích', 'Kiểu ăn uống', 'Khẩu vị', 'Thời gian nấu',
                  'Dụng cụ (suy luận từ công thức)', 'Nhóm món', 'Cách chế biến', 'Độ khó', 'Bữa ăn (ước lượng)']
        weights = [25, 15, 15, 10, 5, 10, 10, 5, 5]
        active = [bool(answers[k]) if k != 'occasions' else bool(selected_diet)
                  for k in ('ingredients', 'occasions', 'tastes', 'time', 'tools', 'dish_types', 'method', 'skill', 'meals')]
        total = sum(w for w, used in zip(weights, active) if used)
        score = round(100 * sum(weight for weight, hit in zip(weights, hits) if hit) / total) if total else 0
        result.append({**dish, 'match_percent': score, 'match_reasons': [label for label, hit in zip(labels, hits) if hit]})
    result.sort(key=lambda d: (-d.get('match_percent', 0), -d['favorite_count'], -d['rating'], d['id']))
    minimum_score = 20 if selected_diet else 30
    return [dish for dish in result if dish.get('match_percent', 0) >= minimum_score][:10]
