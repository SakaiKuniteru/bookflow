const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const { idHopLe, phienBanMoiHopLe, suaPhienBanHopLe, trangThaiHopLe, boLocHopLe } = require('./phien-ban-sach.validation.js');
const repo = require('./phien-ban-sach.repository.js');
class PhienBanSachService {
    loi(message, status = 422, code = 'INVALID_INPUT') {
        return new AppError({ code, message, status });
    }
    async yeuCauQuyen(auth, maQuyen, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)) throw this.loi('Không có quyền quản lý phiên bản sách', 403, 'FORBIDDEN');
    }
    async phienBanTonTai(donViId, phienBanId, client, khoa = false) {
        const phienBan = await repo.layPhienBan(donViId, phienBanId, client, khoa);
        if (!phienBan) throw this.loi('Không tìm thấy phiên bản sách', 404, 'NOT_FOUND');
        return phienBan;
    }
    async kiemTraThamChieu(donViId, duLieu, client) {
        const bang = { dau_sach_id: 'dau_sach', nha_xuat_ban_id: 'nha_xuat_ban', thuong_hieu_xuat_ban_id: 'thuong_hieu_xuat_ban', nha_phat_hanh_id: 'nha_phat_hanh', anh_bia_chinh_id: 'tep_dinh_kem' };
        for (const [ten, tenBang] of Object.entries(bang)) {
            if (duLieu[ten] && !await repo.thamChieuTonTai(tenBang, donViId, duLieu[ten], client)) throw this.loi(`${ten} không tồn tại trong đơn vị`);
        }
        if (duLieu.thuong_hieu_xuat_ban_id && !await repo.thuongHieuThuocNhaXuatBan(donViId, duLieu.thuong_hieu_xuat_ban_id, duLieu.nha_xuat_ban_id, client)) throw this.loi('Thương hiệu không thuộc nhà xuất bản đã chọn');
    }
    kiemTraNghiepVu(duLieu) {
        if (duLieu.thuong_hieu_xuat_ban_id && !duLieu.nha_xuat_ban_id) throw this.loi('Thương hiệu xuất bản phải có nhà xuất bản');
        if (duLieu.ngay_ngung_phat_hanh && duLieu.ngay_phat_hanh && String(duLieu.ngay_ngung_phat_hanh).slice(0, 10) < String(duLieu.ngay_phat_hanh).slice(0, 10)) throw this.loi('Ngày ngừng phát hành không được trước ngày phát hành');
        if (duLieu.so_trang != null && duLieu.so_trang_noi_dung != null && duLieu.so_trang_noi_dung > duLieu.so_trang) throw this.loi('Số trang nội dung không được lớn hơn tổng số trang');
        if (duLieu.nam_xuat_ban != null && duLieu.ngay_xuat_ban && Number(String(duLieu.ngay_xuat_ban).slice(0, 4)) !== duLieu.nam_xuat_ban) throw this.loi('Năm xuất bản không khớp ngày xuất bản');
    }
    xuLyLoiDb(error) {
        if (error.code === '23505') throw this.loi('Mã phiên bản, SKU hoặc ISBN đã tồn tại', 409, 'BOOK_EDITION_EXISTS');
        if (error.code === '23503') throw this.loi('Phiên bản đang được sử dụng hoặc dữ liệu tham chiếu không hợp lệ', 409, 'BOOK_EDITION_IN_USE');
        if (error.code === '23514' || error.code === '22003' || error.code === '22P02') throw this.loi('Dữ liệu phiên bản vi phạm ràng buộc');
        throw error;
    }
    async danhSach(auth, queryString) {
        const boLoc = boLocHopLe(queryString);
        await this.yeuCauQuyen(auth, 'books.read');
        return repo.danhSach(auth.donViId, boLoc);
    }
    async chiTiet(auth, phienBanId) {
        phienBanId = idHopLe(phienBanId, 'Phiên bản sách');
        await this.yeuCauQuyen(auth, 'books.read');
        const phienBan = await repo.layChiTiet(auth.donViId, phienBanId);
        if (!phienBan) throw this.loi('Không tìm thấy phiên bản sách', 404, 'NOT_FOUND');
        const [nguoiDongGop, ngonNgu, maDinhDanh, tepSach] = await Promise.all([
            repo.nguoiDongGop(auth.donViId, phienBanId),
            repo.ngonNgu(auth.donViId, phienBanId),
            repo.maDinhDanh(auth.donViId, phienBanId),
            repo.tepSach(auth.donViId, phienBanId)
        ]);
        return { ...phienBan, nguoi_dong_gop: nguoiDongGop, ngon_ngu: ngonNgu, ma_dinh_danh: maDinhDanh, tep_sach: tepSach };
    }
    async taoPhienBan(auth, body, requestId) {
        const duLieu = phienBanMoiHopLe(body);
        this.kiemTraNghiepVu(duLieu);
        let ketQua;
        try {
            ketQua = await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.kiemTraThamChieu(auth.donViId, duLieu, client);
                const phienBan = await repo.taoPhienBan(auth.donViId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongId: phienBan.id, hanhDong: 'books.edition.create', requestId }, client);
                return phienBan;
            });
        } catch (error) { this.xuLyLoiDb(error); }
        return ketQua;
    }
    async suaPhienBan(auth, phienBanId, body, requestId) {
        phienBanId = idHopLe(phienBanId, 'Phiên bản sách');
        const duLieu = suaPhienBanHopLe(body);
        let ketQua;
        try {
            ketQua = await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                const hienTai = await this.phienBanTonTai(auth.donViId, phienBanId, client, true);
                const moi = { ...hienTai, ...duLieu };
                this.kiemTraNghiepVu(moi);
                await this.kiemTraThamChieu(auth.donViId, moi, client);
                const phienBan = await repo.suaPhienBan(auth.donViId, phienBanId, auth.taiKhoanId, duLieu, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongId: phienBanId, hanhDong: 'books.edition.update', requestId }, client);
                return phienBan;
            });
        } catch (error) { this.xuLyLoiDb(error); }
        return ketQua;
    }
    async doiTrangThai(auth, phienBanId, body, requestId) {
        phienBanId = idHopLe(phienBanId, 'Phiên bản sách');
        const trangThai = trangThaiHopLe(body);
        return trongGiaoDich(async client => {
            await this.yeuCauQuyen(auth, 'books.create', client);
            await this.phienBanTonTai(auth.donViId, phienBanId, client, true);
            const phienBan = await repo.doiTrangThai(auth.donViId, phienBanId, auth.taiKhoanId, trangThai, client);
            await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongId: phienBanId, hanhDong: 'books.edition.status.update', requestId }, client);
            return phienBan;
        });
    }
    async xoaPhienBan(auth, phienBanId, requestId) {
        phienBanId = idHopLe(phienBanId, 'Phiên bản sách');
        try {
            return await trongGiaoDich(async client => {
                await this.yeuCauQuyen(auth, 'books.create', client);
                await this.phienBanTonTai(auth.donViId, phienBanId, client, true);
                const ketQua = await repo.xoaPhienBan(auth.donViId, phienBanId, client);
                await repo.ghiNhatKy({ donViId: auth.donViId, actorId: auth.taiKhoanId, doiTuongId: phienBanId, hanhDong: 'books.edition.delete', requestId }, client);
                return ketQua;
            });
        } catch (error) { this.xuLyLoiDb(error); }
    }
}
module.exports = new PhienBanSachService();