const { AppError } = require('../../common/errors/AppError.js');
const { bamMatKhau } = require('../../common/security/mat-khau.js');
const { kiemTraDuLieuTaoTaiKhoan } = require('./tai-khoan.validation.js');
const taiKhoanRepository = require('./tai-khoan.repository.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const { kiemTraCapNhatHoSo, idTepHopLe } = require('./tai-khoan.validation.js');

function dinhDangNgayGioVietNam(value) {
    if (!(value instanceof Date) || Number.isNaN(value.getTime())) return value;
    return new Date(value.getTime() + 7 * 60 * 60 * 1000).toISOString().replace(/\.\d{3}Z$/, '+07:00');
}
function taoTaiKhoanDto(taiKhoan) {
    return Object.fromEntries(Object.entries(taiKhoan).map(([key, value]) => [key.replace(/_([a-z])/g, (_, chu) => chu.toUpperCase()), dinhDangNgayGioVietNam(value)]));
}

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
        return taoTaiKhoanDto(taiKhoan);
    }
    async capNhatHoSoTaiKhoan(taiKhoanId, duLieu) {
        const hoSo = kiemTraCapNhatHoSo(duLieu);
        const taiKhoan = await taiKhoanRepository.capNhatHoSo(taiKhoanId, hoSo);
        if (!taiKhoan) throw new AppError({ code: 'TAI_KHOAN_KHONG_TON_TAI', message: 'Tài khoản không còn hoạt động', status: 404 });
        return taoTaiKhoanDto(taiKhoan);
    }
    async capNhatAnhDaiDien(taiKhoanId, duLieu) {
        if (!duLieu || typeof duLieu !== 'object' || Array.isArray(duLieu) || Object.keys(duLieu).some(ten => ten !== 'anh_dai_dien_tep_id')) throw new AppError({ code: 'INVALID_INPUT', message: 'Dữ liệu Avatar không hợp lệ', status: 422, details: [{ field: 'anh_dai_dien_tep_id', message: 'Dữ liệu Avatar không hợp lệ' }] });
        const tepId = idTepHopLe(duLieu.anh_dai_dien_tep_id);
        return trongGiaoDich(async client => {
            if (!await taiKhoanRepository.anhDaiDienThuocTaiKhoan(taiKhoanId, tepId, client)) throw new AppError({ code: 'AVATAR_FILE_FORBIDDEN', message: 'Ảnh không thuộc tài khoản hoặc chưa sẵn sàng', status: 422, details: [{ field: 'anhDaiDienTepId', message: 'Vui lòng chọn ảnh đại diện hợp lệ' }] });
            const taiKhoan = await taiKhoanRepository.capNhatAnhDaiDien(taiKhoanId, tepId, client);
            if (!taiKhoan) throw new AppError({ code: 'TAI_KHOAN_KHONG_TON_TAI', message: 'Tài khoản không còn hoạt động', status: 404 });
            return taoTaiKhoanDto(taiKhoan);
        });
    }
}

module.exports = new TaiKhoanService();
