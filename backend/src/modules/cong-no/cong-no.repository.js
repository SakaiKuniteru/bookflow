const { query } = require('../../database/query.js');
class CongNoRepository {
    async mot(sql,params = [],client) { const { rows } = await query(sql,params,client); return rows[0] ?? null; }
    async nhieu(sql,params = [],client) { const { rows } = await query(sql,params,client); return rows; }
    async lay(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM cong_no WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async danhSach(donViId,filter,client) {
        const p = [donViId];
        const where = ['don_vi_id = $1'];
        for (const col of ['loai_cong_no','trang_thai','chi_nhanh_id','khach_hang_id','nha_cung_cap_id']) if (filter[col] != null) { p.push(filter[col]); where.push(`${col} = $${p.length}`); }
        const dem = await this.mot(`SELECT count(*)::integer AS n,COALESCE(SUM(so_tien_goc - so_tien_da_thanh_toan - so_tien_da_giam),0)::numeric AS tong_du_no FROM cong_no WHERE ${where.join(' AND ')}`,p,client);
        const rows = await this.nhieu(`SELECT *,so_tien_goc - so_tien_da_thanh_toan - so_tien_da_giam AS so_tien_con_lai FROM cong_no WHERE ${where.join(' AND ')} ORDER BY ngay_tao DESC,id DESC LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,[...p,filter.limit,filter.offset],client);
        return { danh_sach: rows,tong_du_no: dem.tong_du_no,phan_trang: { trang: filter.trang,kich_thuoc: filter.kich_thuoc,tong_so: dem.n,tong_trang: Math.ceil(dem.n / filter.kich_thuoc) } };
    }
    async butToan(donViId,id,client) {
        return this.nhieu('SELECT * FROM but_toan_cong_no WHERE don_vi_id = $1 AND cong_no_id = $2 ORDER BY ngay_tao,id',[donViId,id],client);
    }
    async tao(donViId,data,ma,actorId,client) {
        return this.mot('INSERT INTO cong_no(don_vi_id,chi_nhanh_id,khach_hang_id,nha_cung_cap_id,ma_cong_no,loai_cong_no,loai_nguon,nguon_id,so_tien_goc,ngay_phat_sinh,ngay_den_han,ghi_chu,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,COALESCE($10::date,CURRENT_DATE),$11,$12,$13) RETURNING *',[donViId,data.chi_nhanh_id,data.khach_hang_id,data.nha_cung_cap_id,ma,data.loai_cong_no,data.loai_nguon,data.nguon_id,data.so_tien_goc,data.ngay_phat_sinh,data.ngay_den_han,data.ghi_chu,actorId],client);
    }
    async butToanMoi(donViId,no,loai,delta,truoc,sau,giaoDichId,ma,lyDo,actorId,client) {
        return this.mot('INSERT INTO but_toan_cong_no(don_vi_id,cong_no_id,loai,so_tien_thay_doi,du_no_truoc,du_no_sau,giao_dich_thanh_toan_id,ma_chung_tu,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[donViId,no.id,loai,delta,truoc,sau,giaoDichId,ma,lyDo,actorId],client);
    }
}
module.exports = new CongNoRepository();