"""Align SQL Server code counters with imported rows after a database restore.

Run with backend venv and PYTHONPATH=backend. Does not change application data.
"""
from sqlalchemy import text
from app.database import engine


def synchronize():
    changes = []
    with engine.begin() as conn:
        if conn.dialect.name != 'mssql':
            raise RuntimeError('Only SQL Server supports QuyUocMaHeThong')
        counters = conn.execute(text('''SELECT LoaiMa,TenBang,TenCot,TienTo,SoHienTai
            FROM dbo.QuyUocMaHeThong WITH (UPDLOCK,HOLDLOCK)''')).mappings().all()
        for counter in counters:
            table, column, prefix = counter['TenBang'], counter['TenCot'], counter['TienTo']
            # Identifiers come from the server's allocator table, but verify them
            # against actual schema objects before interpolating into SQL.
            found = conn.scalar(text('''SELECT COUNT(*) FROM sys.tables t
                JOIN sys.columns c ON c.object_id=t.object_id
                WHERE t.schema_id=SCHEMA_ID('dbo') AND t.name=:table AND c.name=:column'''),
                {'table': table, 'column': column})
            if found != 1 or not all(ch.isalnum() or ch == '_' for ch in table + column):
                raise RuntimeError(f'Invalid allocator mapping: {table}.{column}')
            maximum = conn.scalar(text(f'''SELECT MAX(TRY_CONVERT(BIGINT,
                SUBSTRING([{column}],LEN(:prefix)+1,20))) FROM dbo.[{table}]
                WHERE LEFT([{column}],LEN(:prefix))=:prefix'''), {'prefix': prefix}) or 0
            previous = int(counter['SoHienTai'])
            if maximum > previous:
                conn.execute(text('''UPDATE dbo.QuyUocMaHeThong SET SoHienTai=:maximum
                    WHERE LoaiMa=:kind'''), {'maximum': maximum, 'kind': counter['LoaiMa']})
                changes.append((counter['LoaiMa'], previous, maximum))
    return changes


if __name__ == '__main__':
    for kind, old, new in synchronize():
        print(f'{kind}: {old} -> {new}')
