const databasePool = require('../../database/pool.js');

function ketNoi(client) {
    return client || pool;
}

class AiRepository {
    async laySachTheoId(donViId, sachId, client = null) {
        const db = ketNoi(client);
        const { rows } = await db.query(
            `SELECT s.*
             FROM sach s
             WHERE s.id = $1
               AND s.don_vi_id = $2
             LIMIT 1`,
            [sachId, donViId]
        );
        return rows[0] || null;
    }

    async timSachTheoDieuKien(donViId, dieuKien = {}, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['s.don_vi_id = $1'];
        if (dieuKien.tu_khoa) {
            params.push(`%${dieuKien.tu_khoa}%`);
            dieuKhoan.push(`(LOWER(s.ten) LIKE LOWER($${params.length}) OR LOWER(COALESCE(s.ma_sach, '')) LIKE LOWER($${params.length}))`);
        }
        if (dieuKien.the_loai) {
            params.push(`%${dieuKien.the_loai}%`);
            dieuKhoan.push(`LOWER(COALESCE(s.the_loai, '')) LIKE LOWER($${params.length})`);
        }
        if (dieuKien.tac_gia) {
            params.push(`%${dieuKien.tac_gia}%`);
            dieuKhoan.push(`LOWER(COALESCE(s.tac_gia, '')) LIKE LOWER($${params.length})`);
        }
        const gioiHan = Math.min(Number(dieuKien.gioi_han || 50), 50);
        params.push(gioiHan);
        const { rows } = await db.query(
            `SELECT s.*
             FROM sach s
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY s.id DESC
             LIMIT $${params.length}`,
            params
        );
        return rows;
    }

    async layTonKhoSach(donViId, sachId = null, chiNhanhId = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['k.don_vi_id = $1'];
        if (sachId) {
            params.push(sachId);
            dieuKhoan.push(`k.sach_id = $${params.length}`);
        }
        if (chiNhanhId) {
            params.push(chiNhanhId);
            dieuKhoan.push(`k.chi_nhanh_id = $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT k.*
             FROM ton_kho k
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY k.so_luong_ton ASC`,
            params
        );
        return rows;
    }

    async laySachSapHet(donViId, chiNhanhId = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['k.don_vi_id = $1', 'COALESCE(k.so_luong_ton, 0) <= COALESCE(k.muc_ton_thap, 0)'];
        if (chiNhanhId) {
            params.push(chiNhanhId);
            dieuKhoan.push(`k.chi_nhanh_id = $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT k.*, s.ten AS ten_sach, s.ma_sach
             FROM ton_kho k
             JOIN sach s ON s.id = k.sach_id AND s.don_vi_id = k.don_vi_id
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY k.so_luong_ton ASC`,
            params
        );
        return rows;
    }

    async layPhieuMuonTra(donViId, phieuId = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['p.don_vi_id = $1'];
        if (phieuId) {
            params.push(phieuId);
            dieuKhoan.push(`p.id = $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT p.*
             FROM muon_tra p
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY p.id DESC
             LIMIT 50`,
            params
        );
        return rows;
    }

    async laySachQuaHan(donViId, client = null) {
        const db = ketNoi(client);
        const { rows } = await db.query(
            `SELECT p.id AS phieu_id,
                    p.ma_phieu,
                    p.khach_hang_id,
                    p.ngay_hen_tra,
                    c.id AS chi_tiet_id,
                    c.cuon_sach_id,
                    c.trang_thai
             FROM muon_tra p
             JOIN chi_tiet_muon_tra c ON c.don_vi_id = p.don_vi_id AND c.muon_tra_id = p.id
             WHERE p.don_vi_id = $1
               AND c.trang_thai = 'QUA_HAN'
             ORDER BY p.ngay_hen_tra ASC`,
            [donViId]
        );
        return rows;
    }

    async layDatTruocTheoSach(donViId, sachId = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['d.don_vi_id = $1'];
        if (sachId) {
            params.push(sachId);
            dieuKhoan.push(`c.phien_ban_sach_id = $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT d.id AS dat_truoc_id,
                    d.ma_dat_truoc,
                    d.trang_thai,
                    d.ngay_dat,
                    c.id AS chi_tiet_id,
                    c.phien_ban_sach_id,
                    c.so_luong,
                    c.so_luong_da_phan_bo,
                    c.so_luong_da_nhan
             FROM dat_truoc d
             JOIN chi_tiet_dat_truoc c ON c.don_vi_id = d.don_vi_id AND c.dat_truoc_id = d.id
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY d.ngay_dat DESC`,
            params
        );
        return rows;
    }

    async layPhiPhat(donViId, tuNgay = null, denNgay = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['p.don_vi_id = $1'];
        if (tuNgay) {
            params.push(tuNgay);
            dieuKhoan.push(`p.ngay_tao >= $${params.length}`);
        }
        if (denNgay) {
            params.push(denNgay);
            dieuKhoan.push(`p.ngay_tao <= $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT p.*
             FROM phi_phat p
             WHERE ${dieuKhoan.join(' AND ')}
             ORDER BY p.ngay_tao DESC
             LIMIT 500`,
            params
        );
        return rows;
    }

    async layThongKeSach(donViId, tuNgay = null, denNgay = null, client = null) {
        const db = ketNoi(client);
        const params = [donViId];
        const dieuKhoan = ['p.don_vi_id = $1'];
        if (tuNgay) {
            params.push(tuNgay);
            dieuKhoan.push(`p.ngay_tao >= $${params.length}`);
        }
        if (denNgay) {
            params.push(denNgay);
            dieuKhoan.push(`p.ngay_tao <= $${params.length}`);
        }
        const { rows } = await db.query(
            `SELECT c.cuon_sach_id,
                    COUNT(*) AS so_luot_muon,
                    COUNT(*) FILTER (WHERE c.trang_thai = 'QUA_HAN') AS so_luot_qua_han
             FROM muon_tra p
             JOIN chi_tiet_muon_tra c ON c.don_vi_id = p.don_vi_id AND c.muon_tra_id = p.id
             WHERE ${dieuKhoan.join(' AND ')}
             GROUP BY c.cuon_sach_id
             ORDER BY so_luot_muon DESC`,
            params
        );
        return rows;
    }

    async layDuLieuTongHop(donViId, tuNgay = null, denNgay = null, client = null) {
        const [quaHan, phiPhat, datTruoc, thongKeSach] = await Promise.all([
            this.laySachQuaHan(donViId, client),
            this.layPhiPhat(donViId, tuNgay, denNgay, client),
            this.layDatTruocTheoSach(donViId, null, client),
            this.layThongKeSach(donViId, tuNgay, denNgay, client)
        ]);
        return { qua_han: quaHan, phi_phat: phiPhat, dat_truoc: datTruoc, thong_ke_sach: thongKeSach };
    }
}

module.exports = new AiRepository();