"""Legacy table and column names preserved for in-place migration."""
from sqlalchemy import Column, String, Integer, Numeric, Date, DateTime, Text, ForeignKey, Unicode, UnicodeText
from sqlalchemy.orm import relationship
from .database import Base

class NguoiDung(Base):
    __tablename__ = "NguoiDung"
    maNguoiDung = Column(String(50), primary_key=True)
    hoTen = Column(String(150), nullable=True)
    # Giữ tên thuộc tính cũ để các service/API không đổi giao diện,
    # nhưng ánh xạ đúng tên cột SQL Server V2.
    thuDienTu = Column("ThuDienTu", String(150), nullable=False, unique=True)
    matKhauBam = Column("MatKhauBam", String(255), nullable=False)
    vaiTro = Column(String(50), nullable=True)
    trangThai = Column(String(50), nullable=True)


class UserPreferences(Base):
    __tablename__ = "UserPreferences"
    user_id = Column(Unicode(20), ForeignKey("NguoiDung.maNguoiDung", ondelete="CASCADE"), primary_key=True)
    answers = Column(UnicodeText, nullable=False, default='{}')
    completed = Column(Integer, nullable=False, default=0)
    survey_shown = Column(Integer, nullable=False, default=0)

NguoiDung.personalization = relationship(UserPreferences, uselist=False, cascade='all, delete-orphan')

class KhauVi(Base):
    __tablename__ = "KhauVi"
    maKhauVi = Column(String(50), primary_key=True)
    tenKhauVi = Column(String(150), nullable=True)
    moTa = Column(String(500), nullable=True)


class CheDoAn(Base):
    __tablename__ = "CheDoAn"
    maCheDoAn = Column(String(50), primary_key=True)
    tenCheDoAn = Column(String(150), nullable=True)
    moTa = Column(String(500), nullable=True)


class SoThichKhauVi(Base):
    __tablename__ = "SoThichKhauVi"
    maSoThichKhauVi = Column(String(20), primary_key=True)
    maNguoiDung = Column(String(20), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maKhauVi = Column(String(20), ForeignKey("KhauVi.maKhauVi"), nullable=False)


class CheDoAnNguoiDung(Base):
    __tablename__ = "CheDoAnNguoiDung"
    maCheDoAnNguoiDung = Column(String(20), primary_key=True)
    maNguoiDung = Column(String(20), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maCheDoAn = Column(String(20), ForeignKey("CheDoAn.maCheDoAn"), nullable=False)


class DanhMucMonAn(Base):
    __tablename__ = "DanhMucMonAn"
    maDanhMuc = Column(String(50), primary_key=True)
    tenDanhMuc = Column(String(150), nullable=True)
    moTa = Column(String(500), nullable=True)


class NguyenLieu(Base):
    __tablename__ = "NguyenLieu"
    maNguyenLieu = Column(String(50), primary_key=True)
    tenNguyenLieu = Column(String(150), nullable=True)
    moTa = Column(String(500), nullable=True)


class DonViTinh(Base):
    __tablename__ = "DonViTinh"
    maDonVi = Column(String(50), primary_key=True)
    tenDonVi = Column(String(100), nullable=True)
    kyHieu = Column(String(20), nullable=False)
    heSoGramChuan = Column(Numeric(12, 3), nullable=True)


class QuyDoiDonViNguyenLieu(Base):
    __tablename__ = "QuyDoiDonViNguyenLieu"
    maQuyDoi = Column(String(20), primary_key=True)
    maNguyenLieu = Column(String(20), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maDonVi = Column(String(20), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    khoiLuongQuyDoiGram = Column(Numeric(12, 3), nullable=False)


class NganSachAnUong(Base):
    __tablename__ = "NganSachAnUong"
    maNganSach = Column(String(50), primary_key=True)
    maNguoiDung = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    mucNganSach = Column(Numeric(18, 2), nullable=True)
    loaiNganSach = Column(String(50), nullable=True)
    ngayBatDau = Column(Date, nullable=True)
    ngayKetThuc = Column(Date, nullable=True)


class MucTieuDinhDuong(Base):
    __tablename__ = "MucTieuDinhDuong"
    maMucTieu = Column(String(50), primary_key=True)
    maNguoiDung = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False, unique=True)
    nangLuong = Column(Numeric(18, 2), nullable=True)
    chatDam = Column("ChatDam", Numeric(10, 2), nullable=False)
    chatBotDuong = Column("ChatBotDuong", Numeric(10, 2), nullable=False)
    chatBeo = Column(Numeric(18, 2), nullable=True)
    chatXo = Column(Numeric(18, 2), nullable=True)
    natri = Column(Numeric(18, 2), nullable=True)


class NguyenLieuHienCo(Base):
    __tablename__ = "NguyenLieuHienCo"
    maChiTiet = Column(String(50), primary_key=True)
    maNguoiDung = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maNguyenLieu = Column(String(50), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maDonVi = Column(String(50), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    soLuong = Column(Numeric(18, 2), nullable=True)
    ngayCapNhat = Column(Date, nullable=True)


class NguyenLieuThayThe(Base):
    __tablename__ = "NguyenLieuThayThe"
    maThayThe = Column(String(20), primary_key=True)
    maNguyenLieuGoc = Column(String(20), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maNguyenLieuThayThe = Column(String(20), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    tyLeQuyDoi = Column(Numeric(10, 3), nullable=False)


class MonAn(Base):
    __tablename__ = "MonAn"
    maMonAn = Column(String(50), primary_key=True)
    maDanhMuc = Column(String(50), ForeignKey("DanhMucMonAn.maDanhMuc"), nullable=False)
    tenMonAn = Column(String(200), nullable=True)
    moTa = Column(Text, nullable=True)
    thoiGianCheBien = Column(Integer, nullable=True)
    doKho = Column(String(50), nullable=True)
    duongDanAnh = Column("DuongDanAnh", String(500), nullable=True)


class CongThuc(Base):
    __tablename__ = "CongThuc"
    maCongThuc = Column(String(50), primary_key=True)
    maMonAn = Column(String(50), ForeignKey("MonAn.maMonAn"), nullable=False, unique=True)
    moTa = Column(Text, nullable=True)
    soKhauPhanChuan = Column(Integer, nullable=False)
    daCongBo = Column("DaCongBo", Integer, nullable=False, default=0)


class ThanhPhanCongThuc(Base):
    __tablename__ = "ThanhPhanCongThuc"
    maThanhPhan = Column(String(50), primary_key=True)
    maCongThuc = Column(String(50), ForeignKey("CongThuc.maCongThuc"), nullable=False)
    maNguyenLieu = Column(String(50), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maDonVi = Column(String(50), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    soLuong = Column(Numeric(18, 2), nullable=True)


class BuocCheBien(Base):
    __tablename__ = "BuocCheBien"
    maBuoc = Column(String(50), primary_key=True)
    maCongThuc = Column(String(50), ForeignKey("CongThuc.maCongThuc"), nullable=False)
    thuTu = Column(Integer, nullable=True)
    noiDung = Column(Text, nullable=True)
    thoiGianThucHien = Column(Integer, nullable=True)


class DoanPhimHuongDan(Base):
    __tablename__ = "DoanPhimHuongDan"
    maDoanPhim = Column("MaDoanPhim", String(50), primary_key=True)
    maCongThuc = Column(String(50), ForeignKey("CongThuc.maCongThuc"), nullable=False)
    tieuDe = Column(String(200), nullable=True)
    duongDan = Column(String(500), nullable=True)
    moTa = Column(String(500), nullable=True)


class GiaNguyenLieu(Base):
    __tablename__ = "GiaNguyenLieu"
    maGia = Column(String(50), primary_key=True)
    maNguyenLieu = Column(String(50), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maDonVi = Column(String(50), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    giaThamKhao = Column(Numeric(18, 2), nullable=True)
    ngayApDung = Column(Date, nullable=True)
    nguon = Column(String(200), nullable=True)
    khuVuc = Column(String(150), nullable=True)


class ThongTinDinhDuong(Base):
    __tablename__ = "ThongTinDinhDuong"
    maThongTin = Column(String(50), primary_key=True)
    maNguyenLieu = Column(String(50), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False, unique=True)
    khoiLuongChuan = Column(Numeric(10, 2), nullable=False)
    maDonVi = Column(String(20), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    nangLuong = Column(Numeric(10, 2), nullable=False)
    chatDam = Column("ChatDam", Numeric(10, 2), nullable=False)
    chatBotDuong = Column("ChatBotDuong", Numeric(10, 2), nullable=False)
    chatBeo = Column(Numeric(18, 2), nullable=True)
    chatXo = Column(Numeric(18, 2), nullable=True)
    natri = Column(Numeric(18, 2), nullable=True)


class ThucDon(Base):
    __tablename__ = "ThucDon"
    maThucDon = Column(String(50), primary_key=True)
    maNguoiDung = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    tenThucDon = Column(String(200), nullable=True)
    loaiThucDon = Column(String(50), nullable=True)
    ngayBatDau = Column(Date, nullable=True)
    ngayKetThuc = Column(Date, nullable=True)
    trangThai = Column(String(50), nullable=True)


class ChiTietThucDon(Base):
    __tablename__ = "ChiTietThucDon"
    maChiTiet = Column(String(50), primary_key=True)
    maThucDon = Column(String(50), ForeignKey("ThucDon.maThucDon"), nullable=False)
    maMonAn = Column(String(50), ForeignKey("MonAn.maMonAn"), nullable=False)
    ngayDung = Column(Date, nullable=True)
    buaAn = Column(String(50), nullable=True)
    soKhauPhan = Column(Integer, nullable=True)


class TuyBienNguyenLieuThucDon(Base):
    __tablename__ = "TuyBienNguyenLieuThucDon"
    maChiTiet = Column(String(20), ForeignKey("ChiTietThucDon.maChiTiet"), primary_key=True)
    maThanhPhan = Column(String(20), ForeignKey("ThanhPhanCongThuc.maThanhPhan"), primary_key=True)
    maNguyenLieu = Column(String(20), ForeignKey("NguyenLieu.maNguyenLieu"), nullable=False)
    maDonVi = Column(String(20), ForeignKey("DonViTinh.maDonVi"), nullable=False)
    soLuong = Column(Numeric(12, 3), nullable=False)


class DanhGiaMonAn(Base):
    __tablename__ = "DanhGiaMonAn"
    maDanhGia = Column(String(50), primary_key=True)
    maNguoiDung = Column(String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maMonAn = Column(String(50), ForeignKey("MonAn.maMonAn"), nullable=False)
    soSao = Column(Integer, nullable=True)
    noiDung = Column(String(1000), nullable=True)
    ngayDanhGia = Column(Date, nullable=True)
    trangThaiKiemDuyet = Column("TrangThaiKiemDuyet", Unicode(20), nullable=False, default='Chờ duyệt')
    maNguoiKiemDuyet = Column("MaNguoiKiemDuyet", String(50), ForeignKey("NguoiDung.maNguoiDung"), nullable=True)
    ngayKiemDuyet = Column("NgayKiemDuyet", DateTime, nullable=True)
    ghiChuKiemDuyet = Column("GhiChuKiemDuyet", Unicode(500), nullable=True)


class DanhGiaDinhDuongThucDon(Base):
    __tablename__ = "DanhGiaDinhDuongThucDon"
    maDanhGia = Column(String(50), primary_key=True)
    maThucDon = Column(String(50), ForeignKey("ThucDon.maThucDon"), nullable=False)
    tongNangLuong = Column(Numeric(18, 2), nullable=True)
    tongChatDam = Column("TongChatDam", Numeric(18, 2), nullable=True)
    tongChatBotDuong = Column("TongChatBotDuong", Numeric(18, 2), nullable=True)
    tongChatBeo = Column(Numeric(18, 2), nullable=True)
    tongChatXo = Column(Numeric(18, 2), nullable=True)
    tongNatri = Column("TongNatri", Numeric(18, 2), nullable=True)
    tongChiPhi = Column(Numeric(18, 2), nullable=True)
    thoiDiemDanhGia = Column(DateTime, nullable=False)
    khuVuc = Column(String(150), nullable=True)
    duDinhDuong = Column(Integer, nullable=False)
    duGia = Column(Integer, nullable=False)
    ketQua = Column(String(500), nullable=False)
    canhBao = Column(String(1000), nullable=True)
    duLieuTinhJson = Column(Text, nullable=False)
    doiChieuJson = Column(Text, nullable=False)


class PhanHoiCheBien(Base):
    __tablename__ = "PhanHoiCheBien"
    maPhanHoi = Column(String(20), primary_key=True)
    maNguoiDung = Column(String(20), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maCongThuc = Column(String(20), ForeignKey("CongThuc.maCongThuc"), nullable=False)
    thoiDiemNau = Column(DateTime, nullable=False)
    thanhCong = Column(Integer, nullable=False)
    noiDung = Column(Text, nullable=False)


class KhauViMonAn(Base):
    __tablename__ = "KhauViMonAn"
    maKhauViMonAn = Column(String(20), primary_key=True)
    maMonAn = Column(String(20), ForeignKey("MonAn.maMonAn"), nullable=False)
    maKhauVi = Column(String(20), ForeignKey("KhauVi.maKhauVi"), nullable=False)

class CheDoAnMonAn(Base):
    __tablename__ = "CheDoAnMonAn"
    maCheDoAnMonAn = Column(String(20), primary_key=True)
    maMonAn = Column(String(20), ForeignKey("MonAn.maMonAn"), nullable=False)
    maCheDoAn = Column(String(20), ForeignKey("CheDoAn.maCheDoAn"), nullable=False)

class MonYeuThich(Base):
    __tablename__ = "MonYeuThich"
    maMonYeuThich = Column(String(20), primary_key=True)
    maNguoiDung = Column(String(20), ForeignKey("NguoiDung.maNguoiDung"), nullable=False)
    maMonAn = Column(String(20), ForeignKey("MonAn.maMonAn"), nullable=False)
    ngayThem = Column(Date, nullable=False)

class MonKhongThich(Base):
    __tablename__ = "MonKhongThich"
    maNguoiDung = Column(String(20), ForeignKey("NguoiDung.maNguoiDung"), primary_key=True)
    maMonAn = Column(String(20), ForeignKey("MonAn.maMonAn"), primary_key=True)
    ngayThem = Column(DateTime, nullable=False)
