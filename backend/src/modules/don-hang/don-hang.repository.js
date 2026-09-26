const { query } = require('../../database/query.js');
class DonHangRepository {
    async lay(donViId,id,client,khoa = false) {
        const { rows } = await query(`SELECT * FROM don_hang WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
        return rows[0] ?? null;
    }
    async danhSach(donViId,queryParams,client) {
        const { rows } = await query(`SELECT * FROM don_hang WHERE don_vi_id = $1 AND ($2::integer IS NULL OR chi_nhanh_id = $2) AND ($3::integer IS NULL OR khach_hang_id = $3) AND ($4::varchar IS NULL OR trang_thai = $4) ORDER BY ngay_dat DESC,id DESC LIMIT $5 OFFSET $6`,[donViId,queryParams.chi_nhanh_id,queryParams.khach_hang_id,queryParams.trang_thai,queryParams.limit,queryParams.offset],client);
        return rows;
    }
    async chiTiet(donViId,donHangId,client,khoa = false) {
        const { rows } = await query(`SELECT * FROM chi_tiet_don_hang WHERE don_vi_id = $1 AND don_hang_id = $2 ORDER BY id${khoa ? ' FOR UPDATE' : ''}`,[donViId,donHangId],client);
        return rows;
    }
    async lichSu(donViId,donHangId,client) {
        const { rows } = await query('SELECT * FROM lich_su_trang_thai_don_hang WHERE don_vi_id = $1 AND don_hang_id = $2 ORDER BY ngay_tao,id',[donViId,donHangId],client);
        return rows;
    }
    async tao(donViId,data,client) {
        const { rows } = await query(`INSERT INTO don_hang(don_vi_id,chi_nhanh_id,khach_hang_id,gio_hang_id,ma_don_hang,kenh_ban,loai_don,trang_thai,tien_hang,tien_giam_gia,tien_thue,phi_van_chuyen,tien_coc_yeu_cau,tong_thanh_toan,ma_giam_gia_id,ma_giam_gia_ap_dung,ten_nguoi_mua,email_nguoi_mua,so_dien_thoai_nguoi_mua,thong_tin_xuat_hoa_don,ghi_chu_khach_hang,ghi_chu_noi_bo,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20::jsonb,$21,$22,$23) RETURNING *`,[donViId,data.chi_nhanh_id,data.khach_hang_id,data.gio_hang_id,data.ma_don_hang,data.kenh_ban,data.loai_don,data.trang_thai,data.tien_hang,data.tien_giam_gia,data.tien_thue,data.phi_van_chuyen,data.tien_coc_yeu_cau,data.tong_thanh_toan,data.ma_giam_gia_id,data.ma_giam_gia_ap_dung,data.ten_nguoi_mua,data.email_nguoi_mua,data.so_dien_thoai_nguoi_mua,JSON.stringify(data.thong_tin_xuat_hoa_don),data.ghi_chu_khach_hang,data.ghi_chu_noi_bo,data.nguoi_tao_id],client);
        return rows[0];
    }
    async taoChiTiet(donViId,donHangId,data,client) {
        const { rows } = await query(`INSERT INTO chi_tiet_don_hang(don_vi_id,don_hang_id,phien_ban_sach_id,ten_sach,isbn,hinh_thuc,so_luong,don_gia,giam_gia,thue_suat,tien_thue,thanh_tien,ngay_bat_dau_du_kien,ngay_ket_thuc_du_kien,ghi_chu) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,[donViId,donHangId,data.phien_ban_sach_id,data.ten_sach,data.isbn,data.hinh_thuc,data.so_luong,data.don_gia,'0','0','0',data.thanh_tien,data.ngay_bat_dau_du_kien ?? null,data.ngay_ket_thuc_du_kien ?? null,data.ghi_chu ?? null],client);
        return rows[0];
    }
    async ghiLichSu(donViId,donHangId,cu,moi,lyDo,nguoiId,client) {
        await query('INSERT INTO lich_su_trang_thai_don_hang(don_vi_id,don_hang_id,trang_thai_cu,trang_thai_moi,ly_do,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6)',[donViId,donHangId,cu,moi,lyDo,nguoiId],client);
    }
    async doiTrangThai(donViId,id,trangThai,nguoiId,lyDo,client) {
        const { rows } = await query(`UPDATE don_hang SET trang_thai = $3,ngay_xac_nhan = CASE WHEN $3 = 'DA_XAC_NHAN' THEN COALESCE(ngay_xac_nhan,now()) ELSE ngay_xac_nhan END,nguoi_xac_nhan_id = CASE WHEN $3 = 'DA_XAC_NHAN' THEN $4 ELSE nguoi_xac_nhan_id END,ngay_huy = CASE WHEN $3 = 'DA_HUY' THEN now() ELSE ngay_huy END,ly_do_huy = CASE WHEN $3 = 'DA_HUY' THEN $5 ELSE ly_do_huy END,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[donViId,id,trangThai,nguoiId,lyDo],client);
        return rows[0];
    }
    async vanDon(donViId,donHangId,client) {
        const { rows } = await query('SELECT * FROM van_don WHERE don_vi_id = $1 AND don_hang_id = $2 ORDER BY ngay_tao DESC,id DESC',[donViId,donHangId],client);
        return rows;
    }
}
module.exports = new DonHangRepository();