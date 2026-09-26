const { loi, idHopLe, chuoi, truongHopLe } = require('../khach-hang/khach-hang.validation.js');
function soNguyen(value, ten, min = 0) {
    if (!Number.isSafeInteger(value) || value < min) throw loi(`${ten} phải là số nguyên từ ${min} trở lên`);
    return value;
}
function soTien(value, ten) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || Math.round(value * 100) !== value * 100) throw loi(`${ten} phải là số tiền không âm, tối đa 2 chữ số thập phân`);
    return value;
}
function thoiGian(value, ten, batBuoc = false) {
    if (value == null || value === '') {
        if (batBuoc) throw loi(`${ten} là bắt buộc`);
        return null;
    }
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(value) || Number.isNaN(Date.parse(value))) throw loi(`${ten} phải là thời gian ISO 8601`);
    return new Date(value).toISOString();
}
function json(value, ten, macDinh) {
    if (value === undefined) return macDinh;
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw loi(`${ten} phải là object`);
    return value;
}
function hangMoiHopLe(body) {
    truongHopLe(body,['ma_hang','ten_hang','thu_tu','diem_toi_thieu','chi_tieu_toi_thieu','mau_hien_thi','mo_ta'],['ma_hang','ten_hang']);
    return { ma_hang: chuoi(body.ma_hang,'Mã hạng',40,true), ten_hang: chuoi(body.ten_hang,'Tên hạng',150,true), thu_tu: soNguyen(body.thu_tu ?? 0,'Thứ tự'), diem_toi_thieu: soNguyen(body.diem_toi_thieu ?? 0,'Điểm tối thiểu'), chi_tieu_toi_thieu: soTien(body.chi_tieu_toi_thieu ?? 0,'Chi tiêu tối thiểu'), mau_hien_thi: chuoi(body.mau_hien_thi,'Màu hiển thị',20), mo_ta: chuoi(body.mo_ta,'Mô tả',20000) };
}
function suaHangHopLe(body) {
    truongHopLe(body,['ten_hang','thu_tu','diem_toi_thieu','chi_tieu_toi_thieu','mau_hien_thi','mo_ta','trang_thai']);
    if (!Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const result = {};
    if (body.ten_hang !== undefined) result.ten_hang = chuoi(body.ten_hang,'Tên hạng',150,true);
    if (body.thu_tu !== undefined) result.thu_tu = soNguyen(body.thu_tu,'Thứ tự');
    if (body.diem_toi_thieu !== undefined) result.diem_toi_thieu = soNguyen(body.diem_toi_thieu,'Điểm tối thiểu');
    if (body.chi_tieu_toi_thieu !== undefined) result.chi_tieu_toi_thieu = soTien(body.chi_tieu_toi_thieu,'Chi tiêu tối thiểu');
    if (body.mau_hien_thi !== undefined) result.mau_hien_thi = chuoi(body.mau_hien_thi,'Màu hiển thị',20);
    if (body.mo_ta !== undefined) result.mo_ta = chuoi(body.mo_ta,'Mô tả',20000);
    if (body.trang_thai !== undefined) {
        if (!['HOAT_DONG','NGUNG_HOAT_DONG'].includes(body.trang_thai)) throw loi('Trạng thái hạng không hợp lệ');
        result.trang_thai = body.trang_thai;
    }
    return result;
}
function chinhSachHopLe(body) {
    truongHopLe(body,['ty_le_tich_diem','so_tien_moi_diem','gia_tri_moi_diem','giam_gia_phan_tram','giam_gia_toi_da','mien_phi_van_chuyen','so_lan_gia_han_mien_phi','so_ngay_muon_them','han_su_dung_diem_ngay','dieu_kien','quyen_loi','hieu_luc_tu','hieu_luc_den'],['hieu_luc_tu']);
    const tu = thoiGian(body.hieu_luc_tu,'Hiệu lực từ',true);
    const den = thoiGian(body.hieu_luc_den,'Hiệu lực đến');
    if (den && den <= tu) throw loi('Hiệu lực đến phải sau hiệu lực từ');
    if (body.mien_phi_van_chuyen !== undefined && typeof body.mien_phi_van_chuyen !== 'boolean') throw loi('mien_phi_van_chuyen phải là boolean');
    const phanTram = soTien(body.giam_gia_phan_tram ?? 0,'Giảm giá phần trăm');
    if (phanTram > 100) throw loi('Giảm giá phần trăm tối đa 100');
    const tyLe = body.ty_le_tich_diem ?? 0;
    if (typeof tyLe !== 'number' || !Number.isFinite(tyLe) || tyLe < 0) throw loi('Tỷ lệ tích điểm không hợp lệ');
    return { ty_le_tich_diem: tyLe, so_tien_moi_diem: body.so_tien_moi_diem == null ? null : soTien(body.so_tien_moi_diem,'Số tiền mỗi điểm'), gia_tri_moi_diem: soTien(body.gia_tri_moi_diem ?? 0,'Giá trị mỗi điểm'), giam_gia_phan_tram: phanTram, giam_gia_toi_da: body.giam_gia_toi_da == null ? null : soTien(body.giam_gia_toi_da,'Giảm giá tối đa'), mien_phi_van_chuyen: body.mien_phi_van_chuyen ?? false, so_lan_gia_han_mien_phi: soNguyen(body.so_lan_gia_han_mien_phi ?? 0,'Số lần gia hạn miễn phí'), so_ngay_muon_them: soNguyen(body.so_ngay_muon_them ?? 0,'Số ngày mượn thêm'), han_su_dung_diem_ngay: body.han_su_dung_diem_ngay == null ? null : soNguyen(body.han_su_dung_diem_ngay,'Hạn sử dụng điểm',1), dieu_kien: json(body.dieu_kien,'Điều kiện',{}), quyen_loi: json(body.quyen_loi,'Quyền lợi',{}), hieu_luc_tu: tu, hieu_luc_den: den };
}
function dangKyHopLe(body) {
    truongHopLe(body,['khach_hang_id','hang_hoi_vien_id','ma_hoi_vien','ngay_het_han'],['khach_hang_id','hang_hoi_vien_id','ma_hoi_vien']);
    return { khach_hang_id: idHopLe(body.khach_hang_id,'Khách hàng'), hang_hoi_vien_id: idHopLe(body.hang_hoi_vien_id,'Hạng hội viên'), ma_hoi_vien: chuoi(body.ma_hoi_vien,'Mã hội viên',40,true), ngay_het_han: thoiGian(body.ngay_het_han,'Ngày hết hạn') };
}
function chuyenHangHopLe(body) {
    truongHopLe(body,['hang_hoi_vien_id','ly_do'],['hang_hoi_vien_id']);
    return { hang_hoi_vien_id: idHopLe(body.hang_hoi_vien_id,'Hạng hội viên'), ly_do: chuoi(body.ly_do,'Lý do',20000) };
}
function giaoDichDiemHopLe(body) {
    truongHopLe(body,['loai_giao_dich','so_diem','loai_tham_chieu','tham_chieu_id','khoa_chong_trung','ngay_het_han','ghi_chu'],['loai_giao_dich','so_diem','khoa_chong_trung']);
    if (!['TICH_DIEM','DOI_DIEM','HOAN_DIEM','DIEU_CHINH_TANG','DIEU_CHINH_GIAM','HET_HAN'].includes(body.loai_giao_dich)) throw loi('Loại giao dịch điểm không hợp lệ');
    return { loai_giao_dich: body.loai_giao_dich, so_diem: soNguyen(body.so_diem,'Số điểm',1), loai_tham_chieu: chuoi(body.loai_tham_chieu,'Loại tham chiếu',40), tham_chieu_id: body.tham_chieu_id == null ? null : idHopLe(body.tham_chieu_id,'Tham chiếu'), khoa_chong_trung: chuoi(body.khoa_chong_trung,'Khóa chống trùng',150,true), ngay_het_han: thoiGian(body.ngay_het_han,'Ngày hết hạn'), ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function boLocHopLe(query = {}) {
    const trang = query.trang == null ? 1 : idHopLe(query.trang,'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc,'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    return { trang, kich_thuoc: kichThuoc, tu_khoa: chuoi(query.tu_khoa,'Từ khóa',200), hang_hoi_vien_id: query.hang_hoi_vien_id == null ? null : idHopLe(query.hang_hoi_vien_id,'Hạng hội viên') };
}
module.exports = { loi, idHopLe, truongHopLe, hangMoiHopLe, suaHangHopLe, chinhSachHopLe, dangKyHopLe, chuyenHangHopLe, giaoDichDiemHopLe, boLocHopLe };