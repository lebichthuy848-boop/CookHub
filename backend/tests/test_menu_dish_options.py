from conftest import login

def test_picker_returns_real_dish_metadata(client):
    login(client)
    result=client.get('/api/menu/dish-options')
    assert result.status_code==200,result.text
    assert result.json()[0]['id']=='MA001'
    assert result.json()[0]['name']=='Cơm gà'
    assert result.json()[0]['image']
    assert 'recipe' not in result.json()[0]
