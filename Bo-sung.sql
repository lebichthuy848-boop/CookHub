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