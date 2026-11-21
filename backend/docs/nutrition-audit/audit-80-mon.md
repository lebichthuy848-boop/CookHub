# Rà soát toàn bộ món từ snapshot DB

80 món; 835 dòng nguyên liệu. Không cập nhật DB.

Số đã biết chỉ là tổng từ dữ liệu hiện có, chưa hiệu chỉnh phần bỏ lại khi chế biến.
Đủ sáu cột và quy đổi không chứng minh nguồn đúng. Các cờ chế biến là yêu cầu rà soát, không phải kết luận công thức sai.

| Mã | Món | Dòng nguyên liệu | Đủ 6 chỉ số và quy đổi | Cần rà chế biến |
|---|---|---:|---|---|
| MA101 | Canh kim chi thịt bò | 11 | Chưa | Can kiem tra loc ba/nuoc dung; Can tach nguyen lieu so che/nuoc ngam |
| MA102 | Gà ác hầm sâm | 12 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA103 | Gà tiềm thuốc bắc | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA104 | Canh chua cá lóc | 11 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA105 | Canh khổ qua nhồi thịt | 8 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA106 | Súp hải sản tuyết yến | 13 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA107 | Giò heo hầm đậu nành | 12 | Chưa | Can kiem tra loc ba/nuoc dung; Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA108 | Canh tôm mọc hạt sen | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA109 | Canh sườn hầm hạt sen | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA110 | Sườn cay khổng lồ kiểu Thái | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA201 | Bánh bột lọc nhân tôm thịt bằng bánh tráng | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA202 | Bánh mochi nhân kem sầu riêng | 9 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA203 | Cream brulee | 7 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA204 | Bánh bông lan bơ nho | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA205 | Bánh bò thốt nốt nướng | 9 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA206 | Bánh bao nhân thịt trứng | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA208 | Pudding xoài | 9 | Có, chưa duyệt nguồn | Can tach nguyen lieu so che/nuoc ngam |
| MA209 | Bánh bao đào tiên | 16 | Chưa | Can kiem tra nguyen lieu trung gian |
| MA210 | Chè trái lê táo đỏ | 5 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA211 | Tàu hủ nước đường bằng máy xay sinh tố | 7 | Chưa | Can kiem tra loc ba/nuoc dung; Can tach nguyen lieu so che/nuoc ngam |
| MA212 | Sương sáo nước cốt dừa | 8 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA213 | Chè khúc bạch | 6 | Có, chưa duyệt nguồn | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA214 | Chè đậu đỏ bột lọc | 10 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA215 | Sủi cảo | 9 | Có, chưa duyệt nguồn | Can tach nguyen lieu so che/nuoc ngam |
| MA216 | Súp hoành thánh chiên nhân chay | 18 | Chưa | Can tach dau chien va bot ao con du; Can tach nguyen lieu so che/nuoc ngam |
| MA217 | Kem chuối que | 7 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA218 | Kem trái cây nước dừa | 7 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA219 | Bingsu trái cây | 6 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA230 | Phở bò | 10 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA901 | Nem nướng Ninh Hòa | 15 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA902 | Gà nướng muối sả | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA903 | Cá saba nướng mỡ hành | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA904 | Sườn đút lò | 13 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA905 | Cháo thịt bằm tía tô | 10 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA906 | Cháo tôm bí đỏ bằng máy xay nấu đa năng | 7 | Có, chưa duyệt nguồn | Can tach nguyen lieu so che/nuoc ngam |
| MA907 | Mì Ý gà giòn sốt kem | 14 | Chưa | Can tach dau chien va bot ao con du; Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA908 | Nấm xào chua ngọt chay | 18 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA909 | Răng mực xào bơ tỏi | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA910 | Tôm sốt phô mai | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA911 | Cà tím xào tỏi ớt | 7 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA912 | Ốc móng tay xào bơ tỏi | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA913 | Cá lóc kho tộ | 3 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA914 | Sườn kho thơm (dứa) | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA915 | Thịt kho tàu bằng nồi áp suất | 9 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA916 | Đậu hũ non chiên xù | 5 | Có, chưa duyệt nguồn | Can tach dau chien va bot ao con du |
| MA917 | Sụn gà chiên nước mắm | 15 | Chưa | Can tach dau chien va bot ao con du |
| MA918 | Chả giò miền Nam | 12 | Chưa | Can tach dau chien va bot ao con du; Can tach nguyen lieu so che/nuoc ngam |
| MA919 | Cơm chiên dứa | 11 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA920 | Gà hấp muối sả | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA921 | Ốc nhồi hấp sả | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA922 | Nghêu hấp Thái | 10 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA923 | Cá lóc hấp tương | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA924 | Lẩu bò Mông Cổ | 17 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA925 | Lẩu bò nhúng giấm (dấm) | 13 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA926 | Lẩu cua đồng | 12 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA927 | Vịt nấu chao | 17 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA928 | Lẩu gà ớt hiểm | 12 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA929 | Lẩu kim chi Hàn Quốc | 3 | Có, chưa duyệt nguồn | Can kiem tra loc ba/nuoc dung; Can tach nguyen lieu so che/nuoc ngam |
| MA930 | Gỏi hàu sốt Thái | 13 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA931 | Gỏi ngó sen chay | 12 | Chưa | Can tach dau chien va bot ao con du |
| MA932 | Hải sản sốt Thái | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA933 | Cơm thăn bò rong biển | 8 | Chưa | Can kiem tra ruou con lai |
| MA934 | Cà ri bò | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA935 | Bò kho miền Nam | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra ruou con lai |
| MA936 | Phở cuốn chay | 18 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA937 | Cơm chay lá sen | 11 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA938 | Cà ri xanh chay | 22 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA939 | Trà dâu ngâm | 6 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA940 | Trân châu phô mai | 4 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA941 | Dưa hấu chanh tuyết | 4 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
| MA942 | Nước ép cà rốt bằng máy xay sinh tố | 4 | Chưa | Can kiem tra loc ba/nuoc dung |
| MA943 | Củ kiệu chua ngọt | 5 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA944 | Khô heo tẩm vị xé sợi | 14 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA945 | Cơm trộn bằng nồi cơm điện | 12 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA946 | Bạch tuộc trộn khế sốt Thái | 21 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA947 | Bánh tro | 5 | Chưa | Can tach nguyen lieu so che/nuoc ngam; Can kiem tra nuoc cham/nuoc ngam an vao |
| MA948 | Bánh tét trứng muối | 10 | Chưa | Can kiem tra loc ba/nuoc dung; Can tach nguyen lieu so che/nuoc ngam |
| MA949 | Dưa cải muối | 7 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA950 | Trà sữa trân châu | 6 | Chưa | Can tach nguyen lieu so che/nuoc ngam |
| MA951 | Matcha latte thạch trà xanh | 6 | Chưa | Chưa phát hiện bằng từ khóa; vẫn cần đọc nguồn |
