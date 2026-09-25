const { query } = require('../../database/query.js');

class XacThucRepository {
    async timTaiKhoan(dinhDanh, client) {
        const { rows } = await query('SELECT * FROM tai_khoan WHERE lower(email) = $1 OR lower(ten_dang_nhap) = $1 LIMIT 1', [dinhDanh], client);
        return rows[0] ?? null;
    }

    async timTaiKhoanTheoEmail(email, client) {
        const { rows } = await query('SELECT * FROM tai_khoan WHERE lower(email) = $1 LIMIT 1', [email], client);
        return rows[0] ?? null;
    }

    async khoaTaiKhoan(id, client) {
        const { rows } = await query('SELECT * FROM tai_khoan WHERE id = $1 FOR UPDATE', [id], client);
        return rows[0] ?? null;
    }

    async taoOtp(taiKhoanId, email, mucDich, maBam, soLanGui, client) {
        const { rows } = await query(
            `INSERT INTO ma_xac_minh (tai_khoan_id, dia_chi_dich, muc_dich, ma_bam, ngay_het_han, ngay_gui_cuoi, so_lan_gui)
             VALUES ($1, $2, $3, $4, now() + interval '10 minutes', now(), $5) RETURNING id`,
            [taiKhoanId, email, mucDich, maBam, soLanGui], client
        );
        return rows[0];
    }

    async otpGanNhat(taiKhoanId, mucDich, client) {
        const { rows } = await query(
            `SELECT * FROM ma_xac_minh WHERE tai_khoan_id = $1 AND muc_dich = $2
             ORDER BY ngay_tao DESC, id DESC LIMIT 1 FOR UPDATE`,
            [taiKhoanId, mucDich], client
        );
        return rows[0] ?? null;
    }

    async soOtpTrongNgay(taiKhoanId, mucDich, client) {
        const { rows } = await query(
            `SELECT count(*)::int AS so_lan FROM ma_xac_minh
             WHERE tai_khoan_id = $1 AND muc_dich = $2 AND ngay_tao > now() - interval '24 hours'`,
            [taiKhoanId, mucDich], client
        );
        return rows[0].so_lan;
    }

    async huyOtpCu(taiKhoanId, mucDich, client) {
        await query('UPDATE ma_xac_minh SET ngay_su_dung = now() WHERE tai_khoan_id = $1 AND muc_dich = $2 AND ngay_su_dung IS NULL', [taiKhoanId, mucDich], client);
    }

    async tangLanThuOtp(id, client) {
        await query('UPDATE ma_xac_minh SET so_lan_thu = so_lan_thu + 1 WHERE id = $1 AND so_lan_thu < 5', [id], client);
    }

    async suDungOtp(id, client) {
        await query('UPDATE ma_xac_minh SET ngay_su_dung = now() WHERE id = $1 AND ngay_su_dung IS NULL', [id], client);
    }

    async xacMinhEmail(taiKhoanId, client) {
        const { rows } = await query(
            `UPDATE tai_khoan SET email_da_xac_minh = TRUE, trang_thai = 'DANG_DUNG'
             WHERE id = $1 AND trang_thai = 'CHO_XAC_MINH' RETURNING id, email, ho_ten`,
            [taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async taoPhienDb(taiKhoanId, maRefreshBam, client, donViId = null, chiNhanhId = null, thoiHanPhut = 120) {
        const { rows } = await query(
            `INSERT INTO phien_dang_nhap (
                tai_khoan_id, ma_phien_bam, csrf_token_bam, ngay_het_han,
                phien_ban_xac_thuc, nen_tang, don_vi_dang_chon_id, chi_nhanh_dang_chon_id
             )
             SELECT
                id, $2, NULL, now() + ($5::integer * interval '1 minute'),
                phien_ban_xac_thuc, 'API', $3, $4
             FROM tai_khoan
             WHERE id = $1
               AND trang_thai = 'DANG_DUNG'
               AND email_da_xac_minh = TRUE
               AND bat_buoc_doi_mat_khau = FALSE
               AND (khoa_den IS NULL OR khoa_den <= now())
             RETURNING
                id, ngay_het_han, phien_ban_xac_thuc,
                don_vi_dang_chon_id, chi_nhanh_dang_chon_id`,
            [taiKhoanId, maRefreshBam, donViId, chiNhanhId, thoiHanPhut], client
        );
        return rows[0] ?? null;
    }

    async layPhienTheoId(phienId, taiKhoanId, client) {
        const { rows } = await query(
            `SELECT p.id, p.tai_khoan_id, p.phien_ban_xac_thuc,
                p.don_vi_dang_chon_id, p.chi_nhanh_dang_chon_id,
                t.email, t.ho_ten, t.ten_dang_nhap
             FROM phien_dang_nhap p
             JOIN tai_khoan t ON t.id = p.tai_khoan_id
             WHERE p.id = $1 AND p.tai_khoan_id = $2
               AND p.ngay_thu_hoi IS NULL AND p.ngay_het_han > now()
               AND p.phien_ban_xac_thuc = t.phien_ban_xac_thuc
               AND t.trang_thai = 'DANG_DUNG'
               AND t.email_da_xac_minh = TRUE
               AND t.bat_buoc_doi_mat_khau = FALSE
               AND (t.khoa_den IS NULL OR t.khoa_den <= now())`,
            [phienId, taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async layPhienTheoRefresh(maRefreshBam, client) {
        const { rows } = await query(
            `SELECT p.id, p.tai_khoan_id, p.phien_ban_xac_thuc,
                p.don_vi_dang_chon_id, p.chi_nhanh_dang_chon_id, p.ngay_het_han,
                t.email, t.ho_ten, t.ten_dang_nhap
             FROM phien_dang_nhap p
             JOIN tai_khoan t ON t.id = p.tai_khoan_id
             WHERE p.ma_phien_bam = $1
               AND p.ngay_thu_hoi IS NULL AND p.ngay_het_han > now()
               AND p.phien_ban_xac_thuc = t.phien_ban_xac_thuc
               AND t.trang_thai = 'DANG_DUNG'
               AND t.email_da_xac_minh = TRUE
               AND t.bat_buoc_doi_mat_khau = FALSE
               AND (t.khoa_den IS NULL OR t.khoa_den <= now())
             FOR UPDATE OF p`,
            [maRefreshBam], client
        );
        return rows[0] ?? null;
    }

    async xoayRefreshToken(phienId, maCu, maMoi, client) {
        const { rowCount } = await query(
            `UPDATE phien_dang_nhap
             SET ma_phien_bam = $3, lan_su_dung_cuoi = now()
             WHERE id = $1 AND ma_phien_bam = $2
               AND ngay_thu_hoi IS NULL AND ngay_het_han > now()`,
            [phienId, maCu, maMoi], client
        );
        return rowCount === 1;
    }

    async thuHoiPhien(id, lyDo, client) {
        const { rowCount } = await query(
            `UPDATE phien_dang_nhap SET ngay_thu_hoi = now(), ly_do_thu_hoi = $2
             WHERE id = $1 AND ngay_thu_hoi IS NULL AND ngay_het_han > now()`,
            [id, lyDo], client
        );
        return rowCount === 1;
    }

    async thuHoiTatCaPhien(id, lyDo, client) {
        await query(
            `UPDATE phien_dang_nhap SET ngay_thu_hoi = now(), ly_do_thu_hoi = $2
             WHERE tai_khoan_id = $1 AND ngay_thu_hoi IS NULL`,
            [id, lyDo], client
        );
    }

    async capNhatMatKhau(id, matKhauBam, client, kichHoat = false) {
        const { rows } = await query(
            `UPDATE tai_khoan SET mat_khau_bam = $2, phien_ban_xac_thuc = phien_ban_xac_thuc + 1,
                bat_buoc_doi_mat_khau = FALSE, mat_khau_tam_het_han = NULL, don_vi_kich_hoat_id = NULL,
                email_da_xac_minh = CASE WHEN $3 THEN TRUE ELSE email_da_xac_minh END,
                trang_thai = CASE WHEN $3 THEN 'DANG_DUNG' ELSE trang_thai END,
                so_lan_dang_nhap_sai = 0, khoa_den = NULL
             WHERE id = $1 RETURNING id, email, ho_ten, ten_dang_nhap`,
            [id, matKhauBam, kichHoat], client
        );
        return rows[0] ?? null;
    }

    async tangDangNhapSai(id, client) {
        await query(
            `UPDATE tai_khoan SET so_lan_dang_nhap_sai = so_lan_dang_nhap_sai + 1,
                khoa_den = CASE WHEN so_lan_dang_nhap_sai + 1 >= 5
                    THEN now() + interval '15 minutes' ELSE khoa_den END
             WHERE id = $1`,
            [id], client
        );
    }

    async dangNhapThanhCong(id, client) {
        await query('UPDATE tai_khoan SET so_lan_dang_nhap_sai = 0, khoa_den = NULL, ngay_dang_nhap_cuoi = now() WHERE id = $1', [id], client);
    }

    async ghiNhatKyDangNhap(id, dinhDanh, ketQua, client) {
        await query('INSERT INTO nhat_ky_dang_nhap (tai_khoan_id, email_da_nhap, ket_qua) VALUES ($1, $2, $3)', [id, dinhDanh.includes('@') ? dinhDanh : null, ketQua], client);
    }

    async capNhatThanhVienKichHoat(taiKhoanId, donViId, client) {
        await query(
            `UPDATE thanh_vien_don_vi SET trang_thai = 'DANG_LAM', ngay_gia_nhap = now()
             WHERE tai_khoan_id = $1 AND don_vi_id = $2 AND trang_thai = 'CHO_MOI'`,
            [taiKhoanId, donViId], client
        );
    }

    async chonDonViPhien(phienId, taiKhoanId, donViId, client) {
        const { rows } = await query(
            `UPDATE phien_dang_nhap p SET don_vi_dang_chon_id = $3, chi_nhanh_dang_chon_id = NULL
             WHERE p.id = $1 AND p.tai_khoan_id = $2
               AND p.ngay_thu_hoi IS NULL
               AND p.ngay_het_han > now()
               AND EXISTS (
                   SELECT 1 FROM thanh_vien_don_vi tv JOIN don_vi d ON d.id = tv.don_vi_id
                   WHERE tv.don_vi_id = $3 AND tv.tai_khoan_id = $2
                     AND tv.trang_thai = 'DANG_LAM' AND d.trang_thai = 'DANG_DUNG'
               )
             RETURNING p.don_vi_dang_chon_id`,
            [phienId, taiKhoanId, donViId], client
        );
        return rows[0] ?? null;
    }

    async coQuyenQuanLyNhanVien(taiKhoanId, donViId, client) {
        const { rows } = await query(
            `SELECT EXISTS (
                SELECT 1 FROM thanh_vien_don_vi tv
                JOIN thanh_vien_vai_tro tvvt ON tvvt.thanh_vien_don_vi_id = tv.id AND tvvt.don_vi_id = tv.don_vi_id
                JOIN vai_tro vt ON vt.id = tvvt.vai_tro_id AND vt.don_vi_id = tv.don_vi_id
                JOIN vai_tro_quyen vtq ON vtq.vai_tro_id = vt.id AND vtq.don_vi_id = tv.don_vi_id
                JOIN quyen q ON q.id = vtq.quyen_id
                JOIN don_vi d ON d.id = tv.don_vi_id
                WHERE tv.tai_khoan_id = $1 AND tv.don_vi_id = $2
                  AND tv.trang_thai = 'DANG_LAM' AND d.trang_thai = 'DANG_DUNG'
                  AND vt.trang_thai = 'DANG_DUNG' AND q.trang_thai = 'DANG_DUNG'
                  AND q.ma_quyen = 'members.manage' AND vtq.pham_vi = 'DON_VI'
                  AND tvvt.chi_nhanh_id IS NULL AND tvvt.ngay_bat_dau <= now()
                  AND (tvvt.ngay_ket_thuc IS NULL OR tvvt.ngay_ket_thuc > now())
             ) AS duoc_phep`,
            [taiKhoanId, donViId], client
        );
        return rows[0].duoc_phep;
    }

    async taoTaiKhoanNhanVien({ email, hoTen, tenDangNhap, matKhauBam, donViId }, client) {
        const { rows } = await query(
            `INSERT INTO tai_khoan (email, ho_ten, ten_dang_nhap, mat_khau_bam,
                bat_buoc_doi_mat_khau, mat_khau_tam_het_han, don_vi_kich_hoat_id)
             VALUES ($1, $2, $3, $4, TRUE, now() + interval '24 hours', $5)
             RETURNING id, email, ho_ten, ten_dang_nhap`,
            [email, hoTen, tenDangNhap, matKhauBam, donViId], client
        );
        return rows[0];
    }

    async taoThanhVien({ donViId, taiKhoanId, maNhanVien, chucDanh, email, soDienThoai, nguoiTaoId }, client) {
        const { rows } = await query(
            `INSERT INTO thanh_vien_don_vi (don_vi_id, tai_khoan_id, ma_nhan_vien, chuc_danh,
                email_cong_viec, so_dien_thoai_cong_viec, nguoi_tao_id, ngay_moi)
             VALUES ($1, $2, $3, $4, $5, $6, $7, now()) RETURNING id`,
            [donViId, taiKhoanId, maNhanVien, chucDanh, email, soDienThoai, nguoiTaoId], client
        );
        return rows[0];
    }

    async ganVaiTroNhanVien(donViId, thanhVienId, client) {
        const { rows } = await query(
            `INSERT INTO thanh_vien_vai_tro (don_vi_id, thanh_vien_don_vi_id, vai_tro_id)
             SELECT $1, $2, id FROM vai_tro
             WHERE don_vi_id = $1 AND ma_vai_tro = 'NHAN_VIEN' AND trang_thai = 'DANG_DUNG'
             RETURNING id`,
            [donViId, thanhVienId], client
        );
        return rows[0] ?? null;
    }

    async layNhanVienChoKichHoat(taiKhoanId, donViId, client) {
        const { rows } = await query(
            `SELECT tk.* FROM tai_khoan tk
             JOIN thanh_vien_don_vi tv ON tv.tai_khoan_id = tk.id AND tv.don_vi_id = $2
             WHERE tk.id = $1 AND tk.don_vi_kich_hoat_id = $2
               AND tk.bat_buoc_doi_mat_khau = TRUE AND tk.trang_thai = 'CHO_XAC_MINH'
               AND tv.trang_thai = 'CHO_MOI'
             FOR UPDATE OF tk`,
            [taiKhoanId, donViId], client
        );
        return rows[0] ?? null;
    }

    async datLaiMatKhauTam(taiKhoanId, matKhauBam, client) {
        await query(
            `UPDATE tai_khoan SET mat_khau_bam = $2, phien_ban_xac_thuc = phien_ban_xac_thuc + 1,
                mat_khau_tam_het_han = now() + interval '24 hours',
                so_lan_dang_nhap_sai = 0, khoa_den = NULL
             WHERE id = $1 AND bat_buoc_doi_mat_khau = TRUE`,
            [taiKhoanId, matKhauBam], client
        );
    }

    async ghiAuditNhanVien({ donViId, actorId, targetId, requestId, hanhDong }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai,
                doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1, $2, $3, 'tai_khoan', $4, 'THANH_CONG', 'Quản lý tài khoản nhân viên', $5, 'API')`,
            [donViId, actorId, hanhDong, targetId, requestId], client
        );
    }

    async layTaiKhoanAnToan(taiKhoanId, client) {
        const { rows } = await query(
            `SELECT id, email, ten_dang_nhap, ho_ten, so_dien_thoai, anh_dai_dien_tep_id,
                email_da_xac_minh, so_dien_thoai_da_xac_minh, trang_thai,
                ngay_tao, ngay_dang_nhap_cuoi
             FROM tai_khoan
             WHERE id = $1 AND trang_thai = 'DANG_DUNG'`,
            [taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async layVaiTroTaiKhoan(taiKhoanId, donViId, client) {
        const { rows } = await query(
            `SELECT DISTINCT
                tvvt.id AS gan_vai_tro_id, vt.id, vt.ma_vai_tro, vt.ten_vai_tro,
                vt.mo_ta, tvvt.chi_nhanh_id, tvvt.ngay_bat_dau, tvvt.ngay_ket_thuc
             FROM thanh_vien_don_vi tv
             JOIN thanh_vien_vai_tro tvvt
               ON tvvt.don_vi_id = tv.don_vi_id
              AND tvvt.thanh_vien_don_vi_id = tv.id
             JOIN vai_tro vt
               ON vt.id = tvvt.vai_tro_id
              AND vt.don_vi_id = tv.don_vi_id
             WHERE tv.tai_khoan_id = $1
               AND tv.don_vi_id = $2
               AND tv.trang_thai = 'DANG_LAM'
               AND vt.trang_thai = 'DANG_DUNG'
               AND tvvt.ngay_bat_dau <= now()
               AND (tvvt.ngay_ket_thuc IS NULL OR tvvt.ngay_ket_thuc > now())
               AND (
                   tvvt.chi_nhanh_id IS NULL
                   OR EXISTS (
                       SELECT 1 FROM thanh_vien_chi_nhanh tvcn
                       JOIN chi_nhanh cn
                         ON cn.don_vi_id = tvcn.don_vi_id
                        AND cn.id = tvcn.chi_nhanh_id
                       WHERE tvcn.don_vi_id = tv.don_vi_id
                         AND tvcn.thanh_vien_don_vi_id = tv.id
                         AND tvcn.chi_nhanh_id = tvvt.chi_nhanh_id
                         AND tvcn.trang_thai = 'HIEU_LUC'
                         AND tvcn.ngay_bat_dau <= CURRENT_DATE
                         AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
                         AND cn.trang_thai = 'DANG_DUNG'
                   )
               )
             ORDER BY vt.ma_vai_tro, tvvt.ngay_bat_dau`,
            [taiKhoanId, donViId], client
        );
        return rows;
    }
}

module.exports = new XacThucRepository();