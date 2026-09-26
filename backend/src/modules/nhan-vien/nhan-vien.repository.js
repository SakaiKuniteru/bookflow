const { query } = require('../../database/query.js');

const TRUONG_THANH_VIEN = new Set(['chuc_danh', 'email_cong_viec', 'so_dien_thoai_cong_viec']);
const TRUONG_HO_SO = new Set(['loai_nhan_su', 'hinh_thuc_lam_viec', 'ngay_bat_dau_thu_viec', 'ngay_ket_thuc_thu_viec', 'ngay_chinh_thuc', 'ngay_nghi_viec_du_kien', 'ma_cham_cong', 'so_may_le', 'email_noi_bo', 'ghi_chu_cong_viec', 'vi_tri_chinh_id', 'nguoi_quan_ly_id']);

async function danhSach(donViId, boLoc, client) {
    const thamSo = [donViId, `%${boLoc.tuKhoa}%`, boLoc.trangThai, boLoc.chiNhanhId];
    const dieuKien = `tv.don_vi_id = $1 AND ($2 = '%%' OR tk.ho_ten ILIKE $2 OR tk.email ILIKE $2 OR tk.ten_dang_nhap ILIKE $2 OR tv.ma_nhan_vien ILIKE $2) AND ($3::varchar IS NULL OR tv.trang_thai = $3) AND ($4::integer IS NULL OR EXISTS (SELECT 1 FROM thanh_vien_chi_nhanh pc WHERE pc.don_vi_id = tv.don_vi_id AND pc.thanh_vien_don_vi_id = tv.id AND pc.chi_nhanh_id = $4 AND pc.trang_thai = 'HIEU_LUC' AND pc.ngay_bat_dau <= CURRENT_DATE AND (pc.ngay_ket_thuc IS NULL OR pc.ngay_ket_thuc >= CURRENT_DATE)))`;
    const { rows: [tong] } = await query(`SELECT COUNT(*)::integer AS so_luong FROM thanh_vien_don_vi tv JOIN tai_khoan tk ON tk.id = tv.tai_khoan_id WHERE ${dieuKien}`, thamSo, client);
    const { rows } = await query(`SELECT tv.id, tv.don_vi_id, tv.tai_khoan_id, tv.ma_nhan_vien, tv.chuc_danh, tv.email_cong_viec, tv.so_dien_thoai_cong_viec, tv.ngay_moi, tv.ngay_gia_nhap, tv.ngay_nghi_viec, tv.trang_thai, tv.ngay_tao, tv.ngay_cap_nhat, tk.ten_dang_nhap, tk.ho_ten, tk.email, tk.so_dien_thoai, tk.anh_dai_dien_tep_id, tk.trang_thai AS trang_thai_tai_khoan, tk.email_da_xac_minh, hs.vi_tri_chinh_id, vt.ten_vi_tri AS ten_vi_tri_chinh,
        COALESCE((SELECT json_agg(json_build_object('id', cn.id, 'ma_chi_nhanh', cn.ma_chi_nhanh, 'ten_chi_nhanh', cn.ten_chi_nhanh, 'la_chi_nhanh_chinh', pc.la_chi_nhanh_chinh) ORDER BY pc.la_chi_nhanh_chinh DESC, cn.ten_chi_nhanh) FROM thanh_vien_chi_nhanh pc JOIN chi_nhanh cn ON cn.id = pc.chi_nhanh_id AND cn.don_vi_id = pc.don_vi_id WHERE pc.don_vi_id = tv.don_vi_id AND pc.thanh_vien_don_vi_id = tv.id AND pc.trang_thai = 'HIEU_LUC' AND pc.ngay_bat_dau <= CURRENT_DATE AND (pc.ngay_ket_thuc IS NULL OR pc.ngay_ket_thuc >= CURRENT_DATE)), '[]'::json) AS chi_nhanh,
        COALESCE((SELECT json_agg(json_build_object('id', v.id, 'ma_vai_tro', v.ma_vai_tro, 'ten_vai_tro', v.ten_vai_tro, 'chi_nhanh_id', g.chi_nhanh_id)) FROM thanh_vien_vai_tro g JOIN vai_tro v ON v.id = g.vai_tro_id AND v.don_vi_id = g.don_vi_id WHERE g.don_vi_id = tv.don_vi_id AND g.thanh_vien_don_vi_id = tv.id AND g.ngay_bat_dau <= now() AND (g.ngay_ket_thuc IS NULL OR g.ngay_ket_thuc > now()) AND v.trang_thai = 'DANG_DUNG'), '[]'::json) AS vai_tro
        FROM thanh_vien_don_vi tv JOIN tai_khoan tk ON tk.id = tv.tai_khoan_id LEFT JOIN ho_so_nhan_vien hs ON hs.don_vi_id = tv.don_vi_id AND hs.thanh_vien_don_vi_id = tv.id LEFT JOIN vi_tri_cong_viec vt ON vt.id = hs.vi_tri_chinh_id AND vt.don_vi_id = hs.don_vi_id WHERE ${dieuKien} ORDER BY tv.ngay_tao DESC, tv.id DESC LIMIT $5 OFFSET $6`, [...thamSo, boLoc.kichThuoc, (boLoc.trang - 1) * boLoc.kichThuoc], client);
    return { nhan_vien: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kichThuoc, tong_so: tong.so_luong, tong_trang: Math.ceil(tong.so_luong / boLoc.kichThuoc) } };
}
async function layCoBan(donViId, thanhVienId, client) {
    const { rows } = await query(`SELECT jsonb_build_object('id', tk.id, 'ten_dang_nhap', tk.ten_dang_nhap, 'email', tk.email, 'so_dien_thoai', tk.so_dien_thoai, 'ho_ten', tk.ho_ten, 'anh_dai_dien_tep_id', tk.anh_dai_dien_tep_id, 'email_da_xac_minh', tk.email_da_xac_minh, 'so_dien_thoai_da_xac_minh', tk.so_dien_thoai_da_xac_minh, 'trang_thai', tk.trang_thai, 'ngay_tao', tk.ngay_tao, 'ngay_cap_nhat', tk.ngay_cap_nhat, 'ngay_dang_nhap_cuoi', tk.ngay_dang_nhap_cuoi) AS tai_khoan, to_jsonb(tv) AS thanh_vien, to_jsonb(hs) AS ho_so FROM thanh_vien_don_vi tv JOIN tai_khoan tk ON tk.id = tv.tai_khoan_id LEFT JOIN ho_so_nhan_vien hs ON hs.don_vi_id = tv.don_vi_id AND hs.thanh_vien_don_vi_id = tv.id WHERE tv.don_vi_id = $1 AND tv.id = $2`, [donViId, thanhVienId], client);
    return rows[0] ?? null;
}
async function layThanhVienCuaToi(donViId, taiKhoanId, client) {
    const { rows } = await query('SELECT id FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND tai_khoan_id = $2', [donViId, taiKhoanId], client);
    return rows[0] ?? null;
}
async function layChiNhanh(donViId, thanhVienId, client) {
    const { rows } = await query(`SELECT pc.id, pc.chi_nhanh_id, cn.ma_chi_nhanh, cn.ten_chi_nhanh, cn.loai_chi_nhanh, cn.trang_thai AS trang_thai_chi_nhanh, pc.la_chi_nhanh_chinh, pc.ngay_bat_dau, pc.ngay_ket_thuc, pc.trang_thai, pc.ngay_tao FROM thanh_vien_chi_nhanh pc JOIN chi_nhanh cn ON cn.id = pc.chi_nhanh_id AND cn.don_vi_id = pc.don_vi_id WHERE pc.don_vi_id = $1 AND pc.thanh_vien_don_vi_id = $2 ORDER BY pc.la_chi_nhanh_chinh DESC, pc.ngay_bat_dau DESC, pc.id DESC`, [donViId, thanhVienId], client);
    return rows;
}
async function layVaiTro(donViId, thanhVienId, client) {
    const { rows } = await query(`SELECT g.id, g.vai_tro_id, vt.ma_vai_tro, vt.ten_vai_tro, vt.mo_ta, vt.trang_thai AS trang_thai_vai_tro, g.chi_nhanh_id, cn.ten_chi_nhanh, g.ngay_bat_dau, g.ngay_ket_thuc, g.nguoi_cap_id, g.ly_do, (g.ngay_bat_dau <= now() AND (g.ngay_ket_thuc IS NULL OR g.ngay_ket_thuc > now()) AND vt.trang_thai = 'DANG_DUNG') AS trong_thoi_han FROM thanh_vien_vai_tro g JOIN vai_tro vt ON vt.id = g.vai_tro_id AND vt.don_vi_id = g.don_vi_id LEFT JOIN chi_nhanh cn ON cn.id = g.chi_nhanh_id AND cn.don_vi_id = g.don_vi_id WHERE g.don_vi_id = $1 AND g.thanh_vien_don_vi_id = $2 ORDER BY g.ngay_bat_dau DESC, g.id DESC`, [donViId, thanhVienId], client);
    return rows;
}
async function layPhanCongViTri(donViId, thanhVienId, client) {
    const { rows } = await query(`SELECT pc.*, vt.ma_vi_tri, vt.ten_vi_tri, vt.nhom_vi_tri, cn.ma_chi_nhanh, cn.ten_chi_nhanh FROM phan_cong_vi_tri pc JOIN vi_tri_cong_viec vt ON vt.id = pc.vi_tri_cong_viec_id AND vt.don_vi_id = pc.don_vi_id LEFT JOIN chi_nhanh cn ON cn.id = pc.chi_nhanh_id AND cn.don_vi_id = pc.don_vi_id WHERE pc.don_vi_id = $1 AND pc.thanh_vien_don_vi_id = $2 ORDER BY pc.ngay_bat_dau DESC, pc.id DESC`, [donViId, thanhVienId], client);
    return rows;
}
async function layLoiMoi(donViId, thanhVienId, client) {
    const { rows } = await query(`SELECT id, email_moi, nguoi_moi_id, ngay_gui, ngay_het_han, ngay_chap_nhan, ngay_tu_choi, ngay_huy, so_lan_gui, trang_thai, ly_do_huy, ngay_tao FROM loi_moi_nhan_vien WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 ORDER BY ngay_tao DESC LIMIT 50`, [donViId, thanhVienId], client);
    return rows;
}
async function layLichSu(donViId, thanhVienId, limit = 50, offset = 0, client) {
    const { rows } = await query(`SELECT id, loai_su_kien, chi_nhanh_cu_id, chi_nhanh_moi_id, vi_tri_cu_id, vi_tri_moi_id, trang_thai_cu, trang_thai_moi, ngay_hieu_luc, nguoi_thuc_hien_id, ly_do, ghi_chu, ngay_tao FROM lich_su_cong_tac_nhan_vien WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2 ORDER BY ngay_hieu_luc DESC, id DESC LIMIT $3 OFFSET $4`, [donViId, thanhVienId, limit, offset], client);
    const { rows: [tong] } = await query('SELECT COUNT(*)::integer AS tong_so FROM lich_su_cong_tac_nhan_vien WHERE don_vi_id = $1 AND thanh_vien_don_vi_id = $2', [donViId, thanhVienId], client);
    return { du_lieu: rows, tong_so: tong.tong_so, kich_thuoc: limit, bo_qua: offset };
}
async function layDeSua(donViId, thanhVienId, client) {
    const { rows } = await query('SELECT id, tai_khoan_id, trang_thai FROM thanh_vien_don_vi WHERE don_vi_id = $1 AND id = $2 FOR UPDATE', [donViId, thanhVienId], client);
    return rows[0] ?? null;
}
async function coVaiTroQuanTri(donViId, thanhVienId, client) {
    const { rows: [row] } = await query(`SELECT EXISTS (SELECT 1 FROM thanh_vien_vai_tro g JOIN vai_tro vt ON vt.id = g.vai_tro_id AND vt.don_vi_id = g.don_vi_id WHERE g.don_vi_id = $1 AND g.thanh_vien_don_vi_id = $2 AND vt.ma_vai_tro = 'QUAN_TRI' AND g.ngay_bat_dau <= now() AND (g.ngay_ket_thuc IS NULL OR g.ngay_ket_thuc > now())) AS co`, [donViId, thanhVienId], client);
    return row.co;
}
async function capNhatHoSo(donViId, thanhVienId, actorId, duLieu, client) {
    const duLieuTv = Object.entries(duLieu).filter(([ten]) => TRUONG_THANH_VIEN.has(ten));
    const duLieuHs = Object.entries(duLieu).filter(([ten]) => TRUONG_HO_SO.has(ten));
    if (duLieuTv.length) {
        const set = duLieuTv.map(([ten], i) => `${ten} = $${i + 4}`).join(', ');
        await query(`UPDATE thanh_vien_don_vi SET ${set}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2`, [donViId, thanhVienId, actorId, ...duLieuTv.map(([, value]) => value)], client);
    }
    if (duLieuHs.length) {
        const cot = duLieuHs.map(([ten]) => ten);
        const values = duLieuHs.map(([, value]) => value);
        const placeholders = values.map((_, i) => `$${i + 4}`);
        const set = cot.map(ten => `${ten} = EXCLUDED.${ten}`).join(', ');
        await query(`INSERT INTO ho_so_nhan_vien (don_vi_id, thanh_vien_don_vi_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1, $2, $3, ${placeholders.join(', ')}) ON CONFLICT (don_vi_id, thanh_vien_don_vi_id) DO UPDATE SET ${set}, nguoi_cap_nhat_id = EXCLUDED.nguoi_tao_id`, [donViId, thanhVienId, actorId, ...values], client);
    }
}
async function ghiLichSu({ donViId, thanhVienId, actorId, loai, chiNhanhCuId = null, chiNhanhMoiId = null, viTriCuId = null, viTriMoiId = null, trangThaiCu = null, trangThaiMoi = null, lyDo = null }, client) {
    await query(`INSERT INTO lich_su_cong_tac_nhan_vien (don_vi_id, thanh_vien_don_vi_id, loai_su_kien, chi_nhanh_cu_id, chi_nhanh_moi_id, vi_tri_cu_id, vi_tri_moi_id, trang_thai_cu, trang_thai_moi, ngay_hieu_luc, nguoi_thuc_hien_id, ly_do, nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now(),$10,$11,$10)`, [donViId, thanhVienId, loai, chiNhanhCuId, chiNhanhMoiId, viTriCuId, viTriMoiId, trangThaiCu, trangThaiMoi, actorId, lyDo], client);
}
async function ghiAudit(donViId, actorId, thanhVienId, hanhDong, requestId, client) {
    await query(`INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, request_id, nguon) VALUES ($1,$2,$3,'thanh_vien_don_vi',$4,'THANH_CONG',$5,'API')`, [donViId, actorId, hanhDong, thanhVienId, requestId], client);
}
module.exports = { danhSach, layCoBan, layThanhVienCuaToi, layChiNhanh, layVaiTro, layPhanCongViTri, layLoiMoi, layLichSu, layDeSua, coVaiTroQuanTri, capNhatHoSo, ghiLichSu, ghiAudit };