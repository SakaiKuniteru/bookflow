const { query } = require('../../database/query.js');
const { taoMaChung, TIEN_TO } = require('./ma-chung.js');
async function taoMaGiuCho(client, donViId) {
    return taoMaChung(client, donViId, TIEN_TO.GIU_CHO);
}
async function giuCho(client, { donViId, khoId, viTriKhoId, phienBanSachId, loTonKhoId, soLuong, nguonGiuCho, chungTuId, chiTietChungTuId, ngayHetHan, actorId, ghiChu }) {
    if (!Number.isInteger(soLuong) || soLuong <= 0) throw new Error('Số lượng giữ kho phải lớn hơn 0');
    const ton = await query(`SELECT * FROM ton_kho WHERE don_vi_id = $1 AND kho_id = $2 AND vi_tri_kho_id = $3 AND phien_ban_sach_id = $4 AND lo_ton_kho_id = $5 FOR UPDATE`, [donViId, khoId, viTriKhoId, phienBanSachId, loTonKhoId], client);
    if (!ton.rows.length) throw new Error('Không tìm thấy dòng tồn kho để giữ');
    const row = ton.rows[0];
    if (row.so_luong_kha_dung < soLuong) throw new Error('Tồn kho khả dụng không đủ');
    const maGiuCho = await taoMaGiuCho(client, donViId);
    const hold = await query(`INSERT INTO giu_cho_ton_kho(don_vi_id,ma_giu_cho,ton_kho_id,so_luong,nguon_giu_cho,chung_tu_id,chi_tiet_chung_tu_id,ngay_het_han,nguoi_tao_id,nguoi_cap_nhat_id,ghi_chu) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10) RETURNING *`, [donViId, maGiuCho, row.id, soLuong, nguonGiuCho, chungTuId ?? null, chiTietChungTuId ?? null, ngayHetHan ?? null, actorId, ghiChu ?? null], client);
    const tonSau = Number(row.so_luong_giu_cho) + soLuong;
    await query(`UPDATE ton_kho SET so_luong_giu_cho = $2,ngay_cap_nhat = now(),nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $4`, [donViId, tonSau, actorId, row.id], client);
    const bienDong = await query(`INSERT INTO bien_dong_ton_kho(don_vi_id,ma_giao_dich,ton_kho_id,kho_id,vi_tri_kho_id,phien_ban_sach_id,lo_ton_kho_id,loai_bien_dong,nguon_chung_tu,chung_tu_id,chi_tiet_chung_tu_id,thay_doi_giu_cho,ton_truoc,ton_sau,gia_von_don_vi,noi_dung,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6,$7,'GIU_CHO',$8,$9,$10,$11,$12,$12,$13,$14,$15) RETURNING *`, [donViId, maGiuCho, row.id, row.kho_id, row.vi_tri_kho_id, row.phien_ban_sach_id, row.lo_ton_kho_id, nguonGiuCho, chungTuId ?? null, chiTietChungTuId ?? null, soLuong, row.so_luong_thuc_te, row.so_luong_thuc_te, row.gia_von_don_vi, ghiChu ?? null, actorId], client);
    return { giu_cho: hold.rows[0], ton_kho: { ...row, so_luong_giu_cho: tonSau }, bien_dong: bienDong.rows[0] };
}
async function giaiPhong(client, { donViId, giuChoId, actorId, lyDo, trangThai = 'DA_GIAI_PHONG' }) {
    const holdResult = await query(`SELECT g.*,t.kho_id,t.vi_tri_kho_id,t.phien_ban_sach_id,t.lo_ton_kho_id,t.so_luong_thuc_te,t.so_luong_giu_cho,t.gia_von_don_vi FROM giu_cho_ton_kho g JOIN ton_kho t ON t.don_vi_id = g.don_vi_id AND t.id = g.ton_kho_id WHERE g.don_vi_id = $1 AND g.id = $2 FOR UPDATE OF g,t`, [donViId, giuChoId], client);
    if (!holdResult.rows.length) throw new Error('Không tìm thấy giữ kho');
    const hold = holdResult.rows[0];
    if (hold.trang_thai !== 'DANG_GIU') return hold;
    if (hold.so_luong_giu_cho < hold.so_luong) throw new Error('Dữ liệu giữ kho không hợp lệ');
    const tonSauGiu = Number(hold.so_luong_giu_cho) - Number(hold.so_luong);
    await query(`UPDATE ton_kho SET so_luong_giu_cho = $2,ngay_cap_nhat = now(),nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $4`, [donViId, tonSauGiu, actorId, hold.ton_kho_id], client);
    await query(`UPDATE giu_cho_ton_kho SET trang_thai = $3,ngay_giai_phong = now(),nguoi_giai_phong_id = $4,ly_do_giai_phong = $5,ngay_cap_nhat = now(),nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2`, [donViId, giuChoId, trangThai, actorId, lyDo ?? null], client);
    const maGiaoDich = await taoMaChung(client, donViId, TIEN_TO.GIU_CHO);
    const bienDong = await query(`INSERT INTO bien_dong_ton_kho(don_vi_id,ma_giao_dich,ton_kho_id,kho_id,vi_tri_kho_id,phien_ban_sach_id,lo_ton_kho_id,loai_bien_dong,nguon_chung_tu,chung_tu_id,chi_tiet_chung_tu_id,thay_doi_giu_cho,ton_truoc,ton_sau,gia_von_don_vi,noi_dung,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6,$7,'BO_GIU_CHO',$8,$9,$10,$11,$12,$12,$13,$14,$15,$16) RETURNING *`, [donViId, maGiaoDich, hold.ton_kho_id, hold.kho_id, hold.vi_tri_kho_id, hold.phien_ban_sach_id, hold.lo_ton_kho_id, hold.nguon_giu_cho, hold.chung_tu_id, hold.chi_tiet_chung_tu_id, -Number(hold.so_luong), hold.so_luong_thuc_te, hold.so_luong_thuc_te, hold.gia_von_don_vi, 'Giải phóng giữ kho', lyDo ?? null, actorId], client);
    return { ...hold, trang_thai: trangThai, so_luong_giu_cho_con_lai: tonSauGiu, bien_dong: bienDong.rows[0] };
}
async function danhSachDangGiu(client, donViId, chiTietChungTuId) {
    const { rows } = await query(`SELECT g.*,t.kho_id,t.vi_tri_kho_id,t.phien_ban_sach_id,t.lo_ton_kho_id FROM giu_cho_ton_kho g JOIN ton_kho t ON t.don_vi_id = g.don_vi_id AND t.id = g.ton_kho_id WHERE g.don_vi_id = $1 AND g.chi_tiet_chung_tu_id = $2 AND g.trang_thai = 'DANG_GIU' ORDER BY g.ngay_tao,g.id`, [donViId, chiTietChungTuId], client);
    return rows;
}
async function hetHan(client, donViId, actorId) {
    const { rows } = await query(`SELECT id FROM giu_cho_ton_kho WHERE don_vi_id = $1 AND trang_thai = 'DANG_GIU' AND ngay_het_han IS NOT NULL AND ngay_het_han <= now() ORDER BY id FOR UPDATE SKIP LOCKED`, [donViId], client);
    const ketQua = [];
    for (const row of rows) ketQua.push(await giaiPhong(client, { donViId, giuChoId: row.id, actorId, lyDo: 'Hết hạn giữ kho', trangThai: 'HET_HAN' }));
    return ketQua;
}
module.exports = { giuCho,giaiPhong,danhSachDangGiu,hetHan,taoMaGiuCho };