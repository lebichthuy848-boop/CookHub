USE QuanLyThucDon;
GO
SET XACT_ABORT ON;
BEGIN TRY
 BEGIN TRANSACTION;
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
  THROW 51700,N'FnTinhMonAn differs from this patch; rollback stopped.',1;
 EXEC(N'CREATE OR ALTER FUNCTION dbo.FnTinhMonAn
	(@MaMonAn NVARCHAR(20),@SoKhauPhan INT,@Ngay DATE,@KhuVuc NVARCHAR(150))
	RETURNS TABLE
	AS RETURN
	 SELECT n.*,t.* FROM dbo.FnNhuCauNguyenLieuMon(@MaMonAn,@SoKhauPhan) n
	 CROSS APPLY dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,@Ngay,@KhuVuc) t;
');
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
  THROW 51700,N'FnTinhChiTietThucDon differs from this patch; rollback stopped.',1;
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
	 CROSS APPLY dbo.FnTinhNguyenLieu(n.MaNguyenLieu,n.SoLuongCan,n.MaDonVi,ct.NgayDung,@KhuVuc) t
	 WHERE ct.MaThucDon=@MaThucDon;
');
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO
