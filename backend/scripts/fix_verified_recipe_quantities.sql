USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Reviewed against the DB snapshot and the exact source URLs below.
-- Updates recipe quantities only. Does not fill NULL nutrients, alter conversion
-- factors, change standard servings, or estimate absorbed frying oil.
-- Execute this file alone, not the complete QuanLyThucDon.sql seed file.
DECLARE @P TABLE (
 MaThanhPhan NVARCHAR(20) PRIMARY KEY, MaCongThuc NVARCHAR(20),
 NguyenLieuCu NVARCHAR(20), DonViCu NVARCHAR(20), SoLuongCu DECIMAL(12,3),
 NguyenLieuMoi NVARCHAR(20), DonViMoi NVARCHAR(20), SoLuongMoi DECIMAL(12,3),
 Nguon NVARCHAR(1000), LyDo NVARCHAR(1000)
);
INSERT @P VALUES
(N'TP10503',N'CT105',N'NL125',N'DVT023',50.000,N'NL125',N'DVT001',50,N'https://www.dienmayxanh.com/vao-bep/cach-lam-kho-qua-nhoi-thit-am-nong-ngay-tet-00537',N'Nấm mèo: nguồn ghi 50 g, DB đang ghi 50 tai.'),
(N'TP20302',N'CT203',N'NL028',N'DVT005',6.000,N'NL154',N'DVT005',6,N'https://www.dienmayxanh.com/vao-bep/cach-lam-creme-brulee-kem-chay-thom-ngon-chuan-phap-cuc-de-01964',N'Bước đánh trứng chỉ lấy 6 lòng đỏ; không tính cả 6 quả.'),
(N'TP20608',N'CT206',N'NL067',N'DVT015',2.000,N'NL067',N'DVT003',390,N'https://www.dienmayxanh.com/vao-bep/cach-lam-banh-bao-nhan-thit-mien-thom-ngon-de-lam-05203',N'50 ml kích hoạt men + 340 ml trộn bột = 390 ml; không quy ước gói chung.'),
(N'TP20605',N'CT206',N'NL097',N'DVT014',1.000,N'NL097',N'DVT006',1.5,N'https://www.dienmayxanh.com/vao-bep/cach-lam-banh-bao-nhan-thit-mien-thom-ngon-de-lam-05203',N'Bước làm nhân: 1,5 muỗng canh hạt nêm.'),
(N'TP20698',N'CT206',N'NL240',N'DVT014',1.000,N'NL240',N'DVT007',2,N'https://www.dienmayxanh.com/vao-bep/cach-lam-banh-bao-nhan-thit-mien-thom-ngon-de-lam-05203',N'Bước làm nhân: 2 muỗng cà phê tiêu.'),
(N'TP93307',N'CT933',N'NL1128',N'DVT006',1.000,N'NL1128',N'DVT007',1,N'https://www.dienmayxanh.com/vao-bep/cach-lam-com-than-bo-rong-bien-sot-tuong-don-gian-01392',N'Danh sách nguyên liệu và bước ướp bò ghi 1 muỗng cà phê tiêu.'),
(N'TP10605',N'CT106',NULL,NULL,NULL,N'NL034',N'DVT001',50,N'https://www.dienmayxanh.com/vao-bep/cach-lam-sup-hai-san-tuyet-yen-bo-duong-don-gian-ngay-tai-nha-16679',N'Danh sách nguồn có 50 g nấm đông cô/nấm hương tươi; DB đang thiếu dòng này.');

DECLARE @Truoc TABLE (
 MaThanhPhan NVARCHAR(20) PRIMARY KEY,
 MaNguyenLieu NVARCHAR(20), MaDonVi NVARCHAR(20), SoLuong DECIMAL(12,3)
);

BEGIN TRY
 BEGIN TRANSACTION;

 -- Fail if the live row changed since the snapshot, unless already corrected.
 IF EXISTS (
  SELECT 1 FROM @P p
  LEFT JOIN dbo.ThanhPhanCongThuc t WITH(UPDLOCK,HOLDLOCK)
   ON t.MaThanhPhan=p.MaThanhPhan
  WHERE p.NguyenLieuCu IS NOT NULL AND (
   t.MaThanhPhan IS NULL OR t.MaCongThuc<>p.MaCongThuc OR
   NOT (
    (t.MaNguyenLieu=p.NguyenLieuCu AND t.MaDonVi=p.DonViCu AND t.SoLuong=p.SoLuongCu)
    OR
    (t.MaNguyenLieu=p.NguyenLieuMoi AND t.MaDonVi=p.DonViMoi AND t.SoLuong=p.SoLuongMoi)
   )
  )
 )
  THROW 51101,N'Dữ liệu đã thay đổi so với bản kiểm tra. Chưa cập nhật.',1;

 IF EXISTS (
  SELECT 1 FROM @P p
  LEFT JOIN dbo.CongThuc c ON c.MaCongThuc=p.MaCongThuc
  LEFT JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=p.NguyenLieuMoi
  LEFT JOIN dbo.DonViTinh d ON d.MaDonVi=p.DonViMoi
  WHERE c.MaCongThuc IS NULL OR n.MaNguyenLieu IS NULL OR d.MaDonVi IS NULL
 )
  THROW 51102,N'Thiếu công thức, nguyên liệu hoặc đơn vị đích.',1;

 -- Verify the unit codes have the same meaning as in the snapshot.
 IF NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT001' AND KyHieu=N'g')
 OR NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT003' AND KyHieu=N'ml')
 OR NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT005' AND KyHieu=N'quả')
 OR NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT006' AND KyHieu=N'muỗng canh')
 OR NOT EXISTS(SELECT 1 FROM dbo.DonViTinh WHERE MaDonVi=N'DVT007' AND KyHieu=N'muỗng cà phê')
  THROW 51103,N'Mã đơn vị không đúng ý nghĩa đã kiểm tra.',1;

 IF NOT EXISTS(SELECT 1 FROM dbo.NguyenLieu
   WHERE MaNguyenLieu=N'NL154' AND TenNguyenLieu=N'Lòng đỏ trứng gà')
 OR NOT EXISTS(SELECT 1 FROM dbo.NguyenLieu
   WHERE MaNguyenLieu=N'NL034' AND TenNguyenLieu=N'Nấm hương')
  THROW 51104,N'Mã nguyên liệu đích không đúng tên đã kiểm tra.',1;

 -- Prevent the unique recipe/ingredient constraint from being violated.
 IF EXISTS (
  SELECT 1 FROM @P p
  JOIN dbo.ThanhPhanCongThuc t WITH(UPDLOCK,HOLDLOCK)
   ON t.MaCongThuc=p.MaCongThuc AND t.MaNguyenLieu=p.NguyenLieuMoi
   AND t.MaThanhPhan<>p.MaThanhPhan
 )
  THROW 51105,N'Nguyên liệu đã có ở dòng khác trong công thức. Cần đối chiếu lại.',1;

 -- A reserved insert ID must be unused or already contain the exact correction.
 IF EXISTS (
  SELECT 1 FROM @P p
  JOIN dbo.ThanhPhanCongThuc t WITH(UPDLOCK,HOLDLOCK)
   ON t.MaThanhPhan=p.MaThanhPhan
  WHERE p.NguyenLieuCu IS NULL AND (
   t.MaCongThuc<>p.MaCongThuc OR t.MaNguyenLieu<>p.NguyenLieuMoi
   OR t.MaDonVi<>p.DonViMoi OR t.SoLuong<>p.SoLuongMoi
  )
 )
  THROW 51106,N'Mã thành phần mới đã được dùng cho dữ liệu khác.',1;

 INSERT @Truoc
 SELECT t.MaThanhPhan,t.MaNguyenLieu,t.MaDonVi,t.SoLuong
 FROM dbo.ThanhPhanCongThuc t JOIN @P p ON p.MaThanhPhan=t.MaThanhPhan;

 UPDATE t SET MaNguyenLieu=p.NguyenLieuMoi,MaDonVi=p.DonViMoi,SoLuong=p.SoLuongMoi
 FROM dbo.ThanhPhanCongThuc t JOIN @P p ON p.MaThanhPhan=t.MaThanhPhan
 WHERE p.NguyenLieuCu IS NOT NULL
   AND (t.MaNguyenLieu<>p.NguyenLieuMoi OR t.MaDonVi<>p.DonViMoi OR t.SoLuong<>p.SoLuongMoi);

 INSERT dbo.ThanhPhanCongThuc(MaThanhPhan,MaCongThuc,MaNguyenLieu,MaDonVi,SoLuong)
 SELECT p.MaThanhPhan,p.MaCongThuc,p.NguyenLieuMoi,p.DonViMoi,p.SoLuongMoi
 FROM @P p
 WHERE p.NguyenLieuCu IS NULL
 AND NOT EXISTS(SELECT 1 FROM dbo.ThanhPhanCongThuc t WITH(UPDLOCK,HOLDLOCK)
                WHERE t.MaThanhPhan=p.MaThanhPhan);

 COMMIT TRANSACTION;

 SELECT p.MaCongThuc,p.MaThanhPhan,n.TenNguyenLieu,
        b.MaNguyenLieu AS NguyenLieuTruoc,b.MaDonVi AS DonViTruoc,b.SoLuong AS SoLuongTruoc,
        t.MaDonVi AS DonViSau,d.TenDonVi,t.SoLuong AS SoLuongSau,p.LyDo,p.Nguon
 FROM @P p
 JOIN dbo.ThanhPhanCongThuc t ON t.MaThanhPhan=p.MaThanhPhan
 JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=t.MaNguyenLieu
 JOIN dbo.DonViTinh d ON d.MaDonVi=t.MaDonVi
 LEFT JOIN @Truoc b ON b.MaThanhPhan=p.MaThanhPhan
 ORDER BY p.MaCongThuc,p.MaThanhPhan;
END TRY
BEGIN CATCH
 IF @@TRANCOUNT>0 ROLLBACK TRANSACTION;
 THROW;
END CATCH;
GO

