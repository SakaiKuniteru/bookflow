const { AppError } = require('../../common/errors/AppError.js');
function loi(message, status = 422, code = 'INVALID_INPUT') {
    return new AppError({ code, message, status });
}
function idHopLe(value, ten = 'ID') {
    if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) throw loi(`${ten} không hợp lệ`);
    return Number(value);
}
function objectHopLe(value, ten = 'Dữ liệu') {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw loi(`${ten} phải là object`);
    return value;
}
function truongHopLe(body, choPhep, batBuoc = []) {
    objectHopLe(body);
    for (const key of Object.keys(body)) if (!choPhep.includes(key)) throw loi(`Trường ${key} không được phép`);
    for (const key of batBuoc) if (body[key] === undefined || body[key] === null || body[key] === '') throw loi(`${key} là bắt buộc`);
    return body;
}
function chuoi(value, ten, max = 255, batBuoc = false) {
    if (value === undefined || value === null || value === '') {
        if (batBuoc) throw loi(`${ten} là bắt buộc`);
        return null;
    }
    if (typeof value !== 'string' || value.trim().length > max || (batBuoc && !value.trim())) throw loi(`${ten} không hợp lệ`);
    return value.trim() || null;
}
function email(value) {
    const ketQua = chuoi(value, 'Email', 255);
    if (ketQua && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ketQua)) throw loi('Email không đúng định dạng');
    return ketQua?.toLowerCase() ?? null;
}
function dienThoai(value) {
    const ketQua = chuoi(value, 'Số điện thoại', 30);
    if (ketQua && !/^\+?[0-9][0-9\s().-]{7,28}$/.test(ketQua)) throw loi('Số điện thoại không đúng định dạng');
    return ketQua;
}
function ngay(value, ten) {
    if (value == null || value === '') return null;
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) throw loi(`${ten} phải có định dạng yyyy-mm-dd`);
    return value;
}
function khachHangMoiHopLe(body) {
    truongHopLe(body, ['ma_khach_hang','tai_khoan_id','loai_khach_hang','ho_ten','ten_to_chuc','ma_so_thue','ngay_sinh','gioi_tinh','email','so_dien_thoai','anh_dai_dien_id','nguon_khach_hang','nguoi_gioi_thieu_id','ghi_chu','dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa'], ['ma_khach_hang','ho_ten']);
    const loai = body.loai_khach_hang ?? 'CA_NHAN';
    if (!['CA_NHAN','TO_CHUC'].includes(loai)) throw loi('Loại khách hàng không hợp lệ');
    if (loai === 'TO_CHUC' && !chuoi(body.ten_to_chuc, 'Tên tổ chức', 255)) throw loi('Tên tổ chức là bắt buộc');
    const result = { ma_khach_hang: chuoi(body.ma_khach_hang,'Mã khách hàng',40,true), tai_khoan_id: body.tai_khoan_id == null ? null : idHopLe(body.tai_khoan_id,'Tài khoản'), loai_khach_hang: loai, ho_ten: chuoi(body.ho_ten,'Họ tên',200,true), ten_to_chuc: chuoi(body.ten_to_chuc,'Tên tổ chức',255), ma_so_thue: chuoi(body.ma_so_thue,'Mã số thuế',30), ngay_sinh: ngay(body.ngay_sinh,'Ngày sinh'), gioi_tinh: chuoi(body.gioi_tinh,'Giới tính',20), email: email(body.email), so_dien_thoai: dienThoai(body.so_dien_thoai), anh_dai_dien_id: body.anh_dai_dien_id == null ? null : idHopLe(body.anh_dai_dien_id,'Ảnh đại diện'), nguon_khach_hang: chuoi(body.nguon_khach_hang,'Nguồn khách hàng',50), nguoi_gioi_thieu_id: body.nguoi_gioi_thieu_id == null ? null : idHopLe(body.nguoi_gioi_thieu_id,'Người giới thiệu'), ghi_chu: chuoi(body.ghi_chu,'Ghi chú',20000) };
    for (const key of ['dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa']) {
        if (body[key] !== undefined && typeof body[key] !== 'boolean') throw loi(`${key} phải là boolean`);
        result[key] = body[key] ?? false;
    }
    return result;
}
function suaKhachHangHopLe(body) {
    truongHopLe(body, ['loai_khach_hang','ho_ten','ten_to_chuc','ma_so_thue','ngay_sinh','gioi_tinh','email','so_dien_thoai','anh_dai_dien_id','nguon_khach_hang','nguoi_gioi_thieu_id','ghi_chu','dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa']);
    if (!Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const result = {};
    const textFields = { ho_ten: 200, ten_to_chuc: 255, ma_so_thue: 30, gioi_tinh: 20, nguon_khach_hang: 50, ghi_chu: 20000 };
    for (const [key,max] of Object.entries(textFields)) if (body[key] !== undefined) result[key] = chuoi(body[key],key,max,key === 'ho_ten');
    if (body.loai_khach_hang !== undefined) {
        if (!['CA_NHAN','TO_CHUC'].includes(body.loai_khach_hang)) throw loi('Loại khách hàng không hợp lệ');
        result.loai_khach_hang = body.loai_khach_hang;
    }
    if (body.email !== undefined) result.email = email(body.email);
    if (body.so_dien_thoai !== undefined) result.so_dien_thoai = dienThoai(body.so_dien_thoai);
    if (body.ngay_sinh !== undefined) result.ngay_sinh = ngay(body.ngay_sinh,'Ngày sinh');
    for (const key of ['anh_dai_dien_id','nguoi_gioi_thieu_id']) if (body[key] !== undefined) result[key] = body[key] == null ? null : idHopLe(body[key],key);
    for (const key of ['dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa']) if (body[key] !== undefined) {
        if (typeof body[key] !== 'boolean') throw loi(`${key} phải là boolean`);
        result[key] = body[key];
    }
    return result;
}
function diaChiHopLe(body, sua = false) {
    const fields = ['loai_dia_chi','nguoi_nhan','so_dien_thoai','quoc_gia','tinh_thanh','phuong_xa','dia_chi_chi_tiet','ma_buu_chinh','mac_dinh'];
    truongHopLe(body,fields,sua ? [] : ['dia_chi_chi_tiet']);
    if (sua && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const result = {};
    for (const [key,max] of Object.entries({ nguoi_nhan: 200, quoc_gia: 100, tinh_thanh: 150, phuong_xa: 150, dia_chi_chi_tiet: 2000, ma_buu_chinh: 20 })) if (body[key] !== undefined) result[key] = chuoi(body[key],key,max,key === 'dia_chi_chi_tiet');
    if (body.so_dien_thoai !== undefined) result.so_dien_thoai = dienThoai(body.so_dien_thoai);
    if (body.loai_dia_chi !== undefined) {
        if (!['GIAO_HANG','XUAT_HOA_DON','KHAC'].includes(body.loai_dia_chi)) throw loi('Loại địa chỉ không hợp lệ');
        result.loai_dia_chi = body.loai_dia_chi;
    }
    if (body.mac_dinh !== undefined) {
        if (typeof body.mac_dinh !== 'boolean') throw loi('mac_dinh phải là boolean');
        result.mac_dinh = body.mac_dinh;
    }
    return result;
}
function lienHeHopLe(body, sua = false) {
    truongHopLe(body,['ho_ten','chuc_vu','email','so_dien_thoai','la_lien_he_chinh','ghi_chu'],sua ? [] : ['ho_ten']);
    if (sua && !Object.keys(body).length) throw loi('Không có dữ liệu cập nhật');
    const result = {};
    for (const [key,max] of Object.entries({ ho_ten: 200, chuc_vu: 100, ghi_chu: 20000 })) if (body[key] !== undefined) result[key] = chuoi(body[key],key,max,key === 'ho_ten');
    if (body.email !== undefined) result.email = email(body.email);
    if (body.so_dien_thoai !== undefined) result.so_dien_thoai = dienThoai(body.so_dien_thoai);
    if (body.la_lien_he_chinh !== undefined) {
        if (typeof body.la_lien_he_chinh !== 'boolean') throw loi('la_lien_he_chinh phải là boolean');
        result.la_lien_he_chinh = body.la_lien_he_chinh;
    }
    return result;
}
function tuongTacHopLe(body) {
    truongHopLe(body,['loai_tuong_tac','tieu_de','noi_dung','ket_qua','thoi_gian_hen','nguoi_phu_trach_id'],['loai_tuong_tac']);
    if (!['GOI_DIEN','EMAIL','TIN_NHAN','HO_TRO','GHI_CHU','KHIEU_NAI','KHAC'].includes(body.loai_tuong_tac)) throw loi('Loại tương tác không hợp lệ');
    const hen = body.thoi_gian_hen == null ? null : new Date(body.thoi_gian_hen);
    if (hen && Number.isNaN(hen.getTime())) throw loi('Thời gian hẹn không hợp lệ');
    return { loai_tuong_tac: body.loai_tuong_tac, tieu_de: chuoi(body.tieu_de,'Tiêu đề',255), noi_dung: chuoi(body.noi_dung,'Nội dung',20000), ket_qua: chuoi(body.ket_qua,'Kết quả',20000), thoi_gian_hen: hen?.toISOString() ?? null, nguoi_phu_trach_id: body.nguoi_phu_trach_id == null ? null : idHopLe(body.nguoi_phu_trach_id,'Người phụ trách') };
}
function boLocHopLe(query = {}) {
    const trang = query.trang == null ? 1 : idHopLe(query.trang,'Trang');
    const kichThuoc = query.kich_thuoc == null ? 20 : idHopLe(query.kich_thuoc,'Kích thước trang');
    if (kichThuoc > 100) throw loi('Kích thước trang tối đa 100');
    if (query.trang_thai && !['HOAT_DONG','TAM_KHOA','NGUNG_HOAT_DONG'].includes(query.trang_thai)) throw loi('Trạng thái không hợp lệ');
    return { trang, kich_thuoc: kichThuoc, tu_khoa: chuoi(query.tu_khoa,'Từ khóa',200), trang_thai: query.trang_thai ?? null, loai_khach_hang: query.loai_khach_hang ?? null };
}
module.exports = { loi, idHopLe, chuoi, truongHopLe, khachHangMoiHopLe, suaKhachHangHopLe, diaChiHopLe, lienHeHopLe, tuongTacHopLe, boLocHopLe };