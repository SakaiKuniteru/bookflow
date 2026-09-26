const { loi,idHopLe,chuoi,truongHopLe } = require('../khach-hang/khach-hang.validation.js');
const { lamTronTien,soSanhTien } = require('../../common/utils/tien.js');
function tienKhongAm(value,ten) {
    const tien = lamTronTien(value);
    if (soSanhTien(tien,'0') < 0) throw loi(`${ten} không được âm`);
    return tien;
}
function moCaHopLe(body) {
    truongHopLe(body,['chi_nhanh_id','tien_dau_ca','ghi_chu'],['chi_nhanh_id']);
    return { chi_nhanh_id: idHopLe(body.chi_nhanh_id,'Chi nhánh'),tien_dau_ca: tienKhongAm(body.tien_dau_ca ?? '0','Tiền đầu ca'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function dongCaHopLe(body) {
    truongHopLe(body,['tien_mat_kiem_dem','ghi_chu'],['tien_mat_kiem_dem']);
    return { tien_mat_kiem_dem: tienKhongAm(body.tien_mat_kiem_dem,'Tiền kiểm đếm'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function taoPhienHopLe(body) {
    truongHopLe(body,['ca_ban_hang_id','kenh_ban','thiet_bi'],['kenh_ban']);
    if (!['POS','WEBSITE','APP','DIEN_THOAI','NOI_BO','KHAC'].includes(body.kenh_ban)) throw loi('Kênh bán không hợp lệ');
    return { ca_ban_hang_id: body.ca_ban_hang_id == null ? null : idHopLe(body.ca_ban_hang_id,'Ca bán hàng'),kenh_ban: body.kenh_ban,thiet_bi: chuoi(body.thiet_bi,'Thiết bị',150) };
}
function thuTienHopLe(body) {
    truongHopLe(body,['don_hang_id','phuong_thuc_id','so_tien','khoa_chong_trung','noi_dung'],['don_hang_id','phuong_thuc_id','so_tien','khoa_chong_trung']);
    const soTien = tienKhongAm(body.so_tien,'Số tiền thu');
    if (soSanhTien(soTien,'0') <= 0) throw loi('Số tiền thu phải lớn hơn 0');
    return { don_hang_id: idHopLe(body.don_hang_id,'Đơn hàng'),phuong_thuc_id: idHopLe(body.phuong_thuc_id,'Phương thức thanh toán'),so_tien: soTien,khoa_chong_trung: chuoi(body.khoa_chong_trung,'Khóa chống trùng',150,true),noi_dung: chuoi(body.noi_dung,'Nội dung',20000) };
}
module.exports = { loi,idHopLe,chuoi,moCaHopLe,dongCaHopLe,taoPhienHopLe,thuTienHopLe };