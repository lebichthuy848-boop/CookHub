# Bản sửa giữ nguyên 80 món

## Đã làm và chưa làm

Không đổi tên món, công thức, số phần, nguyên liệu, định lượng, bước nấu hoặc ảnh của 80 món. Không thêm món thay thế. Không tự tạo thực đơn một tháng vì chưa có 20 món đã duyệt đủ nguồn.

Đã chuẩn bị hai nhóm sửa, CHƯA chạy trên DB:

1. `backend/scripts/fix_verified_kcal_profiles.sql`: sửa sáu hồ sơ nước/sả/táo tàu khô/nhãn nhục khô theo dữ liệu USDA đã đối chiếu. Áp cho đúng dạng nguyên liệu mô tả trong script. Các giá trị không có trong hồ sơ được giữ là chưa biết, không biến thành 0.
2. `backend/scripts/fix_processing_nutrition.sql`: thêm bảng dữ liệu lượng ăn được theo thành phần và sửa hai hàm tính món/thực đơn. Không sửa hồ sơ dầu ăn thành ít kcal để chữa món chiên. Không sửa xương thành 0 kcal để chữa nước hầm.

Nhóm 2 hiện đánh dấu 20 dòng cần xác định lượng thực sự ăn vào ở 10 món (không phải 20 món đã hoàn thiện):

| Món | Dòng cần xử lý |
|---|---|
| MA216 Súp hoành thánh chiên nhân chay | TP21618 dầu chiên |
| MA901 Nem nướng Ninh Hòa | TP908 dầu dùng nhiều công đoạn |
| MA907 Mì Ý gà giòn sốt kem | TP981 dầu, TP972 bột mì, TP973 trứng, TP979 bột năng |
| MA916 Đậu hũ non chiên xù | TP1053 dầu, TP1049 trứng, TP1051 bột chiên xù, TP1052 bột mì |
| MA926 Lẩu cua đồng | TP1170 xương, TP1169 cua xay lọc bã |
| MA929 Lẩu kim chi | TP1211 xương |
| MA230 Phở bò | TP23003 xương |
| MA920 Gà hấp muối sả | TP1112 muối lót nồi |
| MA946 Bạch tuộc trộn khế sốt Thái | TP93892 muối và TP93885 giấm dùng rửa rồi xả bỏ |
| MA949 Dưa cải muối | TP93909 muối, TP93910 đường, TP93914 giấm trong nước ngâm |

Đây là các dòng nhận diện từ công thức/bước nấu hiện có trong snapshot. Nguồn FAO chứng minh cần điều chỉnh phần ăn được và phần bỏ lại, KHÔNG cung cấp hệ số hấp thụ riêng cho các dòng này. Script không gán bất kỳ hệ số giả nào.

## Hành vi sau khi chạy

- Chi phí vẫn tính lượng nguyên liệu chuẩn bị như trước.
- Món không có quy tắc chế biến bổ sung đi theo cách tính cũ.
- Dòng chưa xác định lượng ăn vào trả NULL ở sáu chỉ số, có lý do và đường dẫn phương pháp. Các dòng khác đã tính được vẫn được giữ.
- API trả `processing_issues`, `complete=false`. Giao diện dùng nhãn nhỏ **Đã tính một phần**, có lý do khi rê chuột. Không trình bày tổng còn lại là kcal hoàn chỉnh của món.
- Gợi ý món không coi NULL là 0 để đề xuất món chiên thiếu dữ liệu như một món ít kcal.
- Kết quả từng thành viên vẫn giữ trạng thái chưa xác định này.
- Số hiển thị có thể thấp hơn rõ rệt sau khi bỏ đóng góp chưa chứng minh được. Điều đó KHÔNG có nghĩa món thực tế ít kcal hơn, chỉ là tổng phần đã tính được.
- Sau này chỉ nhập `GramAnDuocMoiMe` cùng `MaNguyenLieuAnDuoc` và nguồn khối lượng phù hợp. Dầu hấp thụ có thể dùng hồ sơ dầu đúng loại; nước dùng phải dùng hồ sơ nước dùng tương ứng, không dùng kcal xương cho gam nước dùng. Chưa có nguồn thì giữ NULL. Có URL không tự động chứng minh dữ liệu đúng: người cập nhật vẫn phải đối chiếu nguồn.
- Công thức hoặc tùy biến thay đổi khiến quy tắc cũ không còn khớp sẽ được báo cần kiểm tra lại, không áp lượng ăn được cũ vào nguyên liệu mới.

Không dùng file này để tuyên bố đã hoàn thiện 20 món. Các vấn đề khác (gia vị thiếu định lượng, hồ sơ đúng hãng/trạng thái, mật độ ml/g, khẩu phần và số liệu NULL) vẫn cần nguồn để xử lý.

## Cách chạy trong SSMS

Mở từng file và Execute theo thứ tự, không chạy lại toàn bộ `QuanLyThucDon.sql`:

1. `backend/scripts/fix_verified_kcal_profiles.sql`.
2. `backend/scripts/fix_processing_nutrition.sql`.
3. `backend/scripts/verify_nutrition_after_processing_fix.sql` (chỉ SELECT để kiểm tra).

Hai script cập nhật có transaction, kiểm tra dữ liệu trước sửa và rollback khi lỗi. Nhóm 2 còn kiểm tra định nghĩa hai hàm SQL khớp phiên bản đã đọc trước khi thay; không ghi đè phiên bản khác. Chạy lại không thêm trùng quy tắc và không xóa nguồn lượng ăn được đã bổ sung sau này.

Sau đó khởi động lại backend nếu chưa tự reload code mới và tải lại giao diện. Nếu cần hoàn tác nhóm 2, dùng `backend/scripts/rollback_processing_nutrition.sql`: trả hai hàm về định nghĩa trước bản sửa, giữ bảng quy tắc để lưu dấu vết. File hoàn tác cũng dừng nếu hàm đã bị sửa khác đi.

Nếu đã chạy bản nhóm 2 cũ có 14 dòng, chỉ cần chạy `backend/scripts/fix_sodium_preparation_rules.sql` để bổ sung sáu dòng muối/giấm/đường sơ chế và ngâm. Bản đầy đủ hiện tại đã chứa sáu dòng này; chạy thêm file bổ sung cũng không tạo trùng hoặc xóa dữ liệu lượng ăn vào đã được bổ sung.

## Kiểm tra đã thực hiện

- 35 kiểm thử backend về NULL, tổng từng chất, dầu chuẩn bị chưa rõ lượng ăn vào, chia khẩu phần và gợi ý món: đạt.
- 5 kiểm thử thành phần giao diện dinh dưỡng: đạt.
- Microsoft SQL Server ScriptDom kiểm tra cú pháp các script và cả nội dung EXEC động: đạt. Chưa chạy migration hoặc kiểm tra thực thi hàm trên SQL Server; chỉ kiểm tra cú pháp không chứng minh đầy đủ hành vi trên DB.

## Nguồn

- FAO Appendix 6: https://www.fao.org/4/y4705e/y4705e23.htm
- USDA SR28, mã 11972, 09147, 09173 và 14555: https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip
- Bản dữ liệu đối chiếu từng hồ sơ: `ingredient-reference-comparisons.json`.
- Dòng công thức và lý do cần xác định lượng ăn vào: `processing-rules.json`.

Muốn chốt kcal đầy đủ cho món chiên/nước hầm, còn cần số liệu lượng ăn vào hoặc hồ sơ/hệ số thành phẩm thực sự phù hợp. Không thể xác định chính xác các dữ liệu đó chỉ từ lượng dầu/xương ban đầu.
