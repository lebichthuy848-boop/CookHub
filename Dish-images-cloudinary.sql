USE QuanLyThucDon;
GO
-- Public Cloudinary delivery URLs for the 26 supplied dish images.
-- Only fill empty image fields; keep any image chosen by an administrator.
UPDATE dish
SET DuongDanAnh = supplied.Url
FROM dbo.MonAn AS dish
JOIN (VALUES
    (N'MA102', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672866/cookhub/mon-an/MA102.png'),
    (N'MA103', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672868/cookhub/mon-an/MA103.png'),
    (N'MA105', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672870/cookhub/mon-an/MA105.png'),
    (N'MA106', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672872/cookhub/mon-an/MA106.png'),
    (N'MA107', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672874/cookhub/mon-an/MA107.png'),
    (N'MA108', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672876/cookhub/mon-an/MA108.png'),
    (N'MA110', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672878/cookhub/mon-an/MA110.png'),
    (N'MA201', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672880/cookhub/mon-an/MA201.png'),
    (N'MA202', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672882/cookhub/mon-an/MA202.png'),
    (N'MA203', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672884/cookhub/mon-an/MA203.png'),
    (N'MA204', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672886/cookhub/mon-an/MA204.png'),
    (N'MA205', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672888/cookhub/mon-an/MA205.png'),
    (N'MA206', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672818/cookhub/mon-an/MA206.png'),
    (N'MA207', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672891/cookhub/mon-an/MA207.png'),
    (N'MA208', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672893/cookhub/mon-an/MA208.png'),
    (N'MA209', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672895/cookhub/mon-an/MA209.png'),
    (N'MA210', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672897/cookhub/mon-an/MA210.png'),
    (N'MA211', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672899/cookhub/mon-an/MA211.png'),
    (N'MA212', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672901/cookhub/mon-an/MA212.png'),
    (N'MA213', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672903/cookhub/mon-an/MA213.png'),
    (N'MA214', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672904/cookhub/mon-an/MA214.png'),
    (N'MA215', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672906/cookhub/mon-an/MA215.png'),
    (N'MA216', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672908/cookhub/mon-an/MA216.png'),
    (N'MA217', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672910/cookhub/mon-an/MA217.png'),
    (N'MA218', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672912/cookhub/mon-an/MA218.png'),
    (N'MA219', N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793672914/cookhub/mon-an/MA219.png')
) AS supplied(MaMonAn, Url) ON supplied.MaMonAn = dish.MaMonAn
WHERE dish.DuongDanAnh IS NULL OR LTRIM(RTRIM(dish.DuongDanAnh)) = N'';
GO

-- Reuse the existing Cloudinary image for Canh chua ca loc.
UPDATE dbo.MonAn SET DuongDanAnh=N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1792714190/cookhub/mon-an/canh-chua-ca-loc.jpg'
WHERE MaMonAn=N'MA104' AND (DuongDanAnh IS NULL OR LTRIM(RTRIM(DuongDanAnh))=N'');
GO

-- Images supplied after the initial Cloudinary import.
UPDATE dbo.MonAn SET DuongDanAnh=N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793673454/cookhub/mon-an/MA101.png'
WHERE MaMonAn=N'MA101' AND (DuongDanAnh IS NULL OR LTRIM(RTRIM(DuongDanAnh))=N'');
UPDATE dbo.MonAn SET DuongDanAnh=N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793673456/cookhub/mon-an/MA109.png'
WHERE MaMonAn=N'MA109' AND (DuongDanAnh IS NULL OR LTRIM(RTRIM(DuongDanAnh))=N'');
UPDATE dbo.MonAn SET DuongDanAnh=N'https://res.cloudinary.com/ncpoysfj/image/upload/f_auto,q_auto/v1793673459/cookhub/mon-an/MA230.png'
WHERE MaMonAn=N'MA230' AND (DuongDanAnh IS NULL OR DuongDanAnh=N'images/pho-bo-card-stretched.jpg');
GO
