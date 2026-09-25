const { query } = require('../../database/query.js');

const TRUONG_GHI = new Set([
    'ma_chi_nhanh', 'ten_chi_nhanh', 'loai_chi_nhanh', 'dia_chi_chi_tiet',
    'ma_tinh_thanh', 'ten_tinh_thanh', 'ma_phuong_xa', 'ten_phuong_xa',
    'quoc_gia', 'vi_do', 'kinh_do', 'so_dien_thoai', 'email',
    'quan_ly_thanh_vien_id', 'cho_nhan_tai_quay', 'cho_ban_truc_tuyen'
]);

class ChiNhanhRepository {
    async danhSachChiNhanh(donViId, taiKhoanId, xemTatCa, client) {
        const { rows } = await query(
            `SELECT cn.id, cn.ma_chi_nhanh, cn.ten_chi_nhanh, cn.loai_chi_nhanh,
                cn.dia_chi_chi_tiet, cn.ten_tinh_thanh, cn.ten_phuong_xa,
                cn.so_dien_thoai, cn.trang_thai, cn.quan_ly_thanh_vien_id
             FROM chi_nhanh cn
             WHERE cn.don_vi_id = $1 AND (
                 $3::boolean OR (
                     cn.trang_thai = 'DANG_DUNG' AND EXISTS (
                         SELECT 1 FROM thanh_vien_chi_nhanh tvcn
                         JOIN thanh_vien_don_vi tv ON tv.id = tvcn.thanh_vien_don_vi_id
                            AND tv.don_vi_id = tvcn.don_vi_id
                         WHERE tvcn.don_vi_id = cn.don_vi_id AND tvcn.chi_nhanh_id = cn.id
                           AND tv.tai_khoan_id = $2 AND tv.trang_thai = 'DANG_LAM'
                           AND tvcn.trang_thai = 'HIEU_LUC' AND tvcn.ngay_bat_dau <= CURRENT_DATE
                           AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
                     )
                 )
             ) ORDER BY cn.ten_chi_nhanh, cn.id`,
            [donViId, taiKhoanId, xemTatCa], client
        );
        return rows;
    }

    async layChiNhanh(donViId, chiNhanhId, client, khoa = false) {
        const sql = `SELECT * FROM chi_nhanh WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`;
        const { rows } = await query(sql, [donViId, chiNhanhId], client);
        return rows[0] ?? null;
    }

    async taoChiNhanhDb(donViId, actorId, duLieu, client) {
        const cacTruong = Object.keys(duLieu);
        if (cacTruong.some(ten => !TRUONG_GHI.has(ten) || ten === 'quan_ly_thanh_vien_id')) throw new Error('Trường tạo chi nhánh không hợp lệ');
        const cot = ['don_vi_id', 'nguoi_tao_id', ...cacTruong];
        const giaTri = [donViId, actorId, ...cacTruong.map(ten => duLieu[ten])];
        const thamSo = cot.map((_, index) => `$${index + 1}`).join(', ');
        const { rows } = await query(
            `INSERT INTO chi_nhanh (${cot.join(', ')}) VALUES (${thamSo})
             RETURNING id, don_vi_id, ma_chi_nhanh, ten_chi_nhanh, loai_chi_nhanh, trang_thai`,
            giaTri, client
        );
        return rows[0];
    }

    async capNhatChiNhanhDb(donViId, chiNhanhId, actorId, duLieu, client) {
        const cacTruong = Object.keys(duLieu);
        if (!cacTruong.length || cacTruong.some(ten => !TRUONG_GHI.has(ten) || ten === 'ma_chi_nhanh')) throw new Error('Trường cập nhật chi nhánh không hợp lệ');
        const cauLenhSet = cacTruong.map((ten, index) => `${ten} = $${index + 4}`).join(', ');
        const giaTri = [donViId, chiNhanhId, actorId, ...cacTruong.map(ten => duLieu[ten])];
        const { rows } = await query(
            `UPDATE chi_nhanh SET ${cauLenhSet}, nguoi_cap_nhat_id = $3
             WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_DUNG'
             RETURNING *`,
            giaTri, client
        );
        return rows[0] ?? null;
    }

    async doiTrangThaiChiNhanh(donViId, chiNhanhId, actorId, trangThai, client) {
        const { rows } = await query(
            `UPDATE chi_nhanh SET trang_thai = $4, nguoi_cap_nhat_id = $3
             WHERE don_vi_id = $1 AND id = $2
             RETURNING id, ma_chi_nhanh, ten_chi_nhanh, trang_thai`,
            [donViId, chiNhanhId, actorId, trangThai], client
        );
        return rows[0] ?? null;
    }

    async layThanhVien(donViId, thanhVienId, client, khoa = false) {
        const sql = `SELECT id, tai_khoan_id, trang_thai FROM thanh_vien_don_vi
            WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`;
        const { rows } = await query(sql, [donViId, thanhVienId], client);
        return rows[0] ?? null;
    }

    async phanCongHieuLuc(donViId, taiKhoanId, chiNhanhId, client) {
        const { rows } = await query(
            `SELECT tvcn.id, tvcn.la_chi_nhanh_chinh
             FROM thanh_vien_chi_nhanh tvcn
             JOIN thanh_vien_don_vi tv ON tv.id = tvcn.thanh_vien_don_vi_id AND tv.don_vi_id = tvcn.don_vi_id
             JOIN chi_nhanh cn ON cn.id = tvcn.chi_nhanh_id AND cn.don_vi_id = tvcn.don_vi_id
             WHERE tvcn.don_vi_id = $1 AND tv.tai_khoan_id = $2 AND tvcn.chi_nhanh_id = $3
               AND tv.trang_thai = 'DANG_LAM' AND cn.trang_thai = 'DANG_DUNG'
               AND tvcn.trang_thai = 'HIEU_LUC' AND tvcn.ngay_bat_dau <= CURRENT_DATE
               AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
             LIMIT 1`,
            [donViId, taiKhoanId, chiNhanhId], client
        );
        return rows[0] ?? null;
    }

    async phanCongTheoThanhVien(donViId, thanhVienId, chiNhanhId, client, khoa = false) {
        const sql = `SELECT id, la_chi_nhanh_chinh FROM thanh_vien_chi_nhanh
            WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND chi_nhanh_id = $3
              AND trang_thai = 'HIEU_LUC' AND ngay_bat_dau <= CURRENT_DATE
              AND (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= CURRENT_DATE)
            ORDER BY ngay_bat_dau DESC, id DESC LIMIT 1${khoa ? ' FOR UPDATE' : ''}`;
        const { rows } = await query(sql, [donViId, thanhVienId, chiNhanhId], client);
        return rows[0] ?? null;
    }

    async boChiNhanhChinhCu(donViId, thanhVienId, client) {
        await query(
            `UPDATE thanh_vien_chi_nhanh SET la_chi_nhanh_chinh = FALSE
             WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2
               AND trang_thai = 'HIEU_LUC' AND la_chi_nhanh_chinh = TRUE`,
            [donViId, thanhVienId], client
        );
    }

    async taoPhanCong(donViId, thanhVienId, chiNhanhId, laChinh, actorId, client) {
        const { rows } = await query(
            `INSERT INTO thanh_vien_chi_nhanh (don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id,
                la_chi_nhanh_chinh, ngay_bat_dau, trang_thai, nguoi_tao_id)
             VALUES ($1, $2, $3, $4, CURRENT_DATE, 'HIEU_LUC', $5)
             RETURNING id, thanh_vien_don_vi_id, chi_nhanh_id, la_chi_nhanh_chinh, trang_thai`,
            [donViId, thanhVienId, chiNhanhId, laChinh, actorId], client
        );
        return rows[0];
    }

    async suaPhanCong(phanCongId, laChinh, actorId, client) {
        const { rows } = await query(
            `UPDATE thanh_vien_chi_nhanh SET la_chi_nhanh_chinh = $2, nguoi_cap_nhat_id = $3
             WHERE id = $1 AND trang_thai = 'HIEU_LUC'
             RETURNING id, thanh_vien_don_vi_id, chi_nhanh_id, la_chi_nhanh_chinh, trang_thai`,
            [phanCongId, laChinh, actorId], client
        );
        return rows[0] ?? null;
    }

    async ketThucPhanCong(phanCongId, actorId, client) {
        const { rows } = await query(
            `UPDATE thanh_vien_chi_nhanh SET trang_thai = 'KET_THUC',
                ngay_ket_thuc = CURRENT_DATE, la_chi_nhanh_chinh = FALSE, nguoi_cap_nhat_id = $2
             WHERE id = $1 AND trang_thai = 'HIEU_LUC'
             RETURNING id, thanh_vien_don_vi_id, chi_nhanh_id, trang_thai`,
            [phanCongId, actorId], client
        );
        return rows[0] ?? null;
    }

    async ketThucVaiTroChiNhanh(donViId, thanhVienId, chiNhanhId, actorId, client) {
        await query(
            `UPDATE thanh_vien_vai_tro SET ngay_ket_thuc = now(), nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2
               AND chi_nhanh_id = $3 AND ngay_ket_thuc IS NULL`,
            [donViId, thanhVienId, chiNhanhId, actorId], client
        );
    }

    async boQuanLyChiNhanh(donViId, chiNhanhId, thanhVienId, actorId, client) {
        await query(
            `UPDATE chi_nhanh SET quan_ly_thanh_vien_id = NULL, nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND id = $2 AND quan_ly_thanh_vien_id = $3`,
            [donViId, chiNhanhId, thanhVienId, actorId], client
        );
    }

    async danhSachNhanVienChiNhanh(donViId, chiNhanhId, client) {
        const { rows } = await query(
            `SELECT tvcn.id AS phan_cong_id, tv.id AS thanh_vien_id, tv.ma_nhan_vien,
                tk.ho_ten, tv.chuc_danh, tvcn.la_chi_nhanh_chinh, tvcn.ngay_bat_dau
             FROM thanh_vien_chi_nhanh tvcn
             JOIN thanh_vien_don_vi tv ON tv.id = tvcn.thanh_vien_don_vi_id AND tv.don_vi_id = tvcn.don_vi_id
             JOIN tai_khoan tk ON tk.id = tv.tai_khoan_id
             WHERE tvcn.don_vi_id = $1 AND tvcn.chi_nhanh_id = $2
               AND tv.trang_thai = 'DANG_LAM' AND tvcn.trang_thai = 'HIEU_LUC'
               AND tvcn.ngay_bat_dau <= CURRENT_DATE
               AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
             ORDER BY tvcn.la_chi_nhanh_chinh DESC, tk.ho_ten`,
            [donViId, chiNhanhId], client
        );
        return rows;
    }

    async chonChiNhanhPhien(phienId, taiKhoanId, donViId, chiNhanhId, client) {
        const { rows } = await query(
            `UPDATE phien_dang_nhap p SET chi_nhanh_dang_chon_id = $4
             WHERE p.id = $1 AND p.tai_khoan_id = $2 AND p.don_vi_dang_chon_id = $3
               AND p.ngay_thu_hoi IS NULL AND p.ngay_het_han > now()
               AND EXISTS (
                   SELECT 1 FROM chi_nhanh cn
                   WHERE cn.id = $4 AND cn.don_vi_id = $3 AND cn.trang_thai = 'DANG_DUNG'
               )
             RETURNING p.chi_nhanh_dang_chon_id`,
            [phienId, taiKhoanId, donViId, chiNhanhId], client
        );
        return rows[0] ?? null;
    }

    async boChiNhanhKhoiPhien(donViId, chiNhanhId, taiKhoanId, client) {
        await query(
            `UPDATE phien_dang_nhap SET chi_nhanh_dang_chon_id = NULL
             WHERE don_vi_dang_chon_id = $1 AND chi_nhanh_dang_chon_id = $2
               AND ($3::uuid IS NULL OR tai_khoan_id = $3)`,
            [donViId, chiNhanhId, taiKhoanId], client
        );
    }

    async ghiNhatKyChiNhanh({ donViId, actorId, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai,
                doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1, $2, $3, 'chi_nhanh', $4, 'THANH_CONG', 'Quản lý chi nhánh', $5, 'API')`,
            [donViId, actorId, hanhDong, doiTuongId, requestId], client
        );
    }
}

module.exports = new ChiNhanhRepository();