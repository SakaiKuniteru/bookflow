const { loi,idHopLe,chuoi,truongHopLe,ngay } = require('../khach-hang/khach-hang.validation.js');
function matHangHopLe(body,sua = false) {
    truongHopLe(body,['phien_ban_sach_id','hinh_thuc','so_luong','ngay_bat_dau_du_kien','ngay_ket_thuc_du_kien','ghi_chu'],sua ? [] : ['phien_ban_sach_id','so_luong']);
    if (sua && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const data = {};
    if (body.phien_ban_sach_id !== undefined) data.phien_ban_sach_id = idHopLe(body.phien_ban_sach_id,'Phiên bản sách');
    if (body.hinh_thuc !== undefined || !sua) {
        const hinhThuc = body.hinh_thuc ?? 'MUA';
        if (!['MUA','THUE','MUON','DAT_TRUOC'].includes(hinhThuc)) throw loi('Hình thức không hợp lệ');
        data.hinh_thuc = hinhThuc;
    }
    if (body.so_luong !== undefined) {
        if (!Number.isSafeInteger(body.so_luong) || body.so_luong < 1 || body.so_luong > 10000) throw loi('Số lượng phải từ 1 đến 10000');
        data.so_luong = body.so_luong;
    }
    for (const key of ['ngay_bat_dau_du_kien','ngay_ket_thuc_du_kien']) if (body[key] !== undefined) data[key] = ngay(body[key],key);
    if (body.ghi_chu !== undefined) data.ghi_chu = chuoi(body.ghi_chu,'Ghi chú',20000);
    if (data.ngay_bat_dau_du_kien && data.ngay_ket_thuc_du_kien && data.ngay_ket_thuc_du_kien < data.ngay_bat_dau_du_kien) throw loi('Ngày kết thúc phải từ ngày bắt đầu');
    return data;
}
function gioMoiHopLe(body) {
    truongHopLe(body,['khach_hang_id','chi_nhanh_id','ngay_het_han']);
    return {
        khach_hang_id: body.khach_hang_id == null ? null : idHopLe(body.khach_hang_id,'Khách hàng'),
        chi_nhanh_id: body.chi_nhanh_id == null ? null : idHopLe(body.chi_nhanh_id,'Chi nhánh'),
        ngay_het_han: body.ngay_het_han == null ? null : new Date(body.ngay_het_han).toISOString()
    };
}
module.exports = { loi,idHopLe,chuoi,truongHopLe,matHangHopLe,gioMoiHopLe };