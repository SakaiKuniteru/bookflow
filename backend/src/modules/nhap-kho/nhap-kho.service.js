const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./nhap-kho.validation.js');
const repo = require('./nhap-kho.repository.js');
const tonRepo = require('../ton-kho/ton-kho.repository.js');
class NhapKhoService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Chưa chọn đơn vị', 403, 'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth, ghi ? 'books.create' : 'books.read', {}, client)) throw v.loi('Không có quyền nhập kho', 403, 'FORBIDDEN');
    }
    async thamChieu(auth, bang, id, client) {
        const row = await repo.thamChieuTonTai(auth.donViId, bang, id, client);
        if (!row) throw v.loi(`${bang} không tồn tại trong đơn vị`, 422, 'INVALID_REFERENCE');
        return row;
    }
    async kiemTraViTri(auth, khoId, viTriId, client) {
        if (viTriId == null) return;
        const viTri = await this.thamChieu(auth, 'vi_tri_kho', viTriId, client);
        if (Number(viTri.kho_id) !== Number(khoId)) throw v.loi('Vị trí không thuộc kho trên phiếu');
    }
    async phieuTonTai(auth, id, client, khoa = false) {
        const phieu = await repo.layPhieu(auth.donViId, v.idHopLe(id, 'Phiếu nhập'), client, khoa);
        if (!phieu) throw v.loi('Không tìm thấy phiếu nhập', 404, 'NOT_FOUND');
        if (auth.chiNhanhId) {
            const kho = await this.thamChieu(auth, 'kho', phieu.kho_id, client);
            if (Number(kho.chi_nhanh_id) !== Number(auth.chiNhanhId)) throw v.loi('Không có quyền truy cập phiếu thuộc chi nhánh này', 403, 'BRANCH_FORBIDDEN');
        }
        return phieu;
    }
    async dongTonTai(auth, phieuId, dongId, client, khoa = false) {
        const dong = await repo.layDong(auth.donViId, phieuId, v.idHopLe(dongId, 'Dòng chi tiết'), client, khoa);
        if (!dong) throw v.loi('Không tìm thấy dòng chi tiết', 404, 'NOT_FOUND');
        return dong;
    }
    chiChoSua(phieu) {
        if (phieu.trang_thai !== 'NHAP') throw v.loi('Chỉ được sửa phiếu ở trạng thái NHAP', 409, 'INVALID_STATUS');
    }
    xuLyLoi(error) {
        if (error.code === '23505') throw v.loi('Dữ liệu bị trùng hoặc phiếu đã được ghi nhận', 409, 'DUPLICATE_DATA');
        if (error.code === '23503') throw v.loi('Dữ liệu tham chiếu không hợp lệ', 409, 'REFERENCE_CONFLICT');
        if (['23514', '23502', '22003', '22P02'].includes(error.code)) throw v.loi('Dữ liệu vi phạm ràng buộc');
        throw error;
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        const boLoc = v.boLocHopLe(query);
        if (auth.chiNhanhId) boLoc.chi_nhanh_id = Number(auth.chiNhanhId);
        return repo.danhSach(auth.donViId, boLoc);
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const phieu = await this.phieuTonTai(auth, id);
        return { ...phieu, chi_tiet: await repo.layChiTiet(auth.donViId, phieu.id) };
    }
    async tao(auth, body, requestId) {
        const data = v.phieuMoiHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const kho = await this.thamChieu(auth, 'kho', data.kho_id, client);
                if (auth.chiNhanhId && Number(kho.chi_nhanh_id) !== Number(auth.chiNhanhId)) throw v.loi('Kho không thuộc chi nhánh đang chọn', 403, 'BRANCH_FORBIDDEN');
                if (data.nha_cung_cap_id) await this.thamChieu(auth, 'nha_cung_cap', data.nha_cung_cap_id, client);
                const { rows: [ngay] } = await client.query(`SELECT COALESCE($1::date,CURRENT_DATE)::text AS ngay`, [data.ngay_nhap]);
                const soPhieu = await repo.capSoPhieu(auth.donViId, ngay.ngay, client);
                if (!soPhieu) throw v.loi('Đã hết dải số phiếu của năm', 409, 'RECEIPT_NUMBER_EXHAUSTED');
                const phieu = await repo.taoPhieu(auth.donViId, auth.taiKhoanId, soPhieu, data, client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.create', requestId, client);
                return { ...phieu, chi_tiet: [] };
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async sua(auth, id, body, requestId) {
        const data = v.phieuSuaHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                this.chiChoSua(phieu);
                const loai = data.loai_nhap ?? phieu.loai_nhap;
                const nccId = Object.hasOwn(data, 'nha_cung_cap_id') ? data.nha_cung_cap_id : phieu.nha_cung_cap_id;
                if (loai === 'NHA_CUNG_CAP' && !nccId) throw v.loi('Nhập từ nhà cung cấp phải chọn nhà cung cấp');
                if (nccId) await this.thamChieu(auth, 'nha_cung_cap', nccId, client);
                const ketQua = await repo.suaPhieu(auth.donViId, phieu.id, auth.taiKhoanId, data, client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.update', requestId, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async themDong(auth, id, body, requestId) {
        const data = v.chiTietHopLe(body, true);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                this.chiChoSua(phieu);
                await this.thamChieu(auth, 'phien_ban_sach', data.phien_ban_sach_id, client);
                await this.kiemTraViTri(auth, phieu.kho_id, data.vi_tri_kho_id, client);
                const dong = await repo.taoDong(auth.donViId, phieu.id, data, client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.item.create', requestId, client);
                return dong;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async suaDong(auth, id, dongId, body, requestId) {
        const data = v.chiTietHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                this.chiChoSua(phieu);
                await this.dongTonTai(auth, phieu.id, dongId, client, true);
                await this.kiemTraViTri(auth, phieu.kho_id, data.vi_tri_kho_id, client);
                const dong = await repo.suaDong(auth.donViId, phieu.id, v.idHopLe(dongId), data, client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.item.update', requestId, client);
                return dong;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async xoaDong(auth, id, dongId, requestId) {
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                this.chiChoSua(phieu);
                await this.dongTonTai(auth, phieu.id, dongId, client, true);
                const dong = await repo.xoaDong(auth.donViId, phieu.id, v.idHopLe(dongId), client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.item.delete', requestId, client);
                return { id: dong.id, da_xoa: true };
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async batDauKiemNhan(auth, id, requestId) {
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                this.chiChoSua(phieu);
                const chiTiet = await repo.layChiTiet(auth.donViId, phieu.id, client);
                if (!chiTiet.length) throw v.loi('Phiếu chưa có sách để kiểm nhận');
                const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DANG_KIEM_NHAN', client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.inspect.start', requestId, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async kiemNhan(auth, id, dongId, body, requestId) {
        const data = v.kiemNhanHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                if (phieu.trang_thai !== 'DANG_KIEM_NHAN') throw v.loi('Phiếu chưa ở trạng thái kiểm nhận', 409, 'INVALID_STATUS');
                const dong = await this.dongTonTai(auth, phieu.id, dongId, client, true);
                if (data.so_luong_dat + data.so_luong_loi > dong.so_luong_du_kien) throw v.loi('Tổng số lượng kiểm nhận vượt số lượng dự kiến');
                const ketQua = await repo.suaDong(auth.donViId, phieu.id, dong.id, data, client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.inspect.item', requestId, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async xacNhan(auth, id, requestId) {
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                if (phieu.trang_thai !== 'DANG_KIEM_NHAN') throw v.loi('Chỉ xác nhận phiếu đang kiểm nhận', 409, 'INVALID_STATUS');
                const chiTiet = await repo.layChiTiet(auth.donViId, phieu.id, client, true);
                if (!chiTiet.length) throw v.loi('Phiếu chưa có chi tiết');
                if (chiTiet.some(dong => dong.so_luong_dat + dong.so_luong_loi !== dong.so_luong_du_kien)) throw v.loi('Chưa kiểm nhận đủ số lượng tất cả dòng');
                if (!chiTiet.some(dong => dong.so_luong_dat > 0)) throw v.loi('Không có sách đạt kiểm nhận để nhập kho');
                const bienDong = [];
                for (const dong of chiTiet) {
                    const ketQua = await tonRepo.congNhap(auth.donViId, auth.taiKhoanId, phieu, dong, client);
                    if (ketQua) bienDong.push(ketQua.bien_dong);
                }
                const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_XAC_NHAN', client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.confirm', requestId, client);
                return { ...ketQua, chi_tiet: chiTiet, bien_dong_ton_kho: bienDong };
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async huy(auth, id, requestId) {
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                const phieu = await this.phieuTonTai(auth, id, client, true);
                if (!['NHAP', 'DANG_KIEM_NHAN'].includes(phieu.trang_thai)) throw v.loi('Không thể hủy phiếu đã xác nhận hoặc đã hủy', 409, 'INVALID_STATUS');
                const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_HUY', client);
                await repo.ghiNhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.receipt.cancel', requestId, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
}
module.exports = new NhapKhoService();