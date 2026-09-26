const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const nhaCungCapService = require('../nha-cung-cap/nha-cung-cap.service.js');
const validation = require('./kho.validation.js');
const repo = require('./kho.repository.js');
class KhoService extends nhaCungCapService.constructor {
    constructor() {
        super(validation.BANG, repo, validation);
    }
    async quyen(auth, ghi = false, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, ghi ? 'books.create' : 'books.read', {}, client)) throw validation.loi('Không có quyền quản lý kho', 403, 'FORBIDDEN');
    }
    async tonTai(auth, bang, id, client, khoa = false) {
        const row = await super.tonTai(auth, bang, id, client, khoa);
        if (bang !== 'kho') return row;
        const duocXem = await phanQuyenService.kiemTraQuyen(auth, 'books.read', { phamVi: 'CHI_NHANH', chiNhanhId: row.chi_nhanh_id }, client);
        if (!duocXem) throw validation.loi('Không có quyền truy cập kho thuộc chi nhánh này', 403, 'FORBIDDEN');
        return row;
    }
    async danhSach(auth, bang, query, chaId) {
        if (bang !== 'kho') return super.danhSach(auth, bang, query, chaId);
        await this.quyen(auth);
        return this.repo.danhSach(auth.donViId, bang, this.validation.boLocHopLe(query));
    }
    async tao(auth, bang, body, requestId, chaId) {
        if (bang === 'kho') {
            const chiNhanhId = this.validation.idHopLe(body?.chi_nhanh_id, 'Chi nhánh');
            const duocTao = await phanQuyenService.kiemTraQuyen(auth, 'books.create', { phamVi: 'CHI_NHANH', chiNhanhId });
            if (!duocTao) throw validation.loi('Không có quyền tạo kho tại chi nhánh này', 403, 'FORBIDDEN');
        }
        return super.tao(auth, bang, body, requestId, chaId);
    }
}
module.exports = new KhoService();