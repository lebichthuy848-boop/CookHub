import logging
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy import select, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .. import models as m, schemas as s
from ..database import get_db
from ..config import settings
from ..security import current_user, verify_password, passwords, public_user, create_session, COOKIE

router = APIRouter(prefix='/auth', tags=['Authentication'])
logger = logging.getLogger(__name__)
_reset_tokens = {}
_RESET_TOKEN_MINUTES = 15

def by_email(db, email):
    return db.scalar(select(m.NguoiDung).where(func.lower(m.NguoiDung.thuDienTu) == email.lower()))

@router.post('/login')
def login(data: s.Login, response: Response, db: Session = Depends(get_db)):
    user = by_email(db, data.email)
    if not user or user.trangThai != 'Đang hoạt động' or not verify_password(data.password, user.matKhauBam):
        raise HTTPException(401, 'Email hoặc mật khẩu không đúng.')
    return create_session(db, user, response)

@router.post('/register', status_code=201)
def register(data: s.Register, response: Response, db: Session = Depends(get_db)):
    email = data.email.strip().lower()
    name = data.name.strip()
    if by_email(db, email):
        raise HTTPException(409, 'Email đã tồn tại.')

    # Mã người dùng, vai trò và trạng thái thuộc trách nhiệm của SQL Server.
    # Procedure nhận đúng 3 tham số; mật khẩu đã được băm bcrypt trước khi gửi.
    try:
        # Test suite dùng SQLite vì không có SQL Server. Production luôn đi qua procedure.
        if db.bind.dialect.name != 'mssql':
            user = m.NguoiDung(maNguoiDung='ND' + secrets.token_hex(8), hoTen=name,
                thuDienTu=email, matKhauBam=passwords.hash(data.password),
                vaiTro='Người dùng', trangThai='Đang hoạt động')
            db.add(user)
            db.flush()
            db.add(m.UserPreferences(user_id=user.maNguoiDung))
            db.flush()
            return create_session(db, user, response)
        result = db.execute(text(
            'EXEC dbo.SpDangKyNguoiDung '
            '@HoTen=:ho_ten, @ThuDienTu=:thu_dien_tu, @MatKhauBam=:mat_khau_bam'
        ), {
            'ho_ten': name,
            'thu_dien_tu': email,
            'mat_khau_bam': passwords.hash(data.password),
        })
        row = result.mappings().first()
        user_id = row.get('MaNguoiDung') if row else None
        if not user_id:
            raise HTTPException(500, 'Stored Procedure đăng ký không trả về mã người dùng.')
        user = db.get(m.NguoiDung, user_id)
        if not user:
            raise HTTPException(500, 'Không đọc lại được tài khoản vừa đăng ký.')
        db.add(m.UserPreferences(user_id=user_id))
        db.flush()
        return create_session(db, user, response)
    except HTTPException:
        raise
    except SQLAlchemyError as exc:
        number, message = _sql_error_details(exc)
        logger.exception(
            'Registration SQL failure: number=%s procedure=%s line=%s message=%s',
            number, getattr(exc.orig, 'procedure', None),
            getattr(exc.orig, 'line', None), message,
        )
        if number == 2627 and 'PRIMARY KEY' in message.upper() and 'NguoiDung' in message:
            raise HTTPException(500, 'Bộ cấp mã tài khoản chưa đồng bộ với dữ liệu mẫu.')
        if number in {2601, 2627, 51032} or 'duplicate' in message.lower() or 'đã được sử dụng' in message.lower():
            raise HTTPException(409, 'Email đã tồn tại.')
        if number in {201, 8144, 8145, 8146}:
            raise HTTPException(500, 'Cấu hình Stored Procedure đăng ký không đúng tham số.')
        if number == 547:
            raise HTTPException(409, 'Dữ liệu đăng ký vi phạm ràng buộc cơ sở dữ liệu.')
        if number in {53, 11001, 18456, 4060}:
            raise HTTPException(503, 'Không thể kết nối SQL Server.')
        if number == 51031:
            raise HTTPException(422, 'Dữ liệu đăng ký không hợp lệ.')
        raise HTTPException(500, 'Lỗi cơ sở dữ liệu khi đăng ký tài khoản.')


def _sql_error_details(exc):
    orig = getattr(exc, 'orig', exc)
    args = getattr(orig, 'args', ()) or ()
    number = args[0] if args and isinstance(args[0], int) else getattr(orig, 'number', None)
    message = str(args[1] if len(args) > 1 else orig)
    return number, message

@router.get('/me')
def me(user=Depends(current_user)):
    return public_user(user)

@router.post('/logout', status_code=204)
def logout(response: Response, cookhub_session: str | None = Cookie(default=None)):
    response.delete_cookie(COOKIE, path='/')

@router.put('/password', status_code=204)
def change_password(data: s.PasswordChange, response: Response, user=Depends(current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.matKhauBam):
        raise HTTPException(400, 'Mật khẩu hiện tại không đúng.')
    user.matKhauBam = passwords.hash(data.password)
    db.commit()
    response.delete_cookie(COOKIE, path='/')

@router.post('/forgot')
def forgot(data: s.Forgot, db: Session = Depends(get_db)):
    # Always return the same response to avoid revealing whether an email exists.
    user = by_email(db, data.email)
    if user:
        token = secrets.token_urlsafe(32)
        _reset_tokens[token] = (user.maNguoiDung, datetime.now(timezone.utc) + timedelta(minutes=_RESET_TOKEN_MINUTES))
        link = f'{settings.frontend_url.rstrip("/")}/reset?token={token}'
        try:
            _send_reset_email(user.thuDienTu, link)
        except Exception:
            _reset_tokens.pop(token, None)
            logger.exception('Could not send password reset email')
            raise HTTPException(503, 'Không thể gửi email lúc này. Vui lòng kiểm tra cấu hình SMTP.')
    return {'message': 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn khôi phục mật khẩu.'}

def _send_reset_email(recipient, link):
    if not settings.smtp_host or not settings.smtp_username or not settings.smtp_password:
        raise RuntimeError('SMTP is not configured')
    message = EmailMessage()
    message['Subject'] = 'Khôi phục mật khẩu CookHub'
    message['From'] = settings.smtp_from or settings.smtp_username
    message['To'] = recipient
    message.set_content(
        'Bạn vừa yêu cầu khôi phục mật khẩu CookHub.\n\n'
        f'Mở liên kết sau trong vòng {_RESET_TOKEN_MINUTES} phút để đặt mật khẩu mới:\n{link}\n\n'
        'Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email này.'
    )
    with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as server:
        if settings.smtp_starttls:
            server.starttls()
        server.login(settings.smtp_username, settings.smtp_password)
        server.send_message(message)

@router.post('/reset')
def reset(data: s.Reset, response: Response, db: Session = Depends(get_db)):
    record = _reset_tokens.get(data.token)
    if not record:
        raise HTTPException(400, 'Liên kết khôi phục không hợp lệ hoặc đã hết hạn.')
    user_id, expires_at = record
    if datetime.now(timezone.utc) >= expires_at:
        _reset_tokens.pop(data.token, None)
        raise HTTPException(400, 'Liên kết khôi phục đã hết hạn. Vui lòng yêu cầu mã mới.')
    user = db.get(m.NguoiDung, user_id)
    if not user:
        _reset_tokens.pop(data.token, None)
        raise HTTPException(400, 'Liên kết khôi phục không hợp lệ.')
    user.matKhauBam = passwords.hash(data.password)
    db.commit()
    _reset_tokens.pop(data.token, None)
    return {'message': 'Đã đổi mật khẩu. Bạn có thể đăng nhập.'}

