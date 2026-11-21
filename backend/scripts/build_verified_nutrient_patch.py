"""Build a reviewable, source-linked SQL patch. Never connects to the database."""
import csv
import hashlib
import json
import re
from decimal import Decimal, ROUND_HALF_UP
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
AUDIT = ROOT / 'backend/docs/source-audit'
OUT = ROOT / 'output/nutrition-sources'
OUT.mkdir(parents=True, exist_ok=True)
S = json.loads((AUDIT / 'db-source-snapshot.json').read_text(encoding='utf-8'))['tables']
ING = {r['MaNguyenLieu']: r for r in S['NguyenLieu']}
OLD = {r['MaNguyenLieu']: r for r in S['ThongTinDinhDuong']}
REF = {r['id']: r for r in json.loads((AUDIT / 'source-candidates.json').read_text(encoding='utf-8'))}
FIELDS = ['NangLuong', 'ChatDam', 'ChatBotDuong', 'ChatBeo', 'ChatXo', 'natri']
USDA_URL = 'https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip'
VN_URL = 'https://www.fao.org/fileadmin/templates/food_composition/documents/pdf/VTN_FCT_2007.pdf'
FOODS = {}
NUT = {}
for line in (ROOT / 'backend/docs/kcal-review/usda-sr28/FOOD_DES.txt').read_text(encoding='latin1').splitlines():
    a = [v.strip('~') for v in line.split('^')]
    FOODS[a[0]] = a[2]
for line in (ROOT / 'backend/docs/kcal-review/usda-sr28/NUT_DATA.txt').read_text(encoding='latin1').splitlines():
    a = [v.strip('~') for v in line.split('^')]
    NUT.setdefault(a[0], {})[a[1]] = a[2]
ROWS = {}


def put(ids, source, code, desc, vals, note, extra=None):
    for key in ids.split():
        assert key in ING and key not in ROWS, key
        assert len(vals) == 6
        ROWS[key] = dict(id=key, name=ING[key]['TenNguyenLieu'], source=source,
                         code=code, description=desc, values=vals, note=note, **(extra or {}))


def us(ids, code, note=''):
    vals = [NUT[code].get(n) for n in ['208', '203', '205', '204', '291', '307']]
    put(ids, USDA_URL, 'NDB ' + code, FOODS[code], vals,
        'USDA SR28, bản tháng 05/2016; 100 g phần ăn được. ' + note)


# Explicit matches only. A dry ingredient is never silently mapped to a cooked food.
us('NL007', '20061', 'Bột gạo trắng khô, không phải bột gạo lứt.')
us('NL009', '11507', 'Khoai lang sống, phần ăn được.')
us('NL010', '11167', 'Hạt bắp ngọt vàng sống; không áp cho bắp non.')
us('NL016', '10219', 'Thịt heo xay sống; mẫu tham khảo chung gồm nạc và mỡ, không phải thịt chín.')
us('NL018', '10005', 'Thịt ba chỉ heo sống, phần ăn được; tỷ lệ mỡ thực tế có thể khác.')
us('NL028', '01123', 'Trứng gà sống bỏ vỏ, nguyên lòng đỏ và lòng trắng.')
us('NL035', '11529', 'Cà chua chín tươi sống, không phải sốt.')
us('NL036 NL1092 NL1137', '11124', 'Cà rốt sống; cắt nhỏ không làm thành cà rốt đã nấu.')
us('NL039', '11422', 'Bí đỏ sống, phần ăn được.')
us('NL041', '11043', 'Giá đậu xanh sống, không phải giá đậu nành.')
us('NL042', '11205', 'Dưa leo sống còn vỏ, phần ăn được.')
us('NL045', '11304', 'Đậu Hà Lan hạt xanh tươi sống, không phải hạt khô.')
us('NL047', '11090', 'Bông cải xanh sống.')
us('NL048 NL1176', '11282', 'Hành tây sống bỏ vỏ; kích thước củ không đổi bảng trên 100 g.')
us('NL049 NL1058', '11677', 'Hành tím/shallot sống bỏ vỏ, không phải hành phi.')
us('NL050', '11291', 'Hành lá sống gồm lá và phần củ ăn được.')
us('NL051 NL907', '11215', 'Tỏi sống; tỏi băm chưa thêm dầu/muối.')
us('NL052 NL1139', '11216', 'Gừng tươi sống, chưa nấu.')
us('NL053 NL918 NL1118', '11972', 'Sả sống nguyên chất. Nguồn KHÔNG công bố tổng chất xơ: giữ NULL.')
us('NL055 NL160', '11165', 'LÁ rau mùi/ngò rí sống. KHÔNG áp cho rễ hoặc hạt ngò.')
us('NL061 NL1041 NL1098 NL991', '09266', 'Thịt quả dứa chín tươi, đã loại vỏ/lõi không ăn; không phải nước ép.')
us('NL064', '09003', 'Táo tươi còn vỏ, phần ăn được; không phải táo tàu khô.')
us('NL065', '09316', 'Dâu tây tươi sống.')
us('NL068', '12117', 'Nước cốt dừa thô vắt từ cùi dừa và nước; mẫu chung, không phải kem dừa hoặc hộp có đường.')
us('NL069', '01145', 'Bơ động vật KHÔNG MUỐI. Không áp cho margarine hoặc bơ pha.')
us('NL073 NL1112 NL1164', '02047', 'Muối ăn nguyên chất; 0 kcal là số công bố, không phải điền thay NULL.')
us('NL074', '19335', 'Đường kính sucrose, không phải siro.')
us('NL075 NL1128 NL240', '02030', 'Tiêu đen khô nguyên chất, không muối/độn.')
us('NL076', '19296', 'Mật ong nguyên chất, số trung bình tham khảo.')
us('NL077', '09322', 'Thịt quả me sống, phần ăn được; không phải nước cốt me pha loãng.')
us('NL079', '20027', 'Tinh bột bắp khô nguyên chất.')
us('NL082', '16087', 'Đậu phộng hạt sống, chưa rang/muối.')
us('NL085', '02043', 'Nghệ khô xay nguyên chất.')
us('NL088', '19177', 'Gelatin bột khô nguyên chất, không đường, chưa ngâm.')
us('NL091', '04058', 'Dầu mè nguyên chất, không phải nước sốt dầu mè.')
us('NL1016', '02029', 'Lá mùi tây khô nguyên chất.')
us('NL1021', '11209', 'Cà tím sống, phần ăn được.')
us('NL103', '11950', 'Nấm kim châm sống, không phải nấm nấu.')
us('NL1039 NL1131 NL318 NL123', '12119', 'NƯỚC dừa tươi, không đường, không phải cùi dừa hay cả quả. NL123 có mô tả DB là dừa xiêm LẤY NƯỚC.')
us('NL109 NL1200 NL969', '12205', 'Hạt sen TƯƠI sống, bỏ vỏ/tâm không ăn; không áp cho hạt sen khô.')
us('NL111', '01140', 'Trứng cút nguyên quả sống bỏ vỏ.')
us('NL1123', '09160', 'Nước chanh XANH tươi (lime), không đường, không pha. Không dùng dữ liệu lemon.')
us('NL1157', '11116', 'Cải thìa/bok choy sống, phần ăn được.')
us('NL1172', '11112', 'Bắp cải tím sống.')
us('NL1191', '11052', 'Đậu que xanh tươi sống, không phải hạt đậu khô.')
us('NL1194', '02013', 'HẠT ngò khô. Sửa nhầm bảng LÁ ngò đang có trong DB.')
us('NL1207', '19336', 'Đường bột; mẫu USDA có thể chứa chất chống vón tinh bột theo loại sản phẩm.')
us('NL1208', '09206', 'Nước cam tươi nguyên chất không đường, không phải siro cô đặc.')
us('NL1216', '09060', 'Khế tươi sống, phần ăn được.')
us('NL1230', '19165', 'Bột cacao khô không đường.')
us('NL124', '11024', 'QUẢ khổ qua tươi sống, không phải lá.')
us('NL128', '15172', 'Cồi sò điệp sống; mẫu tham khảo nhiều loài, không ngâm phụ gia/muối.')
us('NL133', '16108', 'Đậu nành hạt già KHÔ, chưa ngâm/nấu; tên mô tả DB xác nhận khô.')
us('NL143', '01138', 'Trứng vịt nguyên quả sống bỏ vỏ.')
us('NL154', '01125', 'Lòng đỏ trứng gà sống, không muối.')
us('NL155', '01124', 'Lòng trắng trứng gà sống, không muối.')
us('NL165', '09422', 'Thịt quả sầu riêng tươi/đông lạnh nguyên chất, không đường.')
us('NL172', '09176', 'Thịt xoài chín tươi, bỏ vỏ/hạt.')
us('NL175', '12104', 'Cùi dừa già tươi, không sấy/đường; không phải nước dừa.')
us('NL182', '09252', 'Lê tươi còn vỏ, phần ăn được.')
us('NL189', '09164', 'Thịt quả vải tươi, bỏ vỏ/hạt.')
us('NL230', '20133', 'Bánh phở KHÔ; mô tả DB đã xác nhận khô. Không áp cho phở tươi/nấu.')
us('NL302', '11119', 'Cải thảo/pe-tsai sống.')
us('NL307', '09326', 'Thịt quả dưa hấu tươi, không vỏ.')
us('NL309', '09181', 'Dưa lưới ruột vàng/cantaloupe tươi, phần ăn được.')
us('NL310', '09184', 'Dưa ruột xanh/honeydew tươi, phần ăn được.')
us('NL315', '11238', 'Nấm hương TƯƠI sống, không khô.')
us('NL317', '09132', 'Nho đỏ/xanh tươi, mẫu chung; không phải nho khô.')
us('NL320', '11241', 'Su hào sống, phần ăn được.')
us('NL942', '11333', 'Ớt chuông xanh tươi sống.')
us('NL947', '02021', 'Gừng khô xay nguyên chất.')
us('NL975', '04053', 'Dầu ô liu nguyên chất, không gia vị.')
us('NL070', '06179', 'Nước mắm dùng trực tiếp, mẫu tham khảo CHUNG do USDA công bố; không đại diện nhãn hàng cụ thể hoặc nước mắm đã pha loãng.')
us('NL132', '06176', 'Dầu hào dùng trực tiếp, mẫu tham khảo CHUNG do USDA công bố; không phải dầu hào chay hoặc nhãn hàng cụ thể.')
us('NL071 NL094', '16123', 'CHỌN MẪU THAM CHIẾU theo yêu cầu người dùng: nước tương lên men từ đậu nành VÀ lúa mì (shoyu), loại thường. Không phải loại ít muối hoặc tamari; không chứng nhận mọi hãng cùng thành phần.')
us('NL067 NL321', '01211', 'CHỌN MẪU THAM CHIẾU theo yêu cầu người dùng: sữa bò nguyên kem 3.25% béo không thêm đường, không bổ sung vitamin A/D. Không dùng cho sữa tách béo/có đường. Chọn nguồn có nền mẫu rõ, không tự sửa số natri bất thường trong bảng Việt Nam.')
us('NL066', '01116', 'CHỌN MẪU THAM CHIẾU: sữa chua nguyên kem không thêm đường, không phải loại tách béo hoặc sữa chua Hy Lạp.')
us('NL013', '05062', 'Ức gà SỐNG bỏ da/xương, không bơm dung dịch; thay bảng ức gà đã nấu khi cân nguyên liệu sống.')
us('NL313 NL1160', '11518', 'Khoai môn Colocasia esculenta sống, phần ăn được. Không lấy bảng khoai sọ Việt Nam thay thế.')

# Add primary-source provenance for existing, unambiguous USDA-backed records too.
for ids, code, note in [
    ('NL099','02020','Bột tỏi khô nguyên chất, không muối.'),
    ('NL1181','02015','Bột cà ri chung, không phải hỗn hợp có thêm muối riêng.'),
    ('NL1228','11270','Cải bẹ xanh sống.'),
    ('NL1095 NL1186','20045','Cơm trắng chín không dầu/muối; không tự trừ kcal vì làm nguội.'),
    ('NL148','11080','Củ dền sống.'),
    ('NL304','11603','Củ sắn/củ đậu jicama, không phải khoai mì.'),
    ('NL108','11254','Củ sen sống, phần ăn được.'),
    ('NL142','11278','Đậu bắp sống.'),
    ('NL177','16108','Đậu nành hạt KHÔ chưa ngâm/nấu.'),
    ('NL306','12104','Cùi dừa tươi bào, không đường/sấy.'),
    ('NL152 NL178','19177','Gelatin bột khô nguyên chất không đường, chưa ngâm.'),
    ('NL1146 NL311','11246','Boa rô tươi phần củ và lá dưới.'),
    ('NL1167 NL101','11118','Kim chi cải thảo tham khảo chung, độ mặn theo công thức/hãng có thể khác.'),
    ('NL116','09110','Kỷ tử khô, không phải quả tươi.'),
    ('NL1178','02065','Lá spearmint/húng lủi tươi.'),
    ('NL158','18372','Muối nở NaHCO3 nguyên chất, không phải bột nở.'),
    ('NL989','11987','Nấm bào ngư tươi sống.'),
    ('NL987','11238','Nấm đông cô tươi sống.'),
    ('NL205','11268','Nấm hương KHÔ, cân trước ngâm.'),
    ('NL161','09298','Nho khô không hạt, không thêm đường/dầu.'),
    ('NL994','11821','Ớt chuông đỏ sống.'),
    ('NL993','11951','Ớt chuông vàng sống.'),
    ('NL1054','10005','Ba chỉ heo sống, phần ăn được.'),
    ('NL1201','02032','Tiêu trắng/tiêu sọ khô nguyên chất.'),
    ('NL1173','16129','Đậu hũ đã chiên, cân phần ăn được sau chiên; không phải đậu hũ sống.'),
]:
    us(ids, code, note)

# Official MEXT record, independently read on this audit.
put('NL032', 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=8_08025_7',
    'MEXT 2023 08025', 'King oyster mushrooms, raw; Pleurotus eryngii',
    ['31','2.8','6.0','0.4','3.4','2'],
    '100 g phần ăn được, nấm đùi gà tươi sống. Carbs là 炭水化物 tổng; xơ là 食物繊維総量. Không lấy số nấm bào ngư thay thế.')
put('NL146', 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=2_02028_7',
    'MEXT 2023 02028', 'Cassava starch; Manihot esculenta',
    ['354','0.1','85.3','0.2','0','1'],
    '100 g tinh bột sắn/bột năng KHÔ nguyên chất; không phải bột sắn nguyên củ hoặc trân châu. Tổng xơ (0) là số ƯỚC TÍNH do MEXT công bố, không phải số đo và không do ứng dụng tự gán.')
put('NL1232', 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=16_16035_7',
    'MEXT 2023 16035', 'Matcha (finely ground tea)',
    ['237','29.6','39.5','5.3','38.5','6'],
    '100 g matcha nguyên chất KHÔ không đường, không phải bột latte/đồ uống đã pha; dùng carbohydrate tổng và tổng xơ của nguồn.')
put('NL080 NL183 NL184 NL1231', USDA_URL, 'NDB 14411 (chỉ 5 đại lượng)',
    FOODS['14411'], ['0','0','0','0','0',None],
    'Nước lọc/đá nguyên chất không đường: chỉ dùng 5 đại lượng bằng 0 được USDA công bố. KHÔNG chép natri của mẫu nước máy Mỹ cho nước tại Việt Nam; natri giữ NULL.')
put('NL097', 'https://www.nestle.com.vn/sites/g/files/pydnoa216/files/2022-12/Hat-nem-cao-cap-heo_HSCB_Sep2022.pdf',
    'NIFC 25641/PKN-VKNQG 24-08-2022', 'Hạt nêm cao cấp MAGGI Heo; mẫu 08227043/DV.1; lô 2131002761',
    ['206','12.0','32.9','2.93',None,'21800'],
    'CHỌN MẪU THAM CHIẾU theo yêu cầu người dùng, KHÔNG phải trung bình thị trường. Kết quả chỉ áp cho mẫu nêu trong phiếu NIFC năm 2022 do Nestlé công bố; không khẳng định công thức hiện hành 2026. Natri nguồn 21.8 g/100 g = 21800 mg/100 g. Nguồn không công bố tổng xơ. Không trộn với nhãn 3 Ngọt Xương Hầm Heo khác.')
put('NL312', 'https://www.nestle.com.vn/sites/g/files/pydnoa216/files/2022-05/hat-nem-cao-cap-nam-huong.pdf',
    'Nestle MAGGI Nam Huong TCCS 100:2021/NVL', 'Hạt nêm cao cấp MAGGI Nấm Hương; nhãn công bố 2022',
    ['192','14.8','28','2',None,'20000'],
    'CHỌN MẪU THAM CHIẾU nhãn công bố 2022, không khẳng định công thức mới nhất. Nguồn mỗi 2.5 g: 4.8 kcal, đạm .37 g, carbs .70 g, béo .05 g, natri .50 g; nhân 40 để về 100 g, đổi g natri sang mg. Không công bố tổng xơ; không dùng nhãn heo cho hạt nêm chay.')
put('NL104', 'https://en.sempio.com/product/jangpaste/view/623',
    'Sempio 623 Hot Pepper Paste Regular', 'Sempio Hot Pepper Paste, Regular; serving 100 g',
    ['220','6','47','2','5','2290'],
    'CHỌN MẪU THAM CHIẾU gochujang Sempio Regular đúng trang 623, khẩu phần 100 g. Không phải tương ớt Việt Nam, không phải Sempio Regular Plus/Classic. Giá trị theo nhãn có làm tròn, không phải đo từng món.')
put('NL1190', 'https://cholimexfood.com.vn/wp-content/uploads/2025/20250827_CBTT/CV%20247_DHAO%20CHAY.pdf#page=4',
    'Cholimex CV247 22-08-2025 nhan 820g', 'Dầu hào chay Cholimex 820 g; nhãn ký 22/08/2025',
    ['141','3.53','31.3','0.22',None,'3800'],
    'CHỌN MẪU THAM CHIẾU Cholimex theo yêu cầu người dùng. Đã đọc ảnh nhãn trang PDF 4: dinh dưỡng TRONG 100 G, không phải 100 ml; không công bố tổng chất xơ.')
put('NL149', 'https://dhfoods.com.vn/vi/dau-mau-dieu-big-size',
    'DH Foods Dau Mau Dieu Big Size 1kg', 'Dầu Màu Điều DH Foods Big Size túi 1 kg',
    ['900','0','0','100',None,'0'],
    'CHỌN MẪU THAM CHIẾU đúng bản Big Size 1 kg, thành phần dầu thực vật, hạt điều màu 20%, tỏi. Trang này công bố TRÊN 100 G. Không lấy bảng chai 90 ml có công thức/đơn vị khác, không tự coi ml bằng g; không công bố tổng xơ.')
put('NL1221', 'https://www.dhfoods.com.vn/vi/natural-ot-bot-han-quoc-big-size',
    'DH Foods NATURAL Ot Bot Han Quoc Big Size', 'NATURAL Ớt Bột Hàn Quốc DH Foods Big Size',
    ['403','14.80','56.80','12.90',None,'31.60'],
    'CHỌN MẪU THAM CHIẾU sản phẩm 100% ớt Hàn Quốc, KHÔ nguyên chất, không phải tương gochujang hoặc bột trộn muối. Nguồn trên 100 g; không công bố tổng chất xơ.')


def vn(ids, page, name):
    data = json.loads((AUDIT / 'vn-selected-records.json').read_text(encoding='utf-8'))[str(page)]
    # Celluloza is NOT total dietary fibre; retaining it would misrepresent the metric.
    vals = [data[k] for k in ['energy','protein','carbs','fat']] + [None, data['sodium']]
    put(ids, VN_URL + f'#page={page}', 'VN2007 ' + data['code'], name, vals,
        f'Viện Dinh dưỡng 2007; trang PDF {page}, trang in {data["printed_page"]}; 100 g phần ăn được. '
        'Bảng chỉ ghi Celluloza, KHÔNG phải tổng chất xơ: ChatXo giữ NULL; Celluloza được lưu riêng trong chứng cứ.',
        {'cellulose': data['cellulose'], 'pdf_page': page})


# Vietnamese ingredients without a defensible exact USDA equivalent.
VN_MAP = [
    ('NL003 NL914',33,'Bún tươi / Rice vermicelli'),
    ('NL008 NL927',23,'Bánh đa nem / Rice paper for rollers'),
    ('NL033',227,'Nấm rơm / Mushroom, straw'),
    ('NL046',185,'Rau muống / Water spinach'),
    ('NL1187',160,'Ngô bao tử / Baby corn'),
    ('NL1174',161,'Ngó sen / Lotus stem underground'),
    ('NL1198',173,'Rau diếp cá'),
    ('NL1199',534,'Riềng tươi / Alpinia root'),
    ('NL137',184,'Rau mùi tàu / Ngò gai'),
    ('NL138',187,'Rau ngổ / Limnophila aromatic'),
    ('NL147',29,'Bột gạo nếp / Glutinous rice flour'),
    ('NL955 NL965',15,'Gạo nếp máy loại thường / Glutinous rice milled'),
    ('NL954 NL964',17,'Gạo tẻ máy / Ordinary polished rice'),
    ('NL125 NL316',223,'Mộc nhĩ khô / Dried wood-ear'),
    ('NL960',204,'Tía tô'),
    ('NL943',533,'Ớt khô bột / Red pepper dried powder'),
    ('NL017',357,'Sườn lợn / Pork ribs'),
    ('NL029',91,'Đậu phụ / Soybean curd cake pressed raw'),
    ('NL020 NL1037 NL1136',410,'Cá quả (cá lóc) / Snake head fish'),
    ('NL027',422,'Cua đồng / Fresh water crab'),
    ('NL1169',428,'Mực tươi / Squid raw'),
    ('NL140',336,'Chân giò lợn / Pork leg'),
    ('NL1162',332,'Thịt vịt / Duck meat average'),
    ('NL1163 NL916',317,'Thịt gà / Chicken meat average'),
    ('NL206',468,'Sữa bột toàn phần / Whole milk powder'),
    ('NL1211',321,'Thịt lợn nạc / Lean pork'),
    ('NL139',128,'Dọc mùng (bạc hà nấu canh)'),
    ('NL301 NL972',31,'Bột mì / Wheat flour'),
    ('NL135',123,'Củ cải trắng / White radish'),
    ('NL040',192,'Rau xà lách'),
    ('NL958',52,'Khoai tây / Potato white'),
]


def build():
    for args in VN_MAP:
        vn(*args)
    # Exclusions describe what evidence is still needed; they are never auto-filled.
    blockers = {}
    for key, row in ING.items():
        if key in ROWS:
            continue
        name = row['TenNguyenLieu']
        if key in ['NL067','NL321']:
            reason = 'Bảng Việt Nam 2007 trang PDF 463 ghi 380 mg natri/100 g sữa bò tươi; khác lớn mẫu USDA 01211 (43 mg). Chưa đủ căn cứ xác định số nào đúng cho sản phẩm sử dụng; không tự sửa 380 thành 38 hoặc gán nhãn sữa khác.'
            link = VN_URL+'#page=463'
        elif key in ['NL1082','NL1140']:
            reason = 'Đang có bảng nấm mèo KHÔ nhưng NL1082 ghi ĐÃ NGÂM; NL1140 chưa rõ cân khô/ngâm. MEXT 08005 là nấm khô đã LUỘC, không phải chỉ ngâm. Không dùng hệ số nước tự đoán hoặc bảng luộc thay bảng ngâm.'
            link = 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=8_08005_7'
        elif key == 'NL920':
            reason = 'Tìm thấy nghiên cứu lá giang nhưng nghiên cứu dịch chiết/hoạt tính không công bố đủ đại lượng dinh dưỡng của 100 g lá ăn được; không lấy số trong bài bán hàng để thay thế.'
            link = 'https://vjol.info.vn/index.php/TCPTHLS/article/download/82158/70022'
        elif key in REF:
            reason = 'Đã có link tham khảo từ đợt trước nhưng chưa đủ xác nhận đúng loại/trạng thái/sản phẩm; không tự áp dữ liệu có điều kiện. ' + REF[key].get('notes','')
            link = REF[key]['url']
        elif any(t in name.lower() for t in ['gia vị','ăn kèm','muối/','hành tỏi','hoặc']):
            reason = 'Tên chứa hỗn hợp/lựa chọn, chưa có tỷ lệ hoặc thành phần xác định. Phải tách nguyên liệu/ghi công thức phối trộn trước khi tính.'
            link = ''
        else:
            reason = 'Chưa tìm được đối chiếu đủ chắc đúng loài, phần ăn được, trạng thái và/hoặc hãng sản phẩm. Không lấy thực phẩm gần giống để lấp chỗ trống.'
            link = ''
        blockers[key] = dict(id=key,name=name,reason=reason,related_link=link,
                             has_existing_profile=key in OLD)
    records = sorted(ROWS.values(), key=lambda r:r['id'])
    (OUT/'du-lieu-da-doi-chieu.json').write_text(json.dumps(records, ensure_ascii=False, indent=2),encoding='utf-8')
    (OUT/'chua-du-can-cu.json').write_text(json.dumps(list(blockers.values()),ensure_ascii=False,indent=2),encoding='utf-8')
    write_csv(records, blockers)
    write_sql(records)
    write_readme(records, blockers)
    print(json.dumps({'verified_reference_profiles':len(records),'new_profiles':sum(r['id'] not in OLD for r in records),'not_auto_updated':len(blockers)},ensure_ascii=False))


def write_csv(records, blockers):
    with (OUT/'bang-doi-chieu-va-nguon.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f);w.writerow(['MaNguyenLieu','TenNguyenLieu','MaNguon','TenThucPhamTrongNguon',*FIELDS,'Link','DieuKien'])
        for r in records:w.writerow([r['id'],r['name'],r['code'],r['description'],*['NULL' if v is None else v for v in r['values']],r['source'],r['note']])
    with (OUT/'chua-du-can-cu.csv').open('w',encoding='utf-8-sig',newline='') as f:
        w=csv.writer(f);w.writerow(['MaNguyenLieu','TenNguyenLieu','DaCoBanGhi','LyDoChuaCapNhat','LinkThamKhaoChuaDuXacMinh'])
        for r in blockers.values():w.writerow([r['id'],r['name'],r['has_existing_profile'],r['reason'],r['related_link']])


def q(s):
    return 'NULL' if s is None else "N'"+str(s).replace("'","''")+"'"


def num(s):
    return 'NULL' if s is None else str(Decimal(str(s)).quantize(Decimal('.01'),rounding=ROUND_HALF_UP))


def write_sql(records):
    rows=[]
    for r in records:
        old=OLD.get(r['id'])
        expectation=json.dumps(old,ensure_ascii=False,separators=(',',':')) if old else None
        rows.append('('+','.join([q(r['id']),q(r['name']),*map(num,r['values']),q(r['source']),q(r['code']),q(r['description']),q(r['note']),q(expectation)])+')')
    prefix='''USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
-- CHỈ cập nhật hồ sơ đã có đối chiếu chính thức; không sửa công thức, số lượng hoặc quy đổi.
-- Tất cả số: 100 g PHẦN ĂN ĐƯỢC; kcal, g protein/carbs/béo/xơ, mg NATRI (không phải muối).
-- Chưa công bố tổng chất xơ -> NULL, tuyệt đối không điền 0 thay thế.
-- Mặc định chạy thật trong giao dịch. Có kiểm tra snapshot cũ, chạy lại an toàn nếu dữ liệu đã đúng đích.
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @LockResult int;
 EXEC @LockResult = sys.sp_getapplock @Resource=N'CookHub_VerifiedNutrientSources_v1', @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
 IF @LockResult < 0 THROW 51000,N'Không lấy được khóa cập nhật. Hãy chạy lại sau.',1;
 CREATE TABLE #Nguon (
  MaNguyenLieu nvarchar(20) PRIMARY KEY, TenNguyenLieu nvarchar(200),
  NangLuong decimal(10,2), ChatDam decimal(10,2), ChatBotDuong decimal(10,2),
  ChatBeo decimal(10,2), ChatXo decimal(10,2), natri decimal(10,2),
  URL nvarchar(2048), MaThucPhamNguon nvarchar(100), TenTrongNguon nvarchar(1000),
  DieuKien nvarchar(2000), SnapshotCu nvarchar(max));
 INSERT INTO #Nguon VALUES
'''
    suffix=''';
 IF EXISTS(SELECT 1 FROM #Nguon s LEFT JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=s.MaNguyenLieu
           WHERE n.MaNguyenLieu IS NULL OR n.TenNguyenLieu COLLATE Latin1_General_100_BIN2 <> s.TenNguyenLieu COLLATE Latin1_General_100_BIN2)
  THROW 51001,N'Mã/tên nguyên liệu đã khác bản rà soát. Dừng để tránh gán nhầm nguồn.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT001' AND KyHieu=N'g' AND HeSoGramChuan=1)
  THROW 51002,N'DVT001 không còn là gam. Dừng cập nhật.',1;
 -- Dữ liệu mới hơn snapshot sẽ KHÔNG bị ghi đè. Chấp nhận bản cũ hoặc đích giống hệt.
 IF EXISTS (
  SELECT 1 FROM #Nguon s LEFT JOIN dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK) ON d.MaNguyenLieu=s.MaNguyenLieu
  WHERE NOT (
    (s.SnapshotCu IS NULL AND d.MaThongTin IS NULL)
    OR (d.MaThongTin IS NOT NULL AND NOT EXISTS(
      SELECT d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
      EXCEPT SELECT CONVERT(decimal(10,2),100),CONVERT(nvarchar(20),N'DVT001'),s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri))
    OR (s.SnapshotCu IS NOT NULL AND d.MaThongTin IS NOT NULL AND NOT EXISTS(
      SELECT d.MaThongTin,d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
      EXCEPT SELECT j.MaThongTin,j.KhoiLuongChuan,j.MaDonVi,j.NangLuong,j.ChatDam,j.ChatBotDuong,j.ChatBeo,j.ChatXo,j.natri
      FROM OPENJSON(s.SnapshotCu) WITH(MaThongTin nvarchar(20),KhoiLuongChuan decimal(10,2),MaDonVi nvarchar(20),NangLuong decimal(10,2),ChatDam decimal(10,2),ChatBotDuong decimal(10,2),ChatBeo decimal(10,2),ChatXo decimal(10,2),natri decimal(10,2)) j))
  )) THROW 51003,N'Có dữ liệu đã đổi sau bản rà soát. Đã dừng; cần đối chiếu trước khi cập nhật.',1;
 -- NULL là thiếu bằng chứng, không phải 0. Chỉ mở NULL nếu cột đang NOT NULL.
'''
    for field in FIELDS:
        suffix+=f" IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'{field}' AND is_nullable=0)\n  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [{field}] decimal(10,2) NULL;\n"
    suffix+='''
 IF OBJECT_ID(N'dbo.NguonDinhDuongDaDoiChieu',N'U') IS NULL
 CREATE TABLE dbo.NguonDinhDuongDaDoiChieu(
  MaNguyenLieu nvarchar(20) NOT NULL PRIMARY KEY,
  MaThucPhamNguon nvarchar(100) NOT NULL, TenTrongNguon nvarchar(1000) NOT NULL,
  URL nvarchar(2048) NOT NULL, DieuKien nvarchar(2000) NOT NULL,
  DuLieuNguonJSON nvarchar(max) NOT NULL, DuLieuTruocLanDauJSON nvarchar(max) NULL,
  NgayDoiChieu date NOT NULL, NgayApDung datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
 -- Lưu bản gốc lần đầu để truy vết; chạy lại không làm mất bản gốc.
 INSERT dbo.NguonDinhDuongDaDoiChieu(MaNguyenLieu,MaThucPhamNguon,TenTrongNguon,URL,DieuKien,DuLieuNguonJSON,DuLieuTruocLanDauJSON,NgayDoiChieu)
 SELECT s.MaNguyenLieu,s.MaThucPhamNguon,s.TenTrongNguon,s.URL,s.DieuKien,
   (SELECT CONVERT(decimal(10,2),100) KhoiLuongChuan,N'DVT001' MaDonVi,s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),
   (SELECT d.* FROM dbo.ThongTinDinhDuong d WHERE d.MaNguyenLieu=s.MaNguyenLieu FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),
   CONVERT(date,'20261120',112)
 FROM #Nguon s WHERE NOT EXISTS(SELECT 1 FROM dbo.NguonDinhDuongDaDoiChieu p WHERE p.MaNguyenLieu=s.MaNguyenLieu);
 UPDATE p SET MaThucPhamNguon=s.MaThucPhamNguon,TenTrongNguon=s.TenTrongNguon,URL=s.URL,DieuKien=s.DieuKien,
  DuLieuNguonJSON=(SELECT CONVERT(decimal(10,2),100) KhoiLuongChuan,N'DVT001' MaDonVi,s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),NgayDoiChieu=CONVERT(date,'20261120',112)
 FROM dbo.NguonDinhDuongDaDoiChieu p JOIN #Nguon s ON s.MaNguyenLieu=p.MaNguyenLieu;
 UPDATE d SET KhoiLuongChuan=100,MaDonVi=N'DVT001',NangLuong=s.NangLuong,ChatDam=s.ChatDam,
  ChatBotDuong=s.ChatBotDuong,ChatBeo=s.ChatBeo,ChatXo=s.ChatXo,natri=s.natri
 FROM dbo.ThongTinDinhDuong d JOIN #Nguon s ON s.MaNguyenLieu=d.MaNguyenLieu;
 -- Giữ mã DD cũ. Bản mới dùng DD + số, tránh trùng mã và đúng quy ước DD[0-9].
 DECLARE @MaxDD bigint=(SELECT ISNULL(MAX(TRY_CONVERT(bigint,SUBSTRING(MaThongTin,3,18))),0) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaThongTin LIKE N'DD%');
 INSERT dbo.ThongTinDinhDuong(MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
 SELECT N'DD'+CONVERT(nvarchar(18),@MaxDD+ROW_NUMBER() OVER(ORDER BY s.MaNguyenLieu)),s.MaNguyenLieu,100,N'DVT001',s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri
 FROM #Nguon s WHERE NOT EXISTS(SELECT 1 FROM dbo.ThongTinDinhDuong d WHERE d.MaNguyenLieu=s.MaNguyenLieu);
 IF EXISTS(SELECT 1 FROM #Nguon s JOIN dbo.ThongTinDinhDuong d ON d.MaNguyenLieu=s.MaNguyenLieu WHERE EXISTS(
  SELECT d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
  EXCEPT SELECT CONVERT(decimal(10,2),100),CONVERT(nvarchar(20),N'DVT001'),s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri))
  THROW 51004,N'Kiểm tra sau ghi không khớp dữ liệu nguồn. Đã hủy giao dịch.',1;
 COMMIT TRANSACTION;
 SELECT s.MaNguyenLieu,s.TenNguyenLieu,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri,s.MaThucPhamNguon,s.URL
 FROM #Nguon s JOIN dbo.ThongTinDinhDuong d ON d.MaNguyenLieu=s.MaNguyenLieu ORDER BY s.MaNguyenLieu;
 DROP TABLE #Nguon;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
'''
    (OUT/'01-cap-nhat-dinh-duong-co-nguon.sql').write_text(prefix+',\n'.join(rows)+suffix,encoding='utf-8-sig')


def write_readme(records, blockers):
    new=sum(r['id'] not in OLD for r in records)
    lines=['# Bổ sung nguồn và dữ liệu dinh dưỡng CookHub',
      '', 'Ngày đối chiếu: 20/11/2026; snapshot DB: 19/11/2026. Chỉ tạo tập lệnh; CHƯA chạy cập nhật DB.',
      f'Đã lập {len(records)} hồ sơ tham chiếu có nguồn chính thức, trong đó {new} hồ sơ chưa có trong snapshot. {len(blockers)} nguyên liệu không được tự động cập nhật.',
      '', '## Cách dùng',
      'Mở `01-cap-nhat-dinh-duong-co-nguon.sql` trong SSMS, xem bảng CSV đi kèm rồi Execute toàn bộ. Tập lệnh chọn QuanLyThucDon, dùng giao dịch, kiểm tra mã/tên và dữ liệu cũ; nếu DB đã đổi ngoài snapshot thì dừng toàn bộ. Tập lệnh giữ mã DD hiện có, chỉ cấp mã mới khi thiếu. Chạy lại với cùng dữ liệu đích không tạo trùng.',
      'SQL thêm bảng `NguonDinhDuongDaDoiChieu` để lưu link, mã thực phẩm, điều kiện áp dụng, dữ liệu nguồn và bản trước lần đầu. Cho phép NULL ở sáu cột dinh dưỡng nếu schema cũ còn NOT NULL. Không sửa món ăn, công thức, số lượng, khẩu phần hoặc quy đổi.',
      '', '## Cơ sở và giới hạn',
      '- Đây là giá trị THAM CHIẾU của thực phẩm tương ứng, không phải kết quả xét nghiệm món đã nấu hoặc mọi nhãn hàng.',
      '- USDA SR28: năng lượng công bố, protein, carbohydrate by difference, lipid, total dietary fiber và sodium; 100 g phần ăn được. Không tính lại kcal bằng 4-4-9.',
      '- Viện Dinh dưỡng 2007: năng lượng, protein, glucid, lipid và sodium; 100 g phần ăn được. Celluloza KHÔNG tương đương total dietary fiber nên ChatXo=NULL. Giá trị celluloza gốc được lưu trong JSON chứng cứ; glucid của nguồn này không cùng định nghĩa hoàn toàn với carbs USDA.',
      '- Chỉ số không được nguồn công bố giữ NULL. Số 0 chỉ dùng khi nguồn công bố 0.',
      '- Dữ liệu theo gam phần ăn được. Củ/quả/con có xương/vỏ vẫn cần quy đổi phần ăn được đúng; SQL này không chứng nhận các hệ số quy đổi cũ hoặc dầu hấp thu.',
      '- Người dùng đã cho phép chọn mẫu tham chiếu thông dụng. Các lựa chọn sữa nguyên kem 3.25%, sữa chua nguyên kem, shoyu, hạt nêm MAGGI và gochujang Sempio được ghi rõ trong từng dòng. Đây KHÔNG phải số trung bình thị trường hoặc bằng chứng đa số người Việt dùng đúng sản phẩm đó. Nếu dùng loại khác cần chọn lại hồ sơ.',
      '- Hạt nêm MAGGI Heo lấy từ phiếu NIFC 25641 ngày 24/08/2022, chỉ đại diện mẫu thử; MAGGI Nấm Hương lấy nhãn công bố 2022, không tự nhận là nhãn mới nhất 2026. Trang Knorr có điểm mâu thuẫn khẩu phần/đơn vị nên không suy ngược khối lượng để lấy số natri.',
      '- Các hồ sơ không nằm trong SQL vẫn giữ nguyên DB, kể cả số liệu cũ chưa có nguồn. Không áp nhãn hãng khác cho hỗn hợp chưa xác định thành phần.',
      '', '## Nguồn chính', USDA_URL,
      'https://www.ars.usda.gov/northeast-area/beltsville-md-bhnrc/beltsville-human-nutrition-research-center/methods-and-application-of-food-composition-laboratory/mafcl-site-pages/sr11-sr28/',
      VN_URL, 'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=8_08025_7',
      'Các link nhà sản xuất, mã nhãn/phiếu, khẩu phần gốc và công thức quy đổi nằm trong từng dòng CSV/JSON/SQL. Mọi hồ sơ đều ghi rõ mẫu tham chiếu, không có nguồn suy đoán.',
      '', '## Tệp đối chiếu',
      '- bang-doi-chieu-va-nguon.csv: từng nguyên liệu, đủ sáu giá trị/NULL, mã nguồn và link.',
      '- du-lieu-da-doi-chieu.json: chứng cứ có cấu trúc, có điều kiện áp dụng và celluloza nếu dùng bảng Việt Nam.',
      '- chua-du-can-cu.csv: toàn bộ nguyên liệu chưa đưa vào cập nhật và lý do; không có dữ liệu tự bịa.',
      '', '## Các điểm chưa được phép kết luận',
      'Không đồng nghĩa tất cả 80 món đã đủ dữ liệu. Không có một tỷ lệ hấp thu dầu hay tỷ lệ hấp thụ nước dùng cố định dùng chung mọi món. Các hồ sơ có điều kiện từ báo cáo trước không tự trở thành đã xác minh chỉ vì đường link mở được.',
    ]
    (OUT/'HUONG-DAN-VA-NGUON.md').write_text('\n\n'.join(lines),encoding='utf-8')


if __name__=='__main__':
    build()
