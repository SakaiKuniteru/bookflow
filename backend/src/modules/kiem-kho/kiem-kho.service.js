const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const v = require('./kiem-kho.validation.js');
const repo = require('./kiem-kho.repository.js');
class KiemKhoService {
    async quyen(auth, ghi = false, client) {
        if (!auth?.donViId) throw v.loi('Chưa chọn đơn vị', 403, 'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth, ghi ? 'books.create' : 'books.read', {}, client)) throw v.loi('Không có quyền kiểm kho', 403, 'FORBIDDEN');
    }
    async kho(auth, khoId, client) {
        const row = await repo.kho(auth.donViId, khoId, client);
        if (!row) throw v.loi('Không tìm thấy kho', 404, 'NOT_FOUND');
        if (auth.chiNhanhId && Number(row.chi_nhanh_id) !== Number(auth.chiNhanhId)) throw v.loi('Không có quyền truy cập kho này', 403, 'BRANCH_FORBIDDEN');
        return row;
    }
    async phieu(auth, id, client, khoa = false) {
        const row = await repo.phieu(auth.donViId, v.id(id, 'Phiếu kiểm kho'), client, khoa);
        if (!row) throw v.loi('Không tìm thấy phiếu kiểm kho', 404, 'NOT_FOUND');
        await this.kho(auth, row.kho_id, client);
        return row;
    }
    async danhSach(auth, query) {
        await this.quyen(auth);
        const loc = v.boLoc(query);
        if (auth.chiNhanhId && !loc.kho_id) throw v.loi('Vui lòng chọn kho khi xem theo chi nhánh');
        if (loc.kho_id) await this.kho(auth, loc.kho_id);
        return repo.danhSach(auth.donViId, loc);
    }
    async chiTiet(auth, id) {
        await this.quyen(auth);
        const phieu = await this.phieu(auth, id);
        const chiTiet = await repo.chiTiet(auth.donViId, phieu.id);
        return { ...phieu, chi_tiet: chiTiet.map(dong => ({ ...dong, chenh_lech: dong.so_luong_thuc_dem == null ? null : dong.so_luong_thuc_dem - dong.so_luong_so_sach })) };
    }
    async tao(auth, body, requestId) {
        const data = v.tao(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            await this.kho(auth, data.kho_id, client);
            const phieu = await repo.tao(auth.donViId, auth.taiKhoanId, data, client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.create', requestId, client);
            return phieu;
        });
    }
    async batDau(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'NHAP') throw v.loi('Chỉ được bắt đầu phiếu nháp', 409, 'INVALID_STATUS');
            await client.query('SELECT pg_advisory_xact_lock($1::integer,$2::integer)', [auth.donViId, phieu.kho_id]);
            const chiTiet = await repo.taoAnhChup(auth.donViId, phieu.id, phieu.kho_id, client);
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DANG_KIEM', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.start', requestId, client);
            return { ...ketQua, chi_tiet: chiTiet };
        });
    }
    async dem(auth, id, dongId, body, requestId) {
        const data = v.dem(body);
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'DANG_KIEM') throw v.loi('Phiếu không ở trạng thái đang kiểm', 409, 'INVALID_STATUS');
            const dong = await repo.dong(auth.donViId, phieu.id, v.id(dongId, 'Dòng kiểm kê'), client, true);
            if (!dong) throw v.loi('Không tìm thấy dòng kiểm kê', 404, 'NOT_FOUND');
            const ketQua = await repo.dem(auth.donViId, phieu.id, dong.id, data, client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.count', requestId, client);
            return { ...ketQua, chenh_lech: ketQua.so_luong_thuc_dem - ketQua.so_luong_so_sach };
        });
    }
    async themSachNgoaiSo(auth, id, body, requestId) {
        if (!body || typeof body !== 'object' || Array.isArray(body)) throw v.loi('Dữ liệu không hợp lệ');
        const sachId = v.id(body.phien_ban_sach_id, 'Phiên bản sách');
        const viTriId = body.vi_tri_kho_id == null ? null : v.id(body.vi_tri_kho_id, 'Vị trí kho');
        const data = v.dem({ so_luong_thuc_dem: body.so_luong_thuc_dem, ghi_chu: body.ghi_chu });
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'DANG_KIEM') throw v.loi('Phiếu không ở trạng thái đang kiểm', 409, 'INVALID_STATUS');
            const { rows: sach } = await client.query('SELECT id FROM phien_ban_sach WHERE don_vi_id = $1 AND id = $2', [auth.donViId, sachId]);
            if (!sach.length) throw v.loi('Phiên bản sách không tồn tại');
            if (viTriId != null) {
                const { rows: viTri } = await client.query('SELECT id FROM vi_tri_kho WHERE don_vi_id = $1 AND kho_id = $2 AND id = $3', [auth.donViId, phieu.kho_id, viTriId]);
                if (!viTri.length) throw v.loi('Vị trí không thuộc kho kiểm kê');
            }
            const ton = await repo.ton(auth.donViId, phieu.kho_id, sachId, viTriId, client);
            if (ton && ton.so_luong_thuc_te > 0) throw v.loi('Sách đã có tồn; phải kiểm kê trên dòng hiện có');
            const dong = await repo.themDongKhongCoTrongSo(auth.donViId, phieu.id, sachId, viTriId, data.so_luong_thuc_dem, client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.item.create', requestId, client);
            return dong;
        });
    }
    async trinhDuyet(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'DANG_KIEM') throw v.loi('Phiếu không ở trạng thái đang kiểm', 409, 'INVALID_STATUS');
            const chiTiet = await repo.chiTiet(auth.donViId, phieu.id, client);
            if (!chiTiet.length || chiTiet.some(dong => dong.so_luong_thuc_dem == null)) throw v.loi('Phải đếm đủ tất cả dòng trước khi trình duyệt');
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'CHO_DUYET', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.submit', requestId, client);
            return { ...ketQua, chi_tiet: chiTiet };
        });
    }
    async duyet(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai !== 'CHO_DUYET') throw v.loi('Phiếu chưa trình duyệt hoặc đã được duyệt', 409, 'INVALID_STATUS');
            await client.query('SELECT pg_advisory_xact_lock($1::integer,$2::integer)', [auth.donViId, phieu.kho_id]);
            const chiTiet = await repo.chiTiet(auth.donViId, phieu.id, client, true);
            const bienDong = [];
            for (const dong of chiTiet) {
                await repo.taoTonRong(auth.donViId, phieu.kho_id, dong.phien_ban_sach_id, dong.vi_tri_kho_id, client);
                const ton = await repo.ton(auth.donViId, phieu.kho_id, dong.phien_ban_sach_id, dong.vi_tri_kho_id, client);
                if (ton.so_luong_thuc_te !== dong.so_luong_so_sach) throw v.loi(`Tồn của dòng ${dong.id} đã thay đổi sau khi bắt đầu kiểm kê; cần kiểm kê lại`, 409, 'STOCK_CHANGED');
                if (dong.so_luong_thuc_dem < ton.so_luong_giu_cho) throw v.loi(`Số đếm của dòng ${dong.id} thấp hơn số đang giữ chỗ`, 409, 'RESERVED_STOCK');
                if (dong.so_luong_thuc_dem !== ton.so_luong_thuc_te) {
                    await repo.doiTon(ton.id, dong.so_luong_thuc_dem, client);
                    bienDong.push(await repo.bienDong(auth.donViId, auth.taiKhoanId, phieu, dong, ton.so_luong_thuc_te, dong.so_luong_thuc_dem, client));
                }
            }
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_DUYET', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.approve', requestId, client);
            return { ...ketQua, bien_dong_ton_kho: bienDong };
        });
    }
    async huy(auth, id, requestId) {
        return trongGiaoDich(async client => {
            await this.quyen(auth, true, client);
            const phieu = await this.phieu(auth, id, client, true);
            if (phieu.trang_thai === 'DA_DUYET' || phieu.trang_thai === 'DA_HUY') throw v.loi('Không thể hủy phiếu đã duyệt hoặc đã hủy', 409, 'INVALID_STATUS');
            const ketQua = await repo.trangThai(auth.donViId, phieu.id, auth.taiKhoanId, 'DA_HUY', client);
            await repo.nhatKy(auth.donViId, auth.taiKhoanId, phieu.id, 'warehouse.stocktake.cancel', requestId, client);
            return ketQua;
        });
    }
}
module.exports = new KiemKhoService();