"""Offline source-backed Thai FCD references. Does not connect to SQL Server."""
import hashlib
import html
import json
import re
from decimal import Decimal
from pathlib import Path
from urllib.parse import urlencode
import build_verified_nutrient_patch as base

ROOT=Path(__file__).resolve().parents[2]
AUDIT=ROOT/'backend/docs/source-audit/round6'
OUT=ROOT/'output/demo-priority-round6'
OUT.mkdir(parents=True,exist_ok=True)
S=json.loads((AUDIT/'snapshot.json').read_text(encoding='utf-8'))['tables']
base.ING={r['MaNguyenLieu']:r for r in S['NguyenLieu']}
base.OLD={r['MaNguyenLieu']:r for r in S['ThongTinDinhDuong']}
base.OUT,base.ROWS=OUT,{}

def clean(s):
    return re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]*>',' ',s))).strip()
def read_table(name):
    data=(AUDIT/name).read_text(encoding='utf-8-sig')
    result={}
    for tr in re.findall(r'<tr\b[^>]*>(.*?)</tr>',data,re.I|re.S):
        cells=[clean(c) for c in re.findall(r'<td\b[^>]*>(.*?)</td>',tr,re.I|re.S)]
        if len(cells)>=3:
            # Actual source table: nutrient name, unit, per-100-g value, derivation, ...
            result[cells[0]]=dict(unit=cells[1],value=cells[2],remaining_columns=cells[3:])
    return result
def value(table,key):
    raw=table[key]['value'].replace(',','')
    return None if raw in ['','-'] else str(Decimal(raw))

noodles=read_table('fresh-rice-noodles-profile.html')
assert value(noodles,'Moisture')=='74.4'
p=value(noodles,'Protein, total');f=value(noodles,'Fat, total');ash=value(noodles,'Ash')
total=Decimal(100)-Decimal(value(noodles,'Moisture'))-Decimal(p)-Decimal(f)-Decimal(ash)
assert total==Decimal('23.70') and value(noodles,'Carbohydrate, total') is None
url='https://inmu.mahidol.ac.th/thaifcd/foodsearch/food_name_result?'+urlencode({'selected_id':'166','selected_dbcode':'STD','selected_name':'ขนมจีน','food_name':'ขนมจีน','mode':'food_group_result'})
note=('Chọn mẫu bún GẠO TƯƠI LÊN MEN kanom-jeen, không phải bún khô/bún gạo lứt; 100 g phần ăn được. '
      'Thai FCD A8, độ ẩm 74.4%. Kcal/đạm/béo/xơ/natri lấy cùng hồ sơ. '
      'Carbohydrate TỔNG 23.70 g được TÍNH theo chênh lệch: 100-74.4 nước-1.43 đạm-0.31 béo-0.16 tro. '
      'Không chép 23.42 g carbohydrate KHẢ DỤNG thành tổng. Có sai khác làm tròn giữa các giá trị trung bình nguồn. '
      'Đây là hồ sơ tham chiếu theo loại bún đã chọn, không phải kiểm nghiệm mọi loại bún Việt Nam; không tự coi bún không lên men là cùng mẫu.')
base.put('NL003 NL914',url,'Thai FCD A8 / STD 166','Noodles, rice, fermented (kanom-jeen), Oryza sativa',
         [value(noodles,'Energy, by calculation'),p,str(total),f,value(noodles,'Dietary fibre'),value(noodles,'Sodium')],note)

galanga=read_table('galanga-profile.html')
url2='https://inmu.mahidol.ac.th/thaifcd/foodsearch/food_name_result?'+urlencode({'selected_id':'232','selected_dbcode':'STD','selected_name':'galanga','food_name':'galanga','mode':'food_group_result'})
base.put('NL1199',url2,'Thai FCD N11 / STD 232','Galanga / Alpinia galanga',
         [value(galanga,'Total energy - by calculation'),value(galanga,'Protein, total'),value(galanga,'Carbohydrate, total'),value(galanga,'Fat, total'),value(galanga,'Dietary fibre'),value(galanga,'Sodium')],
         'Chọn riềng Alpinia galanga sống làm mẫu tham khảo, 100 g phần ăn được. Không áp cho gừng hoặc riềng khô/bột. Nguồn không công bố chất xơ: giữ NULL. Chưa giải quyết khối lượng của một nhánh riềng; không mượn xơ của riềng NON để lấp.')
profiles=list(base.ROWS.values())
base.write_sql(profiles)
base.write_csv(profiles,{})
(OUT/'chua-du-can-cu.csv').unlink(missing_ok=True)
(OUT/'ho-so-da-doi-chieu.json').write_text(json.dumps(profiles,ensure_ascii=False,indent=2),encoding='utf-8')
evidence=dict(citation='Kunchit Judprasong et al., Institute of Nutrition, Mahidol University (2025). Thai Food Composition Database, Online version 3, August 2025, Thailand.',
              homepage='https://inmu.mahidol.ac.th/thaifcd/home',
              raw_noodles=noodles,raw_galanga=galanga,
              calculated_fields=[dict(field='ChatBotDuong',ids=['NL003','NL914'],value=str(total),
                  type='CALCULATED_BY_DIFFERENCE',formula='100 - moisture - protein - fat - ash',
                  inputs=dict(moisture='74.4',protein=p,fat=f,ash=ash),
                  method_source='https://www.fao.org/fileadmin/templates/food_composition/documents/Guidelines_data_checking_02.pdf#page=24')],
              files={name:hashlib.sha256((AUDIT/name).read_bytes()).hexdigest() for name in ['fresh-rice-noodles-profile.html','galanga-profile.html']})
(OUT/'bang-chung-va-phep-tinh.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2),encoding='utf-8')
print('3 reference profiles generated; total carbs 23.70 g calculated and labelled; galanga fibre remains NULL; no DB writes.')
