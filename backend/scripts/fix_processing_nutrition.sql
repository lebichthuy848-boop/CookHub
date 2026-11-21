USE QuanLyThucDon;
GO
SET XACT_ABORT ON;
SET NOCOUNT ON;
-- NO changes to the 80 dishes, recipe quantities, steps or raw ingredient nutrition.
-- NULL edible weight means UNKNOWN, not zero. This does not finish 20 demo recipes.
-- Review method source: https://www.fao.org/4/y4705e/y4705e23.htm
BEGIN TRY
 BEGIN TRANSACTION;
 IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT001' AND KyHieu=N'g')
  THROW 51500,N'DVT001 must be grams.',1;
 IF REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.FnTinhMonAn')),CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION') IS NULL OR REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.FnTinhMonAn')),CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION') NOT IN (REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(N'CREATE   FUNCTION dbo.FnTinhMonAn
	(@MaMonAn NVARCHAR(20),@SoKhauPhan INT,@Ngay DATE,@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT n.*,t.* FROM dbo.FnNhuCauNguyenLieuMon(@MaMonAn,@SoKhauPhan) n
	 CROSS APPLY dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc) t;',CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION'),REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(N'CREATE OR ALTER FUNCTION dbo.FnTinhMonAn
	(@MaMonAn NVARCHAR(20),@SoKhauPhan INT,@Ngay DATE,@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT n.*,t.* FROM dbo.FnNhuCauNguyenLieuMon(@MaMonAn,@SoKhauPhan) n
	 CROSS APPLY dbo.FnTinhThanhPhanDinhDuong(n.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc,0) t;',CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION'))
  THROW 51501,N'FnTinhMonAn changed since review. No updates committed.',1;
 IF REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.FnTinhChiTietThucDon')),CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION') IS NULL OR REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(OBJECT_DEFINITION(OBJECT_ID(N'dbo.FnTinhChiTietThucDon')),CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION') NOT IN (REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(N'CREATE   FUNCTION dbo.FnTinhChiTietThucDon
	(@MaThucDon NVARCHAR(20),@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT ct.MaChiTiet,ct.MaMonAn,ct.NgayDung,ct.BuaAn,ct.SoKhauPhan,
	  c.MaCongThuc,c.SoKhauPhanChuan,tp.MaThanhPhan,
	  tp.MaNguyenLieu AS MaNguyenLieuGoc,n.MaNguyenLieu,n.MaDonVi,n.SoLuongCan,
	  CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT) DaTuyBien,
	  t.*
	 FROM dbo.ChiTietThucDon ct
	 LEFT JOIN dbo.CongThuc c ON c.MaMonAn=ct.MaMonAn
	 LEFT JOIN dbo.ThanhPhanCongThuc tp ON tp.MaCongThuc=c.MaCongThuc
	 LEFT JOIN dbo.TuyBienNguyenLieuThucDon tb ON tb.MaChiTiet=ct.MaChiTiet AND tb.MaThanhPhan=tp.MaThanhPhan
	 CROSS APPLY(SELECT COALESCE(tb.MaNguyenLieu,tp.MaNguyenLieu) MaNguyenLieu,
	   COALESCE(tb.MaDonVi,tp.MaDonVi) MaDonVi,
	   NULLIF(TRY_CONVERT(DECIMAL(24,8),CAST(COALESCE(tb.SoLuong,tp.SoLuong) AS DECIMAL(19,6))*ct.SoKhauPhan/NULLIF(c.SoKhauPhanChuan,0)),0) SoLuongCan) n
	 CROSS APPLY dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc) t
	 WHERE ct.MaThucDon=@MaThucDon;',CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION'),REPLACE(REPLACE(UPPER(REPLACE(REPLACE(REPLACE(REPLACE(N'CREATE OR ALTER FUNCTION dbo.FnTinhChiTietThucDon
	(@MaThucDon NVARCHAR(20),@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT ct.MaChiTiet,ct.MaMonAn,ct.NgayDung,ct.BuaAn,ct.SoKhauPhan,
	  c.MaCongThuc,c.SoKhauPhanChuan,tp.MaThanhPhan,
	  tp.MaNguyenLieu AS MaNguyenLieuGoc,n.MaNguyenLieu,n.MaDonVi,n.SoLuongCan,
	  CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT) DaTuyBien,
	  t.*
	 FROM dbo.ChiTietThucDon ct
	 LEFT JOIN dbo.CongThuc c ON c.MaMonAn=ct.MaMonAn
	 LEFT JOIN dbo.ThanhPhanCongThuc tp ON tp.MaCongThuc=c.MaCongThuc
	 LEFT JOIN dbo.TuyBienNguyenLieuThucDon tb ON tb.MaChiTiet=ct.MaChiTiet AND tb.MaThanhPhan=tp.MaThanhPhan
	 CROSS APPLY(SELECT COALESCE(tb.MaNguyenLieu,tp.MaNguyenLieu) MaNguyenLieu,
	   COALESCE(tb.MaDonVi,tp.MaDonVi) MaDonVi,
	   NULLIF(TRY_CONVERT(DECIMAL(24,8),CAST(COALESCE(tb.SoLuong,tp.SoLuong) AS DECIMAL(19,6))*ct.SoKhauPhan/NULLIF(c.SoKhauPhanChuan,0)),0) SoLuongCan) n
	 CROSS APPLY dbo.FnTinhThanhPhanDinhDuong(tp.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc,CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT)) t
	 WHERE ct.MaThucDon=@MaThucDon;',CHAR(13),N''),CHAR(10),N''),CHAR(9),N''),N' ',N'')),N'CREATEORALTER',N'CREATE'),N'ALTERFUNCTION',N'CREATEFUNCTION'))
  THROW 51502,N'FnTinhChiTietThucDon changed since review. No updates committed.',1;
 IF OBJECT_ID(N'dbo.DinhDuongThanhPhanCheBien',N'U') IS NULL
  EXEC(N'CREATE TABLE dbo.DinhDuongThanhPhanCheBien (
 MaThanhPhan NVARCHAR(20) NOT NULL PRIMARY KEY,
 MaNguyenLieuDoiChieu NVARCHAR(20) NOT NULL,
 MaDonViDoiChieu NVARCHAR(20) NOT NULL,
 SoLuongDoiChieu DECIMAL(24,8) NOT NULL CHECK(SoLuongDoiChieu>0),
 MaNguyenLieuAnDuoc NVARCHAR(20) NULL REFERENCES dbo.NguyenLieu(MaNguyenLieu),
 GramAnDuocMoiMe DECIMAL(24,8) NULL CHECK(GramAnDuocMoiMe>=0),
 NguonKhoiLuong NVARCHAR(2000) NULL,
 LyDo NVARCHAR(1000) NOT NULL,
 NguonPhuongPhap NVARCHAR(2000) NOT NULL,
 CONSTRAINT FK_DDThanhPhanCheBien FOREIGN KEY(MaThanhPhan)
  REFERENCES dbo.ThanhPhanCongThuc(MaThanhPhan),
 CONSTRAINT CK_DDThanhPhanCheBien_Nguon CHECK(
  GramAnDuocMoiMe IS NULL OR (MaNguyenLieuAnDuoc IS NOT NULL AND NguonKhoiLuong IS NOT NULL AND
    (NguonKhoiLuong LIKE N''https://%'' OR NguonKhoiLuong LIKE N''http://%'')))
);');
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP21618' AND MaCongThuc=N'CT216' AND MaNguyenLieu=N'NL072' AND MaDonVi=N'DVT003' AND SoLuong=250.000)
  THROW 51600,N'TP21618 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP908' AND MaCongThuc=N'CT901' AND MaNguyenLieu=N'NL072' AND MaDonVi=N'DVT003' AND SoLuong=210.000)
  THROW 51601,N'TP908 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP981' AND MaCongThuc=N'CT907' AND MaNguyenLieu=N'NL072' AND MaDonVi=N'DVT003' AND SoLuong=100.000)
  THROW 51602,N'TP981 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1053' AND MaCongThuc=N'CT916' AND MaNguyenLieu=N'NL072' AND MaDonVi=N'DVT003' AND SoLuong=400.000)
  THROW 51603,N'TP1053 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1049' AND MaCongThuc=N'CT916' AND MaNguyenLieu=N'NL028' AND MaDonVi=N'DVT005' AND SoLuong=3.000)
  THROW 51604,N'TP1049 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1051' AND MaCongThuc=N'CT916' AND MaNguyenLieu=N'NL1051' AND MaDonVi=N'DVT001' AND SoLuong=500.000)
  THROW 51605,N'TP1051 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1052' AND MaCongThuc=N'CT916' AND MaNguyenLieu=N'NL301' AND MaDonVi=N'DVT001' AND SoLuong=100.000)
  THROW 51606,N'TP1052 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP972' AND MaCongThuc=N'CT907' AND MaNguyenLieu=N'NL972' AND MaDonVi=N'DVT001' AND SoLuong=600.000)
  THROW 51607,N'TP972 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP973' AND MaCongThuc=N'CT907' AND MaNguyenLieu=N'NL028' AND MaDonVi=N'DVT005' AND SoLuong=3.000)
  THROW 51608,N'TP973 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP979' AND MaCongThuc=N'CT907' AND MaNguyenLieu=N'NL146' AND MaDonVi=N'DVT006' AND SoLuong=6.000)
  THROW 51609,N'TP979 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1170' AND MaCongThuc=N'CT926' AND MaNguyenLieu=N'NL1156' AND MaDonVi=N'DVT001' AND SoLuong=500.000)
  THROW 51610,N'TP1170 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1211' AND MaCongThuc=N'CT929' AND MaNguyenLieu=N'NL232' AND MaDonVi=N'DVT001' AND SoLuong=500.000)
  THROW 51611,N'TP1211 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP23003' AND MaCongThuc=N'CT230' AND MaNguyenLieu=N'NL232' AND MaDonVi=N'DVT001' AND SoLuong=100.000)
  THROW 51612,N'TP23003 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1169' AND MaCongThuc=N'CT926' AND MaNguyenLieu=N'NL027' AND MaDonVi=N'DVT002' AND SoLuong=1.000)
  THROW 51613,N'TP1169 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP1112' AND MaCongThuc=N'CT920' AND MaNguyenLieu=N'NL1112' AND MaDonVi=N'DVT001' AND SoLuong=500.000)
  THROW 51614,N'TP1112 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93892' AND MaCongThuc=N'CT946' AND MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT006' AND SoLuong=5.000)
  THROW 51615,N'TP93892 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93885' AND MaCongThuc=N'CT946' AND MaNguyenLieu=N'NL952' AND MaDonVi=N'DVT006' AND SoLuong=3.000)
  THROW 51616,N'TP93885 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93909' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT001' AND SoLuong=60.000)
  THROW 51617,N'TP93909 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93910' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL074' AND MaDonVi=N'DVT001' AND SoLuong=20.000)
  THROW 51618,N'TP93910 differs from reviewed recipe. No updates committed.',1;
 IF NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N'TP93914' AND MaCongThuc=N'CT949' AND MaNguyenLieu=N'NL952' AND MaDonVi=N'DVT007' AND SoLuong=3.000)
  THROW 51619,N'TP93914 differs from reviewed recipe. No updates committed.',1;
 EXEC(N'IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP21618'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP21618'',N''NL072'',N''DVT003'',250.000,NULL,NULL,N''Dầu chuẩn bị chiên hoành thánh, chưa có lượng dầu ăn vào.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP908'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP908'',N''NL072'',N''DVT003'',210.000,NULL,NULL,N''Dầu dùng nhiều công đoạn của nem nướng, chưa tách dầu chiên dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP981'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP981'',N''NL072'',N''DVT003'',100.000,NULL,NULL,N''Dầu chiên gà, chưa có lượng dầu hấp thụ.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1053'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1053'',N''NL072'',N''DVT003'',400.000,NULL,NULL,N''Dầu chiên đậu hũ, chưa có lượng dầu hấp thụ.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1049'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1049'',N''NL028'',N''DVT005'',3.000,NULL,NULL,N''Trứng dùng áo đậu hũ, chưa xác định phần còn dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1051'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1051'',N''NL1051'',N''DVT001'',500.000,NULL,NULL,N''Bột chiên xù dùng áo, chưa xác định phần bám và phần dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1052'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1052'',N''NL301'',N''DVT001'',100.000,NULL,NULL,N''Bột mì dùng áo đậu hũ, chưa xác định phần bám và phần dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP972'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP972'',N''NL972'',N''DVT001'',600.000,NULL,NULL,N''Bột mì gồm phần làm mì và phần áo gà, chưa xác định tổng lượng ăn vào.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP973'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP973'',N''NL028'',N''DVT005'',3.000,NULL,NULL,N''Trứng dùng làm mì và áo gà, chưa tách phần dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP979'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP979'',N''NL146'',N''DVT006'',6.000,NULL,NULL,N''Bột dùng áo gà, chưa xác định phần bám và phần dư.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1170'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1170'',N''NL1156'',N''DVT001'',500.000,NULL,NULL,N''Xương nấu nước dùng, không áp hồ sơ chất béo cho toàn bộ xương.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1211'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1211'',N''NL232'',N''DVT001'',500.000,NULL,NULL,N''Xương nấu nước dùng, chưa có hồ sơ nước dùng tương ứng.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP23003'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP23003'',N''NL232'',N''DVT001'',100.000,NULL,NULL,N''Xương nấu phở, chưa có hồ sơ nước dùng tương ứng.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1169'')
 INSERT dbo.DinhDuongThanhPhanCheBien(MaThanhPhan,MaNguyenLieuDoiChieu,MaDonViDoiChieu,SoLuongDoiChieu,GramAnDuocMoiMe,NguonKhoiLuong,LyDo,NguonPhuongPhap) VALUES(N''TP1169'',N''NL027'',N''DVT002'',1.000,NULL,NULL,N''Cua đồng xay lọc bã, chưa có lượng thịt/gạch hòa vào nước dùng.'',N''https://www.fao.org/4/y4705e/y4705e23.htm'');
IF NOT EXISTS(SELECT 1 FROM dbo.DinhDuongThanhPhanCheBien WITH(UPDLOCK,HOLDLOCK) WHERE MaThanhPhan=N''TP1112'')
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
 EXEC(N'CREATE OR ALTER FUNCTION dbo.FnTinhThanhPhanDinhDuong
(@MaThanhPhan NVARCHAR(20),@MaNguyenLieu NVARCHAR(20),@SoLuong DECIMAL(24,8),
 @MaDonVi NVARCHAR(20),@Ngay DATE,@KhuVuc NVARCHAR(150),@DaTuyBien BIT)
RETURNS TABLE AS RETURN
SELECT
 CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.MaThongTin ELSE b.MaThongTin END AS MaThongTin,
 CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.KhoiLuongChuan ELSE b.KhoiLuongChuan END AS KhoiLuongChuan,
 CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.DonViDinhDuong ELSE b.DonViDinhDuong END AS DonViDinhDuong,
 b.MaGia,
 b.NgayApDung,
 b.DonViGia,
 b.GiaThamKhao,
 b.KhuVuc,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.HeSoDinhDuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.HeSoDinhDuong END AS HeSoDinhDuong,
 b.LuongTinhGia,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.NangLuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.NangLuong END AS NangLuong,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.ChatDam WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ChatDam END AS ChatDam,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.ChatBotDuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ChatBotDuong END AS ChatBotDuong,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.ChatBeo WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ChatBeo END AS ChatBeo,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.ChatXo WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ChatXo END AS ChatXo,
 CASE WHEN r.MaThanhPhan IS NULL THEN b.Natri WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.Natri END AS Natri,
 b.ChiPhi,
 CAST(CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ThieuDinhDuong ELSE b.ThieuDinhDuong END AS BIT) AS ThieuDinhDuong,
 CAST(CASE WHEN r.MaThanhPhan IS NULL THEN b.ThieuQuyDoiDinhDuong WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL THEN a.ThieuQuyDoiDinhDuong ELSE 0 END AS BIT) AS ThieuQuyDoiDinhDuong,
 b.ThieuGiaKhaDung,
 CAST(CASE WHEN r.MaThanhPhan IS NOT NULL AND (v.HopLe=0 OR r.GramAnDuocMoiMe IS NULL) THEN 1 ELSE 0 END AS BIT) AS ThieuLuongAnDuoc,
 CASE WHEN r.MaThanhPhan IS NOT NULL AND v.HopLe=0 THEN N''Công thức/đơn vị đã đổi; cần kiểm tra lại lượng ăn được.'' ELSE r.LyDo END AS LyDoLuongAnDuoc,
 COALESCE(r.NguonKhoiLuong,r.NguonPhuongPhap) AS NguonLuongAnDuoc
FROM dbo.FnTinhNguyenLieu(@MaNguyenLieu,@SoLuong,@MaDonVi,@Ngay,@KhuVuc) b
LEFT JOIN dbo.DinhDuongThanhPhanCheBien r ON r.MaThanhPhan=@MaThanhPhan
LEFT JOIN dbo.ThanhPhanCongThuc tp ON tp.MaThanhPhan=@MaThanhPhan
OUTER APPLY(SELECT CASE WHEN @DaTuyBien=0
 AND tp.MaNguyenLieu=r.MaNguyenLieuDoiChieu AND @MaNguyenLieu=r.MaNguyenLieuDoiChieu
 AND tp.MaDonVi=r.MaDonViDoiChieu AND @MaDonVi=r.MaDonViDoiChieu
 AND tp.SoLuong=r.SoLuongDoiChieu THEN 1 ELSE 0 END AS HopLe) v
OUTER APPLY(SELECT TRY_CONVERT(DECIMAL(24,8),
 CASE WHEN v.HopLe=1 AND r.GramAnDuocMoiMe IS NOT NULL
 THEN r.GramAnDuocMoiMe*@SoLuong/NULLIF(r.SoLuongDoiChieu,0) END) AS SoGram) g
OUTER APPLY(SELECT a.* FROM dbo.FnTinhNguyenLieu(r.MaNguyenLieuAnDuoc,g.SoGram,N''DVT001'',@Ngay,@KhuVuc) a
 WHERE g.SoGram IS NOT NULL) a;');
 EXEC(N'CREATE OR ALTER FUNCTION dbo.FnTinhMonAn
	(@MaMonAn NVARCHAR(20),@SoKhauPhan INT,@Ngay DATE,@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT n.*,t.* FROM dbo.FnNhuCauNguyenLieuMon(@MaMonAn,@SoKhauPhan) n
	 CROSS APPLY dbo.FnTinhThanhPhanDinhDuong(n.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc,0) t;');
 EXEC(N'CREATE OR ALTER FUNCTION dbo.FnTinhChiTietThucDon
	(@MaThucDon NVARCHAR(20),@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT ct.MaChiTiet,ct.MaMonAn,ct.NgayDung,ct.BuaAn,ct.SoKhauPhan,
	  c.MaCongThuc,c.SoKhauPhanChuan,tp.MaThanhPhan,
	  tp.MaNguyenLieu AS MaNguyenLieuGoc,n.MaNguyenLieu,n.MaDonVi,n.SoLuongCan,
	  CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT) DaTuyBien,
	  t.*
	 FROM dbo.ChiTietThucDon ct
	 LEFT JOIN dbo.CongThuc c ON c.MaMonAn=ct.MaMonAn
	 LEFT JOIN dbo.ThanhPhanCongThuc tp ON tp.MaCongThuc=c.MaCongThuc
	 LEFT JOIN dbo.TuyBienNguyenLieuThucDon tb ON tb.MaChiTiet=ct.MaChiTiet AND tb.MaThanhPhan=tp.MaThanhPhan
	 CROSS APPLY(SELECT COALESCE(tb.MaNguyenLieu,tp.MaNguyenLieu) MaNguyenLieu,
	   COALESCE(tb.MaDonVi,tp.MaDonVi) MaDonVi,
	   NULLIF(TRY_CONVERT(DECIMAL(24,8),CAST(COALESCE(tb.SoLuong,tp.SoLuong) AS DECIMAL(19,6))*ct.SoKhauPhan/NULLIF(c.SoKhauPhanChuan,0)),0) SoLuongCan) n
	 CROSS APPLY dbo.FnTinhThanhPhanDinhDuong(tp.MaThanhPhan,n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc,CAST(CASE WHEN tb.MaChiTiet IS NULL THEN 0 ELSE 1 END AS BIT)) t
	 WHERE ct.MaThucDon=@MaThucDon;');
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
SELECT m.MaMonAn,m.TenMonAn,f.MaThanhPhan,f.NangLuong,f.ChiPhi,f.ThieuLuongAnDuoc,f.LyDoLuongAnDuoc
FROM dbo.MonAn m CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS DATE),NULL) f
WHERE f.ThieuLuongAnDuoc=1;
GO
