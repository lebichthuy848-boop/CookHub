"""Offline patch for source-supported gaps and unknown edible intake; no DB writes."""
import csv
import hashlib
import json
from pathlib import Path
import build_verified_nutrient_patch as base

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'backend/docs/source-audit/round4'
OUT = ROOT / 'output/demo-priority-round4'
OUT.mkdir(parents=True, exist_ok=True)
S = json.loads((AUDIT / 'snapshot.json').read_text(encoding='utf-8'))
T = S['tables']
ING = {r['MaNguyenLieu']: r for r in T['NguyenLieu']}
OLD = {r['MaNguyenLieu']: r for r in T['ThongTinDinhDuong']}
TP = {r['MaThanhPhan']: r for r in T['ThanhPhanCongThuc']}
base.ING, base.OLD, base.OUT, base.ROWS = ING, OLD, OUT, {}
base.us('NL958', '11353', 'Khoai tây SỐNG phần THỊT đã bỏ vỏ; không dùng bảng cả vỏ. Hồ sơ không tự xác minh khối lượng mỗi củ hiện có.')
base.us('NL029', '16427', 'Chọn đậu hũ thường, sống, kết tủa calcium sulfate làm mẫu tham khảo. Không áp cho đậu hũ non/chiên hoặc mọi nhãn có thành phần khác.')
base.put('NL960', 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=6_06095_7',
         'MEXT 06095', 'Perilla frutescens var. crispa, leaves, raw',
         ['32','3.9','7.5','.1','7.3','1'],
         'LÁ tía tô sống, không gồm cành/rễ; MEXT 2023. Mẫu shiso Nhật làm tham khảo cùng loại, không phải kiểm nghiệm giống tía tô Việt Nam; không dùng bảng hạt tía tô. Dùng protein 3.9, tổng carbohydrate 7.5, lipid 0.1; không nhầm protein theo amino acid hoặc carbohydrate khả dụng.')
profiles = list(base.ROWS.values())
base.write_sql(profiles)
(OUT/'01-ho-so-nguyen-lieu.sql').write_bytes((OUT/'01-cap-nhat-dinh-duong-co-nguon.sql').read_bytes())
(OUT/'01-cap-nhat-dinh-duong-co-nguon.sql').unlink()
base.write_csv(profiles,{})
(OUT/'chua-du-can-cu.csv').unlink(missing_ok=True)
(OUT/'ho-so-nguon.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2),encoding='utf-8')

FAO = 'https://www.fao.org/fileadmin/templates/food_composition/documents/Guidelines_data_checking_02.pdf'
METHOD = 'https://www.fao.org/4/y4705e/y4705e23.htm'
q = base.q
sql = ['USE QuanLyThucDon;', 'GO', 'SET XACT_ABORT ON;', 'BEGIN TRY', 'BEGIN TRANSACTION;',
       "IF OBJECT_ID(N'dbo.NguonDinhDuongChiSo',N'U') IS NULL CREATE TABLE dbo.NguonDinhDuongChiSo (MaNguyenLieu nvarchar(20) NOT NULL,ChiSo nvarchar(40) NOT NULL,GiaTri decimal(10,2) NOT NULL,Nguon nvarchar(2048) NOT NULL,MaThucPham nvarchar(50) NOT NULL,GhiChu nvarchar(max) NOT NULL,GiaTriTruoc decimal(10,2) NULL,NgayDoiChieu datetime2 NOT NULL,CONSTRAINT PK_NguonDinhDuongChiSo PRIMARY KEY(MaNguyenLieu,ChiSo));"]
zeros = []
# Individually reviewed natural animal foods ONLY; no stock, seasoning, pate or coated foods.
ids = 'NL017 NL020 NL027 NL1037 NL106 NL1136 NL1162 NL1163 NL1169 NL1211 NL140 NL916'.split()
for key in ids:
    before = OLD[key]
    assert before['ChatXo'] is None
    note = 'PRESUMED_ZERO theo FAO/INFOODS 2012: chất xơ bằng 0 ở thực phẩm động vật tự nhiên không pha nguyên liệu khác (trừ côn trùng). Đây là suy định sinh học có nguồn, KHÔNG phải số xét nghiệm của mẫu. Chỉ bổ sung ChatXo; không xác minh lại kcal, natri, các chất khác hoặc tỷ lệ xương/vỏ.'
    zeros.append(dict(id=key,name=ING[key]['TenNguyenLieu'],field='ChatXo',value=0,
                      method='PRESUMED_ZERO',source=FAO,note=note))
    pred=f'MaNguyenLieu={q(key)}'
    sql.append(f"-- {key} {ING[key]['TenNguyenLieu']}: presumed zero, not analytical measurement.")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.NguyenLieu WHERE {pred} AND TenNguyenLieu={q(ING[key]['TenNguyenLieu'])}) THROW 51200,N'Tên/mã nguyên liệu đã thay đổi.',1;")
    sql.append(f"IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE {pred})<>1 OR NOT EXISTS(SELECT 1 FROM dbo.ThongTinDinhDuong WHERE {pred} AND MaThongTin={q(before['MaThongTin'])} AND KhoiLuongChuan=100 AND MaDonVi=N'DVT001' AND (ChatXo IS NULL OR ChatXo=0)) THROW 51201,N'Hồ sơ/đơn vị/chất xơ đã đổi. Dừng cập nhật.',1;")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.NguonDinhDuongChiSo WHERE {pred} AND ChiSo=N'ChatXo') INSERT dbo.NguonDinhDuongChiSo VALUES({q(key)},N'ChatXo',0,{q(FAO)},N'FAO-PRESUMED-ZERO',{q(note)},NULL,SYSUTCDATETIME());")
    sql.append(f"UPDATE dbo.NguonDinhDuongChiSo SET GiaTri=0,Nguon={q(FAO)},MaThucPham=N'FAO-PRESUMED-ZERO',GhiChu={q(note)},NgayDoiChieu=SYSUTCDATETIME() WHERE {pred} AND ChiSo=N'ChatXo';")
    sql.append(f"UPDATE dbo.ThongTinDinhDuong SET ChatXo=0 WHERE {pred};")
sql += ['COMMIT TRANSACTION;', 'END TRY', 'BEGIN CATCH', 'IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;', 'THROW;', 'END CATCH;', 'GO']
(OUT/'02-chat-xo-theo-quy-tac-FAO.sql').write_text('\n'.join(sql),encoding='utf-8-sig')
(OUT/'chat-xo-FAO.json').write_text(json.dumps(zeros,ensure_ascii=False,indent=2),encoding='utf-8')

# The database already supports unknown edible-intake rules. NULL means unknown, not discarded/zero.
reasons = {
    'TP1073':'Dầu dùng cả chiên ngập và làm sốt sụn gà; chưa tách lượng hấp thụ, không quy một bát dầu thành lượng ăn vào.',
    'TP1066':'Bột áo sụn gà trước chiên, chưa có lượng bám thực sự ăn vào.',
    'TP1068':'Trứng áo sụn gà trước chiên, chưa có lượng còn dư.',
    'TP1089':'Hỗn hợp gia vị chả giò có dầu chiên ngập, chưa tách tỷ lệ và lượng dầu ăn vào.',
    'TP93837':'Cà rốt xay rồi lọc bỏ bã; chưa xác định thành phần dịch ép thu được, không cộng toàn bộ xơ của cà rốt vào nước ép.',
    'TP93827':'Bột mì dùng ngâm rửa dâu rồi xả sạch; không tính toàn bộ bột rửa thành thức ăn.',
    'TP93826':'Đường ngâm cả mẻ dâu nhưng đồ uống chỉ dùng 50 ml nước ngâm; chưa có thành phần phần dịch thực sự dùng.',
    'TP93842':'Đường dùng ngâm kiệu; chưa xác định lượng đường vào phần kiệu thực sự ăn, không cộng cả nước ngâm.',
    'TP93843':'Giấm ngâm kiệu; chưa xác định lượng vào phần kiệu ăn được.',
    'TP93844':'Phèn chua ngâm kiệu rồi rửa bỏ; chưa có lượng còn lại, không tính cả lượng sơ chế.',
    'TP93909':'Muối trong nước ngâm dưa, chưa xác định lượng muối vào phần dưa ăn được.',
    'TP93910':'Đường trong nước ngâm dưa, chưa xác định lượng còn trong phần ăn được.',
    'TP93914':'Giấm trong nước ngâm dưa, không ăn toàn bộ lượng nước ngâm.',
}
existing={r['MaThanhPhan']:r for r in T['DinhDuongThanhPhanCheBien']}
rules=[]
sql=['USE QuanLyThucDon;','GO','SET XACT_ABORT ON;','BEGIN TRY','BEGIN TRANSACTION;',
     "IF OBJECT_ID(N'dbo.DinhDuongThanhPhanCheBien',N'U') IS NULL THROW 51300,N'Chưa có bảng xử lý lượng ăn được. Không chạy tiếp; cần kiểm tra backend hiện tại.',1;"]
for key,reason in reasons.items():
    r=TP[key];old=existing.get(key)
    rules.append(dict(**r,reason=reason,source=METHOD,basis='Đối chiếu trực tiếp bước chế biến hiện có trong DB; không phải đo lượng hấp thụ.'))
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan={q(key)} AND MaCongThuc={q(r['MaCongThuc'])} AND MaNguyenLieu={q(r['MaNguyenLieu'])} AND MaDonVi={q(r['MaDonVi'])} AND SoLuong={r['SoLuong']}) THROW 51301,N'Công thức đã đổi; cần rà lại trước khi thêm cờ xử lý.',1;")
    # Never overwrite an independently measured edible weight or an unrelated flag.
    if old:
        sql.append(f"IF EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WHERE MaThanhPhan={q(key)} AND (GramAnDuocMoiMe IS NOT NULL OR MaNguyenLieuDoiChieu<>{q(r['MaNguyenLieu'])} OR MaDonViDoiChieu<>{q(r['MaDonVi'])} OR SoLuongDoiChieu<>{r['SoLuong']})) THROW 51302,N'Đã có dữ liệu lượng ăn được mới. Không ghi đè.',1;")
    else:
        sql.append(f"IF EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WHERE MaThanhPhan={q(key)} AND (GramAnDuocMoiMe IS NOT NULL OR MaNguyenLieuDoiChieu<>{q(r['MaNguyenLieu'])} OR MaDonViDoiChieu<>{q(r['MaDonVi'])} OR SoLuongDoiChieu<>{r['SoLuong']} OR LyDo<>{q(reason)})) THROW 51302,N'Đã có quy tắc mới. Không ghi đè.',1;")
    sql.append(f"IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WHERE MaThanhPhan={q(key)}) INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,MaNguyenLieuAnDuoc,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES({q(key)},{q(r['MaNguyenLieu'])},{q(r['MaDonVi'])},{r['SoLuong']},NULL,NULL,NULL,{q(reason)},{q(METHOD)});")
sql+=['COMMIT TRANSACTION;','END TRY','BEGIN CATCH','IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;','THROW;','END CATCH;','GO']
(OUT/'03-khong-tinh-nham-luong-so-che.sql').write_text('\n'.join(sql),encoding='utf-8-sig')
(OUT/'co-xu-ly-che-bien.json').write_text(json.dumps(rules,ensure_ascii=False,indent=2),encoding='utf-8')

excluded = {
 'MA916':'Chiên ngập dầu, còn dư dầu/trứng/bột áo.', 'MA907':'Gà chiên giòn; dầu và bột áo dư.',
 'MA917':'Sụn gà chiên ngập dầu; bột/trứng áo dư.', 'MA918':'Chả giò chiên ngập dầu.',
 'MA901':'Nem nướng có nhiều công đoạn chiên; chưa tách dầu ăn vào.',
 'MA216':'Hoành thánh chiên; chưa có lượng dầu hấp thụ.',
 'MA931':'Bánh phồng/đậu hũ chiên và rau ngâm giấm đường rồi vắt bỏ.',
 'MA942':'Nước ép cà rốt lọc bã; không dùng số xơ cả củ.',
 'MA939':'Dùng một phần nước ngâm dâu, bột rửa bỏ và trà chiết.',
 'MA943':'Kiệu ngâm: bỏ nước rửa, không ăn toàn bộ giấm/đường.',
 'MA949':'Dưa muối: lượng nước muối không phải lượng ăn vào.',
 'MA230':'Nước dùng xương chưa xác định thành phần ăn vào.',
 'MA924':'Lẩu từ xương chưa xác định thành phần nước dùng.',
 'MA926':'Cua đồng lọc bã; chưa có lượng thịt/gạch vào dịch.',
 'MA929':'Xương hầm không được tính như toàn bộ thịt/mỡ ăn vào.',
 'MA920':'Muối lót nồi và phần gà nguyên con chưa tách lượng ăn được.',
 'MA944':'Thịt luộc bỏ phần nước, rim/sấy và khẩu phần cần kiểm tra.',
 'MA945':'Cơm chỉ rưới một phần sốt; chưa xác định lượng sốt ăn vào.',
 'MA946':'Gia vị rửa bạch tuộc phải tách khỏi sốt ăn vào.',
 'MA211':'Đậu nành lọc bã; thành phần tàu hũ không bằng toàn bộ đậu nguyên.',
 'MA214':'Nước chiết lá dứa/củ dền chưa có thành phần phù hợp.',
 'MA950':'Trà túi lọc chiết vào nước; không dùng thành phần toàn bộ lá khô.',
}
priority=['MA905','MA906','MA101','MA105','MA108','MA109','MA908','MA910','MA201','MA206',
          'MA215','MA210','MA217','MA218','MA204','MA209','MA202','MA203','MA208','MA937']
rows=[]
for dish in T['MonAn']:
    key=dish['MaMonAn']; calc=[r for r in S['rows'] if r['MaMonAn']==key]
    gaps=[r for r in calc if any(r[f] is None for f in ['NangLuong','ChatDam','ChatBotDuong','ChatBeo','ChatXo','Natri'])]
    status='TẠM LOẠI KHỎI DEMO DINH DƯỠNG' if key in excluded else 'ƯU TIÊN HOÀN THIỆN' if key in priority else 'CHƯA ƯU TIÊN'
    reason=excluded.get(key,'Cần kiểm tra đủ thành phần, lượng gam ăn được, quy đổi và hồ sơ; không phải món đã được chứng nhận.')
    if key=='MA906':reason+=' Hạt sen tươi bỏ tâm chưa có hồ sơ khớp được xác nhận; không lấy số hạt sen khô.'
    if key=='MA215':reason+=' Bước làm có hạt nêm/đường/muối/tiêu/dầu mè nhưng danh sách hiện thiếu; đủ 6 cột vẫn chưa đủ công thức.'
    rows.append(dict(MaMonAn=key,TenMonAn=dish['TenMonAn'],TrangThai=status,LyDo=reason,
                     SoDongThieuTruocCapNhat=len(gaps),NguyenLieuCanRaSoat='; '.join(sorted({ING[r['MaNguyenLieu']]['TenNguyenLieu'] for r in gaps}))))
with (OUT/'phan-loai-80-mon-demo.csv').open('w',encoding='utf-8-sig',newline='') as f:
    w=csv.DictWriter(f,fieldnames=list(rows[0]));w.writeheader();w.writerows(rows)
blocked=','.join(q(k) for k in sorted(excluded))
verification=f'''USE QuanLyThucDon;
GO
-- Strict review queue only; numbers do not certify sources or recipe completeness.
SELECT m.MaMonAn,m.TenMonAn,
 CASE WHEN m.MaMonAn IN ({blocked}) THEN N'Tam loai khoi demo dinh duong' ELSE N'Can doi chieu truoc khi chon' END TrangThai,
 SUM(CASE WHEN f.NangLuong IS NULL OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL OR f.ChatXo IS NULL OR f.Natri IS NULL THEN 1 ELSE 0 END) SoDongChuaDu6,
 SUM(CASE WHEN f.ThieuLuongAnDuoc=1 THEN 1 ELSE 0 END) SoDongChuaRoLuongAn,
 SUM(CASE WHEN f.NangLuong IS NULL THEN 1 ELSE 0 END) SoDongChuaTinhKcal,
 CASE WHEN COUNT(f.NangLuong)=COUNT(*) THEN SUM(f.NangLuong) END KcalDayDuTheoCacDongDaNhap,
 SUM(f.NangLuong) KcalPhanDaTinh
FROM dbo.MonAn m CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS date),NULL) f
GROUP BY m.MaMonAn,m.TenMonAn
ORDER BY TrangThai,SoDongChuaDu6,m.MaMonAn;
GO
'''
(OUT/'04-kiem-tra-va-loc-demo.sql').write_text(verification,encoding='utf-8-sig')
review=[dict(id='MEXT 05023',source='https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=5_05023_7',
             values=[81,5.9,14.9,.5,2.6,2],status='KHÔNG TỰ ÁP',
             reason='Mẫu hạt sen non sống bỏ vỏ/áo; tài liệu mô tả không xác nhận bỏ tâm. Công thức cháo bỏ tâm; cần kiểm tra khác biệt trước khi chốt.'),
        dict(id='PhilFCT G081',source='https://i.fnri.dost.gov.ph/fct/library/report/4061',
             values=[99,21.2,0,1.6,0,88],status='KHÔNG TỰ ÁP',
             reason='Tìm thấy bảng chính thức cá lóc Channa striata trên chỉ mục tìm kiếm; máy chủ báo cáo lỗi HTTP, chưa tải/kiểm chứng PDF nên chưa cập nhật.')]
(OUT/'nguon-tim-thay-nhung-chua-ap.json').write_text(json.dumps(review,ensure_ascii=False,indent=2),encoding='utf-8')
summary=dict(full_profiles=len(profiles),presumed_zero_fields=len(zeros),processing_review_rules=len(rules),
             temporary_demo_exclusions=len(excluded),priority_candidates=len(priority),database_executed=False)
(OUT/'kiem-tra.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
print(json.dumps(summary))
