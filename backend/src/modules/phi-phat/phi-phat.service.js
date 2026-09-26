const { AppError } = require('../../common/errors/AppError.js');
const { trongGiaoDich } = require('../../database/transaction.js');
const phanQuyenService = require('../phan-quyen/phan-quyen.service.js');
const validation = require('./phi-phat.validation.js');
const repo = require('./phi-phat.repository.js');

class PhiPhatService {
    loi(message, status = 422, code = 'INVALID_INPUT') {
        return new AppError({ code, message, status });
    }
    async quyen(auth, maQuyen, client) {
        if (!await phanQuyenService.kiemTraQuyen(auth, maQuyen, {}, client)) throw this.loi('Không có quyền quản lý phí phạt', 403, 'FORBIDDEN');
    }
    async taoLoai(auth, body) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.taoLoaiHopLe(body);
        return trongGiaoDich(async client => {
            const { query } = require('../../database/query.js');
            const { rows } = await query(
                `INSERT INTO loai_phi_phat (
                    don_vi_id, ma_loai, ten_loai, loai, cach_tinh, muc_tien,
                    ty_le_phan_tram, cho_phep_mien_giam, cho_phep_mien_phi, hoat_dong
                 ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
                 ON CONFLICT (don_vi_id, ma_loai)
                 DO UPDATE SET
                    ten_loai = EXCLUDED.ten_loai,
                    loai = EXCLUDED.loai,
                    cach_tinh = EXCLUDED.cach_tinh,
                    muc_tien = EXCLUDED.muc_tien,
                    ty_le_phan_tram = EXCLUDED.ty_le_phan_tram,
                    cho_phep_mien_giam = EXCLUDED.cho_phep_mien_giam,
                    cho_phep_mien_phi = EXCLUDED.cho_phep_mien_phi,
                    hoat_dong = EXCLUDED.hoat_dong,
                    ngay_cap_nhat = now()
                 RETURNING *`,
                [auth.donViId, data.ma_loai, data.ten_loai, data.loai, data.cach_tinh, data.muc_tien, data.ty_le_phan_tram, data.cho_phep_mien_giam, data.cho_phep_mien_phi, data.hoat_dong], client
            );
            return rows[0];
        });
    }
    async tao(auth, body, requestId) {
        await this.quyen(auth, 'circulation.create');
        const data = validation.taoPhiPhatHopLe(body);
        return trongGiaoDich(async client => {
            const chiTiet = await repo.layChiTietMuonTra(auth.donViId, data.phieu_muon_tra_id, data.chi_tiet_muon_tra_id, client, true);
            if (!chiTiet) throw this.loi('Không tìm thấy chi tiết mượn trả', 404, 'NOT_FOUND');
            if (data.loai === 'QUA_HAN' && data.so_ngay_qua_han <= 0) throw this.loi('Phí quá hạn phải có số ngày quá hạn lớn hơn 0');
            if (['MAT_SACH', 'HU_HONG'].includes(data.loai) && data.don_gia === '0') throw this.loi('Phí mất/hỏng phải có giá trị');
            let loai = null;
            if (data.loai_phi_phat_id) {
                loai = await repo.layLoai(auth.donViId, data.loai_phi_phat_id, client);
                if (!loai) throw this.loi('Không tìm thấy loại phí phạt', 404, 'NOT_FOUND');
                if (loai.loai !== data.loai) throw this.loi('Loại phí phạt không khớp với nghiệp vụ');
            }
            const tienGoc = Number(data.don_gia) * data.so_luong * (data.loai === 'QUA_HAN' ? Math.max(data.so_ngay_qua_han, 1) : 1);
            const maPhieu = await repo.taoMaPhieu(auth.donViId, client);
            const row = await repo.taoPhiPhat(auth.donViId, {
                ...data,
                ma_phieu: maPhieu,
                tien_goc: tienGoc.toFixed(3),
                trang_thai: 'CHO_DUYET',
                nguoi_tao_id: auth.taiKhoanId
            }, client);
            return { ...row, request_id: requestId };
        });
    }
    async chiTiet(auth, id) {
        await this.quyen(auth, 'circulation.read');
        const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Phí phạt'));
        if (!row) throw this.loi('Không tìm thấy phí phạt', 404, 'NOT_FOUND');
        return row;
    }
    async danhSach(auth, query) {
        await this.quyen(auth, 'circulation.read');
        return repo.danhSach(auth.donViId, validation.boLocHopLe(query));
    }
    async duyet(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.duyetHopLe(body);
        return trongGiaoDich(async client => {
            const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Phí phạt'), client, true);
            if (!row) throw this.loi('Không tìm thấy phí phạt', 404, 'NOT_FOUND');
            if (row.trang_thai !== 'CHO_DUYET') throw this.loi('Phí phạt không còn ở trạng thái chờ duyệt');
            if (data.trang_thai === 'MIEN_PHI') {
                const loai = row.loai_phi_phat_id ? await repo.layLoai(auth.donViId, row.loai_phi_phat_id, client) : null;
                if (loai && !loai.cho_phep_mien_phi) throw this.loi('Loại phí phạt này không cho phép miễn phí');
                await repo.capNhatTrangThai(auth.donViId, row.id, 'MIEN_PHI', data.ly_do, auth.taiKhoanId, client);
                const { query } = require('../../database/query.js');
                await query(`UPDATE phi_phat SET tien_mien_phi = tien_phai_thu, tien_con_lai = 0, ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2`, [auth.donViId, row.id], client);
            } else {
                await repo.capNhatTrangThai(auth.donViId, row.id, 'CHO_THU', data.ly_do, auth.taiKhoanId, client);
            }
            const ketQua = await repo.layTheoId(auth.donViId, row.id, client);
            return { ...ketQua, request_id: requestId };
        });
    }
    async mienGiam(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.mienGiamHopLe(body);
        return trongGiaoDich(async client => {
            const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Phí phạt'), client, true);
            if (!row) throw this.loi('Không tìm thấy phí phạt', 404, 'NOT_FOUND');
            if (!['CHO_THU', 'THU_MOT_PHAN'].includes(row.trang_thai)) throw this.loi('Chỉ được miễn giảm phí đang chờ thu hoặc đã thu một phần');
            if (Number(data.so_tien_mien_giam) > Number(row.tien_con_lai)) throw this.loi('Số tiền miễn giảm vượt số tiền còn phải thu');
            const loai = row.loai_phi_phat_id ? await repo.layLoai(auth.donViId, row.loai_phi_phat_id, client) : null;
            if (loai && !loai.cho_phep_mien_giam) throw this.loi('Loại phí phạt này không cho phép miễn giảm');
            const ketQua = await repo.mienGiam(auth.donViId, row.id, data.so_tien_mien_giam, data.ly_do, auth.taiKhoanId, client);
            return { ...ketQua, request_id: requestId };
        });
    }
    async thuTien(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.thuTienHopLe(body);
        return trongGiaoDich(async client => {
            const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Phí phạt'), client, true);
            if (!row) throw this.loi('Không tìm thấy phí phạt', 404, 'NOT_FOUND');
            if (!['CHO_THU', 'THU_MOT_PHAN'].includes(row.trang_thai)) throw this.loi('Phí phạt không ở trạng thái có thể thu tiền');
            const soTien = Number(data.so_tien);
            if (soTien > Number(row.tien_con_lai)) throw this.loi('Số tiền thu vượt số tiền còn phải thu');
            const phuongThuc = await (async () => {
                const { query } = require('../../database/query.js');
                const { rows } = await query(
                    `SELECT * FROM phuong_thuc_thanh_toan WHERE don_vi_id = $1 AND id = $2 AND hoat_dong = TRUE LIMIT 1`,
                    [auth.donViId, data.phuong_thuc_id], client
                );
                return rows[0] ?? null;
            })();
            if (!phuongThuc) throw this.loi('Phương thức thanh toán không tồn tại hoặc đã ngừng hoạt động');
            const maGiaoDich = `PP-${row.ma_phieu}-${Date.now()}`;
            const giaoDich = await repo.taoGiaoDichThanhToan(auth.donViId, {
                chi_nhanh_id: auth.chiNhanhId ?? null,
                khach_hang_id: row.khach_hang_id ?? null,
                phuong_thuc_id: data.phuong_thuc_id,
                tai_khoan_nhan_id: data.tai_khoan_nhan_id,
                ma_giao_dich: maGiaoDich,
                so_tien: data.so_tien,
                khoa_chong_trung: `PHI_PHAT:${row.id}:${soTien}:${requestId}`,
                noi_dung: data.noi_dung ?? `Thu phí phạt ${row.ma_phieu}`,
                nguoi_thuc_hien_id: auth.taiKhoanId
            }, client);
            await repo.taoPhanBo(auth.donViId, giaoDich.id, row.id, data.so_tien, client);
            await repo.taoLienKetGiaoDich(auth.donViId, row.id, giaoDich.id, data.so_tien, client);
            const ketQua = await repo.capNhatTienDaThu(auth.donViId, row.id, data.so_tien, client);
            return { phi_phat: ketQua, giao_dich: giaoDich, request_id: requestId };
        });
    }
    async huy(auth, id, body, requestId) {
        await this.quyen(auth, 'circulation.update');
        const data = validation.huyHopLe(body);
        return trongGiaoDich(async client => {
            const row = await repo.layTheoId(auth.donViId, validation.bigIntHopLe(id, 'Phí phạt'), client, true);
            if (!row) throw this.loi('Không tìm thấy phí phạt', 404, 'NOT_FOUND');
            if (Number(row.tien_da_thu) > 0) throw this.loi('Phí phạt đã phát sinh giao dịch thu tiền, không được huỷ trực tiếp');
            const ketQua = await repo.huy(auth.donViId, row.id, data.ly_do, client);
            if (!ketQua) throw this.loi('Phí phạt không còn được phép huỷ', 409, 'CONCURRENT_UPDATE');
            return { ...ketQua, request_id: requestId };
        });
    }
}
module.exports = new PhiPhatService();