const { loi, idHopLe } = require('../nhap-kho/nhap-kho.validation.js');
const LOAI_BIEN_DONG = ['NHAP_KHO', 'XUAT_KHO', 'DIEU_CHUYEN_VAO', 'DIEU_CHUYEN_RA', 'KIEM_KE_TANG', 'KIEM_KE_GIAM', 'GIU_CHO', 'HUY_GIU_CHO'];
function boLocHopLe(query = {}, lichSu = false) {
    if (!query || typeof query !== 'object' || Array.isArray(query)) throw loi('Bộ lọc không hợp lệ');
    const choPhep = ['trang', 'kich_thuoc', 'kho_id', 'chi_nhanh_id', 'phien_ban_sach_id', 'vi_tri_kho_id', 'co_ton', ...lichSu ? ['loai_bien_dong', 'tu_ngay', 'den_ngay'] : []];
    for (const ten of Object.keys(query)) if (!choPhep.includes(ten)) throw loi(`Bộ lọc ${ten} không được hỗ trợ`);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.co_ton != null && !['true', 'false'].includes(query.co_ton)) throw loi('co_ton phải là true hoặc false');
    if (query.loai_bien_dong != null && !LOAI_BIEN_DONG.includes(query.loai_bien_dong)) throw loi('Loại biến động không hợp lệ');
    for (const ten of ['tu_ngay', 'den_ngay']) if (query[ten] != null && (typeof query[ten] !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(query[ten]) || Number.isNaN(Date.parse(`${query[ten]}T00:00:00Z`)) || new Date(`${query[ten]}T00:00:00Z`).toISOString().slice(0, 10) !== query[ten])) throw loi(`${ten} không hợp lệ`);
    if (query.tu_ngay && query.den_ngay && query.tu_ngay > query.den_ngay) throw loi('Từ ngày không được lớn hơn đến ngày');
    return { trang, kich_thuoc: kichThuoc, kho_id: query.kho_id == null ? null : idHopLe(query.kho_id, 'Kho'), chi_nhanh_id: query.chi_nhanh_id == null ? null : idHopLe(query.chi_nhanh_id, 'Chi nhánh'), phien_ban_sach_id: query.phien_ban_sach_id == null ? null : idHopLe(query.phien_ban_sach_id, 'Phiên bản sách'), vi_tri_kho_id: query.vi_tri_kho_id == null ? null : idHopLe(query.vi_tri_kho_id, 'Vị trí kho'), co_ton: query.co_ton ?? null, loai_bien_dong: query.loai_bien_dong ?? null, tu_ngay: query.tu_ngay ?? null, den_ngay: query.den_ngay ?? null };
}
module.exports = { boLocHopLe };