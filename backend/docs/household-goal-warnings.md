# Cảnh báo khi chọn mục tiêu cân nặng

Theo yêu cầu sản phẩm, người trưởng thành có đủ hồ sơ vẫn được chọn Duy trì/Giảm cân/Tăng cân và xem kết quả ước tính. Cảnh báo không tự chuyển mục tiêu, không xóa mục tiêu cá nhân hoặc mục tiêu nhóm. GET không sửa dữ liệu đã lưu.

Các ngưỡng tham chiếu người trưởng thành dùng trong cảnh báo:

- BMI dưới 18,5 và chọn giảm cân: nhắc đang thiếu cân, việc giảm thêm có thể không phù hợp. Nguồn NHS: https://www.nhs.uk/conditions/malnutrition/symptoms/
- BMI từ 25 và chọn tăng cân: cảnh báo theo ngưỡng BMI tổng quát; không chẩn đoán chỉ bằng BMI. NHS nêu ngưỡng thừa cân 25–29,9 và lưu ý BMI không phân biệt khối cơ với mỡ: https://www.nhs.uk/conditions/overweight-and-obesity/

Đây không phải phân loại BMI cá nhân theo dân tộc, bệnh lý, thai kỳ hoặc vận động viên. Thông báo dùng cách diễn đạt “có thể không phù hợp”, không khẳng định rằng BMI quyết định mục tiêu cân nặng của mọi người.

Kcal vẫn dùng công thức hiện có Mifflin–St Jeor nhân hệ số vận động. Giảm min(600 kcal, 20% mức duy trì) hoặc cộng 300 kcal là quy tắc ước tính của ứng dụng; tỷ lệ đạm/carbs/béo 15%/60%/25% cũng là quy tắc ứng dụng, không phải công thức BMI hoặc chỉ định ăn uống cá nhân. Các quy tắc này không đổi trong lần sửa.

Ngưỡng hiển thị cảnh báo kcal thấp 1.200 (nữ)/1.500 (nam) được giữ từ chính sách kiểm tra cũ; chuyển thành cảnh báo thay vì bỏ kết quả. Không tuyên bố các mức này là ngưỡng an toàn chung cho mọi người. Kết quả không dương hoặc hồ sơ thiếu dữ liệu vẫn không tạo được mục tiêu. Trẻ dưới 18 tuổi không dùng mục tiêu tăng/giảm cân của người trưởng thành.

Cảnh báo nằm ngay dưới tab mục tiêu, kèm câu xác nhận vẫn đang tính theo lựa chọn. Khi chuyển về nhóm, tiếp tục cộng các mục tiêu đã chọn và hiển thị cảnh báo của thành viên liên quan.
