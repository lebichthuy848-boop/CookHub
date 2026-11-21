"""Build reviewable SQL from the inspected schema. Never connects to a DB."""
import hashlib
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / 'docs' / 'kcal-review'
METHOD = 'https://www.fao.org/4/y4705e/y4705e23.htm'


def sql_string(value):
    return "N'" + str(value).replace("'", "''") + "'"


def normalize_sql(expression):
    result = expression
    for char in ('CHAR(13)', 'CHAR(10)', 'CHAR(9)', "N' '"):
        result = f"REPLACE({result},{char},N'')"
    return f"REPLACE(REPLACE(UPPER({result}),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION')"


def build():
    snapshot = json.loads((DOCS / 'demo-readiness-current.json').read_text(encoding='utf-8'))
    definitions = json.loads((DOCS / 'live-function-definitions.json').read_text(encoding='utf-8'))
    ingredients = {row['MaThanhPhan']: row for row in snapshot['ingredients']}
    # No empirical absorption or broth coefficient is available. NULL is
    # intentional: these are review flags, not invented replacement totals.
    descriptions = {
        'TP21618': 'Dầu chuẩn bị chiên hoành thánh, chưa có lượng dầu ăn vào.',
        'TP908': 'Dầu dùng nhiều công đoạn của nem nướng, chưa tách dầu chiên dư.',
        'TP981': 'Dầu chiên gà, chưa có lượng dầu hấp thụ.',
        'TP1053': 'Dầu chiên đậu hũ, chưa có lượng dầu hấp thụ.',
        'TP1049': 'Trứng dùng áo đậu hũ, chưa xác định phần còn dư.',
        'TP1051': 'Bột chiên xù dùng áo, chưa xác định phần bám và phần dư.',
        'TP1052': 'Bột mì dùng áo đậu hũ, chưa xác định phần bám và phần dư.',
        'TP972': 'Bột mì gồm phần làm mì và phần áo gà, chưa xác định tổng lượng ăn vào.',
        'TP973': 'Trứng dùng làm mì và áo gà, chưa tách phần dư.',
        'TP979': 'Bột dùng áo gà, chưa xác định phần bám và phần dư.',
        'TP1170': 'Xương nấu nước dùng, không áp hồ sơ chất béo cho toàn bộ xương.',
        'TP1211': 'Xương nấu nước dùng, chưa có hồ sơ nước dùng tương ứng.',
        'TP23003': 'Xương nấu phở, chưa có hồ sơ nước dùng tương ứng.',
        'TP1169': 'Cua đồng xay lọc bã, chưa có lượng thịt/gạch hòa vào nước dùng.',
        'TP1112': '500 g muối hột lót nồi hấp gà, không phải lượng muối được ăn toàn bộ.',
        'TP93892': 'Muối bóp rửa bạch tuộc rồi xả sạch, chưa có lượng natri còn lại.',
        'TP93885': 'Giấm bóp rửa bạch tuộc rồi xả sạch, không ăn toàn bộ lượng sơ chế.',
        'TP93909': 'Muối trong nước ngâm dưa, chưa xác định lượng muối vào phần dưa ăn được.',
        'TP93910': 'Đường trong nước ngâm dưa, chưa xác định lượng còn trong phần ăn được.',
        'TP93914': 'Giấm trong nước ngâm dưa, không ăn toàn bộ lượng nước ngâm.',
    }
    rules = [{**ingredients[key], 'LyDo': reason, 'NguonPhuongPhap': METHOD}
             for key, reason in descriptions.items()]
    (DOCS / 'processing-rules.json').write_text(json.dumps(rules, ensure_ascii=False, indent=2), encoding='utf-8')
    ddl = '''CREATE TABLE dbo.DinhDuongThanhPhanCheBien (
 MaThanhPhan NVARCHAR(20) NOT NULL PRIMARY KEY,
 MaNguyenLieuDoiChieu NVARCHAR(20) NOT NULL,
 MaDonViDoiChieu NVARCHAR(20) NOT NULL,
 SoLuongDoiChieu DECIMAL(24,8) NOT NULL CHECK(SoLuongDoiChieu>0),
 MaNguyenLieuAnDuoc NVARCHAR(20) NULL REFERENCES dbo.NguyenLieu(MaNguyenLieu),
 GramAnDuocMoiMe DECIMAL(24,8) NULL CHECK(GramAnDuocMoiMe>=0),
 NguonKhoiLuong NVARCHAR(2000) NULL,
 LyDo NVARCHAR(1000) NOT NULL,
 NguonPhuongPhap NVARCHAR(2000) NOT NULL,
 CONSTRAINT FK_DDThanhPhanCheBien FOREIGN KEY(MaThanhPhan)
  REFERENCES dbo.ThanhPhanCongThuc(MaThanhPhan),
 CONSTRAINT CK_DDThanhPhanCheBien_Nguon CHECK(
  GramAnDuocMoiMe IS NULL OR (MaNguyenLieuAnDuoc IS NOT NULL AND NguonKhoiLuong IS NOT NULL AND
    (NguonKhoiLuong LIKE N'https://%' OR NguonKhoiLuong LIKE N'http://%')))
);'''
    fixed = ('MaThongTin', 'KhoiLuongChuan', 'DonViDinhDuong', 'MaGia', 'NgayApDung',
             'DonViGia', 'GiaThamKhao', 'KhuVuc')
    select = [f'CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.{column} ELSE b.{column} END AS {column}'
              if column in ('MaThongTin', 'KhoiLuongChuan', 'DonViDinhDuong') else f'b.{column}'
              for column in fixed]
    # Costs always use prepared quantity. Only nutrition uses edible quantity.
    select += ['CASE WHEN r.MaThanhPhan IS NULL THEN b.HeSoDinhDuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.HeSoDinhDuong END AS HeSoDinhDuong',
               'b.LuongTinhGia']
    for column in ('NangLuong', 'ChatDam', 'ChatBotDuong', 'ChatBeo', 'ChatXo', 'Natri'):
        select.append(f'CASE WHEN r.MaThanhPhan IS NULL THEN b.{column} WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.{column} END AS {column}')
    select += ['b.ChiPhi', 'CAST(CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ThieuDinhDuong ELSE b.ThieuDinhDuong END AS BIT) AS ThieuDinhDuong',
               'CAST(CASE WHEN r.MaThanhPhan IS NULL THEN b.ThieuQuyDoiDinhDuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ThieuQuyDoiDinhDuong ELSE 0 END AS BIT) AS ThieuQuyDoiDinhDuong',
               'b.ThieuGiaKhaDung',
               'CAST(CASE WHEN r.MaThanhPhan IS NOT NULL AND (v.HopLe=0 OR r.GramAnDuocMoiMe IS NULL) THEN 1 ELSE 0 END AS BIT) AS ThieuLuongAnDuoc',
               "CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=0 THEN N'Công thức/đơn vị đã đổi; cần kiểm tra lại lượng ăn được.' ELSE r.LyDo END AS LyDoLuongAnDuoc",
               'COALESCE(r.NguonKhoiLuong,r.NguonPhuongPhap) AS NguonLuongAnDuoc']
    helper = '''CREATE OR ALTER FUNCTION dbo.FnTinhThanhPhanDinhDuong
(@MaThanhPhan NVARCHAR(20),@MaNguyenLieu NVARCHAR(20),@SoLuong DECIMAL(24,8),
 @MaDonVi NVARCHAR(20),@Ngay DATE,@KhuVuc NVARCHAR(150),@DaTuyBien BIT)
RETURNS TABLE AS RETURN
SELECT
 ''' + ',\n '.join(select) + '''
FROM dbo.FnTinhNguyenLieu(@MaNguyenLieu,@SoLuong,@MaDonVi,@Ngay,@KhuVuc) b
LEFT JOIN dbo.DinhDuongThanhPhanCheBien r ON r.MaThanhPhan=@MaThanhPhan
LEFT JOIN dbo.ThanhPhanCongThuc tp ON tp.MaThanhPhan=@MaThanhPhan
OUTER APPLY(SELECT CASE WHEN @DaTuyBien=0
 AND tp.MaNguyenLieu=r.MaNguyenLieuDoiChieu AND @MaNguyenLieu=r.MaNguyenLieuDoiChieu
 AND tp.MaDonVi=r.MaDonViDoiChieu AND @MaDonVi=r.MaDonViDoiChieu
 AND tp.SoLuong=r.SoLuongDoiChieu THEN 1 ELSE 0 END AS HopLe) v
OUTER APPLY(SELECT TRY_CONVERT(DECIMAL(24,8),
 CASE WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL
 THEN r.GramAnDuocMoiMe*@SoLuong/NULLIF(r.SoLuongDoiChieu,0) END) AS SoGram) g
OUTER APPLY(SELECT a.* FROM dbo.FnTinhNguyenLieu(r.MaNguyenLieuAnDuoc,g.SoGram,N'DVT001',@Ngay,@KhuVuc) a
 WHERE g.SoGram IS NOT NULL) a;'''
    modified = {}
    for name in ('FnTinhMonAn', 'FnTinhChiTietThucDon'):
        original = definitions[name].strip()
        amended = re.sub(r'^CREATE\s+FUNCTION', 'CREATE OR ALTER FUNCTION', original, count=1, flags=re.I)
        if name == 'FnTinhMonAn':
            before = 'dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc)'
            after = 'dbo.FnTinhThanhPhanDinhDuong(n.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc,0)'
        else:
            before = 'dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc)'
            after = 'dbo.FnTinhThanhPhanDinhDuong(tp.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc,CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT))'
        assert amended.count(before) == 1
        modified[name] = amended.replace(before, after)
    lines = ['USE QuanLyThucDon;', 'GO', 'SET XACT_ABORT ON;', 'SET NOCOUNT ON;',
             '-- NO changes to the 80 dishes, recipe quantities, steps or raw ingredient nutrition.',
             '-- NULL edible weight means UNKNOWN, not zero. This does not finish 20 demo recipes.',
             '-- Review method source: ' + METHOD,
             'BEGIN TRY', ' BEGIN TRANSACTION;',
             " IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT001' AND KyHieu=N'g')",
             "  THROW 51500,N'DVT001 must be grams.',1;"]
    for index, name in enumerate(modified):
        current = normalize_sql(f"OBJECT_DEFINITION(OBJECT_ID(N'dbo.{name}'))")
        old = normalize_sql(sql_string(definitions[name].strip()))
        new = normalize_sql(sql_string(modified[name]))
        lines += [f' IF {current} IS NULL OR {current} NOT IN ({old},{new})',
                  f"  THROW {51501+index},N'{name} changed since review. No updates committed.',1;"]
    lines += [" IF OBJECT_ID(N'dbo.DinhDuongThanhPhanCheBien',N'U') IS NULL", '  EXEC(' + sql_string(ddl) + ');']
    for index, rule in enumerate(rules):
        key = rule['MaThanhPhan']
        lines += [f" IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan={sql_string(key)} AND MaCongThuc={sql_string(rule['MaCongThuc'])} AND MaNguyenLieu={sql_string(rule['MaNguyenLieu'])} AND MaDonVi={sql_string(rule['MaDonVi'])} AND SoLuong={rule['SoLuong']})",
                  f"  THROW {51600+index},N'{key} differs from reviewed recipe. No updates committed.',1;"]
    # Dynamic SQL permits first-run compilation after creating the new table.
    seed = []
    for rule in rules:
        values = [sql_string(rule[k]) for k in ('MaThanhPhan', 'MaNguyenLieu', 'MaDonVi')]
        values += [str(rule['SoLuong']), 'NULL', 'NULL', sql_string(rule['LyDo']), sql_string(METHOD)]
        seed.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan={sql_string(rule['MaThanhPhan'])})\n INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES({','.join(values)});")
    lines += [' EXEC(' + sql_string('\n'.join(seed)) + ');', ' EXEC(' + sql_string(helper) + ');']
    for value in modified.values():
        lines += [' EXEC(' + sql_string(value) + ');']
    lines += [' COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH',
              ' IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;', ' THROW;', 'END CATCH;', 'GO',
              "SELECT m.MaMonAn,m.TenMonAn,f.MaThanhPhan,f.NangLuong,f.ChiPhi,f.ThieuLuongAnDuoc,f.LyDoLuongAnDuoc",
              'FROM dbo.MonAn m CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS DATE),NULL) f',
              'WHERE f.ThieuLuongAnDuoc=1;', 'GO', '']
    path = ROOT / 'scripts' / 'fix_processing_nutrition.sql'
    path.write_text('\n'.join(lines), encoding='utf-8-sig')
    # Exact original function definitions for user-run rollback; review records
    # may stay for provenance but cease to affect either calculation function.
    rollback = ['USE QuanLyThucDon;', 'GO', 'SET XACT_ABORT ON;', 'BEGIN TRY', ' BEGIN TRANSACTION;']
    for name in modified:
        current = normalize_sql(f"OBJECT_DEFINITION(OBJECT_ID(N'dbo.{name}'))")
        old = normalize_sql(sql_string(definitions[name].strip()))
        new = normalize_sql(sql_string(modified[name]))
        rollback += [f' IF {current} IS NULL OR {current} NOT IN ({old},{new})',
                     f"  THROW 51700,N'{name} differs from this patch; rollback stopped.',1;"]
        original = re.sub(r'^\s*CREATE\s+FUNCTION', 'CREATE OR ALTER FUNCTION', definitions[name], count=1, flags=re.I)
        rollback.append(' EXEC(' + sql_string(original) + ');')
    rollback += [' COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH', ' IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;', ' THROW;', 'END CATCH;', 'GO', '']
    (ROOT / 'scripts' / 'rollback_processing_nutrition.sql').write_text('\n'.join(rollback), encoding='utf-8-sig')
    print(json.dumps({'rules': len(rules), 'sql': str(path), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'executed': False}))


if __name__ == '__main__':
    build()
