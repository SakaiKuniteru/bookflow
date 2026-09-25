const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const { capNhatDonViHopLe, donViMoiHopLe } = require('./don-vi.validation.js');
const repo = require('./don-vi.repository.js');

function loi(message, status = 403, code = 'FORBIDDEN') {
    return new AppError({ code, message, status });
}

class DonViService {
    async taoDonVi(auth, body, requestId) {
        const duLieu = donViMoiHopLe(body);
        if (!auth?.taiKhoanId || !auth?.phienId) throw loi('Vui lòng đăng nhập', 401, 'UNAUTHORIZED');
        return trongGiaoDich(async client => {
            const taiKhoan = await repo.layTaiKhoanDuDieuKien(auth.taiKhoanId, client);
            if (!taiKhoan) throw loi('Tài khoản chưa đủ điều kiện tạo đơn vị');
            const phep = await repo.khoaPhepTaoDonVi(taiKhoan.id, client);
            if (!phep) throw loi('Tài khoản chưa được phê duyệt tạo đơn vị hoặc lượt phê duyệt đã hết hạn');
            let donVi;
            try { donVi = await repo.taoDonViDb(duLieu, client); }
            catch (error) {
                if (error.code === '23505') throw loi('Mã đơn vị đã tồn tại', 409, 'UNIT_EXISTS');
                throw error;
            }
            const vaiTro = await repo.taoVaiTroMacDinh(donVi.id, taiKhoan.id, client);
            const quanTri = vaiTro.find(item => item.ma_vai_tro === 'QUAN_TRI');
            if (!quanTri || vaiTro.length !== 3) throw loi('Không thể khởi tạo vai trò mặc định', 409, 'ROLE_NOT_READY');
            const soQuyen = await repo.ganQuyenQuanTri(donVi.id, quanTri.id, taiKhoan.id, client);
            if (soQuyen !== 4) throw loi('Chưa có đủ các quyền quản trị mặc định', 409, 'PERMISSION_NOT_READY');
            const thanhVien = await repo.taoThanhVienSangLap(donVi.id, taiKhoan, client);
            await repo.ganVaiTroSangLap(donVi.id, thanhVien.id, quanTri.id, taiKhoan.id, client);
            if (!await repo.suDungPhepTaoDonVi(phep.id, donVi.id, client)) throw loi('Lượt phê duyệt không còn hiệu lực');
            if (!await repo.chonDonViChoPhien(auth.phienId, taiKhoan.id, donVi.id, client)) throw loi('Phiên đăng nhập không còn hợp lệ', 401, 'SESSION_EXPIRED');
            await repo.ghiNhatKyDonVi({ donViId: donVi.id, actorId: taiKhoan.id, hanhDong: 'tenant.create', requestId }, client);
            return { ...donVi, don_vi_dang_chon_id: donVi.id };
        });
    }

    async danhSachDonVi(auth) {
        if (!auth?.taiKhoanId) throw loi('Vui lòng đăng nhập', 401, 'UNAUTHORIZED');
        return {
            don_vi: await repo.danhSachDonViTheoTaiKhoan(auth.taiKhoanId),
            don_vi_dang_chon_id: auth.donViId ?? null
        };
    }

    async donViHienTai(auth) {
        if (!auth?.taiKhoanId || !auth?.donViId) throw loi('Vui lòng chọn đơn vị làm việc', 403, 'TENANT_REQUIRED');
        const donVi = await repo.layDonViHienTai(auth.taiKhoanId, auth.donViId);
        if (!donVi) throw loi('Không có quyền truy cập đơn vị này');
        return donVi;
    }

    async capNhatDonVi(auth, body, requestId) {
        const duLieu = capNhatDonViHopLe(body);
        if (!auth?.taiKhoanId || !auth?.donViId) throw loi('Vui lòng chọn đơn vị làm việc', 403, 'TENANT_REQUIRED');
        return trongGiaoDich(async client => {
            if (!await repo.khoaDonVi(auth.donViId, client)) throw loi('Đơn vị không hoạt động', 409, 'UNIT_INACTIVE');
            if (!await phanQuyenService.kiemTraQuyen(auth, 'units.manage', {}, client)) throw loi('Không có quyền cập nhật đơn vị');
            const donVi = await repo.capNhatDonViDb(auth.donViId, duLieu, client);
            if (!donVi) throw loi('Không tìm thấy đơn vị', 404, 'NOT_FOUND');
            await repo.ghiNhatKyDonVi({ donViId: donVi.id, actorId: auth.taiKhoanId, hanhDong: 'tenant.update', requestId }, client);
            return donVi;
        });
    }
}

module.exports = new DonViService();