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
