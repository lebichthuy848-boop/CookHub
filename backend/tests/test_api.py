from sqlalchemy import select
from app import models as m
from conftest import login

def test_register_and_login_use_bcrypt_v2(client, setup):
    assert client.post('/api/auth/register',json={'name':'New','email':'new@test.local','password':'longpassword'}).status_code==201
    _, factory=setup
    with factory() as db:
        user=db.scalar(select(m.NguoiDung).where(m.NguoiDung.thuDienTu=='new@test.local'))
        assert user.matKhauBam.startswith('$2') and len(user.matKhauBam)==60
        assert user.vaiTro=='Người dùng' and user.trangThai=='Đang hoạt động'

def test_catalog_and_recipe_v2(client):
    login(client)
    assert client.get('/api/categories').status_code==200
    dish=client.get('/api/dishes/MA001')
    assert dish.status_code==200 and dish.json()['id']=='MA001'

def test_favorite_hidden_and_menu_v2(client):
    login(client)
    assert client.put('/api/favorites/MA001').status_code==204
    assert client.get('/api/favorites').json()==['MA001']
    assert client.put('/api/hidden/MA001').status_code==204
    assert client.get('/api/hidden').json()==['MA001']
    assert client.post('/api/menu',json={'dish_id':'MA001','date':'2026-10-01','meal':'Trưa','servings':2}).status_code==201

def test_pantry_add_uses_schema_code_and_reuses_existing_item(client):
    login(client)
    payload = {'name': 'Nước mắm', 'quantity': 100, 'unit_id': 'DV001'}
    created = client.post('/api/pantry', json=payload)
    assert created.status_code == 201
    assert created.json()['id'].startswith('NLHC')
    repeated = client.post('/api/pantry', json=payload)
    assert repeated.status_code == 201
    assert repeated.json()['id'] == created.json()['id']
    items = client.get('/api/pantry').json()
    assert len(items) == 1 and items[0]['quantity'] == 200

def test_v2_model_list_has_core_tables_and_preferences():
    from app.database import Base
    assert len(Base.metadata.tables)==31
    assert {'NguoiDung','KhauViMonAn','CheDoAnMonAn','DoanPhimHuongDan','DanhGiaDinhDuongThucDon'} <= set(Base.metadata.tables)
