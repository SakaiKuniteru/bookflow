import { AppError } from '../../common/errors/AppError.js';

function loiDuLieu(message) { return new AppError({ code: 'INVALID_INPUT', message, status: 422 }); }

export function kiemTraDuLieuTaoTaiKhoan(duLieu) {
    if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu)) throw loiDuLieu('Dữ liệu đăng ký không hợp lệ');
    if (Object.keys(duLieu).some(ten => !['ho_ten', 'email', 'mat_khau'].includes(ten))) throw loiDuLieu('Dữ liệu đăng ký có trường không được phép');
    const ho_ten = typeof duLieu.ho_ten === 'string' ? duLieu.ho_ten.trim().replace(/\s+/g, ' ') : '';
    const email = typeof duLieu.email === 'string' ? duLieu.email.trim().toLowerCase() : '';
    const mat_khau = duLieu.mat_khau;
    if (ho_ten.length < 2 || ho_ten.length > 200) throw loiDuLieu('Họ tên phải có từ 2 đến 200 ký tự');
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw loiDuLieu('Email không hợp lệ');
    if (typeof mat_khau !== 'string' || !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9\s])[^\r\n]{8,128}$/.test(mat_khau)) throw loiDuLieu('Mật khẩu phải có ít nhất 8 ký tự, chữ hoa, chữ thường, số và ký tự đặc biệt');
    return { ho_ten, email, mat_khau };
}
