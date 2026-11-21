USE QuanLyThucDon;
GO
-- Strict review queue only; numbers do not certify sources or recipe completeness.
SELECT m.MaMonAn,m.TenMonAn,
 CASE WHEN m.MaMonAn IN (N'MA211',N'MA214',N'MA216',N'MA230',N'MA901',N'MA907',N'MA916',N'MA917',N'MA918',N'MA920',N'MA924',N'MA926',N'MA929',N'MA931',N'MA939',N'MA942',N'MA943',N'MA944',N'MA945',N'MA946',N'MA949',N'MA950') THEN N'Tam loai khoi demo dinh duong' ELSE N'Can doi chieu truoc khi chon' END TrangThai,
 SUM(CASE WHEN f.NangLuong IS NULL OR f.ChatDam IS NULL OR f.ChatBotDuong IS NULL OR f.ChatBeo IS NULL OR f.ChatXo IS NULL OR f.Natri IS NULL THEN 1 ELSE 0 END) SoDongChuaDu6,
 SUM(CASE WHEN f.ThieuLuongAnDuoc=1 THEN 1 ELSE 0 END) SoDongChuaRoLuongAn,
 SUM(CASE WHEN f.NangLuong IS NULL THEN 1 ELSE 0 END) SoDongChuaTinhKcal,
 CASE WHEN COUNT(f.NangLuong)=COUNT(*) THEN SUM(f.NangLuong) END KcalDayDuTheoCacDongDaNhap,
 SUM(f.NangLuong) KcalPhanDaTinh
FROM dbo.MonAn m CROSS APPLY dbo.FnTinhMonAn(m.MaMonAn,1,CAST(GETDATE() AS date),NULL) f
GROUP BY m.MaMonAn,m.TenMonAn
ORDER BY TrangThai,SoDongChuaDu6,m.MaMonAn;
GO
