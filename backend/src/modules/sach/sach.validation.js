const { AppError } = require('../../common/errors/AppError.js');
const MAX_ID = 2147483647;
const TRANG_THAI = ['NHAP', 'CHO_DUYET', 'DANG_HIEN_THI', 'TAM_AN', 'NGUNG_KINH_DOANH'];
const LOAI_TAC_PHAM = ['SACH', 'TRUYEN_TRANH', 'GIAO_TRINH', 'TAP_CHI', 'KHAC'];
const CHUOI = {
    ma_dau_sach: 50, duong_dan: 300, ma_dau_sach_ngoai: 100,
    ten_sach: 300, ten_goc: 300, ten_phu: 300, ten_ngan: 160, ten_hien_thi: 350,
    mo_ta_ngan: 20000, mo_ta_day_du: 100000, tom_tat_noi_dung: 100000,
    diem_noi_bat: 30000, muc_luc_gioi_thieu: 50000, loi_gioi_thieu: 50000,
    thong_diep_tac_pham: 30000, ngon_ngu_goc: 15, quoc_gia_xuat_xu: 100,
    doi_tuong_doc: 160, cap_hoc_goi_y: 60, muc_do_kho: 30,
    chu_de_noi_bat: 20000, canh_bao_noi_dung: 20000, ghi_chu_noi_dung: 30000,
    nguon_du_lieu: 80, ma_nguon_du_lieu: 100, url_nguon: 2000,
    tieu_de_seo: 300, mo_ta_seo: 500
};
const ID = ['anh_bia_chinh_id'];
const NAM = ['nam_sang_tac', 'nam_xuat_ban_dau_tien'];
const TUOI = ['do_tuoi_goi_y', 'do_tuoi_toi_thieu', 'do_tuoi_toi_da'];
const BOOLEAN = ['la_tac_pham_dich', 'la_tac_pham_doc_lap'];
const TRUONG_SACH = [...Object.keys(CHUOI), ...ID, ...NAM, ...TUOI, ...BOOLEAN, 'ngay_xuat_ban_hien_thi', 'loai_tac_pham'];
const LIEN_KET = {
    'ten-khac': { bang: 'dau_sach_ten_khac', truong: { ten: ['string', 350], loai_ten: ['enum', ['TEN_GOC', 'TEN_DICH', 'TEN_CU', 'TEN_VIET_TAT', 'KHAC']], ngon_ngu: ['string', 15], la_ten_uu_tien: ['boolean'], thu_tu: ['int', 0, 32767] }, batBuoc: ['ten', 'loai_ten'], khoa: [] },
    'tac-gia': { bang: 'dau_sach_tac_gia', truong: { tac_gia_id: ['id'], vai_tro_dong_gop: ['enum', ['TAC_GIA', 'DONG_TAC_GIA', 'DICH_GIA', 'BIEN_SOAN', 'MINH_HOA', 'HIEU_DINH', 'BIEN_TAP', 'KHAC']], thu_tu_hien_thi: ['int', 1, 32767], la_nguoi_dong_gop_chinh: ['boolean'], ghi_chu: ['string', 300] }, batBuoc: ['tac_gia_id'], khoa: ['tac_gia_id'] },
    'the-loai': { bang: 'dau_sach_the_loai', truong: { the_loai_id: ['id'], la_the_loai_chinh: ['boolean'], thu_tu_hien_thi: ['int', 0, 32767] }, batBuoc: ['the_loai_id'], khoa: ['the_loai_id'] },
    'tu-khoa': { bang: 'dau_sach_tu_khoa', truong: { tu_khoa_id: ['id'], nguon_gan: ['enum', ['THU_CONG', 'NHAP_LIEU', 'AI_GOI_Y']] }, batBuoc: ['tu_khoa_id'], khoa: ['tu_khoa_id'] },
    'bo-sach': { bang: 'bo_sach_dau_sach', truong: { bo_sach_id: ['id'], so_tap: ['string', 30], ten_tap: ['string', 300], thu_tu: ['int', 1, 32767], ghi_chu: ['string', 20000] }, batBuoc: ['bo_sach_id', 'thu_tu'], khoa: ['bo_sach_id'] },
    'lien-quan': { bang: 'dau_sach_lien_quan', truong: { dau_sach_lien_quan_id: ['id'], loai_lien_quan: ['enum', ['CUNG_CHU_DE', 'PHAN_TIEP_THEO', 'PHAN_TRUOC', 'BAN_MO_RONG', 'TAI_LIEU_THAM_KHAO']], thu_tu: ['int', 0, 32767], ghi_chu: ['string', 20000] }, batBuoc: ['dau_sach_lien_quan_id', 'loai_lien_quan'], khoa: ['dau_sach_lien_quan_id', 'loai_lien_quan'] },
    'phan-loai': { bang: 'dau_sach_phan_loai', truong: { he_phan_loai: ['enum', ['DDC', 'LCC', 'BISAC', 'THEMA', 'KHAC']], ma_phan_loai: ['string', 60], ten_phan_loai: ['string', 255], phien_ban_he_phan_loai: ['string', 50], la_phan_loai_chinh: ['boolean'], nguon_xac_minh: ['string', 20000] }, batBuoc: ['he_phan_loai', 'ma_phan_loai'], khoa: ['he_phan_loai', 'ma_phan_loai'] }
};
function loi(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}
function idHopLe(value, ten = 'ID') {
    const hopLe = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
    const id = Number(value);
    if (!hopLe || !Number.isSafeInteger(id) || id < 1 || id > MAX_ID) throw loi(`${ten} không hợp lệ`);
    return id;
}
function objectHopLe(value, cacTruong) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw loi('Dữ liệu phải là object');
    if (Object.keys(value).some(ten => !cacTruong.includes(ten))) throw loi('Dữ liệu có trường không được phép');
}
function chuoi(value, ten, max) {
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim();
}
function ngay(value, ten) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw loi(`${ten} phải có định dạng yyyy-mm-dd`);
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) throw loi(`${ten} không hợp lệ`);
    return value;
}
function giaTri(value, ten, moTa) {
    if (value === null) return null;
    if (moTa[0] === 'id') return idHopLe(value, ten);
    if (moTa[0] === 'string') return chuoi(value, ten, moTa[1]);
    if (moTa[0] === 'enum') {
        if (!moTa[1].includes(value)) throw loi(`${ten} không hợp lệ`);
        return value;
    }
    if (moTa[0] === 'boolean') {
        if (typeof value !== 'boolean') throw loi(`${ten} phải là boolean`);
        return value;
    }
    if (moTa[0] === 'int') {
        if (!Number.isInteger(value) || value < moTa[1] || value > moTa[2]) throw loi(`${ten} không hợp lệ`);
        return value;
    }
    throw loi(`Không hỗ trợ trường ${ten}`);
}
function duLieuSach(body, taoMoi = false) {
    objectHopLe(body, taoMoi ? TRUONG_SACH : TRUONG_SACH.filter(ten => ten !== 'ma_dau_sach'));
    if (taoMoi && (body.ma_dau_sach == null || body.ten_sach == null)) throw loi('Mã đầu sách và tên sách là bắt buộc');
    if (!taoMoi && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) {
        if (value === null) {
            if (['ma_dau_sach', 'ten_sach', 'loai_tac_pham', ...BOOLEAN].includes(ten)) throw loi(`${ten} không được để trống`);
            duLieu[ten] = null;
        } else if (ten in CHUOI) {
            duLieu[ten] = chuoi(value, ten, CHUOI[ten]);
            if (ten === 'ma_dau_sach') {
                if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(duLieu[ten])) throw loi('Mã đầu sách không hợp lệ');
                duLieu[ten] = duLieu[ten].toUpperCase();
            }
            if (ten === 'duong_dan' && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(duLieu[ten])) throw loi('Đường dẫn phải là slug chữ thường, không dấu');
            if (ten === 'url_nguon') {
                let url;
                try { url = new URL(duLieu[ten]); } catch { throw loi('URL nguồn không hợp lệ'); }
                if (!['http:', 'https:'].includes(url.protocol)) throw loi('URL nguồn không hợp lệ');
            }
        } else if (ID.includes(ten)) duLieu[ten] = idHopLe(value, ten);
        else if (NAM.includes(ten)) duLieu[ten] = giaTri(value, ten, ['int', 1, 9999]);
        else if (TUOI.includes(ten)) duLieu[ten] = giaTri(value, ten, ['int', 0, 32767]);
        else if (BOOLEAN.includes(ten)) duLieu[ten] = giaTri(value, ten, ['boolean']);
        else if (ten === 'ngay_xuat_ban_hien_thi') duLieu[ten] = ngay(value, ten);
        else if (ten === 'loai_tac_pham') duLieu[ten] = giaTri(value, ten, ['enum', LOAI_TAC_PHAM]);
    }
    return duLieu;
}
function duLieuLienKet(loai, body, taoMoi = false) {
    const cauHinh = LIEN_KET[loai];
    if (!cauHinh) throw loi('Loại dữ liệu liên kết không hợp lệ');
    objectHopLe(body, taoMoi ? Object.keys(cauHinh.truong) : Object.keys(cauHinh.truong).filter(ten => !cauHinh.khoa.includes(ten)));
    if (taoMoi) for (const ten of cauHinh.batBuoc) if (body[ten] == null) throw loi(`${ten} là bắt buộc`);
    if (!taoMoi && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) {
        if (value === null && (cauHinh.batBuoc.includes(ten) || ['la_ten_uu_tien', 'la_nguoi_dong_gop_chinh', 'la_the_loai_chinh', 'la_phan_loai_chinh', 'thu_tu', 'thu_tu_hien_thi'].includes(ten))) throw loi(`${ten} không được để trống`);
        duLieu[ten] = giaTri(value, ten, cauHinh.truong[ten]);
    }
    return duLieu;
}
function boLocHopLe(query = {}) {
    objectHopLe(query, ['trang', 'kich_thuoc', 'tu_khoa', 'trang_thai', 'loai_tac_pham', 'tac_gia_id', 'the_loai_id', 'bo_sach_id', 'isbn', 'cho_hien_thi_cong_khai']);
    const trang = query.trang == null ? 1 : idHopLe(query.trang, 'Trang');
    const kich_thuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kich_thuoc > 100 || (trang - 1) * kich_thuoc > MAX_ID) throw loi('Phân trang không hợp lệ');
    const trang_thai = query.trang_thai == null ? null : giaTri(query.trang_thai, 'Trạng thái', ['enum', TRANG_THAI]);
    const loai_tac_pham = query.loai_tac_pham == null ? null : giaTri(query.loai_tac_pham, 'Loại tác phẩm', ['enum', LOAI_TAC_PHAM]);
    if (query.cho_hien_thi_cong_khai != null && !['true', 'false'].includes(query.cho_hien_thi_cong_khai)) throw loi('Bộ lọc hiển thị công khai không hợp lệ');
    return {
        trang, kich_thuoc, trang_thai, loai_tac_pham,
        tu_khoa: query.tu_khoa == null ? '' : chuoi(query.tu_khoa, 'Từ khóa', 120),
        tac_gia_id: query.tac_gia_id == null ? null : idHopLe(query.tac_gia_id, 'Tác giả'),
        the_loai_id: query.the_loai_id == null ? null : idHopLe(query.the_loai_id, 'Thể loại'),
        bo_sach_id: query.bo_sach_id == null ? null : idHopLe(query.bo_sach_id, 'Bộ sách'),
        isbn: query.isbn == null ? null : chuoi(query.isbn, 'ISBN', 20).replace(/[-\s]/g, ''),
        cho_hien_thi_cong_khai: query.cho_hien_thi_cong_khai == null ? null : query.cho_hien_thi_cong_khai === 'true'
    };
}
function trangThaiHopLe(body) {
    objectHopLe(body, ['trang_thai', 'ly_do_an']);
    if (!TRANG_THAI.includes(body.trang_thai)) throw loi('Trạng thái sách không hợp lệ');
    return { trang_thai: body.trang_thai, ly_do_an: body.ly_do_an == null ? null : chuoi(body.ly_do_an, 'Lý do ẩn', 20000) };
}

const LOAI_ANH = ['BIA_TRUOC', 'BIA_SAU', 'GAY_SACH', 'MUC_LUC', 'TRANG_DOC_THU', 'ANH_BEN_TRONG', 'ANH_GIOI_THIEU', 'ANH_KHAC'];
const TRUONG_ANH = ['tep_dinh_kem_id', 'loai_anh', 'tieu_de', 'mo_ta', 'van_ban_thay_the', 'thu_tu', 'la_anh_chinh', 'hien_thi_cong_khai'];
function duLieuAnhHopLe(body, taoMoi = false) {
    objectHopLe(body, taoMoi ? TRUONG_ANH : TRUONG_ANH.filter(ten => ten !== 'tep_dinh_kem_id'));
    if (taoMoi && body.tep_dinh_kem_id == null) throw loi('ID ảnh là bắt buộc');
    if (!taoMoi && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật ảnh');
    const duLieu = {};
    for (const [ten, value] of Object.entries(body)) {
        if (ten === 'tep_dinh_kem_id') duLieu[ten] = idHopLe(value, 'Ảnh');
        else if (ten === 'loai_anh') duLieu[ten] = giaTri(value, ten, ['enum', LOAI_ANH]);
        else if (ten === 'tieu_de') duLieu[ten] = value === null ? null : chuoi(value, ten, 200);
        else if (ten === 'mo_ta') duLieu[ten] = value === null ? null : chuoi(value, ten, 20000);
        else if (ten === 'van_ban_thay_the') duLieu[ten] = value === null ? null : chuoi(value, ten, 300);
        else if (ten === 'thu_tu') duLieu[ten] = giaTri(value, ten, ['int', 0, MAX_ID]);
        else if (['la_anh_chinh', 'hien_thi_cong_khai'].includes(ten)) duLieu[ten] = giaTri(value, ten, ['boolean']);
    }
    if (duLieu.la_anh_chinh === true && duLieu.hien_thi_cong_khai === false) throw loi('Ảnh chính không được đặt ở chế độ ẩn');
    return duLieu;
}
function danhSachAnhHopLe(body) {
    objectHopLe(body, ['anh']);
    if (!Array.isArray(body.anh) || !body.anh.length || body.anh.length > 100) throw loi('Mỗi lần gắn từ 1 đến 100 ảnh');
    const danhSach = body.anh.map(item => duLieuAnhHopLe(item, true));
    const ids = danhSach.map(item => item.tep_dinh_kem_id);
    if (new Set(ids).size !== ids.length) throw loi('Danh sách có ảnh bị trùng');
    if (danhSach.filter(item => item.la_anh_chinh === true).length > 1) throw loi('Mỗi lần chỉ được chọn một ảnh chính');
    return danhSach;
}
function sapXepAnhHopLe(body) {
    objectHopLe(body, ['anh_ids']);
    if (!Array.isArray(body.anh_ids) || !body.anh_ids.length || body.anh_ids.length > 1000) throw loi('Danh sách sắp xếp không hợp lệ');
    const ids = body.anh_ids.map(id => idHopLe(id, 'Ảnh sách'));
    if (new Set(ids).size !== ids.length) throw loi('Danh sách sắp xếp có ID trùng');
    return ids;
}
module.exports = { idHopLe, duLieuSach, duLieuLienKet, boLocHopLe, trangThaiHopLe, LIEN_KET, duLieuAnhHopLe, danhSachAnhHopLe, sapXepAnhHopLe };