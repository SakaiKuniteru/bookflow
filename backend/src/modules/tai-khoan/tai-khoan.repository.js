const { query } = require('../../database/query.js');

class TaiKhoanRepository {
    async chenTaiKhoan({ email, ho_ten, mat_khau_bam }, client) {
        const { rows } = await query('INSERT INTO tai_khoan (email, ho_ten, mat_khau_bam) VALUES ($1, $2, $3) RETURNING id, email, ho_ten, trang_thai, email_da_xac_minh, ngay_tao', [email, ho_ten, mat_khau_bam], client);
        return rows[0];
    }

    async layHoSoTheoId(taiKhoanId, client) {
        const { rows } = await query("SELECT id, email, ho_ten, so_dien_thoai, email_da_xac_minh, so_dien_thoai_da_xac_minh, trang_thai, ngay_tao FROM tai_khoan WHERE id = $1 AND trang_thai <> 'DA_DONG'", [taiKhoanId], client);
        return rows[0] ?? null;
    }
}

module.exports = new TaiKhoanRepository();