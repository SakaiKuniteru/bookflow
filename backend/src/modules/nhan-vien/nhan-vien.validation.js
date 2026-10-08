const { AppError } = require('../../common/errors/AppError.js');

function loi(message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422 });
}
function loiTruong(field, message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422, details: [{ field, message }] });
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
    const kichThuoc = query.kichThuoc === undefined ? 20 : idHopLe(query.kichThuoc, 'Kích thước trang');
    if (kichThuoc > 100) throw loi('Mỗi trang tối đa 100 nhân viên');
    const tuKhoa = query.tuKhoa === undefined ? '' : chuoi(query.tuKhoa, 'Từ khóa', 120);
    const trangThai = query.trangThai || null;
    if (trangThai && !['CHO_MOI', 'DANG_LAM', 'TAM_KHOA', 'DA_ROI'].includes(trangThai)) throw loi('Trạng thái nhân viên không hợp lệ');
    return { trang, kichThuoc, tuKhoa, trangThai, chiNhanhId: query.chiNhanhId ? idHopLe(query.chiNhanhId, 'Chi nhánh') : null };
}
function capNhatHopLe(body) {
    const truong = { hoTen: 'hoTen', tenDangNhap: 'tenDangNhap', maNhanVien: 'maNhanVien', email: 'email', soDienThoai: 'dienThoai', chiNhanhId: 'chiNhanhId', loaiTaiKhoan: 'loaiTaiKhoan', active: 'boolean', ngaySinh: 'ngay', gioiTinh: 'gioiTinh', quocTich: 'chuoi', danToc: 'chuoi', moTa: 'chuoi', diaChi: 'chuoi', quocGia: 'chuoi', tinhThanh: 'chuoi', xaPhuong: 'chuoi', chucDanh: 'chuoi', emailCongViec: 'email', soDienThoaiCongViec: 'dienThoai', loaiNhanSu: 'loaiNhanSu', hinhThucLamViec: 'hinhThucLamViec', ngayBatDauThuViec: 'ngay', ngayKetThucThuViec: 'ngay', ngayChinhThuc: 'ngay', ngayNghiViecDuKien: 'ngay', maChamCong: 'chuoi', soMayLe: 'chuoi', emailNoiBo: 'email', ghiChuCongViec: 'chuoi', viTriChinhId: 'id', nguoiQuanLyId: 'id' };
    const gioiHan = { hoTen: 200, tenDangNhap: 40, maNhanVien: 40, email: 254, soDienThoai: 30, quocTich: 100, danToc: 100, moTa: 2000, diaChi: 300, quocGia: 100, tinhThanh: 150, xaPhuong: 150, chucDanh: 120, emailCongViec: 254, soDienThoaiCongViec: 30, maChamCong: 50, soMayLe: 20, emailNoiBo: 254, ghiChuCongViec: 3000 };
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) throw loi('Dữ liệu cập nhật không hợp lệ');
    if (Object.keys(body).some(name => !truong[name])) throw loi('Có trường không được phép cập nhật');
    const ketQua = {};
    for (const [name, value] of Object.entries(body)) {
        const type = truong[name];
        if (type === 'id') ketQua[name] = value === null ? null : idHopLe(value, name);
        else if (type === 'chiNhanhId') ketQua[name] = idHopLe(value, 'Chi nhánh');
        else if (type === 'ngay') ketQua[name] = ngayHopLe(value, name);
        else if (type === 'boolean') {
            if (typeof value !== 'boolean') throw loiTruong(name, 'Trạng thái hoạt động không hợp lệ');
            ketQua[name] = value;
        } else if (type === 'tenDangNhap') {
            if (typeof value !== 'string' || !/^[A-Za-z0-9._-]{3,40}$/.test(value.trim())) throw loiTruong(name, 'Tên đăng nhập phải có 3–40 ký tự hợp lệ');
            ketQua[name] = value.trim().toLowerCase();
        } else if (type === 'maNhanVien') {
            if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{2,40}$/.test(value.trim())) throw loiTruong(name, 'Mã nhân viên phải có 2–40 ký tự hợp lệ');
            ketQua[name] = value.trim().toUpperCase();
        } else if (type === 'loaiTaiKhoan') {
            if (!['NHAN_VIEN', 'QUAN_TRI'].includes(value)) throw loiTruong(name, 'Loại tài khoản không hợp lệ');
            ketQua[name] = value;
        } else if (type === 'hoTen') {
            const normalized = typeof value === 'string' ? value.trim().replace(/\s+/g, ' ') : '';
            if (normalized.length < 2 || normalized.length > 200) throw loiTruong(name, 'Họ và tên phải có từ 2 đến 200 ký tự');
            ketQua[name] = normalized;
        } else if (type === 'gioiTinh') {
            if (value !== null && !['NAM', 'NU', 'KHAC', 'KHONG_TIET_LO'].includes(value)) throw loiTruong(name, 'Giới tính không hợp lệ');
            ketQua[name] = value;
        } else if (type === 'loaiNhanSu') {
            if (!['CHINH_THUC', 'THOI_VU', 'CONG_TAC_VIEN'].includes(value)) throw loiTruong(name, 'Loại nhân sự không hợp lệ');
            ketQua[name] = value;
        } else if (type === 'hinhThucLamViec') {
            if (value !== null && !['TOAN_THOI_GIAN', 'BAN_THOI_GIAN'].includes(value)) throw loiTruong(name, 'Hình thức làm việc không hợp lệ');
            ketQua[name] = value;
        } else {
            const normalized = chuoi(value, name, gioiHan[name], { choNull: true, batBuoc: type === 'email' && name === 'email' });
            if (type === 'email' && normalized && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) throw loiTruong(name, 'Email không hợp lệ');
            if (type === 'dienThoai' && normalized && !/^[0-9+(). -]{9,30}$/.test(normalized)) throw loiTruong(name, 'Số điện thoại không hợp lệ');
            ketQua[name] = type === 'email' && normalized ? normalized.toLowerCase() : normalized;
        }
    }
    return ketQua;
}
function trangThaiHopLe(body) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some(ten => !['trangThai', 'lyDo'].includes(ten))) throw loi('Dữ liệu trạng thái không hợp lệ');
    if (!['DANG_LAM', 'TAM_KHOA', 'DA_ROI'].includes(body.trangThai)) throw loi('Trạng thái không hợp lệ');
    const lyDo = body.lyDo === undefined ? null : chuoi(body.lyDo, 'Lý do', 1000, { choNull: true });
    if (body.trangThai === 'DA_ROI' && !lyDo) throw loi('Phải nhập lý do nghỉ việc');
    return { trangThai: body.trangThai, lyDo };
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