const { loi, id } = require('../chuyen-kho/chuyen-kho.validation.js');
function body(body, choPhep, batBuoc = []) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu phải là object');
    for (const ten of Object.keys(body)) if (!choPhep.includes(ten)) throw loi(`Trường ${ten} không được phép`);
    for (const ten of batBuoc) if (body[ten] == null || body[ten] === '') throw loi(`${ten} là bắt buộc`);
    return body;
}
function tao(bodyInput) {
    body(bodyInput, ['kho_id', 'ly_do', 'ghi_chu'], ['kho_id']);
    return { kho_id: id(bodyInput.kho_id, 'Kho'), ly_do: typeof bodyInput.ly_do === 'string' ? bodyInput.ly_do.trim() : null, ghi_chu: typeof bodyInput.ghi_chu === 'string' ? bodyInput.ghi_chu.trim() : null };
}
function dem(bodyInput) {
    body(bodyInput, ['so_luong_thuc_dem', 'ghi_chu'], ['so_luong_thuc_dem']);
    if (!Number.isSafeInteger(bodyInput.so_luong_thuc_dem) || bodyInput.so_luong_thuc_dem < 0) throw loi('Số lượng thực đếm phải là số nguyên không âm');
    return { so_luong_thuc_dem: bodyInput.so_luong_thuc_dem, ghi_chu: typeof bodyInput.ghi_chu === 'string' ? bodyInput.ghi_chu.trim() : null };
}
function boLoc(query = {}) {
    const trang = query.trang == null ? 1 : id(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : id(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.trang_thai && !['NHAP', 'DANG_KIEM', 'CHO_DUYET', 'DA_DUYET', 'DA_HUY'].includes(query.trang_thai)) throw loi('Trạng thái không hợp lệ');
    return { trang, kich_thuoc: kichThuoc, kho_id: query.kho_id == null ? null : id(query.kho_id, 'Kho'), trang_thai: query.trang_thai ?? null };
}
module.exports = { loi, id, tao, dem, boLoc };