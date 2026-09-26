const { AppError } = require('../../common/errors/AppError.js');
const { lamTronTien,soSanhTien,congTien } = require('../../common/utils/tien.js');
function loi(message,status = 422,code = 'INVALID_INPUT') { return new AppError({ code,message,status }); }
function object(value,ten = 'Dữ liệu') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw loi(`${ten} phải là object`);
    return value;
}
function fields(body,allowed,required = []) {
    object(body);
    for (const key of Object.keys(body)) if (!allowed.includes(key)) throw loi(`Không cho phép trường ${key}`);
    for (const key of required) if (body[key] == null || body[key] === '') throw loi(`${key} là bắt buộc`);
    return body;
}
function id(value,ten = 'ID') {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw loi(`${ten} không hợp lệ`);
    return Number(value);
}
function chuoi(value,ten,max = 200,required = false) {
    if (value == null || value === '') {
        if (required) throw loi(`${ten} là bắt buộc`);
        return null;
    }
    if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw loi(`${ten} không hợp lệ`);
    return value.trim();
}
function enumValue(value,allowed,ten) {
    if (!allowed.includes(value)) throw loi(`${ten} không hợp lệ`);
    return value;
}
function tien(value,ten = 'Số tiền',choPhepKhong = false) {
    let kq;
    try { kq = lamTronTien(value); } catch (_) { throw loi(`${ten} không hợp lệ`); }
    if (soSanhTien(kq,'0') < (choPhepKhong ? 0 : 1) || kq.replace('-','').split('.')[0].length > 15) throw loi(`${ten} không hợp lệ`);
    return kq;
}
function json(value,ten = 'Dữ liệu') {
    if (value == null) return {};
    object(value,ten);
    if (JSON.stringify(value).length > 16000) throw loi(`${ten} quá lớn`);
    return value;
}
function trang(query = {}) {
    const page = query.trang == null ? 1 : id(query.trang,'Trang');
    const size = query.kich_thuoc == null ? 20 : id(query.kich_thuoc,'Kích thước');
    if (size > 100) throw loi('Kích thước tối đa 100');
    return { trang: page,kich_thuoc: size,limit: size,offset: (page - 1) * size };
}
function ngay(value,ten) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw loi(`${ten} không hợp lệ`);
    const date = new Date(value + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0,10) !== value) throw loi(`${ten} không hợp lệ`);
    return value;
}
function phuongThuc(body,sua = false) {
    fields(body,['ma','ten','loai','cau_hinh','chi_nhanh_id','thu_tu','hoat_dong'],sua ? [] : ['ma','ten','loai']);
    const data = {};
    if ('ma' in body) data.ma = chuoi(body.ma,'Mã',40,true).toUpperCase();
    if ('ten' in body) data.ten = chuoi(body.ten,'Tên',150,true);
    if ('loai' in body) data.loai = enumValue(body.loai,['TIEN_MAT','CHUYEN_KHOAN','QR'],'Loại');
    if ('cau_hinh' in body) data.cau_hinh = json(body.cau_hinh,'Cấu hình');
    if ('chi_nhanh_id' in body) data.chi_nhanh_id = body.chi_nhanh_id == null ? null : id(body.chi_nhanh_id,'Chi nhánh');
    if ('thu_tu' in body) {
        if (!Number.isSafeInteger(body.thu_tu) || body.thu_tu < 0) throw loi('Thứ tự không hợp lệ');
        data.thu_tu = body.thu_tu;
    }
    if ('hoat_dong' in body) {
        if (typeof body.hoat_dong !== 'boolean') throw loi('hoat_dong phải là boolean');
        data.hoat_dong = body.hoat_dong;
    }
    if (sua && !Object.keys(data).length) throw loi('Không có dữ liệu cập nhật');
    return data;
}
function taiKhoan(body,sua = false) {
    fields(body,['chi_nhanh_id','ten_ngan_hang','ma_ngan_hang','so_tai_khoan','chu_tai_khoan','ma_vi','loai','mac_dinh','hoat_dong'],sua ? [] : ['loai']);
    const data = {};
    for (const [key,max] of Object.entries({ ten_ngan_hang: 150,ma_ngan_hang: 30,so_tai_khoan: 60,chu_tai_khoan: 200,ma_vi: 100 })) if (key in body) data[key] = chuoi(body[key],key,max);
    if ('chi_nhanh_id' in body) data.chi_nhanh_id = body.chi_nhanh_id == null ? null : id(body.chi_nhanh_id,'Chi nhánh');
    if ('loai' in body) data.loai = enumValue(body.loai,['NGAN_HANG','VI_DIEN_TU','TIEN_MAT'],'Loại tài khoản');
    for (const key of ['mac_dinh','hoat_dong']) if (key in body) {
        if (typeof body[key] !== 'boolean') throw loi(`${key} phải là boolean`);
        data[key] = body[key];
    }
    if (sua && !Object.keys(data).length) throw loi('Không có dữ liệu cập nhật');
    return data;
}
function phanBo(items,loai) {
    if (!Array.isArray(items) || !items.length || items.length > 20) throw loi('Phân bổ phải có từ 1 đến 20 khoản');
    const seen = new Set();
    const kq = items.map(item => {
        fields(item,['loai_doi_tuong','doi_tuong_id','so_tien'],['loai_doi_tuong','doi_tuong_id','so_tien']);
        const doiTuong = enumValue(item.loai_doi_tuong,loai === 'THU' ? ['DON_HANG','CONG_NO','TIEN_COC'] : ['CONG_NO'],'Đối tượng phân bổ');
        const ma = `${doiTuong}:${item.doi_tuong_id}`;
        if (seen.has(ma)) throw loi('Không phân bổ trùng đối tượng trong một giao dịch');
        seen.add(ma);
        return { loai_doi_tuong: doiTuong,doi_tuong_id: id(item.doi_tuong_id,'Đối tượng'),so_tien: tien(item.so_tien) };
    });
    return kq.sort((a,b) => a.loai_doi_tuong.localeCompare(b.loai_doi_tuong) || a.doi_tuong_id - b.doi_tuong_id);
}
function giaoDich(body) {
    fields(body,['loai_giao_dich','chi_nhanh_id','phuong_thuc_id','tai_khoan_nhan_id','so_tien','khoa_chong_trung','noi_dung','phan_bo','nguoi_thu_huong'],['loai_giao_dich','phuong_thuc_id','so_tien','khoa_chong_trung','phan_bo']);
    const loai = enumValue(body.loai_giao_dich,['THU','CHI'],'Loại giao dịch');
    const allocations = phanBo(body.phan_bo,loai);
    const soTien = tien(body.so_tien);
    if (soSanhTien(congTien(...allocations.map(item => item.so_tien)),soTien) !== 0) throw loi('Tổng phân bổ phải đúng bằng số tiền giao dịch');
    return { loai_giao_dich: loai,chi_nhanh_id: body.chi_nhanh_id == null ? null : id(body.chi_nhanh_id,'Chi nhánh'),phuong_thuc_id: id(body.phuong_thuc_id,'Phương thức'),tai_khoan_nhan_id: body.tai_khoan_nhan_id == null ? null : id(body.tai_khoan_nhan_id,'Tài khoản nhận'),so_tien: soTien,khoa_chong_trung: chuoi(body.khoa_chong_trung,'Khóa chống trùng',150,true),noi_dung: chuoi(body.noi_dung,'Nội dung',20000),phan_bo: allocations,nguoi_thu_huong: body.nguoi_thu_huong == null ? null : json(body.nguoi_thu_huong,'Người thụ hưởng') };
}
function xacNhan(body) {
    fields(body,['ket_qua','ma_giao_dich_doi_tac','bang_chung','ghi_chu','ca_ban_hang_id'],['ket_qua','bang_chung']);
    const ketQua = enumValue(body.ket_qua,['THANH_CONG','THAT_BAI'],'Kết quả');
    const bangChung = chuoi(body.bang_chung,'Bằng chứng đối soát hoặc biên nhận',2000,true);
    return { ket_qua: ketQua,ma_giao_dich_doi_tac: chuoi(body.ma_giao_dich_doi_tac,'Mã tham chiếu ngân hàng',200),bang_chung: bangChung,ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000),ca_ban_hang_id: body.ca_ban_hang_id == null ? null : id(body.ca_ban_hang_id,'Ca chi tiền') };
}
function yeuCauHoan(body) {
    fields(body,['giao_dich_goc_id','don_hang_id','tien_coc_id','so_tien','ly_do'],['giao_dich_goc_id','so_tien','ly_do']);
    if ((body.don_hang_id == null) === (body.tien_coc_id == null)) throw loi('Chọn đúng một đơn hàng hoặc tiền cọc');
    return { giao_dich_goc_id: id(body.giao_dich_goc_id,'Giao dịch gốc'),don_hang_id: body.don_hang_id == null ? null : id(body.don_hang_id,'Đơn hàng'),tien_coc_id: body.tien_coc_id == null ? null : id(body.tien_coc_id,'Tiền cọc'),so_tien: tien(body.so_tien),ly_do: chuoi(body.ly_do,'Lý do',20000,true) };
}
function duyetHoan(body) {
    fields(body,['phe_duyet','phuong_thuc_id','nguoi_thu_huong','ly_do'],['phe_duyet']);
    if (typeof body.phe_duyet !== 'boolean') throw loi('phe_duyet phải là boolean');
    return { phe_duyet: body.phe_duyet,phuong_thuc_id: body.phuong_thuc_id == null ? null : id(body.phuong_thuc_id,'Phương thức hoàn'),nguoi_thu_huong: body.nguoi_thu_huong == null ? null : json(body.nguoi_thu_huong,'Người nhận hoàn'),ly_do: chuoi(body.ly_do,'Lý do',20000) };
}
function dotDoiSoat(body) {
    fields(body,['tu_ngay','den_ngay','nha_cung_cap','tai_khoan_nhan_id'],['tu_ngay','den_ngay']);
    const tu = ngay(body.tu_ngay,'Từ ngày');
    const den = ngay(body.den_ngay,'Đến ngày');
    if (den < tu) throw loi('Đến ngày phải từ ngày bắt đầu');
    return { tu_ngay: tu,den_ngay: den,nha_cung_cap: chuoi(body.nha_cung_cap,'Nhà cung cấp',100),tai_khoan_nhan_id: body.tai_khoan_nhan_id == null ? null : id(body.tai_khoan_nhan_id,'Tài khoản nhận') };
}
function duLieuDoiSoat(body) {
    fields(body,['giao_dich'],['giao_dich']);
    if (!Array.isArray(body.giao_dich) || body.giao_dich.length > 2000) throw loi('Danh sách đối soát tối đa 2000 dòng');
    const seen = new Set();
    return body.giao_dich.map(item => {
        fields(item,['ma_giao_dich_doi_tac','so_tien','trang_thai'],['ma_giao_dich_doi_tac','so_tien','trang_thai']);
        const ma = chuoi(item.ma_giao_dich_doi_tac,'Mã đối tác',200,true);
        if (seen.has(ma)) throw loi('Mã giao dịch đối tác bị trùng trong bảng đối soát');
        seen.add(ma);
        return { ma_giao_dich_doi_tac: ma,so_tien: tien(item.so_tien,'Số tiền đối tác'),trang_thai: enumValue(item.trang_thai,['THANH_CONG','THAT_BAI'],'Trạng thái đối tác') };
    });
}
module.exports = { loi,object,fields,id,chuoi,enumValue,tien,json,trang,ngay,phuongThuc,taiKhoan,phanBo,giaoDich,xacNhan,yeuCauHoan,duyetHoan,dotDoiSoat,duLieuDoiSoat };