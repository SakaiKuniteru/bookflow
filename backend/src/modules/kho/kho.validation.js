const { loi, idHopLe, boLocHopLe } = require('../nha-cung-cap/nha-cung-cap.validation.js');
const { AppError } = require('../../common/errors/AppError.js');
const BANG = Object.freeze({
    kho: { cha: null, khoaCha: null, ma: 'ma_kho', ten: 'ten_kho', xoaMem: true },
    khu_vuc_kho: { cha: 'kho', khoaCha: 'kho_id', ma: 'ma_khu_vuc', ten: 'ten_khu_vuc' },
    vi_tri_kho: { cha: 'kho', khoaCha: 'kho_id', ma: 'ma_vi_tri', ten: 'ten_vi_tri' },
    nhan_su_kho: { cha: 'kho', khoaCha: 'kho_id' },
    thiet_bi_kho: { cha: 'kho', khoaCha: 'kho_id', ma: 'ma_thiet_bi', ten: 'ten_thiet_bi' },
    nhat_ky_dieu_kien_kho: { cha: 'kho', khoaCha: 'kho_id' },
    tai_lieu_kho: { cha: 'kho', khoaCha: 'kho_id', ten: 'ten_tai_lieu' }
});
function duLieuHopLe(body, { tao = false, bang = 'kho' } = {}) {
    const cauHinh = BANG[bang];
    if (!cauHinh) throw loi('Loại dữ liệu kho không được hỗ trợ', 404, 'NOT_FOUND');
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) throw loi('Dữ liệu không hợp lệ');
    const cam = new Set(['id', 'don_vi_id', 'ngay_tao', 'ngay_cap_nhat', 'nguoi_tao_id', 'nguoi_cap_nhat_id', 'ngay_xoa']);
    if (cauHinh.khoaCha) cam.add(cauHinh.khoaCha);
    const duLieu = {};
    if (!tao && bang === 'kho' && Object.hasOwn(body, 'chi_nhanh_id')) throw loi('Không được đổi chi nhánh sở hữu kho qua API cập nhật');
    if (!tao && bang === 'kho' && Object.hasOwn(body, 'kho_cha_id')) throw loi('Không được đổi kho cha qua API cập nhật thông thường');
    if (!tao && bang === 'vi_tri_kho' && Object.hasOwn(body, 'khu_vuc_kho_id')) throw loi('Không được chuyển vị trí sang khu vực khác qua API cập nhật thông thường');
    for (const [ten, value] of Object.entries(body)) {
        if (!/^[a-z][a-z0-9_]*$/.test(ten) || cam.has(ten)) throw loi(`Không được ghi trường ${ten}`);
        if (value === null || typeof value === 'boolean' || typeof value === 'number' && Number.isFinite(value)) duLieu[ten] = value;
        else if (typeof value === 'string' && value.trim().length <= 20000) duLieu[ten] = value.trim();
        else if (['lich_lam_viec', 'thong_so_ky_thuat'].includes(ten) && value && typeof value === 'object' && !Array.isArray(value)) duLieu[ten] = value;
        else throw loi(`${ten} không hợp lệ`);
    }
    if (tao && cauHinh.ma && !duLieu[cauHinh.ma]) throw loi(`${cauHinh.ma} là bắt buộc`);
    if (tao && cauHinh.ten && !duLieu[cauHinh.ten]) throw loi(`${cauHinh.ten} là bắt buộc`);
    if (tao && bang === 'kho') duLieu.chi_nhanh_id = idHopLe(duLieu.chi_nhanh_id, 'Chi nhánh');
    if (tao && bang === 'vi_tri_kho') duLieu.khu_vuc_kho_id = idHopLe(duLieu.khu_vuc_kho_id, 'Khu vực kho');
    if (tao && bang === 'nhan_su_kho') duLieu.tai_khoan_id = idHopLe(duLieu.tai_khoan_id, 'Nhân sự');
    if (tao && bang === 'tai_lieu_kho') duLieu.tep_dinh_kem_id = idHopLe(duLieu.tep_dinh_kem_id, 'Tệp đính kèm');
    if (tao && bang === 'nhat_ky_dieu_kien_kho' && duLieu.thoi_diem_do == null) duLieu.thoi_diem_do = new Date().toISOString();
    if (bang === 'kho' && duLieu.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(duLieu.email)) throw loi('Email kho không hợp lệ');
    return duLieu;
}
function duLieuKhoHopLe(body, tao = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body)) throw loi('Dữ liệu kho không hợp lệ');
    const details = [];
    const required = tao ? ['chi_nhanh_id', 'ma_kho', 'ten_kho'] : [];
    const labels = {
        chi_nhanh_id: 'Chi nhánh', ma_kho: 'Mã kho', ten_kho: 'Tên kho', email: 'Email', so_dien_thoai: 'Số điện thoại',
        loai_kho: 'Loại kho', hinh_thuc_so_huu: 'Hình thức sở hữu', phuong_phap_xuat_kho: 'Phương pháp xuất kho',
        nguong_canh_bao_suc_chua_phan_tram: 'Ngưỡng cảnh báo sức chứa', suc_chua_toi_da_cuon: 'Sức chứa tối đa (cuốn)',
        suc_chua_toi_da_kg: 'Sức chứa tối đa (kg)', dien_tich_m2: 'Diện tích', dien_tich_su_dung_m2: 'Diện tích sử dụng',
        chieu_cao_su_dung_m: 'Chiều cao sử dụng', the_tich_su_dung_m3: 'Thể tích sử dụng'
    };
    for (const field of required) {
        if (!Object.hasOwn(body, field) || body[field] == null || typeof body[field] === 'string' && !body[field].trim()) {
            details.push({ field, message: `${labels[field]} là bắt buộc` });
        }
    }
    const normalized = {};
    for (const [field, value] of Object.entries(body)) {
        try {
            if (['ma_kho', 'ten_kho'].includes(field)) {
                const label = labels[field];
                const max = field === 'ma_kho' ? 50 : 200;
                if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} là bắt buộc`);
                if (value.trim().length > max) throw new Error(`${label} không được vượt quá ${max} ký tự`);
            }
            if (field === 'chi_nhanh_id' && value != null) idHopLe(value, labels[field]);
            if (field === 'email' && value != null && value !== '' && (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()))) throw new Error('Email kho không đúng định dạng');
            if (field === 'so_dien_thoai' && value != null && value !== '' && (typeof value !== 'string' || !/^(?:0\d{9}|84\d{9})$/.test(value.trim().replace(/[\s().+-]/g, '')))) throw new Error('Số điện thoại phải gồm mã 0 hoặc 84 và 9 chữ số');
            const enums = {
                loai_kho: ['TONG_HOP', 'BAN_HANG', 'DU_TRU', 'TRUNG_CHUYEN', 'NHAN_HANG', 'TRA_HANG', 'CACH_LY', 'KY_GUI', 'KHAC'],
                hinh_thuc_so_huu: ['SO_HUU', 'THUE', 'THUE_NGOAI', 'DOI_TAC', 'KHAC'],
                phuong_phap_xuat_kho: ['FIFO', 'FEFO', 'THU_CONG']
            };
            if (enums[field] && value != null && !enums[field].includes(value)) throw new Error(`${labels[field] || field} không hợp lệ`);
            if (['nguong_canh_bao_suc_chua_phan_tram', 'suc_chua_toi_da_cuon', 'suc_chua_toi_da_kg', 'dien_tich_m2', 'dien_tich_su_dung_m2', 'chieu_cao_su_dung_m', 'the_tich_su_dung_m3'].includes(field) && value != null) {
                const number = Number(value);
                const hopLe = Number.isFinite(number) && (field === 'nguong_canh_bao_suc_chua_phan_tram' ? number >= 0 && number <= 100 : number > 0) && (field !== 'suc_chua_toi_da_cuon' || Number.isInteger(number));
                if (!hopLe) throw new Error(`${labels[field] || field} không hợp lệ`);
            }
            const result = duLieuHopLe({ [field]: value }, { bang: 'kho' });
            Object.assign(normalized, result);
        } catch (error) {
            details.push({ field, message: error.message || `${labels[field] || field} không hợp lệ` });
        }
    }
    if (body.chi_nhanh_id != null) {
        try { normalized.chi_nhanh_id = idHopLe(body.chi_nhanh_id, labels.chi_nhanh_id); }
        catch (error) { details.push({ field: 'chi_nhanh_id', message: error.message }); }
    }
    if (details.length) {
        const unique = [...new Map(details.map(item => [`${item.field}:${item.message}`, item])).values()];
        throw new AppError({ code: 'INVALID_INPUT', message: unique.map(item => item.message).join('. '), status: 422, details: unique });
    }
    return normalized;
}
module.exports = { BANG, loi, idHopLe, boLocHopLe, duLieuHopLe, duLieuKhoHopLe };
