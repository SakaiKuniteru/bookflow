import { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';
import { trongGiaoDich } from '../../database/transaction.js';
import { bamMatKhau, kiemTraMatKhau } from '../../common/security/mat-khau.js';
import { guiEmail } from '../../integrations/email-client.js';
import { taoTaiKhoan } from '../tai-khoan/tai-khoan.service.js';
import { emailHopLe, dinhDanhHopLe, loiXacThuc, matKhauHopLe, maNhanVienHopLe, otpHopLe, tenDangNhapHopLe } from './xac-thuc.validation.js';
import * as repo from './xac-thuc.repository.js';

const loiDangNhap = () => loiXacThuc('Thông tin đăng nhập không hợp lệ', 401, 'LOGIN_FAILED');
const loiOtp = () => loiXacThuc('OTP không hợp lệ hoặc đã hết hạn', 422, 'INVALID_OTP');
const bam = value => createHash('sha256').update(value).digest('hex');

function bamOtp(id, mucDich, otp) {
    const secret = process.env.OTP_SECRET;
    if (!/^[0-9a-fA-F]{64,}$/.test(secret ?? '')) throw new Error('OTP_SECRET phải là chuỗi hex ít nhất 32 byte');
    return createHmac('sha256', Buffer.from(secret, 'hex')).update(`${id}:${mucDich}:${otp}`).digest('hex');
}

async function guiOtp(client, tk, mucDich) {
    const cu = await repo.otpGanNhat(tk.id, mucDich, client);
    if (cu && Date.now() - new Date(cu.ngay_gui_cuoi).getTime() < 60000) throw loiXacThuc('Vui lòng chờ 60 giây trước khi gửi lại', 429, 'OTP_COOLDOWN');
    const soLan = await repo.soOtpTrongNgay(tk.id, mucDich, client);
    if (soLan >= 10) throw loiXacThuc('Đã đạt giới hạn gửi mã trong 24 giờ', 429, 'OTP_LIMIT');
    const otp = String(randomInt(0, 1000000)).padStart(6, '0');
    await repo.huyOtpCu(tk.id, mucDich, client);
    await repo.taoOtp(tk.id, tk.email, mucDich, bamOtp(tk.id, mucDich, otp), soLan + 1, client);
    await guiEmail({
        den: tk.email,
        tieuDe: `BookFlow - mã xác minh ${mucDich}`,
        noiDung: `Mã xác minh của bạn: ${otp}\nMã hết hạn sau 10 phút, chỉ dùng một lần. Nếu bạn không yêu cầu, hãy bỏ qua email này.`
    });
}

async function kiemTraOtp(client, tk, mucDich, maOtp) {
    const row = await repo.otpGanNhat(tk.id, mucDich, client);
    if (!row || row.ngay_su_dung || new Date(row.ngay_het_han) <= new Date() || row.so_lan_thu >= 5) return false;
    const hopLe = timingSafeEqual(Buffer.from(row.ma_bam.trim(), 'hex'), Buffer.from(bamOtp(tk.id, mucDich, maOtp), 'hex'));
    if (!hopLe) {
        await repo.tangLanThuOtp(row.id, client);
        return false;
    }
    await repo.suDungOtp(row.id, client);
    return true;
}

async function taoPhien(tkId, client, nguCanh = {}) {
    const token = randomBytes(32).toString('base64url');
    const csrf = randomBytes(32).toString('base64url');
    const phien = await repo.taoPhienDb(tkId, bam(token), bam(csrf), client, nguCanh.donViId ?? null, nguCanh.chiNhanhId ?? null);
    if (!phien) throw loiDangNhap();
    return { token, csrf, hetHan: phien.ngay_het_han };
}

export async function dangKy(body) {
    const result = await trongGiaoDich(async client => {
        const tk = await taoTaiKhoan(body, client);
        await guiOtp(client, tk, 'DANG_KY');
        return { id: tk.id, email: tk.email, trang_thai: tk.trang_thai };
    });
    return { ...result, thong_bao: 'Đã gửi OTP xác minh email' };
}

export async function xacNhanDangKy({ email, otp }) {
    email = emailHopLe(email);
    otp = otpHopLe(otp);
    const result = await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoanTheoEmail(email, client);
        if (!tk) return null;
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (locked.trang_thai !== 'CHO_XAC_MINH' || locked.bat_buoc_doi_mat_khau) return null;
        if (!await kiemTraOtp(client, locked, 'DANG_KY', otp)) return null;
        return repo.xacMinhEmail(locked.id, client);
    });
    if (!result) throw loiOtp();
    return result;
}

export async function guiLaiOtpDangKy({ email }) {
    email = emailHopLe(email);
    await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoanTheoEmail(email, client);
        if (!tk) return;
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (locked.trang_thai === 'CHO_XAC_MINH' && !locked.bat_buoc_doi_mat_khau) await guiOtp(client, locked, 'DANG_KY');
    });
    return { thong_bao: 'Nếu email đang chờ xác minh, mã mới đã được gửi' };
}

export async function dangNhap({ dinh_danh, mat_khau }) {
    const dinhDanh = dinhDanhHopLe(dinh_danh);
    if (typeof mat_khau !== 'string' || mat_khau.length > 128) throw loiDangNhap();
    const result = await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoan(dinhDanh, client);
        if (!tk) {
            await repo.ghiNhatKyDangNhap(null, dinhDanh, 'SAI_MAT_KHAU', client);
            return { loi: 'LOGIN_FAILED' };
        }
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (locked.khoa_den && new Date(locked.khoa_den) > new Date()) {
            await repo.ghiNhatKyDangNhap(tk.id, dinhDanh, 'KHOA', client);
            return { loi: 'LOGIN_FAILED' };
        }
        if (!locked.mat_khau_bam || !kiemTraMatKhau(mat_khau, locked.mat_khau_bam)) {
            await repo.tangDangNhapSai(tk.id, client);
            await repo.ghiNhatKyDangNhap(tk.id, dinhDanh, 'SAI_MAT_KHAU', client);
            return { loi: 'LOGIN_FAILED' };
        }
        if (locked.bat_buoc_doi_mat_khau) {
            if (!locked.mat_khau_tam_het_han || new Date(locked.mat_khau_tam_het_han) <= new Date()) return { loi: 'TEMP_EXPIRED' };
            await guiOtp(client, locked, 'KICH_HOAT_NHAN_VIEN');
            return { yeu_cau_kich_hoat: true, email: locked.email };
        }
        if (locked.trang_thai !== 'DANG_DUNG' || !locked.email_da_xac_minh) return { loi: 'LOGIN_FAILED' };
        await repo.dangNhapThanhCong(tk.id, client);
        const phien = await taoPhien(tk.id, client);
        await repo.ghiNhatKyDangNhap(tk.id, dinhDanh, 'THANH_CONG', client);
        return { phien, tai_khoan: { id: tk.id, ho_ten: tk.ho_ten, email: tk.email } };
    });
    if (result.loi === 'TEMP_EXPIRED') throw loiXacThuc('Mật khẩu tạm đã hết hạn, liên hệ quản trị để gửi lại lời mời', 403, 'TEMP_EXPIRED');
    if (result.loi) throw loiDangNhap();
    return result;
}

export async function hoanTatNhanVien({ dinh_danh, mat_khau_tam, otp, mat_khau_moi }, requestId) {
    const dinhDanh = dinhDanhHopLe(dinh_danh);
    otp = otpHopLe(otp);
    matKhauHopLe(mat_khau_moi);
    const result = await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoan(dinhDanh, client);
        if (!tk) return null;
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (!locked.bat_buoc_doi_mat_khau || locked.trang_thai !== 'CHO_XAC_MINH' || !locked.mat_khau_tam_het_han || new Date(locked.mat_khau_tam_het_han) <= new Date()) return null;
        if (!kiemTraMatKhau(mat_khau_tam, locked.mat_khau_bam) || kiemTraMatKhau(mat_khau_moi, locked.mat_khau_bam)) return null;
        if (!await kiemTraOtp(client, locked, 'KICH_HOAT_NHAN_VIEN', otp)) return { otpSai: true };
        const taiKhoan = await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client, true);
        await repo.capNhatThanhVienKichHoat(tk.id, locked.don_vi_kich_hoat_id, client);
        await repo.ghiAuditNhanVien({
            donViId: locked.don_vi_kich_hoat_id,
            actorId: tk.id,
            targetId: tk.id,
            requestId,
            hanhDong: 'account.employee.activate'
        }, client);
        await repo.thuHoiTatCaPhien(tk.id, 'KICH_HOAT_NHAN_VIEN', client);
        const phien = await taoPhien(tk.id, client);
        return { tai_khoan: taiKhoan, phien };
    });
    if (!result || result.otpSai) throw loiOtp();
    return result;
}

export async function quenMatKhau({ email }) {
    email = emailHopLe(email);
    await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoanTheoEmail(email, client);
        if (!tk) return;
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (locked.trang_thai === 'DANG_DUNG' && locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau) await guiOtp(client, locked, 'DAT_LAI_MAT_KHAU');
    });
    return { thong_bao: 'Nếu email hợp lệ, mã đặt lại mật khẩu đã được gửi' };
}

export async function datLaiMatKhau({ email, otp, mat_khau_moi }) {
    email = emailHopLe(email);
    otp = otpHopLe(otp);
    matKhauHopLe(mat_khau_moi);
    const result = await trongGiaoDich(async client => {
        const tk = await repo.timTaiKhoanTheoEmail(email, client);
        if (!tk) return false;
        const locked = await repo.khoaTaiKhoan(tk.id, client);
        if (locked.trang_thai !== 'DANG_DUNG' || !locked.email_da_xac_minh || locked.bat_buoc_doi_mat_khau) return false;
        if (!await kiemTraOtp(client, locked, 'DAT_LAI_MAT_KHAU', otp)) return false;
        await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client);
        await repo.thuHoiTatCaPhien(tk.id, 'DAT_LAI_MAT_KHAU', client);
        return true;
    });
    if (!result) throw loiOtp();
    return { thong_bao: 'Mật khẩu đã được đặt lại, vui lòng đăng nhập' };
}

export async function yeuCauDoiMatKhau(taiKhoanId, { mat_khau_hien_tai }) {
    await trongGiaoDich(async client => {
        const tk = await repo.khoaTaiKhoan(taiKhoanId, client);
        if (!tk || !kiemTraMatKhau(mat_khau_hien_tai, tk.mat_khau_bam)) throw loiDangNhap();
        await guiOtp(client, tk, 'DOI_MAT_KHAU');
    });
    return { thong_bao: 'Đã gửi OTP đổi mật khẩu' };
}

export async function doiMatKhau(taiKhoanId, { mat_khau_hien_tai, mat_khau_moi, otp }) {
    otp = otpHopLe(otp);
    matKhauHopLe(mat_khau_moi);
    const result = await trongGiaoDich(async client => {
        const tk = await repo.khoaTaiKhoan(taiKhoanId, client);
        if (!tk || !kiemTraMatKhau(mat_khau_hien_tai, tk.mat_khau_bam) || kiemTraMatKhau(mat_khau_moi, tk.mat_khau_bam)) return false;
        if (!await kiemTraOtp(client, tk, 'DOI_MAT_KHAU', otp)) return false;
        await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client);
        await repo.thuHoiTatCaPhien(tk.id, 'DOI_MAT_KHAU', client);
        return true;
    });
    if (!result) throw loiOtp();
    return { thong_bao: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
}

export async function lamMoiPhien(auth) {
    return trongGiaoDich(async client => {
        if (!await repo.thuHoiPhien(auth.phienId, 'LAM_MOI_PHIEN', client)) throw loiXacThuc('Phiên không còn hợp lệ', 401, 'SESSION_EXPIRED');
        return { phien: await taoPhien(auth.taiKhoanId, client, auth) };
    });
}

export async function dangXuat(auth) {
    await repo.thuHoiPhien(auth.phienId, 'DANG_XUAT');
    return { thong_bao: 'Đã đăng xuất' };
}

export async function layNguoiDung(auth) {
    const tk = await repo.timTaiKhoanTheoEmail(auth.email);
    if (!tk) throw loiDangNhap();
    return {
        id: tk.id, email: tk.email, ho_ten: tk.ho_ten,
        ten_dang_nhap: tk.ten_dang_nhap, don_vi_dang_chon_id: auth.donViId ?? null
    };
}

export async function chonDonVi(auth, { don_vi_id }) {
    if (typeof don_vi_id !== 'string' || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(don_vi_id)) throw loiXacThuc('ID đơn vị không hợp lệ');
    const row = await repo.chonDonViPhien(auth.phienId, auth.taiKhoanId, don_vi_id);
    if (!row) throw loiXacThuc('Không có quyền truy cập đơn vị', 403, 'FORBIDDEN');
    return row;
}

export async function taoNhanVienBoiAdmin(auth, body, requestId) {
    if (!body || typeof body !== 'object' || Object.keys(body).some(k => !['email', 'ten_dang_nhap', 'ma_nhan_vien', 'ho_ten', 'chuc_danh', 'so_dien_thoai'].includes(k))) {
        throw loiXacThuc('Dữ liệu tạo nhân viên không hợp lệ');
    }
    const email = emailHopLe(body.email);
    const tenDangNhap = tenDangNhapHopLe(body.ten_dang_nhap);
    const maNhanVien = maNhanVienHopLe(body.ma_nhan_vien);
    const hoTen = typeof body.ho_ten === 'string' ? body.ho_ten.trim() : '';
    const chucDanh = typeof body.chuc_danh === 'string' ? body.chuc_danh.trim() : '';
    if (hoTen.length < 2 || hoTen.length > 200 || chucDanh.length < 2 || chucDanh.length > 120) throw loiXacThuc('Thiếu họ tên hoặc chức danh');
    if (body.so_dien_thoai != null && (typeof body.so_dien_thoai !== 'string' || body.so_dien_thoai.length > 30 || !/^[0-9+(). -]{9,30}$/.test(body.so_dien_thoai))) {
        throw loiXacThuc('Số điện thoại không hợp lệ');
    }
    if (!auth.donViId) throw loiXacThuc('Chưa chọn đơn vị làm việc', 403, 'FORBIDDEN');
    const matKhauTam = `Aq7!${randomBytes(18).toString('base64url')}`;
    const result = await trongGiaoDich(async client => {
        if (!await repo.coQuyenQuanLyNhanVien(auth.taiKhoanId, auth.donViId, client)) throw loiXacThuc('Không có quyền tạo nhân viên', 403, 'FORBIDDEN');
        let tk;
        try {
            tk = await repo.taoTaiKhoanNhanVien({
                email, hoTen, tenDangNhap, matKhauBam: bamMatKhau(matKhauTam), donViId: auth.donViId
            }, client);
        } catch (error) {
            if (error.code === '23505') throw loiXacThuc('Email hoặc tên đăng nhập đã tồn tại; tài khoản có sẵn cần được mời tham gia', 409, 'ACCOUNT_EXISTS');
            throw error;
        }
        let thanhVien;
        try {
            thanhVien = await repo.taoThanhVien({
                donViId: auth.donViId, taiKhoanId: tk.id, maNhanVien, chucDanh,
                email, soDienThoai: body.so_dien_thoai ?? null, nguoiTaoId: auth.taiKhoanId
            }, client);
        } catch (error) {
            if (error.code === '23505') throw loiXacThuc('Mã nhân viên đã tồn tại trong đơn vị', 409, 'EMPLOYEE_CODE_EXISTS');
            throw error;
        }
        if (!await repo.ganVaiTroNhanVien(auth.donViId, thanhVien.id, client)) throw loiXacThuc('Đơn vị chưa có vai trò NHAN_VIEN', 409, 'ROLE_NOT_READY');
        await repo.ghiAuditNhanVien({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            targetId: tk.id, requestId, hanhDong: 'account.employee.create'
        }, client);
        const link = process.env.PUBLIC_LOGIN_URL;
        if (!/^https?:\/\//.test(link ?? '')) throw new Error('Chưa cấu hình PUBLIC_LOGIN_URL');
        await guiEmail({
            den: email,
            tieuDe: 'BookFlow - thông tin tài khoản nhân viên',
            noiDung: `Tài khoản: ${tenDangNhap}\nMật khẩu tạm: ${matKhauTam}\nĐăng nhập: ${link}\nMật khẩu tạm hết hạn sau 24 giờ. Đăng nhập để nhận OTP và bắt buộc đổi mật khẩu. Không chia sẻ email này.`
        });
        return {
            id: tk.id, email, ten_dang_nhap: tenDangNhap,
            ma_nhan_vien: maNhanVien, trang_thai: 'CHO_XAC_MINH'
        };
    });
    return result;
}

export async function guiLaiThuMoiNhanVien(auth, taiKhoanId, requestId) {
    if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(taiKhoanId ?? '') || !auth.donViId) throw loiXacThuc('Nhân viên hoặc đơn vị không hợp lệ');
    return trongGiaoDich(async client => {
        if (!await repo.coQuyenQuanLyNhanVien(auth.taiKhoanId, auth.donViId, client)) throw loiXacThuc('Không có quyền', 403, 'FORBIDDEN');
        const tk = await repo.layNhanVienChoKichHoat(taiKhoanId, auth.donViId, client);
        if (!tk) throw loiXacThuc('Nhân viên không trong trạng thái chờ kích hoạt', 404, 'NOT_FOUND');
        const matKhauTam = `Aq7!${randomBytes(18).toString('base64url')}`;
        await repo.datLaiMatKhauTam(tk.id, bamMatKhau(matKhauTam), client);
        await repo.huyOtpCu(tk.id, 'KICH_HOAT_NHAN_VIEN', client);
        await repo.ghiAuditNhanVien({
            donViId: auth.donViId, actorId: auth.taiKhoanId,
            targetId: tk.id, requestId, hanhDong: 'account.employee.reinvite'
        }, client);
        await guiEmail({
            den: tk.email,
            tieuDe: 'BookFlow - gửi lại lời mời nhân viên',
            noiDung: `Tài khoản: ${tk.ten_dang_nhap}\nMật khẩu tạm mới: ${matKhauTam}\nĐăng nhập: ${process.env.PUBLIC_LOGIN_URL}\nMật khẩu hết hạn sau 24 giờ. Sau khi đăng nhập, xác minh OTP và đổi mật khẩu.`
        });
        return { thong_bao: 'Đã gửi lại lời mời và vô hiệu mật khẩu tạm cũ' };
    });
}