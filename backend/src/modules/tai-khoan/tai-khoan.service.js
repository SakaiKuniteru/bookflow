const { AppError } = require('../../common/errors/AppError.js');
const { bamMatKhau } = require('../../common/security/mat-khau.js');
const { kiemTraDuLieuTaoTaiKhoan } = require('./tai-khoan.validation.js');
const taiKhoanRepository = require('./tai-khoan.repository.js');

class TaiKhoanService {
    async taoTaiKhoan(duLieu, client) {
        if (!client || typeof client.query !== 'function') throw new Error('taoTaiKhoan phải chạy trong transaction tạo OTP');
        const { ho_ten, email, ten_dang_nhap, so_dien_thoai, mat_khau } = kiemTraDuLieuTaoTaiKhoan(duLieu);
        try {
            return await taiKhoanRepository.chenTaiKhoan({ ho_ten, email, ten_dang_nhap, so_dien_thoai, mat_khau_bam: bamMatKhau(mat_khau) }, client);
        } catch (error) {
            if (error?.code === '23505' && error.constraint === 'uq_tai_khoan_email') {
                throw new AppError({ code: 'EMAIL_EXISTS', message: 'Email này đã được đăng ký', status: 409, details: [{ field: 'email', message: 'Email này đã được đăng ký' }] });
            }
            if (error?.code === '23505' && error.constraint === 'uq_tai_khoan_ten_dang_nhap') {
                throw new AppError({ code: 'USERNAME_EXISTS', message: 'Tên đăng nhập này đã được sử dụng', status: 409, details: [{ field: 'username', message: 'Tên đăng nhập này đã được sử dụng' }] });
            }
            if (error?.code === '23505') {
                throw new AppError({ code: 'ACCOUNT_EXISTS', message: 'Email hoặc tên đăng nhập đã tồn tại', status: 409 });
            }
            throw error;
        }
    }

    async layHoSoTaiKhoan(taiKhoanId) {
        const taiKhoan = await taiKhoanRepository.layHoSoTheoId(taiKhoanId);
        if (!taiKhoan) throw new AppError({ code: 'TAI_KHOAN_KHONG_TON_TAI', message: 'Không tìm thấy tài khoản', status: 404 });
        return taiKhoan;
    }
}

module.exports = new TaiKhoanService();