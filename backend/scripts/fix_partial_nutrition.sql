USE QuanLyThucDon;
GO

-- Fix conversion status independently of missing kcal.
-- Does not update ingredient quantities, conversions, or nutrient values.
CREATE OR ALTER FUNCTION dbo.FnTinhNguyenLieu
(@MaNguyenLieu NVARCHAR(20),@SoLuong DECIMAL(24,8),@MaDonVi NVARCHAR(20),@Ngay DATE,@KhuVuc NVARCHAR(150))
RETURNS TABLE
AS RETURN
 SELECT dd.MaThongTin,dd.KhoiLuongChuan,dd.MaDonVi AS DonViDinhDuong,
  gia.MaGia,gia.NgayApDung,gia.MaDonVi AS DonViGia,gia.GiaThamKhao,gia.KhuVuc,
  f.HeSoDinhDuong,gia.LuongTinhGia,
  raw.NangLuong,
  raw.ChatDam,
  raw.ChatBotDuong,
  raw.ChatBeo,
  raw.ChatXo,
  raw.natri,
  CASE WHEN raw.ChiPhi>0 OR @SoLuong=0 OR gia.GiaThamKhao=0 THEN raw.ChiPhi END ChiPhi,
  CAST(CASE WHEN dd.MaThongTin IS NULL THEN 1 ELSE 0 END AS BIT) ThieuDinhDuong,
  CAST(CASE WHEN dd.MaThongTin IS NOT NULL AND f.HeSoDinhDuong IS NULL THEN 1 ELSE 0 END AS BIT) ThieuQuyDoiDinhDuong,
  CAST(CASE WHEN gia.MaGia IS NULL OR raw.ChiPhi IS NULL OR (@SoLuong>0 AND gia.GiaThamKhao>0 AND raw.ChiPhi=0) THEN 1 ELSE 0 END AS BIT) ThieuGiaKhaDung
 FROM (VALUES(1)) anchor(n)
 LEFT JOIN dbo.ThongTinDinhDuong dd ON dd.MaNguyenLieu=@MaNguyenLieu
 -- Giới hạn precision hệ số trước khi nhân để SQL không tự giảm kết quả còn 6 số lẻ.
 OUTER APPLY(SELECT TRY_CONVERT(DECIMAL(28,12),dbo.FnQuyDoiSoLuong(@MaNguyenLieu,@SoLuong,@MaDonVi,dd.MaDonVi)/NULLIF(dd.KhoiLuongChuan,0)) HeSo) h
 OUTER APPLY(SELECT CASE WHEN h.HeSo>0 OR @SoLuong=0 THEN h.HeSo END HeSoDinhDuong) f
 OUTER APPLY (
  SELECT TOP(1) g.MaGia,g.MaDonVi,g.GiaThamKhao,g.NgayApDung,g.KhuVuc,q.LuongTinhGia
  FROM dbo.GiaNguyenLieu g
  CROSS APPLY(SELECT dbo.FnQuyDoiSoLuong(@MaNguyenLieu,@SoLuong,@MaDonVi,g.MaDonVi) LuongTinhGia) q
  WHERE g.MaNguyenLieu=@MaNguyenLieu AND g.NgayApDung<=@Ngay
   AND (g.KhuVuc=@KhuVuc OR (g.KhuVuc IS NULL AND @KhuVuc IS NULL)) AND q.LuongTinhGia IS NOT NULL
  ORDER BY g.NgayApDung DESC,CASE WHEN g.MaDonVi=@MaDonVi THEN 0 ELSE 1 END,g.MaGia
 ) gia
 CROSS APPLY(SELECT TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.NangLuong) NangLuong,
  TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.ChatDam) ChatDam,
  TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.ChatBotDuong) ChatBotDuong,
  TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.ChatBeo) ChatBeo,
  TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.ChatXo) ChatXo,
  TRY_CONVERT(DECIMAL(28,8),f.HeSoDinhDuong*dd.natri) natri,
  TRY_CONVERT(DECIMAL(28,8),gia.LuongTinhGia*gia.GiaThamKhao) ChiPhi) raw
 CROSS APPLY(SELECT CASE WHEN raw.NangLuong IS NULL OR (@SoLuong>0 AND dd.NangLuong>0 AND raw.NangLuong=0) OR
  raw.ChatDam IS NULL OR (@SoLuong>0 AND dd.ChatDam>0 AND raw.ChatDam=0) OR
  raw.ChatBotDuong IS NULL OR (@SoLuong>0 AND dd.ChatBotDuong>0 AND raw.ChatBotDuong=0) OR
  raw.ChatBeo IS NULL OR (@SoLuong>0 AND dd.ChatBeo>0 AND raw.ChatBeo=0) OR
  raw.ChatXo IS NULL OR (@SoLuong>0 AND dd.ChatXo>0 AND raw.ChatXo=0) OR
  raw.natri IS NULL OR (@SoLuong>0 AND dd.natri>0 AND raw.natri=0)
  THEN 1 ELSE 0 END ThieuPhepTinh) v;
GO


-- Inspect one serving of the first ten dishes after applying the function.
SELECT m.MaMonAn, m.TenMonAn, f.MaNguyenLieu, f.MaThanhPhan,
       f.SoLuongCan, f.HeSoDinhDuong, f.NangLuong, f.ChatDam,
       f.ChatBotDuong, f.ChatBeo, f.ChatXo, f.Natri,
       f.ThieuDinhDuong, f.ThieuQuyDoiDinhDuong
FROM (SELECT TOP (10) MaMonAn, TenMonAn FROM dbo.MonAn ORDER BY MaMonAn) m
CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn, 1, CAST(GETDATE() AS DATE), NULL) f
ORDER BY m.MaMonAn, f.MaThanhPhan;
GO

