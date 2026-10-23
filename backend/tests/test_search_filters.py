from app.routers import catalog


def test_search_uses_recipe_ingredients_without_fuzzy_false_positives(monkeypatch):
    sample = [
        {'id': 'BO', 'name': 'Phở bò viên', 'description': '', 'category_id': '1',
         'time': 120, 'difficulty': 'Khó', 'recipe': {'ingredients': [{'name': 'Thịt bò'}]}},
        {'id': 'GA', 'name': 'Salad ức gà', 'description': '', 'category_id': '1',
         'time': 20, 'difficulty': 'Dễ', 'recipe': {'ingredients': [{'name': 'Ức gà'}, {'name': 'Cà chua'}]}},
        {'id': 'SUP', 'name': 'Súp bí đỏ', 'description': '', 'category_id': '1',
         'time': 35, 'difficulty': 'Trung bình', 'recipe': {'ingredients': [{'name': 'Bí đỏ'}]}},
    ]
    monkeypatch.setattr(catalog, 'dish_data', lambda _: sample)
    common = dict(db=object(), category=[], max_time=None, calories=None,
                  display='all', include_drafts=False)
    assert [dish['id'] for dish in catalog.dishes(q='phở bò', **common)] == ['BO']
    assert [dish['id'] for dish in catalog.dishes(ingredient='Thịt gà', **common)] == ['GA']
    assert [dish['id'] for dish in catalog.dishes(ingredient='Thịt gà,Cà chua', **common)] == ['GA']
    assert catalog.dishes(ingredient='Thịt gà,Bí đỏ', **common) == []


def test_calorie_limit_uses_one_serving_and_excludes_unknown(monkeypatch):
    sample = [
        {'id': id, 'name': id, 'description': '', 'category_id': '1',
         'time': 20, 'difficulty': 'Dễ', 'recipe': {'ingredients': []}}
        for id in ('LOW', 'HIGH', 'UNKNOWN')
    ]
    monkeypatch.setattr(catalog, 'dish_data', lambda _: sample)
    calls = []
    def nutrition(_, dish_id, servings, __):
        calls.append((dish_id, servings))
        value = {'LOW': 400, 'HIGH': 600}.get(dish_id)
        return {'totals': {'nang_luong': value} if value is not None else None}
    monkeypatch.setattr(catalog, 'dish_nutrition', nutrition)
    result = catalog.dishes(db=object(), category=[], max_time=None, calories=500,
                            display='all', include_drafts=False)
    assert [dish['id'] for dish in result] == ['LOW']
    assert calls == [('LOW', 1), ('HIGH', 1), ('UNKNOWN', 1)]
