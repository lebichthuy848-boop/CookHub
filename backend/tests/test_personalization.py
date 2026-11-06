from conftest import login

ANSWERS = {'ingredients':['chicken'], 'occasions':'none', 'tastes':['savory'], 'time':'medium', 'tools':['stove']}

def test_registration_autologin_and_one_time_survey(client):
    result = client.post('/api/auth/register', json={'name':'New', 'email':'new@test.local', 'password':'longpassword'})
    assert result.status_code == 201
    assert 'cookhub_session=' in result.headers['set-cookie']
    assert 'HttpOnly' in result.headers['set-cookie']
    assert result.json()['survey_pending'] is True
    assert client.get('/api/auth/me').json()['id'] == result.json()['id']
    assert client.post('/api/v1/user/survey/claim').json() == {'show':True}
    assert client.post('/api/v1/user/survey/claim').json() == {'show':False}
    assert client.get('/api/auth/me').json()['survey_pending'] is False
    assert client.get('/api/auth/me').json()['has_completed_survey'] is False

def test_existing_users_not_forced_into_survey_and_preferences_persist(client):
    login(client)
    assert client.post('/api/v1/user/survey/claim').json() == {'show':False}
    assert client.post('/api/v1/user/preferences',json=ANSWERS).json()['has_completed_survey'] is True
    assert client.get('/api/v1/user/preferences').json()['answers'] == ANSWERS
    updated = {**ANSWERS,'time':'quick'}
    assert client.post('/api/v1/user/preferences',json=updated).status_code == 200
    assert client.get('/api/v1/user/preferences').json()['answers'] == updated
    client.post('/api/auth/logout')
    login(client)
    assert client.get('/api/auth/me').json()['has_completed_survey'] is True


def test_all_ten_survey_answers_are_saved_and_returned(client):
    login(client)
    answers = {**ANSWERS, 'dish_types': ['rice_noodles'], 'avoid': ['none'],
               'method': 'stir_fry', 'skill': 'beginner', 'meals': ['breakfast']}
    result = client.post('/api/v1/user/onboarding-preferences', json=answers)
    assert result.status_code == 200
    assert result.json()['has_completed_survey'] is True
    assert client.get('/api/v1/user/preferences').json()['answers'] == answers
    assert client.get('/api/recommendations?mode=for_you').status_code == 200

def test_preview_is_readonly_scored_and_excludes_hidden(client):
    login(client)
    dishes = client.post('/api/v1/user/preferences/preview',json=ANSWERS).json()
    assert dishes[0]['id']=='MA001'
    assert dishes[0]['match_percent']==64  # chicken 25 + medium 10, divided by active weights 55
    assert client.get('/api/v1/user/preferences').json()['answers'] is None
    assert client.post('/api/v1/user/preferences',json=ANSWERS).status_code == 200
    assert client.get('/api/recommendations').json()[0]['match_percent']==64
    client.put('/api/hidden/MA001')
    assert client.post('/api/v1/user/preferences/preview',json=ANSWERS).json() == []

def test_preference_validation_and_authentication(client):
    assert client.post('/api/v1/user/preferences',json=ANSWERS).status_code==401
    login(client)
    for bad in [{**ANSWERS,'time':'invalid'}, {**ANSWERS,'tools':[]}, {**ANSWERS,'ingredients':['unknown']}, {**ANSWERS,'user_id':'someone'}]:
        assert client.post('/api/v1/user/preferences',json=bad).status_code==422

def test_preferences_isolate_users(client):
    login(client)
    client.post('/api/v1/user/preferences',json=ANSWERS)
    client.post('/api/auth/register',json={'name':'Other','email':'other@test.local','password':'longpassword'})
    assert client.get('/api/v1/user/preferences').json()['answers'] is None

def test_accented_ingredient_matching_is_precise():
    from app.personalization import normalize, matches
    assert matches(normalize('Thịt gà, nấm'), 'chicken')
    assert matches(normalize('Cá hồi'), 'seafood')
    assert not matches(normalize('Cà chua'), 'seafood')
    assert not matches(normalize('Bơ, sữa'), 'beef')
    assert matches(normalize('Trứng gà'), 'eggs')
    assert not matches(normalize('Trứng gà'), 'tofu')
    assert matches(normalize('Đậu hũ chiên'), 'tofu')
    assert not matches(normalize('Đậu hũ chiên'), 'eggs')


def test_separate_egg_and_tofu_preferences_are_accepted(client):
    login(client)
    for ingredient in ('eggs', 'tofu'):
        answers = {**ANSWERS, 'ingredients': [ingredient]}
        assert client.post('/api/v1/user/preferences/preview', json=answers).status_code == 200
        assert client.post('/api/v1/user/preferences', json=answers).status_code == 200
        assert client.get('/api/v1/user/preferences').json()['answers']['ingredients'] == [ingredient]


def test_healthy_and_low_carb_use_assigned_vietnamese_diet_labels(client, setup):
    from app import models as m
    login(client)
    _, factory = setup
    healthy = {**ANSWERS, 'occasions': 'balanced'}
    low_carb = {**ANSWERS, 'occasions': 'low_carb'}
    initial_healthy = client.post('/api/v1/user/preferences/preview', json=healthy).json()[0]
    initial_low_carb = client.post('/api/v1/user/preferences/preview', json=low_carb).json()[0]
    assert 'Kiểu ăn uống' not in initial_healthy['match_reasons']
    assert 'Kiểu ăn uống' not in initial_low_carb['match_reasons']
    with factory() as db:
        db.add_all([
            m.CheDoAn(maCheDoAn='CDA005', tenCheDoAn='Cân bằng'),
            m.CheDoAn(maCheDoAn='CDA002', tenCheDoAn='Ít tinh bột'),
            m.CheDoAnMonAn(maCheDoAnMonAn='CDMA001', maMonAn='MA001', maCheDoAn='CDA005'),
        ])
        db.commit()
    preview = client.post('/api/v1/user/preferences/preview', json=healthy).json()
    assert [dish['id'] for dish in preview] == ['MA001']
    assert 'Kiểu ăn uống' in preview[0]['match_reasons']
    assert preview[0]['match_percent'] > initial_healthy['match_percent']
    with factory() as db:
        db.add(m.CheDoAnMonAn(maCheDoAnMonAn='CDMA002', maMonAn='MA001', maCheDoAn='CDA002'))
        db.commit()
    improved_low_carb = client.post('/api/v1/user/preferences/preview', json=low_carb).json()[0]
    assert improved_low_carb['id'] == 'MA001'
    assert improved_low_carb['match_percent'] > initial_low_carb['match_percent']
    assert [dish['id'] for dish in client.post('/api/v1/user/preferences/preview',
        json={**ANSWERS, 'occasions': 'balanced'}).json()] == ['MA001']


def test_avoided_ingredients_match_names_and_recipe_steps():
    from app.personalization import conflicts_with_avoid
    dish = {'name': 'Rau xào', 'recipe': {'ingredients': [{'name': 'Đậu hũ'}, {'name': 'Ớt tươi'}], 'steps': []}}
    assert conflicts_with_avoid(dish, ['soy'])
    assert not conflicts_with_avoid(dish, ['peanut'])
    assert conflicts_with_avoid(dish, ['spicy_avoid'])
    assert not conflicts_with_avoid(dish, ['seafood_allergy'])
    assert not conflicts_with_avoid(dish, ['none'])
    assert conflicts_with_avoid({'name': 'Món rau', 'recipe': {'ingredients': [], 'steps': ['Thêm nước mắm.']}}, ['seafood_allergy'])
    assert conflicts_with_avoid({'name': 'Món rau', 'recipe': {'ingredients': [], 'steps': ['Thêm nước mắm.']}}, ['fish'])
    assert not conflicts_with_avoid({'name': 'Món rau', 'recipe': {'ingredients': [], 'steps': ['Thêm nước mắm.']}}, ['shellfish'])
    assert conflicts_with_avoid({'name': 'Sữa chua', 'recipe': {'ingredients': [], 'steps': []}}, ['lactose'])
    assert not conflicts_with_avoid({'name': 'Sinh tố bơ quả', 'recipe': {'ingredients': [], 'steps': []}}, ['lactose'])


def test_avoidance_excludes_dish_from_preview_and_saved_recommendations(client, setup):
    from app import models as m
    login(client)
    _, factory = setup
    with factory() as db:
        db.add(m.NguyenLieu(maNguyenLieu='NL002', tenNguyenLieu='Tôm', moTa=''))
        db.add(m.ThanhPhanCongThuc(maThanhPhan='TP001', maCongThuc='CT001', maNguyenLieu='NL002', maDonVi='DV001', soLuong=10))
        db.commit()
    answers = {**ANSWERS, 'avoid': ['seafood_allergy']}
    assert client.post('/api/v1/user/preferences/preview', json=answers).json() == []
    assert client.post('/api/v1/user/preferences', json=answers).status_code == 200
    assert client.get('/api/recommendations?mode=for_you').json() == []
    assert client.get('/api/recommendations?mode=taste').json() == []
    assert client.get('/api/recommendations?mode=trending').json() == []
    assert client.post('/api/v1/user/preferences', json={**ANSWERS, 'avoid': ['none']}).status_code == 200
    assert [dish['id'] for dish in client.get('/api/recommendations?mode=for_you').json()] == ['MA001']


def test_dish_recommendations_do_not_calculate_or_filter_by_sample_prices(client, setup):
    from app import models as m
    login(client)
    _, factory = setup
    with factory() as db:
        db.get(m.DonViTinh, 'DV001').heSoGramChuan = 1
        db.add(m.DonViTinh(maDonVi='DV002', tenDonVi='Kilôgam', kyHieu='kg', heSoGramChuan=1000))
        db.add(m.ThanhPhanCongThuc(maThanhPhan='TP001', maCongThuc='CT001', maNguyenLieu='NL001', maDonVi='DV001', soLuong=200))
        db.commit()
    answers = {**ANSWERS, 'method': 'stir_fry'}
    unpriced = client.post('/api/v1/user/preferences/preview', json=answers).json()
    assert len(unpriced) == 1 and 'cost' not in unpriced[0]
    with factory() as db:
        db.add(m.GiaNguyenLieu(maGia='G001', maNguyenLieu='NL001', maDonVi='DV002', giaThamKhao=100000))
        db.commit()
    preview = client.post('/api/v1/user/preferences/preview', json=answers).json()
    assert [dish['id'] for dish in preview] == [dish['id'] for dish in unpriced]
    assert client.post('/api/v1/user/preferences', json=answers).status_code == 200
    assert 'cost' not in client.get('/api/recommendations?mode=trending').json()[0]
    with factory() as db:
        db.get(m.GiaNguyenLieu, 'G001').giaThamKhao = 300000
        db.commit()
    assert client.post('/api/v1/user/preferences/preview', json=answers).json() == preview
    assert client.get('/api/recommendations?mode=trending').json()


def test_group_difficulty_and_meal_answers_change_ranking(setup, monkeypatch):
    from app.personalization import rank_dishes
    _, factory = setup
    soup = {'id': 'SOUP', 'name': 'Canh gà', 'description': '', 'categories': [{'name': 'Món canh'}],
            'diets': [], 'recipe': {'ingredients': [{'name': 'Thịt gà'}], 'steps': [], 'servings': 2},
            'time': 25, 'difficulty': 'Dễ', 'favorite_count': 0, 'rating': 0}
    cake = {'id': 'CAKE', 'name': 'Bánh ngọt', 'description': '', 'categories': [{'name': 'Món bánh'}],
            'diets': [], 'recipe': {'ingredients': [{'name': 'Bột mì'}], 'steps': [], 'servings': 2},
            'time': 25, 'difficulty': 'Khó', 'favorite_count': 0, 'rating': 0}
    monkeypatch.setattr('app.personalization.dish_data', lambda db: [soup, cake])
    with factory() as db:
        for answer, expected in [({'dish_types': ['soup']}, 'SOUP'),
                                 ({'skill': 'chef'}, 'CAKE'),
                                 ({'meals': ['snack']}, 'CAKE')]:
            result = rank_dishes(db, 'ND001', answer)
            assert [dish['id'] for dish in result] == [expected]
