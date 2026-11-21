"""Review current SQL-calculated kcal for every recipe without changing the DB."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'kcal-review'
METRICS = {'208': 'NangLuong', '203': 'ChatDam', '205': 'ChatBotDuong',
           '204': 'ChatBeo', '291': 'ChatXo', '307': 'natri'}
USDA = 'https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip'


def references():
    folder = ROOT / 'usda-sr28'
    codes = {'11972', '09147', '09173', '11546', '14411', '14555', '02030', '19165'}
    result = {code: {'ndb': code, 'source': USDA, 'values': {key: None for key in METRICS.values()}} for code in codes}
    for line in (folder / 'FOOD_DES.txt').read_text(encoding='latin-1').splitlines():
        row = [x.strip('~') for x in line.split('^')]
        if row[0] in codes:
            result[row[0]]['description'] = row[2]
    for line in (folder / 'NUT_DATA.txt').read_text(encoding='latin-1').splitlines():
        row = [x.strip('~') for x in line.split('^')]
        if row[0] in codes and row[1] in METRICS:
            result[row[0]]['values'][METRICS[row[1]]] = float(row[2])
    return result


def main():
    snapshot = json.loads((ROOT / 'snapshot.json').read_text(encoding='utf-8'))
    refs = references()
    ingredients = {r['MaThanhPhan']: r for r in snapshot['ingredients']}
    nutrients = {r['MaNguyenLieu']: r for r in snapshot['nutrients']}
    by_dish = defaultdict(list)
    for row in snapshot['calculated']:
        by_dish[row['MaMonAn']].append(row)
    matched = {
        'NL918': ('11972', 'Sả băm: 1 kcal/100 g không phù hợp hồ sơ sả tươi tham khảo. Phải đối chiếu và sửa cả hồ sơ chất, không chỉ kcal.'),
        'NL1118': ('11972', 'Sả xay: cùng vấn đề với sả băm; không áp hồ sơ này nếu có pha dầu/gia vị.'),
        'NL117': ('09147', 'Ghi chú DB ghi táo tàu KHÔ; hồ sơ 50 kcal/100 g không khớp dạng khô USDA. Cần hồ sơ đúng trạng thái.'),
        'NL122': ('09173', 'Ghi chú DB ghi nhãn nhục KHÔ; 52 kcal/100 g không khớp dạng khô USDA. Cần hồ sơ đúng trạng thái.'),
        'NL080': ('14555', 'Nước lọc không đường: nguồn nước uống tham khảo có năng lượng 0. Không suy ra natri bằng 0.'),
        'NL183': ('14555', 'Nước thường không đường: nguồn nước uống tham khảo có năng lượng 0. Không suy ra natri bằng 0.'),
        'NL974': ('11546', '1 kcal/100 g cần xác minh. Nếu đúng tomato paste không thêm muối thì hồ sơ USDA là 82 kcal; không áp cho ketchup hay sản phẩm khác.'),
    }
    findings = []
    for ingredient_id, (code, note) in matched.items():
        used = [d for d in snapshot['dishes'] if any(r['MaNguyenLieu'] == ingredient_id for r in by_dish[d['MaMonAn']])]
        if not used:
            continue
        nutrient = nutrients[ingredient_id]
        findings.append({'ingredient_id': ingredient_id, 'current': nutrient,
                         'reference': refs[code], 'note': note,
                         'affected_dishes': [d['MaMonAn'] for d in used]})
    manual = {
        'MA101': 'Lọc bỏ xác cá cơm; chưa biết lượng dinh dưỡng hòa vào nước dùng.',
        'MA102': 'Kcal thấp vì thiếu phần gà nguyên con/đổi đơn vị; có rượu sơ chế và nguyên liệu chưa tính.',
        'MA103': '12 kcal không phải tổng đầy đủ: thiếu gà và nhiều nguyên liệu; nhãn nhục, táo tàu có sai khác hồ sơ khô.',
        'MA107': 'Táo tàu khô, phần xương giò và đậu lọc bỏ bã cần đối chiếu; chưa chốt tổng đúng.',
        'MA110': 'Chỉ dùng một phần nước hầm; không cộng toàn bộ nồi nước dùng vào phần ăn.',
        'MA201': 'Bánh tráng thiếu quy đổi nên kcal hiện tại chưa tính vỏ bánh; dầu mỡ hành không phải dầu chiên ngập.',
        'MA202': 'Thiếu lượng đường đánh kem; cần lượng cơm sầu riêng và quy đổi có căn cứ.',
        'MA204': 'Rượu ngâm nho được để ráo; chưa có lượng rượu còn lại. Không tự hạ bơ 150 g.',
        'MA205': 'Đường thốt nốt chưa có kcal; danh sách và bước làm không khớp lượng dầu/bột.',
        'MA206': 'Bột bánh bao chưa có kcal, nên tổng hiện tại thiếu phần vỏ bánh.',
        'MA208': 'Đủ số liệu không có nghĩa đúng hồ sơ nước cốt chanh dây đậm đặc; cần nhãn đúng sản phẩm.',
        'MA209': 'Nguy cơ tính trùng Tangzhong và nguyên liệu tạo Tangzhong; có phần củ dền chỉ chấm màu.',
        'MA211': 'Lọc bỏ bã đậu và vớt lá dứa; không ăn toàn bộ đậu khô và lá.',
        'MA213': 'Nguồn dùng vải đóng hộp cùng nước ngâm; hồ sơ vải tươi không tương đương.',
        'MA216': 'Dầu chuẩn bị chiên đang được cộng toàn bộ; không phải lượng dầu hấp thụ đã xác định.',
        'MA219': 'Quả dưa làm vỏ đựng và phần thịt ăn được cần tách; chưa xác minh được gam/quả.',
        'MA230': 'Xương heo đang có 749 kcal/100 g; không dùng hồ sơ chất béo/tủy cho toàn bộ xương và nước dùng.',
        'MA901': '210 ml dầu chuẩn bị có công đoạn chiên; cần lượng dầu ăn vào, không tự đặt tỷ lệ hấp thụ.',
        'MA902': 'Chưa tính được gà nguyên con; sả băm có hồ sơ kcal bất thường.',
        'MA903': 'Chưa tính được cá nguyên con; tổng thấp không chứng minh món ít kcal.',
        'MA906': 'Cốc đong nồi cơm khác cup chuẩn; 150 g/cốc cần nguồn theo dụng cụ thực tế.',
        'MA907': 'Cộng cả dầu chiên và bột áo chuẩn bị; sốt cà cô đặc có 1 kcal/100 g bất thường.',
        'MA909': 'Nguồn Điện Máy Xanh thực sự ghi 300 g bơ: giữ nguyên lượng; kcal cao không tự động là lỗi số liệu. Tóp mỡ còn thiếu quy đổi.',
        'MA910': '500 g phô mai tạo phần lớn kcal; chưa xác minh đúng lượng và nhãn sản phẩm nên không tự giảm.',
        'MA913': 'Chỉ có 3 dòng nguyên liệu; gia vị trong bước làm chưa được định lượng đầy đủ.',
        'MA916': '400 ml dầu và 500 g bột chiên xù là lượng chuẩn bị; không thể mặc định ăn hết.',
        'MA917': 'Dầu chiên chưa có lượng; tổng kcal có thể thiếu. Muối luộc và gia vị sốt cần tách.',
        'MA918': 'Chuẩn 50 phần theo số cuốn, không đồng nghĩa 50 người; dầu chiên chưa định lượng.',
        'MA919': 'Kiểm tra phần quả dứa làm vỏ đựng với phần dứa cắt hạt lựu; không cộng trùng.',
        'MA920': 'Chưa tính gà; 500 g muối lót nồi không phải lượng ăn vào. Không coi tổng thấp hiện tại là đúng.',
        'MA921': 'Khối lượng ốc có vỏ chưa tách phần thịt; sả xay có hồ sơ kcal bất thường.',
        'MA922': '3 kg nghêu có vỏ không phải 3 kg thịt nghêu; cần phần ăn được có căn cứ.',
        'MA923': 'Cá nguyên con cần phần ăn được; không đổi toàn bộ khối lượng thành thịt cá.',
        'MA924': 'Nhiều nguyên liệu chưa tính; bao tử, gia vị và nước dùng cần đúng hồ sơ.',
        'MA926': 'Riêng xương ống đang góp 749 kcal/phần; chưa tách xương/bã cua và nước dùng.',
        'MA927': 'Chưa tính được vịt nguyên con; có công đoạn chiên khoai và lượng dầu dư.',
        'MA928': 'Gà nguyên con có xương và dầu chiên cần tách; không cộng toàn bộ dầu chuẩn bị.',
        'MA929': 'Xương heo góp 936,25 kcal/phần; bảng chỉ có 3 thành phần, còn thiếu nhiều thành phần trong bước làm.',
        'MA931': 'Có bánh phồng chiên và nước trộn; cần phần dầu và nước trộn ăn vào.',
        'MA932': 'Khối lượng nghêu có vỏ và rượu xử lý hải sản cần đối chiếu phần ăn vào.',
        'MA933': 'Cơm nóng chưa có quy đổi nên tổng hiện tại thiếu phần cơm.',
        'MA934': 'Cần đúng biến thể công thức, khối lượng rau củ và nhãn gia vị; không thay bằng biến thể 250 g bò.',
        'MA935': 'Gói xốt/bột bò kho cần đúng hãng và quy cách, không dùng nhãn khác để điền kcal.',
        'MA937': 'Gạo 2 chén chưa tính được; tổng hiện tại thiếu phần cơm chính.',
        'MA938': 'Nấm 30 cái ở bảng nhưng bước ghi 30 g; cần xác minh đúng nguồn. Không hạ 1 lít cốt dừa chỉ để kcal thấp.',
        'MA939': 'Bột mì dùng rửa dâu và túi trà bỏ đi không đồng nghĩa ăn toàn bộ; siro có thể dư.',
        'MA941': 'Cần khối lượng thịt dưa thực sự dùng; không lấy cả quả gồm vỏ.',
        'MA942': 'Lọc bã cà rốt; tổng nguyên liệu nguyên không phải tổng nước ép sau lọc.',
        'MA943': 'Chuẩn 1 hũ là cả mẻ, không phải 1 phần ăn; giấm/đường ngâm không ăn hết.',
        'MA944': 'Chuẩn 2 người cho 2 kg thịt cần xác minh; lượng thành phẩm khô và phần ăn chưa rõ.',
        'MA945': 'Gạo 2 chén chưa tính được; tổng hiện tại thiếu phần cơm chính.',
        'MA946': 'Muối/giấm sơ chế và nước sốt còn dư cần tách; không tính mọi lượng chuẩn bị là ăn vào.',
        'MA947': 'Chuẩn 25 cái; nước tro/ngâm bị xả bỏ, mật chấm chưa định lượng.',
        'MA948': 'Chuẩn 4 có thể là 4 đòn/mẻ, không phải 4 phần ăn; không tự đổi khi chưa xác minh.',
        'MA949': 'Muối và đường trong nước ngâm không đồng nghĩa lượng ngấm vào cải ăn vào.',
        'MA950': 'Trà túi lọc không uống cả túi/bã; trân châu và nước đường có thể còn dư.',
        'MA951': 'Matcha uống cả bột khác trà lọc; cần hồ sơ đúng sản phẩm và gam/muỗng.',
    }
    reports = []
    for dish in snapshot['dishes']:
        rows = by_dish[dish['MaMonAn']]
        known = sum(float(row['NangLuong']) for row in rows if row['NangLuong'] is not None)
        missing = [ingredients[row['MaThanhPhan']]['TenNguyenLieu'] for row in rows if row['NangLuong'] is None]
        affected = [f['ingredient_id'] for f in findings if dish['MaMonAn'] in f['affected_dishes']]
        top = sorted(rows, key=lambda r: float(r['NangLuong'] or 0), reverse=True)[:3]
        reports.append({
            'MaMonAn': dish['MaMonAn'], 'TenMonAn': dish['TenMonAn'],
            'SoKhauPhanChuan': dish['SoKhauPhanChuan'],
            'KcalDaTinhMotPhan': round(known, 2), 'SoDongChuaTinhKcal': len(missing),
            'NguyenLieuChuaTinh': ' | '.join(missing),
            'HoSoNguyenLieuCanDoiChieu': ' | '.join(affected),
            'ThanhPhanDongGopLon': ' | '.join(f"{ingredients[r['MaThanhPhan']]['TenNguyenLieu']}: {float(r['NangLuong'] or 0):.2f} kcal" for r in top),
            'NhanXet': manual.get(dish['MaMonAn'], 'Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được.'),
        })
    (ROOT / 'ingredient-reference-comparisons.json').write_text(json.dumps(findings, ensure_ascii=False, indent=2), encoding='utf-8')
    with (ROOT / 'kcal-80-mon.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(reports[0])); writer.writeheader(); writer.writerows(reports)
    lines = ['# Kiểm tra kcal của 80 món hiện có', '',
             f"Snapshot: {len(snapshot['dishes'])} món, {len(snapshot['ingredients'])} dòng nguyên liệu. Chỉ SELECT, không sửa DB.", '',
             'Kcal dưới đây là tổng các dòng tính được cho 1 phần theo SoKhauPhanChuan hiện tại. Có dòng chưa tính hoặc phần bị bỏ lại thì không được coi là kcal chính xác của món.', '',
             'Không tự suy kcal = 4P + 4C + 9F để ghi đè: rượu, chất xơ và hệ số Atwater riêng có thể gây khác biệt hợp lệ.', '',
             '## Hồ sơ nguyên liệu cần sửa/đối chiếu', '',
             '| Mã | kcal DB/100 đơn vị chuẩn | kcal USDA/100 g tham khảo | NDB | Món ảnh hưởng | Điều kiện |',
             '|---|---:|---:|---|---|---|']
    for f in findings:
        lines.append(f"| {f['ingredient_id']} | {f['current']['NangLuong']} | {f['reference']['values']['NangLuong']} | {f['reference']['ndb']} | {', '.join(f['affected_dishes'])} | {f['note']} |")
    lines += ['', f'[Nguồn USDA SR28 ASCII chính thức]({USDA}) — mã thực phẩm và sáu chỉ số được trích trực tiếp trong ingredient-reference-comparisons.json.', '',
              'Các giá trị USDA là hồ sơ tham khảo đúng trạng thái mô tả, không phải xét nghiệm chính món ăn của bạn. Chưa tự ghi chúng vào DB.', '',
              '## Toàn bộ 80 món', '',
              '| Mã | Món | Phần chuẩn | kcal đã tính/1 phần | Dòng thiếu kcal | Nhận xét |',
              '|---|---|---:|---:|---:|---|']
    for r in reports:
        lines.append(f"| {r['MaMonAn']} | {r['TenMonAn']} | {r['SoKhauPhanChuan']} | {r['KcalDaTinhMotPhan']:.2f} | {r['SoDongChuaTinhKcal']} | {r['NhanXet']} |")
    (ROOT / 'kcal-80-mon.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
    print(json.dumps({'reviewed_dishes': len(reports), 'ingredient_profiles_to_review': len(findings),
                      'dishes_with_missing_kcal': sum(r['SoDongChuaTinhKcal'] > 0 for r in reports)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
