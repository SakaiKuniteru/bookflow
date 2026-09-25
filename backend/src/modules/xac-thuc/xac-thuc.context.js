const { AppError } = require('../../common/errors/AppError.js');
const repo = require('./xac-thuc.repository.js');
const donViRepository = require('../don-vi/don-vi.repository.js');
const chiNhanhRepository = require('../chi-nhanh/chi-nhanh.repository.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');

class XacThucContextService {
    async taoNguCanhDangNhap({ taiKhoanId, donViId = null, chiNhanhId = null }, client) {
        const taiKhoan = await repo.layTaiKhoanAnToan(taiKhoanId, client);
        if (!taiKhoan) throw new AppError({ code: 'ACCOUNT_INACTIVE', message: 'Tài khoản không còn hoạt động', status: 401 });
        const donViThamGia = await donViRepository.danhSachDonViTheoTaiKhoan(taiKhoanId, client);
        let donVi = null;
        let chiNhanh = null;
        let chiNhanhDuocTruyCap = [];
        let vaiTro = [];
        let quyen = [];
        if (donViId) {
            donVi = await donViRepository.layDonViHienTai(taiKhoanId, donViId, client);
            if (!donVi) throw new AppError({ code: 'TENANT_FORBIDDEN', message: 'Không có quyền truy cập đơn vị đang chọn', status: 403 });
            const auth = { taiKhoanId, donViId };
            const xemTatCa = await phanQuyenService.kiemTraQuyen(auth, 'branches.manage', {}, client);
            chiNhanhDuocTruyCap = await chiNhanhRepository.danhSachChiNhanh(donViId, taiKhoanId, xemTatCa, client);
            vaiTro = await repo.layVaiTroTaiKhoan(taiKhoanId, donViId, client);
            const quyenHieuLuc = await phanQuyenService.quyenCuaToi(auth, client);
            quyen = quyenHieuLuc.quyen;
            if (chiNhanhId) chiNhanh = chiNhanhDuocTruyCap.find(item => item.id === chiNhanhId) ?? null;
        }
        return {
            tai_khoan: taiKhoan, don_vi_tham_gia: donViThamGia,
            don_vi_dang_chon_id: donViId, don_vi: donVi,
            chi_nhanh_dang_chon_id: chiNhanhId, chi_nhanh: chiNhanh,
            chi_nhanh_duoc_truy_cap: chiNhanhDuocTruyCap, vai_tro: vaiTro, quyen
        };
    }
}

module.exports = new XacThucContextService();