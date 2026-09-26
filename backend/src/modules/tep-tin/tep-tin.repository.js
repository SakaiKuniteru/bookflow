const { query } = require('../../database/query.js');

async function taoLo({ donViId, taiKhoanId, soFile, tongByte, maLo }) {
    const { rows } = await query(`INSERT INTO lo_tai_tep (don_vi_id, ma_lo, nguoi_tai_len_id, tong_so_tep, tong_dung_luong_byte, nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$3) RETURNING id, ma_lo, tong_so_tep, trang_thai`, [donViId, maLo, taiKhoanId, soFile, tongByte]);
    return rows[0];
}
async function taoFile({ donViId, taiKhoanId, maTep, tenGoc, tenLuu, key, bucket, mimeKhaiBao, mimeXacMinh, duoiTep, kichThuoc, checksum, loaiTep, phamViTruyCap, width, height }, client) {
    const { rows } = await query(`INSERT INTO tep_dinh_kem (don_vi_so_huu_id, tai_khoan_so_huu_id, nguoi_tai_len_id, ma_tep, ten_tep_goc, ten_tep_luu, duong_dan_luu_tru, bucket, mime_type_khai_bao, mime_type_xac_minh, duoi_tep, kich_thuoc_byte, ma_bam_sha256, loai_tep, pham_vi_truy_cap, trang_thai_quet_virus, trang_thai, chieu_rong_px, chieu_cao_px) VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'SACH','SAN_SANG',$15,$16) RETURNING id, ma_tep, ten_tep_goc, mime_type_xac_minh, duoi_tep, kich_thuoc_byte, loai_tep, pham_vi_truy_cap, trang_thai, chieu_rong_px, chieu_cao_px, ngay_tao`, [donViId, taiKhoanId, maTep, tenGoc, tenLuu, key, bucket, mimeKhaiBao, mimeXacMinh, duoiTep, kichThuoc, checksum, loaiTep, phamViTruyCap, width, height], client);
    return rows[0];
}
async function ghiKetQua(loId, donViId, taiKhoanId, thuTu, tenGoc, trangThai, tepId = null, maLoi = null, thongBaoLoi = null, client) {
    await query(`INSERT INTO chi_tiet_lo_tai_tep (don_vi_id, lo_tai_tep_id, tep_dinh_kem_id, ten_tep_goc, thu_tu, trang_thai, ma_loi, thong_bao_loi, nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [donViId, loId, tepId, tenGoc, thuTu, trangThai, maLoi, thongBaoLoi, taiKhoanId], client);
}
async function chotLo(loId, taiKhoanId) {
    const { rows } = await query(`UPDATE lo_tai_tep l SET so_tep_thanh_cong = x.thanh_cong, so_tep_that_bai = x.that_bai, trang_thai = CASE WHEN x.thanh_cong = l.tong_so_tep THEN 'HOAN_TAT' WHEN x.thanh_cong > 0 THEN 'HOAN_TAT_MOT_PHAN' ELSE 'THAT_BAI' END, ngay_hoan_tat = now() FROM (SELECT COUNT(*) FILTER (WHERE trang_thai = 'THANH_CONG')::integer AS thanh_cong, COUNT(*) FILTER (WHERE trang_thai = 'THAT_BAI')::integer AS that_bai FROM chi_tiet_lo_tai_tep WHERE lo_tai_tep_id = $1) x WHERE l.id = $1 AND l.nguoi_tai_len_id = $2 RETURNING l.id, l.ma_lo, l.tong_so_tep, l.so_tep_thanh_cong, l.so_tep_that_bai, l.trang_thai, l.ngay_hoan_tat`, [loId, taiKhoanId]);
    return rows[0];
}
async function layFile(id) {
    const { rows } = await query(`SELECT id, don_vi_so_huu_id, tai_khoan_so_huu_id, nguoi_tai_len_id, ma_tep, ten_tep_goc, duong_dan_luu_tru, bucket, mime_type_xac_minh, duoi_tep, kich_thuoc_byte, loai_tep, pham_vi_truy_cap, trang_thai_quet_virus, trang_thai, chieu_rong_px, chieu_cao_px, ngay_tao, ngay_cap_nhat FROM tep_dinh_kem WHERE id = $1`, [id]);
    return rows[0] ?? null;
}
async function danhSach(donViId, taiKhoanId, xemTatCa, trang, kichThuoc) {
    const thamSo = [donViId, taiKhoanId, xemTatCa, kichThuoc, (trang - 1) * kichThuoc];
    const dieuKien = `trang_thai <> 'DA_XOA' AND ((don_vi_so_huu_id = $1 AND ($3::boolean OR nguoi_tai_len_id = $2)) OR (don_vi_so_huu_id IS NULL AND tai_khoan_so_huu_id = $2))`;
    const { rows: [tong] } = await query(`SELECT COUNT(*)::integer AS tong_so FROM tep_dinh_kem WHERE ${dieuKien}`, thamSo);
    const { rows } = await query(`SELECT id, ma_tep, ten_tep_goc, mime_type_xac_minh, duoi_tep, kich_thuoc_byte, loai_tep, pham_vi_truy_cap, trang_thai, chieu_rong_px, chieu_cao_px, ngay_tao FROM tep_dinh_kem WHERE ${dieuKien} ORDER BY ngay_tao DESC, id DESC LIMIT $4 OFFSET $5`, thamSo);
    return { tep: rows, phan_trang: { trang, kich_thuoc: kichThuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / kichThuoc) } };
}
async function dangDuocSuDung(id) {
    const checks = [
        ['don_vi', 'logo_tep_id'],
        ['tai_khoan', 'anh_dai_dien_tep_id']
    ];
    const { rows } = await query(`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name IN ('dau_sach','phien_ban_sach','tep_sach','tac_gia','the_loai_sach','nha_xuat_ban','anh_dau_sach')`);
    const daCo = new Set(rows.map(row => row.table_name));
    if (daCo.has('anh_dau_sach')) checks.push(['anh_dau_sach', 'tep_dinh_kem_id']);
    if (daCo.has('phien_ban_sach')) checks.push(['phien_ban_sach', 'anh_bia_chinh_id']);
    if (daCo.has('tep_sach')) checks.push(['tep_sach', 'tep_dinh_kem_id']);
    if (daCo.has('tac_gia')) checks.push(['tac_gia', 'anh_dai_dien_tep_id']);
    if (daCo.has('the_loai_sach')) checks.push(['the_loai_sach', 'anh_dai_dien_tep_id']);
    if (daCo.has('nha_xuat_ban')) checks.push(['nha_xuat_ban', 'logo_tep_id']);
    for (const [bang, cot] of checks) {
        const { rowCount } = await query(`SELECT 1 FROM ${bang} WHERE ${cot} = $1 LIMIT 1`, [id]);
        if (rowCount) return true;
    }
    return false;
}
async function danhDauXoa(id, actorId) {
    const { rows } = await query(`UPDATE tep_dinh_kem SET trang_thai = 'DA_XOA', ngay_xoa = now() WHERE id = $1 AND trang_thai <> 'DA_XOA' RETURNING id, bucket, duong_dan_luu_tru`, [id]);
    return rows[0] ?? null;
}
module.exports = { taoLo, taoFile, ghiKetQua, chotLo, layFile, danhSach, dangDuocSuDung, danhDauXoa };