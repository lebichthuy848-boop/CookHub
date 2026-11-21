"""Offline source-backed nutrient and household-measure patch. No DB writes."""
import csv
import hashlib
import json
import zipfile
from decimal import Decimal
from pathlib import Path
import build_verified_nutrient_patch as base

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / 'output/month-demo-data'
OUT.mkdir(parents=True, exist_ok=True)
SNAP = json.loads((ROOT / 'backend/docs/source-audit/round3/snapshot.json').read_text(encoding='utf-8'))
TABLES = SNAP['tables']
base.OLD = {r['MaNguyenLieu']: r for r in TABLES['ThongTinDinhDuong']}
base.ING = {r['MaNguyenLieu']: r for r in TABLES['NguyenLieu']}
base.OUT = OUT
base.ROWS = {}

# Explicitly chosen reference types, not claims about the majority of users.
for ids, code, note in [
    ('NL080 NL183 NL184 NL1231', '14555', 'Chọn mẫu NƯỚC ĐÓNG CHAI CHUNG làm nước tham chiếu cho demo, không phải phép đo nước lọc/nước máy tại nhà. Đá tính khối lượng nước ăn vào, không gồm đá bỏ đi.'),
    ('NL954 NL964', '20444', 'Gạo tẻ trắng hạt dài KHÔ, không tăng cường vi chất. Không phải cơm chín. Chọn mẫu tham khảo này; không đại diện mọi giống gạo.'),
    ('NL955 NL965', '20054', 'Gạo nếp trắng KHÔ, không tăng cường vi chất. Không phải xôi/cơm nếp chín.'),
    ('NL301 NL972', '20481', 'Bột mì đa dụng trắng KHÔ, không tăng cường vi chất, không tự nở. Không dùng cho hỗn hợp bột bánh bao pha sẵn.'),
    ('NL206', '01212', 'Sữa bột nguyên kem KHÔ, chưa pha, không bổ sung vitamin D; không áp cho sữa công thức hoặc bột kem thực vật.'),
    ('NL135', '11430', 'Củ cải trắng oriental/daikon sống, phần ăn được.'),
    ('NL153 NL179', '12061', 'Chọn hạnh nhân sống KHÔNG MUỐI, cắt lát chưa rang/tẩm. Thay mẫu natri cao cũ, không phải mọi loại hạnh nhân lát bán sẵn.'),
    ('NL1097', '12087', 'Chọn hạt điều sống không muối, phần nhân ăn được; không áp cho hạt điều rang muối.'),
    ('NL943', '02031', 'Chọn ớt đỏ/cayenne KHÔ XAY nguyên chất, không muối/độn; không phải bột ớt Hàn Quốc hay sa tế.'),
    ('NL1051', '18079', 'Chọn vụn bánh mì KHÔ không tẩm gia vị (plain bread crumbs) làm mẫu bột chiên xù. Không chứng nhận mọi nhãn panko; chỉ lượng bám thực sự ăn vào mới được tính.'),
]:
    base.us(ids, code, note)

TFDA_URL = 'https://data.fda.gov.tw/data/opendata/export/20/json'
archive = ROOT / 'backend/docs/source-audit/round2/tfda-food-composition.json'
with zipfile.ZipFile(archive) as z:
    tfda = json.loads(z.read('20_5.json'))
source_fields = ['修正熱量', '粗蛋白', '總碳水化合物', '粗脂肪', '膳食纖維', '鈉']
tfda_evidence = []
for ids, code, note in [
    ('NL147', 'A0520401', 'Bột nếp trắng xay nước, dạng bột khô, chưa nấu, không phải gạo hạt.'),
    ('NL305', 'H0710101', 'Đậu xanh đã bỏ vỏ dạng KHÔ, chưa ngâm/nấu.'),
    ('NL046', 'E5600401', 'Rau muống sống phần ăn được, chưa xào với dầu/gia vị.'),
]:
    evidence = [r for r in tfda if r['整合編號'] == code and r['分析項'] in source_fields]
    by = {r['分析項']: r for r in evidence}
    values = [by[n]['每100克含量'] for n in source_fields]
    assert all(v is not None for v in values)
    values = [v.strip() for v in values]
    base.put(ids, TFDA_URL, code, evidence[0]['樣品名稱'], values,
             'TFDA; 100 g phần ăn được; dùng năng lượng hiệu chỉnh 修正熱量, không tính lại bằng 4-4-9. ' + note)
    tfda_evidence.extend(evidence)
base.put('NL078', 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=17_17016_7',
         'MEXT 17016', 'Rice vinegar / 米酢', ['46', '.2', '7.4', '0', '0', '12'],
         'Giấm gạo không pha gia vị, 100 g; tổng chất xơ (0) là giá trị ước tính được nguồn công bố, không phải tự điền thiếu thành 0. Không áp cho giấm sushi có đường/muối.')
profiles = sorted(base.ROWS.values(), key=lambda r: r['id'])
assert all(r['id'] in base.OLD for r in profiles)
base.write_sql(profiles)
base.write_csv(profiles, {})
(OUT / 'chua-du-can-cu.csv').unlink(missing_ok=True)  # Scope is this patch, not an audit of every remaining ingredient.
(OUT / 'du-lieu-nguon.json').write_text(json.dumps(profiles, ensure_ascii=False, indent=2), encoding='utf-8')
(OUT / 'bang-chung-TFDA.json').write_text(json.dumps(tfda_evidence, ensure_ascii=False, indent=2), encoding='utf-8')

weights = {}
for r in csv.reader((ROOT / 'backend/docs/kcal-review/usda-sr28/WEIGHT.txt').open(encoding='latin1'), delimiter='^', quotechar='~'):
    weights[(r[0], r[1])] = r
conversions = []
def measure(ids, unit, code, seq, note):
    w = weights[(code, str(seq))]
    grams = Decimal(w[4]) / Decimal(w[2])
    for key in ids.split():
        conversions.append(dict(id=key, name=base.ING[key]['TenNguyenLieu'], unit=unit,
            grams=str(grams.quantize(Decimal('.001'))), code='NDB '+code,
            measure=w[3], amount=w[2], source_grams=w[4], source=base.USDA_URL,
            note=f'WEIGHT.txt USDA SR28: {w[2]} {w[3]} = {w[4]} g phần ăn được. Muỗng ĐONG CHUẨN, không phải mọi muỗng ăn gia đình. ' + note))
measure('NL072', 'DVT006', '04044', 1, 'Chọn dầu đậu nành nguyên chất làm mẫu dầu ăn; 1 tbsp = 13.6 g, không phải 15 g. Không suy ra tỷ lệ hấp thụ khi chiên.')
measure('NL072', 'DVT007', '04044', 3, 'Dầu đậu nành; 1 tsp = 4.5 g; không suy ra dầu ăn hết khi chiên.')
measure('NL091', 'DVT006', '04058', 1, 'Dầu mè nguyên chất; 1 tablespoon = 13.6 g.')
measure('NL091', 'DVT007', '04058', 3, 'Dầu mè nguyên chất; 1 tsp = 4.5 g.')
measure('NL073', 'DVT006', '02047', 2, 'Muối ăn dạng nguồn tham chiếu; không áp cho muối hột khác kích thước hạt.')
measure('NL073', 'DVT007', '02047', 1, 'Muối ăn dạng nguồn tham chiếu; không áp cho muối hột khác kích thước hạt.')
measure('NL074', 'DVT007', '19335', 2, 'Đường kính sucrose, không phải đường phèn/caramel/siro.')
measure('NL240 NL1128', 'DVT007', '02030', 1, 'Tiêu đen XAY; 1 tsp ground = 2.3 g; không áp cho tiêu nguyên hạt.')
measure('NL240 NL1128', 'DVT006', '02030', 2, 'Tiêu đen XAY; 1 tbsp ground = 6.9 g.')
measure('NL051 NL907', 'DVT012', '11215', 3, 'Tỏi sống bóc vỏ, một TÉP mẫu = 3 g; không phải một CỦ tỏi.')
measure('NL051 NL907', 'DVT007', '11215', 2, 'Tỏi sống theo tsp nguồn tham khảo; chưa chiên dầu.')
measure('NL069', 'DVT006', '01145', 2, 'Bơ động vật không muối; 1 tbsp = 14.2 g. Không áp cho đơn vị một ít.')
measure('NL048 NL1176', 'DVT006', '11282', 3, 'Hành tây sống ĐÃ BĂM (tbsp chopped), không phải muỗng củ nguyên.')
measure('NL052 NL1139', 'DVT007', '11216', 1, 'Gừng tươi theo tsp nguồn; không gán cho một nhánh gừng.')
measure('NL053 NL918 NL1118', 'DVT006', '11972', 2, 'Sả sống băm/xay nguyên chất, không quy đổi cả cây sả bằng muỗng.')
measure('NL055 NL160', 'DVT011', '11165', 2, 'LÁ ngò rí: 9 nhánh = 20 g, suy ra 20/9 g mỗi nhánh; không phải gốc/rễ ngò.')
measure('NL050', 'DVT006', '11291', 2, 'Hành lá sống ĐÃ CẮT NHỎ; 1 tbsp chopped = 6 g.')

q = base.q
old_qd = {(r['MaNguyenLieu'], r['MaDonVi']): r for r in TABLES['QuyDoiDonViNguyenLieu']}
sql = ['USE QuanLyThucDon;', 'GO', 'SET XACT_ABORT ON;', 'SET NOCOUNT ON;',
       '-- Chỉ chạy sau khi đọc điều kiện trong quy-doi-co-nguon.csv. Không sửa công thức.',
       'BEGIN TRY', 'BEGIN TRANSACTION;',
       "DECLARE @Lock int; EXEC @Lock=sys.sp_getapplock @Resource=N'CookHub_Conversions_Round3',@LockMode=N'Exclusive',@LockOwner=N'Transaction',@LockTimeout=10000; IF @Lock<0 THROW 51100,N'Không lấy được khóa cập nhật.',1;",
       "IF OBJECT_ID(N'dbo.NguonQuyDoiDaDoiChieu',N'U') IS NULL CREATE TABLE dbo.NguonQuyDoiDaDoiChieu(MaNguyenLieu nvarchar(20) NOT NULL,MaDonVi nvarchar(20) NOT NULL,Gram decimal(18,3) NOT NULL,URL nvarchar(2048) NOT NULL,MaNguon nvarchar(50) NOT NULL,DieuKien nvarchar(2000) NOT NULL,SnapshotCu nvarchar(max) NULL,NgayDoiChieu datetime2 NOT NULL, CONSTRAINT PK_NguonQuyDoiDaDoiChieu PRIMARY KEY(MaNguyenLieu,MaDonVi));",
       "DECLARE @NextQD bigint=(SELECT ISNULL(MAX(TRY_CONVERT(bigint,SUBSTRING(MaQuyDoi,3,18))),0) FROM dbo.QuyDoiDonViNguyenLieu WITH(UPDLOCK,HOLDLOCK) WHERE MaQuyDoi LIKE N'QD%');"]
for r in conversions:
    before = old_qd.get((r['id'], r['unit']))
    r['old'] = before
    pred = f"MaNguyenLieu={q(r['id'])} AND MaDonVi={q(r['unit'])}"
    sql.append(f"-- {r['id']} {r['name']}; {r['measure']}; {r['code']}")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.NguyenLieu WHERE MaNguyenLieu={q(r['id'])} AND TenNguyenLieu={q(r['name'])}) THROW 51101,N'Tên/mã nguyên liệu đã đổi.',1;")
    unit_before = next(u for u in TABLES['DonViTinh'] if u['MaDonVi'] == r['unit'])
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi={q(r['unit'])} AND KyHieu={q(unit_before['KyHieu'])}) THROW 51103,N'Đơn vị đã đổi so với bản rà soát.',1;")
    if before:
        accept = f"MaQuyDoi={q(before['MaQuyDoi'])} AND KhoiLuongQuyDoiGram IN ({before['KhoiLuongQuyDoiGram']},{r['grams']})"
        sql.append(f"IF (SELECT COUNT(*) FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred})<>1 OR NOT EXISTS(SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred} AND {accept}) THROW 51102,N'Quy đổi đã khác bản rà soát; dừng để tránh ghi đè.',1;")
    else:
        sql.append(f"IF EXISTS(SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred} AND KhoiLuongQuyDoiGram<>{r['grams']}) OR (SELECT COUNT(*) FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred})>1 THROW 51102,N'Quy đổi mới đã khác bản rà soát.',1;")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.NguonQuyDoiDaDoiChieu WHERE {pred}) INSERT dbo.NguonQuyDoiDaDoiChieu VALUES({q(r['id'])},{q(r['unit'])},{r['grams']},{q(r['source'])},{q(r['code'])},{q(r['note'])},{q(json.dumps(before,ensure_ascii=False))},SYSUTCDATETIME());")
    sql.append(f"UPDATE dbo.NguonQuyDoiDaDoiChieu SET Gram={r['grams']},URL={q(r['source'])},MaNguon={q(r['code'])},DieuKien={q(r['note'])},NgayDoiChieu=SYSUTCDATETIME() WHERE {pred};")
    sql.append(f"IF EXISTS(SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred}) UPDATE dbo.QuyDoiDonViNguyenLieu SET KhoiLuongQuyDoiGram={r['grams']} WHERE {pred}; ELSE BEGIN SET @NextQD+=1; INSERT dbo.QuyDoiDonViNguyenLieu(MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram) VALUES(N'QD'+RIGHT(N'000'+CONVERT(nvarchar(18),@NextQD),CASE WHEN @NextQD<1000 THEN 3 ELSE LEN(CONVERT(nvarchar(18),@NextQD)) END),{q(r['id'])},{q(r['unit'])},{r['grams']}); END;")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE {pred} AND KhoiLuongQuyDoiGram={r['grams']}) THROW 51104,N'Kiểm tra sau ghi không khớp; hủy giao dịch.',1;")
sql += ['COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH', 'IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;', 'THROW;', 'END CATCH;', 'GO', 'SELECT * FROM dbo.NguonQuyDoiDaDoiChieu ORDER BY MaNguyenLieu,MaDonVi;']
(OUT / '02-quy-doi-theo-nguon.sql').write_text('\n'.join(sql)+'\n', encoding='utf-8-sig')
with (OUT / 'quy-doi-co-nguon.csv').open('w', encoding='utf-8-sig', newline='') as f:
    w = csv.DictWriter(f, fieldnames=list(conversions[0])); w.writeheader(); w.writerows(conversions)
(OUT / 'quy-doi-co-nguon.json').write_text(json.dumps(conversions, ensure_ascii=False, indent=2), encoding='utf-8')

# Read-only post-update report: never treats unavailable values as zero or claims source validation.
verify = '''USE QuanLyThucDon;
GO
SELECT m.MaMonAn,m.TenMonAn,
 COUNT(*) SoDongNguyenLieu,
 SUM(CASE WHEN f.NangLuong IS NULL OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL OR f.ChatXo IS NULL OR f.Natri IS NULL THEN 1 ELSE 0 END) SoDongChuaDu6,
 SUM(CASE WHEN f.ThieuQuyDoiDinhDuong=1 THEN 1 ELSE 0 END) SoDongVuongQuyDoi,
 SUM(CASE WHEN f.ThieuLuongAnDuoc=1 THEN 1 ELSE 0 END) SoDongChuaRoLuongAn,
 SUM(CASE WHEN dv.KyHieu IN (N'ít',N'1 ít') THEN 1 ELSE 0 END) SoDongDinhLuongTuyY,
 CASE WHEN COUNT(f.NangLuong)=COUNT(*) THEN SUM(f.NangLuong) END KcalDayDuMotPhan,
 SUM(f.NangLuong) KcalPhanDaTinh
FROM dbo.MonAn m
CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS date),NULL) f
LEFT JOIN dbo.DonViTinh dv ON dv.MaDonVi=f.MaDonVi
GROUP BY m.MaMonAn,m.TenMonAn
ORDER BY SoDongChuaDu6,SoDongChuaRoLuongAn,m.MaMonAn;
-- KcalPhanDaTinh is incomplete when some rows are NULL; not a certified full serving.
SELECT m.MaMonAn,m.TenMonAn,n.TenNguyenLieu,f.MaThanhPhan,f.SoLuongCan,dv.TenDonVi,
 f.NangLuong,f.ChatDam,f.ChatBotDuong,f.ChatBeo,f.ChatXo,f.Natri,
 f.ThieuDinhDuong,f.ThieuQuyDoiDinhDuong,f.ThieuLuongAnDuoc,f.LyDoLuongAnDuoc
FROM dbo.MonAn m CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS date),NULL) f
LEFT JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=f.MaNguyenLieu
LEFT JOIN dbo.DonViTinh dv ON dv.MaDonVi=f.MaDonVi
WHERE f.NangLuong IS NULL OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL OR f.ChatXo IS NULL OR f.Natri IS NULL
ORDER BY m.MaMonAn,f.MaThanhPhan;
GO
'''
(OUT / '03-kiem-tra-sau-cap-nhat.sql').write_text(verify, encoding='utf-8-sig')

summary = dict(profiles=len(profiles), conversions=len(conversions), new_conversions=sum(r['old'] is None for r in conversions),
               database_executed=False, tfda_sha256=hashlib.sha256(archive.read_bytes()).hexdigest())
summary['usda_files_sha256'] = {name: hashlib.sha256((ROOT / 'backend/docs/kcal-review/usda-sr28' / name).read_bytes()).hexdigest() for name in ['FOOD_DES.txt','NUT_DATA.txt','WEIGHT.txt']}
(OUT / 'kiem-tra.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
print(json.dumps(summary))
