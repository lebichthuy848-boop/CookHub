import json
from types import SimpleNamespace
import pytest
from app.household import distribution, targets, public_state
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

def test_update_menu_rescales_persisted_member_shares():
    from app.routers.personal import update_menu
    from app.schemas import MenuItemUpdate
    from datetime import date
    item=SimpleNamespace(maChiTiet='item',maThucDon='plan',maMonAn='MA001',ngayDung=date(2026,11,7),buaAn='Bữa trưa',soKhauPhan=3)
    stored={'_household':{'revision':1,'members':[],'days':{'2026-11-07':{
        'active_ids':['a','b'],'portions':{'item':{'a':1,'b':2}}}}}}
    preference=SimpleNamespace(answers=json.dumps(stored))
    class FakeDB:
        bind=SimpleNamespace(dialect=SimpleNamespace(name='sqlite'))
        calls=0
        def scalar(self,_statement):
            self.calls+=1
            return item if self.calls==1 else preference
        def commit(self): pass
    response=update_menu('item',MenuItemUpdate(meal='Trưa',servings=6),
                         user=SimpleNamespace(maNguoiDung='ND001'),db=FakeDB())
    assert response['servings']==6
    saved=json.loads(preference.answers)['_household']
    assert saved['days']['2026-11-07']['portions']['item']=={'a':2.0,'b':4.0}
    assert saved['revision']==2

def test_rescale_portion_split_keeps_ratio_and_rejects_stale_totals():
    from app.household import rescale_portion_split
    assert rescale_portion_split({'a':1,'b':2},3,6)=={'a':2,'b':4}
    assert rescale_portion_split({'a':1,'b':1},3,6) is None

def test_distribution_conserves_totals_for_unequal_and_equal_shares():
    state=dict(revision=1,members=[profile('a'),profile('b')],days={'2026-11-07':dict(active_ids=['a','b'],portions={'item':{'a':1,'b':2}})})
    items=[SimpleNamespace(maChiTiet='item',soKhauPhan=3)]
    rows=[dict(MaChiTiet='item',NangLuong=900,ChatDam=30,ChatBotDuong=90,ChatBeo=40,ChatXo=6,natri=900,MaNguyenLieu='NL1')]
    result=distribution(state,'2026-11-07',items,rows,{})
    assert [x['totals']['nang_luong'] for x in result['members']]==[300,600]
    assert sum(x['totals']['natri'] for x in result['members'])==900
    assert not result['equal_split_items']
    assert result['member_item_totals']['a']['item']['nang_luong']==300
    assert result['member_item_totals']['b']['item']['nang_luong']==600
    assert result['member_portions']['a']['item']==1
    assert result['member_portions']['b']['item']==2
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


@pytest.mark.parametrize('weight,goal,warning', [(45,'lose','thiếu cân'),(90,'gain','BMI từ 25')])
def test_bmi_warnings_preserve_selected_scenario_and_group_targets(weight,goal,warning):
    member={**profile('a'), 'weight':weight, 'height':170, 'goal':goal}
    chosen=targets(member)[0]
    maintenance=targets({**member,'goal':'maintain'})[0]
    assert chosen is not None
    assert (chosen['nang_luong'] < maintenance['nang_luong']) if goal=='lose' else (chosen['nang_luong'] > maintenance['nang_luong'])
    state=dict(revision=3,members=[member,profile('b'),profile('c')],days={})
    public=public_state(state,'2026-11-18')
    person=public['members'][0]
    assert person['goal']==goal and 'requested_goal' not in person
    assert any(warning in note for note in person['goal_warnings'])
    assert person['goals']==chosen
    result=distribution(state,'2026-11-18',[],[],{})
    assert result['group_goals']['nang_luong']==sum(m['goals']['nang_luong'] for m in public['members'])
    assert state['members'][0]['goal']==goal and state['revision']==3


@pytest.mark.parametrize('weight,goal', [(45,'lose'),(90,'gain')])
def test_saves_adult_weight_goal_with_warning_and_numeric_targets(client,weight,goal):
    login(client)
    member={**profile(), 'weight':weight, 'height':170, 'goal':goal}
    payload=dict(revision=0,members=[member],active_ids=['adult'],portions={})
    response=client.put('/api/menu/household?on=2026-11-18',json=payload)
    assert response.status_code==200,response.text
    saved=client.get('/api/menu/household?on=2026-11-18').json()
    assert saved['revision']==1 and saved['members'][0]['goal']==goal
    assert saved['members'][0]['goals']['nang_luong']>0
    assert saved['members'][0]['goal_warnings']


def test_low_calorie_scenario_is_shown_with_warning_instead_of_becoming_null():
    member={**profile(), 'weight':35, 'height':160, 'age':45, 'goal':'lose'}
    person=public_state(dict(revision=1,members=[member],days={}), '2026-11-18')['members'][0]
    assert person['goal']=='lose'
    assert 0 < person['goals']['nang_luong'] < 1200
    assert any('Mức kcal' in warning for warning in person['goal_warnings'])


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
