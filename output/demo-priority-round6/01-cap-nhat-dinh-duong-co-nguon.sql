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
(N'NL003',N'Bún tươi',103.00,1.43,23.70,0.31,0.30,47.00,N'https://inmu.mahidol.ac.th/thaifcd/foodsearch/food_name_result?selected_id=166&selected_dbcode=STD&selected_name=%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B8%88%E0%B8%B5%E0%B8%99&food_name=%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B8%88%E0%B8%B5%E0%B8%99&mode=food_group_result',N'Thai FCD A8 / STD 166',N'Noodles, rice, fermented (kanom-jeen), Oryza sativa',N'Chọn mẫu bún GẠO TƯƠI LÊN MEN kanom-jeen, không phải bún khô/bún gạo lứt; 100 g phần ăn được. Thai FCD A8, độ ẩm 74.4%. Kcal/đạm/béo/xơ/natri lấy cùng hồ sơ. Carbohydrate TỔNG 23.70 g được TÍNH theo chênh lệch: 100-74.4 nước-1.43 đạm-0.31 béo-0.16 tro. Không chép 23.42 g carbohydrate KHẢ DỤNG thành tổng. Có sai khác làm tròn giữa các giá trị trung bình nguồn. Đây là hồ sơ tham chiếu theo loại bún đã chọn, không phải kiểm nghiệm mọi loại bún Việt Nam; không tự coi bún không lên men là cùng mẫu.',N'{"MaThongTin":"DD003","MaNguyenLieu":"NL003","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"110.00","ChatDam":"1.70","ChatBotDuong":"25.70","ChatBeo":null,"ChatXo":null,"natri":null}'),
(N'NL914',N'Bún ăn kèm',103.00,1.43,23.70,0.31,0.30,47.00,N'https://inmu.mahidol.ac.th/thaifcd/foodsearch/food_name_result?selected_id=166&selected_dbcode=STD&selected_name=%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B8%88%E0%B8%B5%E0%B8%99&food_name=%E0%B8%82%E0%B8%99%E0%B8%A1%E0%B8%88%E0%B8%B5%E0%B8%99&mode=food_group_result',N'Thai FCD A8 / STD 166',N'Noodles, rice, fermented (kanom-jeen), Oryza sativa',N'Chọn mẫu bún GẠO TƯƠI LÊN MEN kanom-jeen, không phải bún khô/bún gạo lứt; 100 g phần ăn được. Thai FCD A8, độ ẩm 74.4%. Kcal/đạm/béo/xơ/natri lấy cùng hồ sơ. Carbohydrate TỔNG 23.70 g được TÍNH theo chênh lệch: 100-74.4 nước-1.43 đạm-0.31 béo-0.16 tro. Không chép 23.42 g carbohydrate KHẢ DỤNG thành tổng. Có sai khác làm tròn giữa các giá trị trung bình nguồn. Đây là hồ sơ tham chiếu theo loại bún đã chọn, không phải kiểm nghiệm mọi loại bún Việt Nam; không tự coi bún không lên men là cùng mẫu.',N'{"MaThongTin":"DD914","MaNguyenLieu":"NL914","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"110.00","ChatDam":"1.70","ChatBotDuong":"25.70","ChatBeo":null,"ChatXo":null,"natri":null}'),
(N'NL1199',N'Riềng',35.00,0.69,7.79,0.17,NULL,82.00,N'https://inmu.mahidol.ac.th/thaifcd/foodsearch/food_name_result?selected_id=232&selected_dbcode=STD&selected_name=galanga&food_name=galanga&mode=food_group_result',N'Thai FCD N11 / STD 232',N'Galanga / Alpinia galanga',N'Chọn riềng Alpinia galanga sống làm mẫu tham khảo, 100 g phần ăn được. Không áp cho gừng hoặc riềng khô/bột. Nguồn không công bố chất xơ: giữ NULL. Chưa giải quyết khối lượng của một nhánh riềng; không mượn xơ của riềng NON để lấp.',N'{"MaThongTin":"DD111","MaNguyenLieu":"NL1199","KhoiLuongChuan":"100.00","MaDonVi":"DVT001","NangLuong":"26.00","ChatDam":"0.30","ChatBotDuong":"2.50","ChatBeo":null,"ChatXo":null,"natri":null}');
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
