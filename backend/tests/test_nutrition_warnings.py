import pytest
from app.nutrition import _result, SQL_COLUMNS


@pytest.mark.parametrize('unit', ['ít', '1 ít', '  1   ít  ', 'ÍT', '1\u00a0ít'])
@pytest.mark.parametrize('flag', ['ThieuDinhDuong', 'ThieuQuyDoiDinhDuong'])
def test_unspecified_amount_does_not_warn(unit, flag):
    result = _result([{'MaNguyenLieu': 'NL1', 'DonViTinhKyHieu': unit, flag: True}], {'NL1': 'Gia vị'})
    assert result['complete'] is True
    assert result['missing_ingredients'] == []
    assert result['breakdown'] == []
    assert all(value == 0 for value in result['totals'].values())


def test_same_ingredient_in_measured_unit_still_warns():
    rows = [
        {'MaNguyenLieu': 'NL1', 'DonViTinhKyHieu': 'ít', 'ThieuDinhDuong': True},
        {'MaNguyenLieu': 'NL1', 'DonViTinhKyHieu': 'g', 'ThieuDinhDuong': True},
        {'MaNguyenLieu': 'NL2', 'DonViTinhKyHieu': 'gói', 'ThieuQuyDoiDinhDuong': True},
    ]
    result = _result(rows, {'NL1': 'Muối', 'NL2': 'Phở'})
    assert result['complete'] is False
    assert set(result['missing_ingredients']) == {'Muối', 'Phở'}


def test_known_values_and_zero_values_are_preserved():
    rows = [dict(MaNguyenLieu='NL1', DonViTinhKyHieu='ít', **{col: 0 for col in SQL_COLUMNS.values()}),
            dict(MaNguyenLieu='NL2', DonViTinhKyHieu='g', **{col: 2 for col in SQL_COLUMNS.values()})]
    result = _result(rows)
    assert result['complete'] is True
    assert all(value == 2 for value in result['totals'].values())
    assert len(result['breakdown']) == 2


def test_unknown_unit_is_not_silently_ignored():
    result = _result([{'MaNguyenLieu': 'NL1', 'ThieuDinhDuong': True}])
    assert result['complete'] is False
    assert result['missing_ingredients'] == ['NL1']
