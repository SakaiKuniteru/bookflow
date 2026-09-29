const { query } = require('../../database/query.js');
async function laySach(bookId, donViId) {
    const { rows } = await query(`SELECT ds.id, ds.ten_sach AS ten, (SELECT COALESCE(pb.isbn_13, pb.isbn_10) FROM phien_ban_sach pb WHERE pb.don_vi_id = ds.don_vi_id AND pb.dau_sach_id = ds.id ORDER BY pb.ngay_cap_nhat DESC, pb.id DESC LIMIT 1) AS isbn, COALESCE(NULLIF(ds.mo_ta_day_du, ''), NULLIF(ds.mo_ta_ngan, ''), NULLIF(ds.tom_tat_noi_dung, '')) AS mo_ta, 1 AS version, jsonb_build_object('access_scope', 'ORGANIZATION', 'don_vi_id', ds.don_vi_id) AS access_scope FROM dau_sach ds WHERE ds.id = $1 AND ds.don_vi_id = $2 AND ds.ngay_xoa IS NULL`, [bookId, donViId]);
    return rows[0] ?? null;
}
async function layTaiLieu(fileId, donViId) {
    const { rows } = await query(`SELECT id AS file_id, ten_tep_goc AS title, duong_dan_luu_tru AS storage_key, bucket AS storage_bucket, mime_type_xac_minh AS mime_type, loai_tep AS document_type, ma_bam_sha256 AS checksum, 1 AS version, jsonb_build_object('access_scope', CASE pham_vi_truy_cap WHEN 'CONG_KHAI' THEN 'PUBLIC' ELSE 'ORGANIZATION' END, 'don_vi_id', don_vi_so_huu_id) AS access_scope FROM tep_dinh_kem WHERE id = $1 AND don_vi_so_huu_id = $2 AND trang_thai = 'SAN_SANG' AND trang_thai_quet_virus = 'SACH' AND pham_vi_truy_cap IN ('CONG_KHAI', 'NOI_BO_DON_VI') AND ngay_xoa IS NULL`, [fileId, donViId]);
    return rows[0] ?? null;
}
module.exports = { laySach, layTaiLieu };