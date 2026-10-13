const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const { idHopLe, loiNhieuTruong, nhaXuatBanMoiHopLe, suaNhaXuatBanHopLe, trangThaiHopLe, thuongHieuMoiHopLe, suaThuongHieuHopLe, boLocHopLe } = require('./nha-xuat-ban.validation.js');
const repo = require('./nha-xuat-ban.repository.js');
class NhaXuatBanService {
    loi(message, status = 422, code = 'INVALID_INPUT') {
        return new AppError({ code, message, status });
    }
    async yeuCauQuyen(auth, maQuyen, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)) throw this.loi('Không có quyền quản lý nhà xuất bản', 403, 'FORBIDDEN');
    }
    async nhaXuatBanTonTai(donViId, nhaXuatBanId, client, khoa = false) {
        const nhaXuatBan = await repo.layNhaXuatBan(donViId, nhaXuatBanId, client, khoa);
        if (!nhaXuatBan) throw this.loi('Không tìm thấy nhà xuất bản', 404, 'NOT_FOUND');
        return nhaXuatBan;
    }
    async thuongHieuTonTai(donViId, nhaXuatBanId, thuongHieuId, client, khoa = false) {
        const thuongHieu = await repo.layThuongHieu(donViId, nhaXuatBanId, thuongHieuId, client, khoa);
        if (!thuongHieu) throw this.loi('Không tìm thấy thương hiệu của nhà xuất bản', 404, 'NOT_FOUND');
        return thuongHieu;
    }
    async kiemTraLogo(donViId, duLieu, client) {
        if (duLieu.logo_tep_id && !await repo.tepTonTai(donViId, duLieu.logo_tep_id, client)) throw this.loi('Logo không tồn tại trong đơn vị');
    }
    xuLyLoiDb(error) {
        if (error.code === '23505') throw loiNhieuTruong([{ field: 'ma_nha_xuat_ban', message: 'Mã nhà xuất bản đã tồn tại trong đơn vị' }], 409, 'PUBLISHER_EXISTS');
        if (error.code === '23503') throw this.loi('Nhà xuất bản hoặc thương hiệu đang được sử dụng, hoặc dữ liệu tham chiếu không hợp lệ', 409, 'PUBLISHER_IN_USE');
        if (error.code === '23514' || error.code === '22003' || error.code === '22P02') throw this.loi('Dữ liệu nhà xuất bản vi phạm ràng buộc');
        throw error;
    }
    async danhSach(auth, queryString) {
        const boLoc = boLocHopLe(queryString);
        await this.yeuCauQuyen(auth, 'books.read');
        return repo.danhSach(auth.donViId, boLoc);
    }
    async chiTiet(auth, nhaXuatBanId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        await this.yeuCauQuyen(auth, 'books.read');
        const nhaXuatBan = await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId);
        return { ...nhaXuatBan, thuong_hieu_xuat_ban: await repo.danhSachThuongHieu(auth.donViId, nhaXuatBanId) };
    }
    async taoNhaXuatBan(auth, body, requestId) {
        const kiemTra = body?.kiem_tra === true;
        const dauVao = { ...body };
        delete dauVao.kiem_tra;
        let duLieu = {};
        let loiTruong = [];
        try { duLieu = nhaXuatBanMoiHopLe(dauVao); }
        catch (error) {
            if (!kiemTra) throw error;
            loiTruong = error.details || [];
        }
        try {
            const ketQua = await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const ma = typeof dauVao.ma_nha_xuat_ban === 'string' ? dauVao.ma_nha_xuat_ban.trim().toUpperCase() : '';
                if (ma && await repo.maNhaXuatBanDaTonTai(auth.donViId, ma, null, client)) loiTruong.push({ field: 'ma_nha_xuat_ban', message: 'Mã nhà xuất bản đã tồn tại trong đơn vị' });
                const logoId = duLieu.logo_tep_id ?? (Number.isSafeInteger(Number(dauVao.logo_tep_id)) && Number(dauVao.logo_tep_id) > 0 ? Number(dauVao.logo_tep_id) : null);
                if (logoId && !await repo.tepTonTai(auth.donViId, logoId, client)) loiTruong.push({ field: 'logo_tep_id', message: 'Logo không tồn tại trong đơn vị' });
                if (loiTruong.length) {
                    const duplicate = loiTruong.some(item => item.field === 'ma_nha_xuat_ban' && item.message.includes('đã tồn tại'));
                    throw loiNhieuTruong(loiTruong, duplicate ? 409 : 422, duplicate ? 'PUBLISHER_EXISTS' : 'INVALID_INPUT');
                }
                if (kiemTra) return { da_kiem_tra: true };
                const nhaXuatBan = await repo.taoNhaXuatBan(auth.donViId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'nha_xuat_ban', doiTuongId: nhaXuatBan.id, hanhDong: 'books.publisher.create', requestId }, client);
                return nhaXuatBan;
            });
            if (kiemTra) return ketQua;
            return { ...ketQua, thuong_hieu_xuat_ban: [] };
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaNhaXuatBan(auth, nhaXuatBanId, body, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        const kiemTra = body?.kiem_tra === true;
        const dauVao = { ...body };
        delete dauVao.kiem_tra;
        let duLieu = {};
        let loiTruong = [];
        try { duLieu = suaNhaXuatBanHopLe(dauVao); }
        catch (error) {
            if (!kiemTra) throw error;
            loiTruong = error.details || [];
        }
        try {
            const ketQua = await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
                const logoId = duLieu.logo_tep_id ?? (Number.isSafeInteger(Number(dauVao.logo_tep_id)) && Number(dauVao.logo_tep_id) > 0 ? Number(dauVao.logo_tep_id) : null);
                if (logoId && !await repo.tepTonTai(auth.donViId, logoId, client)) loiTruong.push({ field: 'logo_tep_id', message: 'Logo không tồn tại trong đơn vị' });
                if (loiTruong.length) throw loiNhieuTruong(loiTruong);
                if (kiemTra) return { da_kiem_tra: true };
                const nhaXuatBan = await repo.suaNhaXuatBan(auth.donViId, nhaXuatBanId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'nha_xuat_ban', doiTuongId: nhaXuatBanId, hanhDong: 'books.publisher.update', requestId }, client);
                return nhaXuatBan;
            });
            if (kiemTra) return ketQua;
            return { ...ketQua, thuong_hieu_xuat_ban: await repo.danhSachThuongHieu(auth.donViId, nhaXuatBanId) };
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async doiTrangThai(auth, nhaXuatBanId, body, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        const trangThai = trangThaiHopLe(body);
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
            const nhaXuatBan = await repo.doiTrangThai(auth.donViId, nhaXuatBanId, auth.taiKhoanId, trangThai, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'nha_xuat_ban', doiTuongId: nhaXuatBanId, hanhDong: 'books.publisher.status.update', requestId }, client);
            return nhaXuatBan;
        });
    }
    async xoaNhaXuatBan(auth, nhaXuatBanId, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
                const thuongHieu = await repo.danhSachThuongHieu(auth.donViId, nhaXuatBanId, client);
                if (thuongHieu.length) throw this.loi('Không thể xóa nhà xuất bản đang có thương hiệu', 409, 'PUBLISHER_HAS_BRANDS');
                const ketQua = await repo.xoaNhaXuatBan(auth.donViId, nhaXuatBanId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'nha_xuat_ban', doiTuongId: nhaXuatBanId, hanhDong: 'books.publisher.delete', requestId }, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async danhSachThuongHieu(auth, nhaXuatBanId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        await this.yeuCauQuyen(auth, 'books.read');
        await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId);
        return { thuong_hieu_xuat_ban: await repo.danhSachThuongHieu(auth.donViId, nhaXuatBanId) };
    }
    async taoThuongHieu(auth, nhaXuatBanId, body, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        const duLieu = thuongHieuMoiHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const nhaXuatBan = await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
                if (nhaXuatBan.trang_thai !== 'DANG_DUNG') throw this.loi('Nhà xuất bản không còn hoạt động', 409, 'PUBLISHER_INACTIVE');
                await this.kiemTraLogo(auth.donViId, duLieu, client);
                const thuongHieu = await repo.taoThuongHieu(auth.donViId, nhaXuatBanId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'thuong_hieu_xuat_ban', doiTuongId: thuongHieu.id, hanhDong: 'books.publisher.brand.create', requestId }, client);
                return thuongHieu;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async suaThuongHieu(auth, nhaXuatBanId, thuongHieuId, body, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        thuongHieuId = idHopLe(thuongHieuId, 'Thương hiệu');
        const duLieu = suaThuongHieuHopLe(body);
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
                await this.thuongHieuTonTai(auth.donViId, nhaXuatBanId, thuongHieuId, client, true);
                await this.kiemTraLogo(auth.donViId, duLieu, client);
                const thuongHieu = await repo.suaThuongHieu(auth.donViId, nhaXuatBanId, thuongHieuId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'thuong_hieu_xuat_ban', doiTuongId: thuongHieuId, hanhDong: 'books.publisher.brand.update', requestId }, client);
                return thuongHieu;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
    async doiTrangThaiThuongHieu(auth, nhaXuatBanId, thuongHieuId, body, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        thuongHieuId = idHopLe(thuongHieuId, 'Thương hiệu');
        const trangThai = trangThaiHopLe(body);
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            const nhaXuatBan = await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
            await this.thuongHieuTonTai(auth.donViId, nhaXuatBanId, thuongHieuId, client, true);
            if (trangThai === 'DANG_DUNG' && nhaXuatBan.trang_thai !== 'DANG_DUNG') throw this.loi('Không thể kích hoạt thương hiệu khi nhà xuất bản ngừng hoạt động');
            const thuongHieu = await repo.doiTrangThaiThuongHieu(auth.donViId, nhaXuatBanId, thuongHieuId, auth.taiKhoanId, trangThai, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'thuong_hieu_xuat_ban', doiTuongId: thuongHieuId, hanhDong: 'books.publisher.brand.status.update', requestId }, client);
            return thuongHieu;
        });
    }
    async xoaThuongHieu(auth, nhaXuatBanId, thuongHieuId, requestId) {
        nhaXuatBanId = idHopLe(nhaXuatBanId, 'Nhà xuất bản');
        thuongHieuId = idHopLe(thuongHieuId, 'Thương hiệu');
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.nhaXuatBanTonTai(auth.donViId, nhaXuatBanId, client, true);
                await this.thuongHieuTonTai(auth.donViId, nhaXuatBanId, thuongHieuId, client, true);
                const ketQua = await repo.xoaThuongHieu(auth.donViId, nhaXuatBanId, thuongHieuId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongLoai: 'thuong_hieu_xuat_ban', doiTuongId: thuongHieuId, hanhDong: 'books.publisher.brand.delete', requestId }, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
}
module.exports = new NhaXuatBanService();
