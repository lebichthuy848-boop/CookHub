# Kiểm tra kcal của 80 món hiện có

Snapshot: 80 món, 836 dòng nguyên liệu. Chỉ SELECT, không sửa DB.

Kcal dưới đây là tổng các dòng tính được cho 1 phần theo SoKhauPhanChuan hiện tại. Có dòng chưa tính hoặc phần bị bỏ lại thì không được coi là kcal chính xác của món.

Không tự suy kcal = 4P + 4C + 9F để ghi đè: rượu, chất xơ và hệ số Atwater riêng có thể gây khác biệt hợp lệ.

## Hồ sơ nguyên liệu cần sửa/đối chiếu

| Mã | kcal DB/100 đơn vị chuẩn | kcal USDA/100 g tham khảo | NDB | Món ảnh hưởng | Điều kiện |
|---|---:|---:|---|---|---|
| NL918 | 1.00 | 99.0 | 11972 | MA902 | Sả băm: 1 kcal/100 g không phù hợp hồ sơ sả tươi tham khảo. Phải đối chiếu và sửa cả hồ sơ chất, không chỉ kcal. |
| NL1118 | 1.00 | 99.0 | 11972 | MA921 | Sả xay: cùng vấn đề với sả băm; không áp hồ sơ này nếu có pha dầu/gia vị. |
| NL117 | 50.00 | 281.0 | 09147 | MA103, MA107 | Ghi chú DB ghi táo tàu KHÔ; hồ sơ 50 kcal/100 g không khớp dạng khô USDA. Cần hồ sơ đúng trạng thái. |
| NL122 | 52.00 | 286.0 | 09173 | MA103 | Ghi chú DB ghi nhãn nhục KHÔ; 52 kcal/100 g không khớp dạng khô USDA. Cần hồ sơ đúng trạng thái. |
| NL080 | 1.00 | 0.0 | 14555 | MA101, MA109, MA210, MA211, MA907, MA942, MA951 | Nước lọc không đường: nguồn nước uống tham khảo có năng lượng 0. Không suy ra natri bằng 0. |
| NL183 | 1.00 | 0.0 | 14555 | MA212, MA923, MA927, MA928 | Nước thường không đường: nguồn nước uống tham khảo có năng lượng 0. Không suy ra natri bằng 0. |
| NL974 | 1.00 | 82.0 | 11546 | MA907 | 1 kcal/100 g cần xác minh. Nếu đúng tomato paste không thêm muối thì hồ sơ USDA là 82 kcal; không áp cho ketchup hay sản phẩm khác. |

[Nguồn USDA SR28 ASCII chính thức](https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip) — mã thực phẩm và sáu chỉ số được trích trực tiếp trong ingredient-reference-comparisons.json.

Các giá trị USDA là hồ sơ tham khảo đúng trạng thái mô tả, không phải xét nghiệm chính món ăn của bạn. Chưa tự ghi chúng vào DB.

## Toàn bộ 80 món

| Mã | Món | Phần chuẩn | kcal đã tính/1 phần | Dòng thiếu kcal | Nhận xét |
|---|---|---:|---:|---:|---|
| MA101 | Canh kim chi thịt bò | 2 | 673.58 | 1 | Lọc bỏ xác cá cơm; chưa biết lượng dinh dưỡng hòa vào nước dùng. |
| MA102 | Gà ác hầm sâm | 3 | 182.12 | 3 | Kcal thấp vì thiếu phần gà nguyên con/đổi đơn vị; có rượu sơ chế và nguyên liệu chưa tính. |
| MA103 | Gà tiềm thuốc bắc | 2 | 12.12 | 10 | 12 kcal không phải tổng đầy đủ: thiếu gà và nhiều nguyên liệu; nhãn nhục, táo tàu có sai khác hồ sơ khô. |
| MA104 | Canh chua cá lóc | 4 | 184.46 | 3 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA105 | Canh khổ qua nhồi thịt | 3 | 327.90 | 0 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA106 | Súp hải sản tuyết yến | 4 | 220.51 | 4 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA107 | Giò heo hầm đậu nành | 3 | 905.90 | 1 | Táo tàu khô, phần xương giò và đậu lọc bỏ bã cần đối chiếu; chưa chốt tổng đúng. |
| MA108 | Canh tôm mọc hạt sen | 4 | 279.44 | 0 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA109 | Canh sườn hầm hạt sen | 4 | 285.72 | 0 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA110 | Sườn cay khổng lồ kiểu Thái | 5 | 611.02 | 1 | Chỉ dùng một phần nước hầm; không cộng toàn bộ nồi nước dùng vào phần ăn. |
| MA201 | Bánh bột lọc nhân tôm thịt bằng bánh tráng | 4 | 475.71 | 5 | Bánh tráng thiếu quy đổi nên kcal hiện tại chưa tính vỏ bánh; dầu mỡ hành không phải dầu chiên ngập. |
| MA202 | Bánh mochi nhân kem sầu riêng | 4 | 656.08 | 1 | Thiếu lượng đường đánh kem; cần lượng cơm sầu riêng và quy đổi có căn cứ. |
| MA203 | Cream brulee | 6 | 324.19 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA204 | Bánh bông lan bơ nho | 4 | 652.15 | 1 | Rượu ngâm nho được để ráo; chưa có lượng rượu còn lại. Không tự hạ bơ 150 g. |
| MA205 | Bánh bò thốt nốt nướng | 4 | 258.32 | 3 | Đường thốt nốt chưa có kcal; danh sách và bước làm không khớp lượng dầu/bột. |
| MA206 | Bánh bao nhân thịt trứng | 10 | 212.93 | 4 | Bột bánh bao chưa có kcal, nên tổng hiện tại thiếu phần vỏ bánh. |
| MA208 | Pudding xoài | 3 | 422.27 | 0 | Đủ số liệu không có nghĩa đúng hồ sơ nước cốt chanh dây đậm đặc; cần nhãn đúng sản phẩm. |
| MA209 | Bánh bao đào tiên | 8 | 274.75 | 2 | Nguy cơ tính trùng Tangzhong và nguyên liệu tạo Tangzhong; có phần củ dền chỉ chấm màu. |
| MA210 | Chè trái lê táo đỏ | 3 | 263.43 | 0 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA211 | Tàu hủ nước đường bằng máy xay sinh tố | 6 | 220.42 | 1 | Lọc bỏ bã đậu và vớt lá dứa; không ăn toàn bộ đậu khô và lá. |
| MA212 | Sương sáo nước cốt dừa | 4 | 476.05 | 2 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA213 | Chè khúc bạch | 5 | 676.94 | 0 | Nguồn dùng vải đóng hộp cùng nước ngâm; hồ sơ vải tươi không tương đương. |
| MA214 | Chè đậu đỏ bột lọc | 5 | 685.34 | 3 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA215 | Sủi cảo | 4 | 539.38 | 0 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA216 | Súp hoành thánh chiên nhân chay | 4 | 932.16 | 2 | Dầu chuẩn bị chiên đang được cộng toàn bộ; không phải lượng dầu hấp thụ đã xác định. |
| MA217 | Kem chuối que | 4 | 495.70 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA218 | Kem trái cây nước dừa | 5 | 171.52 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA219 | Bingsu trái cây | 4 | 679.23 | 2 | Quả dưa làm vỏ đựng và phần thịt ăn được cần tách; chưa xác minh được gam/quả. |
| MA230 | Phở bò | 4 | 1043.92 | 2 | Xương heo đang có 749 kcal/100 g; không dùng hồ sơ chất béo/tủy cho toàn bộ xương và nước dùng. |
| MA901 | Nem nướng Ninh Hòa | 3 | 1785.93 | 5 | 210 ml dầu chuẩn bị có công đoạn chiên; cần lượng dầu ăn vào, không tự đặt tỷ lệ hấp thụ. |
| MA902 | Gà nướng muối sả | 2 | 502.60 | 2 | Chưa tính được gà nguyên con; sả băm có hồ sơ kcal bất thường. |
| MA903 | Cá saba nướng mỡ hành | 4 | 167.57 | 3 | Chưa tính được cá nguyên con; tổng thấp không chứng minh món ít kcal. |
| MA904 | Sườn đút lò | 4 | 527.17 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA905 | Cháo thịt bằm tía tô | 4 | 290.43 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA906 | Cháo tôm bí đỏ bằng máy xay nấu đa năng | 3 | 419.20 | 0 | Cốc đong nồi cơm khác cup chuẩn; 150 g/cốc cần nguồn theo dụng cụ thực tế. |
| MA907 | Mì Ý gà giòn sốt kem | 2 | 2167.43 | 2 | Cộng cả dầu chiên và bột áo chuẩn bị; sốt cà cô đặc có 1 kcal/100 g bất thường. |
| MA908 | Nấm xào chua ngọt chay | 4 | 174.93 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA909 | Răng mực xào bơ tỏi | 3 | 877.37 | 1 | Nguồn Điện Máy Xanh thực sự ghi 300 g bơ: giữ nguyên lượng; kcal cao không tự động là lỗi số liệu. Tóp mỡ còn thiếu quy đổi. |
| MA910 | Tôm sốt phô mai | 3 | 977.12 | 2 | 500 g phô mai tạo phần lớn kcal; chưa xác minh đúng lượng và nhãn sản phẩm nên không tự giảm. |
| MA911 | Cà tím xào tỏi ớt | 4 | 148.15 | 2 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA912 | Ốc móng tay xào bơ tỏi | 4 | 287.90 | 3 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA913 | Cá lóc kho tộ | 2 | 308.25 | 1 | Chỉ có 3 dòng nguyên liệu; gia vị trong bước làm chưa được định lượng đầy đủ. |
| MA914 | Sườn kho thơm (dứa) | 4 | 521.36 | 2 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA915 | Thịt kho tàu bằng nồi áp suất | 4 | 861.59 | 2 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA916 | Đậu hũ non chiên xù | 3 | 2101.17 | 0 | 400 ml dầu và 500 g bột chiên xù là lượng chuẩn bị; không thể mặc định ăn hết. |
| MA917 | Sụn gà chiên nước mắm | 4 | 189.89 | 3 | Dầu chiên chưa có lượng; tổng kcal có thể thiếu. Muối luộc và gia vị sốt cần tách. |
| MA918 | Chả giò miền Nam | 50 | 51.39 | 2 | Chuẩn 50 phần theo số cuốn, không đồng nghĩa 50 người; dầu chiên chưa định lượng. |
| MA919 | Cơm chiên dứa | 2 | 802.99 | 2 | Kiểm tra phần quả dứa làm vỏ đựng với phần dứa cắt hạt lựu; không cộng trùng. |
| MA920 | Gà hấp muối sả | 4 | 87.64 | 5 | Chưa tính gà; 500 g muối lót nồi không phải lượng ăn vào. Không coi tổng thấp hiện tại là đúng. |
| MA921 | Ốc nhồi hấp sả | 4 | 922.96 | 5 | Khối lượng ốc có vỏ chưa tách phần thịt; sả xay có hồ sơ kcal bất thường. |
| MA922 | Nghêu hấp Thái | 4 | 513.26 | 3 | 3 kg nghêu có vỏ không phải 3 kg thịt nghêu; cần phần ăn được có căn cứ. |
| MA923 | Cá lóc hấp tương | 4 | 696.84 | 3 | Cá nguyên con cần phần ăn được; không đổi toàn bộ khối lượng thành thịt cá. |
| MA924 | Lẩu bò Mông Cổ | 4 | 360.07 | 10 | Nhiều nguyên liệu chưa tính; bao tử, gia vị và nước dùng cần đúng hồ sơ. |
| MA925 | Lẩu bò nhúng giấm (dấm) | 4 | 877.90 | 3 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA926 | Lẩu cua đồng | 5 | 1400.20 | 3 | Riêng xương ống đang góp 749 kcal/phần; chưa tách xương/bã cua và nước dùng. |
| MA927 | Vịt nấu chao | 4 | 643.12 | 6 | Chưa tính được vịt nguyên con; có công đoạn chiên khoai và lượng dầu dư. |
| MA928 | Lẩu gà ớt hiểm | 4 | 900.74 | 1 | Gà nguyên con có xương và dầu chiên cần tách; không cộng toàn bộ dầu chuẩn bị. |
| MA929 | Lẩu kim chi Hàn Quốc | 4 | 1343.50 | 0 | Xương heo góp 936,25 kcal/phần; bảng chỉ có 3 thành phần, còn thiếu nhiều thành phần trong bước làm. |
| MA930 | Gỏi hàu sốt Thái | 3 | 370.60 | 2 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA931 | Gỏi ngó sen chay | 4 | 350.93 | 3 | Có bánh phồng chiên và nước trộn; cần phần dầu và nước trộn ăn vào. |
| MA932 | Hải sản sốt Thái | 4 | 313.25 | 2 | Khối lượng nghêu có vỏ và rượu xử lý hải sản cần đối chiếu phần ăn vào. |
| MA933 | Cơm thăn bò rong biển | 4 | 294.92 | 2 | Cơm nóng chưa có quy đổi nên tổng hiện tại thiếu phần cơm. |
| MA934 | Cà ri bò | 4 | 1072.15 | 2 | Cần đúng biến thể công thức, khối lượng rau củ và nhãn gia vị; không thay bằng biến thể 250 g bò. |
| MA935 | Bò kho miền Nam | 8 | 752.34 | 5 | Gói xốt/bột bò kho cần đúng hãng và quy cách, không dùng nhãn khác để điền kcal. |
| MA936 | Phở cuốn chay | 3 | 710.27 | 4 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA937 | Cơm chay lá sen | 4 | 108.30 | 4 | Gạo 2 chén chưa tính được; tổng hiện tại thiếu phần cơm chính. |
| MA938 | Cà ri xanh chay | 4 | 763.31 | 8 | Nấm 30 cái ở bảng nhưng bước ghi 30 g; cần xác minh đúng nguồn. Không hạ 1 lít cốt dừa chỉ để kcal thấp. |
| MA939 | Trà dâu ngâm | 4 | 340.27 | 3 | Bột mì dùng rửa dâu và túi trà bỏ đi không đồng nghĩa ăn toàn bộ; siro có thể dư. |
| MA940 | Trân châu phô mai | 4 | 105.95 | 1 | Chưa có lỗi kcal cụ thể được xác nhận; vẫn cần duyệt nguồn, trạng thái nguyên liệu và phần ăn được. |
| MA941 | Dưa hấu chanh tuyết | 4 | 384.56 | 1 | Cần khối lượng thịt dưa thực sự dùng; không lấy cả quả gồm vỏ. |
| MA942 | Nước ép cà rốt bằng máy xay sinh tố | 2 | 114.10 | 0 | Lọc bã cà rốt; tổng nguyên liệu nguyên không phải tổng nước ép sau lọc. |
| MA943 | Củ kiệu chua ngọt | 1 | 2483.00 | 2 | Chuẩn 1 hũ là cả mẻ, không phải 1 phần ăn; giấm/đường ngâm không ăn hết. |
| MA944 | Khô heo tẩm vị xé sợi | 2 | 1652.93 | 6 | Chuẩn 2 người cho 2 kg thịt cần xác minh; lượng thành phẩm khô và phần ăn chưa rõ. |
| MA945 | Cơm trộn bằng nồi cơm điện | 4 | 276.77 | 3 | Gạo 2 chén chưa tính được; tổng hiện tại thiếu phần cơm chính. |
| MA946 | Bạch tuộc trộn khế sốt Thái | 3 | 565.78 | 10 | Muối/giấm sơ chế và nước sốt còn dư cần tách; không tính mọi lượng chuẩn bị là ăn vào. |
| MA947 | Bánh tro | 25 | 90.76 | 1 | Chuẩn 25 cái; nước tro/ngâm bị xả bỏ, mật chấm chưa định lượng. |
| MA948 | Bánh tét trứng muối | 4 | 3186.89 | 1 | Chuẩn 4 có thể là 4 đòn/mẻ, không phải 4 phần ăn; không tự đổi khi chưa xác minh. |
| MA949 | Dưa cải muối | 5 | 94.51 | 1 | Muối và đường trong nước ngâm không đồng nghĩa lượng ngấm vào cải ăn vào. |
| MA950 | Trà sữa trân châu | 3 | 310.37 | 2 | Trà túi lọc không uống cả túi/bã; trân châu và nước đường có thể còn dư. |
| MA951 | Matcha latte thạch trà xanh | 2 | 165.11 | 1 | Matcha uống cả bột khác trà lọc; cần hồ sơ đúng sản phẩm và gam/muỗng. |
