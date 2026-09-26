const { loi,idHopLe,chuoi,truongHopLe } = require('../khach-hang/khach-hang.validation.js');
const { lamTronTien } = require('../../common/utils/tien.js');
const TRANG_THAI = ['CHO_SACH','CO_SACH','DA_THONG_BAO','CHO_NHAN','DA_NHAN','HET_HAN','DA_HUY'];
const HINH_THUC = ['MUA','MUON','THUE'];
function thoiGian(value,ten) {
    if (value == null) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw loi(`${ten} không hợp lệ`);
    return d.toISOString();
}
function soNguyen(value,ten,min = 1) {
    if (!Number.isSafeInteger(value) || value < min) throw loi(`${ten} phải là số nguyên từ ${min}`);
    return value;
}
function tien(value,ten = 'Số tiền') {
    if (value == null) return null;
    if (!['string','number'].includes(typeof value) || !/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(String(value))) throw loi(`${ten} không hợp lệ`);
    if (Number(String(value)) < 0) throw loi(`${ten} không được âm`);
    return lamTronTien(String(value));
}
function tao(body) {
    truongHopLe(body,['chi_nhanh_id','khach_hang_id','don_hang_id','muc_uu_tien','ngay_du_kien_co_sach','ngay_het_han_nhan','ghi_chu','chi_tiet'],['khach_hang_id','chi_tiet']);
    if (!Array.isArray(body.chi_tiet) || !body.chi_tiet.length) throw loi('Phải có ít nhất một sách đặt trước');
    const data = { chi_nhanh_id: body.chi_nhanh_id == null ? null : idHopLe(body.chi_nhanh_id,'Chi nhánh'),khach_hang_id: idHopLe(body.khach_hang_id,'Khách hàng'),don_hang_id: body.don_hang_id == null ? null : idHopLe(body.don_hang_id,'Đơn hàng'),muc_uu_tien: body.muc_uu_tien == null ? 0 : soNguyen(body.muc_uu_tien,'Mức ưu tiên',0),ngay_du_kien_co_sach: thoiGian(body.ngay_du_kien_co_sach,'Ngày dự kiến có sách'),ngay_het_han_nhan: thoiGian(body.ngay_het_han_nhan,'Ngày hết hạn nhận'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),chi_tiet: [] };
    for (const item of body.chi_tiet) {
        truongHopLe(item,['phien_ban_sach_id','hinh_thuc','so_luong','gia_du_kien','ngay_du_kien','ghi_chu'],['phien_ban_sach_id','hinh_thuc','so_luong']);
        if (!HINH_THUC.includes(item.hinh_thuc)) throw loi('Hình thức đặt trước không hợp lệ');
        data.chi_tiet.push({ phien_ban_sach_id: idHopLe(item.phien_ban_sach_id,'Phiên bản sách'),hinh_thuc: item.hinh_thuc,so_luong: soNguyen(item.so_luong,'Số lượng'),gia_du_kien: tien(item.gia_du_kien,'Giá dự kiến'),ngay_du_kien: item.ngay_du_kien == null ? null : thoiGian(item.ngay_du_kien,'Ngày dự kiến'),ghi_chu: chuoi(item.ghi_chu,'Ghi chú',20000) });
    }
    const key = new Set();
    for (const item of data.chi_tiet) {
        const k = `${item.phien_ban_sach_id}:${item.hinh_thuc}`;
        if (key.has(k)) throw loi('Không được trùng phiên bản sách và hình thức trong cùng một đặt trước');
        key.add(k);
    }
    if (data.ngay_het_han_nhan && data.ngay_du_kien_co_sach && new Date(data.ngay_het_han_nhan) <= new Date(data.ngay_du_kien_co_sach)) throw loi('Ngày hết hạn nhận phải sau ngày dự kiến có sách');
    return data;
}
function huy(body) {
    truongHopLe(body,['ly_do'],['ly_do']);
    return { ly_do: chuoi(body.ly_do,'Lý do',20000,true) };
}
function thongBao(body) {
    truongHopLe(body,['ghi_chu']);
    return { ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function nhanSach(body) {
    truongHopLe(body,['don_hang_id','ghi_chu'],['don_hang_id']);
    return { don_hang_id: idHopLe(body.don_hang_id,'Đơn hàng'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function phanBo(body) {
    truongHopLe(body,['phien_ban_sach_id','ghi_chu'],['phien_ban_sach_id']);
    return { phien_ban_sach_id: idHopLe(body.phien_ban_sach_id,'Phiên bản sách'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
}
function boLoc(query = {}) {
    const trang = query.trang == null ? 1 : idHopLe(query.trang,'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc,'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.trang_thai && !TRANG_THAI.includes(query.trang_thai)) throw loi('Trạng thái đặt trước không hợp lệ');
    return { trang,kich_thuoc,khach_hang_id: query.khach_hang_id == null ? null : idHopLe(query.khach_hang_id,'Khách hàng'),chi_nhanh_id: query.chi_nhanh_id == null ? null : idHopLe(query.chi_nhanh_id,'Chi nhánh'),phien_ban_sach_id: query.phien_ban_sach_id == null ? null : idHopLe(query.phien_ban_sach_id,'Phiên bản sách'),trang_thai: query.trang_thai ?? null };
}
module.exports = { loi,idHopLe,tao,huy,thongBao,nhanSach,phanBo,boLoc };