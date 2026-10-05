const { query } = require('../../database/query.js');

class TaiKhoanRepository {
    async chenTaiKhoan({ email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam }, client) {
        const { rows } = await query('INSERT INTO tai_khoan (email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam) VALUES ($1, $2, $3, $4, $5) RETURNING id, email, ho_ten, ten_dang_nhap, so_dien_thoai, trang_thai, email_da_xac_minh, ngay_tao', [email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam], client);
        return rows[0];
    }
    async taoTaiKhoanDaXacMinh({ email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam }, client) {
        const { rows } = await query(
            `INSERT INTO tai_khoan (email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam, email_da_xac_minh, trang_thai)
            VALUES ($1, $2, $3, $4, $5, TRUE, 'DANG_DUNG')
            RETURNING id, email, ho_ten, ten_dang_nhap, so_dien_thoai, trang_thai, email_da_xac_minh, ngay_tao`,
            [email, ho_ten, ten_dang_nhap, so_dien_thoai, mat_khau_bam],
            client
        );
        return rows[0];
    }
    async layHoSoTheoId(taiKhoanId, client) {
        const { rows } = await query("SELECT id, ten_dang_nhap, email, ho_ten, ngay_sinh, gioi_tinh, quoc_tich, dan_toc, mo_ta, dia_chi_chi_tiet, quoc_gia, tinh_thanh_pho, phuong_xa, so_dien_thoai, anh_dai_dien_tep_id, email_da_xac_minh, so_dien_thoai_da_xac_minh, trang_thai, ngay_tao, ngay_cap_nhat FROM tai_khoan WHERE id = $1 AND trang_thai <> 'DA_DONG'", [taiKhoanId], client);
        return rows[0] ?? null;
    }
    async capNhatHoSo(taiKhoanId, hoSo) {
        const { rows } = await query("UPDATE tai_khoan SET ho_ten = $2, ngay_sinh = $3, gioi_tinh = $4, quoc_tich = $5, dan_toc = $6, mo_ta = $7, dia_chi_chi_tiet = $8, quoc_gia = $9, tinh_thanh_pho = $10, phuong_xa = $11, ngay_cap_nhat = now() WHERE id = $1 AND trang_thai = 'DANG_DUNG' RETURNING id, ten_dang_nhap, email, ho_ten, ngay_sinh, gioi_tinh, quoc_tich, dan_toc, mo_ta, dia_chi_chi_tiet, quoc_gia, tinh_thanh_pho, phuong_xa, so_dien_thoai, anh_dai_dien_tep_id, email_da_xac_minh, so_dien_thoai_da_xac_minh, trang_thai, ngay_tao, ngay_cap_nhat", [taiKhoanId, hoSo.ho_ten, hoSo.ngay_sinh, hoSo.gioi_tinh, hoSo.quoc_tich, hoSo.dan_toc, hoSo.mo_ta, hoSo.dia_chi_chi_tiet, hoSo.quoc_gia, hoSo.tinh_thanh_pho, hoSo.phuong_xa]);
        return rows[0] ?? null;
    }
    async anhDaiDienThuocTaiKhoan(taiKhoanId, tepId, client) {
        const { rowCount } = await query("SELECT id FROM tep_dinh_kem WHERE id = $1 AND tai_khoan_so_huu_id = $2 AND nguoi_tai_len_id = $2 AND don_vi_so_huu_id IS NULL AND loai_tep = 'ANH_DAI_DIEN' AND pham_vi_truy_cap = 'RIENG_TU' AND trang_thai = 'SAN_SANG' AND trang_thai_quet_virus = 'SACH'", [tepId, taiKhoanId], client);
        return rowCount > 0;
    }
    async capNhatAnhDaiDien(taiKhoanId, tepId, client) {
        const { rows } = await query("UPDATE tai_khoan SET anh_dai_dien_tep_id = $2, ngay_cap_nhat = now() WHERE id = $1 AND trang_thai = 'DANG_DUNG' RETURNING id, ten_dang_nhap, email, ho_ten, so_dien_thoai, anh_dai_dien_tep_id, email_da_xac_minh, so_dien_thoai_da_xac_minh, trang_thai, ngay_tao, ngay_cap_nhat", [taiKhoanId, tepId], client);
        return rows[0] ?? null;
    }
}

module.exports = new TaiKhoanRepository();
