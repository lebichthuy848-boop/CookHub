from collections import Counter
from sqlalchemy import event, select
from app import models as m, schemas as s
from app.services import save_recipe


def test_recipe_lookups_are_loaded_once_and_new_ingredients_are_reused(setup):
    _, factory = setup
    reads = Counter()
    with factory() as db:
        def record(conn, cursor, statement, parameters, context, executemany):
            if statement.lstrip().upper().startswith('SELECT'):
                for table in ('NguyenLieu', 'DonViTinh', 'QuyDoiDonViNguyenLieu'):
                    if f'FROM [{table}]' in statement or f'FROM "{table}"' in statement:
                        reads[table] += 1
        event.listen(db.bind, 'before_cursor_execute', record)
        try:
            payload = s.Recipe(dish_id='MA001', servings=2,
                ingredients=[dict(name='Nguyên liệu mới', quantity=i + 1, unit_id='DV001', grams_per_unit=1)
                             for i in range(8)], steps=['Sơ chế', 'Nấu'])
            save_recipe(db, payload, recipe_id='CT001')
        finally:
            event.remove(db.bind, 'before_cursor_execute', record)
        assert reads == {'NguyenLieu': 1, 'DonViTinh': 1, 'QuyDoiDonViNguyenLieu': 1}
        assert len(db.scalars(select(m.NguyenLieu).where(m.NguyenLieu.tenNguyenLieu == 'Nguyên liệu mới')).all()) == 1
        assert len(db.scalars(select(m.QuyDoiDonViNguyenLieu)).all()) == 1
        assert len(db.scalars(select(m.ThanhPhanCongThuc)).all()) == 8
