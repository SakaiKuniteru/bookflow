const { query } = require('../../database/query.js');

const TRUONG_CAP_NHAT = new Set(['ten_hien_thi', 'email_lien_he', 'ten_phap_ly', 'ma_so_thue', 'so_dien_thoai', 'website', 'mui_gio', 'ngon_ngu']);

class DonViRepository {
    async layTaiKhoanDuDieuKien(taiKhoanId, client) {
        const { rows } = await query(
            `SELECT id, email FROM tai_khoan
             WHERE id = $1 AND trang_thai = 'DANG_DUNG'
               AND email_da_xac_minh = TRUE AND bat_buoc_doi_mat_khau = FALSE`,
            [taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async khoaPhepTaoDonVi(taiKhoanId, client) {
        const { rows } = await query(
            `SELECT id FROM phep_tao_don_vi
             WHERE tai_khoan_id = $1 AND ngay_su_dung IS NULL AND ngay_het_han > now()
             ORDER BY ngay_tao, id LIMIT 1 FOR UPDATE`,
            [taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async taoDonViDb(duLieu, client) {
        const { rows } = await query(
            `INSERT INTO don_vi (ma_don_vi, ten_hien_thi, email_lien_he, ten_phap_ly,
                ma_so_thue, so_dien_thoai, website, mui_gio, ngon_ngu, ngay_kich_hoat)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
             RETURNING id, ma_don_vi, ten_hien_thi, email_lien_he, mui_gio, trang_thai`,
            [
                duLieu.ma_don_vi, duLieu.ten_hien_thi, duLieu.email_lien_he,
                duLieu.ten_phap_ly ?? null, duLieu.ma_so_thue ?? null,
                duLieu.so_dien_thoai ?? null, duLieu.website ?? null,
                duLieu.mui_gio ?? 'Asia/Ho_Chi_Minh', duLieu.ngon_ngu ?? 'vi'
            ], client
        );
        return rows[0];
    }

    async taoVaiTroMacDinh(donViId, actorId, client) {
        const { rows } = await query(
            `INSERT INTO vai_tro (don_vi_id, ma_vai_tro, ten_vai_tro, mo_ta, la_vai_tro_he_thong, nguoi_tao_id)
             SELECT $1, mau.ma, mau.ten, mau.mo_ta, TRUE, $2
             FROM (VALUES
                ('QUAN_TRI', 'Quản trị đơn vị', 'Quản trị hoạt động và phân quyền nội bộ'),
                ('NHAN_VIEN', 'Nhân viên', 'Nhân viên nghiệp vụ'),
                ('THU_THU', 'Thủ thư', 'Nhân viên xử lý nghiệp vụ thư viện')
             ) AS mau(ma, ten, mo_ta)
             RETURNING id, ma_vai_tro`,
            [donViId, actorId], client
        );
        return rows;
    }

    async ganQuyenQuanTri(donViId, vaiTroId, actorId, client) {
        const { rowCount } = await query(
            `INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi, nguoi_tao_id)
             SELECT $1, $2, q.id, 'DON_VI', $3 FROM quyen q
             WHERE q.ma_quyen = ANY($4::text[]) AND q.trang_thai = 'DANG_DUNG'
             RETURNING id`,
            [donViId, vaiTroId, actorId, ['members.manage', 'roles.manage', 'units.manage', 'branches.manage']], client
        );
        return rowCount;
    }

    async taoThanhVienSangLap(donViId, taiKhoan, client) {
        const { rows } = await query(
            `INSERT INTO thanh_vien_don_vi (don_vi_id, tai_khoan_id, chuc_danh,
                email_cong_viec, nguoi_tao_id, ngay_gia_nhap, trang_thai)
             VALUES ($1, $2, 'Quản trị đơn vị', $3, $2, now(), 'DANG_LAM')
             RETURNING id, don_vi_id, tai_khoan_id`,
            [donViId, taiKhoan.id, taiKhoan.email], client
        );
        return rows[0];
    }

    async ganVaiTroSangLap(donViId, thanhVienId, vaiTroId, actorId, client) {
        const { rows } = await query(
            `INSERT INTO thanh_vien_vai_tro (don_vi_id, thanh_vien_don_vi_id, vai_tro_id,
                nguoi_tao_id, nguoi_cap_id)
             VALUES ($1, $2, $3, $4, $2) RETURNING id`,
            [donViId, thanhVienId, vaiTroId, actorId], client
        );
        return rows[0];
    }

    async suDungPhepTaoDonVi(phepId, donViId, client) {
        const { rowCount } = await query(
            `UPDATE phep_tao_don_vi SET ngay_su_dung = now(), don_vi_da_tao_id = $2
             WHERE id = $1 AND ngay_su_dung IS NULL AND ngay_het_han > now()`,
            [phepId, donViId], client
        );
        return rowCount === 1;
    }

    async chonDonViChoPhien(phienId, taiKhoanId, donViId, client) {
        const { rowCount } = await query(
            `UPDATE phien_dang_nhap SET don_vi_dang_chon_id = $3, chi_nhanh_dang_chon_id = NULL
             WHERE id = $1 AND tai_khoan_id = $2 AND ngay_thu_hoi IS NULL AND ngay_het_han > now()`,
            [phienId, taiKhoanId, donViId], client
        );
        return rowCount === 1;
    }

    async danhSachDonViTheoTaiKhoan(taiKhoanId, client) {
        const { rows } = await query(
            `SELECT d.id, d.ma_don_vi, d.ten_hien_thi, d.logo_tep_id, d.trang_thai,
                tv.id AS thanh_vien_id
             FROM thanh_vien_don_vi tv
             JOIN don_vi d ON d.id = tv.don_vi_id
             WHERE tv.tai_khoan_id = $1 AND tv.trang_thai = 'DANG_LAM'
               AND d.trang_thai = 'DANG_DUNG'
             ORDER BY d.ten_hien_thi, d.id`,
            [taiKhoanId], client
        );
        return rows;
    }

    async thanhVienDangLam(taiKhoanId, donViId, client) {
        const { rows } = await query(
            `SELECT EXISTS (
                SELECT 1 FROM thanh_vien_don_vi tv
                JOIN don_vi d ON d.id = tv.don_vi_id
                WHERE tv.tai_khoan_id = $1 AND tv.don_vi_id = $2
                  AND tv.trang_thai = 'DANG_LAM' AND d.trang_thai = 'DANG_DUNG'
             ) AS hop_le`,
            [taiKhoanId, donViId], client
        );
        return rows[0].hop_le;
    }

    async layDonViHienTai(taiKhoanId, donViId, client) {
        const { rows } = await query(
            `SELECT d.id, d.ma_don_vi, d.ten_hien_thi, d.ten_phap_ly, d.ma_so_thue,
                d.email_lien_he, d.so_dien_thoai, d.website, d.logo_tep_id,
                d.mui_gio, d.don_vi_tien_te, d.ngon_ngu, d.trang_thai
             FROM don_vi d
             JOIN thanh_vien_don_vi tv ON tv.don_vi_id = d.id
             WHERE d.id = $1 AND tv.tai_khoan_id = $2
               AND tv.trang_thai = 'DANG_LAM' AND d.trang_thai = 'DANG_DUNG'`,
            [donViId, taiKhoanId], client
        );
        return rows[0] ?? null;
    }

    async khoaDonVi(donViId, client) {
        const { rows } = await query(
            "SELECT id FROM don_vi WHERE id = $1 AND trang_thai = 'DANG_DUNG' FOR UPDATE",
            [donViId], client
        );
        return rows[0] ?? null;
    }

    async capNhatDonViDb(donViId, duLieu, client) {
        const cacTruong = Object.keys(duLieu);
        if (!cacTruong.length || cacTruong.some(ten => !TRUONG_CAP_NHAT.has(ten))) throw new Error('Trường cập nhật đơn vị không hợp lệ');
        const cauLenhSet = cacTruong.map((ten, index) => `${ten} = $${index + 2}`).join(', ');
        const giaTri = [donViId, ...cacTruong.map(ten => duLieu[ten])];
        const { rows } = await query(
            `UPDATE don_vi SET ${cauLenhSet}
             WHERE id = $1 AND trang_thai = 'DANG_DUNG'
             RETURNING id, ma_don_vi, ten_hien_thi, ten_phap_ly, ma_so_thue,
                email_lien_he, so_dien_thoai, website, mui_gio, ngon_ngu, trang_thai`,
            giaTri, client
        );
        return rows[0] ?? null;
    }

    async ghiNhatKyDonVi({ donViId, actorId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai,
                doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1, $2, $3, 'don_vi', $1, 'THANH_CONG', 'Quản lý đơn vị', $4, 'API')`,
            [donViId, actorId, hanhDong, requestId], client
        );
    }
}

module.exports = new DonViRepository();