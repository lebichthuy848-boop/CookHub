USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
-- Only adds six unknown-intake review rules. Does not alter recipe quantities or sodium profiles.
-- Method: https://www.fao.org/4/y4705e/y4705e23.htm
BEGIN TRY
 BEGIN TRANSACTION;
 IF OBJECT_ID(N'dbo.DinhDuongThanhPhanCheBien',N'U') IS NULL
  THROW 51900,N'Run fix_processing_nutrition.sql first.',1;
 IF COALESCE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.FnTinhMonAn')),N'') NOT LIKE N'%FnTinhThanhPhanDinhDuong%'
  THROW 51910,N'Processing nutrition helper is not active. Run fix_processing_nutrition.sql first.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1112' AND MaCongThuc=N'CT920' AND MaNguyenLieu=N'NL1112' AND MaDonVi=N'DVT001' AND SoLuong=500.000)
  THROW 51901,N'TP1112 differs from reviewed recipe; no changes committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93892' AND MaCongThuc=N'CT946' AND MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT006' AND SoLuong=5.000)
  THROW 51902,N'TP93892 differs from reviewed recipe; no changes committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93885' AND MaCongThuc=N'CT946' AND MaNguyenLieu=N'NL952' AND MaDonVi=N'DVT006' AND SoLuong=3.000)
  THROW 51903,N'TP93885 differs from reviewed recipe; no changes committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93909' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT001' AND SoLuong=60.000)
  THROW 51904,N'TP93909 differs from reviewed recipe; no changes committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93910' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL074' AND MaDonVi=N'DVT001' AND SoLuong=20.000)
  THROW 51905,N'TP93910 differs from reviewed recipe; no changes committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93914' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL952' AND MaDonVi=N'DVT007' AND SoLuong=3.000)
  THROW 51906,N'TP93914 differs from reviewed recipe; no changes committed.',1;
 EXEC(N'IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1112'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1112'',N''NL1112'',N''DVT001'',500.000,NULL,NULL,N''500 g muối hột lót nồi hấp gà, không phải lượng muối được ăn toàn bộ.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP93892'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP93892'',N''NL073'',N''DVT006'',5.000,NULL,NULL,N''Muối bóp rửa bạch tuộc rồi xả sạch, chưa có lượng natri còn lại.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP93885'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP93885'',N''NL952'',N''DVT006'',3.000,NULL,NULL,N''Giấm bóp rửa bạch tuộc rồi xả sạch, không ăn toàn bộ lượng sơ chế.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP93909'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP93909'',N''NL073'',N''DVT001'',60.000,NULL,NULL,N''Muối trong nước ngâm dưa, chưa xác định lượng muối vào phần dưa ăn được.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP93910'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP93910'',N''NL074'',N''DVT001'',20.000,NULL,NULL,N''Đường trong nước ngâm dưa, chưa xác định lượng còn trong phần ăn được.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP93914'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP93914'',N''NL952'',N''DVT007'',3.000,NULL,NULL,N''Giấm trong nước ngâm dưa, không ăn toàn bộ lượng nước ngâm.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');');
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
