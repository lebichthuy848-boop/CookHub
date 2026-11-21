USE QuanLyThucDon;
GO
SET NOCOUNT ON;

-- Read-only ingredient contributions for ONE standard serving.
-- NULL sodium stays NULL; SUM is the subtotal of known contributions.
SELECT m.MaMonAn,m.TenMonAn,f.MaThanhPhan,n.TenNguyenLieu,
 tp.SoLuong AS SoLuongCaMe,c.SoKhauPhanChuan,
 f.SoLuongCan AS SoLuongMotPhan,u.KyHieu AS DonViCongThuc,
 dd.Natri AS NatriTrenCoSo,dd.KhoiLuongChuan,du.KyHieu AS DonViCoSo,
 f.HeSoDinhDuong,f.Natri AS NatriMotPhanMg,
 SUM(f.Natri) OVER(PARTITION BY m.MaMonAn) AS NatriDaTinhCuaMonMg,
 SUM(CASE WHEN f.Natri IS NULL THEN 1 ELSE 0 END) OVER(PARTITION BY m.MaMonAn) AS SoDongChuaTinhNatri
FROM dbo.MonAn m
CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS DATE),NULL) f
JOIN dbo.ThanhPhanCongThuc tp ON tp.MaThanhPhan=f.MaThanhPhan
JOIN dbo.CongThuc c ON c.MaCongThuc=tp.MaCongThuc
JOIN dbo.NguyenLieu n ON n.MaNguyenLieu=f.MaNguyenLieu
LEFT JOIN dbo.DonViTinh u ON u.MaDonVi=f.MaDonVi
LEFT JOIN dbo.ThongTinDinhDuong dd ON dd.MaNguyenLieu=f.MaNguyenLieu
LEFT JOIN dbo.DonViTinh du ON du.MaDonVi=dd.MaDonVi
ORDER BY m.MaMonAn,f.Natri DESC;

-- These generic seasoning profiles need exact product/source matching.
SELECT n.MaNguyenLieu,n.TenNguyenLieu,dd.KhoiLuongChuan,u.KyHieu,dd.Natri,
 q.KhoiLuongQuyDoiGram,qu.KyHieu AS DonViQuyDoi
FROM dbo.NguyenLieu n
LEFT JOIN dbo.ThongTinDinhDuong dd ON dd.MaNguyenLieu=n.MaNguyenLieu
LEFT JOIN dbo.DonViTinh u ON u.MaDonVi=dd.MaDonVi
LEFT JOIN dbo.QuyDoiDonViNguyenLieu q ON q.MaNguyenLieu=n.MaNguyenLieu
LEFT JOIN dbo.DonViTinh qu ON qu.MaDonVi=q.MaDonVi
WHERE n.MaNguyenLieu IN(N'NL073',N'NL097',N'NL070',N'NL071',N'NL312')
ORDER BY n.MaNguyenLieu,q.MaDonVi;
GO
