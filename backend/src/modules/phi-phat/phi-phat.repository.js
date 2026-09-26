const { query } = require('../../database/query.js');

class PhiPhatRepository {
    async layChiTietMuonTra(donViId, phieuId, chiTietId, client, khoa = false) {
        const { rows } = await query(
            `SELECT c.*, p.ma_phieu
             FROM chi_tiet_muon_tra c
             JOIN phieu_muon_tra p ON p.id = c.phieu_muon_tra_id AND p.don_vi_id = c.don_vi_id
             WHERE c.don_vi_id = $1 AND c.id = $2 AND c.phieu_muon_tra_id = $3
             LIMIT 1${khoa ? ' FOR UPDATE OF c, p' : ''}`,
            [donViId, chiTietId, phieuId], client
        );
        return rows[0] ?? null;
    }
    async layLoai(donViId, id, client) {
        const { rows } = await query(
            `SELECT *
             FROM loai_phi_phat
             WHERE don_vi_id = $1 AND id = $2 AND hoat_dong = TRUE
             LIMIT 1`,
            [donViId, id], client
        );
        return rows[0] ?? null;
    }
    async taoMaPhieu(donViId, client) {
        const { rows } = await query(
            `INSERT INTO bo_dem_ma_chung (don_vi_id, tien_to, ngay, gia_tri)
             VALUES ($1, 'PP', CURRENT_DATE, 1)
             ON CONFLICT (don_vi_id, tien_to, ngay)
             DO UPDATE SET gia_tri = bo_dem_ma_chung.gia_tri + 1
             RETURNING gia_tri`,
            [donViId], client
        );
        const so = Number(rows[0].gia_tri);
        if (so > 99999) throw new Error('Đã vượt số lượng mã phí phạt trong ngày');
        const { rows: ngayRows } = await query(`SELECT to_char(CURRENT_DATE, 'YYMMDD') AS ngay`, [], client);
        return `PP${ngayRows[0].ngay}${String(so).padStart(5, '0')}`;
    }
    async taoPhiPhat(donViId, data, client) {
        const { rows } = await query(
            `INSERT INTO phi_phat (
                don_vi_id, phieu_muon_tra_id, chi_tiet_muon_tra_id, loai_phi_phat_id,
                loai, ma_phieu, so_ngay_qua_han, so_luong, don_gia,
                tien_goc, tien_giam, tien_mien_phi, tien_phai_thu, tien_da_thu,
                tien_con_lai, tien_te, ly_do, ghi_chu, trang_thai, nguoi_tao_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,0,0,$10,0,$10,'VND',$11,$12,$13,$14)
             RETURNING *`,
            [donViId, data.phieu_muon_tra_id, data.chi_tiet_muon_tra_id, data.loai_phi_phat_id, data.loai, data.ma_phieu, data.so_ngay_qua_han, data.so_luong, data.don_gia, data.tien_goc, data.ly_do, data.ghi_chu, data.trang_thai, data.nguoi_tao_id], client
        );
        return rows[0];
    }
    async layTheoId(donViId, id, client, khoa = false) {
        const { rows } = await query(
            `SELECT p.*,
                    c.phien_ban_sach_id,
                    c.hinh_thuc,
                    c.ngay_han_tra,
                    c.so_luong,
                    c.so_luong_da_tra
             FROM phi_phat p
             JOIN chi_tiet_muon_tra c ON c.id = p.chi_tiet_muon_tra_id AND c.don_vi_id = p.don_vi_id
             WHERE p.don_vi_id = $1 AND p.id = $2
             LIMIT 1${khoa ? ' FOR UPDATE OF p, c' : ''}`,
            [donViId, id], client
        );
        return rows[0] ?? null;
    }
    async danhSach(donViId, boLoc, client) {
        const offset = (boLoc.trang - 1) * boLoc.kich_thuoc;
        const { rows } = await query(
            `SELECT p.*,
                    COUNT(*) OVER()::integer AS tong_so
             FROM phi_phat p
             WHERE p.don_vi_id = $1
               AND ($2::bigint IS NULL OR p.phieu_muon_tra_id = $2)
               AND ($3::bigint IS NULL OR p.chi_tiet_muon_tra_id = $3)
               AND ($4::text IS NULL OR p.loai = $4)
               AND ($5::text IS NULL OR p.trang_thai = $5)
               AND ($6::timestamptz IS NULL OR p.ngay_phat_sinh >= $6)
               AND ($7::timestamptz IS NULL OR p.ngay_phat_sinh <= $7)
             ORDER BY p.ngay_phat_sinh DESC, p.id DESC
             LIMIT $8 OFFSET $9`,
            [donViId, boLoc.phieu_muon_tra_id, boLoc.chi_tiet_muon_tra_id, boLoc.loai, boLoc.trang_thai, boLoc.tu_ngay, boLoc.den_ngay, boLoc.kich_thuoc, offset], client
        );
        return { items: rows, tong_so: rows[0]?.tong_so ?? 0, trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc };
    }
    async capNhatTrangThai(donViId, id, trangThai, lyDo, nguoiDuyetId, client) {
        const { rows } = await query(
            `UPDATE phi_phat
             SET trang_thai = $3,
                 ly_do = COALESCE($4, ly_do),
                 nguoi_duyet_id = $5,
                 ngay_duyet = now(),
                 ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2
             RETURNING *`,
            [donViId, id, trangThai, lyDo ?? null, nguoiDuyetId], client
        );
        return rows[0] ?? null;
    }
    async mienGiam(donViId, id, soTien, lyDo, nguoiId, client) {
        await query(
            `INSERT INTO mien_giam_phi_phat (don_vi_id, phi_phat_id, so_tien_mien_giam, ly_do, nguoi_thuc_hien_id)
             VALUES ($1,$2,$3,$4,$5)`,
            [donViId, id, soTien, lyDo, nguoiId], client
        );
        const { rows } = await query(
            `UPDATE phi_phat
             SET tien_giam = tien_giam + $3,
                 tien_phai_thu = GREATEST(tien_goc - tien_giam - $3 - tien_mien_phi, 0),
                 tien_con_lai = GREATEST(tien_goc - tien_giam - $3 - tien_mien_phi - tien_da_thu, 0),
                 trang_thai = CASE WHEN GREATEST(tien_goc - tien_giam - $3 - tien_mien_phi - tien_da_thu, 0) = 0 THEN 'DA_THU' ELSE trang_thai END,
                 ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2
             RETURNING *`,
            [donViId, id, soTien], client
        );
        return rows[0] ?? null;
    }
    async taoGiaoDichThanhToan(donViId, data, client) {
        const { rows } = await query(
            `INSERT INTO giao_dich_thanh_toan (
                don_vi_id, chi_nhanh_id, khach_hang_id, phuong_thuc_id,
                tai_khoan_nhan_id, ma_giao_dich, loai_giao_dich, so_tien,
                trang_thai, khoa_chong_trung, noi_dung, nguoi_thuc_hien_id,
                thoi_gian_thanh_cong
             ) VALUES ($1,$2,$3,$4,$5,$6,'THU',$7,'THANH_CONG',$8,$9,$10,now())
             RETURNING *`,
            [donViId, data.chi_nhanh_id, data.khach_hang_id, data.phuong_thuc_id, data.tai_khoan_nhan_id, data.ma_giao_dich, data.so_tien, data.khoa_chong_trung, data.noi_dung, data.nguoi_thuc_hien_id], client
        );
        return rows[0];
    }
    async taoPhanBo(donViId, giaoDichId, phiPhatId, soTien, client) {
        await query(
            `INSERT INTO phan_bo_thanh_toan (
                don_vi_id, giao_dich_id, loai_doi_tuong, doi_tuong_id, so_tien
             ) VALUES ($1,$2,'PHI_PHAT',$3,$4)`,
            [donViId, giaoDichId, phiPhatId, soTien], client
        );
    }
    async capNhatTienDaThu(donViId, id, soTien, client) {
        const { rows } = await query(
            `UPDATE phi_phat
             SET tien_da_thu = tien_da_thu + $3,
                 tien_con_lai = GREATEST(tien_phai_thu - tien_da_thu - $3, 0),
                 trang_thai = CASE
                    WHEN GREATEST(tien_phai_thu - tien_da_thu - $3, 0) = 0 THEN 'DA_THU'
                    ELSE 'THU_MOT_PHAN'
                 END,
                 ngay_hoan_tat = CASE
                    WHEN GREATEST(tien_phai_thu - tien_da_thu - $3, 0) = 0 THEN now()
                    ELSE ngay_hoan_tat
                 END,
                 ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2
             RETURNING *`,
            [donViId, id, soTien], client
        );
        return rows[0] ?? null;
    }
    async taoLienKetGiaoDich(donViId, phiPhatId, giaoDichId, soTien, client) {
        const { rows } = await query(
            `INSERT INTO giao_dich_phi_phat (
                don_vi_id, phi_phat_id, giao_dich_thanh_toan_id, so_tien, loai
             ) VALUES ($1,$2,$3,$4,'THU')
             RETURNING *`,
            [donViId, phiPhatId, giaoDichId, soTien], client
        );
        return rows[0];
    }
    async huy(donViId, id, lyDo, client) {
        const { rows } = await query(
            `UPDATE phi_phat
             SET trang_thai = 'HUY',
                 ly_do_huy = $3,
                 ngay_huy = now(),
                 ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2
               AND trang_thai IN ('CHO_DUYET','CHO_THU','THU_MOT_PHAN')
             RETURNING *`,
            [donViId, id, lyDo], client
        );
        return rows[0] ?? null;
    }
}

module.exports = new PhiPhatRepository();