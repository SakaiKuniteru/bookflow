const { AppError } = require('../../common/errors/AppError.js');

function loi(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}
function idHopLe(value, ten = 'ID') {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw loi(`${ten} không hợp lệ`);
    return id;
}
function chuoi(value, ten, max, { choNull = false, batBuoc = false } = {}) {
    if (value === null && choNull) return null;
    if (typeof value !== 'string') throw loi(`${ten} phải là chuỗi`);
    const ketQua = value.trim();
    if ((!ketQua && batBuoc) || ketQua.length > max) throw loi(`${ten} không hợp lệ`);
    return ketQua || (choNull ? null : '');
}
function ngayHopLe(value, ten) {
    if (value === null) return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw loi(`${ten} phải có dạng yyyy-mm-dd`);
    const ngay = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(ngay.getTime()) || ngay.toISOString().slice(0, 10) !== value) throw loi(`${ten} không hợp lệ`);
    return value;
}
function phanTrangHopLe(query = {}) {
    const trang = query.trang === undefined ? 1 : idHopLe(query.trang, 'Trang');
    const kichThuoc = query.kich_thuoc === undefined ? 20 : idHopLe(query.kich_thuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Mỗi trang tối đa 100 nhân viên');
    const tuKhoa = query.tu_khoa === undefined ? '' : chuoi(query.tu_khoa, 'Từ khóa', 120);
    const trangThai = query.trang_thai || null;
    if (trangThai && !['CHO_MOI', 'DANG_LAM', 'TAM_KHOA', 'DA_ROI'].includes(trangThai)) throw loi('Trạng thái nhân viên không hợp lệ');
    return { trang, kichThuoc, tuKhoa, trangThai, chiNhanhId: query.chi_nhanh_id ? idHopLe(query.chi_nhanh_id, 'Chi nhánh') : null };
}
function capNhatHopLe(body) {
    const truong = {
        chuc_danh: 'chuoi', email_cong_viec: 'email', so_dien_thoai_cong_viec: 'dien_thoai',
        loai_nhan_su: 'loai_nhan_su', hinh_thuc_lam_viec: 'hinh_thuc_lam_viec',
        ngay_bat_dau_thu_viec: 'ngay', ngay_ket_thuc_thu_viec: 'ngay',
        ngay_chinh_thuc: 'ngay', ngay_nghi_viec_du_kien: 'ngay',
        ma_cham_cong: 'chuoi', so_may_le: 'chuoi', email_noi_bo: 'email',
        ghi_chu_cong_viec: 'ghi_chu', vi_tri_chinh_id: 'id', nguoi_quan_ly_id: 'id'
    };
    const gioiHan = { chuc_danh: 120, email_cong_viec: 254, so_dien_thoai_cong_viec: 30, ma_cham_cong: 50, so_may_le: 20, email_noi_bo: 254, ghi_chu_cong_viec: 3000 };
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) throw loi('Dữ liệu cập nhật không hợp lệ');
    if (Object.keys(body).some(ten => !truong[ten])) throw loi('Có trường không được phép cập nhật');
    const ketQua = {};
    for (const [ten, value] of Object.entries(body)) {
        const loai = truong[ten];
        if (loai === 'id') ketQua[ten] = value === null ? null : idHopLe(value, ten);
        else if (loai === 'ngay') ketQua[ten] = ngayHopLe(value, ten);
        else if (loai === 'loai_nhan_su') {
            if (!['CHINH_THUC', 'THOI_VU', 'CONG_TAC_VIEN'].includes(value)) throw loi('Loại nhân sự không hợp lệ');
            ketQua[ten] = value;
        } else if (loai === 'hinh_thuc_lam_viec') {
            if (value !== null && !['TOAN_THOI_GIAN', 'BAN_THOI_GIAN'].includes(value)) throw loi('Hình thức làm việc không hợp lệ');
            ketQua[ten] = value;
        } else {
            ketQua[ten] = chuoi(value, ten, gioiHan[ten], { choNull: true });
            if (loai === 'email' && ketQua[ten] && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ketQua[ten])) throw loi(`${ten} không phải email hợp lệ`);
            if (loai === 'dien_thoai' && ketQua[ten] && !/^[0-9+(). -]{9,30}$/.test(ketQua[ten])) throw loi('Số điện thoại không hợp lệ');
            if (loai === 'email' && ketQua[ten]) ketQua[ten] = ketQua[ten].toLowerCase();
        }
    }
    return ketQua;
}
function trangThaiHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(ten => !['trang_thai', 'ly_do'].includes(ten))) throw loi('Dữ liệu trạng thái không hợp lệ');
    if (!['DANG_LAM', 'TAM_KHOA', 'DA_ROI'].includes(body.trang_thai)) throw loi('Trạng thái không hợp lệ');
    const lyDo = body.ly_do === undefined ? null : chuoi(body.ly_do, 'Lý do', 1000, { choNull: true });
    if (body.trang_thai === 'DA_ROI' && !lyDo) throw loi('Phải nhập lý do nghỉ việc');
    return { trangThai: body.trang_thai, lyDo };
}
function chuyenChiNhanhHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(ten => !['chi_nhanh_cu_id', 'chi_nhanh_moi_id', 'ly_do'].includes(ten))) throw loi('Dữ liệu điều chuyển không hợp lệ');
    const chiNhanhCuId = idHopLe(body.chi_nhanh_cu_id, 'Chi nhánh cũ');
    const chiNhanhMoiId = idHopLe(body.chi_nhanh_moi_id, 'Chi nhánh mới');
    if (chiNhanhCuId === chiNhanhMoiId) throw loi('Chi nhánh mới phải khác chi nhánh cũ');
    return { chiNhanhCuId, chiNhanhMoiId, lyDo: chuoi(body.ly_do, 'Lý do', 1000, { batBuoc: true }) };
}
function phanCongViTriHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(ten => !['vi_tri_cong_viec_id', 'chi_nhanh_id', 'la_vi_tri_chinh', 'ly_do'].includes(ten))) throw loi('Dữ liệu phân công vị trí không hợp lệ');
    if (body.la_vi_tri_chinh !== undefined && typeof body.la_vi_tri_chinh !== 'boolean') throw loi('Vị trí chính phải là boolean');
    return { viTriId: idHopLe(body.vi_tri_cong_viec_id, 'Vị trí'), chiNhanhId: body.chi_nhanh_id == null ? null : idHopLe(body.chi_nhanh_id, 'Chi nhánh'), laChinh: body.la_vi_tri_chinh ?? false, lyDo: body.ly_do ? chuoi(body.ly_do, 'Lý do', 1000) : null };
}
function viTriMoiHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(ten => !['ma_vi_tri', 'ten_vi_tri', 'mo_ta', 'nhom_vi_tri', 'cap_bac', 'yeu_cau_nghiep_vu'].includes(ten))) throw loi('Dữ liệu vị trí không hợp lệ');
    const ma = chuoi(body.ma_vi_tri, 'Mã vị trí', 40, { batBuoc: true }).toUpperCase();
    if (!/^[A-Z0-9_-]{2,40}$/.test(ma)) throw loi('Mã vị trí không hợp lệ');
    return { ma, ten: chuoi(body.ten_vi_tri, 'Tên vị trí', 160, { batBuoc: true }), moTa: body.mo_ta == null ? null : chuoi(body.mo_ta, 'Mô tả', 3000), nhom: body.nhom_vi_tri == null ? null : chuoi(body.nhom_vi_tri, 'Nhóm vị trí', 60), capBac: body.cap_bac == null ? null : idHopLe(body.cap_bac, 'Cấp bậc'), yeuCau: body.yeu_cau_nghiep_vu == null ? null : chuoi(body.yeu_cau_nghiep_vu, 'Yêu cầu nghiệp vụ', 3000) };
}
module.exports = { idHopLe, phanTrangHopLe, capNhatHopLe, trangThaiHopLe, chuyenChiNhanhHopLe, phanCongViTriHopLe, viTriMoiHopLe };