USE QuanLyThucDon;
GO

-- =====================================================
-- BẢNG 1: BỘ SƯU TẬP YÊU THÍCH
-- =====================================================

IF OBJECT_ID(N'dbo.BoSuuTapYeuThich', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.BoSuuTapYeuThich
    (
        MaBoSuuTap NVARCHAR(20) NOT NULL,
        MaNguoiDung NVARCHAR(20) NOT NULL,
        TenBoSuuTap NVARCHAR(100) NOT NULL,
        MoTa NVARCHAR(500) NULL,

        LaRiengTu BIT NOT NULL
            CONSTRAINT DF_BST_LaRiengTu DEFAULT (1),

        NgayTao DATETIME2(3) NOT NULL
            CONSTRAINT DF_BST_NgayTao DEFAULT (SYSDATETIME()),

        NgayCapNhat DATETIME2(3) NOT NULL
            CONSTRAINT DF_BST_NgayCapNhat DEFAULT (SYSDATETIME()),

        CONSTRAINT PK_BoSuuTapYeuThich
            PRIMARY KEY (MaBoSuuTap),

        CONSTRAINT UQ_BST_MaVaChuSoHuu
            UNIQUE (MaBoSuuTap, MaNguoiDung),

        CONSTRAINT UQ_BST_NguoiDung_Ten
            UNIQUE (MaNguoiDung, TenBoSuuTap),

        CONSTRAINT CK_BST_TenKhongRong
            CHECK (LEN(LTRIM(RTRIM(TenBoSuuTap))) > 0),

        CONSTRAINT FK_BST_NguoiDung
            FOREIGN KEY (MaNguoiDung)
            REFERENCES dbo.NguoiDung(MaNguoiDung)
    );

    CREATE INDEX IX_BST_NguoiDung_NgayTao
    ON dbo.BoSuuTapYeuThich(MaNguoiDung, NgayTao DESC);
END;
GO

-- =====================================================
-- BẢNG 2: CHI TIẾT BỘ SƯU TẬP
-- =====================================================

IF OBJECT_ID(N'dbo.ChiTietBoSuuTapYeuThich', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ChiTietBoSuuTapYeuThich
    (
        MaChiTietBoSuuTap NVARCHAR(20) NOT NULL,
        MaBoSuuTap NVARCHAR(20) NOT NULL,
        MaNguoiDung NVARCHAR(20) NOT NULL,
        MaMonAn NVARCHAR(20) NOT NULL,

        NgayThem DATETIME2(3) NOT NULL
            CONSTRAINT DF_CTBST_NgayThem
            DEFAULT (SYSDATETIME()),

        CONSTRAINT PK_ChiTietBoSuuTapYeuThich
            PRIMARY KEY (MaChiTietBoSuuTap),

        CONSTRAINT UQ_CTBST_BoSuuTap_MonAn
            UNIQUE (MaBoSuuTap, MaMonAn),

        CONSTRAINT FK_CTBST_BoSuuTap
            FOREIGN KEY (MaBoSuuTap, MaNguoiDung)
            REFERENCES dbo.BoSuuTapYeuThich
                (MaBoSuuTap, MaNguoiDung)
            ON DELETE CASCADE,

        CONSTRAINT FK_CTBST_MonYeuThich
            FOREIGN KEY (MaNguoiDung, MaMonAn)
            REFERENCES dbo.MonYeuThich
                (MaNguoiDung, MaMonAn)
            ON DELETE CASCADE
    );

    CREATE INDEX IX_CTBST_ThuTuThem
    ON dbo.ChiTietBoSuuTapYeuThich
        (MaBoSuuTap, NgayThem, MaChiTietBoSuuTap);

    CREATE INDEX IX_CTBST_NguoiDung_MonAn
    ON dbo.ChiTietBoSuuTapYeuThich
        (MaNguoiDung, MaMonAn);
END;
GO

-- =====================================================
-- ĐĂNG KÝ 2 LOẠI MÃ MỚI
-- BST001, BST002...
-- CTBST001, CTBST002...
-- =====================================================

IF NOT EXISTS (
    SELECT 1
    FROM dbo.QuyUocMaHeThong
    WHERE LoaiMa = N'BoSuuTapYeuThich'
)
BEGIN
    INSERT INTO dbo.QuyUocMaHeThong
        (LoaiMa, TenBang, TenCot, TienTo, SoHienTai)
    VALUES
        (
            N'BoSuuTapYeuThich',
            N'BoSuuTapYeuThich',
            N'MaBoSuuTap',
            N'BST',
            0
        );
END;

IF NOT EXISTS (
    SELECT 1
    FROM dbo.QuyUocMaHeThong
    WHERE LoaiMa = N'ChiTietBoSuuTapYeuThich'
)
BEGIN
    INSERT INTO dbo.QuyUocMaHeThong
        (LoaiMa, TenBang, TenCot, TienTo, SoHienTai)
    VALUES
        (
            N'ChiTietBoSuuTapYeuThich',
            N'ChiTietBoSuuTapYeuThich',
            N'MaChiTietBoSuuTap',
            N'CTBST',
            0
        );
END;
GO

USE QuanLyThucDon;
GO

-- =====================================================
-- 1. TẠO BỘ SƯU TẬP
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpTaoBoSuuTapYeuThich
    @MaNguoiDung NVARCHAR(20),
    @TenBoSuuTap NVARCHAR(100),
    @MoTa NVARCHAR(500) = NULL,
    @LaRiengTu BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @TenBoSuuTap = LTRIM(RTRIM(@TenBoSuuTap));

    IF @TenBoSuuTap IS NULL OR LEN(@TenBoSuuTap) = 0
        THROW 54010, N'Tên bộ sưu tập không được để trống.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.NguoiDung
        WHERE MaNguoiDung = @MaNguoiDung
          AND TrangThai = N'Đang hoạt động'
    )
        THROW 54011, N'Tài khoản không hợp lệ hoặc bị khóa.', 1;

    DECLARE @MaMoi NVARCHAR(20);

    -- SpCapMaMoi hiện tại trả cả result set và OUTPUT.
    -- Bắt result set phụ để API chỉ nhận kết quả chính.
    DECLARE @KetQuaCapMa TABLE
    (
        MaMoi NVARCHAR(20),
        LoaiMa SYSNAME
    );

    BEGIN TRY
        BEGIN TRANSACTION;

        IF EXISTS (
            SELECT 1
            FROM dbo.BoSuuTapYeuThich WITH (UPDLOCK, HOLDLOCK)
            WHERE MaNguoiDung = @MaNguoiDung
              AND TenBoSuuTap = @TenBoSuuTap
        )
            THROW 54012, N'Bạn đã có bộ sưu tập trùng tên.', 1;

        INSERT INTO @KetQuaCapMa
        EXEC dbo.SpCapMaMoi
            @LoaiMa = N'BoSuuTapYeuThich',
            @MaMoi = @MaMoi OUTPUT;

        INSERT INTO dbo.BoSuuTapYeuThich
        (
            MaBoSuuTap,
            MaNguoiDung,
            TenBoSuuTap,
            MoTa,
            LaRiengTu
        )
        VALUES
        (
            @MaMoi,
            @MaNguoiDung,
            @TenBoSuuTap,
            @MoTa,
            COALESCE(@LaRiengTu, 1)
        );

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT *
    FROM dbo.BoSuuTapYeuThich
    WHERE MaBoSuuTap = @MaMoi;
END;
GO

-- =====================================================
-- 2. LẤY DANH SÁCH BỘ SƯU TẬP
-- KỂ CẢ BỘ SƯU TẬP RỖNG
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpLayDanhSachBoSuuTapYeuThich
    @MaNguoiDung NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.MaBoSuuTap,
        b.MaNguoiDung,
        b.TenBoSuuTap,
        b.MoTa,
        b.LaRiengTu,
        b.NgayTao,
        b.NgayCapNhat,
        dem.SoLuongMon,
        bia.MaMonAn AS MaMonAnhBia,
        bia.TenMonAn AS TenMonAnhBia,
        bia.DuongDanAnh AS DuongDanAnhBia
    FROM dbo.BoSuuTapYeuThich b

    OUTER APPLY (
        SELECT COUNT_BIG(*) AS SoLuongMon
        FROM dbo.ChiTietBoSuuTapYeuThich ct
        WHERE ct.MaBoSuuTap = b.MaBoSuuTap
    ) dem

    OUTER APPLY (
        SELECT TOP (1)
            m.MaMonAn,
            m.TenMonAn,
            m.DuongDanAnh
        FROM dbo.ChiTietBoSuuTapYeuThich ct
        JOIN dbo.MonAn m
            ON m.MaMonAn = ct.MaMonAn
        WHERE ct.MaBoSuuTap = b.MaBoSuuTap
        ORDER BY
            ct.NgayThem ASC,
            ct.MaChiTietBoSuuTap ASC
    ) bia

    WHERE b.MaNguoiDung = @MaNguoiDung
    ORDER BY b.NgayTao DESC, b.MaBoSuuTap DESC;
END;
GO

-- =====================================================
-- 3. LẤY CHI TIẾT BỘ SƯU TẬP
-- TRẢ VỀ 2 RESULT SET
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpLayChiTietBoSuuTapYeuThich
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BoSuuTapYeuThich
        WHERE MaBoSuuTap = @MaBoSuuTap
          AND MaNguoiDung = @MaNguoiDung
    )
        THROW 54020, N'Bộ sưu tập không tồn tại hoặc không thuộc tài khoản.', 1;

    -- Result set 1: Thông tin bộ sưu tập
    SELECT
        b.*,
        (
            SELECT COUNT_BIG(*)
            FROM dbo.ChiTietBoSuuTapYeuThich ct
            WHERE ct.MaBoSuuTap = b.MaBoSuuTap
        ) AS SoLuongMon
    FROM dbo.BoSuuTapYeuThich b
    WHERE b.MaBoSuuTap = @MaBoSuuTap
      AND b.MaNguoiDung = @MaNguoiDung;

    -- Result set 2: Danh sách món
    SELECT
        ct.MaChiTietBoSuuTap,
        ct.MaBoSuuTap,
        ct.MaMonAn,
        ct.NgayThem,
        m.TenMonAn,
        m.MoTa,
        m.ThoiGianCheBien,
        m.DoKho,
        m.DuongDanAnh,
        m.TrangThaiHienThi
    FROM dbo.ChiTietBoSuuTapYeuThich ct
    JOIN dbo.MonAn m
        ON m.MaMonAn = ct.MaMonAn
    WHERE ct.MaBoSuuTap = @MaBoSuuTap
      AND ct.MaNguoiDung = @MaNguoiDung
    ORDER BY ct.NgayThem, ct.MaChiTietBoSuuTap;
END;
GO

-- =====================================================
-- 4. SỬA BỘ SƯU TẬP
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpSuaBoSuuTapYeuThich
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20),
    @TenBoSuuTap NVARCHAR(100),
    @MoTa NVARCHAR(500) = NULL,
    @LaRiengTu BIT = 1
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    SET @TenBoSuuTap = LTRIM(RTRIM(@TenBoSuuTap));

    IF @TenBoSuuTap IS NULL OR LEN(@TenBoSuuTap) = 0
        THROW 54030, N'Tên bộ sưu tập không được để trống.', 1;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.NguoiDung
        WHERE MaNguoiDung = @MaNguoiDung
          AND TrangThai = N'Đang hoạt động'
    )
        THROW 54031, N'Tài khoản không hợp lệ hoặc bị khóa.', 1;

    UPDATE dbo.BoSuuTapYeuThich
    SET
        TenBoSuuTap = @TenBoSuuTap,
        MoTa = @MoTa,
        LaRiengTu = COALESCE(@LaRiengTu, 1),
        NgayCapNhat = SYSDATETIME()
    WHERE MaBoSuuTap = @MaBoSuuTap
      AND MaNguoiDung = @MaNguoiDung;

    IF @@ROWCOUNT = 0
        THROW 54032, N'Không tìm thấy bộ sưu tập của bạn.', 1;

    SELECT *
    FROM dbo.BoSuuTapYeuThich
    WHERE MaBoSuuTap = @MaBoSuuTap;
END;
GO

-- =====================================================
-- 5. XÓA BỘ SƯU TẬP
-- KHÔNG XÓA YÊU THÍCH GỐC
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpXoaBoSuuTapYeuThich
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DELETE FROM dbo.BoSuuTapYeuThich
    WHERE MaBoSuuTap = @MaBoSuuTap
      AND MaNguoiDung = @MaNguoiDung;

    IF @@ROWCOUNT = 0
        THROW 54040, N'Không tìm thấy bộ sưu tập của bạn.', 1;

    SELECT CAST(1 AS BIT) AS DaXoa;
END;
GO

-- =====================================================
-- 6. THÊM MÓN VÀO BỘ SƯU TẬP
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpThemMonVaoBoSuuTap
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20),
    @MaMonAn NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1 FROM dbo.NguoiDung
        WHERE MaNguoiDung = @MaNguoiDung
          AND TrangThai = N'Đang hoạt động'
    )
        THROW 54050, N'Tài khoản không hợp lệ hoặc bị khóa.', 1;

    DECLARE @MaChiTiet NVARCHAR(20) = NULL;
    DECLARE @DaThemMoi BIT = 0;

    DECLARE @KetQuaCapMa TABLE
    (
        MaMoi NVARCHAR(20),
        LoaiMa SYSNAME
    );

    BEGIN TRY
        BEGIN TRANSACTION;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.BoSuuTapYeuThich WITH (UPDLOCK, HOLDLOCK)
            WHERE MaBoSuuTap = @MaBoSuuTap
              AND MaNguoiDung = @MaNguoiDung
        )
            THROW 54051, N'Bộ sưu tập không thuộc tài khoản.', 1;

        IF NOT EXISTS (
            SELECT 1
            FROM dbo.MonYeuThich
            WHERE MaNguoiDung = @MaNguoiDung
              AND MaMonAn = @MaMonAn
        )
            THROW 54052, N'Món ăn chưa được thêm vào Yêu thích.', 1;

        SELECT @MaChiTiet = MaChiTietBoSuuTap
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @MaBoSuuTap
          AND MaMonAn = @MaMonAn;

        IF @MaChiTiet IS NULL
        BEGIN
            INSERT INTO @KetQuaCapMa
            EXEC dbo.SpCapMaMoi
                @LoaiMa = N'ChiTietBoSuuTapYeuThich',
                @MaMoi = @MaChiTiet OUTPUT;

            INSERT INTO dbo.ChiTietBoSuuTapYeuThich
            (
                MaChiTietBoSuuTap,
                MaBoSuuTap,
                MaNguoiDung,
                MaMonAn
            )
            VALUES
            (
                @MaChiTiet,
                @MaBoSuuTap,
                @MaNguoiDung,
                @MaMonAn
            );

            SET @DaThemMoi = 1;
        END;

        COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;
        THROW;
    END CATCH;

    SELECT
        @MaChiTiet AS MaChiTietBoSuuTap,
        @MaBoSuuTap AS MaBoSuuTap,
        @MaMonAn AS MaMonAn,
        @DaThemMoi AS DaThemMoi;
END;
GO

-- =====================================================
-- 7. XÓA MÓN KHỎI BỘ SƯU TẬP
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpXoaMonKhoiBoSuuTap
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20),
    @MaMonAn NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    DECLARE @SoDong INT;

    DELETE ct
    FROM dbo.ChiTietBoSuuTapYeuThich ct
    JOIN dbo.BoSuuTapYeuThich b
        ON b.MaBoSuuTap = ct.MaBoSuuTap
       AND b.MaNguoiDung = ct.MaNguoiDung
    WHERE ct.MaBoSuuTap = @MaBoSuuTap
      AND ct.MaNguoiDung = @MaNguoiDung
      AND ct.MaMonAn = @MaMonAn;

    SET @SoDong = @@ROWCOUNT;

    SELECT
        CAST(
            CASE WHEN @SoDong > 0 THEN 1 ELSE 0 END
            AS BIT
        ) AS DaXoa;
END;
GO

-- =====================================================
-- 8. KIỂM TRA MÓN ĐÃ THUỘC BỘ SƯU TẬP NÀO
-- =====================================================

CREATE OR ALTER PROCEDURE dbo.SpLayBoSuuTapTheoMonAn
    @MaNguoiDung NVARCHAR(20),
    @MaMonAn NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        b.MaBoSuuTap,
        b.TenBoSuuTap,
        b.MoTa,
        b.LaRiengTu,
        b.NgayTao,

        dem.SoLuongMon,

        bia.DuongDanAnh AS DuongDanAnhBia,

        CAST(
            CASE
                WHEN ct.MaChiTietBoSuuTap IS NULL THEN 0
                ELSE 1
            END AS BIT
        ) AS DaChuaMon

    FROM dbo.BoSuuTapYeuThich b

    LEFT JOIN dbo.ChiTietBoSuuTapYeuThich ct
        ON ct.MaBoSuuTap = b.MaBoSuuTap
       AND ct.MaMonAn = @MaMonAn

    OUTER APPLY (
        SELECT COUNT_BIG(*) AS SoLuongMon
        FROM dbo.ChiTietBoSuuTapYeuThich x
        WHERE x.MaBoSuuTap = b.MaBoSuuTap
    ) dem

    OUTER APPLY (
        SELECT TOP (1) m.DuongDanAnh
        FROM dbo.ChiTietBoSuuTapYeuThich x
        JOIN dbo.MonAn m
            ON m.MaMonAn = x.MaMonAn
        WHERE x.MaBoSuuTap = b.MaBoSuuTap
        ORDER BY x.NgayThem, x.MaChiTietBoSuuTap
    ) bia

    WHERE b.MaNguoiDung = @MaNguoiDung
    ORDER BY b.NgayTao DESC, b.MaBoSuuTap DESC;
END;
GO

USE QuanLyThucDon;
GO

-- Kiểm tra 2 bảng
SELECT name AS TenBang
FROM sys.tables
WHERE name IN (
    N'BoSuuTapYeuThich',
    N'ChiTietBoSuuTapYeuThich'
);

-- Kiểm tra 2 loại mã
SELECT
    LoaiMa,
    TenBang,
    TenCot,
    TienTo,
    SoHienTai
FROM dbo.QuyUocMaHeThong
WHERE LoaiMa IN (
    N'BoSuuTapYeuThich',
    N'ChiTietBoSuuTapYeuThich'
);

-- Kiểm tra 8 Stored Procedure
SELECT name AS TenProcedure
FROM sys.procedures
WHERE name IN (
    N'SpTaoBoSuuTapYeuThich',
    N'SpLayDanhSachBoSuuTapYeuThich',
    N'SpLayChiTietBoSuuTapYeuThich',
    N'SpSuaBoSuuTapYeuThich',
    N'SpXoaBoSuuTapYeuThich',
    N'SpThemMonVaoBoSuuTap',
    N'SpXoaMonKhoiBoSuuTap',
    N'SpLayBoSuuTapTheoMonAn'
);

-- Kiểm tra khóa ngoại và hành vi xóa
SELECT
    fk.name AS TenKhoaNgoai,
    OBJECT_NAME(fk.parent_object_id) AS BangCon,
    OBJECT_NAME(fk.referenced_object_id) AS BangCha,
    fk.delete_referential_action_desc AS KhiXoaBangCha
FROM sys.foreign_keys fk
WHERE fk.parent_object_id IN (
    OBJECT_ID(N'dbo.BoSuuTapYeuThich'),
    OBJECT_ID(N'dbo.ChiTietBoSuuTapYeuThich')
);

USE QuanLyThucDon;
GO

SET NOCOUNT ON;

DECLARE
    @MaNguoiDung NVARCHAR(20),
    @MaMonAn NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20),
    @TenBoSuuTap NVARCHAR(100);

-- Tìm tài khoản đang hoạt động có món yêu thích
SELECT TOP (1)
    @MaNguoiDung = yt.MaNguoiDung,
    @MaMonAn = yt.MaMonAn
FROM dbo.MonYeuThich yt
JOIN dbo.NguoiDung nd
    ON nd.MaNguoiDung = yt.MaNguoiDung
WHERE nd.TrangThai = N'Đang hoạt động'
ORDER BY yt.MaNguoiDung, yt.MaMonAn;

IF @MaNguoiDung IS NULL
BEGIN
    PRINT N'Không có tài khoản đang hoạt động với món yêu thích để test.';
END
ELSE
BEGIN
    SET @TenBoSuuTap =
        N'Test BST ' +
        LEFT(CONVERT(NVARCHAR(36), NEWID()), 8);

    BEGIN TRY
        BEGIN TRANSACTION;

        -- 1. Tạo bộ sưu tập
        EXEC dbo.SpTaoBoSuuTapYeuThich
            @MaNguoiDung = @MaNguoiDung,
            @TenBoSuuTap = @TenBoSuuTap,
            @MoTa = N'Kiểm thử chức năng CookHub',
            @LaRiengTu = 1;

        SELECT @MaBoSuuTap = MaBoSuuTap
        FROM dbo.BoSuuTapYeuThich
        WHERE MaNguoiDung = @MaNguoiDung
          AND TenBoSuuTap = @TenBoSuuTap;

        IF @MaBoSuuTap IS NULL
            THROW 54100, N'Tạo bộ sưu tập không trả về mã hợp lệ.', 1;

        -- 2. Kiểm tra bộ sưu tập rỗng
        EXEC dbo.SpLayDanhSachBoSuuTapYeuThich
            @MaNguoiDung = @MaNguoiDung;

        -- 3. Thêm món đã yêu thích
        EXEC dbo.SpThemMonVaoBoSuuTap
            @MaNguoiDung = @MaNguoiDung,
            @MaBoSuuTap = @MaBoSuuTap,
            @MaMonAn = @MaMonAn;

        -- 4. Xem chi tiết bộ sưu tập
        EXEC dbo.SpLayChiTietBoSuuTapYeuThich
            @MaNguoiDung = @MaNguoiDung,
            @MaBoSuuTap = @MaBoSuuTap;

        -- 5. Kiểm tra trạng thái món trong bộ sưu tập
        EXEC dbo.SpLayBoSuuTapTheoMonAn
            @MaNguoiDung = @MaNguoiDung,
            @MaMonAn = @MaMonAn;

        SELECT
            N'TEST THÀNH CÔNG' AS KetQua,
            @MaNguoiDung AS MaNguoiDung,
            @MaBoSuuTap AS MaBoSuuTap,
            @MaMonAn AS MaMonAn;

        ROLLBACK TRANSACTION;

        PRINT N'Đã rollback. Không lưu dữ liệu test.';
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0
            ROLLBACK TRANSACTION;

        SELECT
            ERROR_NUMBER() AS MaLoi,
            ERROR_MESSAGE() AS NoiDungLoi;
    END CATCH;
END;
GO

USE QuanLyThucDon;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

-- Kiểm tra các bảng bắt buộc
IF OBJECT_ID(N'dbo.BoSuuTapYeuThich', N'U') IS NULL
   OR OBJECT_ID(N'dbo.ChiTietBoSuuTapYeuThich', N'U') IS NULL
   OR OBJECT_ID(N'dbo.MonYeuThich', N'U') IS NULL
   OR OBJECT_ID(N'dbo.QuyUocMaHeThong', N'U') IS NULL
BEGIN
    THROW 54901, N'Thiếu bảng bắt buộc. Dừng thực hiện.', 1;
END;

-- Kiểm tra không có bộ sưu tập công khai
IF EXISTS (
    SELECT 1
    FROM dbo.BoSuuTapYeuThich
    WHERE LaRiengTu <> 1
)
BEGIN
    THROW 54902,
        N'Đang tồn tại bộ sưu tập công khai. Cần kiểm tra trước.',
        1;
END;

-- Thêm ràng buộc: tất cả bộ sưu tập đều riêng tư
IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE name = N'CK_BST_ChiRiengTu'
      AND parent_object_id =
          OBJECT_ID(N'dbo.BoSuuTapYeuThich')
)
BEGIN
    ALTER TABLE dbo.BoSuuTapYeuThich
    WITH CHECK
    ADD CONSTRAINT CK_BST_ChiRiengTu
    CHECK (LaRiengTu = 1);
END;

PRINT N'Đã kiểm tra ràng buộc riêng tư.';
GO

-- Gia cố SP thêm món vào bộ sưu tập
CREATE OR ALTER PROCEDURE dbo.SpThemMonVaoBoSuuTap
    @MaNguoiDung NVARCHAR(20),
    @MaBoSuuTap NVARCHAR(20),
    @MaMonAn NVARCHAR(20)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.NguoiDung
        WHERE MaNguoiDung = @MaNguoiDung
          AND TrangThai = N'Đang hoạt động'
    )
        THROW 54050, N'Tài khoản không hợp lệ hoặc bị khóa.', 1;

    DECLARE @MaChiTiet NVARCHAR(20) = NULL;
    DECLARE @DaThemMoi BIT = 0;

    DECLARE @KetQuaCapMa TABLE (
        MaMoi NVARCHAR(20),
        LoaiMa SYSNAME
    );

    DECLARE @TranBanDau INT = @@TRANCOUNT;

    BEGIN TRY
        IF @TranBanDau = 0
            BEGIN TRANSACTION;
        ELSE
            SAVE TRANSACTION Save_ThemMonBST;

        -- Kiểm tra chủ sở hữu
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.BoSuuTapYeuThich WITH (UPDLOCK, HOLDLOCK)
            WHERE MaBoSuuTap = @MaBoSuuTap
              AND MaNguoiDung = @MaNguoiDung
        )
            THROW 54051, N'Bộ sưu tập không thuộc tài khoản.', 1;

        -- Chỉ thêm món đã yêu thích
        IF NOT EXISTS (
            SELECT 1
            FROM dbo.MonYeuThich WITH (HOLDLOCK)
            WHERE MaNguoiDung = @MaNguoiDung
              AND MaMonAn = @MaMonAn
        )
            THROW 54052, N'Món ăn chưa được thêm vào Yêu thích.', 1;

        -- Khóa phạm vi khóa để hạn chế thêm trùng đồng thời
        SELECT @MaChiTiet = MaChiTietBoSuuTap
        FROM dbo.ChiTietBoSuuTapYeuThich
            WITH (UPDLOCK, HOLDLOCK)
        WHERE MaBoSuuTap = @MaBoSuuTap
          AND MaMonAn = @MaMonAn;

        IF @MaChiTiet IS NULL
        BEGIN
            INSERT INTO @KetQuaCapMa (MaMoi, LoaiMa)
            EXEC dbo.SpCapMaMoi
                @LoaiMa = N'ChiTietBoSuuTapYeuThich',
                @MaMoi = @MaChiTiet OUTPUT;

            IF @MaChiTiet IS NULL
                THROW 54053, N'Không cấp được mã chi tiết.', 1;

            INSERT INTO dbo.ChiTietBoSuuTapYeuThich
            (
                MaChiTietBoSuuTap,
                MaBoSuuTap,
                MaNguoiDung,
                MaMonAn
            )
            VALUES
            (
                @MaChiTiet,
                @MaBoSuuTap,
                @MaNguoiDung,
                @MaMonAn
            );

            SET @DaThemMoi = 1;
        END;

        IF @TranBanDau = 0
            COMMIT TRANSACTION;
    END TRY
    BEGIN CATCH
        IF XACT_STATE() <> 0 AND @TranBanDau = 0
            ROLLBACK TRANSACTION;
        ELSE IF XACT_STATE() = 1 AND @TranBanDau > 0
            ROLLBACK TRANSACTION Save_ThemMonBST;

        THROW;
    END CATCH;

    SELECT
        @MaChiTiet AS MaChiTietBoSuuTap,
        @MaBoSuuTap AS MaBoSuuTap,
        @MaMonAn AS MaMonAn,
        @DaThemMoi AS DaThemMoi;
END;
GO

PRINT N'Đã cập nhật Stored Procedure thêm món.';


USE QuanLyThucDon;
GO

SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE
    @Nguoi NVARCHAR(20),
    @NguoiKhac NVARCHAR(20),
    @Mon1 NVARCHAR(20),
    @Mon2 NVARCHAR(20),
    @BST1 NVARCHAR(20),
    @BST2 NVARCHAR(20),
    @Ten1 NVARCHAR(100),
    @Ten2 NVARCHAR(100),
    @TenMoi NVARCHAR(100),
    @MaBia NVARCHAR(20);

DECLARE @KQ TABLE (
    STT INT IDENTITY(1,1),
    BaiTest NVARCHAR(150),
    KetQua NVARCHAR(10),
    GhiChu NVARCHAR(500)
);

-- Tìm người dùng có ít nhất 2 món yêu thích
SELECT TOP (1)
    @Nguoi = yt.MaNguoiDung
FROM dbo.MonYeuThich yt
JOIN dbo.NguoiDung nd
    ON nd.MaNguoiDung = yt.MaNguoiDung
WHERE nd.TrangThai = N'Đang hoạt động'
GROUP BY yt.MaNguoiDung
HAVING COUNT(DISTINCT yt.MaMonAn) >= 2
ORDER BY yt.MaNguoiDung;

IF @Nguoi IS NULL
    THROW 54800,
        N'Cần một tài khoản đang hoạt động có ít nhất 2 món yêu thích để kiểm thử.',
        1;

SELECT TOP (1) @Mon1 = MaMonAn
FROM dbo.MonYeuThich
WHERE MaNguoiDung = @Nguoi
ORDER BY MaMonAn;

SELECT TOP (1) @Mon2 = MaMonAn
FROM dbo.MonYeuThich
WHERE MaNguoiDung = @Nguoi
  AND MaMonAn <> @Mon1
ORDER BY MaMonAn;

SELECT TOP (1) @NguoiKhac = MaNguoiDung
FROM dbo.NguoiDung
WHERE MaNguoiDung <> @Nguoi
  AND TrangThai = N'Đang hoạt động'
ORDER BY MaNguoiDung;

SET @Ten1 =
    N'Test_A_' + LEFT(CONVERT(NVARCHAR(36), NEWID()), 8);

SET @Ten2 =
    N'Test_B_' + LEFT(CONVERT(NVARCHAR(36), NEWID()), 8);

SET @TenMoi =
    N'Test_Sua_' + LEFT(CONVERT(NVARCHAR(36), NEWID()), 8);

BEGIN TRY
    BEGIN TRANSACTION;

    -- TEST 1: Tạo Bộ sưu tập A
    EXEC dbo.SpTaoBoSuuTapYeuThich
        @MaNguoiDung = @Nguoi,
        @TenBoSuuTap = @Ten1,
        @MoTa = N'Kiểm thử A',
        @LaRiengTu = 1;

    SELECT @BST1 = MaBoSuuTap
    FROM dbo.BoSuuTapYeuThich
    WHERE MaNguoiDung = @Nguoi
      AND TenBoSuuTap = @Ten1;

    IF @BST1 IS NULL
        THROW 54801, N'Tạo Bộ sưu tập A thất bại.', 1;

    INSERT @KQ VALUES
        (N'1. Tạo Bộ sưu tập', N'PASS', @BST1);

    -- TEST 2: Tạo Bộ sưu tập B
    EXEC dbo.SpTaoBoSuuTapYeuThich
        @MaNguoiDung = @Nguoi,
        @TenBoSuuTap = @Ten2,
        @MoTa = N'Kiểm thử B',
        @LaRiengTu = 1;

    SELECT @BST2 = MaBoSuuTap
    FROM dbo.BoSuuTapYeuThich
    WHERE MaNguoiDung = @Nguoi
      AND TenBoSuuTap = @Ten2;

    IF @BST2 IS NULL
        THROW 54802, N'Tạo Bộ sưu tập B thất bại.', 1;

    INSERT @KQ VALUES
        (N'2. Tạo nhiều Bộ sưu tập', N'PASS', @BST2);

    -- TEST 3: Bộ sưu tập rỗng
    IF EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap IN (@BST1, @BST2)
    )
        THROW 54803, N'Bộ sưu tập mới không rỗng.', 1;

    INSERT @KQ VALUES
        (N'3. Bộ sưu tập rỗng', N'PASS', N'Cả hai có 0 món');

    -- TEST 4: Thêm hai món vào A
    EXEC dbo.SpThemMonVaoBoSuuTap
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST1,
        @MaMonAn = @Mon1;

    EXEC dbo.SpThemMonVaoBoSuuTap
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST1,
        @MaMonAn = @Mon2;

    IF (
        SELECT COUNT(*)
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
    ) <> 2
        THROW 54804, N'Thêm hai món thất bại.', 1;

    INSERT @KQ VALUES
        (N'4. Thêm nhiều món', N'PASS', N'2 món');

    -- TEST 5: Một món thuộc nhiều Bộ sưu tập
    EXEC dbo.SpThemMonVaoBoSuuTap
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST2,
        @MaMonAn = @Mon1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST2
          AND MaMonAn = @Mon1
    )
        THROW 54805, N'Một món không vào được hai Bộ sưu tập.', 1;

    INSERT @KQ VALUES
        (N'5. Một món ở nhiều Bộ sưu tập', N'PASS', @Mon1);

    -- TEST 6: Thêm trùng
    EXEC dbo.SpThemMonVaoBoSuuTap
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST1,
        @MaMonAn = @Mon1;

    IF (
        SELECT COUNT(*)
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
          AND MaMonAn = @Mon1
    ) <> 1
        THROW 54806, N'Đã tạo dữ liệu trùng.', 1;

    INSERT @KQ VALUES
        (N'6. Chống thêm trùng', N'PASS', N'Không trùng');

    -- TEST 7: Ảnh bìa dựa trên món đầu tiên
    SELECT TOP (1) @MaBia = MaMonAn
    FROM dbo.ChiTietBoSuuTapYeuThich
    WHERE MaBoSuuTap = @BST1
    ORDER BY NgayThem, MaChiTietBoSuuTap;

    IF @MaBia <> @Mon1
        THROW 54807, N'Không xác định đúng món đầu tiên.', 1;

    INSERT @KQ VALUES
        (N'7. Món đầu tiên làm ảnh bìa', N'PASS', @MaBia);

    -- TEST 8: Sửa Bộ sưu tập
    EXEC dbo.SpSuaBoSuuTapYeuThich
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST1,
        @TenBoSuuTap = @TenMoi,
        @MoTa = N'Mô tả đã chỉnh sửa',
        @LaRiengTu = 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
          AND TenBoSuuTap = @TenMoi
          AND MoTa = N'Mô tả đã chỉnh sửa'
    )
        THROW 54808, N'Sửa Bộ sưu tập thất bại.', 1;

    INSERT @KQ VALUES
        (N'8. Sửa tên và mô tả', N'PASS', N'Đã cập nhật');

    -- TEST 9: Xóa món khỏi A
    EXEC dbo.SpXoaMonKhoiBoSuuTap
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST1,
        @MaMonAn = @Mon1;

    IF EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
          AND MaMonAn = @Mon1
    )
        THROW 54809, N'Xóa món khỏi A thất bại.', 1;

    -- Món vẫn nằm trong B
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST2
          AND MaMonAn = @Mon1
    )
        THROW 54810, N'Xóa ở A làm mất món ở B.', 1;

    -- Yêu thích gốc vẫn tồn tại
    IF NOT EXISTS (
        SELECT 1
        FROM dbo.MonYeuThich
        WHERE MaNguoiDung = @Nguoi
          AND MaMonAn = @Mon1
    )
        THROW 54811, N'Xóa khỏi BST làm mất yêu thích.', 1;

    INSERT @KQ VALUES
        (N'9. Xóa món khỏi một BST', N'PASS',
         N'BST khác và Yêu thích không bị ảnh hưởng');

    -- TEST 10: Ảnh bìa chuyển sang món tiếp theo
    SELECT TOP (1) @MaBia = MaMonAn
    FROM dbo.ChiTietBoSuuTapYeuThich
    WHERE MaBoSuuTap = @BST1
    ORDER BY NgayThem, MaChiTietBoSuuTap;

    IF @MaBia <> @Mon2
        THROW 54812, N'Ảnh bìa không chuyển sang món tiếp theo.', 1;

    INSERT @KQ VALUES
        (N'10. Tự đổi ảnh bìa', N'PASS', @MaBia);

    -- TEST 11: Xóa Bộ sưu tập B
    EXEC dbo.SpXoaBoSuuTapYeuThich
        @MaNguoiDung = @Nguoi,
        @MaBoSuuTap = @BST2;

    IF EXISTS (
        SELECT 1
        FROM dbo.BoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST2
    )
        THROW 54813, N'Xóa Bộ sưu tập thất bại.', 1;

    IF EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST2
    )
        THROW 54814, N'Chi tiết chưa được xóa.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.MonYeuThich
        WHERE MaNguoiDung = @Nguoi
          AND MaMonAn = @Mon1
    )
        THROW 54815, N'Xóa BST làm mất Yêu thích.', 1;

    INSERT @KQ VALUES
        (N'11. Xóa Bộ sưu tập', N'PASS',
         N'Chỉ xóa BST và chi tiết');

    -- TEST 12: Bỏ yêu thích toàn cục
    -- Thao tác này CHỈ diễn ra trong transaction thử.
    DELETE FROM dbo.MonYeuThich
    WHERE MaNguoiDung = @Nguoi
      AND MaMonAn = @Mon2;

    IF EXISTS (
        SELECT 1
        FROM dbo.ChiTietBoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
          AND MaMonAn = @Mon2
    )
        THROW 54816, N'Bỏ yêu thích không xóa quan hệ BST.', 1;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.BoSuuTapYeuThich
        WHERE MaBoSuuTap = @BST1
    )
        THROW 54817, N'Bỏ yêu thích làm mất BST.', 1;

    INSERT @KQ VALUES
        (N'12. Đồng bộ bỏ yêu thích', N'PASS',
         N'Xóa quan hệ nhưng giữ BST');

    -- Không lưu bất kỳ dữ liệu test nào
    ROLLBACK TRANSACTION;

END TRY
BEGIN CATCH
    DECLARE @LoiCRUD NVARCHAR(4000) = ERROR_MESSAGE();

    IF XACT_STATE() <> 0
        ROLLBACK TRANSACTION;

    INSERT @KQ VALUES
        (N'Kiểm thử CRUD tổng hợp', N'FAIL', @LoiCRUD);
END CATCH;

-- Hiển thị kết quả
SELECT
    STT,
    BaiTest,
    KetQua,
    GhiChu
FROM @KQ
ORDER BY STT;

SELECT
    SUM(CASE WHEN KetQua = N'PASS' THEN 1 ELSE 0 END) AS SoPASS,
    SUM(CASE WHEN KetQua = N'FAIL' THEN 1 ELSE 0 END) AS SoFAIL
FROM @KQ;
GO


USE [QuanLyThucDon];
GO

IF OBJECT_ID(N'dbo.LienKetOAuth', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LienKetOAuth
    (
        MaLienKet          NVARCHAR(50)  NOT NULL,
        MaNguoiDung        NVARCHAR(20)  NOT NULL,
        NhaCungCap         NVARCHAR(20)  NOT NULL,
        MaNguoiDungNgoai   NVARCHAR(255) NOT NULL,
        EmailXacMinh       NVARCHAR(255) NULL,
        TenHienThi         NVARCHAR(200) NULL,
        NgayTao            DATETIME2(0) NOT NULL
            CONSTRAINT DF_LienKetOAuth_NgayTao
            DEFAULT SYSUTCDATETIME(),
        NgayCapNhat        DATETIME2(0) NULL,

        CONSTRAINT PK_LienKetOAuth
            PRIMARY KEY (MaLienKet),

        CONSTRAINT FK_LienKetOAuth_NguoiDung
            FOREIGN KEY (MaNguoiDung)
            REFERENCES dbo.NguoiDung(MaNguoiDung),

        CONSTRAINT CK_LienKetOAuth_NhaCungCap
            CHECK (NhaCungCap IN (N'google', N'facebook'))
    );
END;
GO

USE QuanLyThucDon;
GO

BEGIN TRANSACTION;

BEGIN TRY

    /* 1. Tự động ghi ngày tạo tài khoản mới */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c
            ON dc.parent_object_id = c.object_id
           AND dc.parent_column_id = c.column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.NguoiDung')
          AND c.name = 'NgayTao'
    )
    BEGIN
        ALTER TABLE dbo.NguoiDung
        ADD CONSTRAINT DF_NguoiDung_NgayTao
        DEFAULT SYSDATETIME() FOR NgayTao;
    END;


    /* 2. Tự động ghi ngày tạo thực đơn mới */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.default_constraints dc
        JOIN sys.columns c
            ON dc.parent_object_id = c.object_id
           AND dc.parent_column_id = c.column_id
        WHERE dc.parent_object_id = OBJECT_ID('dbo.ThucDon')
          AND c.name = 'NgayTao'
    )
    BEGIN
        ALTER TABLE dbo.ThucDon
        ADD CONSTRAINT DF_ThucDon_NgayTao
        DEFAULT SYSDATETIME() FOR NgayTao;
    END;


    /* 3. Tạo index để lọc báo cáo nhanh hơn */
    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_NguoiDung_NgayTao'
          AND object_id = OBJECT_ID('dbo.NguoiDung')
    )
    BEGIN
        CREATE INDEX IX_NguoiDung_NgayTao
        ON dbo.NguoiDung(NgayTao);
    END;


    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_ThucDon_NgayTao'
          AND object_id = OBJECT_ID('dbo.ThucDon')
    )
    BEGIN
        CREATE INDEX IX_ThucDon_NgayTao
        ON dbo.ThucDon(NgayTao);
    END;


    IF NOT EXISTS (
        SELECT 1
        FROM sys.indexes
        WHERE name = 'IX_MonYeuThich_NgayThem'
          AND object_id = OBJECT_ID('dbo.MonYeuThich')
    )
    BEGIN
        CREATE INDEX IX_MonYeuThich_NgayThem
        ON dbo.MonYeuThich(NgayThem);
    END;


    COMMIT TRANSACTION;
    PRINT N'Cập nhật database thành công.';

END TRY
BEGIN CATCH
    ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO

USE QuanLyThucDon;
GO

CREATE OR ALTER TRIGGER dbo.TR_NguoiDung_SetNgayTao
ON dbo.NguoiDung
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE nd
    SET NgayTao = SYSDATETIME()
    FROM dbo.NguoiDung nd
    INNER JOIN inserted i
        ON i.MaNguoiDung = nd.MaNguoiDung
    WHERE nd.NgayTao IS NULL;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ThucDon_SetNgayTao
ON dbo.ThucDon
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE td
    SET NgayTao = SYSDATETIME()
    FROM dbo.ThucDon td
    INNER JOIN inserted i
        ON i.MaThucDon = td.MaThucDon
    WHERE td.NgayTao IS NULL;
END;
GO

-- ============================================================
-- DỮ LIỆU SEED BỔ SUNG: khôi phục đủ catalog bản 24/10/2026
-- Chạy sau QuanLyThucDon.sql; có thể chạy lại an toàn.
-- Kết quả mong đợi: 9 tài khoản, 65 món, 64 công thức,
-- 100 nguyên liệu, 90 dòng dinh dưỡng và 3 video mẫu.
-- ============================================================
USE QuanLyThucDon;
GO
SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRY
    BEGIN TRANSACTION;

-- Tài khoản mẫu ND006-ND009 dùng chung mật khẩu: CookHub123!
IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung=N'ND006')
    INSERT dbo.NguoiDung(MaNguoiDung,HoTen,ThuDienTu,MatKhauBam,VaiTro,TrangThai)
    VALUES (N'ND006',N'Tài khoản mẫu 06',N'demo06@example.com',N'$2b$12$IyW.UgA0MhIQNnQRAFqciOUjjDNLTf./IId7iXsmQxQSZJxt1gIoG',N'Người dùng',N'Đang hoạt động');

IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung=N'ND007')
    INSERT dbo.NguoiDung(MaNguoiDung,HoTen,ThuDienTu,MatKhauBam,VaiTro,TrangThai)
    VALUES (N'ND007',N'Tài khoản mẫu 07',N'demo07@example.com',N'$2b$12$IyW.UgA0MhIQNnQRAFqciOUjjDNLTf./IId7iXsmQxQSZJxt1gIoG',N'Người dùng',N'Đang hoạt động');

IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung=N'ND008')
    INSERT dbo.NguoiDung(MaNguoiDung,HoTen,ThuDienTu,MatKhauBam,VaiTro,TrangThai)
    VALUES (N'ND008',N'Tài khoản mẫu 08',N'demo08@example.com',N'$2b$12$IyW.UgA0MhIQNnQRAFqciOUjjDNLTf./IId7iXsmQxQSZJxt1gIoG',N'Người dùng',N'Đang hoạt động');

IF NOT EXISTS (SELECT 1 FROM dbo.NguoiDung WHERE MaNguoiDung=N'ND009')
    INSERT dbo.NguoiDung(MaNguoiDung,HoTen,ThuDienTu,MatKhauBam,VaiTro,TrangThai)
    VALUES (N'ND009',N'Tài khoản mẫu 09',N'demo09@example.com',N'$2b$12$IyW.UgA0MhIQNnQRAFqciOUjjDNLTf./IId7iXsmQxQSZJxt1gIoG',N'Người dùng',N'Đang hoạt động');


IF NOT EXISTS (SELECT 1 FROM dbo.[DanhMucMonAn] WHERE [MaDanhMuc] = N'DM010')
BEGIN
    INSERT dbo.[DanhMucMonAn] ([MaDanhMuc], [TenDanhMuc], [MoTa], [TrangThaiSuDung], [NgayCapNhat])
    VALUES (N'DM010', N'Món mặn', N'Các món ăn đậm đà, thường dùng làm món chính trong bữa cơm hằng ngày, được chế biến từ thịt, cá, trứng, hải sản và nhiều nguyên liệu khác.', N'Đang sử dụng', CONVERT(datetime2(3),N'2026-10-07T18:21:16.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[DanhMucMonAn] WHERE [MaDanhMuc] = N'DM011')
BEGIN
    INSERT dbo.[DanhMucMonAn] ([MaDanhMuc], [TenDanhMuc], [MoTa], [TrangThaiSuDung], [NgayCapNhat])
    VALUES (N'DM011', N'Món xào', N'Các món ăn được chế biến bằng phương pháp xào trên lửa vừa hoặc lớn, kết hợp đa dạng nguyên liệu như thịt, hải sản, rau củ và gia vị, mang đến hương vị đậm đà, thơm ngon và hấp dẫn.', N'Đang sử dụng', CONVERT(datetime2(3),N'2026-10-10T06:40:19.000',126));
END;
IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL091')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL091', N'Dầu mè', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL092')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL092', N'Bột hành', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL093')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL093', N'Bột nở', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL094')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL094', N'Xì dầu', N'');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL095')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL095', N'Cam vàng', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL096')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL096', N'Bột ngọt', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL097')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL097', N'Hạt nêm', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL098')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL098', N'Lòng trắng trứng gà', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL099')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL099', N'Bột tỏi', N'Nguyên liệu do người dùng bổ sung');
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[NguyenLieu] WHERE [MaNguyenLieu] = N'NL100')
BEGIN
    INSERT dbo.[NguyenLieu] ([MaNguyenLieu], [TenNguyenLieu], [MoTa])
    VALUES (N'NL100', N'Rau cải', N'');
END;
IF NOT EXISTS (SELECT 1 FROM dbo.[MonAn] WHERE [MaMonAn] = N'MA061')
BEGIN
    INSERT dbo.[MonAn] ([MaMonAn], [MaDanhMuc], [TenMonAn], [MoTa], [ThoiGianCheBien], [DoKho], [DuongDanAnh], [TrangThaiHienThi], [NgayCapNhat])
    VALUES (N'MA061', N'DM004', N'Bò xào nấm', N'Thịt bò xào nhanh với nấm đùi gà, nấm rơm và hành tây.', 30, N'Trung bình', N'images/uploads/dishes/62c66279a2b5432fa45c35e9fd61fcab.webp', N'Hiển thị', CONVERT(datetime2(3),N'2026-10-07T13:53:40.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[MonAn] WHERE [MaMonAn] = N'MA062')
BEGIN
    INSERT dbo.[MonAn] ([MaMonAn], [MaDanhMuc], [TenMonAn], [MoTa], [ThoiGianCheBien], [DoKho], [DuongDanAnh], [TrangThaiHienThi], [NgayCapNhat])
    VALUES (N'MA062', N'DM005', N'Cá hồi sốt mật ong chanh', N'Cá hồi áp chảo phủ sốt mật ong chanh chua ngọt, thơm tỏi.', 30, N'Trung bình', N'images/uploads/dishes/49009d1b468f4417864a87d07e885d89.webp', N'Hiển thị', CONVERT(datetime2(3),N'2026-10-07T13:53:40.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[MonAn] WHERE [MaMonAn] = N'MA063')
BEGIN
    INSERT dbo.[MonAn] ([MaMonAn], [MaDanhMuc], [TenMonAn], [MoTa], [ThoiGianCheBien], [DoKho], [DuongDanAnh], [TrangThaiHienThi], [NgayCapNhat])
    VALUES (N'MA063', N'DM005', N'Tôm rang me', N'Tôm rang với sốt me chua ngọt, nước mắm, tỏi và ớt.', 30, N'Trung bình', N'images/uploads/dishes/88fdb902dd70495e87be57d65ac7a553.webp', N'Hiển thị', CONVERT(datetime2(3),N'2026-10-07T13:53:41.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[MonAn] WHERE [MaMonAn] = N'MA064')
BEGIN
    INSERT dbo.[MonAn] ([MaMonAn], [MaDanhMuc], [TenMonAn], [MoTa], [ThoiGianCheBien], [DoKho], [DuongDanAnh], [TrangThaiHienThi], [NgayCapNhat])
    VALUES (N'MA064', N'DM004', N'Gà sốt cam', N'Thịt gà chiên vàng kết hợp với sốt cam chua ngọt, thơm nhẹ và đậm vị.', 35, N'Trung bình', N'images/uploads/dishes/8e870e57b99342c5b21ac9ae8ed27124.webp', N'Hiển thị', CONVERT(datetime2(3),N'2026-10-07T07:57:34.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[MonAn] WHERE [MaMonAn] = N'MA065')
BEGIN
    INSERT dbo.[MonAn] ([MaMonAn], [MaDanhMuc], [TenMonAn], [MoTa], [ThoiGianCheBien], [DoKho], [DuongDanAnh], [TrangThaiHienThi], [NgayCapNhat])
    VALUES (N'MA065', N'DM004', N'Gà sốt chanh dây kiểu nhiệt đới', N'Thịt gà áp chảo vàng giòn, phủ sốt chanh dây thơm dịu, chua ngọt hài hòa. Ăn kèm cơm trắng hoặc rau củ hấp.', 40, N'Trung bình', N'images/uploads/dishes/8121727afb7e46bc8964c92fda4daba1.webp', N'Hiển thị', CONVERT(datetime2(3),N'2026-10-08T13:06:49.000',126));
END;
IF NOT EXISTS (SELECT 1 FROM dbo.CongThuc WHERE MaCongThuc=N'CT061')
BEGIN
    INSERT dbo.CongThuc ([MaCongThuc], [MaMonAn], [MoTa], [SoKhauPhanChuan], [DaCongBo], [NgayCapNhat])
    VALUES (N'CT061', N'MA062', N'Công thức Cá hồi sốt mật ong chanh cho 2 khẩu phần.', 2, 0, CONVERT(datetime2(3),N'2026-10-07T13:53:41.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CongThuc WHERE MaCongThuc=N'CT062')
BEGIN
    INSERT dbo.CongThuc ([MaCongThuc], [MaMonAn], [MoTa], [SoKhauPhanChuan], [DaCongBo], [NgayCapNhat])
    VALUES (N'CT062', N'MA063', N'Công thức Tôm rang me cho 2 khẩu phần.', 2, 0, CONVERT(datetime2(3),N'2026-10-07T13:53:41.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CongThuc WHERE MaCongThuc=N'CT063')
BEGIN
    INSERT dbo.CongThuc ([MaCongThuc], [MaMonAn], [MoTa], [SoKhauPhanChuan], [DaCongBo], [NgayCapNhat])
    VALUES (N'CT063', N'MA061', N'Công thức Bò xào nấm cho 2 khẩu phần.', 2, 0, CONVERT(datetime2(3),N'2026-10-07T13:53:40.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.CongThuc WHERE MaCongThuc=N'CT064')
BEGIN
    INSERT dbo.CongThuc ([MaCongThuc], [MaMonAn], [MoTa], [SoKhauPhanChuan], [DaCongBo], [NgayCapNhat])
    VALUES (N'CT064', N'MA064', N'', 4, 0, CONVERT(datetime2(3),N'2026-10-07T13:19:16.000',126));
END;
IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP451')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP451', N'CT064', N'NL096', N'DVT006', 0.500);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP452')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP452', N'CT061', N'NL073', N'DVT001', 2.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP453')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP453', N'CT061', N'NL072', N'DVT001', 12.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP454')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP454', N'CT064', N'NL074', N'DVT006', 1.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP455')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP455', N'CT063', N'NL073', N'DVT001', 2.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP456')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP456', N'CT062', N'NL074', N'DVT001', 18.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP457')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP457', N'CT064', N'NL098', N'DVT005', 1.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP458')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP458', N'CT063', N'NL051', N'DVT001', 12.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP459')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP459', N'CT062', N'NL072', N'DVT001', 18.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP460')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP460', N'CT064', N'NL091', N'DVT006', 0.333);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP461')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP461', N'CT061', N'NL076', N'DVT001', 22.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP462')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP462', N'CT064', N'NL093', N'DVT001', 5.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP463')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP463', N'CT064', N'NL050', N'DVT011', 1.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP464')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP464', N'CT063', N'NL048', N'DVT001', 100.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP465')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP465', N'CT062', N'NL054', N'DVT001', 5.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP466')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP466', N'CT063', N'NL033', N'DVT001', 120.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP467')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP467', N'CT063', N'NL075', N'DVT001', 3.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP468')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP468', N'CT064', N'NL073', N'DVT006', 0.500);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP469')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP469', N'CT064', N'NL071', N'DVT006', 1.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP470')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP470', N'CT064', N'NL072', N'DVT003', 40.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP471')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP471', N'CT064', N'NL097', N'DVT006', 0.500);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP472')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP472', N'CT062', N'NL026', N'DVT001', 350.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP473')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP473', N'CT062', N'NL051', N'DVT001', 12.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP474')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP474', N'CT062', N'NL070', N'DVT001', 15.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP475')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP475', N'CT061', N'NL019', N'DVT001', 320.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP476')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP476', N'CT061', N'NL075', N'DVT001', 2.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP477')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP477', N'CT063', N'NL011', N'DVT001', 320.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP478')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP478', N'CT064', N'NL014', N'DVT001', 500.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP479')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP479', N'CT063', N'NL071', N'DVT001', 18.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP480')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP480', N'CT064', N'NL099', N'DVT006', 0.333);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP481')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP481', N'CT061', N'NL062', N'DVT001', 35.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP482')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP482', N'CT064', N'NL092', N'DVT006', 0.333);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP483')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP483', N'CT063', N'NL072', N'DVT001', 18.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP484')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP484', N'CT061', N'NL051', N'DVT001', 10.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP485')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP485', N'CT062', N'NL077', N'DVT001', 35.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP486')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP486', N'CT061', N'NL071', N'DVT001', 12.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP487')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP487', N'CT062', N'NL050', N'DVT001', 20.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP488')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP488', N'CT063', N'NL032', N'DVT001', 180.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP489')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP489', N'CT064', N'NL095', N'DVT005', 2.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP490')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP490', N'CT064', N'NL052', N'DVT001', 20.000);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[ThanhPhanCongThuc] WHERE [MaThanhPhan] = N'TP491')
BEGIN
    INSERT dbo.[ThanhPhanCongThuc] ([MaThanhPhan], [MaCongThuc], [MaNguyenLieu], [MaDonVi], [SoLuong])
    VALUES (N'TP491', N'CT064', N'NL079', N'DVT001', 60.000);
END;
IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB358')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB358', N'CT064', 6, N'Rim: Rim gà với sốt cam ở lửa nhỏ khoảng 10 phút, đến khi nước giảm và sốt sệt, bám quanh miếng gà. Nguồn có hướng dẫn nêm lại cho vừa ăn ở bước cuối.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB359')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB359', N'CT061', 1, N'Thấm khô cá hồi rồi nêm nhẹ muối và tiêu ở hai mặt.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB360')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB360', N'CT063', 5, N'Xào nấm đến khi vừa chín và lượng nước tiết ra giảm bớt.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB361')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB361', N'CT061', 7, N'Tắt bếp, để cá nghỉ ngắn rồi dùng nóng cùng phần sốt.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB362')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB362', N'CT063', 6, N'Cho thịt bò trở lại chảo, đảo nhanh với nấm và nêm thêm một ít muối nếu cần.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB363')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB363', N'CT061', 3, N'Băm nhỏ tỏi. Làm nóng dầu trong chảo rồi cho cá hồi vào áp chảo đến khi mặt đầu tiên vàng.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB364')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB364', N'CT061', 4, N'Lật cá, cho tỏi vào chảo và đảo nhanh đến khi thơm.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB365')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB365', N'CT062', 7, N'Thêm ớt và hành lá, đảo nhanh rồi tắt bếp.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB366')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB366', N'CT061', 6, N'Nấu đến khi cá vừa chín và sốt giảm còn độ sánh nhẹ.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB367')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB367', N'CT062', 6, N'Tiếp tục rang đến khi nước sốt me sánh lại và bám đều quanh tôm.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB368')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB368', N'CT064', 1, N'Sơ chế và ướp gà: Xát muối lên thịt gà khoảng 10 phút rồi rửa sạch.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB369')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB369', N'CT061', 5, N'Rót hỗn hợp mật ong chanh vào chảo, hạ lửa vừa và liên tục rưới sốt lên mặt cá.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB370')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB370', N'CT064', 4, N'Chiên gà: Làm nóng 40 ml dầu ăn, cho gà vào chiên ở lửa nhỏ, lật đều hai mặt. Chiên khoảng 10–15 phút đến khi gà vàng giòn rồi lấy ra.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB371')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB371', N'CT063', 3, N'Làm nóng một nửa lượng dầu, cho thịt bò vào xào nhanh trên lửa lớn đến khi vừa săn rồi lấy ra.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB372')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB372', N'CT061', 2, N'Vắt chanh lấy nước, trộn với mật ong và nước tương để tạo hỗn hợp sốt.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB373')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB373', N'CT064', 7, N'Hoàn thiện: Rắc hành lá thái nhỏ rồi tắt bếp. Thành phẩm được mô tả có lớp ngoài vàng, vị chua ngọt nhẹ của cam và sốt sệt bao quanh thịt gà.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB374')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB374', N'CT063', 7, N'Khi thịt bò vừa chín tới, rắc thêm tiêu rồi tắt bếp.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB375')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB375', N'CT064', 5, N'Làm sốt cam: Dùng lại chảo, phi gừng khoảng 1 phút. Cho gà đã chiên vào đảo khoảng 1 phút, sau đó thêm 120 ml nước cam + 1/2 muỗng canh bột ngọt + 1/2 muỗng canh hạt nêm + 1 muỗng canh nước tương + 1 muỗng canh đường.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB376')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB376', N'CT062', 4, N'Làm nóng dầu, cho tỏi vào phi thơm rồi thêm tôm và rang trên lửa vừa đến khi tôm đổi màu.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB377')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB377', N'CT063', 4, N'Cho phần dầu còn lại vào chảo, phi tỏi thơm rồi thêm hành tây và các loại nấm.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB378')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB378', N'CT063', 1, N'Thái thịt bò thành lát mỏng ngang thớ rồi ướp với nước tương và tiêu trong khoảng 10 phút.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB379')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB379', N'CT064', 2, N'Cắt 500 g gà thành miếng vừa ăn. Ướp với 1/2 muỗng canh muối + 1/3 muỗng canh bột tỏi + 1/3 muỗng canh bột hành + 1/3 muỗng canh dầu mè + 60 g bột bắp + 5 g bột nở + 1 lòng trắng trứng. Trộn đều rồi để trong ngăn mát 30–60 phút.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB380')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB380', N'CT062', 1, N'Làm sạch tôm, cắt bớt râu và để thật ráo.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB381')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB381', N'CT063', 2, N'Làm sạch nấm đùi gà và nấm rơm, cắt thành miếng vừa ăn. Thái hành tây và băm nhỏ tỏi.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB382')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB382', N'CT064', 3, N'Chuẩn bị cam: Rửa 2 quả cam vàng, cắt đôi rồi vắt lấy khoảng 120 ml nước cam. Gừng gọt vỏ, băm nhỏ; hành lá rửa sạch và thái nhỏ.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB383')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB383', N'CT062', 2, N'Ngâm me với một ít nước nóng, dằm kỹ rồi lọc lấy phần nước me.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB384')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB384', N'CT062', 3, N'Băm nhỏ tỏi và ớt, cắt nhỏ hành lá.', NULL);
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[BuocCheBien] WHERE [MaBuoc] = N'BCB385')
BEGIN
    INSERT dbo.[BuocCheBien] ([MaBuoc], [MaCongThuc], [ThuTu], [NoiDung], [ThoiGianThucHien])
    VALUES (N'BCB385', N'CT062', 5, N'Cho nước me, nước mắm và đường vào chảo, đảo đều để gia vị hòa tan.', NULL);
END;
UPDATE dbo.CongThuc SET DaCongBo=1 WHERE MaCongThuc IN (N'CT061',N'CT062',N'CT063',N'CT064') AND DaCongBo=0;
IF NOT EXISTS (SELECT 1 FROM dbo.[DoanPhimHuongDan] WHERE [MaDoanPhim] = N'DP001')
BEGIN
    INSERT dbo.[DoanPhimHuongDan] ([MaDoanPhim], [MaCongThuc], [TieuDe], [DuongDan], [MoTa], [ThoiLuong], [TrangThaiSuDung], [NgayCapNhat])
    VALUES (N'DP001', N'CT001', N'Video hướng dẫn món Phở bò viên.', N'https://youtu.be/A4pluPQW8s4?si=pdlo-6N9GoY3Sx0A', N'Video hướng dẫn chi tiết cách làm món Phở bò viên.', NULL, N'Đang sử dụng', CONVERT(datetime2(3),N'2026-10-07T14:10:14.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[DoanPhimHuongDan] WHERE [MaDoanPhim] = N'DP002')
BEGIN
    INSERT dbo.[DoanPhimHuongDan] ([MaDoanPhim], [MaCongThuc], [TieuDe], [DuongDan], [MoTa], [ThoiLuong], [TrangThaiSuDung], [NgayCapNhat])
    VALUES (N'DP002', N'CT001', N'abc', N'https://www.youtube.com/watch?v=EWHm7YA8Tio', N'abc', NULL, N'Đang sử dụng', CONVERT(datetime2(3),N'2026-10-09T15:42:59.000',126));
END;

IF NOT EXISTS (SELECT 1 FROM dbo.[DoanPhimHuongDan] WHERE [MaDoanPhim] = N'DP003')
BEGIN
    INSERT dbo.[DoanPhimHuongDan] ([MaDoanPhim], [MaCongThuc], [TieuDe], [DuongDan], [MoTa], [ThoiLuong], [TrangThaiSuDung], [NgayCapNhat])
    VALUES (N'DP003', N'CT001', N'abc', N'https://youtu.be/WAC2UgTTifo?si=mBgZW2dtFOCOPkx5', N'abc', NULL, N'Đang sử dụng', CONVERT(datetime2(3),N'2026-10-09T16:10:30.000',126));
END;

IF (SELECT COUNT(*) FROM dbo.NguoiDung) <> 9 THROW 55001,N'Seed dữ liệu: số tài khoản không bằng 9.',1;
IF (SELECT COUNT(*) FROM dbo.MonAn) <> 65 THROW 55002,N'Seed dữ liệu: số món không bằng 65.',1;
IF (SELECT COUNT(*) FROM dbo.CongThuc) <> 64 THROW 55003,N'Seed dữ liệu: số công thức không bằng 64.',1;
IF (SELECT COUNT(*) FROM dbo.NguyenLieu) <> 100 THROW 55004,N'Seed dữ liệu: số nguyên liệu không bằng 100.',1;
IF (SELECT COUNT(*) FROM dbo.ThongTinDinhDuong) <> 90 THROW 55005,N'Seed dữ liệu: số bản ghi dinh dưỡng không bằng 90.',1;
IF (SELECT COUNT(*) FROM dbo.DoanPhimHuongDan) <> 3 THROW 55006,N'Seed dữ liệu: số video không bằng 3.',1;
    COMMIT TRANSACTION;
    PRINT N'Đã nạp đủ dữ liệu CookHub cũ: 9 tài khoản, 65 món, 64 công thức, 100 nguyên liệu, 90 dinh dưỡng, 3 video.';
END TRY
BEGIN CATCH
    IF XACT_STATE() <> 0 ROLLBACK TRANSACTION;
    THROW;
END CATCH;
GO
