const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const TRANG_THAI = ['DANG_DUNG', 'TAM_NGUNG', 'NGUNG_DUNG'];
const TRUONG_CHUOI = {
    ma_nha_xuat_ban: 40, ten_nha_xuat_ban: 255, ten_phap_ly: 255,
    ten_viet_tat: 100, ten_quoc_te: 255, ma_so_thue: 50,
    ma_dinh_danh: 100, quoc_gia: 100, tinh_thanh: 150,
    dia_chi: 2000, email: 255, so_dien_thoai: 30,
    website: 2000, nguoi_lien_he: 200, so_dien_thoai_lien_he: 30,
    mo_ta: 20000, ghi_chu_noi_bo: 20000
};
const TRUONG_TAO = [...Object.keys(TRUONG_CHUOI), 'logo_tep_id'];
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
function idHopLe(value, ten = 'ID') {
    const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loiDuLieu(`${ten} không hợp lệ`);
    return id;
}
function giaTriHopLe(ten, value) {
    if (value === null) {
        if (['ma_nha_xuat_ban', 'ten_nha_xuat_ban'].includes(ten)) throw loiDuLieu(`${ten} không được để trống`);
        return null;
    }
    if (ten === 'logo_tep_id') return idHopLe(value, 'Logo');
    const ketQua = chuoiHopLe(value, ten, 1, TRUONG_CHUOI[ten]);
    if (ten === 'ma_nha_xuat_ban') {
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(ketQua)) throw loiDuLieu('Mã nhà xuất bản không hợp lệ');
        return ketQua.toUpperCase();
    }
    if (ten === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ketQua)) throw loiDuLieu('Email không hợp lệ');
    if (['so_dien_thoai', 'so_dien_thoai_lien_he'].includes(ten) && !/^\+?[0-9][0-9\s().-]{5,28}$/.test(ketQua)) throw loiDuLieu(`${ten} không hợp lệ`);
    if (ten === 'website') {
        let url;
        try { url = new URL(ketQua); } catch { throw loiDuLieu('Website không hợp lệ'); }
        if (!['http:', 'https:'].includes(url.protocol)) throw loiDuLieu('Website chỉ hỗ trợ HTTP hoặc HTTPS');
    }
    return ketQua;
}
function nhaXuatBanMoiHopLe(body) {
    kiemTraTruong(body, TRUONG_TAO);
    if (body.ma_nha_xuat_ban == null || body.ten_nha_xuat_ban == null) throw loiDuLieu('Mã và tên nhà xuất bản là bắt buộc');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function suaNhaXuatBanHopLe(body) {
    kiemTraTruong(body, TRUONG_TAO.filter(ten => ten !== 'ma_nha_xuat_ban'));
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function trangThaiHopLe(body) {
    kiemTraTruong(body, ['trang_thai']);
    if (!TRANG_THAI.includes(body.trang_thai)) throw loiDuLieu('Trạng thái nhà xuất bản không hợp lệ');
    return body.trang_thai;
}
function thuongHieuMoiHopLe(body) {
    kiemTraTruong(body, ['ma_thuong_hieu', 'ten_thuong_hieu', 'mo_ta', 'logo_tep_id']);
    const ma_thuong_hieu = chuoiHopLe(body.ma_thuong_hieu, 'Mã thương hiệu', 1, 50).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(ma_thuong_hieu)) throw loiDuLieu('Mã thương hiệu không hợp lệ');
    return {
        ma_thuong_hieu, ten_thuong_hieu: chuoiHopLe(body.ten_thuong_hieu, 'Tên thương hiệu', 1, 200),
        mo_ta: body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 20000),
        logo_tep_id: body.logo_tep_id == null ? null : idHopLe(body.logo_tep_id, 'Logo thương hiệu')
    };
}
function suaThuongHieuHopLe(body) {
    kiemTraTruong(body, ['ten_thuong_hieu', 'mo_ta', 'logo_tep_id']);
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    if ('ten_thuong_hieu' in body) duLieu.ten_thuong_hieu = chuoiHopLe(body.ten_thuong_hieu, 'Tên thương hiệu', 1, 200);
    if ('mo_ta' in body) duLieu.mo_ta = body.mo_ta == null ? null : chuoiHopLe(body.mo_ta, 'Mô tả', 1, 20000);
    if ('logo_tep_id' in body) duLieu.logo_tep_id = body.logo_tep_id == null ? null : idHopLe(body.logo_tep_id, 'Logo thương hiệu');
    return duLieu;
}
function boLocHopLe(query = {}) {
    kiemTraTruong(query, ['trang', 'kich_thuoc', 'tu_khoa', 'trang_thai']);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kich_thuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kich_thuoc > 100 || (trang - 1) * kich_thuoc > MAX_ID) throw loiDuLieu('Phân trang không hợp lệ');
    const trang_thai = query.trang_thai == null ? null : trangThaiHopLe({ trang_thai: query.trang_thai });
    return { trang, kich_thuoc, tu_khoa: query.tu_khoa == null ? '' : chuoiHopLe(query.tu_khoa, 'Từ khóa', 1, 120), trang_thai };
}
module.exports = { idHopLe, nhaXuatBanMoiHopLe, suaNhaXuatBanHopLe, trangThaiHopLe, thuongHieuMoiHopLe, suaThuongHieuHopLe, boLocHopLe };