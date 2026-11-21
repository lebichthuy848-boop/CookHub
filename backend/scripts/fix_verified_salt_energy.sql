USE QuanLyThucDon;
GO
SET XACT_ABORT ON;
SET NOCOUNT ON;

-- USDA SR28, NDB 02047, Salt, table: 0 kcal / 100 g.
-- https://www.ars.usda.gov/ARSUserFiles/80400525/Data/SR/SR28/reports/sr28fg02.pdf
-- Only correct energy for plain salt NL073. Preserve sodium and all other fields.
BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD073' AND d.MaNguyenLieu=N'NL073'
    AND n.TenNguyenLieu=N'Muối' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
    AND d.NangLuong IN(0,1)
    AND d.ChatDam=0 AND d.ChatBotDuong=0 AND d.ChatBeo=0
 )
  THROW 51201,N'Dữ liệu muối khác bản đã kiểm tra. Chưa cập nhật.',1;

 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=0
 WHERE MaThongTin=N'DD073' AND MaNguyenLieu=N'NL073' AND NangLuong=1;
 COMMIT TRANSACTION;

 SELECT d.*,N'USDA SR28, NDB 02047: Salt, table. Chỉ sửa kcal.' AS CanCu
 FROM dbo.ThongTinDinhDuong d WHERE d.MaThongTin=N'DD073';
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
