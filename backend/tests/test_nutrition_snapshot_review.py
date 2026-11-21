from scripts.review_nutrition_snapshot import audit


def snapshot(**nutrients):
    return {
        'dishes': [{'MaMonAn': 'MA1', 'TenMonAn': 'Món', 'MaCongThuc': 'CT1', 'SoKhauPhanChuan': 4}],
        'ingredients': [{'MaThanhPhan': 'TP1', 'MaCongThuc': 'CT1', 'MaNguyenLieu': 'NL1',
                         'MaDonVi': 'g', 'SoLuong': 200, 'TenNguyenLieu': 'Đậu', 'GhiChuNguyenLieu': ''}],
        'units': [{'MaDonVi': 'g', 'KyHieu': 'g', 'HeSoGramChuan': 1}],
        'nutrients': [{'MaNguyenLieu': 'NL1', 'MaDonVi': 'g', 'KhoiLuongChuan': 100, **nutrients}],
        'conversions': [], 'steps': [],
    }


def test_snapshot_audit_preserves_partial_values_and_scales_one_serving():
    report, details = audit(snapshot(NangLuong=None, ChatDam=20, ChatBotDuong=0,
                                     ChatBeo=0, ChatXo=2, natri=0))
    assert report[0]['TongDaBietMotPhan']['ChatDam'] == 10
    assert report[0]['TongDaBietMotPhan']['ChatXo'] == 1
    assert report[0]['SoDongThieuTheoChiSo'] == {'NangLuong': 1}
    assert report[0]['DuSauChiSoVaQuyDoi'] is False
    assert details[0]['HeSoMotPhan'] == '0.5'


def test_complete_numeric_profile_is_not_source_verified():
    report, _ = audit(snapshot(NangLuong=100, ChatDam=20, ChatBotDuong=0,
                              ChatBeo=0, ChatXo=2, natri=0))
    assert report[0]['DuSauChiSoVaQuyDoi'] is True
    assert report[0]['TrangThaiNguon'].startswith('Chua duyet')


def test_missing_conversion_does_not_assume_a_piece_is_a_gram():
    data = snapshot(NangLuong=100, ChatDam=20, ChatBotDuong=0, ChatBeo=0, ChatXo=2, natri=0)
    data['ingredients'][0].update(MaDonVi='piece', SoLuong=1)
    data['units'].append({'MaDonVi': 'piece', 'KyHieu': 'miếng', 'HeSoGramChuan': None})
    report, details = audit(data)
    assert report[0]['SoDongThieuTheoChiSo']['NangLuong'] == 1
    assert details[0]['HeSoMotPhan'] == ''
