const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const TRANG_THAI = ['DANG_DUNG', 'TAM_AN', 'NGUNG_DUNG'];
const LOAI_TEN = ['BUT_DAN', 'TEN_GOC', 'PHIEN_AM', 'TEN_KHAC'];
const TRUONG_CHUOI = {
    ma_tac_gia: 50, ho_ten: 200, ten_hien_thi: 200, ten_goc: 200,
    ten_sap_xep: 200, ten_khac: 200, quoc_tich: 100,
    quoc_gia_xuat_than: 100, ngon_ngu_sang_tac: 100,
    tieu_su_ngan: 2000, tieu_su_day_du: 30000,
    linh_vuc_sang_tac: 2000, thanh_tuu: 10000,
    website: 2000, url_tham_khao: 2000, nguon_du_lieu: 200
};
const TRUONG_ID = ['anh_dai_dien_tep_id'];
const TRUONG_NGAY = ['ngay_sinh', 'ngay_mat'];
const TRUONG_NAM = ['nam_sinh', 'nam_mat'];
const TRUONG_TAO = [...Object.keys(TRUONG_CHUOI), ...TRUONG_ID, ...TRUONG_NGAY, ...TRUONG_NAM];
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
function ngayHopLe(value, ten) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw loiDuLieu(`${ten} phải có định dạng yyyy-mm-dd`);
    const ngay = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(ngay.getTime()) || ngay.toISOString().slice(0, 10) !== value) throw loiDuLieu(`${ten} không hợp lệ`);
    return value;
}
function giaTriHopLe(ten, value) {
    if (value === null) {
        if (['ma_tac_gia', 'ho_ten'].includes(ten)) throw loiDuLieu(`${ten} không được để trống`);
        return null;
    }
    if (TRUONG_ID.includes(ten)) return idHopLe(value, ten);
    if (TRUONG_NGAY.includes(ten)) return ngayHopLe(value, ten);
    if (TRUONG_NAM.includes(ten)) {
        if (!Number.isInteger(value) || value < 1 || value > 9999) throw loiDuLieu(`${ten} không hợp lệ`);
        return value;
    }
    const ketQua = chuoiHopLe(value, ten, 1, TRUONG_CHUOI[ten]);
    if (ten === 'ma_tac_gia') {
        if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(ketQua)) throw loiDuLieu('Mã tác giả chỉ được chứa chữ, số, dấu gạch dưới và gạch ngang');
        return ketQua.toUpperCase();
    }
    if (['website', 'url_tham_khao'].includes(ten)) {
        let url;
        try { url = new URL(ketQua); } catch { throw loiDuLieu(`${ten} phải là URL hợp lệ`); }
        if (!['http:', 'https:'].includes(url.protocol)) throw loiDuLieu(`${ten} chỉ hỗ trợ HTTP hoặc HTTPS`);
    }
    return ketQua;
}
function tacGiaMoiHopLe(body) {
    kiemTraTruong(body, TRUONG_TAO);
    if (body.ma_tac_gia == null || body.ho_ten == null) throw loiDuLieu('Mã tác giả và họ tên là bắt buộc');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function suaTacGiaHopLe(body) {
    kiemTraTruong(body, TRUONG_TAO.filter(ten => ten !== 'ma_tac_gia'));
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function trangThaiHopLe(body) {
    kiemTraTruong(body, ['trang_thai']);
    if (!TRANG_THAI.includes(body.trang_thai)) throw loiDuLieu('Trạng thái tác giả không hợp lệ');
    return body.trang_thai;
}
function tenKhacMoiHopLe(body) {
    kiemTraTruong(body, ['ten', 'loai_ten', 'ngon_ngu', 'la_ten_uu_tien', 'ghi_chu']);
    const ten = chuoiHopLe(body.ten, 'Tên khác', 1, 200);
    if (!LOAI_TEN.includes(body.loai_ten)) throw loiDuLieu('Loại tên không hợp lệ');
    if (body.la_ten_uu_tien !== undefined && typeof body.la_ten_uu_tien !== 'boolean') throw loiDuLieu('la_ten_uu_tien phải là boolean');
    return {
        ten, loai_ten: body.loai_ten,
        ngon_ngu: body.ngon_ngu == null ? null : chuoiHopLe(body.ngon_ngu, 'Ngôn ngữ', 1, 15),
        la_ten_uu_tien: body.la_ten_uu_tien ?? false,
        ghi_chu: body.ghi_chu == null ? null : chuoiHopLe(body.ghi_chu, 'Ghi chú', 1, 2000)
    };
}
function suaTenKhacHopLe(body) {
    kiemTraTruong(body, ['ten', 'loai_ten', 'ngon_ngu', 'la_ten_uu_tien', 'ghi_chu']);
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    if ('ten' in body) duLieu.ten = chuoiHopLe(body.ten, 'Tên khác', 1, 200);
    if ('loai_ten' in body) {
        if (!LOAI_TEN.includes(body.loai_ten)) throw loiDuLieu('Loại tên không hợp lệ');
        duLieu.loai_ten = body.loai_ten;
    }
    if ('ngon_ngu' in body) duLieu.ngon_ngu = body.ngon_ngu == null ? null : chuoiHopLe(body.ngon_ngu, 'Ngôn ngữ', 1, 15);
    if ('la_ten_uu_tien' in body) {
        if (typeof body.la_ten_uu_tien !== 'boolean') throw loiDuLieu('la_ten_uu_tien phải là boolean');
        duLieu.la_ten_uu_tien = body.la_ten_uu_tien;
    }
    if ('ghi_chu' in body) duLieu.ghi_chu = body.ghi_chu == null ? null : chuoiHopLe(body.ghi_chu, 'Ghi chú', 1, 2000);
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
module.exports = { idHopLe, tacGiaMoiHopLe, suaTacGiaHopLe, trangThaiHopLe, tenKhacMoiHopLe, suaTenKhacHopLe, boLocHopLe };