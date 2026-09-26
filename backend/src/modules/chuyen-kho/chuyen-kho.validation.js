const { AppError } = require('../../common/errors/AppError.js');
function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function id(value, ten = 'ID') {
    if (!(typeof value === 'string' && /^[1-9]\d*$/.test(value) || typeof value === 'number' && Number.isSafeInteger(value)) || !Number.isSafeInteger(Number(value)) || Number(value) < 1) throw loi(`${ten} không hợp lệ`);
    return Number(value);
}
function bodyHopLe(body, choPhep, batBuoc = []) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu phải là object');
    for (const ten of Object.keys(body)) if (!choPhep.includes(ten)) throw loi(`Trường ${ten} không được phép`);
    for (const ten of batBuoc) if (body[ten] == null || body[ten] === '') throw loi(`${ten} là bắt buộc`);
    return body;
}
function chuoi(value, ten, max = 2000) {
    if (value == null) return null;
    if (typeof value !== 'string' || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim() || null;
}
function phieu(body) {
    bodyHopLe(body, ['kho_nguon_id', 'kho_dich_id', 'ly_do', 'ghi_chu'], ['kho_nguon_id', 'kho_dich_id']);
    const nguon = id(body.kho_nguon_id, 'Kho nguồn');
    const dich = id(body.kho_dich_id, 'Kho đích');
    if (nguon === dich) throw loi('Kho nguồn và kho đích phải khác nhau');
    return { kho_nguon_id: nguon, kho_dich_id: dich, ly_do: chuoi(body.ly_do, 'Lý do'), ghi_chu: chuoi(body.ghi_chu, 'Ghi chú', 20000) };
}
function chiTiet(body) {
    bodyHopLe(body, ['phien_ban_sach_id', 'vi_tri_nguon_id', 'vi_tri_dich_id', 'so_luong', 'ghi_chu'], ['phien_ban_sach_id', 'so_luong']);
    if (!Number.isSafeInteger(body.so_luong) || body.so_luong < 1) throw loi('Số lượng phải là số nguyên dương');
    return { phien_ban_sach_id: id(body.phien_ban_sach_id, 'Phiên bản sách'), vi_tri_nguon_id: body.vi_tri_nguon_id == null ? null : id(body.vi_tri_nguon_id, 'Vị trí nguồn'), vi_tri_dich_id: body.vi_tri_dich_id == null ? null : id(body.vi_tri_dich_id, 'Vị trí đích'), so_luong: body.so_luong, ghi_chu: chuoi(body.ghi_chu, 'Ghi chú', 20000) };
}
function boLoc(query = {}) {
    const trang = query.trang == null ? 1 : id(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : id(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    const trangThai = query.trang_thai ?? null;
    if (trangThai && !['NHAP', 'DA_XUAT', 'DA_NHAN', 'DA_HUY'].includes(trangThai)) throw loi('Trạng thái không hợp lệ');
    return { trang, kich_thuoc: kichThuoc, trang_thai: trangThai, kho_id: query.kho_id == null ? null : id(query.kho_id, 'Kho') };
}
module.exports = { loi, id, phieu, chiTiet, boLoc };