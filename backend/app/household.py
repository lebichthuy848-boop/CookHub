"""Source prepared for CookHub app/household.py. No schema migration required."""
import json
from datetime import date
from typing import Literal
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, model_validator
from sqlalchemy import select
from sqlalchemy.orm import Session
from . import models as m
from .database import get_db
from .security import current_user

router = APIRouter(prefix='/menu/household', tags=['Household nutrition'])
KEY = '_household'
METRICS = ('nang_luong','chat_dam','chat_bot_duong','chat_beo','chat_xo','natri')

class Member(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False, str_strip_whitespace=True)
    id: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=60)
    sex: Literal['male','female'] = 'female'
    age: int = Field(ge=1, le=100)
    height: float | None = Field(default=None, ge=50, le=250)
    weight: float | None = Field(default=None, ge=5, le=350)
    activity: Literal['1.4','1.6','1.8','2.0'] = '1.4'
    goal: Literal['maintain','lose','gain'] = 'maintain'
    @model_validator(mode='after')
    def child_goal(self):
        if self.age < 18 and self.goal != 'maintain':
            raise ValueError('Thành viên dưới 18 tuổi không dùng mục tiêu tăng/giảm cân tự động.')
        return self

class HouseholdWrite(BaseModel):
    model_config = ConfigDict(extra='forbid', allow_inf_nan=False)
    revision: int = Field(ge=0)
    members: list[Member] = Field(max_length=20)
    active_ids: list[str] = Field(max_length=20)
    portions: dict[str, dict[str, float]] = Field(default_factory=dict, max_length=100)
    @model_validator(mode='after')
    def validate_ids(self):
        ids = [x.id for x in self.members]
        if len(set(ids)) != len(ids) or len(set(self.active_ids)) != len(self.active_ids):
            raise ValueError('Mã thành viên bị trùng.')
        if not set(self.active_ids) <= set(ids):
            raise ValueError('Thành viên cùng ăn phải có trong danh sách.')
        for shares in self.portions.values():
            if not set(shares) <= set(self.active_ids):
                raise ValueError('Khẩu phần có thành viên không được chọn.')
            if any(not isinstance(x,(int,float)) or not 0 <= x <= 1000 for x in shares.values()):
                raise ValueError('Khẩu phần phải là số hữu hạn từ 0 đến 1000.')
        return self

def read_state(db, user_id, lock=False):
    statement = select(m.UserPreferences).where(m.UserPreferences.user_id==user_id)
    if lock and db.bind.dialect.name == 'mssql':
        statement = statement.with_hint(m.UserPreferences, 'WITH (UPDLOCK, HOLDLOCK)', dialect_name='mssql')
    row = db.scalar(statement)
    answers = json.loads(row.answers) if row and row.answers else {}
    return row, answers, answers.get(KEY, {'revision':0,'members':[],'days':{}})

def targets(member):
    age = member['age']
    if age < 18:
        return None, 'Trẻ em: cần mục tiêu phù hợp tuổi và tăng trưởng do chuyên gia hướng dẫn.'
    if not member.get('height') or not member.get('weight') or not 19 <= age <= 78:
        return None, 'Bổ sung tuổi 19–78, chiều cao và cân nặng để ước tính; ngoài độ tuổi này cần mục tiêu riêng.'
    weight, height = member['weight'], member['height']
    base = 10*weight + 6.25*height - 5*age + (5 if member['sex']=='male' else -161)
    maintenance = base * float(member['activity'])
    if member['goal']=='lose':
        if weight / ((height/100)**2) < 18.5:
            return None, 'Không tạo mục tiêu giảm cân tự động khi BMI dưới 18,5.'
        # App policy: cap the suggested deficit at 20%, never a fixed 600 for everybody.
        energy = maintenance - min(600, maintenance*.20)
    elif member['goal']=='gain':
        energy = maintenance + 300
    else:
        energy = maintenance
    if energy < (1500 if member['sex']=='male' else 1200):
        return None, 'Mức ước tính thấp: cần mục tiêu được chuyên gia hướng dẫn.'
    energy=round(energy/10)*10
    # Explicit app reference split: protein 15%, carbs 60%, fat 25%.
    return dict(nang_luong=energy,chat_dam=round(energy*.15/4,2),
                chat_bot_duong=round(energy*.60/4,2),chat_beo=round(energy*.25/9,2),
                chat_xo=25,natri=2000), 'Ước tính Mifflin–St Jeor × mức vận động; không phải chỉ định y khoa.'

def public_state(state, on):
    members=[]
    for member in state.get('members',[]):
        goals,note=targets(member)
        members.append({**member,'goals':goals,'goal_note':note})
    day=state.get('days',{}).get(str(on),{})
    ids={x['id'] for x in members}
    active=[x for x in day.get('active_ids',[x['id'] for x in members]) if x in ids]
    return {'revision':state.get('revision',0),'members':members,'active_ids':active,
            'portions':day.get('portions',{}),'date':on}

@router.get('')
def get_household(on: date, user=Depends(current_user), db:Session=Depends(get_db)):
    result = public_state(read_state(db,user.maNguoiDung)[2],on)
    ids = set(db.scalars(select(m.ChiTietThucDon.maChiTiet).join(m.ThucDon,
        m.ThucDon.maThucDon==m.ChiTietThucDon.maThucDon).where(
        m.ThucDon.maNguoiDung==user.maNguoiDung,m.ChiTietThucDon.ngayDung==on)).all())
    result['portions'] = {key:value for key,value in result['portions'].items() if key in ids}
    return result

@router.put('')
def save_household(data:HouseholdWrite, on:date, user=Depends(current_user), db:Session=Depends(get_db)):
    row,answers,state=read_state(db,user.maNguoiDung,lock=True)
    if data.revision != state.get('revision',0):
        raise HTTPException(409,'Thông tin đã thay đổi ở cửa sổ khác. Vui lòng tải lại trước khi lưu.')
    items=db.scalars(select(m.ChiTietThucDon).join(m.ThucDon,m.ThucDon.maThucDon==m.ChiTietThucDon.maThucDon)
        .where(m.ThucDon.maNguoiDung==user.maNguoiDung,m.ChiTietThucDon.ngayDung==on)).all()
    owned={x.maChiTiet:float(x.soKhauPhan or 1) for x in items}
    for key,shares in data.portions.items():
        if key not in owned:
            raise HTTPException(422,'Món cần chia phần không thuộc thực đơn ngày này.')
        if abs(sum(shares.values())-owned[key])>.001:
            raise HTTPException(422,f'Tổng phần đã chia phải bằng {owned[key]:g} phần của món.')
    members=[x.model_dump() for x in data.members]
    member_ids={x['id'] for x in members}
    days=state.get('days',{})
    # Removing a member invalidates old splits instead of assigning their share to someone else.
    for entry in days.values():
        entry['active_ids']=[x for x in entry.get('active_ids',[]) if x in member_ids]
        entry['portions']={k:v for k,v in entry.get('portions',{}).items() if set(v)<=member_ids}
    days[str(on)]={'active_ids':data.active_ids,'portions':data.portions}
    state={'revision':data.revision+1,'members':members,'days':days}
    answers[KEY]=state
    if row is None:
        row=m.UserPreferences(user_id=user.maNguoiDung,completed=0,survey_shown=0)
        db.add(row)
    row.answers=json.dumps(answers,ensure_ascii=False)
    db.commit()
    return public_state(state,on)

def distribution(state,on,items,raw_rows,names):
    # Reuse the day's SQL result: no per-member or per-dish SQL queries.
    from .nutrition import _result, _value, SQL_COLUMNS
    result=public_state(state,on)
    active={x['id']:x for x in result['members'] if x['id'] in result['active_ids']}
    bins={key:[] for key in active}
    used={}; equal=[]
    for item in items:
        key=item.maChiTiet
        total=float(item.soKhauPhan or 1)
        shares=result['portions'].get(key,{})
        if not active:
            shares={}
        elif set(shares)<=set(active) and abs(sum(shares.values())-total)<.001:
            shares={i:float(shares.get(i,0)) for i in active}
        else:
            shares={i:total/len(active) for i in active}
            equal.append(key)
        used[key]=shares
    for raw in raw_rows or []:
        raw=dict(raw)
        key=_value(raw,'MaChiTiet')
        shares=used.get(key,{})
        total=sum(shares.values())
        if not total: continue
        for member_id,portion in shares.items():
            if portion<=0: continue
            scaled=dict(raw)
            for metric,column in SQL_COLUMNS.items():
                value=_value(raw,column)
                if value is not None:
                    # Normalize key casing so _result sees the scaled value first.
                    scaled[column]=float(value)*portion/total
            bins[member_id].append(scaled)
    result['members']=[{**member,**_result(bins.get(member['id'],[]),names)} for member in result['members']]
    for member in result['members']:
        if raw_rows is None:
            member.update(totals=None,complete=False)
    result.update(portions=used,equal_split_items=equal)
    goals=[active[i].get('goals') for i in active]
    result['group_goals']={k:round(sum(g[k] for g in goals),2) for k in METRICS} if goals and all(goals) else None
    return result
