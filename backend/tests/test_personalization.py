from conftest import login

ANSWERS = {'ingredients':['chicken'], 'occasions':['solo'], 'tastes':['savory'], 'time':'medium', 'tools':['stove']}

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
    answers = {**ANSWERS, 'regions': ['north'], 'avoid': ['none'],
               'budget': 'saving', 'skill': 'beginner', 'meals': ['breakfast']}
    result = client.post('/api/v1/user/onboarding-preferences', json=answers)
    assert result.status_code == 200
    assert result.json()['has_completed_survey'] is True
    assert client.get('/api/v1/user/preferences').json()['answers'] == answers
    assert client.get('/api/recommendations?mode=for_you').status_code == 200

def test_preview_is_readonly_scored_and_excludes_hidden(client):
    login(client)
    dishes = client.post('/api/v1/user/preferences/preview',json=ANSWERS).json()
    assert dishes[0]['id']=='MA001'
    assert dishes[0]['match_percent']==70  # chicken 30 + solo 20 + medium 20
    assert client.get('/api/v1/user/preferences').json()['answers'] is None
    assert client.post('/api/v1/user/preferences',json=ANSWERS).status_code == 200
    assert client.get('/api/recommendations').json()[0]['match_percent']==70
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


def test_healthy_and_low_carb_use_assigned_vietnamese_diet_labels(client, setup):
    from app import models as m
    login(client)
    _, factory = setup
    healthy = {**ANSWERS, 'occasions': ['healthy']}
    low_carb = {**ANSWERS, 'occasions': ['low_carb']}
    assert client.post('/api/v1/user/preferences/preview', json=healthy).json() == []
    assert client.post('/api/v1/user/preferences/preview', json=low_carb).json() == []
    with factory() as db:
        db.add_all([
            m.CheDoAn(maCheDoAn='CDA005', tenCheDoAn='Cân bằng'),
            m.CheDoAn(maCheDoAn='CDA002', tenCheDoAn='Ít tinh bột'),
            m.CheDoAnMonAn(maCheDoAnMonAn='CDMA001', maMonAn='MA001', maCheDoAn='CDA005'),
        ])
        db.commit()
    preview = client.post('/api/v1/user/preferences/preview', json=healthy).json()
    assert [dish['id'] for dish in preview] == ['MA001']
    assert 'Bối cảnh / chế độ ăn' in preview[0]['match_reasons']
    assert client.post('/api/v1/user/preferences/preview', json=low_carb).json() == []
    with factory() as db:
        db.add(m.CheDoAnMonAn(maCheDoAnMonAn='CDMA002', maMonAn='MA001', maCheDoAn='CDA002'))
        db.commit()
    assert [dish['id'] for dish in client.post('/api/v1/user/preferences/preview', json=low_carb).json()] == ['MA001']
    assert [dish['id'] for dish in client.post('/api/v1/user/preferences/preview',
        json={**ANSWERS, 'occasions': ['healthy', 'low_carb']}).json()] == ['MA001']


def test_avoided_ingredients_match_names_and_recipe_steps():
    from app.personalization import conflicts_with_avoid
    dish = {'name': 'Rau xào', 'recipe': {'ingredients': [{'name': 'Đậu hũ'}, {'name': 'Ớt tươi'}], 'steps': []}}
    assert conflicts_with_avoid(dish, ['peanut'])
    assert conflicts_with_avoid(dish, ['spicy_avoid'])
    assert not conflicts_with_avoid(dish, ['seafood_allergy'])
    assert not conflicts_with_avoid(dish, ['none'])
    assert conflicts_with_avoid({'name': 'Món rau', 'recipe': {'ingredients': [], 'steps': ['Thêm nước mắm.']}}, ['seafood_allergy'])
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


def test_budget_uses_converted_price_per_serving_and_rejects_missing_price(client, setup):
    from app import models as m
    login(client)
    _, factory = setup
    with factory() as db:
        db.get(m.DonViTinh, 'DV001').heSoGramChuan = 1
        db.add(m.DonViTinh(maDonVi='DV002', tenDonVi='Kilôgam', kyHieu='kg', heSoGramChuan=1000))
        db.add(m.ThanhPhanCongThuc(maThanhPhan='TP001', maCongThuc='CT001', maNguyenLieu='NL001', maDonVi='DV001', soLuong=200))
        db.commit()
    saving = {**ANSWERS, 'budget': 'saving'}
    assert client.post('/api/v1/user/preferences/preview', json=saving).json() == []
    with factory() as db:
        db.add(m.GiaNguyenLieu(maGia='G001', maNguyenLieu='NL001', maDonVi='DV002', giaThamKhao=100000))
        db.commit()
    preview = client.post('/api/v1/user/preferences/preview', json=saving).json()
    assert preview[0]['cost'] == 20000
    assert client.post('/api/v1/user/preferences', json=saving).status_code == 200
    assert client.get('/api/recommendations?mode=trending').json()[0]['cost'] == 20000
    with factory() as db:
        db.get(m.GiaNguyenLieu, 'G001').giaThamKhao = 300000
        db.commit()
    assert client.post('/api/v1/user/preferences/preview', json=saving).json() == []
    assert client.get('/api/recommendations?mode=trending').json() == []
    assert client.post('/api/v1/user/preferences/preview', json={**ANSWERS, 'budget':'normal'}).json()[0]['cost'] == 60000
