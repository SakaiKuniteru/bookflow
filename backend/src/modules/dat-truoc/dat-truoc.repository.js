const { query } = require('../../database/query.js');
class DatTruocRepository {
    async mot(sql,params = [],client) {
        const { rows } = await query(sql,params,client);
        return rows[0] ?? null;
    }
    async nhieu(sql,params = [],client) {
        const { rows } = await query(sql,params,client);
        return rows;
    }
    async lay(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM dat_truoc WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async chiTiet(donViId,id,client,khoa = false) {
        return this.nhieu(`SELECT c.*,p.ten_phien_ban,p.ten_hien_thi,p.isbn_13,p.isbn_10 FROM chi_tiet_dat_truoc c JOIN phien_ban_sach p ON p.id = c.phien_ban_sach_id WHERE c.don_vi_id = $1 AND c.dat_truoc_id = $2 ORDER BY c.id${khoa ? ' FOR UPDATE OF c' : ''}`,[donViId,id],client);
    }
    async phanBo(donViId,chiTietId,client) {
        return this.nhieu(`SELECT p.*,t.kho_id,t.vi_tri_kho_id,t.phien_ban_sach_id,t.lo_ton_kho_id FROM phan_bo_sach_dat_truoc p JOIN ton_kho t ON t.don_vi_id = p.don_vi_id AND t.kho_id = p.kho_id AND t.vi_tri_kho_id = p.vi_tri_kho_id AND t.phien_ban_sach_id = $3 AND t.id IN (SELECT ton_kho_id FROM giu_cho_ton_kho WHERE don_vi_id = p.don_vi_id AND chi_tiet_chung_tu_id = p.chi_tiet_dat_truoc_id LIMIT 1) WHERE p.don_vi_id = $1 AND p.chi_tiet_dat_truoc_id = $2 ORDER BY p.id`,[donViId,chiTietId,chiTietId],client);
    }
    async danhSach(donViId,filter,client) {
        const where = ['d.don_vi_id = $1'];
        const params = [donViId];
        for (const [col,val] of [['khach_hang_id',filter.khach_hang_id],['chi_nhanh_id',filter.chi_nhanh_id],['trang_thai',filter.trang_thai]]) {
            if (val != null) {
                params.push(val);
                where.push(`d.${col} = $${params.length}`);
            }
        }
        if (filter.phien_ban_sach_id != null) {
            params.push(filter.phien_ban_sach_id);
            where.push(`EXISTS (SELECT 1 FROM chi_tiet_dat_truoc x WHERE x.don_vi_id = d.don_vi_id AND x.dat_truoc_id = d.id AND x.phien_ban_sach_id = $${params.length})`);
        }
        const from = `FROM dat_truoc d JOIN khach_hang k ON k.don_vi_id = d.don_vi_id AND k.id = d.khach_hang_id WHERE ${where.join(' AND ')}`;
        const count = await this.mot(`SELECT count(*)::integer AS tong_so ${from}`,params,client);
        const rows = await this.nhieu(`SELECT d,k.ho_ten,k.ma_khach_hang,COALESCE((SELECT SUM(c.so_luong) FROM chi_tiet_dat_truoc c WHERE c.don_vi_id = d.don_vi_id AND c.dat_truoc_id = d.id),0)::integer AS tong_so_luong,COALESCE((SELECT SUM(c.so_luong_da_phan_bo) FROM chi_tiet_dat_truoc c WHERE c.don_vi_id = d.don_vi_id AND c.dat_truoc_id = d.id),0)::integer AS tong_da_phan_bo ${from} ORDER BY d.muc_uu_tien DESC,d.ngay_dat,d.id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,[...params,filter.kich_thuoc,(filter.trang - 1) * filter.kich_thuoc],client);
        return { dat_truoc: rows,phan_trang: { trang: filter.trang,kich_thuoc: filter.kich_thuoc,tong_so: count.tong_so,tong_trang: Math.ceil(count.tong_so / filter.kich_thuoc) } };
    }
    async tao(donViId,data,ma,actorId,client) {
        return this.mot(`INSERT INTO dat_truoc(don_vi_id,chi_nhanh_id,khach_hang_id,don_hang_id,ma_dat_truoc,muc_uu_tien,ngay_du_kien_co_sach,ngay_het_han_nhan,ghi_chu,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,[donViId,data.chi_nhanh_id,data.khach_hang_id,data.don_hang_id,ma,data.muc_uu_tien,data.ngay_du_kien_co_sach,data.ngay_het_han_nhan,data.ghi_chu,actorId],client);
    }
    async taoChiTiet(donViId,datTruocId,item,client) {
        return this.mot(`INSERT INTO chi_tiet_dat_truoc(don_vi_id,dat_truoc_id,phien_ban_sach_id,hinh_thuc,so_luong,gia_du_kien,ngay_du_kien,ghi_chu) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,[donViId,datTruocId,item.phien_ban_sach_id,item.hinh_thuc,item.so_luong,item.gia_du_kien,item.ngay_du_kien,item.ghi_chu],client);
    }
    async capNhatTrangThai(donViId,id,trangThai,actorId,client) {
        return this.mot(`UPDATE dat_truoc SET trang_thai = $3,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[donViId,id,trangThai],client);
    }
}
module.exports = new DatTruocRepository();