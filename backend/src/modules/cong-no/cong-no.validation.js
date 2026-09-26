const v = require('../thanh-toan/thanh-toan.validation.js');
function tao(body) {
    v.fields(body,['chi_nhanh_id','khach_hang_id','nha_cung_cap_id','loai_cong_no','loai_nguon','nguon_id','so_tien_goc','ngay_phat_sinh','ngay_den_han','ghi_chu'],['loai_cong_no','loai_nguon','so_tien_goc']);
    const loai = v.enumValue(body.loai_cong_no,['PHAI_THU','PHAI_TRA'],'Loại công nợ');
    const nguon = v.enumValue(body.loai_nguon,['DON_HANG','PHIEU_NHAP','MUON_TRA','PHI_PHAT','DIEU_CHINH','KHAC'],'Loại nguồn');
    if (loai === 'PHAI_THU' && (body.khach_hang_id == null || body.nha_cung_cap_id != null) || loai === 'PHAI_TRA' && (body.nha_cung_cap_id == null || body.khach_hang_id != null)) throw v.loi('Phải thu chỉ có khách hàng; phải trả chỉ có nhà cung cấp');
    if (nguon === 'DON_HANG' && loai !== 'PHAI_THU' || nguon === 'PHIEU_NHAP' && loai !== 'PHAI_TRA') throw v.loi('Loại nguồn không phù hợp loại công nợ');
    if (['DON_HANG','PHIEU_NHAP','PHI_PHAT','MUON_TRA'].includes(nguon) && body.nguon_id == null) throw v.loi('Nguồn phát sinh bắt buộc có ID');
    const phatSinh = body.ngay_phat_sinh == null ? null : v.ngay(body.ngay_phat_sinh,'Ngày phát sinh');
    const denHan = body.ngay_den_han == null ? null : v.ngay(body.ngay_den_han,'Ngày đến hạn');
    if (phatSinh && denHan && denHan < phatSinh) throw v.loi('Hạn thanh toán không được trước ngày phát sinh');
    return { chi_nhanh_id: body.chi_nhanh_id == null ? null : v.id(body.chi_nhanh_id,'Chi nhánh'),khach_hang_id: body.khach_hang_id == null ? null : v.id(body.khach_hang_id,'Khách hàng'),nha_cung_cap_id: body.nha_cung_cap_id == null ? null : v.id(body.nha_cung_cap_id,'Nhà cung cấp'),loai_cong_no: loai,loai_nguon: nguon,nguon_id: body.nguon_id == null ? null : v.id(body.nguon_id,'Nguồn'),so_tien_goc: v.tien(body.so_tien_goc),ngay_phat_sinh: phatSinh,ngay_den_han: denHan,ghi_chu: v.chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function dieuChinh(body) {
    v.fields(body,['loai','so_tien','ly_do'],['loai','so_tien','ly_do']);
    return { loai: v.enumValue(body.loai,['GIAM_NO','DIEU_CHINH_TANG','DIEU_CHINH_GIAM','XOA_NO'],'Loại điều chỉnh'),so_tien: v.tien(body.so_tien),ly_do: v.chuoi(body.ly_do,'Lý do',20000,true) };
}
function thuChi(body) {
    v.fields(body,['phuong_thuc_id','tai_khoan_nhan_id','so_tien','khoa_chong_trung','noi_dung','nguoi_thu_huong'],['phuong_thuc_id','so_tien','khoa_chong_trung']);
    return { phuong_thuc_id: v.id(body.phuong_thuc_id,'Phương thức'),tai_khoan_nhan_id: body.tai_khoan_nhan_id == null ? null : v.id(body.tai_khoan_nhan_id,'Tài khoản'),so_tien: v.tien(body.so_tien),khoa_chong_trung: v.chuoi(body.khoa_chong_trung,'Khóa chống trùng',150,true),noi_dung: v.chuoi(body.noi_dung,'Nội dung',20000),nguoi_thu_huong: body.nguoi_thu_huong == null ? null : v.json(body.nguoi_thu_huong,'Người thụ hưởng') };
}
module.exports = { tao,dieuChinh,thuChi };