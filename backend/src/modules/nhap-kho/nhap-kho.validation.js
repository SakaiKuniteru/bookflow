const { AppError } = require('../../common/errors/AppError.js');
function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function idHopLe(value, ten = 'ID') {
    const id = Number(value);
    if (!(typeof value === 'number' && Number.isInteger(value) || typeof value === 'string' && /^[1-9]\d*$/.test(value)) || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw loi(`${ten} không hợp lệ`);
    return id;
}
function soNguyen(value, ten, min = 0) {
    if (!Number.isSafeInteger(value) || value < min) throw loi(`${ten} phải là số nguyên từ ${min}`);
    return value;
}
function kiemTraBody(body, truong, batBuoc = []) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu phải là object');
    for (const ten of Object.keys(body)) if (!truong.includes(ten)) throw loi(`Trường ${ten} không được phép`);
    for (const ten of batBuoc) if (body[ten] == null || body[ten] === '') throw loi(`${ten} là bắt buộc`);
    return body;
}
function chuoi(value, ten, max = 2000) {
    if (value == null) return null;
    if (typeof value !== 'string' || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim() || null;
}
function ngay(value, ten) {
    if (value == null) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`)) || new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) !== value) throw loi(`${ten} phải có định dạng yyyy-mm-dd`);
    return value;
}
function phieuMoiHopLe(body) {
    kiemTraBody(body, ['kho_id', 'nha_cung_cap_id', 'loai_nhap', 'ngay_nhap', 'so_chung_tu', 'ngay_chung_tu', 'ghi_chu'], ['kho_id']);
    const loai = body.loai_nhap ?? 'NHA_CUNG_CAP';
    if (!['NHA_CUNG_CAP', 'KHAC'].includes(loai)) throw loi('Loại nhập không hợp lệ');
    if (loai === 'NHA_CUNG_CAP' && body.nha_cung_cap_id == null) throw loi('Nhập từ nhà cung cấp phải chọn nhà cung cấp');
    return { kho_id: idHopLe(body.kho_id, 'Kho'), nha_cung_cap_id: body.nha_cung_cap_id == null ? null : idHopLe(body.nha_cung_cap_id, 'Nhà cung cấp'), loai_nhap: loai, ngay_nhap: ngay(body.ngay_nhap, 'Ngày nhập'), so_chung_tu: chuoi(body.so_chung_tu, 'Số chứng từ', 100), ngay_chung_tu: ngay(body.ngay_chung_tu, 'Ngày chứng từ'), ghi_chu: chuoi(body.ghi_chu, 'Ghi chú', 20000) };
}
function phieuSuaHopLe(body) {
    kiemTraBody(body, ['nha_cung_cap_id', 'loai_nhap', 'ngay_nhap', 'so_chung_tu', 'ngay_chung_tu', 'ghi_chu']);
    if (!Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const data = {};
    for (const [ten, value] of Object.entries(body)) {
        if (ten === 'nha_cung_cap_id') data[ten] = value == null ? null : idHopLe(value, 'Nhà cung cấp');
        else if (ten === 'loai_nhap') {
            if (!['NHA_CUNG_CAP', 'KHAC'].includes(value)) throw loi('Loại nhập không hợp lệ');
            data[ten] = value;
        } else if (ten === 'ngay_nhap' || ten === 'ngay_chung_tu') data[ten] = ngay(value, ten);
        else data[ten] = chuoi(value, ten, ten === 'ghi_chu' ? 20000 : 100);
    }
    return data;
}
function chiTietHopLe(body, tao = false) {
    const truong = tao ? ['phien_ban_sach_id', 'vi_tri_kho_id', 'so_luong_du_kien', 'don_gia_nhap', 'ghi_chu'] : ['vi_tri_kho_id', 'so_luong_du_kien', 'don_gia_nhap', 'ghi_chu'];
    kiemTraBody(body, truong, tao ? ['phien_ban_sach_id', 'so_luong_du_kien'] : []);
    if (!Object.keys(body).length) throw loi('Không có dữ liệu');
    const data = {};
    for (const [ten, value] of Object.entries(body)) {
        if (ten === 'phien_ban_sach_id') data[ten] = idHopLe(value, 'Phiên bản sách');
        else if (ten === 'vi_tri_kho_id') data[ten] = value == null ? null : idHopLe(value, 'Vị trí kho');
        else if (ten === 'so_luong_du_kien') data[ten] = soNguyen(value, 'Số lượng dự kiến', 1);
        else if (ten === 'don_gia_nhap') {
            if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100) throw loi('Đơn giá nhập không hợp lệ');
            data[ten] = value;
        } else data[ten] = chuoi(value, 'Ghi chú', 20000);
    }
    return data;
}
function kiemNhanHopLe(body) {
    kiemTraBody(body, ['so_luong_dat', 'so_luong_loi', 'ghi_chu'], ['so_luong_dat', 'so_luong_loi']);
    return { so_luong_dat: soNguyen(body.so_luong_dat, 'Số lượng đạt'), so_luong_loi: soNguyen(body.so_luong_loi, 'Số lượng lỗi'), ghi_chu: chuoi(body.ghi_chu, 'Ghi chú', 20000) };
}
function boLocHopLe(query = {}) {
    kiemTraBody(query, ['trang', 'kich_thuoc', 'tu_khoa', 'trang_thai', 'kho_id', 'nha_cung_cap_id', 'tu_ngay', 'den_ngay']);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.trang_thai && !['NHAP', 'DANG_KIEM_NHAN', 'DA_XAC_NHAN', 'DA_HUY'].includes(query.trang_thai)) throw loi('Trạng thái không hợp lệ');
    const tuNgay = ngay(query.tu_ngay, 'Từ ngày');
    const denNgay = ngay(query.den_ngay, 'Đến ngày');
    if (tuNgay && denNgay && tuNgay > denNgay) throw loi('Từ ngày không được lớn hơn đến ngày');
    return { trang, kich_thuoc: kichThuoc, tu_khoa: chuoi(query.tu_khoa, 'Từ khóa', 120), trang_thai: query.trang_thai ?? null, kho_id: query.kho_id == null ? null : idHopLe(query.kho_id, 'Kho'), nha_cung_cap_id: query.nha_cung_cap_id == null ? null : idHopLe(query.nha_cung_cap_id, 'Nhà cung cấp'), tu_ngay: tuNgay, den_ngay: denNgay };
}
module.exports = { loi, idHopLe, phieuMoiHopLe, phieuSuaHopLe, chiTietHopLe, kiemNhanHopLe, boLocHopLe };