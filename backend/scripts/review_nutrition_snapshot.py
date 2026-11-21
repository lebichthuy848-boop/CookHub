"""Audit an exported recipe snapshot offline; never connects to or writes a database."""
import argparse
import csv
import json
import re
from collections import Counter, defaultdict
from decimal import Decimal
from pathlib import Path

METRICS = ('NangLuong', 'ChatDam', 'ChatBotDuong', 'ChatBeo', 'ChatXo', 'natri')


def number(value):
    return None if value is None else Decimal(str(value))


def audit(snapshot):
    units = {r['MaDonVi']: r for r in snapshot['units']}
    nutrients = {r['MaNguyenLieu']: r for r in snapshot['nutrients']}
    conversions = defaultdict(list)
    for r in snapshot['conversions']:
        conversions[r['MaNguyenLieu'], r['MaDonVi']].append(r)
    ingredients, steps = defaultdict(list), defaultdict(list)
    for r in snapshot['ingredients']:
        ingredients[r['MaCongThuc']].append(r)
    for r in snapshot['steps']:
        steps[r['MaCongThuc']].append(r)
    reports, details = [], []
    for dish in snapshot['dishes']:
        rows = ingredients[dish['MaCongThuc']]
        problems = Counter()
        totals = {key: Decimal(0) for key in METRICS}
        unknown = Counter()
        for row in rows:
            flags = []
            nutrient = nutrients.get(row['MaNguyenLieu'])
            unit = units.get(row['MaDonVi'], {})
            pair = conversions[row['MaNguyenLieu'], row['MaDonVi']]
            if len(pair) > 1:
                flags.append('Trung quy doi')
            def grams(unit_id):
                matches = conversions[row['MaNguyenLieu'], unit_id]
                if len(matches) > 1:
                    return None
                return number(matches[0]['KhoiLuongQuyDoiGram']) if matches else number(units.get(unit_id, {}).get('HeSoGramChuan'))
            servings = number(dish['SoKhauPhanChuan'])
            quantity = number(row['SoLuong'])
            factor = None
            if servings is None or servings <= 0 or quantity is None or quantity <= 0:
                flags.append('Dinh luong/khau phan khong hop le')
            elif nutrient is None:
                flags.append('Chua co dong dinh duong')
            elif number(nutrient['KhoiLuongChuan']) is None or number(nutrient['KhoiLuongChuan']) <= 0:
                flags.append('Khoi luong chuan khong hop le')
            else:
                if row['MaDonVi'] == nutrient['MaDonVi']:
                    factor = quantity / servings / number(nutrient['KhoiLuongChuan'])
                else:
                    source, target = grams(row['MaDonVi']), grams(nutrient['MaDonVi'])
                    if source is None or target is None or source <= 0 or target <= 0:
                        flags.append('Thieu quy doi dinh duong')
                    else:
                        factor = quantity / servings * source / target / number(nutrient['KhoiLuongChuan'])
            for key in METRICS:
                value = number(nutrient.get(key)) if nutrient else None
                if value is None or factor is None:
                    unknown[key] += 1
                elif value < 0:
                    unknown[key] += 1
                    flags.append('Chi so am: ' + key)
                else:
                    totals[key] += value * factor
            missing = [key for key in METRICS if not nutrient or nutrient.get(key) is None]
            if missing:
                flags.append('Thieu chi so: ' + ', '.join(missing))
            symbol = unit.get('KyHieu', '')
            if symbol in ('ml', 'l') and nutrient and units.get(nutrient['MaDonVi'], {}).get('KyHieu') in ('g', 'kg') and not pair:
                flags.append('Can nguon khoi luong rieng; dang dung he so ml/l chung')
            if symbol not in ('g', 'kg', 'ml', 'l') and pair:
                flags.append('Can doi chieu nguon va kich co quy doi')
            if not re.search(r'https?://', row.get('GhiChuNguyenLieu') or ''):
                flags.append('Snapshot chua co URL nguon dinh duong trong ghi chu')
            problems.update(flags)
            details.append({
                'MaMonAn': dish['MaMonAn'], 'TenMonAn': dish['TenMonAn'],
                **row, 'DonVi': symbol, 'HeSoMotPhan': str(factor) if factor is not None else '',
                'VanDe': ' | '.join(flags),
            })
        text = '\n'.join(r['NoiDung'] or '' for r in steps[dish['MaCongThuc']])
        risk_patterns = {
            'Can tach dau chien va bot ao con du': r'chiên ngập dầu|chiên vàng|chiên giòn|chiên xù',
            'Can kiem tra loc ba/nuoc dung': r'bỏ bã|bã đậu|bã để|lọc lấy nước|lọc bỏ xác|vớt xương',
            'Can tach nguyen lieu so che/nuoc ngam': r'ngâm.*(?:muối|phèn|tro)|rửa.*(?:rượu|muối)|chà.*(?:rượu|muối)',
            'Can kiem tra ruou con lai': r'rượu|rum',
            'Can kiem tra nuoc cham/nuoc ngam an vao': r'nước chấm|nước ngâm|mỡ hành',
            'Can kiem tra nguyen lieu trung gian': r'Tangzhong',
        }
        risks = [label for label, pattern in risk_patterns.items() if re.search(pattern, text, re.I | re.S)]
        if not text.strip():
            risks.append('Thieu buoc che bien')
        full = bool(rows and servings and servings > 0 and not any(unknown.values()))
        reports.append({
            'MaMonAn': dish['MaMonAn'], 'TenMonAn': dish['TenMonAn'],
            'MaCongThuc': dish['MaCongThuc'], 'SoKhauPhanChuan': dish['SoKhauPhanChuan'],
            'SoNguyenLieu': len(rows), 'DuSauChiSoVaQuyDoi': full,
            'SoDongThieuTheoChiSo': dict(unknown),
            'TongDaBietMotPhan': {k: round(float(v), 2) for k, v in totals.items()},
            'LuuYCheBien': risks, 'VanDeNguyenLieu': dict(problems),
            'TrangThaiNguon': 'Chua duyet het nguon; khong coi du so lieu la da dung',
        })
    return reports, details


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('snapshot', type=Path)
    args = parser.parse_args()
    snapshot = json.loads(args.snapshot.read_text(encoding='utf-8'))
    reports, details = audit(snapshot)
    folder = args.snapshot.parent
    (folder / 'audit.json').write_text(json.dumps(reports, ensure_ascii=False, indent=2), encoding='utf-8')
    with (folder / 'ingredients.csv').open('w', encoding='utf-8-sig', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=list(details[0]))
        writer.writeheader(); writer.writerows(details)
    lines = ['# Rà soát toàn bộ món từ snapshot DB', '',
             f'{len(reports)} món; {len(details)} dòng nguyên liệu. Không cập nhật DB.', '',
             'Số đã biết chỉ là tổng từ dữ liệu hiện có, chưa hiệu chỉnh phần bỏ lại khi chế biến.',
             'Đủ sáu cột và quy đổi không chứng minh nguồn đúng. Các cờ chế biến là yêu cầu rà soát, không phải kết luận công thức sai.', '',
             '| Mã | Món | Dòng nguyên liệu | Đủ 6 chỉ số và quy đổi | Cần rà chế biến |',
             '|---|---|---:|---|---|']
    for r in reports:
        lines.append(f"| {r['MaMonAn']} | {r['TenMonAn']} | {r['SoNguyenLieu']} | {'Có, chưa duyệt nguồn' if r['DuSauChiSoVaQuyDoi'] else 'Chưa'} | {'; '.join(r['LuuYCheBien']) or 'Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn'} |")
    (folder / 'audit-80-mon.md').write_text('\n'.join(lines)+'\n', encoding='utf-8')
    print(json.dumps({'dishes':len(reports),'ingredient_rows':len(details),
                      'complete_numeric_profiles':sum(r['DuSauChiSoVaQuyDoi'] for r in reports)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
