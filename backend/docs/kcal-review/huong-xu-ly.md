# Cách xử lý kcal của 80 món

## Phần đã chuẩn bị để cập nhật

`backend/scripts/fix_verified_kcal_profiles.sql` sửa sáu hồ sơ đã đối chiếu USDA SR28:

- NL918 / NL1118: sả tươi nguyên chất, 99 kcal/100 g; cập nhật đồng bộ các chất theo NDB 11972.
- NL117: táo tàu khô không thêm đường, 281 kcal/100 g, NDB 09147.
- NL122: nhãn nhục khô không thêm đường, 286 kcal/100 g, NDB 09173.
- NL080 / NL183: nước không đường, chỉ sửa năng lượng thành 0; giữ natri hiện có.

Đây là dữ liệu tham khảo cho nguyên liệu tương ứng, không phải kết quả xét nghiệm nguyên liệu cụ thể. Nếu dùng sản phẩm có đường/dầu trộn thì cần nhãn đúng sản phẩm. Chất xơ không có trong hồ sơ sả/nhãn USDA được để NULL, không tự coi bằng 0. Script không điền các nguyên liệu NULL khác.

Script chỉ UPDATE hồ sơ sẵn có, kiểm tra mã, tên, cơ sở 100 g và giá trị trước/sau, chạy trong một transaction và có thể chạy lại. Nếu DB khác snapshot thì dừng và rollback. Chưa chạy script lên DB. Chưa kiểm thử thực thi trên SQL Server.

## Vấn đề cần thay đổi cách tính

Hiện `FnTinhNguyenLieu` dùng cùng `@SoLuong` để tính chi phí và dinh dưỡng. `ThongTinDinhDuong` mô tả nguyên liệu; nó không biết trong từng công thức, nguyên liệu đó có được ăn hết hay không. Vì vậy sửa kcal dầu ăn/xương về thấp để chữa một món sẽ làm sai những món khác.

Giữ nguyên `ThanhPhanCongThuc.SoLuong` để hiển thị công thức và tính chi phí. Thêm dữ liệu tính dinh dưỡng theo **MaThanhPhan**, không theo MaNguyenLieu chung:

| Dữ liệu đề xuất | Ý nghĩa |
|---|---|
| Cách tính | Ăn toàn bộ / lượng ăn được đã xác định / thay bằng thành phẩm / chưa xác định |
| Khối lượng ăn được (g) | Khối lượng thực sự tương ứng với hồ sơ dinh dưỡng, cho cả mẻ chuẩn |
| Mã hồ sơ thành phẩm | Dùng khi nguyên liệu qua lọc, chiên hoặc nấu nước dùng không thể tính trực tiếp |
| Nguồn, mã thực phẩm, trạng thái | Truy xuất nguồn của khối lượng, hệ số hoặc thành phẩm |
| Cơ sở xác định | Nhãn sản phẩm / hệ số công bố phù hợp / đo thực tế có biên bản |

NULL = chưa xác định. Chỉ dùng 0 khi có căn cứ lượng ăn vào bằng 0. Không đặt mặc định 100% hay một tỷ lệ hấp thụ chung cho dầu chiên. Nếu chưa rõ thì kết quả là tổng phần đã tính, không phải tổng hoàn chỉnh. Không loại bỏ các chất khác đã biết chỉ vì kcal bị NULL.

### Dầu chiên, bột áo: MA216, MA901, MA907, MA916

Không cộng toàn bộ lượng chuẩn bị, cũng không bỏ toàn bộ dầu khỏi dinh dưỡng. Ưu tiên hồ sơ thành phẩm chiên tương ứng hoặc hệ số thu nhận chất béo được công bố cho đúng thực phẩm, lớp áo và phương pháp. Nếu không có thì chưa chốt kcal món.

Đo bột áo đã dùng và phần dư chỉ là bước đầu; phải xét phần rơi ra khi chiên. Lượng dầu ban đầu trừ dầu thu hồi không tự động bằng dầu hấp thụ: còn dầu trên dụng cụ, dầu thất thoát, cặn và chất béo từ thực phẩm tiết ra. Muốn dùng đo thực tế phải kiểm soát và ghi nhận các yếu tố đó, không chỉ cân chênh lệch nồi dầu.

Với dầu xào/sốt được ăn hết, vẫn tính lượng dầu đó. Không áp quy tắc dầu chiên cho dầu trộn/mỡ hành. Đổi ml sang g phải dùng mật độ đúng loại dầu; không mặc định mọi chất lỏng có 1 ml = 1 g.

### Xương, nước dùng: MA230, MA926, MA929

Không dùng 749 kcal/100 g cho toàn bộ xương. Cũng không đặt xương = 0 rồi coi nước hầm = 0 kcal. Thịt ăn được trên xương tính riêng theo gam phần ăn được; nước dùng dùng hồ sơ nước dùng tương ứng với lượng nước dùng thực sự phục vụ. Nếu chuyển sang cách này phải loại phần đóng góp trùng của nguyên liệu đã dùng tạo nước dùng, và kiểm tra muối/gia vị đã nằm trong hồ sơ nước dùng chưa.

Hồ sơ nước dùng phải phù hợp loại thịt, cách lọc mỡ, độ cô đặc và muối. Chưa có nguồn khớp thì đánh dấu chưa xác định; không thay bằng một hồ sơ nước dùng bất kỳ chỉ để đủ số.

### Thiếu gà, cơm, vỏ bánh: MA102, MA103, MA201, MA206, MA903, MA937, MA945

- Gà/cá nguyên con: cần gam phần ăn được; trọng lượng cả xương/da/nội tạng khác với thịt ăn được. Không gán mọi con cùng một khối lượng.
- Bánh tráng theo cái: dùng khối lượng tịnh/số cái trên đúng bao bì hoặc số đo thực tế; sau đó khớp hồ sơ bánh tráng tương ứng.
- Bột bánh bao pha sẵn: ưu tiên nhãn đúng loại bột. Nếu thay bằng công thức bột mì tự phối thì đó là thay công thức, phải ghi rõ; không coi bột pha sẵn là bột mì thuần.
- Cơm/gạo theo chén: phân biệt cơm chín với gạo sống, loại chén/cốc đong. Dùng gam hoặc quy đổi có nguồn cho đúng loại thực phẩm và dụng cụ. Không áp một số gam/chén chung.

### Bã lọc, nước ngâm, khẩu phần

MA211 lọc đậu: cần hồ sơ tàu hủ/thành phẩm hoặc hệ số phù hợp, không ăn cả đậu khô. MA942 ép cà rốt: không coi chất xơ toàn bộ củ là chất xơ nước ép. MA943 củ kiệu, MA949 dưa muối: không cộng toàn bộ nước ngâm vào phần ăn. MA948 bánh tét: xác minh "4" là 4 đòn hay 4 phần; ghi khối lượng phần ăn. Một hũ/mẻ không tự động là một khẩu phần người.

## Công thức tính sau khi có đủ cơ sở

Với hồ sơ trên 100 g và thành phần được tính trực tiếp:

`Dinh dưỡng cả mẻ = Σ (gam phần ăn được × dinh dưỡng/100 g × hệ số lưu giữ phù hợp)`

`Dinh dưỡng một phần = dinh dưỡng cả mẻ / số phần thực tế`

Nếu chia theo gam thành phẩm: lấy tổng dinh dưỡng cả mẻ chia khối lượng thành phẩm ăn được rồi nhân gam phần phục vụ. Không tự giảm tổng kcal chỉ vì nấu bay hơi nước. Không nhân hệ số lưu giữ lần nữa nếu đã dùng hồ sơ thực phẩm chín/thành phẩm tương ứng.

## Thứ tự xử lý để có dữ liệu demo

1. Chạy SQL sáu hồ sơ đã chuẩn bị, sau khi xác nhận các nguyên liệu đúng dạng mô tả ở trên.
2. Bổ sung nguồn cho nguyên liệu chính chưa tính được; ưu tiên các món luộc/hấp/xào ăn hết, định lượng gam rõ và số phần rõ.
3. Xử lý dầu chiên, nước dùng, lọc bã bằng hồ sơ/hệ số đúng phương pháp; chưa có thì để chưa xác định và chưa đưa vào nhóm demo dinh dưỡng đầy đủ.
4. Kiểm tra lại từng chỉ số và khẩu phần. Đủ kcal không có nghĩa đủ chất xơ/natri. Không dùng con số chất xơ thấp do thiếu dữ liệu để kết luận người dùng thiếu chất xơ.
5. Chọn khoảng 20 món sau khi qua các kiểm tra, thay vì ép mọi món có một con số kcal.

## Nguồn phương pháp

- FAO, Appendix 6, Calculation of the composition of dishes prepared from recipes: https://www.fao.org/4/y4705e/y4705e23.htm
- EuroFIR SOPs 2019 (yield ở cấp công thức, retention ở cấp nguyên liệu): https://www.eurofir.org/wp-admin/wp-content/uploads/2019/02/2019-02-13-EuroFIR-SOPs-FINAL-PDF.pdf
- EuroFIR recipe calculation procedures (fat uptake): https://www.fao.org/uploads/media/EuroFIR_recipe_calculation_procedures_including_yield_and_re-2008_02.pdf
- USDA SR28 (NDB 11972, 09147, 09173, 14555): https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip

Tình trạng: đã có hướng xử lý và script sửa hồ sơ đối chiếu; chưa có đủ nguồn để chốt kcal đã sửa của toàn bộ 80 món. Chưa thay đổi hàm SQL, backend hoặc giao diện trong bước này.
