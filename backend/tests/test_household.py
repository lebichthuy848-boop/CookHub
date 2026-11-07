import json
from types import SimpleNamespace
import pytest
from app.household import distribution, targets
from conftest import login
from app import models as m

def profile(id='adult',age=30):
    return dict(id=id,name='Thành viên',sex='female',age=age,height=160,weight=60,activity='1.4',goal='maintain')

def test_profiles_persist_and_do_not_change_survey_flags(client,setup):
    login(client)
    response=client.put('/api/menu/household?on=2026-11-07',json=dict(revision=0,members=[profile()],active_ids=['adult'],portions={}))
    assert response.status_code==200,response.text
    result=client.get('/api/menu/household?on=2026-11-07').json()
    assert result['revision']==1 and result['members'][0]['goals']['nang_luong']>0
    _,factory=setup
    with factory() as db:
        row=db.get(m.UserPreferences,'ND001')
        assert json.loads(row.answers)['_household']['members'][0]['id']=='adult'
        assert not row.completed and not row.survey_shown
    stale=client.put('/api/menu/household?on=2026-11-07',json=dict(revision=0,members=[],active_ids=[],portions={}))
    assert stale.status_code==409

def test_household_is_account_scoped(client):
    login(client)
    client.put('/api/menu/household?on=2026-11-07',json=dict(revision=0,members=[profile()],active_ids=['adult'],portions={}))
    response=client.post('/api/auth/register',json=dict(name='Other',email='other@test.local',password='longpassword'))
    assert response.status_code==201
    assert client.get('/api/menu/household?on=2026-11-07').json()['members']==[]

def test_children_cannot_use_adult_weight_loss(client):
    login(client)
    child=profile(age=12);child['goal']='lose'
    assert client.put('/api/menu/household?on=2026-11-07',json=dict(revision=0,members=[child],active_ids=['adult'],portions={})).status_code==422
    assert targets(profile(age=12))[0] is None
    assert targets({**profile(),'height':None})[0] is None

def test_portion_totals_and_ownership_are_validated(client):
    login(client)
    item=client.post('/api/menu',json=dict(dish_id='MA001',date='2026-11-07',meal='Trưa',servings=3))
    assert item.status_code==201,item.text
    key=item.json()['id']
    payload=dict(revision=0,members=[profile()],active_ids=['adult'],portions={key:{'adult':2}})
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==422
    payload['portions']={key:{'adult':3}}
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==200
    payload['revision']=1;payload['portions']={'someone-elses-item':{'adult':3}}
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==422

def test_distribution_conserves_totals_for_unequal_and_equal_shares():
    state=dict(revision=1,members=[profile('a'),profile('b')],days={'2026-11-07':dict(active_ids=['a','b'],portions={'item':{'a':1,'b':2}})})
    items=[SimpleNamespace(maChiTiet='item',soKhauPhan=3)]
    rows=[dict(MaChiTiet='item',NangLuong=900,ChatDam=30,ChatBotDuong=90,ChatBeo=40,ChatXo=6,natri=900,MaNguyenLieu='NL1')]
    result=distribution(state,'2026-11-07',items,rows,{})
    assert [x['totals']['nang_luong'] for x in result['members']]==[300,600]
    assert sum(x['totals']['natri'] for x in result['members'])==900
    assert not result['equal_split_items']
    state['days']['2026-11-07']['portions']={}
    equal=distribution(state,'2026-11-07',items,rows,{})
    assert [x['totals']['nang_luong'] for x in equal['members']]==[450,450]
    assert equal['equal_split_items']==['item']

def test_missing_nutrition_and_no_sql_do_not_become_complete_zero():
    state=dict(revision=0,members=[profile()],days={})
    items=[SimpleNamespace(maChiTiet='item',soKhauPhan=1)]
    result=distribution(state,'2026-11-07',items,[dict(MaChiTiet='item',MaNguyenLieu='NL1',ThieuDinhDuong=1)],{'NL1':'Thiếu'})
    assert result['members'][0]['missing_ingredients']==['Thiếu']
    assert not result['members'][0]['complete']
    assert distribution(state,'2026-11-07',items,None,{})['members'][0]['totals'] is None

def test_macro_energy_matches_target_and_sodium_does_not_scale():
    for goal in ('maintain','lose','gain'):
        goals,_=targets({**profile(), 'goal':goal})
        assert goals['natri']==2000 and goals['chat_xo']==25
        assert abs(goals['chat_dam']*4+goals['chat_bot_duong']*4+goals['chat_beo']*9-goals['nang_luong'])<.1

def test_deleted_menu_items_do_not_block_future_profile_updates(client):
    login(client)
    item=client.post('/api/menu',json=dict(dish_id='MA001',date='2026-11-07',meal='Trưa',servings=1)).json()['id']
    payload=dict(revision=0,members=[profile()],active_ids=['adult'],portions={item:{'adult':1}})
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==200
    assert client.delete('/api/menu/'+item).status_code==204
    current=client.get('/api/menu/household?on=2026-11-07').json()
    assert current['portions']=={}
    payload.update(revision=current['revision'],portions=current['portions'])
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==200

def test_day_selections_and_avatar_are_preserved(client,setup):
    login(client)
    _,factory=setup
    with factory() as db:
        row=db.get(m.UserPreferences,'ND001')
        if row is None:
            row=m.UserPreferences(user_id='ND001',answers='{}');db.add(row)
        row.answers=json.dumps({'avatar':'images/test.webp','ingredients':['tofu']})
        db.commit()
    payload=dict(revision=0,members=[profile('a'),profile('b')],active_ids=['a'],portions={})
    assert client.put('/api/menu/household?on=2026-11-07',json=payload).status_code==200
    payload.update(revision=1,active_ids=['b'])
    assert client.put('/api/menu/household?on=2026-11-08',json=payload).status_code==200
    assert client.get('/api/menu/household?on=2026-11-07').json()['active_ids']==['a']
    with factory() as db:
        answers=json.loads(db.get(m.UserPreferences,'ND001').answers)
        assert answers['avatar']=='images/test.webp' and answers['ingredients']==['tofu']
