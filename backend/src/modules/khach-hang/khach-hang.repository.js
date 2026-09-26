const { query } = require('../../database/query.js');
const COT_KHACH_HANG = ['loai_khach_hang','ho_ten','ten_to_chuc','ma_so_thue','ngay_sinh','gioi_tinh','email','so_dien_thoai','anh_dai_dien_id','nguon_khach_hang','nguoi_gioi_thieu_id','ghi_chu','dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa'];
class KhachHangRepository {
    async danhSach(donViId, loc, client) {
        const values = [donViId];
        const where = ['don_vi_id = $1','ngay_xoa IS NULL'];
        if (loc.tu_khoa) { values.push(`%${loc.tu_khoa}%`); where.push(`(ma_khach_hang ILIKE $${values.length} OR ho_ten ILIKE $${values.length} OR email ILIKE $${values.length} OR so_dien_thoai ILIKE $${values.length})`); }
        if (loc.trang_thai) { values.push(loc.trang_thai); where.push(`trang_thai = $${values.length}`); }
        if (loc.loai_khach_hang) { values.push(loc.loai_khach_hang); where.push(`loai_khach_hang = $${values.length}`); }
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so FROM khach_hang WHERE ${dieuKien}`,values,client);
        const { rows } = await query(`SELECT * FROM khach_hang WHERE ${dieuKien} ORDER BY ngay_tao DESC,id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,[...values,loc.kich_thuoc,(loc.trang - 1) * loc.kich_thuoc],client);
        return { danh_sach: rows, phan_trang: { trang: loc.trang, kich_thuoc: loc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / loc.kich_thuoc) } };
    }
    async lay(donViId, khachHangId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL${khoa ? ' FOR UPDATE' : ''}`,[donViId,khachHangId],client);
        return rows[0] ?? null;
    }
    async tao(donViId, actorId, data, client) {
        const cot = ['don_vi_id','nguoi_tao_id','ma_khach_hang',...COT_KHACH_HANG];
        const values = [donViId,actorId,data.ma_khach_hang,...COT_KHACH_HANG.map(key => data[key])];
        const { rows } = await query(`INSERT INTO khach_hang (${cot.join(',')},thoi_diem_dong_y) VALUES (${values.map((_,i) => `$${i + 1}`).join(',')},CASE WHEN $${values.length + 1} THEN now() ELSE NULL END) RETURNING *`,[...values,data.dong_y_email || data.dong_y_sms || data.dong_y_ca_nhan_hoa],client);
        return rows[0];
    }
    async sua(donViId, khachHangId, data, client) {
        const entries = Object.entries(data);
        const values = [donViId,khachHangId,...entries.map(([,value]) => value)];
        const set = entries.map(([key],i) => `${key} = $${i + 3}`);
        const { rows: [khachHang] } = await query(`UPDATE khach_hang SET ${set.join(',')},ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL RETURNING *`,values,client);
        if (!khachHang) return null;
        if (['dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa'].some(key => key in data)) {
            const { rows: [ketQua] } = await query('UPDATE khach_hang SET thoi_diem_dong_y = CASE WHEN dong_y_email OR dong_y_sms OR dong_y_ca_nhan_hoa THEN COALESCE(thoi_diem_dong_y,now()) ELSE NULL END WHERE don_vi_id = $1 AND id = $2 RETURNING *',[donViId,khachHangId],client);
            return ketQua;
        }
        return khachHang;
    }
    async trangThai(donViId, khachHangId, trangThai, client) {
        const { rows } = await query('UPDATE khach_hang SET trang_thai = $3,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL RETURNING *',[donViId,khachHangId,trangThai],client);
        return rows[0] ?? null;
    }
    async diaChi(donViId, khachHangId, client) {
        const { rows } = await query('SELECT * FROM dia_chi_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY mac_dinh DESC,id',[donViId,khachHangId],client);
        return rows;
    }
    async layDiaChi(donViId, khachHangId, diaChiId, client) {
        const { rows } = await query('SELECT * FROM dia_chi_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3',[donViId,khachHangId,diaChiId],client);
        return rows[0] ?? null;
    }
    async boMacDinhDiaChi(donViId, khachHangId, loai, client) {
        await query('UPDATE dia_chi_khach_hang SET mac_dinh = FALSE,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND khach_hang_id = $2 AND loai_dia_chi = $3 AND mac_dinh = TRUE',[donViId,khachHangId,loai],client);
    }
    async taoDiaChi(donViId, khachHangId, data, client) {
        const cot = ['loai_dia_chi','nguoi_nhan','so_dien_thoai','quoc_gia','tinh_thanh','phuong_xa','dia_chi_chi_tiet','ma_buu_chinh','mac_dinh'];
        const values = [donViId,khachHangId,...cot.map(key => data[key] ?? (key === 'loai_dia_chi' ? 'GIAO_HANG' : key === 'quoc_gia' ? 'Việt Nam' : key === 'mac_dinh' ? false : null))];
        const { rows } = await query(`INSERT INTO dia_chi_khach_hang (don_vi_id,khach_hang_id,${cot.join(',')}) VALUES (${values.map((_,i) => `$${i + 1}`).join(',')}) RETURNING *`,values,client);
        return rows[0];
    }
    async suaDiaChi(donViId, khachHangId, diaChiId, data, client) {
        const entries = Object.entries(data);
        const { rows } = await query(`UPDATE dia_chi_khach_hang SET ${entries.map(([key],i) => `${key} = $${i + 4}`).join(',')},ngay_cap_nhat = now() WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3 RETURNING *`,[donViId,khachHangId,diaChiId,...entries.map(([,value]) => value)],client);
        return rows[0] ?? null;
    }
    async xoaDiaChi(donViId, khachHangId, diaChiId, client) {
        const { rows } = await query('DELETE FROM dia_chi_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3 RETURNING id',[donViId,khachHangId,diaChiId],client);
        return rows[0] ?? null;
    }
    async lienHe(donViId, khachHangId, client) {
        const { rows } = await query('SELECT * FROM lien_he_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY la_lien_he_chinh DESC,id',[donViId,khachHangId],client);
        return rows;
    }
    async layLienHe(donViId, khachHangId, lienHeId, client) {
        const { rows } = await query('SELECT * FROM lien_he_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3',[donViId,khachHangId,lienHeId],client);
        return rows[0] ?? null;
    }
    async boLienHeChinh(donViId, khachHangId, client) {
        await query('UPDATE lien_he_khach_hang SET la_lien_he_chinh = FALSE WHERE don_vi_id = $1 AND khach_hang_id = $2',[donViId,khachHangId],client);
    }
    async taoLienHe(donViId, khachHangId, data, client) {
        const cot = ['ho_ten','chuc_vu','email','so_dien_thoai','la_lien_he_chinh','ghi_chu'];
        const values = [donViId,khachHangId,...cot.map(key => data[key] ?? (key === 'la_lien_he_chinh' ? false : null))];
        const { rows } = await query(`INSERT INTO lien_he_khach_hang (don_vi_id,khach_hang_id,${cot.join(',')}) VALUES (${values.map((_,i) => `$${i + 1}`).join(',')}) RETURNING *`,values,client);
        return rows[0];
    }
    async suaLienHe(donViId, khachHangId, lienHeId, data, client) {
        const entries = Object.entries(data);
        const { rows } = await query(`UPDATE lien_he_khach_hang SET ${entries.map(([key],i) => `${key} = $${i + 4}`).join(',')} WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3 RETURNING *`,[donViId,khachHangId,lienHeId,...entries.map(([,value]) => value)],client);
        return rows[0] ?? null;
    }
    async xoaLienHe(donViId, khachHangId, lienHeId, client) {
        const { rows } = await query('DELETE FROM lien_he_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 AND id = $3 RETURNING id',[donViId,khachHangId,lienHeId],client);
        return rows[0] ?? null;
    }
    async tuongTac(donViId, khachHangId, limit = 50, client) {
        const { rows } = await query('SELECT * FROM tuong_tac_khach_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY ngay_tao DESC,id DESC LIMIT $3',[donViId,khachHangId,limit],client);
        return rows;
    }
    async taoTuongTac(donViId, khachHangId, actorId, data, client) {
        const cot = ['loai_tuong_tac','tieu_de','noi_dung','ket_qua','thoi_gian_hen','nguoi_phu_trach_id'];
        const values = [donViId,khachHangId,actorId,...cot.map(key => data[key])];
        const { rows } = await query(`INSERT INTO tuong_tac_khach_hang (don_vi_id,khach_hang_id,nguoi_tao_id,${cot.join(',')}) VALUES (${values.map((_,i) => `$${i + 1}`).join(',')}) RETURNING *`,values,client);
        return rows[0];
    }
    async giaoDich(donViId, khachHangId, client) {
        const { rows: donHang } = await query('SELECT id,ma_don_hang,kenh_ban,loai_don,trang_thai,trang_thai_thanh_toan,tong_thanh_toan,ngay_dat FROM don_hang WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY ngay_dat DESC,id DESC LIMIT 50',[donViId,khachHangId],client);
        const { rows: thanhToan } = await query('SELECT id,ma_giao_dich,loai_giao_dich,so_tien,trang_thai,thoi_gian_thanh_cong,ngay_tao FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY ngay_tao DESC,id DESC LIMIT 50',[donViId,khachHangId],client);
        const { rows: muonTra } = await query('SELECT id,ma_phieu,loai,trang_thai,ngay_bat_dau,ngay_hen_tra,ngay_tra_het FROM muon_tra WHERE don_vi_id = $1 AND khach_hang_id = $2 ORDER BY ngay_tao DESC,id DESC LIMIT 50',[donViId,khachHangId],client);
        return { don_hang: donHang, thanh_toan: thanhToan, muon_tra: muonTra };
    }
    async nhatKy(donViId, actorId, khachHangId, hanhDong, requestId, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,doi_tuong_id,ket_qua,ly_do,request_id,nguon) VALUES ($1,$2,$3,'khach_hang',$4,'THANH_CONG','Quản lý khách hàng',$5,'API')`,[donViId,actorId,hanhDong,khachHangId,requestId],client);
    }
}
module.exports = new KhachHangRepository();