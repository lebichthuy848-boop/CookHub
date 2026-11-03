from conftest import login


def test_account_backup_restores_profile_and_menu_without_duplicates(client):
    login(client)
    backup = client.get('/api/account-backup')
    assert backup.status_code == 200
    data = backup.json()
    assert data['account']['email'] == 'user@test.local'
    assert 'password' not in str(data).lower()
    data['account']['name'] = 'Restored User'
    data['account']['menu'] = [
        {'dish_id': 'MA001', 'date': '2026-11-03', 'meal': 'Sáng', 'servings': 2}
    ]
    first = client.post('/api/account-backup/restore', json=data)
    assert first.status_code == 200, first.text
    assert first.json()['restored_menu_items'] == 1
    second = client.post('/api/account-backup/restore', json=data)
    assert second.status_code == 200, second.text
    assert second.json()['restored_menu_items'] == 0
    assert client.get('/api/account-backup').json()['account']['menu'] == data['account']['menu']
    assert client.get('/api/profile').json()['name'] == 'Restored User'


def test_account_backup_rejects_other_account_and_missing_dish(client):
    login(client)
    data = client.get('/api/account-backup').json()
    data['account']['email'] = 'other@test.local'
    assert client.post('/api/account-backup/restore', json=data).status_code == 422
    data['account']['email'] = 'user@test.local'
    data['account']['menu'] = [
        {'dish_id': 'MA999', 'date': '2026-11-03', 'meal': 'Sáng', 'servings': 2}
    ]
    assert client.post('/api/account-backup/restore', json=data).status_code == 422
    assert client.get('/api/account-backup').json()['account']['menu'] == []
