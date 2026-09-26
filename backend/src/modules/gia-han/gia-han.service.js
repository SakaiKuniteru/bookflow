const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const validation = require('./gia-han.validation.js');
const repo = require('./gia-han.repository.js');

class GiaHanService {
    loi(message, status = 422, code = 'INVALID_INPUT') {
        return new AppError({ code, message, status });
    }
    async quyen(auth, maQuyen, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)) throw this.loi('Không có quyền thực hiện nghiệp vụ gia hạn', 403, 'FORBIDDEN');
    }
    async layTheoId(auth, id) {
        const idHopLe = validation.bigIntHopLe(id, 'Gia hạn');
        const row = await repo.layTheoId(auth.donViId, idHopLe);
        if (!row) throw this.loi('Không tìm thấy bản ghi gia hạn', 404, 'NOT_FOUND');
        return row;
    }
    async tao(auth, body, requestId) {
        await this.quyen(auth, 'circulation.create');
        const data = validation.taoMoiHopLe(body);
        return trongGiaoDich(async client => {
            const phieu = await repo.layPhieu(auth.donViId, data.phieu_muon_tra_id, client, true);
            if (!phieu) throw this.loi('Không tìm thấy phiếu mượn trả', 404, 'NOT_FOUND');
            const chiTiet = await repo.layChiTiet(auth.donViId, data.phieu_muon_tra_id, data.chi_tiet_muon_tra_id, client, true);
            if (!chiTiet) throw this.loi('Chi tiết mượn trả không thuộc phiếu', 404, 'NOT_FOUND');
            if (!['DANG_MUON', 'DANG_THUE', 'QUA_HAN'].includes(chiTiet.trang_thai)) throw this.loi('Chi tiết sách không còn ở trạng thái được phép gia hạn');
            if (Number(chiTiet.so_luong_da_tra ?? 0) >= Number(chiTiet.so_luong ?? 0)) throw this.loi('Sách đã trả đủ, không thể gia hạn');
            const hinhThuc = chiTiet.hinh_thuc;
            if (!['MUON', 'THUE'].includes(hinhThuc)) throw this.loi('Hình thức của chi tiết không hỗ trợ gia hạn');
            const cauHinh = await repo.layCauHinh(auth.donViId, hinhThuc, client);
            if (!cauHinh) throw this.loi(`Chưa cấu hình chính sách gia hạn cho hình thức ${hinhThuc}`);
            if (chiTiet.trang_thai === 'QUA_HAN' && !cauHinh.cho_gia_han_khi_qua_han) throw this.loi('Không cho phép gia hạn khi sách đã quá hạn');
            const tienPhatConLai = await repo.coPhiPhatChuaXuLy(auth.donViId, data.chi_tiet_muon_tra_id, client);
            if (Number(tienPhatConLai) > 0 && !cauHinh.cho_gia_han_khi_co_phi_phat) throw this.loi('Chi tiết sách đang còn phí phạt chưa xử lý, không được gia hạn');
            const coDatTruoc = await repo.coDatTruocDangCho(auth.donViId, data.chi_tiet_muon_tra_id, client);
            if (coDatTruoc && !cauHinh.cho_gia_han_khi_co_dat_truoc) throw this.loi('Sách đang có đặt trước chờ xử lý, không được gia hạn');
            const soLanDaGiaHan = await repo.demSoLanGiaHan(auth.donViId, data.chi_tiet_muon_tra_id, client);
            if (cauHinh.so_lan_toi_da > 0 && soLanDaGiaHan >= cauHinh.so_lan_toi_da) throw this.loi('Đã vượt số lần gia hạn tối đa');
            if (cauHinh.so_ngay_toi_da_moi_lan > 0 && data.so_ngay_gia_han > cauHinh.so_ngay_toi_da_moi_lan) throw this.loi(`Mỗi lần chỉ được gia hạn tối đa ${cauHinh.so_ngay_toi_da_moi_lan} ngày`);
            const ngayHanCu = new Date(chiTiet.ngay_han_tra);
            if (Number.isNaN(ngayHanCu.getTime())) throw this.loi('Ngày hạn trả hiện tại không hợp lệ');
            const ngayHanMoi = new Date(ngayHanCu.getTime() + data.so_ngay_gia_han * 86400000);
            const lanGiaHan = await repo.lanGiaHanTiepTheo(auth.donViId, data.chi_tiet_muon_tra_id, client);
            const trangThai = cauHinh.yeu_cau_duyet ? 'CHO_DUYET' : 'DA_DUYET';
            const row = await repo.tao(auth.donViId, {
                ...data,
                lan_gia_han: lanGiaHan,
                ngay_han_cu: ngayHanCu.toISOString(),
                ngay_han_moi: ngayHanMoi.toISOString(),
                trang_thai: trangThai,
                nguoi_yeu_cau_id: auth.taiKhoanId
            }, client);
            if (trangThai === 'DA_DUYET') await repo.capNhatHanTra(auth.donViId, data.chi_tiet_muon_tra_id, ngayHanMoi.toISOString(), client);
            return { ...row, request_id: requestId };
        });
    }
    async duyet(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.duyetHopLe(body);
        return trongGiaoDich(async client => {
            const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Gia hạn'), client);
            if (!row) throw this.loi('Không tìm thấy bản ghi gia hạn', 404, 'NOT_FOUND');
            if (row.trang_thai !== 'CHO_DUYET') throw this.loi('Gia hạn không còn ở trạng thái chờ duyệt');
            if (data.trang_thai === 'DA_DUYET') {
                const chiTiet = await repo.layChiTiet(auth.donViId, row.phieu_muon_tra_id, row.chi_tiet_muon_tra_id, client, true);
                if (!chiTiet) throw this.loi('Không tìm thấy chi tiết mượn trả', 404, 'NOT_FOUND');
                if (Number(chiTiet.so_luong_da_tra ?? 0) >= Number(chiTiet.so_luong ?? 0)) throw this.loi('Sách đã được trả trong thời gian chờ duyệt');
                await repo.capNhatHanTra(auth.donViId, row.chi_tiet_muon_tra_id, row.ngay_han_moi, client);
            }
            const ketQua = await repo.duyet(auth.donViId, row.id, data.trang_thai, data.ly_do, auth.taiKhoanId, client);
            if (!ketQua) throw this.loi('Gia hạn đã được xử lý bởi người khác', 409, 'CONCURRENT_UPDATE');
            return { ...ketQua, request_id: requestId };
        });
    }
    async huy(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.huyHopLe(body ?? {});
        return trongGiaoDich(async client => {
            const row = await repo.huy(auth.donViId, validation.bigIntHopLe(id, 'Gia hạn'), data.ly_do, client);
            if (!row) throw this.loi('Gia hạn không tồn tại hoặc không còn được phép huỷ', 409, 'CONCURRENT_UPDATE');
            return { ...row, request_id: requestId };
        });
    }
    async danhSach(auth, query) {
        await this.quyen(auth, 'circulation.read');
        return repo.danhSach(auth.donViId, validation.boLocHopLe(query));
    }
    async chiTiet(auth, id) {
        await this.quyen(auth, 'circulation.read');
        return this.layTheoId(auth, id);
    }
    async cauHinh(auth, body) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.cauHinhHopLe(body);
        return trongGiaoDich(async client => {
            const { query } = require('../../database/query.js');
            const { rows } = await query(
                `INSERT INTO cau_hinh_gia_han (
                    don_vi_id, hinh_thuc, so_lan_toi_da, so_ngay_toi_da_moi_lan,
                    cho_gia_han_khi_qua_han, cho_gia_han_khi_co_phi_phat,
                    cho_gia_han_khi_co_dat_truoc, yeu_cau_duyet, hoat_dong
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
                 ON CONFLICT (don_vi_id, hinh_thuc)
                 DO UPDATE SET
                    so_lan_toi_da = EXCLUDED.so_lan_toi_da,
                    so_ngay_toi_da_moi_lan = EXCLUDED.so_ngay_toi_da_moi_lan,
                    cho_gia_han_khi_qua_han = EXCLUDED.cho_gia_han_khi_qua_han,
                    cho_gia_han_khi_co_phi_phat = EXCLUDED.cho_gia_han_khi_co_phi_phat,
                    cho_gia_han_khi_co_dat_truoc = EXCLUDED.cho_gia_han_khi_co_dat_truoc,
                    yeu_cau_duyet = EXCLUDED.yeu_cau_duyet,
                    hoat_dong = EXCLUDED.hoat_dong,
                    ngay_cap_nhat = now()
                 RETURNING *`,
                [auth.donViId, data.hinh_thuc, data.so_lan_toi_da, data.so_ngay_toi_da_moi_lan, data.cho_gia_han_khi_qua_han, data.cho_gia_han_khi_co_phi_phat, data.cho_gia_han_khi_co_dat_truoc, data.yeu_cau_duyet, data.hoat_dong], client
            );
            return rows[0];
        });
    }
}
module.exports = new GiaHanService();