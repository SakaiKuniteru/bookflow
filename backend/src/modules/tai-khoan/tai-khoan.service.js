import { AppError } from '../../common/errors/AppError.js';
import { bamMatKhau } from '../../common/security/mat-khau.js';
import { kiemTraDuLieuTaoTaiKhoan } from './tai-khoan.validation.js';
import { chenTaiKhoan, layHoSoTheoId } from './tai-khoan.repository.js';

export async function taoTaiKhoan(duLieu, client) {
    if (!client || typeof client.query !== 'function') throw new Error('taoTaiKhoan phải chạy trong transaction tạo OTP');
    const { ho_ten, email, mat_khau } = kiemTraDuLieuTaoTaiKhoan(duLieu);
    try { return await chenTaiKhoan({ ho_ten, email, mat_khau_bam: bamMatKhau(mat_khau) }, client); }
    catch (error) {
        if (error?.code === '23505') throw new AppError({ code: 'EMAIL_KHONG_THE_SU_DUNG', message: 'Không thể sử dụng email này', status: 409 });
        throw error;
    }
}

export async function layHoSoTaiKhoan(taiKhoanId) {
    const taiKhoan = await layHoSoTheoId(taiKhoanId);
    if (!taiKhoan) throw new AppError({ code: 'TAI_KHOAN_KHONG_TON_TAI', message: 'Không tìm thấy tài khoản', status: 404 });
    return taiKhoan;
}
