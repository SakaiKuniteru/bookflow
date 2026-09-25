import { AppError } from '../../common/errors/AppError.js';

const UUID = /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i;
const TRUONG_TAO = [
    'ma_chi_nhanh', 'ten_chi_nhanh', 'loai_chi_nhanh', 'dia_chi_chi_tiet',
    'ma_tinh_thanh', 'ten_tinh_thanh', 'ma_phuong_xa', 'ten_phuong_xa',
    'quoc_gia', 'vi_do', 'kinh_do', 'so_dien_thoai', 'email',
    'cho_nhan_tai_quay', 'cho_ban_truc_tuyen'
];
const TRUONG_SUA = [...TRUONG_TAO.filter(ten => ten !== 'ma_chi_nhanh'), 'quan_ly_thanh_vien_id'];
const TRUONG_CO_THE_XOA = new Set([
    'dia_chi_chi_tiet', 'ma_tinh_thanh', 'ten_tinh_thanh', 'ma_phuong_xa',
    'ten_phuong_xa', 'vi_do', 'kinh_do', 'so_dien_thoai', 'email', 'quan_ly_thanh_vien_id'
]);
const GIOI_HAN = {
    ma_chi_nhanh: 40, ten_chi_nhanh: 200, dia_chi_chi_tiet: 300,
    ma_tinh_thanh: 20, ten_tinh_thanh: 100, ma_phuong_xa: 20,
    ten_phuong_xa: 100, so_dien_thoai: 30, email: 254
};

function loiDuLieu(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}

export function uuidHopLe(value, ten = 'ID') {
    if (typeof value !== 'string' || !UUID.test(value)) throw loiDuLieu(`${ten} không hợp lệ`);
    return value;
}

function chuanHoa(body, taoMoi) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu chi nhánh không hợp lệ');
    const truongChoPhep = taoMoi ? TRUONG_TAO : TRUONG_SUA;
    const cacTruong = Object.keys(body);
    if (!cacTruong.length || cacTruong.some(ten => !truongChoPhep.includes(ten))) throw loiDuLieu('Dữ liệu có trường không được phép');
    if (taoMoi && ['ma_chi_nhanh', 'ten_chi_nhanh'].some(ten => !(ten in body))) throw loiDuLieu('Thiếu mã hoặc tên chi nhánh');
    const ketQua = {};
    for (const [ten, giaTri] of Object.entries(body)) {
        if (giaTri === null && TRUONG_CO_THE_XOA.has(ten)) {
            ketQua[ten] = null;
            continue;
        }
        if (ten === 'quan_ly_thanh_vien_id') {
            ketQua[ten] = uuidHopLe(giaTri, 'Quản lý chi nhánh');
            continue;
        }
        if (ten === 'cho_nhan_tai_quay' || ten === 'cho_ban_truc_tuyen') {
            if (typeof giaTri !== 'boolean') throw loiDuLieu(`${ten} phải là boolean`);
            ketQua[ten] = giaTri;
            continue;
        }
        if (ten === 'vi_do' || ten === 'kinh_do') {
            const gioiHan = ten === 'vi_do' ? 90 : 180;
            if (typeof giaTri !== 'number' || !Number.isFinite(giaTri) || Math.abs(giaTri) > gioiHan) throw loiDuLieu(`${ten} không hợp lệ`);
            ketQua[ten] = giaTri;
            continue;
        }
        if (typeof giaTri !== 'string' || !giaTri.trim()) throw loiDuLieu(`${ten} không hợp lệ`);
        let value = giaTri.trim();
        if (GIOI_HAN[ten] && value.length > GIOI_HAN[ten]) throw loiDuLieu(`${ten} vượt quá độ dài cho phép`);
        if (ten === 'ma_chi_nhanh') {
            value = value.toUpperCase();
            if (!/^[A-Z0-9][A-Z0-9_-]{1,39}$/.test(value)) throw loiDuLieu('Mã chi nhánh không hợp lệ');
        }
        if (ten === 'ten_chi_nhanh' && value.length < 2) throw loiDuLieu('Tên chi nhánh phải có ít nhất 2 ký tự');
        if (ten === 'loai_chi_nhanh' && !['NHA_SACH', 'THU_VIEN', 'KET_HOP'].includes(value)) throw loiDuLieu('Loại chi nhánh không hợp lệ');
        if (ten === 'quoc_gia') {
            value = value.toUpperCase();
            if (!/^[A-Z]{2}$/.test(value)) throw loiDuLieu('Mã quốc gia không hợp lệ');
        }
        if (ten === 'so_dien_thoai' && !/^[0-9+(). -]{9,30}$/.test(value)) throw loiDuLieu('Số điện thoại không hợp lệ');
        if (ten === 'email') {
            value = value.toLowerCase();
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw loiDuLieu('Email không hợp lệ');
        }
        ketQua[ten] = value;
    }
    return ketQua;
}

export function chiNhanhMoiHopLe(body) {
    return chuanHoa(body, true);
}

export function capNhatChiNhanhHopLe(body) {
    return chuanHoa(body, false);
}

export function trangThaiChiNhanhHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 1) throw loiDuLieu('Dữ liệu trạng thái không hợp lệ');
    if (!['DANG_DUNG', 'TAM_KHOA'].includes(body.trang_thai)) throw loiDuLieu('Trạng thái chi nhánh không hợp lệ');
    return body.trang_thai;
}

export function phanCongHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiDuLieu('Dữ liệu phân công không hợp lệ');
    if (Object.keys(body).some(ten => ten !== 'la_chi_nhanh_chinh')) throw loiDuLieu('Dữ liệu phân công có trường không được phép');
    if (body.la_chi_nhanh_chinh !== undefined && typeof body.la_chi_nhanh_chinh !== 'boolean') throw loiDuLieu('Chi nhánh chính phải là boolean');
    return { la_chi_nhanh_chinh: body.la_chi_nhanh_chinh ?? false };
}