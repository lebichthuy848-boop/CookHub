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


@pytest.mark.parametrize('column', list(SQL_COLUMNS.values()))
@pytest.mark.parametrize('value', [0, 12.5])
def test_each_known_nutrient_counts_despite_legacy_missing_conversion_flag(column, value):
    result = _result([{
        'MaNguyenLieu': 'NL106', 'DonViTinhKyHieu': 'g',
        'ThieuQuyDoiDinhDuong': True, column: value,
    }], {'NL106': 'Gà ác'})
    metric = next(key for key, sql_column in SQL_COLUMNS.items() if sql_column == column)
    assert result['totals'][metric] == value
    assert result['missing_ingredients'] == []
    assert result['partial_ingredients'] == ['Gà ác']
    assert result['complete'] is False
    assert all(result['totals'][key] == 0 for key in SQL_COLUMNS if key != metric)


def test_partial_nutrients_are_summed_without_replacing_missing_kcal():
    result = _result([
        {'MaNguyenLieu': 'NL106', 'ThieuQuyDoiDinhDuong': True,
         'NangLuong': None, 'ChatDam': 22.3, 'ChatBeo': 2.3},
        {'MaNguyenLieu': 'NL011', 'NangLuong': 250, 'ChatDam': 26, 'ChatBeo': 15},
    ])
    assert result['totals']['nang_luong'] == 250
    assert result['totals']['chat_dam'] == 48.3
    assert result['totals']['chat_beo'] == 17.3


def test_recommendations_preserve_known_metrics_when_kcal_is_missing():
    from datetime import date
    from types import SimpleNamespace
    from app.routers.personal import menu_nutrition_options
    rows = [
        ('MA102', None, 22.3, None, 2.3, None, None, 'DVT001', 'Gam', False, True, True, None),
        ('MA102', 100, 5, 20, 1, 3, 50, 'DVT001', 'Gam', False, False, False, None),
    ]
    db = SimpleNamespace(
        bind=SimpleNamespace(dialect=SimpleNamespace(name='mssql')),
        execute=lambda *args, **kwargs: SimpleNamespace(all=lambda: rows),
    )
    result = menu_nutrition_options(date(2026, 11, 19), user=None, db=db)
    assert result[0]['totals']['nang_luong'] == 100
    assert result[0]['totals']['chat_dam'] == 27.3
    assert result[0]['totals']['chat_beo'] == 3.3
    assert result[0]['totals']['chat_xo'] == 3
    assert result[0]['missing_metrics'] == ['chat_bot_duong', 'chat_xo', 'nang_luong', 'natri']
    assert not result[0]['complete']


def test_candidate_profiles_keep_any_unknown_nutrient_as_null():
    from app.nutrition import _dish_profile
    row = {column: 1 for column in SQL_COLUMNS.values()}
    row['ChatXo'] = None
    profile = _dish_profile([row])
    assert profile['chat_xo'] is None
    assert profile['nang_luong'] == 1
