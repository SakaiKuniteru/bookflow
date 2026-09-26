const { query } = require('../../database/query.js');

class GiaHanRepository {
    async layPhieu(donViId, phieuId, client, khoa = false) {
        const { rows } = await query(
            `SELECT p.*
             FROM phieu_muon_tra p
             WHERE p.don_vi_id = $1 AND p.id = $2
             LIMIT 1${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, phieuId], client
        );
        return rows[0] ?? null;
    }
    async layChiTiet(donViId, phieuId, chiTietId, client, khoa = false) {
        const { rows } = await query(
            `SELECT c.*
             FROM chi_tiet_muon_tra c
             WHERE c.don_vi_id = $1 AND c.id = $2 AND c.phieu_muon_tra_id = $3
             LIMIT 1${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, chiTietId, phieuId], client
        );
        return rows[0] ?? null;
    }
    async layCauHinh(donViId, hinhThuc, client) {
        const { rows } = await query(
            `SELECT *
             FROM cau_hinh_gia_han
             WHERE don_vi_id = $1 AND hinh_thuc = $2 AND hoat_dong = TRUE
             LIMIT 1`,
            [donViId, hinhThuc], client
        );
        return rows[0] ?? null;
    }
    async demSoLanGiaHan(donViId, chiTietId, client) {
        const { rows } = await query(
            `SELECT COUNT(*)::integer AS so_lan
             FROM gia_han_muon_tra
             WHERE don_vi_id = $1 AND chi_tiet_muon_tra_id = $2 AND trang_thai = 'DA_DUYET'`,
            [donViId, chiTietId], client
        );
        return rows[0].so_lan;
    }
    async lanGiaHanTiepTheo(donViId, chiTietId, client) {
        const { rows } = await query(
            `SELECT COALESCE(MAX(lan_gia_han), 0) + 1 AS lan_gia_han
             FROM gia_han_muon_tra
             WHERE don_vi_id = $1 AND chi_tiet_muon_tra_id = $2`,
            [donViId, chiTietId], client
        );
        return Number(rows[0].lan_gia_han);
    }
    async coPhiPhatChuaXuLy(donViId, chiTietId, client) {
        const { rows } = await query(
            `SELECT COALESCE(SUM(tien_con_lai), 0)::numeric AS tien_con_lai
             FROM phi_phat
             WHERE don_vi_id = $1 AND chi_tiet_muon_tra_id = $2
               AND trang_thai IN ('CHO_DUYET','CHO_THU','THU_MOT_PHAN')`,
            [donViId, chiTietId], client
        );
        return rows[0].tien_con_lai;
    }
    async coDatTruocDangCho(donViId, chiTietId, client) {
        const { rows } = await query(
            `SELECT EXISTS (
                SELECT 1
                FROM dat_truoc
                WHERE don_vi_id = $1
                  AND chi_tiet_muon_tra_id = $2
                  AND trang_thai IN ('CHO_XU_LY','DA_XAC_NHAN','SAN_SANG')
            ) AS ton_tai`,
            [donViId, chiTietId], client
        );
        return rows[0].ton_tai;
    }
    async tao(donViId, data, client) {
        const { rows } = await query(
            `INSERT INTO gia_han_muon_tra (
                don_vi_id, phieu_muon_tra_id, chi_tiet_muon_tra_id, lan_gia_han,
                ngay_han_cu, ngay_han_moi, so_ngay_gia_han, ly_do,
                trang_thai, nguoi_yeu_cau_id, ngay_yeu_cau
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,now())
             RETURNING *`,
            [donViId, data.phieu_muon_tra_id, data.chi_tiet_muon_tra_id, data.lan_gia_han, data.ngay_han_cu, data.ngay_han_moi, data.so_ngay_gia_han, data.ly_do, data.trang_thai, data.nguoi_yeu_cau_id], client
        );
        return rows[0];
    }
    async capNhatHanTra(donViId, chiTietId, ngayHanMoi, client) {
        const { rows } = await query(
            `UPDATE chi_tiet_muon_tra
             SET ngay_han_tra = $3, ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2
             RETURNING *`,
            [donViId, chiTietId, ngayHanMoi], client
        );
        return rows[0] ?? null;
    }
    async duyet(donViId, id, trangThai, lyDo, nguoiDuyetId, client) {
        const { rows } = await query(
            `UPDATE gia_han_muon_tra
             SET trang_thai = $3,
                 ly_do = CASE WHEN $4::text IS NULL THEN ly_do ELSE $4 END,
                 nguoi_duyet_id = $5,
                 ngay_duyet = now(),
                 ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'CHO_DUYET'
             RETURNING *`,
            [donViId, id, trangThai, lyDo ?? null, nguoiDuyetId], client
        );
        return rows[0] ?? null;
    }
    async huy(donViId, id, lyDo, client) {
        const { rows } = await query(
            `UPDATE gia_han_muon_tra
             SET trang_thai = 'DA_HUY', ly_do = COALESCE($3, ly_do), ngay_cap_nhat = now()
             WHERE don_vi_id = $1 AND id = $2 AND trang_thai IN ('CHO_DUYET','DA_DUYET')
             RETURNING *`,
            [donViId, id, lyDo ?? null], client
        );
        return rows[0] ?? null;
    }
    async layTheoId(donViId, id, client) {
        const { rows } = await query(
            `SELECT g.*,
                    p.ma_phieu AS ma_phieu_muon_tra,
                    c.phien_ban_sach_id,
                    c.so_luong,
                    c.ngay_han_tra
             FROM gia_han_muon_tra g
             JOIN phieu_muon_tra p ON p.id = g.phieu_muon_tra_id AND p.don_vi_id = g.don_vi_id
             JOIN chi_tiet_muon_tra c ON c.id = g.chi_tiet_muon_tra_id AND c.don_vi_id = g.don_vi_id
             WHERE g.don_vi_id = $1 AND g.id = $2`,
            [donViId, id], client
        );
        return rows[0] ?? null;
    }
    async danhSach(donViId, boLoc, client) {
        const offset = (boLoc.trang - 1) * boLoc.kich_thuoc;
        const { rows } = await query(
            `SELECT g.*,
                    p.ma_phieu AS ma_phieu_muon_tra,
                    c.phien_ban_sach_id,
                    COUNT(*) OVER()::integer AS tong_so
             FROM gia_han_muon_tra g
             JOIN phieu_muon_tra p ON p.id = g.phieu_muon_tra_id AND p.don_vi_id = g.don_vi_id
             JOIN chi_tiet_muon_tra c ON c.id = g.chi_tiet_muon_tra_id AND c.don_vi_id = g.don_vi_id
             WHERE g.don_vi_id = $1
               AND ($2::bigint IS NULL OR g.phieu_muon_tra_id = $2)
               AND ($3::bigint IS NULL OR g.chi_tiet_muon_tra_id = $3)
               AND ($4::text IS NULL OR g.trang_thai = $4)
               AND ($5::timestamptz IS NULL OR g.ngay_tao >= $5)
               AND ($6::timestamptz IS NULL OR g.ngay_tao <= $6)
             ORDER BY g.ngay_tao DESC, g.id DESC
             LIMIT $7 OFFSET $8`,
            [donViId, boLoc.phieu_muon_tra_id, boLoc.chi_tiet_muon_tra_id, boLoc.trang_thai, boLoc.tu_ngay, boLoc.den_ngay, boLoc.kich_thuoc, offset], client
        );
        return { items: rows, tong_so: rows[0]?.tong_so ?? 0, trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc };
    }
}

module.exports = new GiaHanRepository();