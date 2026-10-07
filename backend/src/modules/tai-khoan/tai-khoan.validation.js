const { AppError } = require('../../common/errors/AppError.js');

function loiDuLieu(field, message) {
    return new AppError({ code: 'INVALID_INPUT', message, status: 422, details: [{ field, message }] });
}

function kiemTraDuLieuTaoTaiKhoan(duLieu) {
    if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu)) throw loiDuLieu('Dữ liệu đăng ký không hợp lệ');
    if (Object.keys(duLieu).some(ten => !['ho_ten', 'email', 'ten_dang_nhap', 'so_dien_thoai', 'mat_khau'].includes(ten))) throw loiDuLieu('Dữ liệu đăng ký có trường không được phép');
    const ho_ten = typeof duLieu.ho_ten === 'string' ? duLieu.ho_ten.trim().replace(/\s+/g, ' ') : '';
    const email = typeof duLieu.email === 'string' ? duLieu.email.trim().toLowerCase() : '';
    const ten_dang_nhap = typeof duLieu.ten_dang_nhap === 'string' ? duLieu.ten_dang_nhap.trim().toLowerCase() : '';
    const so_dien_thoai = typeof duLieu.so_dien_thoai === 'string' ? duLieu.so_dien_thoai.trim() : '';
    const mat_khau = duLieu.mat_khau;
    if (ho_ten.length < 2 || ho_ten.length > 200) throw loiDuLieu('ho_ten', 'Họ tên phải có từ 2 đến 200 ký tự');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw loiDuLieu('email', 'Email không hợp lệ');
    if (!/^[a-z0-9._-]{3,40}$/.test(ten_dang_nhap)) throw loiDuLieu('ten_dang_nhap', 'Tên đăng nhập cần 3-40 ký tự, chỉ gồm chữ, số, dấu chấm, gạch dưới hoặc gạch ngang');
    if (!/^0\d{9}$/.test(so_dien_thoai)) throw loiDuLieu('so_dien_thoai', 'Số điện thoại phải gồm 10 chữ số và bắt đầu bằng 0');
    if (typeof mat_khau !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\r\n]{8,128}$/.test(mat_khau)) throw loiDuLieu('mat_khau', 'Mật khẩu phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt');
    return { ho_ten, email, ten_dang_nhap, so_dien_thoai, mat_khau };
}

function kiemTraCapNhatHoSo(duLieu) {
    const truongChoPhep = ['ho_ten', 'ngay_sinh', 'gioi_tinh', 'quoc_tich', 'dan_toc', 'mo_ta', 'dia_chi_chi_tiet', 'quoc_gia', 'tinh_thanh_pho', 'phuong_xa'];
    if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu)) throw loiDuLieu('ho_ten', 'Dữ liệu cập nhật không hợp lệ');
    const truongKhongChoPhep = Object.keys(duLieu).find(ten => !truongChoPhep.includes(ten));
    if (truongKhongChoPhep) {
        const tenTruongCamel = truongKhongChoPhep.replace(/_([a-z])/g, (_, chu) => chu.toUpperCase());
        throw loiDuLieu(truongKhongChoPhep, `Trường ${tenTruongCamel} không được phép cập nhật`);
    }
    const ho_ten = typeof duLieu.ho_ten === 'string' ? duLieu.ho_ten.trim().replace(/\s+/g, ' ') : '';
    if (ho_ten.length < 2 || ho_ten.length > 200) throw loiDuLieu('ho_ten', 'Họ và tên phải có từ 2 đến 200 ký tự');
    const ngaySinhNhap = duLieu.ngay_sinh == null ? '' : String(duLieu.ngay_sinh).trim();
    const ngay_sinh = ngaySinhNhap || null;
    if (ngay_sinh) {
        const match = ngay_sinh.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        const ngay = match ? new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))) : null;
        if (!match || ngay.getUTCFullYear() !== Number(match[1]) || ngay.getUTCMonth() !== Number(match[2]) - 1 || ngay.getUTCDate() !== Number(match[3]) || ngay_sinh > new Date().toISOString().slice(0, 10)) throw loiDuLieu('ngay_sinh', 'Ngày sinh không hợp lệ');
    }
    const gioi_tinh = duLieu.gioi_tinh ? String(duLieu.gioi_tinh).trim() : null;
    if (gioi_tinh && !['NAM', 'NU', 'KHAC', 'KHONG_TIET_LO'].includes(gioi_tinh)) throw loiDuLieu('gioi_tinh', 'Giới tính không hợp lệ');
    const ketQua = { ho_ten, ngay_sinh, gioi_tinh };
    for (const [tenTruong, gioiHan] of [['quoc_tich', 100], ['dan_toc', 100], ['dia_chi_chi_tiet', 300], ['quoc_gia', 100], ['tinh_thanh_pho', 150], ['phuong_xa', 150], ['mo_ta', 2000]]) {
        const giaTri = duLieu[tenTruong] == null ? null : String(duLieu[tenTruong]).trim().replace(/\s+/g, ' ') || null;
        if (giaTri && giaTri.length > gioiHan) throw loiDuLieu(tenTruong, `Trường này không được vượt quá ${gioiHan} ký tự`);
        ketQua[tenTruong] = giaTri;
    }
    return ketQua;
}

function idTepHopLe(value) {
    const id = Number(value);
    if (!Number.isSafeInteger(id) || id <= 0 || id > 2147483647) throw loiDuLieu('anh_dai_dien_tep_id', 'Ảnh đại diện không hợp lệ');
    return id;
}

module.exports = { kiemTraDuLieuTaoTaiKhoan, kiemTraCapNhatHoSo, idTepHopLe };
