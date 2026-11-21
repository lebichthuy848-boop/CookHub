# Rà soát 80 món CookHub

Snapshot đọc từ DB bằng SELECT trong phiên làm việc này: 80 món, 835 dòng thành phần, 384 bước, 305 dòng dinh dưỡng và 167 quy đổi. Không cập nhật DB đang chạy.

## Kết quả và giới hạn

- Đã kiểm tra khả năng tính riêng sáu chỉ số và chia khẩu phần của toàn bộ 835 dòng.
- Chỉ 6 món có đủ giá trị để tính sáu chỉ số trên tất cả thành phần. Điều này CHƯA chứng minh đúng nguồn, đúng trạng thái thực phẩm, hay đúng phần ăn vào.
- Đã tìm nguồn Điện Máy Xanh cho cả 80 tên món. Nhiều kết quả chỉ là trang tổng hợp hoặc biến thể khác; không được dùng chúng để tự thay công thức. `source-searches.json` là nhật ký ứng viên, không phải danh sách nguồn đã duyệt.
- Chưa có cơ sở xác nhận 20 món demo đầy đủ và chính xác. Không công bố danh sách demo đạt chuẩn khi chưa hoàn tất các đối chiếu.
- `NULL` được giữ nguyên. Không dùng 0 thay cho chỉ số chưa biết. Không gán tỷ lệ dầu hấp thụ, hiệu suất lọc sữa đậu, lượng muối ngấm, hay phần thịt không xương nếu chưa có nguồn phù hợp.

## SQL đã chuẩn bị cho người dùng tự chạy

1. `../../scripts/fix_verified_recipe_quantities.sql`: sáu dòng sửa và một dòng bổ sung. Có kiểm tra dữ liệu trước sửa, kiểm tra mã/đơn vị, chống trùng thành phần và rollback khi không khớp. Chạy lại không cộng dồn.
2. `../../scripts/fix_verified_salt_energy.sql`: chỉ đổi kcal của muối NL073 từ 1 thành 0, theo USDA SR28 NDB 02047; không thay natri.

Các file trên KHÔNG được thực thi trong phiên này. Không chạy lại toàn bộ seed QuanLyThucDon.sql.

## Những thay đổi đã có căn cứ

| Thành phần | Sửa | Nguồn |
|---|---|---|
| TP10503 | 50 tai nấm mèo → 50 g; chưa thay hồ sơ khô/tươi | [Điện Máy Xanh – canh khổ qua](https://www.dienmayxanh.com/vao-bep/cach-lam-kho-qua-nhoi-thit-am-nong-ngay-tet-00537) |
| TP10605 | Bổ sung 50 g nấm đông cô/nấm hương; nguồn hướng dẫn chọn nấm tươi | [Điện Máy Xanh – súp tuyết yến](https://www.dienmayxanh.com/vao-bep/cach-lam-sup-hai-san-tuyet-yen-bo-duong-don-gian-ngay-tai-nha-16679) |
| TP20302 | 6 trứng nguyên → 6 lòng đỏ; lượng gam/quả hiện có chưa được xác minh lại | [Điện Máy Xanh – Cream brulee](https://www.dienmayxanh.com/vao-bep/cach-lam-creme-brulee-kem-chay-thom-ngon-chuan-phap-cuc-de-01964) |
| TP20608 | 2 gói sữa → 390 ml, cộng 50 ml và 340 ml trong bước làm; chưa xác minh lại mật độ ml/g | [Điện Máy Xanh – bánh bao, biến thể thứ nhất](https://www.dienmayxanh.com/vao-bep/cach-lam-banh-bao-nhan-thit-mien-thom-ngon-de-lam-05203) |
| TP20605 | Hạt nêm 1 ít → 1,5 muỗng canh | Cùng nguồn bánh bao, bước làm nhân |
| TP20698 | Tiêu 1 ít → 2 muỗng cà phê; không tự thêm quy đổi cho NL240 | Cùng nguồn bánh bao, bước làm nhân |
| TP93307 | Tiêu 1 muỗng canh → 1 muỗng cà phê | [Điện Máy Xanh – cơm thăn bò](https://www.dienmayxanh.com/vao-bep/cach-lam-com-than-bo-rong-bien-sot-tuong-don-gian-01392) |
| DD073 | Chỉ kcal muối 1 → 0 trên 100 g | [USDA SR28 NDB 02047](https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg02.pdf) |

Không sửa bơ MA909 thành 30 g chỉ vì trông cao: [nguồn gốc thực sự ghi 300 g](https://www.dienmayxanh.com/vao-bep/cach-lam-rang-muc-xao-bo-toi-thom-beo-gion-dai-ngon-01278).

## Những trường hợp chưa đủ căn cứ để tự sửa

- MA101: lọc bỏ xác cá cơm; không thể mặc định toàn bộ dinh dưỡng cá vào nước canh.
- MA102: thiếu sâm, gà nguyên con và rượu rửa; không đồng nhất khối lượng nguyên con với phần thịt ăn được.
- MA104/105: một số gia vị có lượng trong bước nhưng thiếu trong bảng thành phần; cần tổng hợp đầy đủ, tránh cộng thêm khi đang có dòng gia vị hỗn hợp đại diện chúng.
- MA202: đường gồm 65 g phần vỏ và 1 muỗng canh phần kem; bảng đang thiếu lượng phần kem. Không tự cộng thành 80 g bằng quy đổi muỗng chưa xác minh. Không thêm trùng cùng nguyên liệu vì DB có UNIQUE(MaCongThuc,MaNguyenLieu).
- MA204: rượu ngâm nho được để ráo; chưa có lượng còn lại sau ngâm/nướng.
- MA205: số bột và đơn vị dầu không khớp giữa bảng và bước; cần đúng biến thể nguồn trước khi sửa.
- MA208: dữ liệu nước cốt chanh dây đậm đặc cần khớp sản phẩm; không dùng hồ sơ nước chanh thường thay thế.
- MA209: Tangzhong đã có nguyên liệu tạo hỗn hợp trong công thức; nguy cơ tính trùng. Chưa thay hồ sơ Tangzhong bằng giá trị tự tạo.
- MA211: bỏ bã đậu và vớt lá dứa. Chưa có dữ liệu cho hiệu suất chiết xuất phù hợp.
- MA213: nguồn dùng vải đóng hộp cùng nước ngâm; không thay bằng dữ liệu vải tươi/ml một cách mặc định.
- MA216/901/907/916/917/918/928/931: cần đọc riêng công đoạn chiên, lượng bột áo và lượng dầu dư; không dùng tỷ lệ hấp thụ chung. Một số trường hợp còn thiếu định lượng dầu.
- MA906: cốc đong nồi cơm không mặc định bằng USDA cup; cần nguồn cho 150 g/cốc đang dùng.
- MA913/929: bảng nguyên liệu chỉ có 3 dòng trong khi bước còn nhiều thành phần khác; đủ sáu chỉ số cho 3 dòng không có nghĩa công thức đầy đủ.
- MA919: quả dứa làm vỏ đựng và phần dứa cắt hạt lựu cần phân biệt để tránh tính cả vỏ hoặc cộng hai lần.
- MA920: 500 g muối lót nồi không đồng nghĩa 500 g muối ăn vào; gia vị ướp và nước chấm lại là các phần riêng.
- MA921/922/923/924/925/926/927/934/935: nguyên con, xương/vỏ, nước dùng và gia vị/nhãn sản phẩm cần đối chiếu riêng. Không áp hồ sơ một hãng cho mọi gói gia vị.
- MA938: nấm đang ghi 30 cái trong bảng nhưng bước ghi 30 g; chưa có đối chiếu độc lập đầy đủ với đúng trang nguồn nên tách khỏi SQL đã duyệt.
- MA939: bột mì dùng rửa trái cây, trà túi lọc và siro chưa chắc được ăn hết.
- MA942: đã lọc bã cà rốt; không cộng toàn bộ chất xơ của cà rốt nguyên.
- MA943/947/949: nước ngâm, phèn, nước tro, muối và đường có phần bỏ lại; chưa có số đo/nghiên cứu phù hợp để tính lượng hấp thụ.
- MA944/948: cần phân biệt số cái/mẻ/người và phần ăn thực tế. Không đổi số phần chuẩn chỉ để kcal nhìn thấp.
- MA950/951: trà túi lọc bỏ bã khác matcha uống cả bột; một số nhãn nguyên liệu và đơn vị thìa chưa xác minh.

Các món chưa nêu riêng vẫn có trong `audit-80-mon.md`, `audit.json` và `ingredients.csv`; không được coi là đã duyệt nguồn chỉ vì không có cảnh báo thủ công.

## Chạy lại kiểm tra offline

Từ thư mục backend:

```powershell
.\.venv\Scripts\python.exe scripts/review_nutrition_snapshot.py docs/nutrition-audit/snapshot.json
```

Lệnh này chỉ đọc snapshot và tạo báo cáo, không kết nối DB.
