const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./khach-hang.validation.js');
const repo = require('./khach-hang.repository.js');
const { randomBytes } = require("node:crypto");
const { AppError } = require("../../common/errors/AppError.js");
const { bamMatKhau } = require("../../common/security/mat-khau.js");
const emailService = require("../../integrations/email-client.js");
const { taoEmailMoiNhanVien } = require("../../integrations/email-template.js");
const xacThucRepo = require("../xac-thuc/xac-thuc.repository.js");
const { docCauHinhThuongHieu } = require("../../config/environment.js");
class KhachHangService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Vui lòng chọn đơn vị làm việc',403,'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth,ghi ? 'customers.manage' : 'customers.read',{},client)) throw v.loi('Không có quyền truy cập khách hàng',403,'FORBIDDEN');
    }
    async lay(auth, id, client, khoa = false) {
        const khachHang = await repo.lay(auth.donViId,v.idHopLe(id,'Khách hàng'),client,khoa);
        if (!khachHang) throw v.loi('Không tìm thấy khách hàng',404,'NOT_FOUND');
        return khachHang;
    }
    async duLieuTaoMoi(auth, body, client) {
        const { data, details } = v.kiemTraKhachHangMoi(body);
        const loi = [...details];
        let coTrung = false;
        if (data.email && await repo.emailTaiKhoanDaTonTai(data.email, client)) { loi.push({ field: "email", message: "Email này đã được đăng ký" }); coTrung = true; }
        if (data.ten_dang_nhap && await repo.tenDangNhapDaTonTai(data.ten_dang_nhap, client)) { loi.push({ field: "ten_dang_nhap", message: "Tên đăng nhập này đã được sử dụng" }); coTrung = true; }
        if (data.so_dien_thoai && await this.soDienThoaiDaTonTai(auth, data.so_dien_thoai, client)) { loi.push({ field: "so_dien_thoai", message: "Số điện thoại này đã được đăng ký" }); coTrung = true; }
        const detailsUnique = [...new Map(loi.map(item => [`${item.field}:${item.message}`, item])).values()];
        if (detailsUnique.length) throw new AppError({ code: coTrung ? "DUPLICATE" : "INVALID_INPUT", message: detailsUnique.map(item => item.message).join(". "), status: coTrung ? 409 : 422, details: detailsUnique });
        return data;
    }
    async soDienThoaiDaTonTai(auth, soDienThoai, client, { taiKhoanId = null, khachHangId = null } = {}) {
        if (!soDienThoai) return false;
        const trungTaiKhoan = await repo.soDienThoaiTaiKhoanDaTonTai(soDienThoai, client, taiKhoanId);
        if (trungTaiKhoan) return true;
        return repo.soDienThoaiKhachHangDaTonTai(auth.donViId, soDienThoai, client, khachHangId);
    }
    async kiemTraTaoMoi(auth, body) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            await this.duLieuTaoMoi(auth, body, client);
            return { da_kiem_tra: true };
        });
    }
    xuLyLoiDb(error) {
        if (error.code === "23505") {
            const map = { uq_khach_hang_ma: { field: "ma_khach_hang", message: "Mã khách hàng đã tồn tại trong đơn vị" }, uq_tai_khoan_email: { field: "email", message: "Email này đã được đăng ký" }, uq_tai_khoan_ten_dang_nhap: { field: "ten_dang_nhap", message: "Tên đăng nhập này đã được sử dụng" }, uq_tai_khoan_so_dien_thoai: { field: "so_dien_thoai", message: "Số điện thoại này đã được đăng ký" } };
            const detail = map[error.constraint];
            if (detail) throw new AppError({ code: "DUPLICATE", message: detail.message, status: 409, details: [detail] });
            throw v.loi("Dữ liệu duy nhất đã tồn tại", 409, "CUSTOMER_EXISTS");
        }
        if (error.code === "23503") throw v.loi("Dữ liệu tham chiếu không tồn tại hoặc đang được sử dụng", 409, "REFERENCE_CONFLICT");
        if (["23514","22P02","22003"].includes(error.code)) throw v.loi("Dữ liệu vi phạm ràng buộc");
        throw error;
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        return repo.danhSach(auth.donViId,v.boLocHopLe(query));
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const khachHang = await this.lay(auth,id);
        const [diaChi,lienHe,tuongTac] = await Promise.all([repo.diaChi(auth.donViId,khachHang.id),repo.lienHe(auth.donViId,khachHang.id),repo.tuongTac(auth.donViId,khachHang.id)]);
        return { ...khachHang, dia_chi: diaChi, lien_he: lienHe, tuong_tac_gan_day: tuongTac };
    }
    async tao(auth, body, requestId) {
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const data = await this.duLieuTaoMoi(auth, body, client);
                const tienTo = String(process.env.CUSTOMER_CODE_PREFIX || "").trim().toUpperCase();
                if (!/^[A-Z0-9]{1,12}$/.test(tienTo)) throw new Error("CUSTOMER_CODE_PREFIX phải gồm 1–12 chữ hoặc số in hoa");
                data.ma_khach_hang = await repo.taoMaKhachHang(auth.donViId, tienTo, client);
                if (!data.ma_khach_hang) throw v.loi("Bộ đếm mã khách hàng đã đạt giới hạn 999999 trong tháng");
                if (data.nguoi_gioi_thieu_id) await this.lay(auth, data.nguoi_gioi_thieu_id, client);
                const loginUrl = process.env.PUBLIC_LOGIN_URL;
                if (!/^https?:\/\//.test(loginUrl ?? "")) throw new Error("Chưa cấu hình PUBLIC_LOGIN_URL");
                const matKhauTam = `Aq7!${randomBytes(18).toString("base64url")}`;
                const taiKhoan = await repo.taoTaiKhoanKhachHang({ ...data, don_vi_id: auth.donViId, mat_khau_bam: bamMatKhau(matKhauTam) }, client);
                data.tai_khoan_id = taiKhoan.id;
                const khachHang = await repo.tao(auth.donViId, auth.taiKhoanId, data, client);
                await repo.nhatKy(auth.donViId, auth.taiKhoanId, khachHang.id, "customers.create", requestId, client);
                const donViThuongHieu = await xacThucRepo.layThuongHieuDonVi(auth.donViId, client);
                const emailMoi = taoEmailMoiNhanVien({ tenNguoiNhan: data.ho_ten, tenDangNhap: data.ten_dang_nhap, matKhauTam, linkDangNhap: loginUrl, loaiTaiKhoan: "khách hàng", khongCanOtp: true, thuongHieu: docCauHinhThuongHieu(donViThuongHieu) });
                await emailService.guiEmail({ den: data.email, tenNguoiNhan: data.ho_ten, ...emailMoi });
                return { ...khachHang, dia_chi: [], lien_he: [], tuong_tac_gan_day: [] };
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async sua(auth, id, body, requestId) {
        const data = v.suaKhachHangHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth,true,client);
                const khachHang = await this.lay(auth,id,client,true);
                if (data.nguoi_gioi_thieu_id) {
                    if (data.nguoi_gioi_thieu_id === khachHang.id) throw v.loi('Khách hàng không thể tự giới thiệu chính mình');
                    await this.lay(auth,data.nguoi_gioi_thieu_id,client);
                }
                if (data.email && await repo.emailTaiKhoanDaTonTai(data.email,client,khachHang.tai_khoan_id)) throw new AppError({ code: "DUPLICATE", message: "Email này đã được đăng ký", status: 409, details: [{ field: "email", message: "Email này đã được đăng ký" }] });
                if (data.so_dien_thoai && await this.soDienThoaiDaTonTai(auth, data.so_dien_thoai, client, { taiKhoanId: khachHang.tai_khoan_id, khachHangId: khachHang.id })) throw new AppError({ code: "DUPLICATE", message: "Số điện thoại này đã được đăng ký", status: 409, details: [{ field: "so_dien_thoai", message: "Số điện thoại này đã được đăng ký" }] });
                if (khachHang.tai_khoan_id) await repo.suaTaiKhoanKhachHang(khachHang.tai_khoan_id,data,client);
                const duLieuKhachHang = { ...data };
                for (const field of ['quoc_tich','dan_toc','mo_ta','dia_chi_chi_tiet','quoc_gia','tinh_thanh_pho','phuong_xa']) delete duLieuKhachHang[field];
                const ketQua = await repo.sua(auth.donViId,khachHang.id,duLieuKhachHang,client);
                await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.update',requestId,client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async kiemTraSua(auth, id, body) {
        const data = v.suaKhachHangHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const khachHang = await this.lay(auth, id, client);
            if (data.nguoi_gioi_thieu_id) {
                if (data.nguoi_gioi_thieu_id === khachHang.id) throw new AppError({ code: "INVALID_INPUT", message: "Khách hàng không thể tự giới thiệu chính mình", status: 422, details: [{ field: "nguoi_gioi_thieu_id", message: "Khách hàng không thể tự giới thiệu chính mình" }] });
                await this.lay(auth, data.nguoi_gioi_thieu_id, client);
            }
            if (data.email && await repo.emailTaiKhoanDaTonTai(data.email,client,khachHang.tai_khoan_id)) throw new AppError({ code: "DUPLICATE", message: "Email này đã được đăng ký", status: 409, details: [{ field: "email", message: "Email này đã được đăng ký" }] });
            if (data.so_dien_thoai && await this.soDienThoaiDaTonTai(auth, data.so_dien_thoai, client, { taiKhoanId: khachHang.tai_khoan_id, khachHangId: khachHang.id })) throw new AppError({ code: "DUPLICATE", message: "Số điện thoại này đã được đăng ký", status: 409, details: [{ field: "so_dien_thoai", message: "Số điện thoại này đã được đăng ký" }] });
            return { da_kiem_tra: true };
        });
    }
    async doiTrangThai(auth, id, body, requestId) {
        v.truongHopLe(body,['trang_thai'],['trang_thai']);
        if (!['HOAT_DONG','TAM_KHOA','NGUNG_HOAT_DONG'].includes(body.trang_thai)) throw v.loi('Trạng thái không hợp lệ');
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.trangThai(auth.donViId,khachHang.id,body.trang_thai,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.status',requestId,client);
            return ketQua;
        });
    }
    async resetMatKhau(auth, id, requestId) {
        const loginUrl = process.env.PUBLIC_LOGIN_URL;
        if (!/^https?:\/\//.test(loginUrl ?? "")) throw new Error("Chưa cấu hình PUBLIC_LOGIN_URL");
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const taiKhoan = await repo.layTaiKhoanDeResetMatKhau(auth.donViId,khachHang.id,client);
            if (!taiKhoan) throw v.loi("Tài khoản khách hàng chưa được xác minh hoặc không còn hoạt động",409,"ACCOUNT_NOT_READY");
            const matKhauTam = `Aq7!${randomBytes(18).toString("base64url")}`;
            const daDatLai = await xacThucRepo.datMatKhauTamNhanVienDangHoatDong(taiKhoan.id,bamMatKhau(matKhauTam),client);
            if (!daDatLai) throw v.loi("Không thể đặt mật khẩu tạm cho tài khoản này",409,"ACCOUNT_NOT_READY");
            await xacThucRepo.thuHoiTatCaPhien(taiKhoan.id,"CUSTOMER_TEMP_PASSWORD",client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,"customers.password.reset",requestId,client);
            const donViThuongHieu = await xacThucRepo.layThuongHieuDonVi(auth.donViId,client);
            const emailMoi = taoEmailMoiNhanVien({ tenNguoiNhan: taiKhoan.ho_ten, tenDangNhap: taiKhoan.ten_dang_nhap, matKhauTam, linkDangNhap: loginUrl, loaiTaiKhoan: "khách hàng", guiLai: true, khongCanOtp: true, thuongHieu: docCauHinhThuongHieu(donViThuongHieu) });
            await emailService.guiEmail({ den: taiKhoan.email, tenNguoiNhan: taiKhoan.ho_ten, ...emailMoi });
            return { thong_bao: "Đã gửi mật khẩu tạm mới qua email khách hàng" };
        });
    }
    async taoDiaChi(auth, id, body, requestId) {
        const data = v.diaChiHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            if (data.mac_dinh) await repo.boMacDinhDiaChi(auth.donViId,khachHang.id,data.loai_dia_chi ?? 'GIAO_HANG',client);
            const ketQua = await repo.taoDiaChi(auth.donViId,khachHang.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.create',requestId,client);
            return ketQua;
        });
    }
    async suaDiaChi(auth, id, diaChiId, body, requestId) {
        const data = v.diaChiHopLe(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const diaChi = await repo.layDiaChi(auth.donViId,khachHang.id,v.idHopLe(diaChiId,'Địa chỉ'),client);
            if (!diaChi) throw v.loi('Không tìm thấy địa chỉ',404,'NOT_FOUND');
            if (data.mac_dinh) await repo.boMacDinhDiaChi(auth.donViId,khachHang.id,data.loai_dia_chi ?? diaChi.loai_dia_chi,client);
            const ketQua = await repo.suaDiaChi(auth.donViId,khachHang.id,diaChi.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.update',requestId,client);
            return ketQua;
        });
    }
    async xoaDiaChi(auth, id, diaChiId, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.xoaDiaChi(auth.donViId,khachHang.id,v.idHopLe(diaChiId,'Địa chỉ'),client);
            if (!ketQua) throw v.loi('Không tìm thấy địa chỉ',404,'NOT_FOUND');
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.address.delete',requestId,client);
            return { id: ketQua.id, da_xoa: true };
        });
    }
    async taoLienHe(auth, id, body, requestId) {
        const data = v.lienHeHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            if (data.la_lien_he_chinh) await repo.boLienHeChinh(auth.donViId,khachHang.id,client);
            const ketQua = await repo.taoLienHe(auth.donViId,khachHang.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.create',requestId,client);
            return ketQua;
        });
    }
    async suaLienHe(auth, id, lienHeId, body, requestId) {
        const data = v.lienHeHopLe(body,true);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const lienHe = await repo.layLienHe(auth.donViId,khachHang.id,v.idHopLe(lienHeId,'Người liên hệ'),client);
            if (!lienHe) throw v.loi('Không tìm thấy người liên hệ',404,'NOT_FOUND');
            if (data.la_lien_he_chinh) await repo.boLienHeChinh(auth.donViId,khachHang.id,client);
            const ketQua = await repo.suaLienHe(auth.donViId,khachHang.id,lienHe.id,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.update',requestId,client);
            return ketQua;
        });
    }
    async xoaLienHe(auth, id, lienHeId, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.xoaLienHe(auth.donViId,khachHang.id,v.idHopLe(lienHeId,'Người liên hệ'),client);
            if (!ketQua) throw v.loi('Không tìm thấy người liên hệ',404,'NOT_FOUND');
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.contact.delete',requestId,client);
            return { id: ketQua.id, da_xoa: true };
        });
    }
    async taoTuongTac(auth, id, body, requestId) {
        const data = v.tuongTacHopLe(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth,true,client);
            const khachHang = await this.lay(auth,id,client,true);
            const ketQua = await repo.taoTuongTac(auth.donViId,khachHang.id,auth.taiKhoanId,data,client);
            await repo.nhatKy(auth.donViId,auth.taiKhoanId,khachHang.id,'customers.interaction.create',requestId,client);
            return ketQua;
        });
    }
    async lichSuGiaoDich(auth, id) {
        await this.quyen(auth);
        const khachHang = await this.lay(auth,id);
        return { khach_hang_id: khachHang.id, ...(await repo.giaoDich(auth.donViId,khachHang.id)) };
    }
}
module.exports = new KhachHangService();
