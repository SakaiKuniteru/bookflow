const { query } = require('../../database/query.js');
class KiemKhoRepository {
    async kho(donViId, khoId, client) {
        const { rows } = await query('SELECT * FROM kho WHERE don_vi_id = $1 AND id = $2', [donViId, khoId], client);
        return rows[0] ?? null;
    }
    async phieu(donViId, phieuId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM phieu_kiem_kho WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId], client);
        return rows[0] ?? null;
    }
    async danhSach(donViId, loc, client) {
        const values = [donViId];
        const where = ['don_vi_id = $1'];
        if (loc.kho_id) { values.push(loc.kho_id); where.push(`kho_id = $${values.length}`); }
        if (loc.trang_thai) { values.push(loc.trang_thai); where.push(`trang_thai = $${values.length}`); }
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so FROM phieu_kiem_kho WHERE ${dieuKien}`, values, client);
        const { rows } = await query(`SELECT * FROM phieu_kiem_kho WHERE ${dieuKien} ORDER BY ngay_tao DESC,id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, loc.kich_thuoc, (loc.trang - 1) * loc.kich_thuoc], client);
        return { danh_sach: rows, phan_trang: { trang: loc.trang, kich_thuoc: loc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / loc.kich_thuoc) } };
    }
    async tao(donViId, actorId, data, client) {
        const { rows: [phieu] } = await query(`INSERT INTO phieu_kiem_kho (don_vi_id,kho_id,ma_phieu,ly_do,ghi_chu,nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [donViId, data.kho_id, `KK-TAM-${require('node:crypto').randomUUID()}`, data.ly_do, data.ghi_chu, actorId], client);
        const { rows: [ketQua] } = await query('UPDATE phieu_kiem_kho SET ma_phieu = $2 WHERE id = $1 RETURNING *', [phieu.id, `KK-${String(phieu.id).padStart(10, '0')}`], client);
        return ketQua;
    }
    async chiTiet(donViId, phieuId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM chi_tiet_kiem_kho WHERE don_vi_id = $1 AND phieu_kiem_kho_id = $2 ORDER BY id${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId], client);
        return rows;
    }
    async dong(donViId, phieuId, dongId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM chi_tiet_kiem_kho WHERE don_vi_id = $1 AND phieu_kiem_kho_id = $2 AND id = $3${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId, dongId], client);
        return rows[0] ?? null;
    }
    async taoAnhChup(donViId, phieuId, khoId, client) {
        const { rows } = await query(`INSERT INTO chi_tiet_kiem_kho (don_vi_id,phieu_kiem_kho_id,phien_ban_sach_id,vi_tri_kho_id,so_luong_so_sach) SELECT don_vi_id,$2,phien_ban_sach_id,vi_tri_kho_id,so_luong_thuc_te FROM ton_kho WHERE don_vi_id = $1 AND kho_id = $3 RETURNING *`, [donViId, phieuId, khoId], client);
        return rows;
    }
    async themDongKhongCoTrongSo(donViId, phieuId, sachId, viTriId, soLuong, client) {
        const { rows } = await query(`INSERT INTO chi_tiet_kiem_kho (don_vi_id,phieu_kiem_kho_id,phien_ban_sach_id,vi_tri_kho_id,so_luong_so_sach,so_luong_thuc_dem) VALUES ($1,$2,$3,$4,0,$5) RETURNING *`, [donViId, phieuId, sachId, viTriId, soLuong], client);
        return rows[0];
    }
    async dem(donViId, phieuId, dongId, data, client) {
        const { rows } = await query(`UPDATE chi_tiet_kiem_kho SET so_luong_thuc_dem = $4,ghi_chu = $5,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND phieu_kiem_kho_id = $2 AND id = $3 RETURNING *`, [donViId, phieuId, dongId, data.so_luong_thuc_dem, data.ghi_chu], client);
        return rows[0];
    }
    async trangThai(donViId, phieuId, actorId, trangThai, client) {
        const batDau = trangThai === 'DANG_KIEM';
        const duyet = trangThai === 'DA_DUYET';
        const { rows } = await query(`UPDATE phieu_kiem_kho SET trang_thai = $3,ngay_cap_nhat = now(),ngay_bat_dau = CASE WHEN $4 THEN now() ELSE ngay_bat_dau END,nguoi_duyet_id = CASE WHEN $5 THEN $6 ELSE nguoi_duyet_id END,ngay_duyet = CASE WHEN $5 THEN now() ELSE ngay_duyet END WHERE don_vi_id = $1 AND id = $2 RETURNING *`, [donViId, phieuId, trangThai, batDau, duyet, actorId], client);
        return rows[0];
    }
    async ton(donViId, khoId, sachId, viTriId, client) {
        const { rows } = await query('SELECT * FROM ton_kho WHERE don_vi_id = $1 AND kho_id = $2 AND phien_ban_sach_id = $3 AND vi_tri_kho_id IS NOT DISTINCT FROM $4::integer FOR UPDATE', [donViId, khoId, sachId, viTriId], client);
        return rows[0] ?? null;
    }
    async taoTonRong(donViId, khoId, sachId, viTriId, client) {
        await query('INSERT INTO ton_kho (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id,so_luong_thuc_te) VALUES ($1,$2,$3,$4,0) ON CONFLICT (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id) DO NOTHING', [donViId, khoId, sachId, viTriId], client);
    }
    async doiTon(tonId, soLuong, client) {
        const { rows } = await query('UPDATE ton_kho SET so_luong_thuc_te = $2,ngay_cap_nhat = now() WHERE id = $1 RETURNING *', [tonId, soLuong], client);
        return rows[0];
    }
    async bienDong(donViId, actorId, phieu, dong, truoc, sau, client) {
        const delta = sau - truoc;
        if (!delta) return null;
        const { rows } = await query(`INSERT INTO bien_dong_ton_kho (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id,loai_bien_dong,so_luong_thay_doi,ton_truoc,ton_sau,ma_tham_chieu,nguoi_thuc_hien_id,ghi_chu) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [donViId, phieu.kho_id, dong.phien_ban_sach_id, dong.vi_tri_kho_id, delta > 0 ? 'KIEM_KE_TANG' : 'KIEM_KE_GIAM', delta, truoc, sau, `${phieu.ma_phieu}/${dong.id}`, actorId, dong.ghi_chu], client);
        return rows[0];
    }
    async nhatKy(donViId, actorId, phieuId, hanhDong, requestId, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,doi_tuong_id,ket_qua,ly_do,request_id,nguon) VALUES ($1,$2,$3,'phieu_kiem_kho',$4,'THANH_CONG','Kiểm kê kho',$5,'API')`, [donViId, actorId, hanhDong, phieuId, requestId], client);
    }
}
module.exports = new KiemKhoRepository();