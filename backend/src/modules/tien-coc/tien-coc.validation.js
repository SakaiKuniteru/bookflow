const v = require('../thanh-toan/thanh-toan.validation.js');
function tao(body) {
    v.fields(body,['khach_hang_id','loai_doi_tuong','doi_tuong_id','so_tien_yeu_cau','ngay_den_han','ghi_chu'],['khach_hang_id','loai_doi_tuong','doi_tuong_id','so_tien_yeu_cau']);
    let han = null;
    if (body.ngay_den_han != null) {
        han = new Date(body.ngay_den_han);
        if (Number.isNaN(han.getTime()) || han <= new Date()) throw v.loi('Hạn cọc phải là thời điểm trong tương lai');
    }
    return { khach_hang_id: v.id(body.khach_hang_id,'Khách hàng'),loai_doi_tuong: v.enumValue(body.loai_doi_tuong,['DON_HANG','DAT_TRUOC','MUON_TRA','KHAC'],'Loại đối tượng'),doi_tuong_id: v.id(body.doi_tuong_id,'Đối tượng'),so_tien_yeu_cau: v.tien(body.so_tien_yeu_cau),ngay_den_han: han?.toISOString() ?? null,ghi_chu: v.chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function soTien(body) {
    v.fields(body,['so_tien','ly_do'],['so_tien','ly_do']);
    return { so_tien: v.tien(body.so_tien),ly_do: v.chuoi(body.ly_do,'Lý do',20000,true) };
}
function khauTru(body) {
    v.fields(body,['so_tien','loai_doi_tuong','doi_tuong_id','ly_do'],['so_tien','loai_doi_tuong','doi_tuong_id','ly_do']);
    return { so_tien: v.tien(body.so_tien),loai_doi_tuong: v.enumValue(body.loai_doi_tuong,['DON_HANG','CONG_NO'],'Đối tượng khấu trừ'),doi_tuong_id: v.id(body.doi_tuong_id,'Đối tượng khấu trừ'),ly_do: v.chuoi(body.ly_do,'Lý do',20000,true) };
}
function thu(body) {
    v.fields(body,['chi_nhanh_id','phuong_thuc_id','tai_khoan_nhan_id','so_tien','khoa_chong_trung','noi_dung'],['chi_nhanh_id','phuong_thuc_id','so_tien','khoa_chong_trung']);
    return { chi_nhanh_id: v.id(body.chi_nhanh_id,'Chi nhánh'),phuong_thuc_id: v.id(body.phuong_thuc_id,'Phương thức'),tai_khoan_nhan_id: body.tai_khoan_nhan_id == null ? null : v.id(body.tai_khoan_nhan_id,'Tài khoản'),so_tien: v.tien(body.so_tien),khoa_chong_trung: v.chuoi(body.khoa_chong_trung,'Khóa chống trùng',150,true),noi_dung: v.chuoi(body.noi_dung,'Nội dung',20000) };
}
function yeuCauHoan(body) {
    v.fields(body,['giao_dich_goc_id','so_tien','ly_do'],['giao_dich_goc_id','so_tien','ly_do']);
    return { giao_dich_goc_id: v.id(body.giao_dich_goc_id,'Giao dịch gốc'),so_tien: v.tien(body.so_tien),ly_do: v.chuoi(body.ly_do,'Lý do',20000,true) };
}
module.exports = { tao,soTien,khauTru,thu,yeuCauHoan };