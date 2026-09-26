const { query } = require('../../database/query.js');
class BanHangRepository {
    async layCa(donViId,id,client,khoa = false) {
        const { rows } = await query(`SELECT * FROM ca_ban_hang WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
        return rows[0] ?? null;
    }
    async danhSachCa(donViId,chiNhanhId,client) {
        const { rows } = await query('SELECT * FROM ca_ban_hang WHERE don_vi_id = $1 AND ($2::integer IS NULL OR chi_nhanh_id = $2) ORDER BY ngay_mo DESC,id DESC LIMIT 100',[donViId,chiNhanhId],client);
        return rows;
    }
    async taoCa(donViId,data,ma,thuNganId,client) {
        const { rows } = await query('INSERT INTO ca_ban_hang(don_vi_id,chi_nhanh_id,ma_ca,thu_ngan_id,tien_dau_ca,ghi_chu) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[donViId,data.chi_nhanh_id,ma,thuNganId,data.tien_dau_ca,data.ghi_chu],client);
        return rows[0];
    }
    async layPhien(donViId,id,client,khoa = false) {
        const { rows } = await query(`SELECT * FROM phien_ban_hang WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
        return rows[0] ?? null;
    }
    async danhSachPhien(donViId,caId,client) {
        const { rows } = await query('SELECT * FROM phien_ban_hang WHERE don_vi_id = $1 AND ($2::bigint IS NULL OR ca_ban_hang_id = $2) ORDER BY ngay_bat_dau DESC,id DESC LIMIT 100',[donViId,caId],client);
        return rows;
    }
    async taoPhien(donViId,data,ma,nguoiId,client) {
        const { rows } = await query('INSERT INTO phien_ban_hang(don_vi_id,ca_ban_hang_id,kenh_ban,ma_phien,thiet_bi,nguoi_ban_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING *',[donViId,data.ca_ban_hang_id,data.kenh_ban,ma,data.thiet_bi,nguoiId],client);
        return rows[0];
    }
    async chotPhien(donViId,id,donHangId,client) {
        const { rows } = await query(`UPDATE phien_ban_hang SET don_hang_id = $3,trang_thai = 'DA_CHOT',ngay_ket_thuc = now() WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_BAN' RETURNING *`,[donViId,id,donHangId],client);
        return rows[0] ?? null;
    }
}
module.exports = new BanHangRepository();