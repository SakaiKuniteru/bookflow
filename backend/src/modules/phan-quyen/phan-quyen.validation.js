const { AppError } = require('../../common/errors/AppError.js');

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const PHAM_VI = ['DON_VI', 'CHI_NHANH', 'CA_NHAN'];

function loiDuLieu(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}

function kiemTraTruong(body, cacTruong) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu không hợp lệ');
    if (Object.keys(body).some(ten => !cacTruong.includes(ten))) throw loiDuLieu('Dữ liệu có trường không được phép');
}

function chuoiHopLe(value, ten, min, max) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw loiDuLieu(`${ten} không hợp lệ`);
    return value.trim();
}

function uuidHopLe(value, ten = 'ID') {
    if (typeof value !== 'string' || !UUID.test(value)) throw loiDuLieu(`${ten} không hợp lệ`);
    return value;
}

function vaiTroMoiHopLe(body) {
    kiemTraTruong(body, ['ma_vai_tro', 'ten_vai_tro', 'mo_ta']);
    const ma_vai_tro = chuoiHopLe(body.ma_vai_tro, 'Mã vai trò', 3, 60).toUpperCase();
    const ten_vai_tro = chuoiHopLe(body.ten_vai_tro, 'Tên vai trò', 3, 120);
    const mo_ta = body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 2000);
    if (!/^[A-Z][A-Z0-9_]{2,59}$/.test(ma_vai_tro)) throw loiDuLieu('Mã vai trò chỉ được chứa chữ hoa, số và dấu gạch dưới');
    if (['QUAN_TRI', 'NHAN_VIEN', 'THU_THU'].includes(ma_vai_tro)) throw loiDuLieu('Mã vai trò này được dành riêng cho hệ thống');
    return { ma_vai_tro, ten_vai_tro, mo_ta };
}

function suaVaiTroHopLe(body) {
    kiemTraTruong(body, ['ten_vai_tro', 'mo_ta']);
    const ten_vai_tro = chuoiHopLe(body.ten_vai_tro, 'Tên vai trò', 3, 120);
    const mo_ta = body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 2000);
    return { ten_vai_tro, mo_ta };
}

function danhSachQuyenHopLe(body) {
    kiemTraTruong(body, ['quyen']);
    if (!Array.isArray(body.quyen) || body.quyen.length > 100) throw loiDuLieu('Danh sách quyền không hợp lệ');
    const daCo = new Set();
    return body.quyen.map(item => {
        kiemTraTruong(item, ['ma_quyen', 'pham_vi']);
        const ma_quyen = chuoiHopLe(item.ma_quyen, 'Mã quyền', 3, 120);
        if (!/^[a-z][a-z0-9_.-]{2,119}$/.test(ma_quyen) || !PHAM_VI.includes(item.pham_vi)) throw loiDuLieu('Mã quyền hoặc phạm vi không hợp lệ');
        const khoa = `${ma_quyen}:${item.pham_vi}`;
        if (daCo.has(khoa)) throw loiDuLieu('Quyền bị trùng trong danh sách');
        daCo.add(khoa);
        return { ma_quyen, pham_vi: item.pham_vi };
    });
}

function ganVaiTroHopLe(body) {
    kiemTraTruong(body, ['vai_tro_id', 'chi_nhanh_id']);
    return {
        vai_tro_id: uuidHopLe(body.vai_tro_id, 'Vai trò'),
        chi_nhanh_id: body.chi_nhanh_id == null ? null : uuidHopLe(body.chi_nhanh_id, 'Chi nhánh')
    };
}

module.exports = { uuidHopLe, vaiTroMoiHopLe, suaVaiTroHopLe, danhSachQuyenHopLe, ganVaiTroHopLe };