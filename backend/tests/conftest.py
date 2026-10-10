import os, sys
if '--real-db' not in sys.argv:
    os.environ.setdefault('DATABASE_URL', 'sqlite://')
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from app.database import Base, get_db
from app.main import app, attempts
from app import models as m
from app.security import passwords

def pytest_addoption(parser):
    parser.addoption('--real-db', action='store_true', default=False)

@pytest.fixture
def real_db(request):
    if not request.config.getoption('--real-db'):
        pytest.skip('Cần chạy với --real-db')
    from app.config import settings
    engine = create_engine(settings.database_url, pool_pre_ping=True)
    factory = sessionmaker(bind=engine, expire_on_commit=False)
    with factory() as db: yield db
    engine.dispose()

@pytest.fixture
def setup():
    engine=create_engine('sqlite://',connect_args={'check_same_thread':False},poolclass=StaticPool)
    @event.listens_for(engine,'connect')
    def foreign_keys(c, _): c.execute('PRAGMA foreign_keys=ON')
    Base.metadata.create_all(engine)
    factory=sessionmaker(bind=engine,expire_on_commit=False)
    with factory() as db:
        db.add_all([
            m.NguoiDung(maNguoiDung='ND001',hoTen='User',thuDienTu='user@test.local',matKhauBam=passwords.hash('12345678'),vaiTro='Người dùng',trangThai='Đang hoạt động'),
            m.DanhMucMonAn(maDanhMuc='DM001',tenDanhMuc='Món chính',moTa=''),
            m.DonViTinh(maDonVi='DV001',tenDonVi='Gram',kyHieu='g'),
            m.NguyenLieu(maNguyenLieu='NL001',tenNguyenLieu='Gạo',moTa=''),
        ]); db.commit()
        db.add(m.MonAn(maMonAn='MA001',maDanhMuc='DM001',tenMonAn='Cơm gà',moTa='Ngon',thoiGianCheBien=30,doKho='Dễ',duongDanAnh='images/logo.jpg')); db.commit()
        db.add(m.CongThuc(maCongThuc='CT001',maMonAn='MA001',moTa='',soKhauPhanChuan=1,daCongBo=1)); db.commit()
    def override():
        with factory() as db:
            try: yield db
            except Exception: db.rollback(); raise
    app.dependency_overrides[get_db]=override; attempts.clear()
    with TestClient(app) as client:
        client.headers['X-CookHub-Client']='web'; yield client,factory
    app.dependency_overrides.clear(); engine.dispose()

@pytest.fixture
def client(setup): return setup[0]

def login(client):
    result=client.post('/api/auth/login',json={'email':'user@test.local','password':'12345678'})
    assert result.status_code==200, result.text
    return result