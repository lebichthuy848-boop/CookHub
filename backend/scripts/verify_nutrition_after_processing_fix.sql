USE QuanLyThucDon;
GO
SET NOCOUNT ON;

IF OBJECT_ID(N'dbo.FnTinhThanhPhanDinhDuong',N'IF') IS NULL
 THROW 51800,N'Chạy fix_processing_nutrition.sql trước khi kiểm tra.',1;

-- Read only. Completeness of entered rows is NOT a source-validation verdict.
SELECT m.MaMonAn,m.TenMonAn,
 COUNT(f.MaThanhPhan) AS SoDongThanhPhan,
 SUM(CASE WHEN f.NangLuong IS NULL THEN 1 ELSE 0 END) AS SoDongChuaTinhKcal,
 SUM(CASE WHEN f.NangLuong IS NULL OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL
   OR f.ChatBeo IS NULL OR f.ChatXo IS NULL OR f.Natri IS NULL THEN 1 ELSE 0 END) AS SoDongChuaDu6ChiSo,
 SUM(CONVERT(INT,f.ThieuLuongAnDuoc)) AS SoDongChuaRoLuongAnVao,
 SUM(f.NangLuong) AS KcalPhanDaTinhMotKhauPhan,
 CASE WHEN COUNT(f.MaThanhPhan)>0 AND SUM(CASE WHEN f.NangLuong IS NULL
   OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL
   OR f.ChatXo IS NULL OR f.Natri IS NULL OR f.ThieuLuongAnDuoc=1
   THEN 1 ELSE 0 END)=0 THEN N'Đủ số trên các dòng đã nhập; chưa phải xác nhận đúng nguồn'
   ELSE N'Chưa đầy đủ' END AS TrangThai
FROM dbo.MonAn m
CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS DATE),NULL) f
GROUP BY m.MaMonAn,m.TenMonAn
ORDER BY SoDongChuaDu6ChiSo,SoDongChuaRoLuongAnVao,m.MaMonAn;
GO
