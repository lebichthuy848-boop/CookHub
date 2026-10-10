from datetime import date

from app import models as m
from app.security import passwords


def login_moderator(client, factory):
    with factory() as db:
        db.add(m.NguoiDung(maNguoiDung='QTND01', hoTen='Quản trị nội dung',
                           thuDienTu='moderator@test.local', matKhauBam=passwords.hash('12345678'),
                           vaiTro='Quản trị nội dung', trangThai='Đang hoạt động'))
        db.add_all([
            m.DanhGiaMonAn(maDanhGia='DGWAIT', maNguoiDung='ND001', maMonAn='MA001', soSao=5,
                           noiDung='Đánh giá chờ duyệt', ngayDanhGia=date.today(), trangThaiKiemDuyet='Chờ duyệt'),
            m.DanhGiaMonAn(maDanhGia='DGDELETE', maNguoiDung='ND001', maMonAn='MA001', soSao=1,
                           noiDung='Đánh giá cần xóa', ngayDanhGia=date.today(), trangThaiKiemDuyet='Chờ duyệt'),
        ])
        db.commit()
    response=client.post('/api/auth/login',json={'email':'moderator@test.local','password':'12345678'})
    assert response.status_code==200, response.text


def test_review_approve_reject_and_delete(setup):
    client,factory=setup
    login_moderator(client,factory)

    response=client.get('/api/admin/reviews')
    assert response.status_code==200
    assert {item['id'] for item in response.json()}=={'DGWAIT','DGDELETE'}

    response=client.put('/api/admin/reviews/DGWAIT/moderation',json={'status':'Đã duyệt','note':'Nội dung phù hợp'})
    assert response.status_code==200
    response=client.put('/api/admin/reviews/DGWAIT/moderation',json={'status':'Từ chối','note':'Cần xem xét lại'})
    assert response.status_code==200

    response=client.delete('/api/admin/reviews/DGDELETE')
    assert response.status_code==204
    with factory() as db:
        review=db.get(m.DanhGiaMonAn,'DGWAIT')
        assert review.trangThaiKiemDuyet=='Từ chối'
        assert review.maNguoiKiemDuyet=='QTND01'
        assert review.ghiChuKiemDuyet=='Cần xem xét lại'
        assert db.get(m.DanhGiaMonAn,'DGDELETE') is None
