const { AppError } = require('../../common/errors/AppError.js');

const MAX_ID = 2147483647;
const LOAI = ['QUA_HAN', 'MAT_SACH', 'HU_HONG', 'KHAC'];
const CACH_TINH = ['CO_DINH', 'THEO_NGAY', 'THEO_TY_LE', 'THEO_GIA_TRI'];
const TRANG_THAI = ['CHO_DUYET', 'CHO_THU', 'THU_MOT_PHAN', 'DA_THU', 'MIEN_PHI', 'HUY'];

function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function idHopLe(value, ten = 'ID') {
    const dung = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!dung || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loi(`${ten} không hợp lệ`);
    return id;
}
function bigIntHopLe(value, ten = 'ID') {
    if (typeof value === 'bigint') return value.toString();
    if (typeof value !== 'string' && typeof value !== 'number') throw loi(`${ten} không hợp lệ`);
    if (!/^[1-9]\d*$/.test(String(value))) throw loi(`${ten} không hợp lệ`);
    return String(value);
}
function chuoiHopLe(value, ten, min = 1, max = 2000) {
    if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim();
}
function soNguyen(value, ten, min = 0, max = 2147483647) {
    const so = typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : value;
    if (!Number.isInteger(so) || so < min || so > max) throw loi(`${ten} không hợp lệ`);
    return so;
}
function tien(value, ten = 'Số tiền', choPhepZero = true) {
    if (typeof value === 'number' && !Number.isFinite(value)) throw loi(`${ten} không hợp lệ`);
    const text = String(value);
    if (!/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(text)) throw loi(`${ten} không hợp lệ`);
    const so = Number(text);
    if (!Number.isSafeInteger(Math.round(so * 1000)) || so < 0 || (!choPhepZero && so === 0)) throw loi(`${ten} không hợp lệ`);
    return text;
}
function kiemTraTruong(body, danhSach) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu không hợp lệ');
    if (Object.keys(body).some(key => !danhSach.includes(key))) throw loi('Dữ liệu có trường không được phép');
}
function taoLoaiHopLe(body) {
    kiemTraTruong(body, ['ma_loai', 'ten_loai', 'loai', 'cach_tinh', 'muc_tien', 'ty_le_phan_tram', 'cho_phep_mien_giam', 'cho_phep_mien_phi', 'hoat_dong']);
    const ma_loai = chuoiHopLe(body.ma_loai, 'Mã loại phí phạt', 2, 50).toUpperCase();
    if (!/^[A-Z0-9][A-Z0-9_-]*$/.test(ma_loai)) throw loi('Mã loại phí phạt không hợp lệ');
    if (!LOAI.includes(body.loai)) throw loi('Loại phí phạt không hợp lệ');
    if (!CACH_TINH.includes(body.cach_tinh)) throw loi('Cách tính phí phạt không hợp lệ');
    const muc_tien = tien(body.muc_tien ?? 0, 'Mức tiền');
    const ty_le_phan_tram = body.ty_le_phan_tram == null ? null : tien(body.ty_le_phan_tram, 'Tỷ lệ phần trăm');
    if (body.cach_tinh === 'THEO_TY_LE' && ty_le_phan_tram == null) throw loi('Cách tính theo tỷ lệ phải có tỷ lệ phần trăm');
    if (body.cach_tinh !== 'THEO_TY_LE' && ty_le_phan_tram != null) throw loi('Chỉ được nhập tỷ lệ phần trăm khi tính theo tỷ lệ');
    return { ma_loai, ten_loai: chuoiHopLe(body.ten_loai, 'Tên loại phí phạt', 1, 255), loai: body.loai, cach_tinh: body.cach_tinh, muc_tien, ty_le_phan_tram, cho_phep_mien_giam: body.cho_phep_mien_giam !== false, cho_phep_mien_phi: body.cho_phep_mien_phi !== false, hoat_dong: body.hoat_dong !== false };
}
function taoPhiPhatHopLe(body) {
    kiemTraTruong(body, ['phieu_muon_tra_id', 'chi_tiet_muon_tra_id', 'loai_phi_phat_id', 'loai', 'so_ngay_qua_han', 'so_luong', 'don_gia', 'ly_do', 'ghi_chu']);
    const loai = body.loai;
    if (!LOAI.includes(loai)) throw loi('Loại phí phạt không hợp lệ');
    return {
        phieu_muon_tra_id: bigIntHopLe(body.phieu_muon_tra_id, 'Phiếu mượn trả'),
        chi_tiet_muon_tra_id: bigIntHopLe(body.chi_tiet_muon_tra_id, 'Chi tiết mượn trả'),
        loai_phi_phat_id: body.loai_phi_phat_id == null ? null : idHopLe(body.loai_phi_phat_id, 'Loại phí phạt'),
        loai,
        so_ngay_qua_han: soNguyen(body.so_ngay_qua_han ?? 0, 'Số ngày quá hạn', 0, 36500),
        so_luong: soNguyen(body.so_luong ?? 1, 'Số lượng', 1, 100000),
        don_gia: tien(body.don_gia ?? 0, 'Đơn giá'),
        ly_do: body.ly_do == null ? null : chuoiHopLe(body.ly_do, 'Lý do', 1, 2000),
        ghi_chu: body.ghi_chu == null ? null : chuoiHopLe(body.ghi_chu, 'Ghi chú', 1, 5000)
    };
}
function duyetHopLe(body) {
    kiemTraTruong(body, ['trang_thai', 'ly_do']);
    if (!['CHO_THU', 'MIEN_PHI'].includes(body.trang_thai)) throw loi('Trạng thái xử lý phí phạt không hợp lệ');
    return { trang_thai: body.trang_thai, ly_do: body.ly_do == null ? null : chuoiHopLe(body.ly_do, 'Lý do', 1, 2000) };
}
function mienGiamHopLe(body) {
    kiemTraTruong(body, ['so_tien_mien_giam', 'ly_do']);
    return {
        so_tien_mien_giam: tien(body.so_tien_mien_giam, 'Số tiền miễn giảm', false),
        ly_do: chuoiHopLe(body.ly_do, 'Lý do miễn giảm', 1, 2000)
    };
}
function huyHopLe(body) {
    kiemTraTruong(body, ['ly_do']);
    return { ly_do: chuoiHopLe(body.ly_do, 'Lý do huỷ', 1, 2000) };
}
function thuTienHopLe(body) {
    kiemTraTruong(body, ['phuong_thuc_id', 'so_tien', 'tai_khoan_nhan_id', 'noi_dung']);
    return {
        phuong_thuc_id: idHopLe(body.phuong_thuc_id, 'Phương thức thanh toán'),
        so_tien: tien(body.so_tien, 'Số tiền thu', false),
        tai_khoan_nhan_id: body.tai_khoan_nhan_id == null ? null : idHopLe(body.tai_khoan_nhan_id, 'Tài khoản nhận tiền'),
        noi_dung: body.noi_dung == null ? null : chuoiHopLe(body.noi_dung, 'Nội dung', 1, 2000)
    };
}
function boLocHopLe(query = {}) {
    kiemTraTruong(query, ['trang', 'kich_thuoc', 'phieu_muon_tra_id', 'chi_tiet_muon_tra_id', 'loai', 'trang_thai', 'tu_ngay', 'den_ngay']);
    const trang = query.trang == null ? 1 : soNguyen(query.trang, 'Trang', 1, 1000000);
    const kich_thuoc = query.kich_thuoc == null ? 20 : soNguyen(query.kich_thuoc, 'Kích thước trang', 1, 100);
    if (query.loai != null && !LOAI.includes(query.loai)) throw loi('Loại phí phạt không hợp lệ');
    if (query.trang_thai != null && !TRANG_THAI.includes(query.trang_thai)) throw loi('Trạng thái phí phạt không hợp lệ');
    return {
        trang,
        kich_thuoc,
        phieu_muon_tra_id: query.phieu_muon_tra_id == null ? null : bigIntHopLe(query.phieu_muon_tra_id, 'Phiếu mượn trả'),
        chi_tiet_muon_tra_id: query.chi_tiet_muon_tra_id == null ? null : bigIntHopLe(query.chi_tiet_muon_tra_id, 'Chi tiết mượn trả'),
        loai: query.loai ?? null,
        trang_thai: query.trang_thai ?? null,
        tu_ngay: query.tu_ngay ?? null,
        den_ngay: query.den_ngay ?? null
    };
}
module.exports = { loi, idHopLe, bigIntHopLe, tien, taoLoaiHopLe, taoPhiPhatHopLe, duyetHopLe, mienGiamHopLe, huyHopLe, thuTienHopLe, boLocHopLe };