const { query } = require('../../database/query.js');
class TonKhoRepository {
    async congNhap(donViId, actorId, phieu, dong, client) {
        if (dong.so_luong_dat === 0) return null;
        const values = [donViId, phieu.kho_id, dong.phien_ban_sach_id, dong.vi_tri_kho_id ?? null];
        await query(`INSERT INTO ton_kho (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id,so_luong_thuc_te) VALUES ($1,$2,$3,$4,0) ON CONFLICT (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id) DO NOTHING`, values, client);
        const { rows: [truoc] } = await query(`SELECT * FROM ton_kho WHERE don_vi_id = $1 AND kho_id = $2 AND phien_ban_sach_id = $3 AND vi_tri_kho_id IS NOT DISTINCT FROM $4::integer FOR UPDATE`, values, client);
        const tonSau = truoc.so_luong_thuc_te + dong.so_luong_dat;
        const { rows: [ton] } = await query(`UPDATE ton_kho SET so_luong_thuc_te = $2, ngay_cap_nhat = now() WHERE id = $1 RETURNING *`, [truoc.id, tonSau], client);
        const { rows: [bienDong] } = await query(`INSERT INTO bien_dong_ton_kho (don_vi_id,kho_id,phien_ban_sach_id,vi_tri_kho_id,loai_bien_dong,so_luong_thay_doi,ton_truoc,ton_sau,phieu_nhap_kho_id,chi_tiet_phieu_nhap_id,ma_tham_chieu,nguoi_thuc_hien_id,ghi_chu) VALUES ($1,$2,$3,$4,'NHAP_KHO',$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`, [donViId, phieu.kho_id, dong.phien_ban_sach_id, dong.vi_tri_kho_id ?? null, dong.so_luong_dat, truoc.so_luong_thuc_te, tonSau, phieu.id, dong.id, phieu.so_phieu, actorId, dong.ghi_chu], client);
        return { ton_kho: ton, bien_dong: bienDong };
    }
    async danhSach(donViId, boLoc, client) {
        const where = ['t.don_vi_id = $1'];
        const values = [donViId];
        if (boLoc.kho_id) { values.push(boLoc.kho_id); where.push(`t.kho_id = $${values.length}`); }
        if (boLoc.phien_ban_sach_id) { values.push(boLoc.phien_ban_sach_id); where.push(`t.phien_ban_sach_id = $${values.length}`); }
        if (boLoc.vi_tri_kho_id) { values.push(boLoc.vi_tri_kho_id); where.push(`t.vi_tri_kho_id = $${values.length}`); }
        if (boLoc.chi_nhanh_id) { values.push(boLoc.chi_nhanh_id); where.push(`k.chi_nhanh_id = $${values.length}`); }
        if (boLoc.co_ton === 'true') where.push('t.so_luong_thuc_te > 0');
        const dieuKien = where.join(' AND ');
        const from = `FROM ton_kho t JOIN kho k ON k.id = t.kho_id AND k.don_vi_id = t.don_vi_id WHERE ${dieuKien}`;
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so ${from}`, values, client);
        const { rows } = await query(`SELECT t.*, k.chi_nhanh_id, t.so_luong_thuc_te - t.so_luong_giu_cho AS so_luong_kha_dung ${from} ORDER BY t.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client);
        return { ton_kho: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / boLoc.kich_thuoc) } };
    }
    async tongHop(donViId, boLoc, client) {
        const where = ['t.don_vi_id = $1'];
        const values = [donViId];
        if (boLoc.kho_id) { values.push(boLoc.kho_id); where.push(`t.kho_id = $${values.length}`); }
        if (boLoc.chi_nhanh_id) { values.push(boLoc.chi_nhanh_id); where.push(`k.chi_nhanh_id = $${values.length}`); }
        if (boLoc.phien_ban_sach_id) { values.push(boLoc.phien_ban_sach_id); where.push(`t.phien_ban_sach_id = $${values.length}`); }
        const { rows } = await query(`SELECT k.chi_nhanh_id,t.kho_id,t.phien_ban_sach_id,sum(t.so_luong_thuc_te)::bigint AS so_luong_thuc_te,sum(t.so_luong_giu_cho)::bigint AS so_luong_giu_cho,sum(t.so_luong_thuc_te-t.so_luong_giu_cho)::bigint AS so_luong_kha_dung FROM ton_kho t JOIN kho k ON k.id = t.kho_id AND k.don_vi_id = t.don_vi_id WHERE ${where.join(' AND ')} GROUP BY k.chi_nhanh_id,t.kho_id,t.phien_ban_sach_id ORDER BY k.chi_nhanh_id,t.kho_id,t.phien_ban_sach_id`, values, client);
        return { tong_hop: rows };
    }
    async lichSu(donViId, boLoc, client) {
        const where = ['b.don_vi_id = $1'];
        const values = [donViId];
        for (const [cot, value] of [['kho_id', boLoc.kho_id], ['phien_ban_sach_id', boLoc.phien_ban_sach_id], ['vi_tri_kho_id', boLoc.vi_tri_kho_id]]) {
            if (value) { values.push(value); where.push(`b.${cot} = $${values.length}`); }
        }
        if (boLoc.chi_nhanh_id) { values.push(boLoc.chi_nhanh_id); where.push(`k.chi_nhanh_id = $${values.length}`); }
        if (boLoc.loai_bien_dong) { values.push(boLoc.loai_bien_dong); where.push(`b.loai_bien_dong = $${values.length}`); }
        if (boLoc.tu_ngay) { values.push(boLoc.tu_ngay); where.push(`b.ngay_tao >= $${values.length}::date`); }
        if (boLoc.den_ngay) { values.push(boLoc.den_ngay); where.push(`b.ngay_tao < ($${values.length}::date + interval '1 day')`); }
        const from = `FROM bien_dong_ton_kho b JOIN kho k ON k.id = b.kho_id AND k.don_vi_id = b.don_vi_id WHERE ${where.join(' AND ')}`;
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so ${from}`, values, client);
        const { rows } = await query(`SELECT b.*,k.chi_nhanh_id ${from} ORDER BY b.ngay_tao DESC,b.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client);
        return { bien_dong_ton_kho: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / boLoc.kich_thuoc) } };
    }
}
module.exports = new TonKhoRepository();