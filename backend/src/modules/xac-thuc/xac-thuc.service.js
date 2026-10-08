const { createHash, createHmac, randomBytes, randomInt, timingSafeEqual } = require('node:crypto');
const { trongGiaoDich } = require('../../database/transaction.js');
const { bamMatKhau, kiemTraMatKhau } = require('../../common/security/mat-khau.js');
const tokenService = require('../../common/security/token.js');
const emailService = require('../../integrations/email-client.js');
const { taoEmailOtp, taoEmailMoiNhanVien } = require('../../integrations/email-template.js');
const { docCauHinhThuongHieu } = require('../../config/environment.js');
const taiKhoanService = require('../tai-khoan/tai-khoan.service.js');
const taiKhoanRepository = require('../tai-khoan/tai-khoan.repository.js');
const { emailHopLe, dinhDanhHopLe, loiXacThuc, matKhauHopLe, maNhanVienHopLe, otpHopLe, tenDangNhapHopLe } = require('./xac-thuc.validation.js');
const { kiemTraDuLieuTaoTaiKhoan } = require('../tai-khoan/tai-khoan.validation.js');
const nhanVienValidation = require('../nhan-vien/nhan-vien.validation.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const xacThucContext = require('./xac-thuc.context.js');
const repo = require('./xac-thuc.repository.js');

class XacThucService {
    idHopLe(value, ten = 'ID') {
        const dungDinhDang = typeof value === 'number' ? Number.isInteger(value) : typeof value === 'string' && /^[1-9]\d*$/.test(value);
        const id = Number(value);
        if (!dungDinhDang || !Number.isSafeInteger(id) || id < 1 || id > 2147483647) throw loiXacThuc(`${ten} không hợp lệ`);
        return id;
    }

    loiDangNhap() { return loiXacThuc('Tài khoản hoặc mật khẩu không đúng', 401, 'LOGIN_FAILED'); }

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
        const donViThuongHieu = tk.don_vi_kich_hoat_id ? await repo.layThuongHieuDonVi(tk.don_vi_kich_hoat_id, client) : await repo.layThuongHieuDonViTaiKhoan(tk.id, client);
        const email = taoEmailOtp({ tenNguoiNhan: tk.ho_ten, otp, mucDich, thuongHieu: docCauHinhThuongHieu(donViThuongHieu) });
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
        const phien = await repo.taoPhienDb(tk.id, tokenService.bamRefreshToken(refreshToken), client, nguCanh.donViId ?? null, nguCanh.chiNhanhId ?? null, tokenService.FE_SESSION_TTL_MINUTES);
        if (!phien) throw this.loiDangNhap();
        const accessToken = await tokenService.taoAccessToken({ taiKhoanId: tk.id, phienId: phien.id, phienBan: phien.phien_ban_xac_thuc });
        const thongTin = await xacThucContext.taoNguCanhDangNhap({ taiKhoanId: tk.id, donViId: phien.don_vi_dang_chon_id, chiNhanhId: phien.chi_nhanh_dang_chon_id }, client);
        return {
            access_token: accessToken, 
            refresh_token: refreshToken, 
            token_type: 'Bearer',
            expires_in: tokenService.ACCESS_TOKEN_TTL, 
            refresh_token_expires_at: new Date(Date.now() + tokenService.REFRESH_TOKEN_TTL_MINUTES * 60000).toISOString(), 
            ...thongTin
        };
    }
    async xoaDangKyChoXacMinhHetHan() {
        return trongGiaoDich(async client => {
            const ids = await repo.layDangKyChoXacMinhHetHan(client, 100);
            if (!ids.length) return 0;
            await repo.xoaOtpCuaTaiKhoan(ids, client);
            return repo.xoaTaiKhoanDangKyHetHan(ids, client);
        });
    }
    khoiDongDonDepDangKy({ chuKyMs = 60000 } = {}) {
        if (this._registrationCleanupTimer) return;
        this._registrationCleanupBusy = false;
        this._registrationCleanupTimer = setInterval(async () => {
            if (this._registrationCleanupBusy) return;
            this._registrationCleanupBusy = true;
            try {
                await this.xoaDangKyChoXacMinhHetHan();
            } catch (error) {
                console.error(JSON.stringify({ event: 'REGISTRATION_CLEANUP_ERROR', message: error?.message ?? null }));
            } finally {
                this._registrationCleanupBusy = false;
            }
        }, chuKyMs);
        this.xoaDangKyChoXacMinhHetHan().catch(error => console.error(JSON.stringify({ event: 'REGISTRATION_CLEANUP_START_ERROR', message: error?.message ?? null })));
    }
    dungDonDepDangKy() {
        if (!this._registrationCleanupTimer) return;
        clearInterval(this._registrationCleanupTimer);
        this._registrationCleanupTimer = null;
        this._registrationCleanupBusy = false;
    }
    async dangKy(body) {
        const data = kiemTraDuLieuTaoTaiKhoan(body);
        const tokenTiepTuc = randomBytes(32).toString('base64url');
        const tokenHash = createHash('sha256').update(tokenTiepTuc).digest('hex');
        let result;
        try {
            result = await trongGiaoDich(async client => {
                const taiKhoanDaCo = await repo.timTaiKhoanTheoEmail(data.email, client);
                if (taiKhoanDaCo) throw loiXacThuc('Email này đã được đăng ký', 409, 'EMAIL_EXISTS');
                const phoneDaCo = await repo.timTaiKhoanTheoSoDienThoai(data.so_dien_thoai, client);
                if (phoneDaCo) throw loiXacThuc('Số điện thoại này đã được đăng ký', 409, 'PHONE_EXISTS');
                const tenDangNhapDaCo = await repo.timTaiKhoanTheoTenDangNhap(data.ten_dang_nhap, client);
                if (tenDangNhapDaCo) throw loiXacThuc('Tên đăng nhập này đã được sử dụng', 409, 'USERNAME_EXISTS');
                const otp = String(randomInt(0, 1000000)).padStart(6, '0');
                const banTam = await repo.taoDangKyChoXacMinh({
                    ...data,
                    mat_khau_bam: bamMatKhau(data.mat_khau),
                    otp_bam: '0'.repeat(64),
                    token_tiep_tuc_bam: tokenHash
                }, client);
                const otpHash = this.bamOtp(banTam.id, 'DANG_KY', otp);
                await repo.datOtpDangKyChoXacMinh(banTam.id, otpHash, client);
                const emailOtp = taoEmailOtp({ tenNguoiNhan: banTam.ho_ten, otp, mucDich: 'DANG_KY' });
                await emailService.guiEmail({ den: banTam.email, tenNguoiNhan: banTam.ho_ten, ...emailOtp });
                return { id: banTam.id, email: banTam.email, registration_resume_token: tokenTiepTuc };
            });
        } catch (error) {
            if (error.code === '23505' && error.constraint === 'uq_dkcx_email') throw loiXacThuc('Email đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'EMAIL_EXISTS');
            if (error.code === '23505' && error.constraint === 'uq_dkcx_ten_dang_nhap') throw loiXacThuc('Tên đăng nhập đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'USERNAME_EXISTS');
            if (error.code === '23505' && error.constraint === 'uq_dkcx_so_dien_thoai') throw loiXacThuc('Số điện thoại đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'PHONE_EXISTS');
            throw error;
        }
        return { ...result, thong_bao: 'Đã gửi OTP xác minh email' };
    }
    async doiEmailDangKy({ token, ho_ten, ten_dang_nhap, email, so_dien_thoai, mat_khau }) {
        if (!token) throw loiXacThuc('Phiên đăng ký đã hết hạn', 410, 'REGISTRATION_RESUME_INVALID');
        const data = kiemTraDuLieuTaoTaiKhoan({ ho_ten, email, ten_dang_nhap, so_dien_thoai, mat_khau });
        const tokenHashCu = createHash('sha256').update(String(token)).digest('hex');
        const tokenMoi = randomBytes(32).toString('base64url');
        const tokenHashMoi = createHash('sha256').update(tokenMoi).digest('hex');
        try {
            const result = await trongGiaoDich(async client => {
                const banTam = await repo.timDangKyChoXacMinhTheoToken(tokenHashCu, client);
                if (!banTam) throw loiXacThuc('Yêu cầu đăng ký đã hết hạn hoặc không hợp lệ', 410, 'REGISTRATION_RESUME_INVALID');
                if (await repo.timTaiKhoanTheoEmail(data.email, client)) throw loiXacThuc('Email này đã được đăng ký', 409, 'EMAIL_EXISTS');
                if (await repo.timTaiKhoanTheoTenDangNhap(data.ten_dang_nhap, client)) throw loiXacThuc('Tên đăng nhập này đã được sử dụng', 409, 'USERNAME_EXISTS');
                if (await repo.timTaiKhoanTheoSoDienThoai(data.so_dien_thoai, client)) throw loiXacThuc('Số điện thoại này đã được đăng ký', 409, 'PHONE_EXISTS');
                const otp = String(randomInt(0, 1000000)).padStart(6, '0');
                const banTamMoi = await repo.capNhatDangKyChoXacMinh(banTam.id, {
                    ...data,
                    mat_khau_bam: bamMatKhau(data.mat_khau),
                    otp_bam: this.bamOtp(banTam.id, 'DANG_KY', otp),
                    token_tiep_tuc_bam: tokenHashMoi
                }, client);
                if (!banTamMoi) throw loiXacThuc('Yêu cầu đăng ký không còn chờ xác minh', 409, 'REGISTRATION_NOT_PENDING');
                const emailOtp = taoEmailOtp({ tenNguoiNhan: banTamMoi.ho_ten, otp, mucDich: 'DANG_KY' });
                await emailService.guiEmail({ den: banTamMoi.email, tenNguoiNhan: banTamMoi.ho_ten, ...emailOtp });
                return { email: banTamMoi.email, registration_resume_token: tokenMoi };
            });
            return { ...result, thong_bao: 'Đã gửi OTP xác minh email mới' };
        } catch (error) {
            if (error.code === '23505' && error.constraint === 'uq_dkcx_email') throw loiXacThuc('Email đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'EMAIL_EXISTS');
            if (error.code === '23505' && error.constraint === 'uq_dkcx_ten_dang_nhap') throw loiXacThuc('Tên đăng nhập đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'USERNAME_EXISTS');
            if (error.code === '23505' && error.constraint === 'uq_dkcx_so_dien_thoai') throw loiXacThuc('Số điện thoại đang được dùng bởi một đăng ký chờ xác minh khác', 409, 'PHONE_EXISTS');
            throw error;
        }
    }
    async xacNhanDangKy({ email, otp }) {
        email = emailHopLe(email);
        otp = otpHopLe(otp);
        const result = await trongGiaoDich(async client => {
            const banTam = await repo.khoaDangKyChoXacMinhTheoEmail(email, client);
            if (!banTam) return null;
            if (new Date(banTam.otp_het_han) <= new Date() || banTam.otp_so_lan_thu >= 5) return null;
            const hashLuu = Buffer.from(String(banTam.otp_bam).trim(), 'hex');
            const hashNhap = Buffer.from(this.bamOtp(banTam.id, 'DANG_KY', otp), 'hex');
            if (!timingSafeEqual(hashLuu, hashNhap)) {
                await repo.tangLanThuOtpDangKy(banTam.id, client);
                return null;
            }
            let taiKhoan;
            try {
                taiKhoan = await taiKhoanRepository.taoTaiKhoanDaXacMinh({
                    email: banTam.email,
                    ho_ten: banTam.ho_ten,
                    ten_dang_nhap: banTam.ten_dang_nhap,
                    so_dien_thoai: banTam.so_dien_thoai,
                    mat_khau_bam: banTam.mat_khau_bam
                }, client);
            } catch (error) {
                if (error.code === '23505' && error.constraint === 'uq_tai_khoan_email') throw loiXacThuc('Email này đã được đăng ký', 409, 'EMAIL_EXISTS');
                if (error.code === '23505' && error.constraint === 'uq_tai_khoan_ten_dang_nhap') throw loiXacThuc('Tên đăng nhập này đã được sử dụng', 409, 'USERNAME_EXISTS');
                if (error.code === '23505' && error.constraint === 'uq_tai_khoan_so_dien_thoai') throw loiXacThuc('Số điện thoại này đã được đăng ký', 409, 'PHONE_EXISTS');
                throw error;
            }
            await repo.xoaDangKyChoXacMinh(banTam.id, client);
            return taiKhoan;
        });
        if (!result) throw this.loiOtp();
        return result;
    }

    async guiLaiOtpDangKy({ email }) {
        email = emailHopLe(email);
        await trongGiaoDich(async client => {
            const banTam = await repo.khoaDangKyChoXacMinhTheoEmail(email, client);
            if (!banTam) return;
            if (new Date(banTam.otp_ngay_gui_cuoi).getTime() + 60000 > Date.now()) {
                throw loiXacThuc('Vui lòng chờ 60 giây trước khi gửi lại', 429, 'OTP_COOLDOWN');
            }
            if (banTam.otp_so_lan_gui >= 10) {
                throw loiXacThuc('Đã đạt giới hạn gửi mã trong 24 giờ', 429, 'OTP_LIMIT');
            }
            const otp = String(randomInt(0, 1000000)).padStart(6, '0');
            const otpHash = this.bamOtp(banTam.id, 'DANG_KY', otp);
            await repo.capNhatOtpDangKyChoXacMinh(banTam.id, otpHash, client);
            const emailOtp = taoEmailOtp({ tenNguoiNhan: banTam.ho_ten, otp, mucDich: 'DANG_KY' });
            await emailService.guiEmail({ den: banTam.email, tenNguoiNhan: banTam.ho_ten, ...emailOtp });
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
                if (locked.trang_thai === 'DANG_DUNG' && locked.email_da_xac_minh) return { yeu_cau_doi_mat_khau: true };
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
    async doiMatKhauTamNhanVien({ dinh_danh, mat_khau_tam, mat_khau_moi }) {
        const dinhDanh = dinhDanhHopLe(dinh_danh);
        if (typeof mat_khau_tam !== 'string' || mat_khau_tam.length > 128) throw this.loiDangNhap();
        matKhauHopLe(mat_khau_moi);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoan(dinhDanh, client);
            if (!tk) return null;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            if (!locked.bat_buoc_doi_mat_khau || locked.trang_thai !== 'DANG_DUNG' || !locked.email_da_xac_minh || !locked.mat_khau_tam_het_han || new Date(locked.mat_khau_tam_het_han) <= new Date()) return null;
            if (!kiemTraMatKhau(mat_khau_tam, locked.mat_khau_bam) || kiemTraMatKhau(mat_khau_moi, locked.mat_khau_bam)) return null;
            const taiKhoan = await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client, false);
            await repo.thuHoiTatCaPhien(tk.id, 'EMPLOYEE_TEMP_PASSWORD', client);
            return this.taoPhien(taiKhoan, client);
        });
        if (!result) throw this.loiDangNhap();
        return result;
    }
    async quenMatKhau({ email }) {
        email = emailHopLe(email);
        const ketQua = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return 'EMAIL_NOT_FOUND';
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            const dangChoXacMinh = locked?.trang_thai === 'CHO_XAC_MINH' && !locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau;
            const dangHoatDong = locked?.trang_thai === 'DANG_DUNG' && locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau;
            if (!dangChoXacMinh && !dangHoatDong) return 'ACCOUNT_NOT_READY';
            await this.guiOtp(client, locked, 'DAT_LAI_MAT_KHAU');
            return 'SENT';
        });
        if (ketQua === 'EMAIL_NOT_FOUND') throw loiXacThuc('Email chưa được đăng ký', 404, 'ACCOUNT_NOT_FOUND');
        if (ketQua === 'ACCOUNT_NOT_READY') throw loiXacThuc('Tài khoản chưa xác minh email', 409, 'ACCOUNT_NOT_READY');
        return { thong_bao: 'OTP đã được gửi đến email. Vui lòng kiểm tra email!' };
    }

    async datLaiMatKhau({ email, otp, mat_khau_moi }) {
        email = emailHopLe(email);
        otp = otpHopLe(otp);
        matKhauHopLe(mat_khau_moi);
        const result = await trongGiaoDich(async client => {
            const tk = await repo.timTaiKhoanTheoEmail(email, client);
            if (!tk) return false;
            const locked = await repo.khoaTaiKhoan(tk.id, client);
            const dangChoXacMinh = locked.trang_thai === 'CHO_XAC_MINH' && !locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau;
            const dangHoatDong = locked.trang_thai === 'DANG_DUNG' && locked.email_da_xac_minh && !locked.bat_buoc_doi_mat_khau;
            if (!dangChoXacMinh && !dangHoatDong) return false;
            if (!await this.kiemTraOtp(client, locked, 'DAT_LAI_MAT_KHAU', otp)) return false;
            await repo.capNhatMatKhau(tk.id, bamMatKhau(mat_khau_moi), client, dangChoXacMinh);
            if (dangChoXacMinh) await repo.huyOtpCu(tk.id, 'DANG_KY', client);
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
    async lamMoiPhien({ refresh_token, access_token } = {}) {
        const ketQua = await trongGiaoDich(async client => {
            let phien = null;
            let refreshToken = null;
            if (tokenService.refreshTokenHopLe(refresh_token)) {
                phien = await repo.layPhienTheoRefresh(tokenService.bamRefreshToken(refresh_token), client);
                if (phien) refreshToken = refresh_token;
            }
            if (!phien && access_token) {
                const auth = await tokenService.xacMinhAccessTokenChoLamMoi(access_token);
                phien = await repo.layPhienTheoId(auth.phienId, auth.taiKhoanId, client);
                if (!phien || Number(phien.phien_ban_xac_thuc) !== auth.phienBan) return null;
                refreshToken = tokenService.taoRefreshToken();
                const capNhat = await repo.capNhatRefreshTokenTheoId(phien.id, tokenService.bamRefreshToken(refreshToken), client);
                if (!capNhat) return null;
            }
            if (!phien || !refreshToken) return null;
            const accessToken = await tokenService.taoAccessToken({ taiKhoanId: phien.tai_khoan_id, phienId: phien.id, phienBan: phien.phien_ban_xac_thuc });
            const thongTin = await xacThucContext.taoNguCanhDangNhap({ taiKhoanId: phien.tai_khoan_id, donViId: phien.don_vi_dang_chon_id, chiNhanhId: phien.chi_nhanh_dang_chon_id }, client);
            return {
                access_token: accessToken, refresh_token: refreshToken, token_type: 'Bearer',
                expires_in: tokenService.ACCESS_TOKEN_TTL, refresh_token_expires_at: new Date(Date.now() + tokenService.REFRESH_TOKEN_TTL_MINUTES * 60000).toISOString(), ...thongTin
            };
        });
        if (!ketQua) throw loiXacThuc('Phiên đăng nhập FE đã hết hạn hoặc không còn hợp lệ', 401, 'SESSION_EXPIRED');
        return ketQua;
    }
    async ghiNhanHoatDong(auth) {
        const phien = await repo.ghiNhanHoatDong(auth.phienId, tokenService.FE_SESSION_TTL_MINUTES);
        if (!phien) throw loiXacThuc('Phiên đăng nhập không còn hợp lệ', 401, 'SESSION_EXPIRED');
        return { trang_thai: 'ok' };
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

    async taoNhanVienBoiAdmin(auth, body, requestId, kiemTraChi = false) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw loiXacThuc('Dữ liệu tạo nhân viên không hợp lệ');
        const payload = Object.fromEntries(Object.entries(body).map(([key, value]) => [key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase()), value]));
        const allowedFields = ['email', 'tenDangNhap', 'maNhanVien', 'hoTen', 'chiNhanhId', 'ngaySinh', 'gioiTinh', 'quocTich', 'danToc', 'quocGia', 'tinhThanh', 'xaPhuong', 'moTa', 'diaChi', 'loaiTaiKhoan', 'active', 'ngayVaoLam', 'chucDanh', 'emailCongViec', 'soDienThoaiCongViec', 'cccdSo', 'cccdNgayCap', 'cccdNoiCap', 'lienHeKhanCapHoTen', 'lienHeKhanCapQuanHe', 'lienHeKhanCapSoDienThoai', 'lienHeKhanCapDiaChi', 'trinhDoHocVan', 'chuyenNganh', 'truong', 'chungChi', 'ngoaiNgu', 'kyNang'];
        const truongKhongHopLe = Object.keys(payload).filter(key => !allowedFields.includes(key));
        const loiNhapLieu = truongKhongHopLe.map(field => ({ field, message: `Trường ${field} không được phép` }));
        const kiemTraTruong = (field, callback, fallback) => {
            try { return callback(); }
            catch (error) { loiNhapLieu.push({ field, message: error.message }); return fallback; }
        };
        const email = kiemTraTruong('email', () => emailHopLe(payload.email), '');
        const tenDangNhap = kiemTraTruong('tenDangNhap', () => tenDangNhapHopLe(payload.tenDangNhap), '');
        const maNhanVien = kiemTraTruong('maNhanVien', () => maNhanVienHopLe(payload.maNhanVien), '');
        const hoTen = typeof payload.hoTen === 'string' ? payload.hoTen.trim().replace(/\s+/g, ' ') : '';
        if (hoTen.length < 2 || hoTen.length > 200) loiNhapLieu.push({ field: 'hoTen', message: 'Họ tên phải có từ 2 đến 200 ký tự' });
        const chiNhanhId = kiemTraTruong('chiNhanhId', () => this.idHopLe(payload.chiNhanhId, 'Chi nhánh'), 0);
        const chiKiemTra = kiemTraChi === true;
        const optionalText = (value, label, maxLength, field) => {
            if (value == null || value === '') return null;
            if (typeof value !== 'string') {
                const error = loiTruong(field, `${label} không hợp lệ`);
                if (!chiKiemTra) throw error;
                loiNhapLieu.push(...error.details);
                return null;
            }
            const text = value.trim().replace(/\s+/g, ' ');
            if (text.length > maxLength) {
                const error = loiTruong(field, `${label} không được vượt quá ${maxLength} ký tự`);
                if (!chiKiemTra) throw error;
                loiNhapLieu.push(...error.details);
                return null;
            }
            return text || null;
        };
        const loiTruong = (field, message) => loiXacThuc(message, 422, 'INVALID_INPUT', [{ field, message }]);
        let ngaySinh = optionalText(payload.ngaySinh, 'Ngày sinh', 10, 'ngaySinh');
        if (ngaySinh && !/^\d{4}-\d{2}-\d{2}$/.test(ngaySinh)) {
            const error = loiTruong('ngaySinh', 'Ngày sinh phải có định dạng yyyy-mm-dd');
            if (!chiKiemTra) throw error;
            loiNhapLieu.push(...error.details);
            ngaySinh = null;
        }
        if (ngaySinh) {
            const parsedDate = new Date(`${ngaySinh}T00:00:00.000Z`);
            if (Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== ngaySinh || ngaySinh > new Date().toISOString().slice(0, 10)) {
                const error = loiTruong('ngaySinh', 'Ngày sinh không hợp lệ');
                if (!chiKiemTra) throw error;
                loiNhapLieu.push(...error.details);
                ngaySinh = null;
            }
        }
        const gioiTinh = optionalText(payload.gioiTinh, 'Giới tính', 20, 'gioiTinh');
        if (gioiTinh && !['NAM', 'NU', 'KHAC', 'KHONG_TIET_LO'].includes(gioiTinh)) {
            const error = loiTruong('gioiTinh', 'Giới tính không hợp lệ');
            if (!chiKiemTra) throw error;
            loiNhapLieu.push(...error.details);
        }
        const quocTich = optionalText(payload.quocTich, 'Quốc tịch', 100, 'quocTich');
        const danToc = optionalText(payload.danToc, 'Dân tộc', 100, 'danToc');
        const quocGia = optionalText(payload.quocGia, 'Quốc gia', 100, 'quocGia');
        const tinhThanh = optionalText(payload.tinhThanh, 'Tỉnh/thành', 150, 'tinhThanh');
        const xaPhuong = optionalText(payload.xaPhuong, 'Xã/phường', 150, 'xaPhuong');
        const moTa = optionalText(payload.moTa, 'Mô tả', 2000, 'moTa');
        const diaChi = optionalText(payload.diaChi, 'Địa chỉ', 300, 'diaChi');
        const profileFields = ['ngayVaoLam', 'chucDanh', 'emailCongViec', 'soDienThoaiCongViec', 'cccdSo', 'cccdNgayCap', 'cccdNoiCap', 'lienHeKhanCapHoTen', 'lienHeKhanCapQuanHe', 'lienHeKhanCapSoDienThoai', 'lienHeKhanCapDiaChi', 'trinhDoHocVan', 'chuyenNganh', 'truong', 'chungChi', 'ngoaiNgu', 'kyNang'];
        const employeeProfileInput = Object.fromEntries(profileFields.filter(field => payload[field] !== undefined).map(field => [field, payload[field]]));
        let employeeProfile = {};
        try { employeeProfile = Object.keys(employeeProfileInput).length ? nhanVienValidation.capNhatHopLe(employeeProfileInput) : {}; }
        catch (error) {
            if (!chiKiemTra) throw error;
            const field = profileFields.find(name => error.message?.toLowerCase().includes(name.toLowerCase())) || 'ngayVaoLam';
            loiNhapLieu.push(...(error.details?.length ? error.details : [{ field, message: error.message }]));
        }
        let loaiTaiKhoan = payload.loaiTaiKhoan ?? 'NHAN_VIEN';
        if (!['NHAN_VIEN', 'QUAN_TRI'].includes(loaiTaiKhoan)) {
            const error = loiXacThuc('Loại tài khoản không hợp lệ', 422, 'INVALID_INPUT', [{ field: 'loaiTaiKhoan', message: 'Loại tài khoản không hợp lệ' }]);
            if (!chiKiemTra) throw error;
            loiNhapLieu.push(...error.details);
            loaiTaiKhoan = 'NHAN_VIEN';
        }
        let active = payload.active ?? true;
        if (payload.active !== undefined && typeof payload.active !== 'boolean') {
            const error = loiXacThuc('Trạng thái hoạt động không hợp lệ', 422, 'INVALID_INPUT', [{ field: 'active', message: 'Trạng thái hoạt động không hợp lệ' }]);
            if (!chiKiemTra) throw error;
            loiNhapLieu.push(...error.details);
            active = true;
        }
        if (!auth.donViId) throw loiXacThuc('Chưa chọn đơn vị làm việc', 403, 'FORBIDDEN');
        const matKhauTam = `Aq7!${randomBytes(18).toString('base64url')}`;
        const result = await trongGiaoDich(async client => {
            if (!await repo.coQuyenQuanLyNhanVien(auth.taiKhoanId, auth.donViId, client)) throw loiXacThuc('Không có quyền tạo nhân viên', 403, 'FORBIDDEN');
            if (loaiTaiKhoan === 'QUAN_TRI' && !await phanQuyenService.kiemTraQuyen(auth, 'roles.manage', {}, client)) throw loiXacThuc('Không có quyền tạo tài khoản quản trị viên', 403, 'FORBIDDEN');
            const loiTrungLap = [...loiNhapLieu];
            let coTrungLap = false;
            if (chiNhanhId > 0 && !await repo.chiNhanhDangHoatDong(auth.donViId, chiNhanhId, client)) loiTrungLap.push({ field: 'chiNhanhId', message: 'Chi nhánh không tồn tại hoặc không hoạt động' });
            const emailTim = typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
            const tenDangNhapTim = typeof payload.tenDangNhap === 'string' ? payload.tenDangNhap.trim().toLowerCase() : '';
            const maNhanVienTim = typeof payload.maNhanVien === 'string' ? payload.maNhanVien.trim().toLowerCase() : '';
            if (emailTim && await repo.timTaiKhoanTheoEmail(emailTim, client)) { loiTrungLap.push({ field: 'email', message: 'Email này đã được đăng ký' }); coTrungLap = true; }
            if (tenDangNhapTim && await repo.timTaiKhoanTheoTenDangNhap(tenDangNhapTim, client)) { loiTrungLap.push({ field: 'tenDangNhap', message: 'Tên đăng nhập này đã được sử dụng' }); coTrungLap = true; }
            if (maNhanVienTim && await repo.timThanhVienTheoMaNhanVien(auth.donViId, maNhanVienTim, client)) { loiTrungLap.push({ field: 'maNhanVien', message: 'Mã nhân viên đã tồn tại trong đơn vị' }); coTrungLap = true; }
            if (loiTrungLap.length) {
                const loiKhongTrung = [...new Map(loiTrungLap.map(item => [`${item.field}:${item.message}`, item])).values()];
                const coLoiChiNhanh = loiKhongTrung.some(item => item.field === 'chiNhanhId');
                throw loiXacThuc(loiKhongTrung.map(item => item.message).join('. '), coTrungLap ? 409 : 422, coTrungLap ? 'DUPLICATE' : coLoiChiNhanh ? 'BRANCH_NOT_FOUND' : 'INVALID_INPUT', loiKhongTrung);
            }
            if (chiKiemTra) return { da_kiem_tra: true };
            let account;
            try {
                account = await repo.taoTaiKhoanNhanVien({ email, hoTen, tenDangNhap, matKhauBam: bamMatKhau(matKhauTam), donViId: auth.donViId, ngaySinh, gioiTinh, quocTich, danToc, moTa, diaChi, quocGia, tinhThanh, xaPhuong }, client);
            } catch (error) {
                if (error.code === '23505' && error.constraint === 'uq_tai_khoan_email') throw loiXacThuc('Email này đã được đăng ký', 409, 'EMAIL_EXISTS', [{ field: 'email', message: 'Email này đã được đăng ký' }]);
                if (error.code === '23505' && error.constraint === 'uq_tai_khoan_ten_dang_nhap') throw loiXacThuc('Tên đăng nhập này đã được sử dụng', 409, 'USERNAME_EXISTS', [{ field: 'tenDangNhap', message: 'Tên đăng nhập này đã được sử dụng' }]);
                throw error;
            }
            let member;
            try {
                member = await repo.taoThanhVien({ donViId: auth.donViId, taiKhoanId: account.id, maNhanVien, email, chucDanh: employeeProfile.chucDanh, emailCongViec: employeeProfile.emailCongViec, soDienThoaiCongViec: employeeProfile.soDienThoaiCongViec, nguoiTaoId: auth.taiKhoanId, trangThai: active ? 'CHO_MOI' : 'TAM_KHOA', ngayVaoLam: employeeProfile.ngayVaoLam }, client);
            } catch (error) {
                if (error.code === '23505') throw loiXacThuc('Mã nhân viên đã tồn tại trong đơn vị', 409, 'EMPLOYEE_CODE_EXISTS', [{ field: 'maNhanVien', message: 'Mã nhân viên đã tồn tại trong đơn vị' }]);
                throw error;
            }
            await repo.taoHoSoNhanVien({ donViId: auth.donViId, thanhVienId: member.id, actorId: auth.taiKhoanId, duLieu: employeeProfile }, client);
            await repo.taoPhanCongChiNhanh(auth.donViId, member.id, chiNhanhId, auth.taiKhoanId, client);
            if (!await repo.ganVaiTroNhanVien(auth.donViId, member.id, loaiTaiKhoan, client)) throw loiXacThuc(`Đơn vị chưa có vai trò ${loaiTaiKhoan}`, 409, 'ROLE_NOT_READY');
            await repo.ghiAuditNhanVien({ donViId: auth.donViId, actorId: auth.taiKhoanId, targetId: account.id, requestId, hanhDong: 'account.employee.create' }, client);
            const loginUrl = process.env.PUBLIC_LOGIN_URL;
            if (!/^https?:\/\//.test(loginUrl ?? '')) throw new Error('Chưa cấu hình PUBLIC_LOGIN_URL');
            const donViThuongHieu = await repo.layThuongHieuDonVi(auth.donViId, client);
            const invitationEmail = taoEmailMoiNhanVien({ tenNguoiNhan: hoTen, tenDangNhap, matKhauTam, linkDangNhap: loginUrl, thuongHieu: docCauHinhThuongHieu(donViThuongHieu) });
            await emailService.guiEmail({ den: email, tenNguoiNhan: hoTen, ...invitationEmail });
            return { id: account.id, email, tenDangNhap, maNhanVien, loaiTaiKhoan, trangThai: active ? 'CHO_XAC_MINH' : 'TAM_KHOA', thanhVienId: member.id };
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
            const donViThuongHieu = await repo.layThuongHieuDonVi(auth.donViId, client);
            const emailMoiNhanVien = taoEmailMoiNhanVien({
                tenNguoiNhan: tk.ho_ten, tenDangNhap: tk.ten_dang_nhap,
                matKhauTam, linkDangNhap: process.env.PUBLIC_LOGIN_URL, guiLai: true, thuongHieu: docCauHinhThuongHieu(donViThuongHieu)
            });
            await emailService.guiEmail({ den: tk.email, tenNguoiNhan: tk.ho_ten, ...emailMoiNhanVien });
            return { thong_bao: 'Đã gửi lại lời mời và vô hiệu mật khẩu tạm cũ' };
        });
    }
    async taoMatKhauTamNhanVien(auth, thanhVienId, requestId, client = null, hanhDong = 'account.employee.password.reset') {
        const thucThi = async tx => {
            if (!auth.donViId || !await repo.coQuyenQuanLyNhanVien(auth.taiKhoanId, auth.donViId, tx)) throw loiXacThuc('Không có quyền', 403, 'FORBIDDEN');
            const tk = await repo.layNhanVienDangLam(thanhVienId, auth.donViId, tx);
            if (!tk) throw loiXacThuc('Nhân viên hoặc email chưa xác minh', 409, 'EMPLOYEE_NOT_READY');
            const loginUrl = process.env.PUBLIC_LOGIN_URL;
            if (!/^https?:\/\//.test(loginUrl ?? '')) throw new Error('Chưa cấu hình PUBLIC_LOGIN_URL');
            const matKhauTam = `Aq7!${randomBytes(18).toString('base64url')}`;
            if (!await repo.datMatKhauTamNhanVienDangHoatDong(tk.id, bamMatKhau(matKhauTam), tx)) throw loiXacThuc('Không thể đặt mật khẩu tạm cho tài khoản này', 409, 'ACCOUNT_NOT_READY');
            await repo.huyOtpCu(tk.id, 'KICH_HOAT_NHAN_VIEN', tx);
            await repo.thuHoiTatCaPhien(tk.id, 'EMPLOYEE_TEMP_PASSWORD', tx);
            await repo.ghiAuditNhanVien({ donViId: auth.donViId, actorId: auth.taiKhoanId, targetId: tk.id, requestId, hanhDong }, tx);
            const donViThuongHieu = await repo.layThuongHieuDonVi(auth.donViId, tx);
            const email = taoEmailMoiNhanVien({ tenNguoiNhan: tk.ho_ten, tenDangNhap: tk.ten_dang_nhap, matKhauTam, linkDangNhap: loginUrl, guiLai: true, khongCanOtp: true, thuongHieu: docCauHinhThuongHieu(donViThuongHieu) });
            await emailService.guiEmail({ den: tk.email, tenNguoiNhan: tk.ho_ten, ...email });
            return { thong_bao: 'Đã gửi mật khẩu tạm mới qua email nhân viên' };
        };
        return client ? thucThi(client) : trongGiaoDich(thucThi);
    }
}

module.exports = new XacThucService();
