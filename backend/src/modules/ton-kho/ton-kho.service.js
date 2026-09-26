const { query } = require('../../database/query.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const { loi } = require('../nhap-kho/nhap-kho.validation.js');
const { boLocHopLe } = require('./ton-kho.validation.js');
const repo = require('./ton-kho.repository.js');
class TonKhoService {
    async quyen(auth) {
        if (!auth?.donViId) throw loi('Chưa chọn đơn vị', 403, 'TENANT_REQUIRED');
        if (!await phanQuyenService.kiemTraQuyen(auth, 'books.read', {})) throw loi('Không có quyền xem tồn kho', 403, 'FORBIDDEN');
    }
    async kiemTraKho(auth, boLoc) {
        if (!boLoc.kho_id) return;
        const { rows } = await query('SELECT id,chi_nhanh_id FROM kho WHERE don_vi_id = $1 AND id = $2', [auth.donViId, boLoc.kho_id]);
        if (!rows.length) throw loi('Không tìm thấy kho', 404, 'NOT_FOUND');
        if (auth.chiNhanhId && Number(rows[0].chi_nhanh_id) !== Number(auth.chiNhanhId)) throw loi('Kho không thuộc chi nhánh đang chọn', 403, 'BRANCH_FORBIDDEN');
    }
    phamVi(auth, boLoc) {
        if (auth.chiNhanhId) {
            if (boLoc.chi_nhanh_id && Number(boLoc.chi_nhanh_id) !== Number(auth.chiNhanhId)) throw loi('Không có quyền xem chi nhánh này', 403, 'BRANCH_FORBIDDEN');
            boLoc.chi_nhanh_id = Number(auth.chiNhanhId);
        }
        return boLoc;
    }
    async danhSach(auth, queryString) {
        await this.quyen(auth);
        const boLoc = this.phamVi(auth, boLocHopLe(queryString));
        await this.kiemTraKho(auth, boLoc);
        return repo.danhSach(auth.donViId, boLoc);
    }
    async tongHop(auth, queryString) {
        await this.quyen(auth);
        const boLoc = this.phamVi(auth, boLocHopLe(queryString));
        await this.kiemTraKho(auth, boLoc);
        return repo.tongHop(auth.donViId, boLoc);
    }
    async lichSu(auth, queryString) {
        await this.quyen(auth);
        const boLoc = this.phamVi(auth, boLocHopLe(queryString, true));
        await this.kiemTraKho(auth, boLoc);
        return repo.lichSu(auth.donViId, boLoc);
    }
}
module.exports = new TonKhoService();