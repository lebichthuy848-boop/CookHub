import json
from fastapi import APIRouter, Depends
from sqlalchemy import update
from sqlalchemy.orm import Session
from .. import models as m, schemas as s
from ..database import get_db
from ..security import current_user, public_user
from ..personalization import rank_dishes

router = APIRouter(prefix='/v1/user', tags=['Personalization'])

@router.get('/preferences')
def preferences(user=Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(m.UserPreferences, user.maNguoiDung)
    return {'answers': json.loads(row.answers) if row and row.completed else None,
            'has_completed_survey': bool(row and row.completed)}

@router.post('/survey/claim')
def claim(user=Depends(current_user), db: Session = Depends(get_db)):
    result = db.execute(update(m.UserPreferences).where(
        m.UserPreferences.user_id == user.maNguoiDung,
        m.UserPreferences.survey_shown == 0, m.UserPreferences.completed == 0).values(survey_shown=1))
    db.commit()
    return {'show': result.rowcount == 1}

@router.post('/preferences/preview')
def preview(data: s.Preferences, user=Depends(current_user), db: Session = Depends(get_db)):
    return rank_dishes(db, user.maNguoiDung, data.model_dump())[:10]

@router.post('/onboarding-preferences')
@router.post('/preferences')
@router.put('/preferences')
def save(data: s.Preferences, user=Depends(current_user), db: Session = Depends(get_db)):
    row = db.get(m.UserPreferences, user.maNguoiDung)
    if row is None:
        row = m.UserPreferences(user_id=user.maNguoiDung)
        db.add(row)
    payload = {key: value for key, value in data.model_dump().items() if value not in ('', [], None)}
    row.answers = json.dumps(payload, ensure_ascii=False)
    row.completed = 1
    row.survey_shown = 1
    db.commit()
    db.refresh(user)
    return public_user(user)
