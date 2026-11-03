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
BEGIN
    PRINT N'Bỏ qua khối kiểm thử bộ sưu tập: database mới chưa có tài khoản với 2 món yêu thích.';
    RETURN;
END;

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

-- Đồng bộ bộ cấp mã sau toàn bộ dữ liệu mẫu. Các mã được chèn trực tiếp ở
-- những phần cuối file có thể lớn hơn SoHienTai đã khởi tạo trước đó.
USE QuanLyThucDon;
GO
DECLARE @LoaiMa SYSNAME, @TenBang SYSNAME, @TenCot SYSNAME, @TienTo NVARCHAR(10),
        @MaxMa BIGINT, @Sql NVARCHAR(MAX);
DECLARE cap_ma CURSOR LOCAL FAST_FORWARD FOR
    SELECT LoaiMa, TenBang, TenCot, TienTo FROM dbo.QuyUocMaHeThong;
OPEN cap_ma;
FETCH NEXT FROM cap_ma INTO @LoaiMa, @TenBang, @TenCot, @TienTo;
WHILE @@FETCH_STATUS = 0
BEGIN
    IF EXISTS (SELECT 1 FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id
               WHERE t.schema_id=SCHEMA_ID(N'dbo') AND t.name=@TenBang AND c.name=@TenCot)
    BEGIN
        SET @MaxMa = NULL;
        SET @Sql = N'SELECT @MaxMa=MAX(TRY_CONVERT(BIGINT,SUBSTRING('
                 + QUOTENAME(@TenCot) + N',LEN(@TienTo)+1,20))) FROM dbo.'
                 + QUOTENAME(@TenBang) + N' WHERE LEFT('
                 + QUOTENAME(@TenCot) + N',LEN(@TienTo))=@TienTo';
        EXEC sys.sp_executesql @Sql, N'@TienTo NVARCHAR(10), @MaxMa BIGINT OUTPUT',
             @TienTo=@TienTo, @MaxMa=@MaxMa OUTPUT;
        UPDATE dbo.QuyUocMaHeThong SET SoHienTai=@MaxMa
        WHERE LoaiMa=@LoaiMa AND @MaxMa>SoHienTai;
    END;
    FETCH NEXT FROM cap_ma INTO @LoaiMa, @TenBang, @TenCot, @TienTo;
END;
CLOSE cap_ma;
DEALLOCATE cap_ma;
GO

-- Dữ liệu dinh dưỡng bổ sung cho máy mới: giá trị tham khảo/ước tính trên 100 g.
-- Không ghi đè giá trị dinh dưỡng hoặc quy đổi đã có trong database.
USE QuanLyThucDon;
GO
SET XACT_ABORT ON;
BEGIN TRANSACTION;
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL091')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD091',N'NL091',100.00,N'DVT001',884.00,0.00,0.00,100.00,0.00,0.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL092')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD092',N'NL092',100.00,N'DVT001',341.00,10.41,79.12,1.04,15.20,73.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL093')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD093',N'NL093',100.00,N'DVT001',53.00,0.00,27.70,0.00,0.20,10600.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL094')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD094',N'NL094',100.00,N'DVT001',53.00,8.14,4.93,0.57,0.80,5493.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL095')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD095',N'NL095',100.00,N'DVT001',47.00,0.94,11.75,0.12,2.40,0.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL096')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD096',N'NL096',100.00,N'DVT001',0.00,0.00,0.00,0.00,0.00,12300.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL097')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD097',N'NL097',100.00,N'DVT001',267.00,16.66,18.01,13.88,0.00,23875.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL098')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD098',N'NL098',100.00,N'DVT001',52.00,10.90,0.73,0.17,0.00,166.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL099')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD099',N'NL099',100.00,N'DVT001',331.00,16.55,72.73,0.73,9.00,60.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL100')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD100',N'NL100',100.00,N'DVT001',27.00,2.86,4.67,0.42,3.20,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL101')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD101',N'NL101',100.00,N'DVT001',15.00,1.10,2.40,0.50,1.60,498.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL102')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD102',N'NL102',100.00,N'DVT001',371.00,62.44,0.00,13.44,0.00,200.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL103')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD103',N'NL103',100.00,N'DVT001',37.00,2.66,7.81,0.29,2.70,3.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL104')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD104',N'NL104',100.00,N'DVT001',92.00,2.50,19.79,0.30,2.40,1338.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL105')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD105',N'NL105',100.00,N'DVT001',36.00,2.52,3.53,1.20,0.00,143.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL106')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD106',N'NL106',100.00,N'DVT001',215.00,18.60,0.00,15.06,0.00,70.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL107')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD107',N'NL107',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL108')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD108',N'NL108',100.00,N'DVT001',74.00,2.60,17.23,0.10,4.90,40.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL109')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD109',N'NL109',100.00,N'DVT001',161.00,9.50,29.50,0.50,0.80,13.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL110')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD110',N'NL110',100.00,N'DVT001',367.00,7.54,76.25,3.20,3.60,5.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL111')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD111',N'NL111',100.00,N'DVT001',158.00,13.05,0.41,11.09,0.00,141.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL112')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD112',N'NL112',100.00,N'DVT001',118.00,1.53,27.88,0.17,4.10,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL113')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD113',N'NL113',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL114')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD114',N'NL114',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL115')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD115',N'NL115',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL116')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD116',N'NL116',100.00,N'DVT001',349.00,14.26,77.06,0.39,13.00,298.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL117')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD117',N'NL117',100.00,N'DVT001',38.00,0.80,8.30,0.20,0.70,33.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL118')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD118',N'NL118',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL119')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD119',N'NL119',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL120')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD120',N'NL120',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL121')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD121',N'NL121',100.00,N'DVT001',72.00,1.40,17.51,0.20,1.50,50.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL122')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD122',N'NL122',100.00,N'DVT001',286.00,4.90,74.00,0.40,3.00,48.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL123')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD123',N'NL123',100.00,N'DVT001',19.00,0.72,3.71,0.20,1.10,105.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL124')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD124',N'NL124',100.00,N'DVT001',16.00,0.90,2.80,0.20,1.10,53.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL125')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD125',N'NL125',100.00,N'DVT001',22.00,3.09,3.26,0.34,1.00,5.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL126')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD126',N'NL126',100.00,N'DVT001',36.00,2.52,3.53,1.20,0.00,143.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL127')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD127',N'NL127',100.00,N'DVT001',87.00,18.06,0.04,1.08,0.00,293.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL128')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD128',N'NL128',100.00,N'DVT001',69.00,12.06,3.18,0.49,0.00,392.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL129')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD129',N'NL129',100.00,N'DVT001',306.00,6.21,80.88,0.30,7.70,102.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL130')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD130',N'NL130',100.00,N'DVT001',296.00,9.58,75.37,0.99,11.50,13.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL131')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD131',N'NL131',100.00,N'DVT001',387.00,0.00,99.98,0.00,0.00,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL132')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD132',N'NL132',100.00,N'DVT001',51.00,1.35,10.92,0.25,0.30,2733.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL133')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD133',N'NL133',100.00,N'DVT001',446.00,36.49,30.16,19.94,9.30,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL134')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD134',N'NL134',100.00,N'DVT001',23.00,2.13,3.67,0.52,2.80,46.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL135')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD135',N'NL135',100.00,N'DVT001',14.00,1.10,2.63,0.10,1.40,16.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL136')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD136',N'NL136',100.00,N'DVT001',40.00,1.87,8.81,0.44,1.50,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL137')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD137',N'NL137',100.00,N'DVT001',23.00,2.13,3.67,0.52,2.80,46.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL138')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD138',N'NL138',100.00,N'DVT001',44.00,3.29,8.41,0.73,6.80,30.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL139')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD139',N'NL139',100.00,N'DVT001',44.00,3.29,8.41,0.73,6.80,30.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL140')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD140',N'NL140',100.00,N'DVT001',182.00,20.27,0.00,10.63,0.00,73.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL141')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD141',N'NL141',100.00,N'DVT001',134.00,0.50,5.00,0.00,0.00,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL142')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD142',N'NL142',100.00,N'DVT001',33.00,1.93,7.45,0.19,3.20,7.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL143')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD143',N'NL143',100.00,N'DVT001',185.00,12.81,1.45,13.77,0.00,146.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL144')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD144',N'NL144',100.00,N'DVT001',364.00,10.33,76.31,0.98,2.70,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL145')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD145',N'NL145',100.00,N'DVT001',362.00,8.20,78.03,0.86,1.70,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL146')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD146',N'NL146',100.00,N'DVT001',381.00,0.26,91.27,0.05,0.90,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL147')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD147',N'NL147',100.00,N'DVT001',362.00,8.20,78.80,1.60,0.60,33.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL148')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD148',N'NL148',100.00,N'DVT001',43.00,1.61,9.56,0.17,2.80,78.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL149')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD149',N'NL149',100.00,N'DVT001',884.00,0.00,0.00,100.00,0.00,0.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL150')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD150',N'NL150',100.00,N'DVT001',387.00,0.00,99.98,0.00,0.00,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL151')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD151',N'NL151',100.00,N'DVT001',380.00,0.12,98.09,0.00,0.00,28.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL152')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD152',N'NL152',100.00,N'DVT001',335.00,85.60,0.00,0.10,0.00,196.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL153')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD153',N'NL153',100.00,N'DVT001',579.00,21.15,21.55,49.93,12.50,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL154')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD154',N'NL154',100.00,N'DVT001',322.00,15.86,3.59,26.54,0.00,48.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL155')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD155',N'NL155',100.00,N'DVT001',52.00,10.90,0.73,0.17,0.00,166.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL156')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD156',N'NL156',100.00,N'DVT001',325.00,40.44,41.22,7.61,26.90,51.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL157')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD157',N'NL157',100.00,N'DVT001',351.00,0.16,86.09,0.06,0.50,10.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL158')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD158',N'NL158',100.00,N'DVT001',0.00,0.00,0.00,0.00,0.00,27360.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL159')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD159',N'NL159',100.00,N'DVT001',296.00,9.58,75.37,0.99,11.50,13.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL160')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD160',N'NL160',100.00,N'DVT001',23.00,2.13,3.67,0.52,2.80,46.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL161')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD161',N'NL161',100.00,N'DVT001',299.00,3.30,79.32,0.25,4.50,26.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL162')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD162',N'NL162',100.00,N'DVT001',51.00,0.39,13.60,0.05,0.20,6.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL163')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD163',N'NL163',100.00,N'DVT001',0.00,0.00,0.00,0.00,0.00,0.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL164')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD164',N'NL164',100.00,N'DVT001',250.00,0.00,0.10,0.00,0.00,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL165')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD165',N'NL165',100.00,N'DVT001',147.00,1.47,27.09,5.33,3.80,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL166')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD166',N'NL166',100.00,N'DVT001',496.00,26.32,38.42,26.71,0.00,371.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL167')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD167',N'NL167',100.00,N'DVT001',63.50,0.04,15.21,0.01,0.15,1.50);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL168')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD168',N'NL168',100.00,N'DVT001',236.00,17.18,0.00,17.99,0.00,65.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL169')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD169',N'NL169',100.00,N'DVT001',143.00,12.56,0.72,9.51,0.00,142.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL170')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD170',N'NL170',100.00,N'DVT001',288.00,0.06,12.65,0.06,0.00,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL171')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD171',N'NL171',100.00,N'DVT001',340.00,2.84,2.84,36.08,0.00,27.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL172')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD172',N'NL172',100.00,N'DVT001',60.00,0.82,14.98,0.38,1.60,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL173')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD173',N'NL173',100.00,N'DVT001',381.00,7.80,90.50,0.00,0.00,466.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL174')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD174',N'NL174',100.00,N'DVT001',381.00,7.80,90.50,0.00,0.00,466.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL175')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD175',N'NL175',100.00,N'DVT001',354.00,3.33,15.23,33.49,9.00,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL176')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD176',N'NL176',100.00,N'DVT001',329.00,19.87,62.90,0.53,12.70,5.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL177')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD177',N'NL177',100.00,N'DVT001',446.00,36.49,30.16,19.94,9.30,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL178')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD178',N'NL178',100.00,N'DVT001',335.00,85.60,0.00,0.10,0.00,196.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL179')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD179',N'NL179',100.00,N'DVT001',579.00,21.15,21.55,49.93,12.50,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL180')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD180',N'NL180',100.00,N'DVT001',298.00,12.37,54.99,17.77,41.90,35.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL181')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD181',N'NL181',100.00,N'DVT001',36.00,2.97,6.33,0.79,3.30,56.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL182')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD182',N'NL182',100.00,N'DVT001',57.00,0.36,15.23,0.14,3.10,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL183')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD183',N'NL183',100.00,N'DVT001',0.00,0.00,0.00,0.00,0.00,4.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL184')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD184',N'NL184',100.00,N'DVT001',0.00,0.00,0.00,0.00,0.00,4.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL185')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD185',N'NL185',100.00,N'DVT001',1.10,0.23,0.13,0.01,0.05,4.10);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL186')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD186',N'NL186',100.00,N'DVT001',3.60,0.30,0.63,0.08,0.33,5.60);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL187')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD187',N'NL187',100.00,N'DVT001',321.00,7.91,54.40,8.70,0.00,127.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL188')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD188',N'NL188',100.00,N'DVT001',281.00,4.72,72.52,0.50,6.00,5.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL189')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD189',N'NL189',100.00,N'DVT001',45.00,0.70,9.60,0.40,1.10,13.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL230')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD190',N'NL230',100.00,N'DVT001',143.00,3.20,31.70,0.40,0.00,31.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL232')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD191',N'NL232',100.00,N'DVT001',182.00,20.27,0.00,10.63,0.00,73.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL233')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD192',N'NL233',100.00,N'DVT001',298.00,12.37,54.99,17.77,41.90,35.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL238')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD193',N'NL238',100.00,N'DVT001',13.00,1.50,2.18,0.20,1.00,65.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL239')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD194',N'NL239',100.00,N'DVT001',322.00,4.50,58.00,0.00,13.30,7203.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL240')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD195',N'NL240',100.00,N'DVT001',251.00,10.39,63.95,3.26,25.30,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL301')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD196',N'NL301',100.00,N'DVT001',364.00,10.33,76.31,0.98,2.70,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL302')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD197',N'NL302',100.00,N'DVT001',16.00,1.20,3.23,0.20,1.20,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL303')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD198',N'NL303',100.00,N'DVT001',89.00,1.09,22.84,0.33,2.60,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL304')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD199',N'NL304',100.00,N'DVT001',38.00,0.72,8.82,0.09,4.90,4.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL305')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD200',N'NL305',100.00,N'DVT001',347.00,23.86,62.62,1.15,16.30,15.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL306')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD201',N'NL306',100.00,N'DVT001',354.00,3.33,15.23,33.49,9.00,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL307')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD202',N'NL307',100.00,N'DVT001',30.00,0.61,7.55,0.15,0.40,1.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL308')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD203',N'NL308',100.00,N'DVT001',34.00,0.84,8.16,0.19,0.90,16.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL309')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD204',N'NL309',100.00,N'DVT001',34.00,0.84,8.16,0.19,0.90,16.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL310')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD205',N'NL310',100.00,N'DVT001',36.00,0.54,9.09,0.14,0.80,18.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL311')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD206',N'NL311',100.00,N'DVT001',61.00,1.50,14.15,0.30,1.80,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL312')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD207',N'NL312',100.00,N'DVT001',267.00,16.66,18.01,13.88,0.00,23875.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL313')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD208',N'NL313',100.00,N'DVT001',114.00,1.80,26.50,0.10,1.20,10.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL314')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD209',N'NL314',100.00,N'DVT001',95.00,1.72,23.25,0.64,1.50,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL315')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD210',N'NL315',100.00,N'DVT001',34.00,2.24,6.79,0.49,2.50,9.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL316')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD211',N'NL316',100.00,N'DVT001',304.00,10.60,65.00,0.20,7.00,70.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL317')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD212',N'NL317',100.00,N'DVT001',69.00,0.72,18.10,0.16,0.90,2.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL318')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD213',N'NL318',100.00,N'DVT001',19.00,0.72,3.71,0.20,1.10,105.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL319')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD214',N'NL319',100.00,N'DVT001',23.00,2.13,3.67,0.52,2.80,46.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL320')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD215',N'NL320',100.00,N'DVT001',27.00,1.70,6.20,0.10,3.60,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL321')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD216',N'NL321',100.00,N'DVT001',61.00,3.15,4.78,3.27,0.00,43.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL322')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD217',N'NL322',100.00,N'DVT001',85.00,20.10,0.00,0.51,0.00,119.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL323')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD218',N'NL323',100.00,N'DVT001',251.00,10.39,63.95,3.26,25.30,20.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL324')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD219',N'NL324',100.00,N'DVT001',291.00,9.80,57.90,1.50,1.80,572.00);
IF NOT EXISTS (SELECT 1 FROM dbo.ThongTinDinhDuong WHERE MaNguyenLieu=N'NL325')
    INSERT INTO dbo.ThongTinDinhDuong (MaThongTin,MaNguyenLieu,KhoiLuongChuan,MaDonVi,NangLuong,ChatDam,ChatBotDuong,ChatBeo,ChatXo,natri)
    VALUES (N'DD220',N'NL325',100.00,N'DVT001',322.00,4.50,58.00,0.00,13.30,7203.00);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL008' AND MaDonVi=N'DVT009')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD032',N'NL008',N'DVT009',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL029' AND MaDonVi=N'DVT009')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD033',N'NL029',N'DVT009',100.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL035' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD034',N'NL035',N'DVT005',120.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL036' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD035',N'NL036',N'DVT005',80.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL048' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD036',N'NL048',N'DVT005',150.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL049' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD037',N'NL049',N'DVT005',25.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL049' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD038',N'NL049',N'DVT007',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL050' AND MaDonVi=N'DVT008')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD039',N'NL050',N'DVT008',100.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL050' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD040',N'NL050',N'DVT011',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL052' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD041',N'NL052',N'DVT011',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL054' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD042',N'NL054',N'DVT005',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL055' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD043',N'NL055',N'DVT006',2.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL062' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD044',N'NL062',N'DVT006',15.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL065' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD045',N'NL065',N'DVT005',12.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL067' AND MaDonVi=N'DVT015')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD046',N'NL067',N'DVT015',200.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL069' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD047',N'NL069',N'DVT014',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD048',N'NL073',N'DVT006',15.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL073' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD049',N'NL073',N'DVT014',1.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL075' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD050',N'NL075',N'DVT006',7.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL076' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD051',N'NL076',N'DVT007',7.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL091' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD052',N'NL091',N'DVT006',14.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL092' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD053',N'NL092',N'DVT006',7.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL093' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD054',N'NL093',N'DVT007',4.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL095' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD055',N'NL095',N'DVT005',130.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL096' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD056',N'NL096',N'DVT006',15.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL097' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD057',N'NL097',N'DVT006',12.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL097' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD058',N'NL097',N'DVT007',4.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL097' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD059',N'NL097',N'DVT014',2.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL098' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD060',N'NL098',N'DVT005',33.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL099' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD061',N'NL099',N'DVT006',8.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL104' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD062',N'NL104',N'DVT006',18.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL111' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD063',N'NL111',N'DVT005',9.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL123' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD064',N'NL123',N'DVT005',300.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL124' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD065',N'NL124',N'DVT005',180.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL125' AND MaDonVi=N'DVT009')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD066',N'NL125',N'DVT009',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL131' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD067',N'NL131',N'DVT006',12.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL132' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD068',N'NL132',N'DVT006',18.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL132' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD069',N'NL132',N'DVT007',6.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL135' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD070',N'NL135',N'DVT005',200.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL135' AND MaDonVi=N'DVT010')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD071',N'NL135',N'DVT010',200.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL136' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD072',N'NL136',N'DVT006',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL137' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD073',N'NL137',N'DVT006',2.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL137' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD074',N'NL137',N'DVT011',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL138' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD075',N'NL138',N'DVT011',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL141' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD076',N'NL141',N'DVT006',15.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL143' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD077',N'NL143',N'DVT005',65.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL146' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD078',N'NL146',N'DVT007',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL148' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD079',N'NL148',N'DVT005',150.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL149' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD080',N'NL149',N'DVT006',14.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL150' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD081',N'NL150',N'DVT014',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL154' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD082',N'NL154',N'DVT005',17.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL155' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD083',N'NL155',N'DVT005',33.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL160' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD084',N'NL160',N'DVT014',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL162' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD085',N'NL162',N'DVT006',15.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL165' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD086',N'NL165',N'DVT005',500.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL169' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD087',N'NL169',N'DVT005',50.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL170' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD088',N'NL170',N'DVT007',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL180' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD089',N'NL180',N'DVT006',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL181' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD090',N'NL181',N'DVT011',10.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL181' AND MaDonVi=N'DVT013')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD091',N'NL181',N'DVT013',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL182' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD092',N'NL182',N'DVT005',170.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL187' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD093',N'NL187',N'DVT007',7.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL230' AND MaDonVi=N'DVT015')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD094',N'NL230',N'DVT015',200.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL233' AND MaDonVi=N'DVT015')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD095',N'NL233',N'DVT015',25.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL238' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD096',N'NL238',N'DVT014',20.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL239' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD097',N'NL239',N'DVT014',3.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL240' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD098',N'NL240',N'DVT014',0.500);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL303' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD099',N'NL303',N'DVT005',100.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL304' AND MaDonVi=N'DVT010')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD100',N'NL304',N'DVT010',250.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL307' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD101',N'NL307',N'DVT005',800.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL308' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD102',N'NL308',N'DVT005',500.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL309' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD103',N'NL309',N'DVT005',500.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL310' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD104',N'NL310',N'DVT005',500.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL312' AND MaDonVi=N'DVT006')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD105',N'NL312',N'DVT006',12.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL317' AND MaDonVi=N'DVT005')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD106',N'NL317',N'DVT005',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL319' AND MaDonVi=N'DVT011')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD107',N'NL319',N'DVT011',5.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL320' AND MaDonVi=N'DVT010')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD108',N'NL320',N'DVT010',250.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL323' AND MaDonVi=N'DVT007')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD109',N'NL323',N'DVT007',2.300);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL324' AND MaDonVi=N'DVT015')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD110',N'NL324',N'DVT015',250.000);
IF NOT EXISTS (SELECT 1 FROM dbo.QuyDoiDonViNguyenLieu WHERE MaNguyenLieu=N'NL325' AND MaDonVi=N'DVT014')
    INSERT INTO dbo.QuyDoiDonViNguyenLieu (MaQuyDoi,MaNguyenLieu,MaDonVi,KhoiLuongQuyDoiGram)
    VALUES (N'QD111',N'NL325',N'DVT014',3.000);
-- Sửa sáu đơn vị công thức cũ được nhập sai (chỉ khi còn đúng giá trị cũ).
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT001',SoLuong=800
WHERE MaThanhPhan=N'TP10301' AND MaDonVi=N'DVT005' AND SoLuong=1;
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT012',SoLuong=5
WHERE MaThanhPhan=N'TP20111' AND MaDonVi=N'DVT010' AND SoLuong=5;
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT001',SoLuong=600
WHERE MaThanhPhan=N'TP10201' AND MaDonVi=N'DVT005' AND SoLuong=2;
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT001',SoLuong=30
WHERE MaThanhPhan=N'TP10202' AND MaDonVi=N'DVT005' AND SoLuong=2;
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT001',SoLuong=75
WHERE MaThanhPhan=N'TP10203' AND MaDonVi=N'DVT005' AND SoLuong=0.5;
UPDATE dbo.ThanhPhanCongThuc SET MaDonVi=N'DVT001',SoLuong=125
WHERE MaThanhPhan=N'TP21805' AND MaDonVi=N'DVT005' AND SoLuong=5;
UPDATE dbo.QuyUocMaHeThong SET SoHienTai=(SELECT MAX(TRY_CONVERT(INT,SUBSTRING(MaThongTin,3,20))) FROM dbo.ThongTinDinhDuong) WHERE LoaiMa=N'ThongTinDinhDuong' AND SoHienTai<(SELECT MAX(TRY_CONVERT(INT,SUBSTRING(MaThongTin,3,20))) FROM dbo.ThongTinDinhDuong);
UPDATE dbo.QuyUocMaHeThong SET SoHienTai=(SELECT MAX(TRY_CONVERT(INT,SUBSTRING(MaQuyDoi,3,20))) FROM dbo.QuyDoiDonViNguyenLieu) WHERE LoaiMa=N'QuyDoiDonViNguyenLieu' AND SoHienTai<(SELECT MAX(TRY_CONVERT(INT,SUBSTRING(MaQuyDoi,3,20))) FROM dbo.QuyDoiDonViNguyenLieu);
COMMIT TRANSACTION;
GO
