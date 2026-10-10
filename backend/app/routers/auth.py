import logging
import secrets
from fastapi import APIRouter, Depends, HTTPException, Response, Cookie
from sqlalchemy import select, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from .. import models as m, schemas as s
from ..database import get_db
from ..security import current_user, verify_password, passwords, public_user, create_session, COOKIE

router = APIRouter(prefix='/auth', tags=['Authentication'])
logger = logging.getLogger(__name__)

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

@router.post('/forgot', status_code=501)
def forgot():
    raise HTTPException(501, 'Schema V2 không có bảng lưu mã khôi phục. Hãy đổi mật khẩu sau khi đăng nhập.')

@router.post('/reset', status_code=501)
def reset():
    raise HTTPException(501, 'Schema V2 không hỗ trợ mã khôi phục mật khẩu.')
