import os, base64, hashlib, hmac, json, time
from fastapi import Cookie, Depends, HTTPException, Response
from pwdlib import PasswordHash
from pwdlib.hashers.bcrypt import BcryptHasher
from sqlalchemy.orm import Session
from .config import settings
from .database import get_db
from .models import NguoiDung

passwords = PasswordHash((BcryptHasher(),))
COOKIE = 'cookhub_session'
_secret = os.environ.get('SESSION_SECRET', 'cookhub-v2-change-this').encode()
def _b64(raw): return base64.urlsafe_b64encode(raw).decode().rstrip('=')
def _unb64(raw): return base64.urlsafe_b64decode(raw + '=' * (-len(raw) % 4))
def _sign(payload): return _b64(hmac.new(_secret, payload.encode(), hashlib.sha256).digest())
def _issue(user_id):
    payload = _b64(json.dumps({'uid': user_id, 'exp': int(time.time()) + settings.session_hours * 3600}, separators=(',', ':')).encode())
    return payload + '.' + _sign(payload)
def _read(token):
    payload, signature = token.split('.', 1)
    if not hmac.compare_digest(_sign(payload), signature): raise ValueError()
    data = json.loads(_unb64(payload))
    if data['exp'] < time.time(): raise ValueError()
    return data['uid']

def verify_password(password, stored):
    try:
        if not stored:
            return False
        # Hỗ trợ các tài khoản cũ được đồng bộ bằng SHA2_256 trong SQL Server.
        if len(stored) == 64 and all(c in '0123456789abcdefABCDEF' for c in stored):
            digest = hashlib.sha256(password.encode('utf-8')).hexdigest()
            return hmac.compare_digest(digest.lower(), stored.lower())
        return passwords.verify(password, stored)
    except (ValueError, TypeError):
        return False

def public_user(user):
    return {'id': user.maNguoiDung, 'name': user.hoTen, 'email': user.thuDienTu,
            'role': user.vaiTro, 'status': user.trangThai,
            'has_completed_survey': bool(user.personalization and user.personalization.completed),
            'survey_pending': bool(user.personalization and not user.personalization.survey_shown and not user.personalization.completed)}

def create_session(db, user, response: Response):
    db.commit()
    token = _issue(user.maNguoiDung)
    response.set_cookie(COOKIE, token, httponly=True, secure=settings.cookie_secure,
                        samesite='lax', max_age=settings.session_hours * 3600, path='/')
    return public_user(user)

def current_user(cookhub_session: str | None = Cookie(default=None), db: Session = Depends(get_db)):
    if not cookhub_session:
        raise HTTPException(401, 'Vui lòng đăng nhập.')
    try:
        user_id = _read(cookhub_session)
    except (ValueError, KeyError):
        raise HTTPException(401, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.')
    user = db.get(NguoiDung, user_id)
    if not user or user.trangThai != 'Đang hoạt động':
        raise HTTPException(401, 'Tài khoản không hoạt động.')
    return user

def roles(*allowed):
    def dependency(user=Depends(current_user)):
        if user.vaiTro not in allowed:
            raise HTTPException(403, 'Bạn không có quyền thực hiện chức năng này.')
        return user
    return dependency

content_user = roles('Quản trị nội dung')
review_moderator = roles('Quản trị nội dung')
system_user = roles('Quản trị hệ thống')
dish_editor = roles('Quản trị nội dung')
