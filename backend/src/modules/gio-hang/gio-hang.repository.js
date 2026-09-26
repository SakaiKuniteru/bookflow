const { query } = require('../../database/query.js');
class GioHangRepository {
    async lay(donViId,id,client,khoa = false) {
        const { rows } = await query(`SELECT * FROM gio_hang WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
        return rows[0] ?? null;
    }
    async danhSach(donViId,filters,client) {
        const { rows } = await query(`SELECT * FROM gio_hang WHERE don_vi_id = $1 AND ($2::integer IS NULL OR khach_hang_id = $2) AND ($3::integer IS NULL OR chi_nhanh_id = $3) AND ($4::varchar IS NULL OR trang_thai = $4) ORDER BY ngay_cap_nhat DESC,id DESC LIMIT $5 OFFSET $6`,[donViId,filters.khach_hang_id,filters.chi_nhanh_id,filters.trang_thai,filters.limit,filters.offset],client);
        return rows;
    }
    async matHang(donViId,gioHangId,client) {
        const { rows } = await query('SELECT * FROM chi_tiet_gio_hang WHERE don_vi_id = $1 AND gio_hang_id = $2 ORDER BY id',[donViId,gioHangId],client);
        return rows;
    }
    async layMatHang(donViId,gioHangId,matHangId,client) {
        const { rows } = await query('SELECT * FROM chi_tiet_gio_hang WHERE don_vi_id = $1 AND gio_hang_id = $2 AND id = $3',[donViId,gioHangId,matHangId],client);
        return rows[0] ?? null;
    }
    async tao(donViId,taiKhoanId,data,client) {
        const { rows } = await query(`INSERT INTO gio_hang(don_vi_id,khach_hang_id,tai_khoan_id,chi_nhanh_id,ngay_het_han) VALUES($1,$2,$3,$4,$5) RETURNING *`,[donViId,data.khach_hang_id,taiKhoanId,data.chi_nhanh_id,data.ngay_het_han],client);
        return rows[0];
    }
    async themMatHang(donViId,gioHangId,data,client) {
        const { rows } = await query(`INSERT INTO chi_tiet_gio_hang(don_vi_id,gio_hang_id,phien_ban_sach_id,hinh_thuc,so_luong,ngay_bat_dau_du_kien,ngay_ket_thuc_du_kien,ghi_chu) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(gio_hang_id,phien_ban_sach_id,hinh_thuc,ngay_bat_dau_du_kien,ngay_ket_thuc_du_kien) DO UPDATE SET so_luong = chi_tiet_gio_hang.so_luong + EXCLUDED.so_luong,ngay_cap_nhat = now() RETURNING *`,[donViId,gioHangId,data.phien_ban_sach_id,data.hinh_thuc,data.so_luong,data.ngay_bat_dau_du_kien ?? null,data.ngay_ket_thuc_du_kien ?? null,data.ghi_chu ?? null],client);
        return rows[0];
    }
    async suaMatHang(donViId,gioHangId,matHangId,data,client) {
        const fields = Object.keys(data);
        const params = [donViId,gioHangId,matHangId];
        const sets = fields.map((field,index) => `${field} = $${index + 4}`);
        const { rows } = await query(`UPDATE chi_tiet_gio_hang SET ${sets.join(',')},ngay_cap_nhat = now() WHERE don_vi_id = $1 AND gio_hang_id = $2 AND id = $3 RETURNING *`,params.concat(Object.values(data)),client);
        return rows[0] ?? null;
    }
    async xoaMatHang(donViId,gioHangId,matHangId,client) {
        const { rows } = await query('DELETE FROM chi_tiet_gio_hang WHERE don_vi_id = $1 AND gio_hang_id = $2 AND id = $3 RETURNING id',[donViId,gioHangId,matHangId],client);
        return rows[0] ?? null;
    }
    async lamRong(donViId,gioHangId,client) {
        const { rowCount } = await query('DELETE FROM chi_tiet_gio_hang WHERE don_vi_id = $1 AND gio_hang_id = $2',[donViId,gioHangId],client);
        return rowCount;
    }
    async huy(donViId,id,client) {
        const { rows } = await query(`UPDATE gio_hang SET trang_thai = 'DA_HUY',ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'HOAT_DONG' RETURNING *`,[donViId,id],client);
        return rows[0] ?? null;
    }
}
module.exports = new GioHangRepository();