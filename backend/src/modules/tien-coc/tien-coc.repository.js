const { query } = require('../../database/query.js');
class TienCocRepository {
    async mot(sql,p = [],client) { const { rows } = await query(sql,p,client); return rows[0] ?? null; }
    async nhieu(sql,p = [],client) { const { rows } = await query(sql,p,client); return rows; }
    async lay(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM tien_coc WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async danhSach(donViId,filter,client) {
        const p = [donViId];
        const where = ['don_vi_id = $1'];
        for (const col of ['khach_hang_id','loai_doi_tuong','trang_thai']) if (filter[col] != null) { p.push(filter[col]); where.push(`${col} = $${p.length}`); }
        const count = await this.mot(`SELECT count(*)::integer AS n FROM tien_coc WHERE ${where.join(' AND ')}`,p,client);
        const rows = await this.nhieu(`SELECT *,so_tien_da_thu - so_tien_da_khau_tru - so_tien_da_hoan - so_tien_dang_giu AS so_du_kha_dung FROM tien_coc WHERE ${where.join(' AND ')} ORDER BY ngay_tao DESC,id DESC LIMIT $${p.length + 1} OFFSET $${p.length + 2}`,[...p,filter.limit,filter.offset],client);
        return { danh_sach: rows,phan_trang: { trang: filter.trang,kich_thuoc: filter.kich_thuoc,tong_so: count.n,tong_trang: Math.ceil(count.n / filter.kich_thuoc) } };
    }
    async tao(donViId,data,ma,actorId,client) {
        return this.mot('INSERT INTO tien_coc(don_vi_id,khach_hang_id,ma_coc,loai_doi_tuong,doi_tuong_id,so_tien_yeu_cau,ngay_den_han,ghi_chu,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[donViId,data.khach_hang_id,ma,data.loai_doi_tuong,data.doi_tuong_id,data.so_tien_yeu_cau,data.ngay_den_han,data.ghi_chu,actorId],client);
    }
    async giaoDich(donViId,cocId,client) {
        return this.nhieu('SELECT * FROM giao_dich_tien_coc WHERE don_vi_id = $1 AND tien_coc_id = $2 ORDER BY ngay_tao,id',[donViId,cocId],client);
    }
    async butToan(donViId,coc,loai,soTien,truoc,sau,lyDo,actorId,gdId,client) {
        return this.mot('INSERT INTO giao_dich_tien_coc(don_vi_id,tien_coc_id,giao_dich_thanh_toan_id,loai,so_tien,so_du_truoc,so_du_sau,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *',[donViId,coc.id,gdId,loai,soTien,truoc,sau,lyDo,actorId],client);
    }
}
module.exports = new TienCocRepository();