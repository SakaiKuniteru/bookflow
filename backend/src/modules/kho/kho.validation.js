const { loi, idHopLe, boLocHopLe } = require('../nha-cung-cap/nha-cung-cap.validation.js');
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
module.exports = { BANG, loi, idHopLe, boLocHopLe, duLieuHopLe };