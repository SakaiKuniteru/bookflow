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

module.exports = { kiemTraDuLieuTaoTaiKhoan };