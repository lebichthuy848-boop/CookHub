# Natri canh sườn hầm hạt sen và xung đột gợi ý

Đã SELECT lại DB trong phiên làm việc ngày 19/11/2026, không UPDATE. Dữ liệu trả về trùng con số 2.184,32 mg/phần trong ảnh. Món có 4 phần chuẩn. Các số sau là kết quả dữ liệu hiện có, chưa phải xác nhận hồ sơ hạt nêm đúng nguồn.

| Thành phần | Cách tính một phần | Natri mg |
|---|---|---:|
| Hạt nêm | 2 muỗng canh × 15 g/muỗng ÷ 4 × 21.818,10 mg/100 g | 1.636,3575 |
| Muối | 1 muỗng cà phê × 5 g/muỗng ÷ 4 × 38.758 mg/100 g | 484,4750 |
| Sườn | 75 g × 62 mg/100 g | 46,5000 |
| Cà rốt | 19,5 g × 76,92 mg/100 g | 14,9994 |
| Gốc ngò rí | 3,75 g × 46 mg/100 g | 1,7250 |
| Hạt sen | 25 g × 1 mg/100 g | 0,2500 |
| Đường | 1,25 g × 1 mg/100 g | 0,0125 |
| **Phần đã tính** | | **2.184,3194** |

Bông cải và nước có natri NULL. Tổng đang là phần đã tính, không được khẳng định là tổng đầy đủ. Không tự thay natri NULL bằng 0.

## Kết luận về dữ liệu

- Không thấy lỗi nhân/chia 1.000 hoặc quên chia 4 phần trong phép tính hiện tại.
- 97,1% natri đã tính đến từ hạt nêm và muối. Giá trị natri cao không tự động chứng minh lỗi thuật toán.
- NL097 là "Hạt nêm" chung. Seed SQL chứa 21.818,10 mg/100 g nhưng đoạn đó không ghi nguồn và hãng. Chưa có căn cứ xác nhận chính xác con số này hay 15 g/muỗng canh cho nguyên liệu chung. Không tự giảm số để làm hết cảnh báo.
- Một ví dụ đối chiếu từ nhà sản xuất: MAGGI Nấm Hương công bố 530 mg natri trên 2,5 g, tương đương 21.200 mg/100 g; hướng dẫn 5 g/muỗng cà phê. Điều này cho thấy mức natri hàng chục nghìn mg/100 g hạt nêm có thể xảy ra, nhưng KHÔNG xác minh giá trị 21.818,10 cho NL097, và KHÔNG cho phép lấy dữ liệu MAGGI Nấm Hương gán cho mọi loại hạt nêm.
- Muốn cập nhật NL097 phải biết sản phẩm tham chiếu cụ thể và quy đổi đúng cơ sở khẩu phần trên nhãn; nếu nhãn ghi "muối" thay vì "natri" thì phải phân biệt hai đại lượng. Không lấy khối lượng muối làm khối lượng natri.
- Không sửa định lượng 2 muỗng canh hạt nêm chỉ để hạ natri: bước làm hiện có cũng ghi lượng đó. Phải đối chiếu đúng nguồn công thức nếu muốn thay đổi, và người dùng đã yêu cầu giữ nguyên công thức.

Nguồn đối chiếu sản phẩm: https://www.maggi.com.vn/san-pham/hat-nem-maggi-nam-huong/?page=8

Phân biệt muối/natri: https://www.who.int/news-room/fact-sheets/detail/sodium-reduction

## Sửa xung đột gợi ý

Trước đây chỉ trừ điểm khi món làm vượt chất khác và vẫn hiển thị món có điểm âm. Vì vậy món bù đạm nhưng thêm nhiều natri vẫn xuất hiện. Nay:

1. Loại món nếu thêm một phần làm xuất hiện cảnh báo vượt kcal/đạm/carbs/béo/natri, theo cùng ngưỡng đang dùng ở thẻ dinh dưỡng.
2. Nếu một chỉ số đã vượt thì không gợi ý món làm tăng tiếp chỉ số đó.
3. Không coi natri hoặc chỉ số giới hạn chưa biết là 0. Loại khỏi nhóm "nên thêm" khi chưa đủ dữ liệu các chỉ số giới hạn.
4. Không dùng chất xơ như giới hạn trên để trừ điểm món bù xơ.
5. Chỉ hiển thị điểm lợi ích dương.
6. Sau khi thêm món, chờ cả thực đơn và tổng dinh dưỡng được tải lại rồi mới đưa ra gợi ý tiếp; không dùng tổng cũ để thêm liên tiếp.

Các ngưỡng giao diện là quy tắc sản phẩm so với mục tiêu do hệ thống/người dùng cấu hình, không phải kết luận y khoa về từng món.

SQL `backend/scripts/audit_sodium.sql` chỉ SELECT đóng góp natri của nguyên liệu cho cả 80 món và các quy đổi gia vị. Chưa chuẩn bị UPDATE natri vì chưa có giá trị thay thế đúng nguồn cho hồ sơ hạt nêm chung.

## Kiểm tra số học cả 80 món

SELECT hiện tại: 80 món, chỉ 6 món có natri tính được trên mọi dòng đã nhập, không có đóng góp natri âm. Không coi sáu món đó là đã duyệt nguồn hoàn chỉnh.

Các tổng phần đã tính cao nhất: gà hấp muối sả 48.754,11 mg/phần, bạch tuộc trộn khế sốt Thái 11.249,44 mg/phần, dưa cải muối 4.697,35 mg/phần. Cả ba đang bị cộng cả muối sơ chế/lót nồi/nước ngâm. Các con số này là kết quả lỗi hiện có, KHÔNG phải natri thực sự ăn vào.

Đã chuẩn bị `backend/scripts/fix_sodium_preparation_rules.sql`, bổ sung sáu dòng cần xác định lượng ăn vào: TP1112, TP93892, TP93885, TP93909, TP93910, TP93914. Chỉ thêm quy tắc xử lý, không sửa công thức, không gán tỷ lệ muối ngấm bằng 0 hay một phần trăm tùy ý. File đầy đủ `fix_processing_nutrition.sql` cũng đã được cập nhật cùng các quy tắc này.

Dữ liệu SELECT thô: `sodium-80-current.json`, `sodium-MA109-current.json`. Chưa chạy cập nhật DB trong lần sửa này.
