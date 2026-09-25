const { createHmac, randomBytes, randomInt, timingSafeEqual } = require('node:crypto');
const { trongGiaoDich } = require('../../database/transaction.js');
const { bamMatKhau, kiemTraMatKhau } = require('../../common/security/mat-khau.js');
const tokenService = require('../../common/security/token.js');
const emailService = require('../../integrations/email-client.js');
const { taoEmailOtp, taoEmailMoiNhanVien } = require('../../integrations/email-template.js');
const taiKhoanService = require('../tai-khoan/tai-khoan.service.js');
const { emailHopLe, dinhDanhHopLe, loiXacThuc, matKhauHopLe, maNhanVienHopLe, otpHopLe, tenDangNhapHopLe } = require('./xac-thuc.validation.js');
const xacThucContext = require('./xac-thuc.context.js');
const repo = require('./xac-thuc.repository.js');

class XacThucService {
    idHopLe(value, ten = 'ID') {
        const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
        const id = Number(value);
        if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw loiXacThuc(`${ten} không hợp lệ`);
        return id;
    }

    loiDangNhap() { return loiXacThuc('Thông tin đăng nhập không hợp lệ', 401, 'LOGIN_FAILED'); }

    loiOtp() { return loiXacThuc('OTP không hợp lệ hoặc đã hết hạn', 422, 'INVALID_OTP'); }

    bamOtp(id, mucDich, otp) {
        const secret = process.env.OTP_SECRET;
        if (!/^[0-9a-fA-F]{64,}$/.test(secret ?? '')) throw new Error('OTP_SECRET phải là chuỗi hex ít nhất 32 byte');
        return createHmac('sha256', Buffer.from(secret, 'hex')).update(`${id}:${mucDich}:${otp}`).digest('hex');
    }

    async guiOtp(client, tk, mucDich) {
        const cu = await repo.otpGanNhat(tk.id, mucDich, client);
        if (cu && Date.now() - new Date(cu.ngay_gui_cuoi).getTime() < 60000) throw loiXacThuc('Vui lòng chờ 60 giây trước khi gửi lại', 429, 'OTP_COOLDOWN');
        const soLan = await repo.soOtpTrongNgay(tk.id, mucDich, client);
        if (soLan >= 10) throw loiXacThuc('Đã đạt giới hạn gửi mã trong 24 giờ', 429, 'OTP_LIMIT');
        const otp = String(randomInt(0, 1000000)).padStart(6, '0');
        await repo.huyOtpCu(tk.id, mucDich, client);
        await repo.taoOtp(tk.id, tk.email, mucDich, this.bamOtp(tk.id, mucDich, otp), soLan + 1, client);
        const email = taoEmailOtp({ tenNguoiNhan: tk.ho_ten, otp, mucDich });
        await emailService.guiEmail({ den: tk.email, tenNguoiNhan: tk.ho_ten, ...email });
    }

    async kiemTraOtp(client, tk, mucDich, maOtp) {
        const row = await repo.otpGanNhat(tk.id, mucDich, client);
        if (!row || row.ngay_su_dung || new Date(row.ngay_het_han) <= new Date() || row.so_lan_thu >= 5) return false;
        const hopLe = timingSafeEqual(Buffer.from(row.ma_bam.trim(), 'hex'), Buffer.from(this.bamOtp(tk.id, mucDich, maOtp), 'hex'));
        if (!hopLe) {
            await repo.tangLanThuOtp(row.id, client);
            return false;
        }
        await repo.suDungOtp(row.id, client);
        return true;
    }

    async taoPhien(tk, client, nguCanh = {}) {
        const refreshToken = tokenService.taoRefreshToken();
        const phien = await repo.taoPhienDb(tk.id, tokenService.bamRefreshToken(refreshToken), client, nguCanh.donViId ?? null, nguCanh.chiNhanhId ?? null, tokenService.REFRESH_TOKEN_TTL_MINUTES);
        if (!phien) throw this.loiDangNhap();
        const accessToken = await tokenService.taoAccessToken({ taiKhoanId: tk.id, phienId: phien.id, phienBan: phien.phien_ban_xac_thuc });
        const thongTin = await xacThucContext.taoNguCanhDangNhap({ taiKhoanId: tk.id, donViId: phien.don_vi_dang_chon_id, chiNhanhId: phien.chi_nhanh_dang_chon_id }, client);
        return {
            access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer',
            expires_in: tokenService.ACCESS_TOKEN_TTL, refresh_token_expires_at: phien.ngay_het_han, ...thongTin
        };
    }

    async dangKy(body) {
        const result = await trongGiaoDich(async client => {
            const tk = await taiKhoanService.taoTaiKhoan(body, client);
            await this.guiOtp(client, tk, 'DANG_KY');
            return { id: tk.id, email: tk.email, trang_thai: tk.trang_thai };
        });
        return { ...result, thong_bao: 'Đã gửi OTP xác minh email' };
    }

    async xacNhanDangKy({ email, otp }) {
        email = emailHopLe(email);
        otp = otpHopLe(otp);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return null;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (locked.trang_thai !== 'CHO_XAC_MINH' || locked.bat_buoc_doi_mat_khau) return null;
            if (!await this.kiemTraOtp(client, locked, 'DANG_KY', otp)) return null;
            return repo.xacMinhEmail(locked.id, client);
        });
        if (!result) throw this.loiOtp();
        return result;
    }

    async guiLaiOtpDangKy({ email }) {
        email = emailHopLe(email);
        await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (locked.trang_thai === 'CHO_XAC_MINH' && !locked.bat_buoc_doi_mat_khau) await this.guiOtp(client, locked, 'DANG_KY');
        });
        return { thong_bao: 'Nếu email đang chờ xác minh, mã mới đã được gửi' };
    }

    async dangNhap({ dinh_danh, mat_khau }) {
        const dinhDanh = dinhDanhHopLe(dinh_danh);
        if (typeof mat_khau !== 'string' || mat_khau.length > 128) throw this.loiDangNhap();
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
                await this.guiOtp(client, locked, 'KICH_HOAT_NHAN_VIEN');
                return { yeu_cau_kich_hoat: true, email: locked.email };
            }
            if (locked.trang_thai !== 'DANG_DUNG' || !locked.email_da_xac_minh) return { loi: 'LOGIN_FAILED' };
            await repo.dangNhapThanhCong(tk.id, client);
            const token = await this.taoPhien(locked, client);
            await repo.ghiNhatKyDangNhap(tk.id, dinhDanh, 'THANH_CONG', client);
            return token;
        });
        if (result.loi === 'TEMP_EXPIRED') throw loiXacThuc('Mật khẩu tạm đã hết hạn, liên hệ quản trị để gửi lại lời mời', 403, 'TEMP_EXPIRED');
        if (result.loi) throw this.loiDangNhap();
        return result;
    }

    async hoanTatNhanVien({ dinh_danh, mat_khau_tam, otp, mat_khau_moi }, requestId) {
        const dinhDanh = dinhDanhHopLe(dinh_danh);
        otp = otpHopLe(otp);
        matKhauHopLe(mat_khau_moi);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoan(dinhDanh, client);
            if (!tk) return null;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (!locked.bat_buoc_doi_mat_khau || locked.trang_thai !== 'CHO_XAC_MINH' || !locked.mat_khau_tam_het_han || new Date(locked.mat_khau_tam_het_han) <= new Date()) return null;
            if (!kiemTraMatKhau(mat_khau_tam, locked.mat_khau_bam) || kiemTraMatKhau(mat_khau_moi, locked.mat_khau_bam)) return null;
            if (!await this.kiemTraOtp(client, locked, 'KICH_HOAT_NHAN_VIEN', otp)) return { otpSai: true };
            const taiKhoan = await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client, true);
            await repo.capNhatThanhVienKichHoat(tk.id, locked.don_vi_kich_hoat_id, client);
            await repo.ghiAuditNhanVien({
                donViId: locked.don_vi_kich_hoat_id, actorId: tk.id, targetId: tk.id,
                requestId, hanhDong: 'account.employee.activate'
            }, client);
            await repo.thuHoiTatCaPhien(tk.id, 'KICH_HOAT_NHAN_VIEN', client);
            return this.taoPhien(taiKhoan, client);
        });
        if (!result || result.otpSai) throw this.loiOtp();
        return result;
    }

    async quenMatKhau({ email }) {
        email = emailHopLe(email);
        await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (locked.trang_thai === 'DANG_DUNG' && locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau) await this.guiOtp(client, locked, 'DAT_LAI_MAT_KHAU');
        });
        return { thong_bao: 'Nếu email hợp lệ, mã đặt lại mật khẩu đã được gửi' };
    }

    async datLaiMatKhau({ email, otp, mat_khau_moi }) {
        email = emailHopLe(email);
        otp = otpHopLe(otp);
        matKhauHopLe(mat_khau_moi);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return false;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (locked.trang_thai !== 'DANG_DUNG' || !locked.email_da_xac_minh || locked.bat_buoc_doi_mat_khau) return false;
            if (!await this.kiemTraOtp(client, locked, 'DAT_LAI_MAT_KHAU', otp)) return false;
            await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client);
            await repo.thuHoiTatCaPhien(tk.id, 'DAT_LAI_MAT_KHAU', client);
            return true;
        });
        if (!result) throw this.loiOtp();
        return { thong_bao: 'Mật khẩu đã được đặt lại, vui lòng đăng nhập' };
    }

    async yeuCauDoiMatKhau(taiKhoanId, { mat_khau_hien_tai }) {
        await trongGiaoDich(async client => {
            const tk = await repo.khoaTaiKhoan(taiKhoanId, client);
            if (!tk || !kiemTraMatKhau(mat_khau_hien_tai, tk.mat_khau_bam)) throw this.loiDangNhap();
            await this.guiOtp(client, tk, 'DOI_MAT_KHAU');
        });
        return { thong_bao: 'Đã gửi OTP đổi mật khẩu' };
    }

    async doiMatKhau(taiKhoanId, { mat_khau_hien_tai, mat_khau_moi, otp }) {
        otp = otpHopLe(otp);
        matKhauHopLe(mat_khau_moi);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.khoaTaiKhoan(taiKhoanId, client);
            if (!tk || !kiemTraMatKhau(mat_khau_hien_tai, tk.mat_khau_bam) || kiemTraMatKhau(mat_khau_moi, tk.mat_khau_bam)) return false;
            if (!await this.kiemTraOtp(client, tk, 'DOI_MAT_KHAU', otp)) return false;
            await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client);
            await repo.thuHoiTatCaPhien(tk.id, 'DOI_MAT_KHAU', client);
            return true;
        });
        if (!result) throw this.loiOtp();
        return { thong_bao: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
    }

    async lamMoiPhien({ refresh_token } = {}) {
        if (!tokenService.refreshTokenHopLe(refresh_token)) throw loiXacThuc('Refresh Token không hợp lệ', 401, 'REFRESH_TOKEN_INVALID');
        const ketQua = await trongGiaoDich(async client => {
            const maCu = tokenService.bamRefreshToken(refresh_token);
            const phien = await repo.layPhienTheoRefresh(maCu, client);
            if (!phien) return null;
            const refreshMoi = tokenService.taoRefreshToken();
            const daXoay = await repo.xoayRefreshToken(phien.id, maCu, tokenService.bamRefreshToken(refreshMoi), client);
            if (!daXoay) return null;
            const accessToken = await tokenService.taoAccessToken({ taiKhoanId: phien.tai_khoan_id, phienId: phien.id, phienBan: phien.phien_ban_xac_thuc });
            const thongTin = await xacThucContext.taoNguCanhDangNhap({ taiKhoanId: phien.tai_khoan_id, donViId: phien.don_vi_dang_chon_id, chiNhanhId: phien.chi_nhanh_dang_chon_id }, client);
            return {
                access_token: accessToken, refresh_token: refreshMoi, token_type: 'Bearer',
                expires_in: tokenService.ACCESS_TOKEN_TTL, refresh_token_expires_at: phien.ngay_het_han, ...thongTin
            };
        });
        if (!ketQua) throw loiXacThuc('Refresh Token không tồn tại hoặc đã hết hạn', 401, 'REFRESH_TOKEN_INVALID');
        return ketQua;
    }

    async dangXuat(auth) {
        await repo.thuHoiPhien(auth.phienId, 'DANG_XUAT');
        return { thong_bao: 'Đã đăng xuất' };
    }

    async layNguoiDung(auth) {
        return xacThucContext.taoNguCanhDangNhap({
            taiKhoanId: auth.taiKhoanId, donViId: auth.donViId, chiNhanhId: auth.chiNhanhId
        });
    }

    async chonDonVi(auth, { don_vi_id } = {}) {
        don_vi_id = this.idHopLe(don_vi_id, 'ID đơn vị');
        const row = await repo.chonDonViPhien(auth.phienId, auth.taiKhoanId, don_vi_id);
        if (!row) throw loiXacThuc('Không có quyền truy cập đơn vị', 403, 'FORBIDDEN');
        return xacThucContext.taoNguCanhDangNhap({
            taiKhoanId: auth.taiKhoanId, donViId: row.don_vi_dang_chon_id, chiNhanhId: null
        });
    }

    async taoNhanVienBoiAdmin(auth, body, requestId) {
        if (!body || typeof body !== 'object' || Object.keys(body).some(k => !['email', 'ten_dang_nhap', 'ma_nhan_vien', 'ho_ten', 'chuc_danh', 'so_dien_thoai'].includes(k))) {
            throw loiXacThuc('Dữ liệu tạo nhân viên không hợp lệ');
        }
        const email = emailHopLe(body.email);
        const tenDangNhap = tenDangNhapHopLe(body.ten_dang_nhap);
        const maNhanVien = maNhanVienHopLe(body.ma_nhan_vien);
        const hoTen = typeof body.ho_ten === 'string' ? body.ho_ten.trim() : '';
        const chucDanh = typeof body.chuc_danh === 'string' ? body.chuc_danh.trim() : '';
        if (hoTen.length < 2 || hoTen.length > 200 || chucDanh.length < 2 || chucDanh.length > 120) throw loiXacThuc('Thiếu họ tên hoặc chức danh');
        if (body.so_dien_thoai != null && (typeof body.so_dien_thoai !== 'string' || body.so_dien_thoai.length > 30 || !/^[0-9+(). -]{9,30}$/.test(body.so_dien_thoai))) throw loiXacThuc('Số điện thoại không hợp lệ');
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
            const emailMoiNhanVien = taoEmailMoiNhanVien({
                tenNguoiNhan: hoTen, tenDangNhap, matKhauTam, linkDangNhap: link
            });
            await emailService.guiEmail({ den: email, tenNguoiNhan: hoTen, ...emailMoiNhanVien });
            return {
                id: tk.id, email, ten_dang_nhap: tenDangNhap,
                ma_nhan_vien: maNhanVien, trang_thai: 'CHO_XAC_MINH',
                thanh_vien_id: thanhVien.id
            };
        });
        return result;
    }

    async guiLaiThuMoiNhanVien(auth, taiKhoanId, requestId) {
        taiKhoanId = this.idHopLe(taiKhoanId, 'Nhân viên');
        if (!auth.donViId) throw loiXacThuc('Nhân viên hoặc đơn vị không hợp lệ');
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
            const emailMoiNhanVien = taoEmailMoiNhanVien({
                tenNguoiNhan: tk.ho_ten, tenDangNhap: tk.ten_dang_nhap,
                matKhauTam, linkDangNhap: process.env.PUBLIC_LOGIN_URL, guiLai: true
            });
            await emailService.guiEmail({ den: tk.email, tenNguoiNhan: tk.ho_ten, ...emailMoiNhanVien });
            return { thong_bao: 'Đã gửi lại lời mời và vô hiệu mật khẩu tạm cũ' };
        });
    }
}

module.exports = new XacThucService();