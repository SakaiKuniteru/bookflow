const { loi,idHopLe,chuoi,truongHopLe } = require('../khach-hang/khach-hang.validation.js');
const { lamTronTien } = require('../../common/utils/tien.js');
const LOAI = ['MUON','THUE'];
const TRANG_THAI = ['NHAP','CHO_GIAO','DANG_GIAO','DANG_MUON','TRA_MOT_PHAN','DA_TRA','QUA_HAN','DA_HUY'];
const TRANG_THAI_CT = ['CHO_GIAO','DANG_GIAO','DANG_MUON','DA_TRA','QUA_HAN','MAT','HU_HONG','DA_HUY'];
function thoiGian(value,ten) {
    if (value == null) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) throw loi(`${ten} không hợp lệ`);
    return d.toISOString();
}
function soNguyen(value,ten,min = 0) {
    if (!Number.isSafeInteger(value) || value < min) throw loi(`${ten} không hợp lệ`);
    return value;
}
function tien(value,ten = 'Tiền') {
    if (value == null) return '0';
    if (!['number','string'].includes(typeof value) || !/^(0|[1-9]\d*)(\.\d{1,3})?$/.test(String(value))) throw loi(`${ten} không hợp lệ`);
    if (Number(String(value)) < 0) throw loi(`${ten} không được âm`);
    return lamTronTien(String(value));
}
function tao(body) {
    truongHopLe(body,['chi_nhanh_id','khach_hang_id','don_hang_id','loai','ngay_bat_dau','ngay_hen_tra','tien_coc_id','ghi_chu','chi_tiet'],['khach_hang_id','loai','chi_tiet']);
    if (!LOAI.includes(body.loai)) throw loi('Loại mượn/trả không hợp lệ');
    if (!Array.isArray(body.chi_tiet) || !body.chi_tiet.length) throw loi('Phải có ít nhất một cuốn sách');
    const ngayBatDau = thoiGian(body.ngay_bat_dau,'Ngày bắt đầu');
    const ngayHenTra = thoiGian(body.ngay_hen_tra,'Ngày hẹn trả');
    if (ngayBatDau && ngayHenTra && new Date(ngayHenTra) < new Date(ngayBatDau)) throw loi('Ngày hẹn trả phải sau ngày bắt đầu');
    const result = { chi_nhanh_id: body.chi_nhanh_id == null ? null : idHopLe(body.chi_nhanh_id,'Chi nhánh'),khach_hang_id: idHopLe(body.khach_hang_id,'Khách hàng'),don_hang_id: body.don_hang_id == null ? null : idHopLe(body.don_hang_id,'Đơn hàng'),loai: body.loai,ngay_bat_dau: ngayBatDau,ngay_hen_tra: ngayHenTra,tien_coc_id: body.tien_coc_id == null ? null : idHopLe(body.tien_coc_id,'Tiền cọc'),ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),chi_tiet: [] };
    const unique = new Set();
    for (const item of body.chi_tiet) {
        truongHopLe(item,['cuon_sach_id','ngay_hen_tra','phi_thue','ghi_chu'],['cuon_sach_id']);
        const cuonId = idHopLe(item.cuon_sach_id,'Cuốn sách');
        if (unique.has(cuonId)) throw loi('Không được chọn trùng cuốn sách');
        unique.add(cuonId);
        const han = thoiGian(item.ngay_hen_tra ?? ngayHenTra,'Ngày hẹn trả');
        if (ngayBatDau && han && new Date(han) < new Date(ngayBatDau)) throw loi('Ngày hẹn trả của cuốn sách không hợp lệ');
        result.chi_tiet.push({ cuon_sach_id: cuonId,ngay_hen_tra: han,phi_thue: tien(item.phi_thue,'Phí thuê'),ghi_chu: chuoi(item.ghi_chu,'Ghi chú',20000) });
    }
    return result;
}
function giao(body) {
    truongHopLe(body,['ten_nguoi_nhan','chu_ky_nguoi_nhan','anh_bang_chung','ghi_chu','chi_tiet'],['chi_tiet']);
    if (!Array.isArray(body.chi_tiet) || !body.chi_tiet.length) throw loi('Phải có ít nhất một cuốn giao');
    return { ten_nguoi_nhan: chuoi(body.ten_nguoi_nhan,'Tên người nhận',200),chu_ky_nguoi_nhan: chuoi(body.chu_ky_nguoi_nhan,'Chữ ký',200000),anh_bang_chung: body.anh_bang_chung == null ? [] : body.anh_bang_chung,ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),chi_tiet: body.chi_tiet.map(item => {
        truongHopLe(item,['chi_tiet_muon_tra_id','tinh_trang','mo_ta','anh_bang_chung'],['chi_tiet_muon_tra_id','tinh_trang']);
        return { chi_tiet_muon_tra_id: idHopLe(item.chi_tiet_muon_tra_id,'Chi tiết mượn trả'),tinh_trang: chuoi(item.tinh_trang,'Tình trạng',25,true),mo_ta: chuoi(item.mo_ta,'Mô tả',20000),anh_bang_chung: item.anh_bang_chung == null ? [] : item.anh_bang_chung };
    }) };
}
function tra(body) {
    truongHopLe(body,['ten_nguoi_nhan','chu_ky_nguoi_nhan','anh_bang_chung','ghi_chu','chi_tiet'],['chi_tiet']);
    if (!Array.isArray(body.chi_tiet) || !body.chi_tiet.length) throw loi('Phải có ít nhất một cuốn trả');
    return { ten_nguoi_nhan: chuoi(body.ten_nguoi_nhan,'Tên người trả',200),chu_ky_nguoi_nhan: chuoi(body.chu_ky_nguoi_nhan,'Chữ ký',200000),anh_bang_chung: body.anh_bang_chung == null ? [] : body.anh_bang_chung,ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),chi_tiet: body.chi_tiet.map(item => {
        truongHopLe(item,['chi_tiet_muon_tra_id','tinh_trang','mo_ta','anh_bang_chung'],['chi_tiet_muon_tra_id','tinh_trang']);
        if (!['MOI','TOT','DA_SU_DUNG','HU_HONG_NHE','HU_HONG_NANG','MAT'].includes(item.tinh_trang)) throw loi('Tình trạng trả sách không hợp lệ');
        return { chi_tiet_muon_tra_id: idHopLe(item.chi_tiet_muon_tra_id,'Chi tiết mượn trả'),tinh_trang: item.tinh_trang,mo_ta: chuoi(item.mo_ta,'Mô tả',20000),anh_bang_chung: item.anh_bang_chung == null ? [] : item.anh_bang_chung };
    }) };
}
function giaHan(body) {
    truongHopLe(body,['ngay_hen_tra_moi','ly_do','chi_tiet'],['ngay_hen_tra_moi','chi_tiet']);
    const ngayMoi = thoiGian(body.ngay_hen_tra_moi,'Ngày hẹn trả mới');
    if (!Array.isArray(body.chi_tiet) || !body.chi_tiet.length) throw loi('Phải chọn ít nhất một cuốn để gia hạn');
    return { ngay_hen_tra_moi: ngayMoi,ly_do: chuoi(body.ly_do,'Lý do',20000),chi_tiet: body.chi_tiet.map(id => idHopLe(id,'Chi tiết mượn trả')) };
}
function duyetGiaHan(body) {
    truongHopLe(body,['duyet','ly_do']);
    if (typeof body.duyet !== 'boolean') throw loi('duyet phải là boolean');
    return { duyet: body.duyet,ly_do: chuoi(body.ly_do,'Lý do',20000,body.duyet === false) };
}
function boLoc(query = {}) {
    const trang = query.trang == null ? 1 : idHopLe(query.trang,'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc,'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.loai && !LOAI.includes(query.loai)) throw loi('Loại mượn/trả không hợp lệ');
    if (query.trang_thai && !TRANG_THAI.includes(query.trang_thai)) throw loi('Trạng thái không hợp lệ');
    return { trang,kich_thuoc,khach_hang_id: query.khach_hang_id == null ? null : idHopLe(query.khach_hang_id,'Khách hàng'),chi_nhanh_id: query.chi_nhanh_id == null ? null : idHopLe(query.chi_nhanh_id,'Chi nhánh'),loai: query.loai ?? null,trang_thai: query.trang_thai ?? null };
}
function quaHan(body) {
    truongHopLe(body,['chi_tiet_muon_tra_id']);
    return { chi_tiet_muon_tra_id: body.chi_tiet_muon_tra_id == null ? null : idHopLe(body.chi_tiet_muon_tra_id,'Chi tiết mượn trả') };
}
module.exports = { loi,idHopLe,tao,giao,tra,giaHan,duyetGiaHan,boLoc,quaHan };