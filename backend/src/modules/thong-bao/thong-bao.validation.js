const { AppError } = require('../../common/errors/AppError.js');

const KENH = new Set(['IN_APP', 'EMAIL']);
const TRANG_THAI_DOC = new Set(['CHUA_DOC', 'DA_DOC']);

function loi(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}

function idHopLe(value, ten = 'ID') {
    const chuoi = String(value ?? '').trim();
    if (!/^\d+$/.test(chuoi)) throw loi(`${ten} không hợp lệ`);
    try {
        const id = BigInt(chuoi);
        if (id <= 0n || id > 9223372036854775807n) throw new Error();
    } catch {
        throw loi(`${ten} không hợp lệ`);
    }
    return chuoi;
}

function idTaiKhoanHopLe(value, ten = 'Tài khoản') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw loi(`${ten} không hợp lệ`);
    return id;
}

function chuoi(value, ten, max, { batBuoc = false } = {}) {
    if (typeof value !== 'string') {
        if (!batBuoc && (value === null || value === undefined)) return null;
        throw loi(`${ten} phải là chuỗi`);
    }
    const ketQua = value.trim();
    if (batBuoc && !ketQua) throw loi(`${ten} không được để trống`);
    if (ketQua.length > max) throw loi(`${ten} không được vượt quá ${max} ký tự`);
    return ketQua || null;
}

function emailHopLe(value) {
    if (value === null || value === undefined || value === '') return null;
    const email = chuoi(value, 'Email', 254);
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw loi('Email không hợp lệ');
    return email.toLowerCase();
}

function soDienThoaiHopLe(value) {
    if (value === null || value === undefined || value === '') return null;
    const soDienThoai = chuoi(value, 'Số điện thoại', 30);
    if (!/^[0-9+(). -]{9,30}$/.test(soDienThoai)) throw loi('Số điện thoại không hợp lệ');
    return soDienThoai;
}

function maSuKienHopLe(value) {
    const ma = chuoi(value, 'Mã sự kiện', 180, { batBuoc: true });
    if (!/^[A-Za-z0-9._:-]{2,180}$/.test(ma)) throw loi('Mã sự kiện không hợp lệ');
    return ma;
}

function loaiSuKienHopLe(value) {
    const loai = chuoi(value, 'Loại sự kiện', 60, { batBuoc: true }).toUpperCase();
    if (!/^[A-Z0-9_]{2,60}$/.test(loai)) throw loi('Loại sự kiện không hợp lệ');
    return loai;
}

function doiTuongLoaiHopLe(value) {
    if (value === null || value === undefined || value === '') return null;
    const loai = chuoi(value, 'Loại đối tượng', 60);
    if (!/^[A-Z0-9_]{2,60}$/.test(loai)) throw loi('Loại đối tượng không hợp lệ');
    return loai;
}

function duLieuJsonHopLe(value, ten = 'Dữ liệu') {
    if (value === undefined || value === null) return {};
    if (typeof value !== 'object' || Array.isArray(value)) throw loi(`${ten} phải là object`);
    try {
        JSON.stringify(value);
    } catch {
        throw loi(`${ten} không thể chuyển thành JSON`);
    }
    return value;
}

function danhSachHopLe(query = {}) {
    const trang = query.trang === undefined ? 1 : Number(query.trang);
    const kichThuoc = query.kich_thuoc === undefined ? 20 : Number(query.kich_thuoc);
    if (!Number.isSafeInteger(trang) || trang <= 0) throw loi('Trang không hợp lệ');
    if (!Number.isSafeInteger(kichThuoc) || kichThuoc <= 0 || kichThuoc > 100) throw loi('Kích thước trang không hợp lệ');
    const trangThaiDoc = query.trang_thai_doc === undefined ? null : String(query.trang_thai_doc).trim().toUpperCase();
    if (trangThaiDoc && !TRANG_THAI_DOC.has(trangThaiDoc)) throw loi('Trạng thái đọc không hợp lệ');
    const loaiSuKien = query.loai_su_kien === undefined ? null : loaiSuKienHopLe(query.loai_su_kien);
    return { trang, kichThuoc, trangThaiDoc, loaiSuKien };
}

function idThongBaoHopLe(value) {
    return idHopLe(value, 'Thông báo');
}

function duLieuTaoSuKienHopLe(duLieu) {
    if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu)) throw loi('Dữ liệu tạo sự kiện không hợp lệ');
    const maSuKien = maSuKienHopLe(duLieu.ma_su_kien);
    const loaiSuKien = loaiSuKienHopLe(duLieu.loai_su_kien);
    const doiTuongLoai = doiTuongLoaiHopLe(duLieu.doi_tuong_loai);
    const doiTuongId = duLieu.doi_tuong_id == null ? null : idHopLe(duLieu.doi_tuong_id, 'Đối tượng');
    const tieuDe = chuoi(duLieu.tieu_de, 'Tiêu đề', 300, { batBuoc: true });
    const noiDung = chuoi(duLieu.noi_dung, 'Nội dung', 10000, { batBuoc: true });
    const duLieuSuKien = duLieuJsonHopLe(duLieu.du_lieu, 'Dữ liệu sự kiện');
    const email = emailHopLe(duLieu.email);
    const soDienThoai = soDienThoaiHopLe(duLieu.so_dien_thoai);
    const taiKhoanId = duLieu.tai_khoan_id == null ? null : idTaiKhoanHopLe(duLieu.tai_khoan_id);
    return { maSuKien, loaiSuKien, doiTuongLoai, doiTuongId, tieuDe, noiDung, duLieuSuKien, email, soDienThoai, taiKhoanId };
}

function duLieuTaoLichHopLe(duLieu) {
    if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu)) throw loi('Dữ liệu tạo lịch thông báo không hợp lệ');
    const maLich = chuoi(duLieu.ma_lich, 'Mã lịch', 180, { batBuoc: true });
    if (!/^[A-Za-z0-9._:-]{2,180}$/.test(maLich)) throw loi('Mã lịch không hợp lệ');
    const loaiLich = loaiSuKienHopLe(duLieu.loai_lich);
    const taiKhoanId = idTaiKhoanHopLe(duLieu.tai_khoan_id);
    const doiTuongLoai = doiTuongLoaiHopLe(duLieu.doi_tuong_loai);
    if (!doiTuongLoai) throw loi('Phải có loại đối tượng');
    const doiTuongId = idHopLe(duLieu.doi_tuong_id, 'Đối tượng');
    const tieuDe = chuoi(duLieu.tieu_de, 'Tiêu đề', 300, { batBuoc: true });
    const noiDung = chuoi(duLieu.noi_dung, 'Nội dung', 10000, { batBuoc: true });
    const thoiDiemGuiTiep = new Date(duLieu.thoi_diem_gui_tiep);
    if (Number.isNaN(thoiDiemGuiTiep.getTime())) throw loi('Thời điểm gửi không hợp lệ');
    const lapLaiPhut = duLieu.lap_lai_phut == null ? null : Number(duLieu.lap_lai_phut);
    if (lapLaiPhut !== null && (!Number.isSafeInteger(lapLaiPhut) || lapLaiPhut <= 0)) throw loi('Khoảng lặp không hợp lệ');
    const thoiDiemKetThuc = duLieu.thoi_diem_ket_thuc == null ? null : new Date(duLieu.thoi_diem_ket_thuc);
    if (thoiDiemKetThuc && Number.isNaN(thoiDiemKetThuc.getTime())) throw loi('Thời điểm kết thúc không hợp lệ');
    if (thoiDiemKetThuc && thoiDiemKetThuc <= thoiDiemGuiTiep) throw loi('Thời điểm kết thúc phải sau thời điểm gửi');
    const duLieuLich = duLieuJsonHopLe(duLieu.du_lieu, 'Dữ liệu lịch');
    return { maLich, loaiLich, taiKhoanId, doiTuongLoai, doiTuongId, tieuDe, noiDung, thoiDiemGuiTiep, lapLaiPhut, thoiDiemKetThuc, duLieuLich };
}

module.exports = { KENH, idHopLe, idTaiKhoanHopLe, idThongBaoHopLe, danhSachHopLe, duLieuTaoSuKienHopLe, duLieuTaoLichHopLe, emailHopLe, soDienThoaiHopLe };