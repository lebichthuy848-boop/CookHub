-- Upgrade an already merged database. Run only after Merge-65-mon.sql.
-- Keep MA230 (Phở bò) from the current branch and remove MA001 (Phở bò viên) from the old branch.
USE QuanLyThucDon;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;

IF EXISTS (SELECT 1 FROM dbo.MonAn WHERE MaMonAn=N'MA001' AND TenMonAn=N'Phở bò viên')
   AND EXISTS (SELECT 1 FROM dbo.MonAn WHERE MaMonAn=N'MA230' AND TenMonAn=N'Phở bò')
BEGIN
    IF EXISTS (SELECT 1 FROM dbo.ChiTietThucDon WHERE MaMonAn=N'MA001')
       OR EXISTS (SELECT 1 FROM dbo.DanhGiaMonAn WHERE MaMonAn=N'MA001')
       OR EXISTS (SELECT 1 FROM dbo.MonYeuThich WHERE MaMonAn=N'MA001')
       OR EXISTS (SELECT 1 FROM dbo.MonKhongThich WHERE MaMonAn=N'MA001')
       OR EXISTS (SELECT 1 FROM dbo.PhanHoiCheBien WHERE MaCongThuc IN (SELECT MaCongThuc FROM dbo.CongThuc WHERE MaMonAn=N'MA001'))
    BEGIN
        ROLLBACK TRANSACTION;
        THROW 51003, N'Phở bò viên đang có dữ liệu người dùng; chưa thể xóa tự động.', 1;
    END;

    UPDATE dbo.CongThuc SET DaCongBo=0 WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.BuocCheBien WHERE MaCongThuc IN (SELECT MaCongThuc FROM dbo.CongThuc WHERE MaMonAn=N'MA001');
    DELETE FROM dbo.ThanhPhanCongThuc WHERE MaCongThuc IN (SELECT MaCongThuc FROM dbo.CongThuc WHERE MaMonAn=N'MA001');
    DELETE FROM dbo.DoanPhimHuongDan WHERE MaCongThuc IN (SELECT MaCongThuc FROM dbo.CongThuc WHERE MaMonAn=N'MA001');
    DELETE FROM dbo.CongThuc WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.CheDoAnMonAn WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.KhauViMonAn WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.MonAnNhan WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.ThongTinDinhDuongMonAn WHERE MaMonAn=N'MA001';
    DELETE FROM dbo.MonAn WHERE MaMonAn=N'MA001';
END;

COMMIT TRANSACTION;
GO
