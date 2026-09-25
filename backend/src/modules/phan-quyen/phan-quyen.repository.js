import { query } from '../../database/query.js';

export async function layQuyenHieuLuc(taiKhoanId, donViId, maQuyen = null, client) {
    const { rows } = await query(
        `SELECT DISTINCT q.ma_quyen, vtq.pham_vi, tvvt.chi_nhanh_id AS chi_nhanh_gan_id,
            tvcn.chi_nhanh_id AS chi_nhanh_hieu_luc_id
         FROM thanh_vien_don_vi tv
         JOIN don_vi d ON d.id = tv.don_vi_id AND d.trang_thai = 'DANG_DUNG'
         JOIN thanh_vien_vai_tro tvvt ON tvvt.don_vi_id = tv.don_vi_id AND tvvt.thanh_vien_don_vi_id = tv.id
         JOIN vai_tro vt ON vt.id = tvvt.vai_tro_id AND vt.don_vi_id = tv.don_vi_id
         JOIN vai_tro_quyen vtq ON vtq.vai_tro_id = vt.id AND vtq.don_vi_id = tv.don_vi_id
         JOIN quyen q ON q.id = vtq.quyen_id
         LEFT JOIN thanh_vien_chi_nhanh tvcn ON tvcn.don_vi_id = tv.don_vi_id
            AND tvcn.thanh_vien_don_vi_id = tv.id AND tvcn.trang_thai = 'HIEU_LUC'
            AND tvcn.ngay_bat_dau <= CURRENT_DATE
            AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
            AND EXISTS (
                SELECT 1 FROM chi_nhanh cn WHERE cn.id = tvcn.chi_nhanh_id
                  AND cn.don_vi_id = tv.don_vi_id AND cn.trang_thai = 'DANG_DUNG'
            )
         WHERE tv.tai_khoan_id = $1 AND tv.don_vi_id = $2 AND tv.trang_thai = 'DANG_LAM'
           AND vt.trang_thai = 'DANG_DUNG' AND q.trang_thai = 'DANG_DUNG'
           AND tvvt.ngay_bat_dau <= now()
           AND (tvvt.ngay_ket_thuc IS NULL OR tvvt.ngay_ket_thuc > now())
           AND ($3::text IS NULL OR q.ma_quyen = $3)`,
        [taiKhoanId, donViId, maQuyen], client
    );
    return rows;
}

export async function chiNhanhHoatDong(donViId, chiNhanhId, client) {
    const { rows } = await query(
        "SELECT EXISTS (SELECT 1 FROM chi_nhanh WHERE id = $1 AND don_vi_id = $2 AND trang_thai = 'DANG_DUNG') AS hop_le",
        [chiNhanhId, donViId], client
    );
    return rows[0].hop_le;
}

export async function danhMucQuyen(client) {
    const { rows } = await query(
        "SELECT id, ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam FROM quyen WHERE trang_thai = 'DANG_DUNG' ORDER BY nhom_quyen, ma_quyen",
        [], client
    );
    return rows;
}

export async function danhSachVaiTro(donViId, client) {
    const { rows } = await query(
        `SELECT vt.id, vt.ma_vai_tro, vt.ten_vai_tro, vt.mo_ta, vt.la_vai_tro_he_thong,
            vt.trang_thai, count(vtq.id)::int AS so_quyen
         FROM vai_tro vt
         LEFT JOIN vai_tro_quyen vtq ON vtq.don_vi_id = vt.don_vi_id AND vtq.vai_tro_id = vt.id
         WHERE vt.don_vi_id = $1
         GROUP BY vt.id ORDER BY vt.la_vai_tro_he_thong DESC, vt.ma_vai_tro`,
        [donViId], client
    );
    return rows;
}

export async function layVaiTro(donViId, vaiTroId, client, khoa = false) {
    const sql = `SELECT * FROM vai_tro WHERE id = $1 AND don_vi_id = $2${khoa ? ' FOR UPDATE' : ''}`;
    const { rows } = await query(sql, [vaiTroId, donViId], client);
    return rows[0] ?? null;
}

export async function taoVaiTro(donViId, actorId, duLieu, client) {
    const { rows } = await query(
        `INSERT INTO vai_tro (don_vi_id, ma_vai_tro, ten_vai_tro, mo_ta, nguoi_tao_id)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, ma_vai_tro, ten_vai_tro, mo_ta, la_vai_tro_he_thong, trang_thai`,
        [donViId, duLieu.ma_vai_tro, duLieu.ten_vai_tro, duLieu.mo_ta, actorId], client
    );
    return rows[0];
}

export async function suaVaiTro(donViId, vaiTroId, actorId, duLieu, client) {
    const { rows } = await query(
        `UPDATE vai_tro SET ten_vai_tro = $3, mo_ta = $4, nguoi_cap_nhat_id = $5
         WHERE id = $1 AND don_vi_id = $2 AND la_vai_tro_he_thong = FALSE AND trang_thai = 'DANG_DUNG'
         RETURNING id, ma_vai_tro, ten_vai_tro, mo_ta, trang_thai`,
        [vaiTroId, donViId, duLieu.ten_vai_tro, duLieu.mo_ta, actorId], client
    );
    return rows[0] ?? null;
}

export async function voHieuVaiTro(donViId, vaiTroId, actorId, client) {
    const { rows } = await query(
        `UPDATE vai_tro SET trang_thai = 'TAM_KHOA', nguoi_cap_nhat_id = $3
         WHERE id = $1 AND don_vi_id = $2 AND la_vai_tro_he_thong = FALSE AND trang_thai = 'DANG_DUNG'
         RETURNING id, ma_vai_tro, trang_thai`,
        [vaiTroId, donViId, actorId], client
    );
    return rows[0] ?? null;
}

export async function quyenCuaVaiTro(donViId, vaiTroId, client) {
    const { rows } = await query(
        `SELECT vtq.id, q.id AS quyen_id, q.ma_quyen, q.ten_quyen, q.la_quyen_nhay_cam, vtq.pham_vi
         FROM vai_tro_quyen vtq JOIN quyen q ON q.id = vtq.quyen_id
         WHERE vtq.don_vi_id = $1 AND vtq.vai_tro_id = $2 ORDER BY q.ma_quyen, vtq.pham_vi`,
        [donViId, vaiTroId], client
    );
    return rows;
}

export async function quyenTheoMa(cacMaQuyen, client) {
    const { rows } = await query(
        "SELECT id, ma_quyen FROM quyen WHERE ma_quyen = ANY($1::text[]) AND trang_thai = 'DANG_DUNG'",
        [cacMaQuyen], client
    );
    return rows;
}

export async function xoaQuyenVaiTro(donViId, vaiTroId, client) {
    await query('DELETE FROM vai_tro_quyen WHERE don_vi_id = $1 AND vai_tro_id = $2', [donViId, vaiTroId], client);
}

export async function ganQuyenVaiTro(donViId, vaiTroId, quyenId, phamVi, actorId, client) {
    await query(
        `INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi, nguoi_tao_id)
         VALUES ($1, $2, $3, $4, $5)`,
        [donViId, vaiTroId, quyenId, phamVi, actorId], client
    );
}

export async function layThanhVien(donViId, thanhVienId, client, khoa = false) {
    const sql = `SELECT * FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`;
    const { rows } = await query(sql, [donViId, thanhVienId], client);
    return rows[0] ?? null;
}

export async function thanhVienTheoTaiKhoan(donViId, taiKhoanId, client) {
    const { rows } = await query(
        "SELECT id FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND tai_khoan_id = $2 AND trang_thai = 'DANG_LAM'",
        [donViId, taiKhoanId], client
    );
    return rows[0] ?? null;
}

export async function thanhVienCoChiNhanh(donViId, thanhVienId, chiNhanhId, client) {
    const { rows } = await query(
        `SELECT EXISTS (
            SELECT 1 FROM thanh_vien_chi_nhanh tvcn
            JOIN chi_nhanh cn ON cn.id = tvcn.chi_nhanh_id AND cn.don_vi_id = tvcn.don_vi_id
            WHERE tvcn.don_vi_id = $1 AND tvcn.thanh_vien_don_vi_id = $2 AND tvcn.chi_nhanh_id = $3
              AND tvcn.trang_thai = 'HIEU_LUC' AND cn.trang_thai = 'DANG_DUNG'
              AND tvcn.ngay_bat_dau <= CURRENT_DATE
              AND (tvcn.ngay_ket_thuc IS NULL OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
         ) AS hop_le`,
        [donViId, thanhVienId, chiNhanhId], client
    );
    return rows[0].hop_le;
}

export async function vaiTroCoQuyenDonVi(donViId, vaiTroId, client) {
    const { rows } = await query(
        "SELECT EXISTS (SELECT 1 FROM vai_tro_quyen WHERE don_vi_id = $1 AND vai_tro_id = $2 AND pham_vi = 'DON_VI') AS co_quyen",
        [donViId, vaiTroId], client
    );
    return rows[0].co_quyen;
}

export async function vaiTroDaGan(donViId, thanhVienId, vaiTroId, chiNhanhId, client) {
    const { rows } = await query(
        `SELECT id FROM thanh_vien_vai_tro
         WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 AND vai_tro_id = $3
           AND chi_nhanh_id IS NOT DISTINCT FROM $4::uuid AND ngay_ket_thuc IS NULL LIMIT 1`,
        [donViId, thanhVienId, vaiTroId, chiNhanhId], client
    );
    return rows[0] ?? null;
}

export async function ganVaiTro(donViId, thanhVienId, vaiTroId, chiNhanhId, actorId, nguoiCapId, client) {
    const { rows } = await query(
        `INSERT INTO thanh_vien_vai_tro (don_vi_id, thanh_vien_don_vi_id, vai_tro_id,
            chi_nhanh_id, nguoi_tao_id, nguoi_cap_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, thanh_vien_don_vi_id, vai_tro_id, chi_nhanh_id, ngay_bat_dau`,
        [donViId, thanhVienId, vaiTroId, chiNhanhId, actorId, nguoiCapId], client
    );
    return rows[0];
}

export async function vaiTroCuaThanhVien(donViId, thanhVienId, client) {
    const { rows } = await query(
        `SELECT g.id, g.vai_tro_id, vt.ma_vai_tro, vt.ten_vai_tro, g.chi_nhanh_id,
            g.ngay_bat_dau, g.ngay_ket_thuc
         FROM thanh_vien_vai_tro g
         JOIN vai_tro vt ON vt.id = g.vai_tro_id AND vt.don_vi_id = g.don_vi_id
         WHERE g.don_vi_id = $1 AND g.thanh_vien_don_vi_id = $2
         ORDER BY g.ngay_bat_dau DESC`,
        [donViId, thanhVienId], client
    );
    return rows;
}

export async function thuHoiVaiTro(donViId, thanhVienId, ganVaiTroId, actorId, client) {
    const { rows } = await query(
        `UPDATE thanh_vien_vai_tro g SET ngay_ket_thuc = now(), nguoi_cap_nhat_id = $4
         FROM vai_tro vt
         WHERE g.id = $3 AND g.don_vi_id = $1 AND g.thanh_vien_don_vi_id = $2
           AND vt.id = g.vai_tro_id AND vt.don_vi_id = g.don_vi_id
           AND NOT (vt.la_vai_tro_he_thong = TRUE AND vt.ma_vai_tro = 'QUAN_TRI')
           AND g.ngay_ket_thuc IS NULL
         RETURNING g.id, g.vai_tro_id, g.ngay_ket_thuc`,
        [donViId, thanhVienId, ganVaiTroId, actorId], client
    );
    return rows[0] ?? null;
}

export async function ghiNhatKy({ donViId, actorId, doiTuongLoai, doiTuongId, hanhDong, requestId }, client) {
    await query(
        `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai,
            doi_tuong_id, ket_qua, ly_do, request_id, nguon)
         VALUES ($1, $2, $3, $4, $5, 'THANH_CONG', 'Quản lý phân quyền', $6, 'API')`,
        [donViId, actorId, hanhDong, doiTuongLoai, doiTuongId, requestId], client
    );
}