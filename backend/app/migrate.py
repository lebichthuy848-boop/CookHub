"""Kiểm tra mapping ORM với schema SQL Server V2; không tạo bảng ngoài V2."""
from sqlalchemy import inspect
from .database import engine, Base
from . import models  # noqa: F401 - register all V2 models

def validate_v2_schema():
    inspector = inspect(engine)
    database_tables = set(inspector.get_table_names(schema='dbo'))
    model_tables = set(Base.metadata.tables)
    missing = sorted(model_tables - database_tables)
    if missing:
        raise RuntimeError('Thiếu bảng V2 trong SQL Server: ' + ', '.join(missing))
    differences = []
    for table in model_tables:
        expected = {column.name.casefold() for column in Base.metadata.tables[table].columns}
        actual = {column['name'].casefold() for column in inspector.get_columns(table, schema='dbo')}
        if expected != actual:
            differences.append(table)
    if differences:
        raise RuntimeError('Cột ORM không khớp Schema V2: ' + ', '.join(differences))
    return len(model_tables)