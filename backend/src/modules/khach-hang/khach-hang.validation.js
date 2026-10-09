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
    if (ketQua && !/^[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[A-Za-z0-9!#$%&'*+/=?^_`{|}~-]+)*@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(ketQua)) throw loi('Email không đúng định dạng');
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
function kiemTraKhachHangMoi(body) {
    const details = [];
    if (!body || typeof body !== "object" || Array.isArray(body)) return { data: {}, details: [{ field: "ho_ten", message: "Dữ liệu khách hàng không hợp lệ" }] };
    const allowed = ["ho_ten","ngay_sinh","gioi_tinh","email","so_dien_thoai","nguon_khach_hang","nguoi_gioi_thieu_id","ghi_chu","ten_dang_nhap","quoc_tich","dan_toc","mo_ta","dia_chi_chi_tiet","quoc_gia","tinh_thanh_pho","phuong_xa","dong_y_email","dong_y_sms","dong_y_ca_nhan_hoa"];
    Object.keys(body).filter(key => !allowed.includes(key)).forEach(field => details.push({ field, message: `Trường ${field} không được phép` }));
    const check = (field, callback, fallback = null) => {
        try { return callback(); }
        catch (error) {
            const items = error.details?.length ? error.details : [{ field, message: error.message }];
            details.push(...items.map(item => ({ field: item.field || field, message: item.message || error.message })));
            return fallback;
        }
    };
    const hoTen = check("ho_ten", () => {
        const value = chuoi(body.ho_ten, "Họ tên", 200, true);
        if (value.length < 2) throw loi("Họ tên phải có ít nhất 2 ký tự");
        return value;
    }, "");
    const emailValue = check("email", () => email(chuoi(body.email,"Email",254,true)));
    const tenDangNhap = check("ten_dang_nhap", () => {
        const value = chuoi(body.ten_dang_nhap, "Tên đăng nhập", 40, true);
        if (!/^[A-Za-z0-9._-]{3,40}$/.test(value)) throw loi("Tên đăng nhập phải có 3–40 ký tự gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang");
        return value.toLowerCase();
    });
    const gioiTinh = check("gioi_tinh", () => {
        const value = chuoi(body.gioi_tinh, "Giới tính", 20);
        if (value && !["NAM","NU","KHAC","KHONG_TIET_LO"].includes(value)) throw loi("Giới tính không hợp lệ");
        return value;
    });
    const data = { loai_khach_hang: "CA_NHAN", ho_ten: hoTen, ngay_sinh: check("ngay_sinh", () => ngay(body.ngay_sinh, "Ngày sinh")), gioi_tinh: gioiTinh, email: emailValue, so_dien_thoai: check("so_dien_thoai", () => dienThoai(body.so_dien_thoai)), ten_dang_nhap: tenDangNhap, nguon_khach_hang: check("nguon_khach_hang", () => chuoi(body.nguon_khach_hang, "Nguồn khách hàng", 50)), nguoi_gioi_thieu_id: check("nguoi_gioi_thieu_id", () => body.nguoi_gioi_thieu_id == null ? null : idHopLe(body.nguoi_gioi_thieu_id, "Người giới thiệu")), ghi_chu: check("ghi_chu", () => chuoi(body.ghi_chu, "Ghi chú", 20000)), quoc_tich: check("quoc_tich", () => chuoi(body.quoc_tich, "Quốc tịch", 100)), dan_toc: check("dan_toc", () => chuoi(body.dan_toc, "Dân tộc", 100)), mo_ta: check("mo_ta", () => chuoi(body.mo_ta, "Mô tả", 20000)), dia_chi_chi_tiet: check("dia_chi_chi_tiet", () => chuoi(body.dia_chi_chi_tiet, "Địa chỉ chi tiết", 300)), quoc_gia: check("quoc_gia", () => chuoi(body.quoc_gia, "Quốc gia", 100)), tinh_thanh_pho: check("tinh_thanh_pho", () => chuoi(body.tinh_thanh_pho, "Tỉnh/thành phố", 150)), phuong_xa: check("phuong_xa", () => chuoi(body.phuong_xa, "Phường/xã", 150)) };
    for (const key of ["dong_y_email","dong_y_sms","dong_y_ca_nhan_hoa"]) data[key] = check(key, () => {
        if (body[key] === undefined) return false;
        if (typeof body[key] !== "boolean") throw loi(`${key} phải là boolean`);
        return body[key];
    }, false);
    return { data, details: [...new Map(details.map(item => [`${item.field}:${item.message}`, item])).values()] };
}
function khachHangMoiHopLe(body) {
    const { data, details } = kiemTraKhachHangMoi(body);
    if (details.length) throw new AppError({ code: "INVALID_INPUT", message: details.map(item => item.message).join(". "), status: 422, details });
    return data;
}
function kiemTraKhachHangSua(body) {
    const details = [];
    if (!body || typeof body !== 'object' || Array.isArray(body)) return { data: {}, details: [{ field: 'ho_ten', message: 'Dữ liệu khách hàng không hợp lệ' }] };
    const allowed = ['ho_ten','ngay_sinh','gioi_tinh','email','so_dien_thoai','anh_dai_dien_id','nguon_khach_hang','nguoi_gioi_thieu_id','ghi_chu','quoc_tich','dan_toc','mo_ta','dia_chi_chi_tiet','quoc_gia','tinh_thanh_pho','phuong_xa','dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa'];
    Object.keys(body).filter(key => !allowed.includes(key)).forEach(field => details.push({ field, message: `Trường ${field} không được phép` }));
    if (!Object.keys(body).length) details.push({ field: 'ho_ten', message: 'Không có dữ liệu cập nhật' });
    const check = (field, callback) => {
        try { return callback(); }
        catch (error) {
            const items = error.details?.length ? error.details : [{ field, message: error.message }];
            details.push(...items.map(item => ({ field: item.field || field, message: item.message || error.message })));
            return null;
        }
    };
    const data = {};
    const textFields = { ho_ten: 200, gioi_tinh: 20, nguon_khach_hang: 50, ghi_chu: 20000, quoc_tich: 100, dan_toc: 100, mo_ta: 20000, dia_chi_chi_tiet: 300, quoc_gia: 100, tinh_thanh_pho: 150, phuong_xa: 150 };
    for (const [key,max] of Object.entries(textFields)) if (body[key] !== undefined) data[key] = check(key, () => chuoi(body[key],key,max,key === 'ho_ten'));
    if (body.email !== undefined) data.email = check('email', () => email(chuoi(body.email,'Email',254,true)));
    if (body.so_dien_thoai !== undefined) data.so_dien_thoai = check('so_dien_thoai', () => dienThoai(body.so_dien_thoai));
    if (body.ngay_sinh !== undefined) data.ngay_sinh = check('ngay_sinh', () => ngay(body.ngay_sinh,'Ngày sinh'));
    if (data.gioi_tinh && !['NAM','NU','KHAC','KHONG_TIET_LO'].includes(data.gioi_tinh)) details.push({ field: 'gioi_tinh', message: 'Giới tính không hợp lệ' });
    for (const key of ['anh_dai_dien_id','nguoi_gioi_thieu_id']) if (body[key] !== undefined) data[key] = check(key, () => body[key] == null ? null : idHopLe(body[key],key));
    for (const key of ['dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa']) if (body[key] !== undefined) data[key] = check(key, () => {
        if (typeof body[key] !== 'boolean') throw loi(`${key} phải là boolean`);
        return body[key];
    });
    return { data, details: [...new Map(details.map(item => [`${item.field}:${item.message}`,item])).values()] };
}
function suaKhachHangHopLe(body) {
    const { data, details } = kiemTraKhachHangSua(body);
    if (details.length) throw new AppError({ code: 'INVALID_INPUT', message: details.map(item => item.message).join('. '), status: 422, details });
    return data;
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
    const sapXep = query.sort ?? 'hoTen';
    if (!['maKhachHang','hoTen','tenDangNhap','ngaySinh','diaChiChiTiet','email','soDienThoai','trangThai'].includes(sapXep)) throw loi('Trường sắp xếp không hợp lệ');
    const thuTu = String(query.order ?? 'asc').toLowerCase();
    if (!['asc','desc'].includes(thuTu)) throw loi('Thứ tự sắp xếp không hợp lệ');
    return { trang, kich_thuoc: kichThuoc, tu_khoa: chuoi(query.tu_khoa,'Từ khóa',200), trang_thai: query.trang_thai ?? null, sap_xep: sapXep, thu_tu: thuTu };
}
module.exports = { loi, idHopLe, chuoi, truongHopLe, khachHangMoiHopLe, kiemTraKhachHangMoi, kiemTraKhachHangSua, suaKhachHangHopLe, diaChiHopLe, lienHeHopLe, tuongTacHopLe, boLocHopLe };
