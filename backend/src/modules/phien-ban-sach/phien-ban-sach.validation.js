const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const TRANG_THAI = ['NHAP', 'DANG_DUNG', 'TAM_NGUNG', 'NGUNG_PHAT_HANH'];
const LOAI_PHIEN_BAN = ['SACH_IN', 'EBOOK', 'SACH_NOI', 'KHAC'];
const LOAI_BIA = ['BIA_MEM', 'BIA_CUNG', 'BIA_GAP', 'KHAC'];
const CHUOI = {
    ma_phien_ban: 60, ma_sku_noi_bo: 80, ten_phien_ban: 300, ten_hien_thi: 350,
    ma_vach_nha_xuat_ban: 60, ma_san_pham_nha_xuat_ban: 80, ma_luu_chieu: 100,
    nhan_de_tren_bia: 350, phu_de_phien_ban: 350, ghi_chu_phien_ban: 20000,
    ten_nha_in: 255, noi_xuat_ban: 200, quoc_gia_xuat_ban: 100, ghi_chu_lan_xuat_ban: 20000,
    ngon_ngu_chinh: 15, ngon_ngu_goc: 15, dinh_dang_noi_dung: 30,
    chat_lieu_bia: 100, kieu_dong_gay: 80, chat_lieu_giay: 100, loai_muc_in: 80,
    dinh_dang_am_thanh: 30, loai_drm: 50, dieu_kien_truy_cap_so: 20000,
    mo_ta_rieng_phien_ban: 30000, ghi_chu_quy_cach: 20000, ly_do_ngung: 10000
};
const ID = ['dau_sach_id', 'nha_xuat_ban_id', 'thuong_hieu_xuat_ban_id', 'nha_phat_hanh_id', 'anh_bia_chinh_id'];
const BOOLEAN = ['la_ban_dich', 'la_ban_song_ngu', 'in_mau', 'co_minh_hoa_mau', 'co_phu_luc', 'co_dia_kem_theo', 'co_drm'];
const SO_DUONG = ['lan_xuat_ban', 'lan_tai_ban', 'lan_in', 'so_ban_in', 'so_mau_in', 'so_trang', 'so_trang_noi_dung', 'so_chuong', 'so_tap_trong_hop', 'so_quyen_trong_bo', 'trong_luong_gram', 'trong_luong_dong_goi_gram', 'so_trang_dien_tu', 'thoi_luong_am_thanh_giay', 'toc_do_bit_am_thanh'];
const SO_KHONG_AM = ['so_trang_phu_luc', 'so_dia_kem_theo'];
const SMALLINT = ['lan_xuat_ban', 'lan_tai_ban', 'lan_in', 'so_mau_in', 'so_tap_trong_hop', 'so_quyen_trong_bo', 'so_dia_kem_theo'];
const THAP_PHAN = ['dinh_luong_giay_gsm', 'chieu_dai_mm', 'chieu_rong_mm', 'do_day_mm', 'chieu_dai_dong_goi_mm', 'chieu_rong_dong_goi_mm', 'chieu_cao_dong_goi_mm'];
const NGAY = ['ngay_xuat_ban', 'ngay_phat_hanh', 'ngay_ngung_phat_hanh'];
const BAT_BUOC = ['dau_sach_id', 'ma_phien_ban'];
const KHONG_NULL = ['dau_sach_id', 'ma_phien_ban', 'ngon_ngu_chinh', 'la_ban_dich', 'la_ban_song_ngu', 'loai_phien_ban', 'don_vi_tien_te', 'trang_thai'];
const CAC_TRUONG = [...Object.keys(CHUOI), ...ID, ...BOOLEAN, ...SO_DUONG, ...SO_KHONG_AM, ...THAP_PHAN, ...NGAY, 'isbn_10', 'isbn_13', 'ma_ean_13', 'nam_xuat_ban', 'dung_luong_noi_dung_byte', 'gia_bia', 'don_vi_tien_te', 'loai_phien_ban', 'loai_bia', 'trang_thai', 'ngay_ngung_kinh_doanh'];
function loiDuLieu(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}
function kiemTraTruong(body, cacTruong) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu không hợp lệ');
    if (Object.keys(body).some(ten => !cacTruong.includes(ten))) throw loiDuLieu('Dữ liệu có trường không được phép');
}
function idHopLe(value, ten = 'ID') {
    const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loiDuLieu(`${ten} không hợp lệ`);
    return id;
}
function chuoiHopLe(value, ten, min, max) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw loiDuLieu(`${ten} không hợp lệ`);
    return value.trim();
}
function ngayHopLe(value, ten) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw loiDuLieu(`${ten} phải có định dạng yyyy-mm-dd`);
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw loiDuLieu(`${ten} không hợp lệ`);
    return value;
}
function isbnHopLe(value, loai) {
    const ma = value.replace(/[-\s]/g, '').toUpperCase();
    if (loai === 10) {
        if (!/^\d{9}[\dX]$/.test(ma)) throw loiDuLieu('ISBN-10 không hợp lệ');
        const tong = [...ma].reduce((sum, kyTu, index) => sum + (kyTu === 'X' ? 10 : Number(kyTu)) * (10 - index), 0);
        if (tong % 11 !== 0) throw loiDuLieu('ISBN-10 không hợp lệ');
    } else {
        if (!/^\d{13}$/.test(ma)) throw loiDuLieu('ISBN-13 hoặc EAN-13 không hợp lệ');
        const tong = [...ma.slice(0, 12)].reduce((sum, kyTu, index) => sum + Number(kyTu) * (index % 2 ? 3 : 1), 0);
        if ((10 - tong % 10) % 10 !== Number(ma[12])) throw loiDuLieu('ISBN-13 hoặc EAN-13 không hợp lệ');
    }
    return ma;
}
function giaTriHopLe(ten, value) {
    if (value === null) {
        if (KHONG_NULL.includes(ten)) throw loiDuLieu(`${ten} không được để trống`);
        return null;
    }
    if (ID.includes(ten)) return idHopLe(value, ten);
    if (BOOLEAN.includes(ten)) {
        if (typeof value !== 'boolean') throw loiDuLieu(`${ten} phải là boolean`);
        return value;
    }
    if (NGAY.includes(ten)) return ngayHopLe(value, ten);
    if (ten === 'ngay_ngung_kinh_doanh') {
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) throw loiDuLieu(`${ten} không hợp lệ`);
        return new Date(value).toISOString();
    }
    if (ten === 'isbn_10' || ten === 'isbn_13' || ten === 'ma_ean_13') return isbnHopLe(chuoiHopLe(value, ten, 10, 20), ten === 'isbn_10' ? 10 : 13);
    if (SO_DUONG.includes(ten) || SO_KHONG_AM.includes(ten) || ten === 'nam_xuat_ban') {
        const min = ten === 'nam_xuat_ban' ? 1000 : SO_KHONG_AM.includes(ten) ? 0 : 1;
        const max = ten === 'nam_xuat_ban' ? 9999 : SMALLINT.includes(ten) ? 32767 : MAX_ID;
        if (!Number.isInteger(value) || value < min || value > max) throw loiDuLieu(`${ten} không hợp lệ`);
        return value;
    }
    if (ten === 'dung_luong_noi_dung_byte') {
        if (!/^[1-9]\d*$/.test(String(value)) || BigInt(value) > 9223372036854775807n) throw loiDuLieu(`${ten} không hợp lệ`);
        return String(value);
    }
    if (THAP_PHAN.includes(ten) || ten === 'gia_bia') {
        if (!['number', 'string'].includes(typeof value) || !/^\d+(?:\.\d{1,2})?$/.test(String(value))) throw loiDuLieu(`${ten} không hợp lệ`);
        const so = Number(value);
        if (!Number.isFinite(so) || so < (ten === 'gia_bia' ? 0 : 0.01) || so >= (ten === 'gia_bia' ? 10000000000000000 : 1000000)) throw loiDuLieu(`${ten} không hợp lệ`);
        return String(value);
    }
    if (ten === 'loai_phien_ban' || ten === 'loai_bia' || ten === 'trang_thai') {
        const danhSach = ten === 'loai_phien_ban' ? LOAI_PHIEN_BAN : ten === 'loai_bia' ? LOAI_BIA : TRANG_THAI;
        if (!danhSach.includes(value)) throw loiDuLieu(`${ten} không hợp lệ`);
        return value;
    }
    if (ten === 'don_vi_tien_te') {
        if (typeof value !== 'string' || !/^[A-Z]{3}$/.test(value)) throw loiDuLieu('Đơn vị tiền tệ không hợp lệ');
        return value;
    }
    const ketQua = chuoiHopLe(value, ten, 1, CHUOI[ten]);
    if (ten === 'ma_phien_ban' && !/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(ketQua)) throw loiDuLieu('Mã phiên bản không hợp lệ');
    return ten === 'ma_phien_ban' ? ketQua.toUpperCase() : ketQua;
}
function phienBanMoiHopLe(body) {
    kiemTraTruong(body, CAC_TRUONG.filter(ten => ten !== 'trang_thai'));
    for (const ten of BAT_BUOC) if (body[ten] == null) throw loiDuLieu(`${ten} là bắt buộc`);
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function suaPhienBanHopLe(body) {
    kiemTraTruong(body, CAC_TRUONG.filter(ten => !['dau_sach_id', 'ma_phien_ban', 'trang_thai'].includes(ten)));
    if (!Object.keys(body).length) throw loiDuLieu('Không có dữ liệu cập nhật');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) duLieu[ten] = giaTriHopLe(ten, value);
    return duLieu;
}
function trangThaiHopLe(body) {
    kiemTraTruong(body, ['trang_thai']);
    if (!TRANG_THAI.includes(body.trang_thai)) throw loiDuLieu('Trạng thái phiên bản không hợp lệ');
    return body.trang_thai;
}
function boLocHopLe(query = {}) {
    kiemTraTruong(query, ['trang', 'kich_thuoc', 'tu_khoa', 'dau_sach_id', 'nha_xuat_ban_id', 'loai_phien_ban', 'trang_thai']);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kich_thuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kich_thuoc > 100 || (trang - 1) * kich_thuoc > MAX_ID) throw loiDuLieu('Phân trang không hợp lệ');
    if (query.trang_thai != null && !TRANG_THAI.includes(query.trang_thai)) throw loiDuLieu('Trạng thái không hợp lệ');
    if (query.loai_phien_ban != null && !LOAI_PHIEN_BAN.includes(query.loai_phien_ban)) throw loiDuLieu('Loại phiên bản không hợp lệ');
    return {
        trang, kich_thuoc, tu_khoa: query.tu_khoa == null ? '' : chuoiHopLe(query.tu_khoa, 'Từ khóa', 1, 120),
        dau_sach_id: query.dau_sach_id == null ? null : idHopLe(query.dau_sach_id, 'Đầu sách'),
        nha_xuat_ban_id: query.nha_xuat_ban_id == null ? null : idHopLe(query.nha_xuat_ban_id, 'Nhà xuất bản'),
        loai_phien_ban: query.loai_phien_ban ?? null, trang_thai: query.trang_thai ?? null
    };
}
module.exports = { idHopLe, phienBanMoiHopLe, suaPhienBanHopLe, trangThaiHopLe, boLocHopLe };