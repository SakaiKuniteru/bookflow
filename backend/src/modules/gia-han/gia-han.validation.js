const { AppError } = require('../../common/errors/AppError.js');

const MAX_ID = 2147483647;
const MAX_BIGINT = 9223372036854775807n;
const HINH_THUC = ['MUON', 'THUE'];
const TRANG_THAI = ['CHO_DUYET', 'DA_DUYET', 'TU_CHOI', 'DA_HUY'];

function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function idHopLe(value, ten = 'ID') {
    const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loi(`${ten} không hợp lệ`);
    return id;
}
function bigIntHopLe(value, ten = 'ID') {
    try {
        const ketQua = BigInt(value);
        if (ketQua < 1n || ketQua > MAX_BIGINT) throw new Error();
        return ketQua.toString();
    } catch {
        throw loi(`${ten} không hợp lệ`);
    }
}
function chuoiHopLe(value, ten, min = 1, max = 2000) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim();
}
function soNguyenHopLe(value, ten, min = 1, max = 3650) {
    const ketQua = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isInteger(ketQua) || ketQua < min || ketQua > max) throw loi(`${ten} không hợp lệ`);
    return ketQua;
}
function kiemTraTruong(body, cacTruong) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu không hợp lệ');
    if (Object.keys(body).some(ten => !cacTruong.includes(ten))) throw loi('Dữ liệu có trường không được phép');
}
function ngayHopLe(value, ten) {
    const ngay = new Date(value);
    if (!value || Number.isNaN(ngay.getTime())) throw loi(`${ten} không hợp lệ`);
    return ngay.toISOString();
}
function taoMoiHopLe(body) {
    kiemTraTruong(body, ['phieu_muon_tra_id', 'chi_tiet_muon_tra_id', 'so_ngay_gia_han', 'ly_do']);
    return {
        phieu_muon_tra_id: bigIntHopLe(body.phieu_muon_tra_id, 'Phiếu mượn trả'),
        chi_tiet_muon_tra_id: bigIntHopLe(body.chi_tiet_muon_tra_id, 'Chi tiết mượn trả'),
        so_ngay_gia_han: soNguyenHopLe(body.so_ngay_gia_han, 'Số ngày gia hạn', 1, 3650),
        ly_do: body.ly_do == null ? null : chuoiHopLe(body.ly_do, 'Lý do', 1, 2000)
    };
}
function duyetHopLe(body) {
    kiemTraTruong(body, ['trang_thai', 'ly_do']);
    if (!TRANG_THAI.includes(body.trang_thai) || !['DA_DUYET', 'TU_CHOI'].includes(body.trang_thai)) throw loi('Trạng thái duyệt gia hạn không hợp lệ');
    return {
        trang_thai: body.trang_thai,
        ly_do: body.ly_do == null ? null : chuoiHopLe(body.ly_do, 'Lý do', 1, 2000)
    };
}
function huyHopLe(body) {
    kiemTraTruong(body, ['ly_do']);
    return { ly_do: body.ly_do == null ? null : chuoiHopLe(body.ly_do, 'Lý do huỷ', 1, 2000) };
}
function cauHinhHopLe(body) {
    kiemTraTruong(body, ['hinh_thuc', 'so_lan_toi_da', 'so_ngay_toi_da_moi_lan', 'cho_gia_han_khi_qua_han', 'cho_gia_han_khi_co_phi_phat', 'cho_gia_han_khi_co_dat_truoc', 'yeu_cau_duyet', 'hoat_dong']);
    if (!HINH_THUC.includes(body.hinh_thuc)) throw loi('Hình thức mượn/thuê không hợp lệ');
    const so_lan_toi_da = soNguyenHopLe(body.so_lan_toi_da, 'Số lần gia hạn tối đa', 0, 100);
    const so_ngay_toi_da_moi_lan = soNguyenHopLe(body.so_ngay_toi_da_moi_lan, 'Số ngày tối đa mỗi lần', 0, 3650);
    return {
        hinh_thuc: body.hinh_thuc,
        so_lan_toi_da,
        so_ngay_toi_da_moi_lan,
        cho_gia_han_khi_qua_han: Boolean(body.cho_gia_han_khi_qua_han),
        cho_gia_han_khi_co_phi_phat: Boolean(body.cho_gia_han_khi_co_phi_phat),
        cho_gia_han_khi_co_dat_truoc: Boolean(body.cho_gia_han_khi_co_dat_truoc),
        yeu_cau_duyet: Boolean(body.yeu_cau_duyet),
        hoat_dong: body.hoat_dong == null ? true : Boolean(body.hoat_dong)
    };
}
function boLocHopLe(query = {}) {
    kiemTraTruong(query, ['trang', 'kich_thuoc', 'phieu_muon_tra_id', 'chi_tiet_muon_tra_id', 'trang_thai', 'tu_ngay', 'den_ngay']);
    const trang = query.trang == null ? 1 : soNguyenHopLe(query.trang, 'Trang', 1, 1000000);
    const kich_thuoc = query.kich_thuoc == null ? 20 : soNguyenHopLe(query.kich_thuoc, 'Kích thước trang', 1, 100);
    if (query.trang > 0 && (trang - 1) * kich_thuoc > MAX_ID) throw loi('Phân trang không hợp lệ');
    if (query.trang_thai != null && !TRANG_THAI.includes(query.trang_thai)) throw loi('Trạng thái không hợp lệ');
    return {
        trang,
        kich_thuoc,
        phieu_muon_tra_id: query.phieu_muon_tra_id == null ? null : bigIntHopLe(query.phieu_muon_tra_id, 'Phiếu mượn trả'),
        chi_tiet_muon_tra_id: query.chi_tiet_muon_tra_id == null ? null : bigIntHopLe(query.chi_tiet_muon_tra_id, 'Chi tiết mượn trả'),
        trang_thai: query.trang_thai ?? null,
        tu_ngay: query.tu_ngay == null ? null : ngayHopLe(query.tu_ngay, 'Từ ngày'),
        den_ngay: query.den_ngay == null ? null : ngayHopLe(query.den_ngay, 'Đến ngày')
    };
}
module.exports = { loi, idHopLe, bigIntHopLe, taoMoiHopLe, duyetHopLe, huyHopLe, cauHinhHopLe, boLocHopLe };