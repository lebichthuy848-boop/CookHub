"""Count current SQL results offline; numeric completeness is not source validation."""
import csv
import json
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'docs' / 'kcal-review'
METRICS = ('NangLuong', 'ChatDam', 'ChatBotDuong', 'ChatBeo', 'ChatXo', 'natri')
BLOCKERS = {
    'MA906': 'Chưa có căn cứ 150 g/cốc gạo và quy đổi củ cà rốt; cần đối chiếu hồ sơ gạo nếp.',
    'MA213': 'Vải đóng hộp đang dùng hồ sơ vải tươi; cần xác minh nước đường ăn vào và ml sang g.',
    'MA916': 'Đang cộng toàn bộ dầu chiên, bột áo và trứng chuẩn bị.',
    'MA929': 'Đang cộng kcal toàn bộ xương; danh sách chỉ có 3 nguyên liệu nhưng bước làm có nhiều nguyên liệu khác.',
    'MA208': 'Nước cốt chanh dây đậm đặc chưa có hồ sơ phù hợp; cần kiểm tra ml sang g và vani đúng dạng.',
    'MA215': 'Danh sách thiếu hạt nêm, đường, muối, tiêu, dầu mè đã ghi trong bước làm; quy đổi củ/quả cần nguồn.',
}


def main():
    snapshot = json.loads((ROOT / 'demo-readiness-current.json').read_text(encoding='utf-8'))
    rows = defaultdict(list)
    for row in snapshot['calculated']:
        rows[row['MaMonAn']].append(row)
    report = []
    for dish in snapshot['dishes']:
        ingredients = rows[dish['MaMonAn']]
        missing = {key: sum(row.get(key) is None for row in ingredients) for key in METRICS}
        valid_servings = dish['SoKhauPhanChuan'] is not None and float(dish['SoKhauPhanChuan']) > 0
        energy_complete = bool(ingredients) and valid_servings and missing['NangLuong'] == 0
        complete = bool(ingredients) and valid_servings and not any(missing.values())
        report.append({
            **dish, 'DuDongKcal': energy_complete, 'DuSauChiSo': complete,
            'KcalDaTinhMotPhan': round(sum(float(row['NangLuong']) for row in ingredients if row['NangLuong'] is not None), 2),
            **{'SoDongThieu_' + key: count for key, count in missing.items()},
            'KetLuan': BLOCKERS.get(dish['MaMonAn'], 'Chưa đủ chỉ số; chưa xác nhận đủ điều kiện demo dinh dưỡng.'),
        })
    summary = {
        'checked_at': snapshot['checked_at'], 'dishes': len(report),
        'all_rows_have_energy': sum(row['DuDongKcal'] for row in report),
        'all_rows_have_six_metrics': sum(row['DuSauChiSo'] for row in report),
        'source_and_method_validated_demo': 0,
        'note': '0 món đã được xác nhận, không có nghĩa mọi món đều sai. Kiểm tra số liệu là tự động; sáu món đủ số đều còn vấn đề cần xử lý.',
    }
    assert {row['MaMonAn'] for row in report if row['DuSauChiSo']} == set(BLOCKERS), 'Re-review complete dishes after DB changes.'
    with (ROOT / 'demo-readiness-80.csv').open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(report[0]))
        writer.writeheader()
        writer.writerows(report)
    (ROOT / 'demo-readiness-summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding='utf-8')
    print(json.dumps(summary, ensure_ascii=False))


if __name__ == '__main__':
    main()
