const { query } = require('../../database/query.js');
class MuonTraRepository {
    async mot(sql,params = [],client) {
        const { rows } = await query(sql,params,client);
        return rows[0] ?? null;
    }
    async nhieu(sql,params = [],client) {
        const { rows } = await query(sql,params,client);
        return rows;
    }
    async lay(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM muon_tra WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async chiTiet(donViId,muonTraId,client,khoa = false) {
        return this.nhieu(`SELECT c.*,s.ma_cuon,s.ma_vach,s.rfid,s.so_serial,s.phien_ban_sach_id,s.kho_id,s.vi_tri_kho_id,s.tinh_trang,s.trang_thai AS trang_thai_cuon,p.ten_phien_ban,p.ten_hien_thi,p.isbn_13,p.isbn_10 FROM chi_tiet_muon_tra c JOIN cuon_sach s ON s.don_vi_id = c.don_vi_id AND s.id = c.cuon_sach_id JOIN phien_ban_sach p ON p.id = s.phien_ban_sach_id WHERE c.don_vi_id = $1 AND c.muon_tra_id = $2 ORDER BY c.id${khoa ? ' FOR UPDATE OF c,s' : ''}`,[donViId,muonTraId],client);
    }
    async danhSach(donViId,filter,client) {
        const where = ['m.don_vi_id = $1'];
        const params = [donViId];
        for (const [col,val] of [['khach_hang_id',filter.khach_hang_id],['chi_nhanh_id',filter.chi_nhanh_id],['loai',filter.loai],['trang_thai',filter.trang_thai]]) {
            if (val != null) {
                params.push(val);
                where.push(`m.${col} = $${params.length}`);
            }
        }
        const from = `FROM muon_tra m JOIN khach_hang k ON k.don_vi_id = m.don_vi_id AND k.id = m.khach_hang_id WHERE ${where.join(' AND ')}`;
        const count = await this.mot(`SELECT count(*)::integer AS tong_so ${from}`,params,client);
        const rows = await this.nhieu(`SELECT m,k.ho_ten,k.ma_khach_hang,(SELECT count(*) FROM chi_tiet_muon_tra c WHERE c.don_vi_id = m.don_vi_id AND c.muon_tra_id = m.id)::integer AS so_cuon,(SELECT count(*) FROM chi_tiet_muon_tra c WHERE c.don_vi_id = m.don_vi_id AND c.muon_tra_id = m.id AND c.trang_thai = 'DA_TRA')::integer AS so_cuon_da_tra ${from} ORDER BY m.ngay_tao DESC,m.id DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,[...params,filter.kich_thuoc,(filter.trang - 1) * filter.kich_thuoc],client);
        return { muon_tra: rows,phan_trang: { trang: filter.trang,kich_thuoc: filter.kich_thuoc,tong_so: count.tong_so,tong_trang: Math.ceil(count.tong_so / filter.kich_thuoc) } };
    }
    async tao(donViId,data,ma,actorId,client) {
        return this.mot(`INSERT INTO muon_tra(don_vi_id,chi_nhanh_id,khach_hang_id,don_hang_id,ma_phieu,loai,ngay_bat_dau,ngay_hen_tra,tien_coc_id,ghi_chu,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,[donViId,data.chi_nhanh_id,data.khach_hang_id,data.don_hang_id,ma,data.loai,data.ngay_bat_dau,data.ngay_hen_tra,data.tien_coc_id,data.ghi_chu,actorId],client);
    }
    async taoChiTiet(donViId,muonTraId,item,client) {
        return this.mot(`INSERT INTO chi_tiet_muon_tra(don_vi_id,muon_tra_id,cuon_sach_id,ngay_hen_tra,phi_thue,ghi_chu) VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,[donViId,muonTraId,item.cuon_sach_id,item.ngay_hen_tra,item.phi_thue,item.ghi_chu],client);
    }
}
module.exports = new MuonTraRepository();