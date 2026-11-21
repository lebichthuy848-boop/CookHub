USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- USDA SR28: values per 100 g edible portion. Generic reference, not lab analysis.
-- Source: https://www.ars.usda.gov/ARSUserFiles/80400535/DATA/SR/sr28/dnload/sr28asc.zip
-- Raw plain lemongrass; unsweetened dried jujube / dried longan.
-- Water: correct kcal only; preserve sodium. Missing USDA fiber stays NULL.
-- Do not use these profiles for sweetened fruit or lemongrass mixed with oil.
BEGIN TRY
 BEGIN TRANSACTION;

 -- NL918 Sả băm / USDA NDB 11972
 -- Lemon grass (citronella), raw
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL918') <> 1
  THROW 51300,N'Unexpected profile count for NL918; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD918' AND d.MaNguyenLieu=N'NL918'
   AND n.TenNguyenLieu=N'Sả băm' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=1.00 AND d.ChatDam=0.80 AND d.ChatBotDuong=16.50 AND d.ChatBeo=1.00 AND d.ChatXo=0.00 AND d.natri=7.00)
    OR (d.NangLuong=99.0 AND d.ChatDam=1.82 AND d.ChatBotDuong=25.31 AND d.ChatBeo=0.49 AND d.ChatXo IS NULL AND d.natri=6.0)
   )
 )
  THROW 51400,N'Profile differs from reviewed data for NL918; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=99.0, ChatDam=1.82, ChatBotDuong=25.31, ChatBeo=0.49, ChatXo=NULL, natri=6.0
 WHERE MaThongTin=N'DD918' AND MaNguyenLieu=N'NL918';

 -- NL1118 Sả xay / USDA NDB 11972
 -- Lemon grass (citronella), raw
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL1118') <> 1
  THROW 51301,N'Unexpected profile count for NL1118; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD044' AND d.MaNguyenLieu=N'NL1118'
   AND n.TenNguyenLieu=N'Sả xay' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=1.00 AND d.ChatDam=0.80 AND d.ChatBotDuong=16.50 AND d.ChatBeo=1.00 AND d.ChatXo=0.00 AND d.natri=7.00)
    OR (d.NangLuong=99.0 AND d.ChatDam=1.82 AND d.ChatBotDuong=25.31 AND d.ChatBeo=0.49 AND d.ChatXo IS NULL AND d.natri=6.0)
   )
 )
  THROW 51401,N'Profile differs from reviewed data for NL1118; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=99.0, ChatDam=1.82, ChatBotDuong=25.31, ChatBeo=0.49, ChatXo=NULL, natri=6.0
 WHERE MaThongTin=N'DD044' AND MaNguyenLieu=N'NL1118';

 -- NL117 Táo tàu / USDA NDB 09147
 -- Jujube, Chinese, fresh, dried
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL117') <> 1
  THROW 51302,N'Unexpected profile count for NL117; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD101' AND d.MaNguyenLieu=N'NL117'
   AND n.TenNguyenLieu=N'Táo tàu' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=50.00 AND d.ChatDam=0.50 AND d.ChatBotDuong=11.70 AND d.ChatBeo=0.00 AND d.ChatXo=0.60 AND d.natri=15.20)
    OR (d.NangLuong=281.0 AND d.ChatDam=4.72 AND d.ChatBotDuong=72.52 AND d.ChatBeo=0.5 AND d.ChatXo=6.0 AND d.natri=5.0)
   )
 )
  THROW 51402,N'Profile differs from reviewed data for NL117; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=281.0, ChatDam=4.72, ChatBotDuong=72.52, ChatBeo=0.5, ChatXo=6.0, natri=5.0
 WHERE MaThongTin=N'DD101' AND MaNguyenLieu=N'NL117';

 -- NL122 Nhãn nhục / USDA NDB 09173
 -- Longans, dried
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL122') <> 1
  THROW 51303,N'Unexpected profile count for NL122; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD112' AND d.MaNguyenLieu=N'NL122'
   AND n.TenNguyenLieu=N'Nhãn nhục' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=52.00 AND d.ChatDam=0.90 AND d.ChatBotDuong=12.00 AND d.ChatBeo=0.00 AND d.ChatXo=1.00 AND d.natri=25.50)
    OR (d.NangLuong=286.0 AND d.ChatDam=4.9 AND d.ChatBotDuong=74.0 AND d.ChatBeo=0.4 AND d.ChatXo IS NULL AND d.natri=48.0)
   )
 )
  THROW 51403,N'Profile differs from reviewed data for NL122; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=286.0, ChatDam=4.9, ChatBotDuong=74.0, ChatBeo=0.4, ChatXo=NULL, natri=48.0
 WHERE MaThongTin=N'DD112' AND MaNguyenLieu=N'NL122';

 -- NL080 Nước lọc / USDA NDB 14555
 -- Water, bottled, generic
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL080') <> 1
  THROW 51304,N'Unexpected profile count for NL080; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD080' AND d.MaNguyenLieu=N'NL080'
   AND n.TenNguyenLieu=N'Nước lọc' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=1.00)
    OR (d.NangLuong=0.0)
   )
 )
  THROW 51404,N'Profile differs from reviewed data for NL080; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=0.0
 WHERE MaThongTin=N'DD080' AND MaNguyenLieu=N'NL080';

 -- NL183 Nước / USDA NDB 14555
 -- Water, bottled, generic
 IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong WITH(UPDLOCK,HOLDLOCK) WHERE MaNguyenLieu=N'NL183') <> 1
  THROW 51305,N'Unexpected profile count for NL183; no updates committed.',1;
 IF NOT EXISTS (
  SELECT 1 FROM dbo.ThongTinDinhDuong d WITH(UPDLOCK,HOLDLOCK)
  JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
  JOIN dbo.DonViTinh u ON u.MaDonVi=d.MaDonVi
  WHERE d.MaThongTin=N'DD183' AND d.MaNguyenLieu=N'NL183'
   AND n.TenNguyenLieu=N'Nước' AND d.KhoiLuongChuan=100 AND u.KyHieu=N'g'
   AND (
    (d.NangLuong=1.00)
    OR (d.NangLuong=0.0)
   )
 )
  THROW 51405,N'Profile differs from reviewed data for NL183; no updates committed.',1;
 UPDATE dbo.ThongTinDinhDuong
 SET NangLuong=0.0
 WHERE MaThongTin=N'DD183' AND MaNguyenLieu=N'NL183';
 COMMIT TRANSACTION;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;

SELECT n.TenNguyenLieu,d.* FROM dbo.ThongTinDinhDuong d
JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=d.MaNguyenLieu
WHERE d.MaNguyenLieu IN(N'NL918',N'NL1118',N'NL117',N'NL122',N'NL080',N'NL183');
GO
