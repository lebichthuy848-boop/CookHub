USE QuanLyThucDon;
GO

-- Chạy một lần khi nâng cấp database cũ sang cơ chế đăng đánh giá ngay.
UPDATE dbo.DanhGiaMonAn
SET TrangThaiKiemDuyet = N'Đã duyệt',
    MaNguoiKiemDuyet = NULL,
    NgayKiemDuyet = NULL,
    GhiChuKiemDuyet = NULL
WHERE TrangThaiKiemDuyet = N'Chờ duyệt';
GO

DECLARE @constraint_name sysname;
DECLARE @drop_sql nvarchar(max);
SELECT @constraint_name = dc.name
FROM sys.default_constraints AS dc
JOIN sys.columns AS c ON c.object_id = dc.parent_object_id AND c.column_id = dc.parent_column_id
WHERE dc.parent_object_id = OBJECT_ID(N'dbo.DanhGiaMonAn') AND c.name = N'TrangThaiKiemDuyet';
IF @constraint_name IS NOT NULL
BEGIN
    SET @drop_sql = N'ALTER TABLE dbo.DanhGiaMonAn DROP CONSTRAINT ' + QUOTENAME(@constraint_name);
    EXEC sp_executesql @drop_sql;
END;
ALTER TABLE dbo.DanhGiaMonAn
ADD CONSTRAINT DF_DanhGiaMonAn_TrangThaiKiemDuyet DEFAULT N'Đã duyệt' FOR TrangThaiKiemDuyet;
GO
