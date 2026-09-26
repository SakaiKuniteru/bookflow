const { query } = require('../../database/query.js');
class ChuyenKhoRepository {
    async kho(donViId, khoId, client) {
        const { rows } = await query('SELECT * FROM kho WHERE don_vi_id = $1 AND id = $2', [donViId, khoId], client);
        return rows[0] ?? null;
    }
    async viTri(donViId, viTriId, client) {
        const { rows } = await query('SELECT * FROM vi_tri_kho WHERE don_vi_id = $1 AND id = $2', [donViId, viTriId], client);
        return rows[0] ?? null;
    }
    async phieu(donViId, phieuId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM phieu_chuyen_kho WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId], client);
        return rows[0] ?? null;
    }
    async chiTiet(donViId, phieuId, client) {
        const { rows } = await query('SELECT * FROM chi_tiet_chuyen_kho WHERE don_vi_id = $1 AND phieu_chuyen_kho_id = $2 ORDER BY id', [donViId, phieuId], client);
        return rows;
    }
    async danhSach(donViId, boLoc, client) {
        const values = [donViId];
        const where = ['don_vi_id = $1'];
        if (boLoc.trang_thai) { values.push(boLoc.trang_thai); where.push(`trang_thai = $${values.length}`); }
        if (boLoc.kho_id) { values.push(boLoc.kho_id); where.push(`(kho_nguon_id = $${values.length} OR kho_dich_id = $${values.length})`); }
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so FROM phieu_chuyen_kho WHERE ${dieuKien}`, values, client);
        const { rows } = await query(`SELECT * FROM phieu_chuyen_kho WHERE ${dieuKien} ORDER BY ngay_tao DESC,id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client);
        return { danh_sach: rows, phan_trang: { ...boLoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / boLoc.kich_thuoc) } };
    }
    async tao(donViId, actorId, data, client) {
        const { rows: [phieu] } = await query(`INSERT INTO phieu_chuyen_kho (don_vi_id,kho_nguon_id,kho_dich_id,ma_phieu,ly_do,ghi_chu,nguoi_tao_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [donViId, data.kho_nguon_id, data.kho_dich_id, `CK-TAM-${require('node:crypto').randomUUID()}`, data.ly_do, data.ghi_chu, actorId], client);
        const { rows: [ketQua] } = await query('UPDATE phieu_chuyen_kho SET ma_phieu = $2 WHERE id = $1 RETURNING *', [phieu.id, `CK-${String(phieu.id).padStart(10, '0')}`], client);
        return ketQua;
    }
    async themDong(donViId, phieuId, data, client) {
        const { rows } = await query(`INSERT INTO chi_tiet_chuyen_kho (don_vi_id,phieu_chuyen_kho_id,phien_ban_sach_id,vi_tri_nguon_id,vi_tri_dich_id,so_luong,ghi_chu) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [donViId, phieuId, data.phien_ban_sach_id, data.vi_tri_nguon_id, data.vi_tri_dich_id, data.so_luong, data.ghi_chu], client);
        return rows[0];
    }
    async xoaDong(donViId, phieuId, dongId, client) {
        const { rows } = await query('DELETE FROM chi_tiet_chuyen_kho WHERE don_vi_id = $1 AND phieu_chuyen_kho_id = $2 AND id = $3 RETURNING id', [donViId, phieuId, dongId], client);
        return rows[0] ?? null;
    }
    async trangThai(donViId, phieuId, actorId, trangThai, client) {
        const xuat = trangThai === 'DA_XUAT';
        const nhan = trangThai === 'DA_NHAN';
        const { rows } = await query(`UPDATE phieu_chuyen_kho SET trang_thai = $3,ngay_cap_nhat = now(),nguoi_xuat_id = CASE WHEN $4 THEN $6 ELSE nguoi_xuat_id END,ngay_xuat = CASE WHEN $4 THEN now() ELSE ngay_xuat END,nguoi_nhan_id = CASE WHEN $5 THEN $6 ELSE nguoi_nhan_id END,ngay_nhan = CASE WHEN $5 THEN now() ELSE ngay_nhan END WHERE don_vi_id = $1 AND id = $2 RETURNING *`, [donViId, phieuId, trangThai, xuat, nhan, actorId], client);
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
    async bienDong(donViId, actorId, phieu, dong, loai, truoc, sau, client) {
        const khoId = loai === 'DIEU_CHUYEN_RA' ? phieu.kho_nguon_id : phieu.kho_dich_id;
        const viTriId = loai === 'DIEU_CHUYEN_RA' ? dong.vi_tri_nguon_id : dong.vi_tri_dich_id;
        const delta = loai === 'DIEU_CHUYEN_RA' ? -dong.so_luong : dong.so_luong;
        const { rows } = await query(`INSERT INTO bien_dong_ton_kho (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id,loai_bien_dong,so_luong_thay_doi,ton_truoc,ton_sau,ma_tham_chieu,nguoi_thuc_hien_id,ghi_chu) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`, [donViId, khoId, dong.phien_ban_sach_id, viTriId, loai, delta, truoc, sau, `${phieu.ma_phieu}/${dong.id}`, actorId, dong.ghi_chu], client);
        return rows[0];
    }
    async nhatKy(donViId, actorId, phieuId, hanhDong, requestId, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,doi_tuong_id,ket_qua,ly_do,request_id,nguon) VALUES ($1,$2,$3,'phieu_chuyen_kho',$4,'THANH_CONG','Điều chuyển kho',$5,'API')`, [donViId, actorId, hanhDong, phieuId, requestId], client);
    }
}
module.exports = new ChuyenKhoRepository();