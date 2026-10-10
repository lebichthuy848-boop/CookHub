"""Generate explicit ORM mappings from the legacy SQL; never connects to a DB."""
from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
sql = (root / 'backend/database/KLCN_QuanLyThucDon_MySQL_Full.sql').read_text(encoding='utf-8-sig')
output = ['"""Legacy table and column names preserved for in-place migration."""',
          'from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, Text, ForeignKey',
          'from .database import Base', '']
for name, body in re.findall(r'CREATE TABLE (\w+) \((.*?)\) ENGINE', sql, re.S):
    composite = re.search(r'CONSTRAINT \w+ PRIMARY KEY \((.*?)\)', body)
    keys = [s.strip() for s in composite[1].split(',')] if composite else []
    foreign = {a: (b, c) for a, b, c in re.findall(r'FOREIGN KEY \((\w+)\) REFERENCES (\w+)\((\w+)\)', body)}
    unique = re.findall(r'UNIQUE \((\w+)\)', body)
    output += [f'class {name}(Base):', f'    __tablename__ = "{name}"']
    for line in body.splitlines():
        match = re.match(r'\s*(\w+)\s+(VARCHAR\((\d+)\)|DECIMAL\(18,2\)|INT|LONGTEXT|DATE)\s+(.*)', line)
        if not match:
            continue
        col, kind, length, rest = match.groups()
        typ = f'String({length})' if length else {'INT': 'Integer', 'LONGTEXT': 'Text', 'DATE': 'Date', 'DECIMAL(18,2)': 'Numeric(18, 2)'}[kind]
        args = [typ]
        if col in foreign:
            args.append(f'ForeignKey("{foreign[col][0]}.{foreign[col][1]}")')
        if col in keys or 'PRIMARY KEY' in rest:
            args.append('primary_key=True')
        else:
            args.append(f'nullable={"NOT NULL" not in rest}')
        if col in unique:
            args.append('unique=True')
        output.append(f'    {col} = Column({", ".join(args)})')
    output += ['', '']
for name in ['MonAnTrangChu', 'MonAnTrangKhamPha']:
    output += [f'class {name}(Base):', f'    __tablename__ = "{name}"',
               '    maMonAn = Column(String(50), ForeignKey("MonAn.maMonAn", ondelete="CASCADE"), primary_key=True)',
               '    thuTu = Column(Integer, nullable=False, default=0)', '', '']
for name in ['ApiSession', 'PasswordReset']:
    output += [f'class {name}(Base):', f'    __tablename__ = "{name}"',
               '    token_hash = Column(String(64), primary_key=True)',
               '    user_id = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False, index=True)',
               '    expires_at = Column(DateTime, nullable=False)', '', '']
(root / 'backend/app/models.py').write_text('\n'.join(output), encoding='utf-8')

