const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./chuyen-kho.validation.js');
const repo = require('./chuyen-kho.repository.js');
class ChuyenKhoService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Chưa chọn đơn vị', 403, 'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth, ghi ? 'books.create' : 'books.read', {}, client)) throw v.loi('Không có quyền điều chuyển kho', 403, 'FORBIDDEN');
    }
    async phieu(auth, id, client, khoa = false) {
        const row = await repo.phieu(auth.donViId, v.id(id, 'Phiếu chuyển kho'), client, khoa);
        if (!row) throw v.loi('Không tìm thấy phiếu chuyển kho', 404, 'NOT_FOUND');
        return row;
    }
    async kiemTraKho(auth, khoId, client) {
        const kho = await repo.kho(auth.donViId, khoId, client);
        if (!kho) throw v.loi('Kho không tồn tại', 404, 'NOT_FOUND');
        if (auth.chiNhanhId && Number(kho.chi_nhanh_id) !== Number(auth.chiNhanhId)) throw v.loi('Kho không thuộc chi nhánh đang chọn', 403, 'BRANCH_FORBIDDEN');
        return kho;
    }
    async kiemTraViTri(auth, khoId, viTriId, client) {
        if (viTriId == null) return;
        const row = await repo.viTri(auth.donViId, viTriId, client);
        if (!row || Number(row.kho_id) !== Number(khoId)) throw v.loi('Vị trí không thuộc kho tương ứng');
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        const loc = v.boLoc(query);
        if (auth.chiNhanhId && !loc.kho_id) throw v.loi('Vui lòng chọn kho khi xem theo chi nhánh');
        if (loc.kho_id) await this.kiemTraKho(auth, loc.kho_id);
        return repo.danhSach(auth.donViId, loc);
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const phieu = await this.phieu(auth, id);
        return { ...phieu, chi_tiet: await repo.chiTiet(auth.donViId, phieu.id) };
    }
    async tao(auth, body, requestId) {
        const data = v.phieu(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            await this.kiemTraKho(auth, data.kho_nguon_id, client);
            const dich = await repo.kho(auth.donViId, data.kho_dich_id, client);
            if (!dich) throw v.loi('Kho đích không tồn tại');
            const phieu = await repo.tao(auth.donViId, auth.taiKhoanId, data, client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.create', requestId, client);
            return phieu;
        });
    }
    async themDong(auth, id, body, requestId) {
        const data = v.chiTiet(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'NHAP') throw v.loi('Chỉ được thêm sách khi phiếu đang nháp', 409, 'INVALID_STATUS');
            await this.kiemTraKho(auth, phieu.kho_nguon_id, client);
            await this.kiemTraViTri(auth, phieu.kho_nguon_id, data.vi_tri_nguon_id, client);
            await this.kiemTraViTri(auth, phieu.kho_dich_id, data.vi_tri_dich_id, client);
            const dong = await repo.themDong(auth.donViId, phieu.id, data, client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.item.create', requestId, client);
            return dong;
        });
    }
    async xoaDong(auth, id, dongId, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'NHAP') throw v.loi('Chỉ được xóa dòng khi phiếu đang nháp', 409, 'INVALID_STATUS');
            await this.kiemTraKho(auth, phieu.kho_nguon_id, client);
            const dong = await repo.xoaDong(auth.donViId, phieu.id, v.id(dongId, 'Dòng chi tiết'), client);
            if (!dong) throw v.loi('Không tìm thấy dòng chi tiết', 404, 'NOT_FOUND');
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.item.delete', requestId, client);
            return { id: dong.id, da_xoa: true };
        });
    }
    async xuat(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'NHAP') throw v.loi('Phiếu không ở trạng thái nháp', 409, 'INVALID_STATUS');
            await this.kiemTraKho(auth, phieu.kho_nguon_id, client);
            const chiTiet = await repo.chiTiet(auth.donViId, phieu.id, client);
            if (!chiTiet.length) throw v.loi('Phiếu chưa có sách');
            const bienDong = [];
            for (const dong of chiTiet) {
                const ton = await repo.ton(auth.donViId, phieu.kho_nguon_id, dong.phien_ban_sach_id, dong.vi_tri_nguon_id, client);
                if (!ton || ton.so_luong_thuc_te - ton.so_luong_giu_cho < dong.so_luong) throw v.loi(`Không đủ tồn khả dụng cho dòng ${dong.id}`, 409, 'INSUFFICIENT_STOCK');
                const sau = ton.so_luong_thuc_te - dong.so_luong;
                await repo.doiTon(ton.id, sau, client);
                bienDong.push(await repo.bienDong(auth.donViId, auth.taiKhoanId, phieu, dong, 'DIEU_CHUYEN_RA', ton.so_luong_thuc_te, sau, client));
            }
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_XUAT', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.dispatch', requestId, client);
            return { ...ketQua, bien_dong_ton_kho: bienDong };
        });
    }
    async nhan(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'DA_XUAT') throw v.loi('Phiếu chưa xuất kho hoặc đã nhận', 409, 'INVALID_STATUS');
            await this.kiemTraKho(auth, phieu.kho_dich_id, client);
            const chiTiet = await repo.chiTiet(auth.donViId, phieu.id, client);
            const bienDong = [];
            for (const dong of chiTiet) {
                await repo.taoTonRong(auth.donViId, phieu.kho_dich_id, dong.phien_ban_sach_id, dong.vi_tri_dich_id, client);
                const ton = await repo.ton(auth.donViId, phieu.kho_dich_id, dong.phien_ban_sach_id, dong.vi_tri_dich_id, client);
                const sau = ton.so_luong_thuc_te + dong.so_luong;
                await repo.doiTon(ton.id, sau, client);
                bienDong.push(await repo.bienDong(auth.donViId, auth.taiKhoanId, phieu, dong, 'DIEU_CHUYEN_VAO', ton.so_luong_thuc_te, sau, client));
            }
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_NHAN', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.receive', requestId, client);
            return { ...ketQua, bien_dong_ton_kho: bienDong };
        });
    }
    async huy(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'NHAP') throw v.loi('Chỉ được hủy phiếu chưa xuất kho', 409, 'INVALID_STATUS');
            await this.kiemTraKho(auth, phieu.kho_nguon_id, client);
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_HUY', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.transfer.cancel', requestId, client);
            return ketQua;
        });
    }
}
module.exports = new ChuyenKhoService();