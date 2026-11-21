"""Generate an offline, guarded TFDA nutrient patch; never connects to SQL Server."""
import csv
import hashlib
import json
import zipfile
from decimal import Decimal
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'backend/docs/source-audit/round2'
OUT = ROOT / 'output/nutrition-sources-round2'
OUT.mkdir(parents=True, exist_ok=True)
snapshot = json.loads((AUDIT / 'public-food-snapshot.json').read_text(encoding='utf-8'))['tables']
old = {r['MaNguyenLieu']: r for r in snapshot['ThongTinDinhDuong']}
ingredients = {r['MaNguyenLieu']: r for r in snapshot['NguyenLieu']}
archive = AUDIT / 'tfda-food-composition.json'
with zipfile.ZipFile(archive) as z:
    raw = json.loads(z.read('20_5.json'))
URL = 'https://data.fda.gov.tw/data/opendata/export/20/json'
fields = dict(NangLuong='修正熱量', ChatDam='粗蛋白', ChatBotDuong='總碳水化合物',
              ChatBeo='粗脂肪', ChatXo='膳食纖維', natri='鈉')
# All mappings below use the same food state as the ingredient description.
mapping = [
    ('NL033', 'G0300102', list(fields), 'Nấm rơm tươi sống; mẫu lấy năm 2025. Không dùng cho nấm đóng hộp.'),
    ('NL1050', 'R4701201', list(fields), 'Đậu hũ non/soft tofu; mẫu tham khảo chung, không phải kết quả kiểm nghiệm sản phẩm Việt Nam.'),
    ('NL125', 'G01101', list(fields), 'Nấm mèo KHÔ, khối lượng trước ngâm; không áp cho nấm đã ngâm nở.'),
    ('NL316', 'G01101', list(fields), 'Nấm mèo KHÔ, khối lượng trước ngâm; không áp cho nấm đã ngâm nở.'),
    ('NL131', 'N0100201', ['natri'], 'Chỉ bổ sung natri 1 mg/100 g từ mẫu đường phèn TFDA. Các chỉ số khác vẫn theo MEXT 03009: đây là hồ sơ tham khảo ghép nguồn, không phải một mẫu phân tích duy nhất. Không chuyển Tr của MEXT thành 0.'),
]
def q(s):
    return "N'" + str(s).replace("'", "''") + "'"
def num(v):
    return 'NULL' if v is None else format(Decimal(str(v)), '.2f')
def eq(col, val):
    return f'{col} IS NULL' if val is None else f'{col} = {num(val)}'

rows = []
sql = ['USE QuanLyThucDon;', 'GO', 'SET XACT_ABORT ON;',
       '-- OFFLINE PATCH: assistant did not execute this file. Review source CSV first.',
       'BEGIN TRY', 'BEGIN TRANSACTION;',
       "IF OBJECT_ID(N'dbo.NguonDinhDuongChiSo', N'U') IS NULL\nCREATE TABLE dbo.NguonDinhDuongChiSo (MaNguyenLieu nvarchar(20) NOT NULL, ChiSo nvarchar(40) NOT NULL, GiaTri decimal(10,2) NOT NULL, Nguon nvarchar(2048) NOT NULL, MaThucPham nvarchar(50) NOT NULL, GhiChu nvarchar(max) NOT NULL, GiaTriTruoc decimal(10,2) NULL, NgayDoiChieu datetime2 NOT NULL, CONSTRAINT PK_NguonDinhDuongChiSo PRIMARY KEY(MaNguyenLieu,ChiSo));"]
for key, code, selected, note in mapping:
    before = old[key]
    evidence = {r['分析項']: r for r in raw if r['整合編號'] == code and r['分析項'] in fields.values()}
    assert len(evidence) == 6
    sql.append(f'-- {key}: {ingredients[key]["TenNguyenLieu"]}; TFDA {code}; 100 g edible portion.')
    sql.append(f"IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WITH (UPDLOCK,HOLDLOCK) WHERE MaThongTin={q(before['MaThongTin'])} AND MaNguyenLieu={q(key)} AND KhoiLuongChuan=100 AND MaDonVi=N'DVT001') THROW 51001, N'Hồ sơ hoặc đơn vị chuẩn đã thay đổi; hãy đối chiếu lại.', 1;")
    for field in selected:
        e = evidence[fields[field]]
        assert e['每100克含量'] is not None, (key, field)
        value = str(Decimal(e['每100克含量'].strip()))
        unit = 'kcal' if field == 'NangLuong' else 'mg' if field == 'natri' else 'g'
        assert e['含量單位'] == unit
        rows.append(dict(MaNguyenLieu=key, TenNguyenLieu=ingredients[key]['TenNguyenLieu'], ChiSo=field,
                         GiaTri100g=value, DonVi=unit, GiaTriCu=before[field], MaTFDA=code,
                         TenNguon=e['樣品名稱'], URL=URL, GhiChu=note, BangChung=e))
        guard = f"({eq(field,before[field])} OR {field}={num(value)})"
        sql.append(f"IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaThongTin={q(before['MaThongTin'])} AND {guard}) THROW 51002, N'Dữ liệu đã đổi sau lần chụp; dừng để tránh ghi đè.', 1;")
        sql.append(f"IF NOT EXISTS (SELECT 1 FROM dbo.NguonDinhDuongChiSo WHERE MaNguyenLieu={q(key)} AND ChiSo={q(field)}) INSERT dbo.NguonDinhDuongChiSo VALUES ({q(key)},{q(field)},{num(value)},{q(URL)},{q(code)},{q(note)},{num(before[field])},SYSUTCDATETIME());")
        sql.append(f"UPDATE dbo.NguonDinhDuongChiSo SET GiaTri={num(value)},Nguon={q(URL)},MaThucPham={q(code)},GhiChu={q(note)},NgayDoiChieu=SYSUTCDATETIME() WHERE MaNguyenLieu={q(key)} AND ChiSo={q(field)};")
        sql.append(f"UPDATE dbo.ThongTinDinhDuong SET {field}={num(value)} WHERE MaThongTin={q(before['MaThongTin'])};")
    if key == 'NL131':
        # Remove the obsolete claim that this profile's sodium remains unknown.
        sql.append(f"UPDATE dbo.NguyenLieu SET MoTa={q(note + ' Nguồn natri: ' + URL + '; TFDA N0100201. Nguồn chỉ số khác: https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=3_03009_7')} WHERE MaNguyenLieu={q(key)} AND (MoTa={q(ingredients[key]['MoTa'])} OR MoTa={q(note + ' Nguồn natri: ' + URL + '; TFDA N0100201. Nguồn chỉ số khác: https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=3_03009_7')});")
sql += ['COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH', 'IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;', 'THROW;', 'END CATCH;', 'GO',
        "SELECT * FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu IN (N'NL033',N'NL1050',N'NL125',N'NL316',N'NL131');"]
(OUT / '02-bo-sung-nguon-TFDA.sql').write_text('\n'.join(sql)+'\n', encoding='utf-8-sig')
(OUT / 'bang-chung-nguon.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding='utf-8')
with (OUT / 'doi-chieu-tung-chi-so.csv').open('w', encoding='utf-8-sig', newline='') as f:
    names = [k for k in rows[0] if k != 'BangChung']
    w = csv.DictWriter(f, fieldnames=names, extrasaction='ignore'); w.writeheader(); w.writerows(rows)
(OUT / 'HUONG-DAN.md').write_text('''# Đợt bổ sung nguồn TFDA

SQL chưa được thực thi vào DB. Mở file CSV để đối chiếu trước khi chạy file 02-bo-sung-nguon-TFDA.sql trong SSMS.

- Bổ sung/thay bảng tham khảo trên 100 g phần ăn được cho nấm rơm tươi, đậu hũ non, hai mã nấm mèo khô.
- Đường phèn: chỉ bổ sung natri TFDA 1 mg/100 g; các chất khác giữ nguồn MEXT. Hồ sơ ghép nguồn được ghi rõ, không phải một mẫu đo duy nhất.
- TFDA dùng trường 修正熱量 (năng lượng hiệu chỉnh), KHÔNG trộn với 熱量. Không dùng 4–4–9 để sửa năng lượng nguồn.
- Chỉ số không công bố không được chuyển thành 0. Nấm mèo khô tuyệt đối không áp cho khối lượng sau ngâm.
- Đây là dữ liệu tham khảo đúng loại/trạng thái; không khẳng định mọi giống, nhãn hàng hoặc mẻ nấu có cùng thành phần.
- SQL kiểm tra mã hồ sơ, 100 g, đơn vị gam và giá trị cũ/mới. Nếu dữ liệu đã đổi sẽ rollback. Có lưu nguồn theo từng chỉ số và giá trị trước lần chạy đầu.
- SQL không sửa công thức, quy đổi muỗng, tỷ lệ dầu hấp thụ hoặc dữ liệu của 80 món. Các vấn đề đó vẫn có thể làm món thiếu dữ liệu hoặc kcal bất thường.

Nguồn: https://data.fda.gov.tw/data/opendata/export/20/json
Đường phèn MEXT: https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=3_03009_7

Các mục chưa gán: lá dứa; gia vị trộn không rõ tỷ lệ; mắm nêm; chao đỏ kèm nước; thịt xay không rõ loại; hoài sơn khô; rau câu pha; nguyên liệu ngâm/chiết mà chưa xác định khối lượng ăn được. Cần đúng hồ sơ hoặc nhãn sản phẩm, không lấy thực phẩm gần giống để lấp NULL.
''', encoding='utf-8')
manifest = dict(archive_sha256=hashlib.sha256(archive.read_bytes()).hexdigest(),
                profiles=len(mapping), fields=len(rows), source=URL, database_executed=False)
(OUT / 'kiem-tra.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
print(json.dumps(manifest))
