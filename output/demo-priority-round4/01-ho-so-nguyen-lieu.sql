USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
-- CHỈ cập nhật hồ sơ đã có đối chiếu chính thức; không sửa công thức, số lượng hoặc quy đổi.
-- Tất cả số: 100 g PHẦN ĂN ĐƯỢC; kcal, g protein/carbs/béo/xơ, mg NATRI (không phải muối).
-- Chưa công bố tổng chất xơ -> NULL, tuyệt đối không điền 0 thay thế.
-- Mặc định chạy thật trong giao dịch. Có kiểm tra snapshot cũ, chạy lại an toàn nếu dữ liệu đã đúng đích.
BEGIN TRY
 BEGIN TRANSACTION;
 DECLARE @LockResult int;
 EXEC @LockResult = sys.sp_getapplock @Resource=N'CookHub_VerifiedNutrientSources_v1', @LockMode=N'Exclusive', @LockOwner=N'Transaction', @LockTimeout=10000;
 IF @LockResult < 0 THROW 51000,N'Không lấy được khóa cập nhật. Hãy chạy lại sau.',1;
 CREATE TABLE #Nguon (
  MaNguyenLieu nvarchar(20) PRIMARY KEY, TenNguyenLieu nvarchar(200),
  NangLuong decimal(10,2), ChatDam decimal(10,2), ChatBotDuong decimal(10,2),
  ChatBeo decimal(10,2), ChatXo decimal(10,2), natri decimal(10,2),
  URL nvarchar(2048), MaThucPhamNguon nvarchar(100), TenTrongNguon nvarchar(1000),
  DieuKien nvarchar(2000), SnapshotCu nvarchar(max));
 INSERT INTO #Nguon VALUES
(N'NL958',N'Khoai tây',79.00,2.14,18.07,0.08,1.30,5.00,N'https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip',N'NDB 11353',N'Potatoes, russet, flesh and skin, raw',N'USDA SR28, bản tháng 05/2016; 100 g phần ăn được. Khoai tây SỐNG phần THỊT đã bỏ vỏ; không dùng bảng cả vỏ. Hồ sơ không tự xác minh khối lượng mỗi củ hiện có.',N'{"MaThongTin":"DD958","MaNguyenLieu":"NL958","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"93.00","ChatDam":"2.00","ChatBotDuong":"20.90","ChatBeo":"0.10","ChatXo":null,"natri":"7.00"}'),
(N'NL029',N'Đậu hũ',76.00,8.08,1.87,4.78,0.30,7.00,N'https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip',N'NDB 16427',N'Tofu, raw, regular, prepared with calcium sulfate',N'USDA SR28, bản tháng 05/2016; 100 g phần ăn được. Chọn đậu hũ thường, sống, kết tủa calcium sulfate làm mẫu tham khảo. Không áp cho đậu hũ non/chiên hoặc mọi nhãn có thành phần khác.',N'{"MaThongTin":"DD029","MaNguyenLieu":"NL029","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"95.00","ChatDam":"10.90","ChatBotDuong":"0.70","ChatBeo":"5.40","ChatXo":null,"natri":"7.00"}'),
(N'NL960',N'Tía tô',32.00,3.90,7.50,0.10,7.30,1.00,N'https://fooddb.mext.go.jp/details/details.pl?ITEM_NO=6_06095_7',N'MEXT 06095',N'Perilla frutescens var. crispa, leaves, raw',N'LÁ tía tô sống, không gồm cành/rễ; MEXT 2023. Mẫu shiso Nhật làm tham khảo cùng loại, không phải kiểm nghiệm giống tía tô Việt Nam; không dùng bảng hạt tía tô. Dùng protein 3.9, tổng carbohydrate 7.5, lipid 0.1; không nhầm protein theo amino acid hoặc carbohydrate khả dụng.',N'{"MaThongTin":"DD960","MaNguyenLieu":"NL960","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"25.00","ChatDam":"2.90","ChatBotDuong":"3.40","ChatBeo":null,"ChatXo":null,"natri":"3.00"}');
 IF EXISTS(SELECT 1 FROM #Nguon s LEFT JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=s.MaNguyenLieu
           WHERE n.MaNguyenLieu IS NULL OR n.TenNguyenLieu COLLATE Latin1_General_100_BIN2 <> s.TenNguyenLieu COLLATE Latin1_General_100_BIN2)
  THROW 51001,N'Mã/tên nguyên liệu đã khác bản rà soát. Dừng để tránh gán nhầm nguồn.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT001' AND KyHieu=N'g' AND HeSoGramChuan=1)
  THROW 51002,N'DVT001 không còn là gam. Dừng cập nhật.',1;
 -- Dữ liệu mới hơn snapshot sẽ KHÔNG bị ghi đè. Chấp nhận bản cũ hoặc đích giống hệt.
 IF EXISTS (
  SELECT 1 FROM #Nguon s LEFT JOIN dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK) ON d.MaNguyenLieu=s.MaNguyenLieu
  WHERE NOT (
    (s.SnapshotCu IS NULL AND d.MaThongTin IS NULL)
    OR (d.MaThongTin IS NOT NULL AND NOT EXISTS(
      SELECT d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
      EXCEPT SELECT CONVERT(decimal(10,2),100),CONVERT(nvarchar(20),N'DVT001'),s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri))
    OR (s.SnapshotCu IS NOT NULL AND d.MaThongTin IS NOT NULL AND NOT EXISTS(
      SELECT d.MaThongTin,d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
      EXCEPT SELECT j.MaThongTin,j.KhoiLuongChuan,j.MaDonVi,j.NangLuong,j.ChatDam,j.ChatBotDuong,j.ChatBeo,j.ChatXo,j.natri
      FROM OPENJSON(s.SnapshotCu) WITH(MaThongTin nvarchar(20),KhoiLuongChuan decimal(10,2),MaDonVi nvarchar(20),NangLuong decimal(10,2),ChatDam decimal(10,2),ChatBotDuong decimal(10,2),ChatBeo decimal(10,2),ChatXo decimal(10,2),natri decimal(10,2)) j))
  )) THROW 51003,N'Có dữ liệu đã đổi sau bản rà soát. Đã dừng; cần đối chiếu trước khi cập nhật.',1;
 -- NULL là thiếu bằng chứng, không phải 0. Chỉ mở NULL nếu cột đang NOT NULL.
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'NangLuong' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [NangLuong] decimal(10,2) NULL;
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'ChatDam' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [ChatDam] decimal(10,2) NULL;
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'ChatBotDuong' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [ChatBotDuong] decimal(10,2) NULL;
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'ChatBeo' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [ChatBeo] decimal(10,2) NULL;
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'ChatXo' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [ChatXo] decimal(10,2) NULL;
 IF EXISTS(SELECT 1 FROM sys.columns WHERE object_id=OBJECT_ID(N'dbo.ThongTinDinhDuong') AND name=N'natri' AND is_nullable=0)
  ALTER TABLE dbo.ThongTinDinhDuong ALTER COLUMN [natri] decimal(10,2) NULL;

 IF OBJECT_ID(N'dbo.NguonDinhDuongDaDoiChieu',N'U') IS NULL
 CREATE TABLE dbo.NguonDinhDuongDaDoiChieu(
  MaNguyenLieu nvarchar(20) NOT NULL PRIMARY KEY,
  MaThucPhamNguon nvarchar(100) NOT NULL, TenTrongNguon nvarchar(1000) NOT NULL,
  URL nvarchar(2048) NOT NULL, DieuKien nvarchar(2000) NOT NULL,
  DuLieuNguonJSON nvarchar(max) NOT NULL, DuLieuTruocLanDauJSON nvarchar(max) NULL,
  NgayDoiChieu date NOT NULL, NgayApDung datetime2 NOT NULL DEFAULT SYSUTCDATETIME());
 -- Lưu bản gốc lần đầu để truy vết; chạy lại không làm mất bản gốc.
 INSERT dbo.NguonDinhDuongDaDoiChieu(MaNguyenLieu,MaThucPhamNguon,TenTrongNguon,URL,DieuKien,DuLieuNguonJSON,DuLieuTruocLanDauJSON,NgayDoiChieu)
 SELECT s.MaNguyenLieu,s.MaThucPhamNguon,s.TenTrongNguon,s.URL,s.DieuKien,
   (SELECT CONVERT(decimal(10,2),100) KhoiLuongChuan,N'DVT001' MaDonVi,s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),
   (SELECT d.* FROM dbo.ThongTinDinhDuong d WHERE d.MaNguyenLieu=s.MaNguyenLieu FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),
   CONVERT(date,'20261120',112)
 FROM #Nguon s WHERE NOT EXISTS(SELECT 1 FROM dbo.NguonDinhDuongDaDoiChieu p WHERE p.MaNguyenLieu=s.MaNguyenLieu);
 UPDATE p SET MaThucPhamNguon=s.MaThucPhamNguon,TenTrongNguon=s.TenTrongNguon,URL=s.URL,DieuKien=s.DieuKien,
  DuLieuNguonJSON=(SELECT CONVERT(decimal(10,2),100) KhoiLuongChuan,N'DVT001' MaDonVi,s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri FOR JSON PATH,INCLUDE_NULL_VALUES,WITHOUT_ARRAY_WRAPPER),NgayDoiChieu=CONVERT(date,'20261120',112)
 FROM dbo.NguonDinhDuongDaDoiChieu p JOIN #Nguon s ON s.MaNguyenLieu=p.MaNguyenLieu;
 UPDATE d SET KhoiLuongChuan=100,MaDonVi=N'DVT001',NangLuong=s.NangLuong,ChatDam=s.ChatDam,
  ChatBotDuong=s.ChatBotDuong,ChatBeo=s.ChatBeo,ChatXo=s.ChatXo,natri=s.natri
 FROM dbo.ThongTinDinhDuong d JOIN #Nguon s ON s.MaNguyenLieu=d.MaNguyenLieu;
 -- Giữ mã DD cũ. Bản mới dùng DD + số, tránh trùng mã và đúng quy ước DD[0-9].
 DECLARE @MaxDD bigint=(SELECT ISNULL(MAX(TRY_CONVERT(bigint,SUBSTRING(MaThongTin,3,18))),0) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaThongTin LIKE N'DD%');
 INSERT dbo.ThongTinDinhDuong(MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
 SELECT N'DD'+CONVERT(nvarchar(18),@MaxDD+ROW_NUMBER() OVER(ORDER BY s.MaNguyenLieu)),s.MaNguyenLieu,100,N'DVT001',s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri
 FROM #Nguon s WHERE NOT EXISTS(SELECT 1 FROM dbo.ThongTinDinhDuong d WHERE d.MaNguyenLieu=s.MaNguyenLieu);
 IF EXISTS(SELECT 1 FROM #Nguon s JOIN dbo.ThongTinDinhDuong d ON d.MaNguyenLieu=s.MaNguyenLieu WHERE EXISTS(
  SELECT d.KhoiLuongChuan,d.MaDonVi,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri
  EXCEPT SELECT CONVERT(decimal(10,2),100),CONVERT(nvarchar(20),N'DVT001'),s.NangLuong,s.ChatDam,s.ChatBotDuong,s.ChatBeo,s.ChatXo,s.natri))
  THROW 51004,N'Kiểm tra sau ghi không khớp dữ liệu nguồn. Đã hủy giao dịch.',1;
 COMMIT TRANSACTION;
 SELECT s.MaNguyenLieu,s.TenNguyenLieu,d.NangLuong,d.ChatDam,d.ChatBotDuong,d.ChatBeo,d.ChatXo,d.natri,s.MaThucPhamNguon,s.URL
 FROM #Nguon s JOIN dbo.ThongTinDinhDuong d ON d.MaNguyenLieu=s.MaNguyenLieu ORDER BY s.MaNguyenLieu;
 DROP TABLE #Nguon;
END TRY
BEGIN CATCH
 IF XACT_STATE()<>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
