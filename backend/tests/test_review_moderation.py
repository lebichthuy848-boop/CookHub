from app import models as m
from app.security import passwords
from conftest import login


def test_reviews_publish_immediately_and_content_admin_can_remove_them(setup):
    client, factory = setup
    with factory() as db:
        db.add(m.NguoiDung(maNguoiDung='QTND01', hoTen='Quản trị nội dung',
                           thuDienTu='moderator@test.local', matKhauBam=passwords.hash('12345678'),
                           vaiTro='Quản trị nội dung', trangThai='Đang hoạt động'))
        db.commit()

    login(client)
    created = client.post('/api/dishes/MA001/reviews', json={'rating': 5, 'comment': 'Món ngon'})
    assert created.status_code == 201, created.text
    review_id = created.json()['id']
    public = client.get('/api/dishes/MA001/reviews')
    assert public.status_code == 200
    assert any(item['id'] == review_id and item['comment'] == 'Món ngon' for item in public.json())

    updated = client.put(f'/api/dishes/MA001/reviews/{review_id}', json={'rating': 4, 'comment': 'Món khá ngon'})
    assert updated.status_code == 200, updated.text
    assert any(item['id'] == review_id and item['rating'] == 4 for item in client.get('/api/dishes/MA001/reviews').json())
    with factory() as db:
        assert db.get(m.DanhGiaMonAn, review_id).trangThaiKiemDuyet == 'Đã duyệt'

    client.post('/api/auth/login', json={'email': 'moderator@test.local', 'password': '12345678'})
    listed = client.get('/api/admin/reviews')
    assert listed.status_code == 200
    assert any(item['id'] == review_id and item['dish_name'] == 'Cơm gà' for item in listed.json())
    deleted = client.delete(f'/api/admin/reviews/{review_id}')
    assert deleted.status_code == 204, deleted.text
    with factory() as db:
        assert db.get(m.DanhGiaMonAn, review_id) is None
