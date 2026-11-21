USE QuanLyThucDon;
GO
SET NOCOUNT ON;

-- Read-only audit. Temporary tables do not alter application data.
DROP TABLE IF EXISTS #DemoAudit;
DROP TABLE IF EXISTS #DemoCandidates;

SELECT m.MaMonAn, m.TenMonAn, ct.MaCongThuc, ct.SoKhauPhanChuan,
       a.SoNguyenLieu, a.SoDongThieu,
       a.ThieuKcal, a.ThieuDam, a.ThieuCarbs,
       a.ThieuBeo, a.ThieuXo, a.ThieuNatri,
       CAST(CASE WHEN EXISTS (
           SELECT 1 FROM dbo.BuocCheBien b
           WHERE b.MaCongThuc=ct.MaCongThuc
       ) THEN 1 ELSE 0 END AS INT) AS CoBuocCheBien
INTO #DemoAudit
FROM dbo.MonAn m
LEFT JOIN dbo.CongThuc ct ON ct.MaMonAn=m.MaMonAn
OUTER APPLY (
    SELECT COUNT(*) AS SoNguyenLieu,
           COALESCE(SUM(CASE WHEN f.HeSoDinhDuong IS NULL
                 OR f.NangLuong IS NULL OR f.ChatDam IS NULL
                 OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL
                 OR f.ChatXo IS NULL OR f.Natri IS NULL THEN 1 ELSE 0 END),0) AS SoDongThieu,
           COALESCE(SUM(CASE WHEN f.NangLuong IS NULL THEN 1 ELSE 0 END),0) AS ThieuKcal,
           COALESCE(SUM(CASE WHEN f.ChatDam IS NULL THEN 1 ELSE 0 END),0) AS ThieuDam,
           COALESCE(SUM(CASE WHEN f.ChatBotDuong IS NULL THEN 1 ELSE 0 END),0) AS ThieuCarbs,
           COALESCE(SUM(CASE WHEN f.ChatBeo IS NULL THEN 1 ELSE 0 END),0) AS ThieuBeo,
           COALESCE(SUM(CASE WHEN f.ChatXo IS NULL THEN 1 ELSE 0 END),0) AS ThieuXo,
           COALESCE(SUM(CASE WHEN f.Natri IS NULL THEN 1 ELSE 0 END),0) AS ThieuNatri
    FROM dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS DATE),NULL) f
) a;

-- Result 1: data completeness only, NOT verification of nutrition sources.
SELECT *,
       CASE WHEN SoKhauPhanChuan>0 AND SoNguyenLieu>0
                 AND SoDongThieu=0 AND CoBuocCheBien=1
            THEN N'Du cot du lieu - can doi chieu nguon'
            ELSE N'Con thieu du lieu'
       END AS TrangThai
FROM #DemoAudit
ORDER BY CASE WHEN SoKhauPhanChuan>0 AND SoNguyenLieu>0
                   AND CoBuocCheBien=1 THEN 0 ELSE 1 END,
         SoDongThieu, MaMonAn;

-- Inspect up to 20 recipes with the most complete data first.
-- This is a review queue, not a list approved for demo.
SELECT TOP (20) *
INTO #DemoCandidates
FROM #DemoAudit
WHERE SoKhauPhanChuan>0 AND SoNguyenLieu>0 AND CoBuocCheBien=1
ORDER BY SoDongThieu, MaMonAn;

-- Result 2: actual ingredient data and current conversion factors.
SELECT c.MaMonAn,c.TenMonAn,c.SoKhauPhanChuan,
       tp.MaThanhPhan,tp.MaNguyenLieu,nl.TenNguyenLieu,
       tp.SoLuong,tp.MaDonVi,dv.TenDonVi,dv.HeSoGramChuan,
       q.KhoiLuongQuyDoiGram,
       dd.KhoiLuongChuan,dd.MaDonVi AS DonViDinhDuong,
       dd.NangLuong,dd.ChatDam,dd.ChatBotDuong,dd.ChatBeo,dd.ChatXo,dd.Natri
FROM #DemoCandidates c
JOIN dbo.ThanhPhanCongThuc tp ON tp.MaCongThuc=c.MaCongThuc
LEFT JOIN dbo.NguyenLieu nl ON nl.MaNguyenLieu=tp.MaNguyenLieu
LEFT JOIN dbo.DonViTinh dv ON dv.MaDonVi=tp.MaDonVi
LEFT JOIN dbo.QuyDoiDonViNguyenLieu q
       ON q.MaNguyenLieu=tp.MaNguyenLieu AND q.MaDonVi=tp.MaDonVi
LEFT JOIN dbo.ThongTinDinhDuong dd ON dd.MaNguyenLieu=tp.MaNguyenLieu
ORDER BY c.MaMonAn,tp.MaThanhPhan;

-- Result 3: recipe description/source and cooking steps.
SELECT c.MaMonAn,c.TenMonAn,m.MoTa AS MoTaMon,
       b.ThuTu,b.NoiDung
FROM #DemoCandidates c
JOIN dbo.MonAn m ON m.MaMonAn=c.MaMonAn
JOIN dbo.BuocCheBien b ON b.MaCongThuc=c.MaCongThuc
ORDER BY c.MaMonAn,b.ThuTu;

DROP TABLE #DemoCandidates;
DROP TABLE #DemoAudit;
GO
