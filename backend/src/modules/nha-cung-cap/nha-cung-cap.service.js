const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const validation = require('./nha-cung-cap.validation.js');
const { BANG, loi, idHopLe, boLocHopLe } = validation;
const repo = require('./nha-cung-cap.repository.js');
class NhaCungCapService {
    constructor(bang = BANG, repository = repo, validator = validation) {
        this.BANG = bang;
        this.repo = repository;
        this.validation = validator;
    }
    async quyen(auth, ghi = false, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, ghi ? 'books.create' : 'books.read', {}, client)) throw loi('Không có quyền quản lý nhà cung cấp', 403, 'FORBIDDEN');
    }
    async tonTai(auth, bang, id, client, khoa = false) {
        const row = await this.repo.lay(auth.donViId, bang, id, client, khoa);
        if (!row) throw loi('Không tìm thấy dữ liệu', 404, 'NOT_FOUND');
        return row;
    }
    async chaTonTai(auth, bang, chaId, client, khoa = false) {
        if (this.BANG[bang].cha) await this.tonTai(auth, this.BANG[bang].cha, chaId, client, khoa);
    }
    xuLyLoi(error) {
        if (error.code === '23505') throw loi('Mã hoặc dữ liệu duy nhất đã tồn tại', 409, 'DUPLICATE_DATA');
        if (error.code === '23503') throw loi('Dữ liệu tham chiếu không hợp lệ hoặc đang được sử dụng', 409, 'REFERENCE_CONFLICT');
        if (['23502', '23514', '22P02', '22003', '22001'].includes(error.code)) throw loi('Dữ liệu vi phạm ràng buộc database');
        throw error;
    }
    async danhSach(auth, bang, query, chaId) {
        if (!Object.hasOwn(this.BANG, bang)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
        const boLoc = boLocHopLe(query);
        await this.quyen(auth);
        if (chaId != null) chaId = idHopLe(chaId, 'Nhà cung cấp');
        await this.chaTonTai(auth, bang, chaId);
        return this.repo.danhSach(auth.donViId, bang, boLoc, { chaId });
    }
    async chiTiet(auth, bang, id, chaId) {
        if (!Object.hasOwn(this.BANG, bang)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
        id = idHopLe(id);
        if (chaId != null) chaId = idHopLe(chaId, 'Nhà cung cấp');
        await this.quyen(auth);
        await this.chaTonTai(auth, bang, chaId);
        const row = await this.tonTai(auth, bang, id);
        if (this.BANG[bang].khoaCha && row[this.BANG[bang].khoaCha] !== chaId) throw loi('Không tìm thấy dữ liệu', 404, 'NOT_FOUND');
        if (bang !== 'nha_cung_cap') return row;
        const bangCon = Object.keys(this.BANG).filter(ten => BANG[ten].cha === 'nha_cung_cap');
        const chiTiet = await Promise.all(bangCon.map(async ten => [ten, (await this.repo.danhSach(auth.donViId, ten, { trang: 1, kich_thuoc: 100, tu_khoa: '', trang_thai: null }, { chaId: id })).danh_sach]));
        return { ...row, ...Object.fromEntries(chiTiet) };
    }
    async tao(auth, bang, body, requestId, chaId) {
        if (!Object.hasOwn(this.BANG, bang)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
        const duLieu = validation.duLieuHopLe(body, { tao: true, bang })
        if (chaId != null) chaId = idHopLe(chaId, 'Nhà cung cấp');
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                await this.chaTonTai(auth, bang, chaId, client, true);
                const row = await this.repo.tao(auth.donViId, auth.taiKhoanId, bang, duLieu, { chaId }, client);
                await this.repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, bang, id: row.id, hanhDong: `${bang}.create`, requestId }, client);
                return row;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async sua(auth, bang, id, body, requestId, chaId) {
        if (!Object.hasOwn(this.BANG, bang)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
        id = idHopLe(id);
        const duLieu = validation.duLieuHopLe(body, { bang })
        if (chaId != null) chaId = idHopLe(chaId, 'Nhà cung cấp');
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                await this.chaTonTai(auth, bang, chaId, client, true);
                const hienTai = await this.tonTai(auth, bang, id, client, true);
                if (this.BANG[bang].khoaCha && hienTai[this.BANG[bang].khoaCha] !== chaId) throw loi('Không tìm thấy dữ liệu', 404, 'NOT_FOUND');
                const row = await this.repo.sua(auth.donViId, auth.taiKhoanId, bang, id, duLieu, { chaId }, client);
                await this.repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, bang, id, hanhDong: `${bang}.update`, requestId }, client);
                return row;
            });
        } catch (error) { this.xuLyLoi(error); }
    }
    async xoa(auth, bang, id, requestId, chaId) {
        if (!Object.hasOwn(this.BANG, bang)) throw loi('Loại dữ liệu không được hỗ trợ', 404, 'NOT_FOUND');
        id = idHopLe(id);
        if (chaId != null) chaId = idHopLe(chaId, 'Nhà cung cấp');
        try {
            return await trongGiaoDich(async client => {
                await this.quyen(auth, true, client);
                await this.chaTonTai(auth, bang, chaId, client, true);
                const hienTai = await this.tonTai(auth, bang, id, client, true);
                if (this.BANG[bang].khoaCha && hienTai[this.BANG[bang].khoaCha] !== chaId) throw loi('Không tìm thấy dữ liệu', 404, 'NOT_FOUND');
                const row = await this.repo.xoa(auth.donViId, auth.taiKhoanId, bang, id, { chaId }, client);
                await this.repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, bang, id, hanhDong: `${bang}.delete`, requestId }, client);
                return { id: row.id, da_xoa: true };
            });
        } catch (error) { this.xuLyLoi(error); }
    }
}
module.exports = new NhaCungCapService();