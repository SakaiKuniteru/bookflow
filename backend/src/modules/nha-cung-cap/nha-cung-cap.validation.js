const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const BANG = Object.freeze({
    nha_cung_cap: { cha: null, khoaCha: null, ma: 'ma_nha_cung_cap', ten: 'ten_nha_cung_cap', xoaMem: true },
    dia_chi_nha_cung_cap: { cha: 'nha_cung_cap', khoaCha: 'nha_cung_cap_id', ma: 'ma_dia_chi' },
    lien_he_nha_cung_cap: { cha: 'nha_cung_cap', khoaCha: 'nha_cung_cap_id' },
    tai_khoan_ngan_hang_nha_cung_cap: { cha: 'nha_cung_cap', khoaCha: 'nha_cung_cap_id' },
    hop_dong_nha_cung_cap: { cha: 'nha_cung_cap', khoaCha: 'nha_cung_cap_id', ma: 'so_hop_dong' },
    nha_cung_cap_phien_ban_sach: { cha: 'nha_cung_cap', khoaCha: 'nha_cung_cap_id' }
});
function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function idHopLe(value, ten = 'ID') {
    const dung = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dung || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loi(`${ten} không hợp lệ`);
    return id;
}
function bangHopLe(value) {
    if (!Object.hasOwn(BANG, value)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
    return BANG[value];
}
function duLieuHopLe(body, { tao = false, bang = 'nha_cung_cap' } = {}) {
    const cauHinh = bangHopLe(bang);
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu phải là object');
    if (!Object.keys(body).length) throw loi('Không có dữ liệu');
    const cam = new Set(['id', 'don_vi_id', 'ngay_tao', 'ngay_cap_nhat', 'nguoi_tao_id', 'nguoi_cap_nhat_id', 'ngay_xoa', 'so_luong_thuc_te', 'so_luong_kha_dung']);
    if (cauHinh.khoaCha) cam.add(cauHinh.khoaCha);
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) {
        if (!/^[a-z][a-z0-9_]*$/.test(ten) || cam.has(ten)) throw loi(`Không được ghi trường ${ten}`);
        if (typeof value === 'string') {
            const chuoi = value.trim();
            if (chuoi.length > 20000) throw loi(`${ten} vượt quá độ dài cho phép`);
            duLieu[ten] = chuoi;
        } else if (value === null || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) duLieu[ten] = value;
        else if (ten === 'lich_lam_viec' || ten === 'thong_so_ky_thuat') duLieu[ten] = value;
        else throw loi(`${ten} không hợp lệ`);
    }
    if (tao && cauHinh.ma && !duLieu[cauHinh.ma]) throw loi(`${cauHinh.ma} là bắt buộc`);
    if (tao && cauHinh.ten && !duLieu[cauHinh.ten]) throw loi(`${cauHinh.ten} là bắt buộc`);
    if (duLieu.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(duLieu.email)) throw loi('Email không hợp lệ');
    return duLieu;
}
function boLocHopLe(query = {}) {
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100 || (trang - 1) * kichThuoc > MAX_ID) throw loi('Phân trang không hợp lệ');
    const tuKhoa = query.tu_khoa == null ? '' : String(query.tu_khoa).trim();
    if (tuKhoa.length > 120) throw loi('Từ khóa quá dài');
    return { trang, kich_thuoc: kichThuoc, tu_khoa: tuKhoa, trang_thai: query.trang_thai || null };
}
module.exports = { BANG, loi, idHopLe, bangHopLe, duLieuHopLe, boLocHopLe };