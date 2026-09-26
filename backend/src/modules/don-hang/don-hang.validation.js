const { loi,idHopLe,chuoi,truongHopLe,email,dienThoai } = require('../khach-hang/khach-hang.validation.js');
const { matHangHopLe } = require('../gio-hang/gio-hang.validation.js');
function taoHopLe(body) {
    truongHopLe(body,['gio_hang_id','chi_nhanh_id','khach_hang_id','kenh_ban','mat_hang','ma_giam_gia','ten_nguoi_mua','email_nguoi_mua','so_dien_thoai_nguoi_mua','thong_tin_xuat_hoa_don','ghi_chu_khach_hang','ghi_chu_noi_bo'],['chi_nhanh_id','kenh_ban']);
    if (body.gio_hang_id == null && (!Array.isArray(body.mat_hang) || !body.mat_hang.length)) throw loi('Phải chọn giỏ hàng hoặc mặt hàng');
    if (body.gio_hang_id != null && body.mat_hang !== undefined) throw loi('Không được gửi đồng thời giỏ hàng và mặt hàng');
    if (!['POS','WEBSITE','APP','DIEN_THOAI','NOI_BO','KHAC'].includes(body.kenh_ban)) throw loi('Kênh bán không hợp lệ');
    const matHang = body.mat_hang?.map(item => matHangHopLe(item)) ?? null;
    if (matHang?.some(item => item.hinh_thuc === 'DAT_TRUOC')) throw loi('Đặt trước phải thực hiện qua nghiệp vụ đặt trước riêng',409,'PREORDER_REQUIRED');
    return {
        gio_hang_id: body.gio_hang_id == null ? null : idHopLe(body.gio_hang_id,'Giỏ hàng'),
        chi_nhanh_id: idHopLe(body.chi_nhanh_id,'Chi nhánh'),
        khach_hang_id: body.khach_hang_id == null ? null : idHopLe(body.khach_hang_id,'Khách hàng'),
        kenh_ban: body.kenh_ban,
        mat_hang: matHang,
        ma_giam_gia: chuoi(body.ma_giam_gia,'Mã giảm giá',60),
        ten_nguoi_mua: chuoi(body.ten_nguoi_mua,'Tên người mua',200),
        email_nguoi_mua: email(body.email_nguoi_mua),
        so_dien_thoai_nguoi_mua: dienThoai(body.so_dien_thoai_nguoi_mua),
        thong_tin_xuat_hoa_don: body.thong_tin_xuat_hoa_don ?? {},
        ghi_chu_khach_hang: chuoi(body.ghi_chu_khach_hang,'Ghi chú khách hàng',20000),
        ghi_chu_noi_bo: chuoi(body.ghi_chu_noi_bo,'Ghi chú nội bộ',20000)
    };
}
function trangThaiHopLe(body) {
    truongHopLe(body,['trang_thai','ly_do'],['trang_thai']);
    if (!['CHO_XAC_NHAN','DA_XAC_NHAN','DANG_CHUAN_BI','DA_HUY'].includes(body.trang_thai)) throw loi('Trạng thái không hợp lệ');
    return { trang_thai: body.trang_thai,ly_do: chuoi(body.ly_do,'Lý do',20000) };
}
function vanDonHopLe(body) {
    truongHopLe(body,['phuong_thuc','nguoi_nhan','so_dien_thoai','dia_chi_nhan','mat_hang','don_vi_van_chuyen','ma_theo_doi','ghi_chu'],['phuong_thuc','nguoi_nhan','mat_hang']);
    if (!['GIAO_NOI_BO','DOI_TAC','KHACH_TU_NHAN'].includes(body.phuong_thuc)) throw loi('Phương thức giao không hợp lệ');
    if (!Array.isArray(body.mat_hang) || !body.mat_hang.length) throw loi('Vận đơn không có mặt hàng');
    return {
        phuong_thuc: body.phuong_thuc,
        nguoi_nhan: chuoi(body.nguoi_nhan,'Người nhận',200,true),
        so_dien_thoai: dienThoai(body.so_dien_thoai),
        dia_chi_nhan: body.dia_chi_nhan ?? {},
        don_vi_van_chuyen: chuoi(body.don_vi_van_chuyen,'Đơn vị vận chuyển',150),
        ma_theo_doi: chuoi(body.ma_theo_doi,'Mã theo dõi',150),
        ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),
        mat_hang: body.mat_hang.map(item => {
            if (!Number.isSafeInteger(item.so_luong) || item.so_luong < 1) throw loi('Số lượng giao không hợp lệ');
            return { chi_tiet_don_hang_id: idHopLe(item.chi_tiet_don_hang_id,'Chi tiết đơn hàng'),so_luong: item.so_luong };
        })
    };
}
module.exports = { loi,idHopLe,chuoi,truongHopLe,taoHopLe,trangThaiHopLe,vanDonHopLe };