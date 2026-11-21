"""Offline, guarded update to an explicitly selected minced-pork reference."""
import json
from pathlib import Path
import build_verified_nutrient_patch as base

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'output/demo-priority-round5'
OUT.mkdir(parents=True,exist_ok=True)
S=json.loads((ROOT/'backend/docs/source-audit/round5/snapshot.json').read_text(encoding='utf-8'))['tables']
base.OLD={r['MaNguyenLieu']:r for r in S['ThongTinDinhDuong']}
base.ING={r['MaNguyenLieu']:r for r in S['NguyenLieu']}
base.OUT=OUT
base.ROWS={}
note=('Mẫu tham chiếu đã CHỌN: thịt HEO xay SỐNG, Sus scrofa, MEXT 11163, trên 100 g phần ăn được. '
      'Tên DB chung Thịt xay được dùng theo quy ước thịt heo xay cho demo; không áp cho bò/gà xay hoặc hỗn hợp khác. '
      'Không chỉ ghép natri vào bảng cũ: cập nhật đồng bộ 6 chỉ số từ cùng hồ sơ. '
      'Chất xơ (0) là giá trị ước tính do MEXT công bố, không phải kết quả đo. '
      'Protein 17.7 là protein thông thường, không dùng đạm theo amino acid 15.9; '
      'carbohydrate tổng 0.1, không dùng chênh lệch khả dụng 2.3. '
      'Thành phần thực tế thay đổi theo tỷ lệ nạc/mỡ; đây là mẫu tham khảo không phải xét nghiệm món cháo.')
base.put('NL956','https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=11_11163_7',
         'MEXT 11163','Pork, ground meat, raw / Sus scrofa',
         ['209','17.7','.1','17.2','0','57'],note)
records=list(base.ROWS.values())
base.write_sql(records)
p=OUT/'01-cap-nhat-dinh-duong-co-nguon.sql'
sql=p.read_text(encoding='utf-8-sig')
new_description='Thịt heo xay sống; mẫu tham chiếu MEXT 11163, trên 100 g phần ăn được.'
old_description=base.ING['NL956']['MoTa']
addition=f" IF NOT EXISTS(SELECT 1 FROM dbo.NguyenLieu WHERE MaNguyenLieu=N'NL956' AND (MoTa={base.q(old_description)} OR MoTa={base.q(new_description)})) THROW 51401,N'Mô tả thịt xay đã đổi; cần đối chiếu lại loại thịt.',1;\n UPDATE dbo.NguyenLieu SET MoTa={base.q(new_description)} WHERE MaNguyenLieu=N'NL956';\n"
sql=sql.replace(' COMMIT TRANSACTION;',addition+' COMMIT TRANSACTION;')
(OUT/'01-thit-heo-xay-co-nguon.sql').write_text(sql,encoding='utf-8-sig')
p.unlink()
base.write_csv(records,{})
(OUT/'chua-du-can-cu.csv').unlink(missing_ok=True)
(OUT/'nguon-da-xac-minh.json').write_text(json.dumps(records,ensure_ascii=False,indent=2),encoding='utf-8')
print('1 full profile; reference type explicit; DB not modified.')
