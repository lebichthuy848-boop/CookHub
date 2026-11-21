from datetime import date
from types import SimpleNamespace

from app.nutrition import _result, SQL_COLUMNS
from app.household import distribution


def uncertain_oil():
    return {
        'MaChiTiet': 'CTTD1', 'MaThanhPhan': 'TP1053', 'MaNguyenLieu': 'NL072',
        **{column: 100 for column in SQL_COLUMNS.values()},
        'ChiPhi': 25000, 'ThieuLuongAnDuoc': True,
        'LyDoLuongAnDuoc': 'Chưa xác định dầu hấp thụ.',
        'NguonLuongAnDuoc': 'https://www.fao.org/4/y4705e/y4705e23.htm',
    }


def test_prepared_oil_is_not_reported_as_eaten_even_with_numeric_values():
    oil = uncertain_oil()
    known = {'MaNguyenLieu': 'NL1050', **{column: 2 for column in SQL_COLUMNS.values()}}
    result = _result([oil, known], {'NL072': 'Dầu ăn'})
    assert not result['complete']
    assert result['missing_ingredients'] == ['Dầu ăn']
    assert all(value == 2 for value in result['totals'].values())
    assert result['breakdown'] == [{'ingredient_id': 'NL1050', 'nang_luong': 2}]
    assert result['processing_issues'][0]['source'].startswith('https://www.fao.org/')
    assert oil['ChiPhi'] == 25000 and oil['NangLuong'] == 100


def test_processing_unknown_is_not_suppressed_by_unspecified_unit():
    oil = uncertain_oil()
    oil['DonViTinhKyHieu'] = 'ít'
    result = _result([oil])
    assert not result['complete']
    assert result['processing_issues']


def test_zero_nutrients_from_a_measured_portion_are_still_valid():
    row = {'MaNguyenLieu': 'NL080', 'ThieuLuongAnDuoc': False,
           **dict.fromkeys(SQL_COLUMNS.values(), 0)}
    result = _result([row])
    assert result['complete']
    assert not result['processing_issues']
    assert len(result['breakdown']) == 1


def test_processing_uncertainty_survives_household_portion_distribution():
    member = dict(id='adult', name='A', sex='female', age=30, height=160, weight=60,
                  activity='1.4', goal='maintain')
    state = dict(revision=0, members=[member], days={}, active_ids=['adult'])
    row = uncertain_oil()
    item = SimpleNamespace(maChiTiet='CTTD1', soKhauPhan=2)
    result = distribution(state, date(2026, 11, 19), [item], [row], {'NL072': 'Dầu ăn'})
    nutrition = result['members'][0]
    assert not nutrition['complete']
    assert nutrition['processing_issues'][0]['name'] == 'Dầu ăn'
    assert nutrition['totals']['nang_luong'] == 0


def test_unknown_processing_does_not_become_zero_in_recommendations():
    from app.routers.personal import menu_nutrition_options
    rows = [('MA916', None, None, None, None, None, None, False, False)]
    db = SimpleNamespace(bind=SimpleNamespace(dialect=SimpleNamespace(name='mssql')),
                         execute=lambda *args, **kwargs: SimpleNamespace(all=lambda: rows))
    result = menu_nutrition_options(date(2026, 11, 19), user=None, db=db)
    assert all(value is None for value in result[0]['totals'].values())
