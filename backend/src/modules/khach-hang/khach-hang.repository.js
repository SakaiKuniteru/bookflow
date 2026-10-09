const { query } = require('../../database/query.js');
const COT_KHACH_HANG = ['loai_khach_hang','ho_ten','ten_to_chuc','ma_so_thue','ngay_sinh','gioi_tinh','email','so_dien_thoai','anh_dai_dien_id','nguon_khach_hang','nguoi_gioi_thieu_id','ghi_chu','dong_y_email','dong_y_sms','dong_y_ca_nhan_hoa'];
class KhachHangRepository {
    async danhSach(donViId, loc, client) {
        const values = [donViId];
        const where = ['kh.don_vi_id = $1','kh.ngay_xoa IS NULL'];
        if (loc.tu_khoa) { values.push(`%${loc.tu_khoa}%`); where.push(`(kh.ma_khach_hang ILIKE $${values.length} OR COALESCE(tk.ho_ten,kh.ho_ten) ILIKE $${values.length} OR COALESCE(tk.email,kh.email) ILIKE $${values.length} OR COALESCE(tk.so_dien_thoai,kh.so_dien_thoai) ILIKE $${values.length} OR tk.ten_dang_nhap ILIKE $${values.length})`); }
        if (loc.trang_thai) { values.push(loc.trang_thai); where.push(`kh.trang_thai = $${values.length}`); }
        const dieuKien = where.join(' AND ');
        const join = ' FROM khach_hang kh LEFT JOIN tai_khoan tk ON tk.id = kh.tai_khoan_id';
        const cotSapXep = { maKhachHang: 'kh.ma_khach_hang', hoTen: 'COALESCE(tk.ho_ten,kh.ho_ten)', tenDangNhap: 'tk.ten_dang_nhap', ngaySinh: 'COALESCE(tk.ngay_sinh,kh.ngay_sinh)', diaChiChiTiet: 'tk.dia_chi_chi_tiet', email: 'COALESCE(tk.email,kh.email)', soDienThoai: 'COALESCE(tk.so_dien_thoai,kh.so_dien_thoai)', trangThai: 'kh.trang_thai' };
        const orderBy = `${cotSapXep[loc.sap_xep] || cotSapXep.hoTen} ${loc.thu_tu === 'desc' ? 'DESC' : 'ASC'} NULLS LAST,kh.id DESC`;
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so${join} WHERE ${dieuKien}`,values,client);
        const { rows } = await query(`SELECT kh.*,tk.ten_dang_nhap,COALESCE(tk.ho_ten,kh.ho_ten) AS ho_ten,COALESCE(tk.email,kh.email) AS email,COALESCE(tk.so_dien_thoai,kh.so_dien_thoai) AS so_dien_thoai,COALESCE(tk.ngay_sinh,kh.ngay_sinh) AS ngay_sinh,COALESCE(tk.gioi_tinh,kh.gioi_tinh) AS gioi_tinh,tk.quoc_tich,tk.dan_toc,tk.mo_ta,tk.dia_chi_chi_tiet,tk.quoc_gia,tk.tinh_thanh_pho,tk.phuong_xa${join} WHERE ${dieuKien} ORDER BY ${orderBy} LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,[...values,loc.kich_thuoc,(loc.trang - 1) * loc.kich_thuoc],client);
        return { danh_sach: rows, phan_trang: { trang: loc.trang, kich_thuoc: loc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / loc.kich_thuoc) } };
    }
    async lay(donViId, khachHangId, client, khoa = false) {
        const { rows } = await query(`SELECT kh.*,tk.ten_dang_nhap,COALESCE(tk.ho_ten,kh.ho_ten) AS ho_ten,COALESCE(tk.email,kh.email) AS email,COALESCE(tk.so_dien_thoai,kh.so_dien_thoai) AS so_dien_thoai,COALESCE(tk.ngay_sinh,kh.ngay_sinh) AS ngay_sinh,COALESCE(tk.gioi_tinh,kh.gioi_tinh) AS gioi_tinh,tk.quoc_tich,tk.dan_toc,tk.mo_ta,tk.dia_chi_chi_tiet,tk.quoc_gia,tk.tinh_thanh_pho,tk.phuong_xa FROM khach_hang kh LEFT JOIN tai_khoan tk ON tk.id = kh.tai_khoan_id WHERE kh.don_vi_id = $1 AND kh.id = $2 AND kh.ngay_xoa IS NULL${khoa ? ' FOR UPDATE OF kh' : ''}`,[donViId,khachHangId],client);
        return rows[0] ?? null;
    }
    async taoMaKhachHang(donViId, tienTo, client) {
        const { rows: [row] } = await query(`WITH ngay AS (SELECT EXTRACT(YEAR FROM (now() AT TIME ZONE d.mui_gio))::integer AS nam, EXTRACT(MONTH FROM (now() AT TIME ZONE d.mui_gio))::integer AS thang FROM don_vi d WHERE d.id = $1), daDung AS (SELECT COALESCE(MAX(RIGHT(kh.ma_khach_hang, 6)::integer), 0) AS gia_tri FROM khach_hang kh CROSS JOIN ngay WHERE kh.don_vi_id = $1 AND kh.ma_khach_hang ~ ('^' || $2 || RIGHT(ngay.nam::text, 2) || LPAD(ngay.thang::text, 2, '0') || '[0-9]{6}$')), dem AS (INSERT INTO bo_dem_ma_khach_hang (don_vi_id, tien_to, nam, thang, gia_tri) SELECT $1, $2, ngay.nam, ngay.thang, daDung.gia_tri + 1 FROM ngay CROSS JOIN daDung WHERE daDung.gia_tri < 999999 ON CONFLICT (don_vi_id, tien_to, nam, thang) DO UPDATE SET gia_tri = GREATEST(bo_dem_ma_khach_hang.gia_tri + 1, EXCLUDED.gia_tri) WHERE bo_dem_ma_khach_hang.gia_tri < 999999 AND GREATEST(bo_dem_ma_khach_hang.gia_tri + 1, EXCLUDED.gia_tri) <= 999999 RETURNING nam, thang, gia_tri) SELECT $2 || RIGHT(dem.nam::text, 2) || LPAD(dem.thang::text, 2, '0') || LPAD(dem.gia_tri::text, 6, '0') AS ma_khach_hang FROM dem`, [donViId, tienTo], client);
        return row?.ma_khach_hang ?? null;
    }
    async emailTaiKhoanDaTonTai(email, client, exceptId = null) {
        const { rows } = await query("SELECT id FROM tai_khoan WHERE lower(email)=lower($1) AND ($2::integer IS NULL OR id <> $2) LIMIT 1", [email, exceptId], client);
        return rows.length > 0;
    }
    async tenDangNhapDaTonTai(tenDangNhap, client) {
        const { rows } = await query("SELECT id FROM tai_khoan WHERE lower(ten_dang_nhap)=lower($1) LIMIT 1", [tenDangNhap], client);
        return rows.length > 0;
    }
    async soDienThoaiTaiKhoanDaTonTai(soDienThoai, client, exceptId = null) {
        const { rows } = await query(`SELECT id FROM tai_khoan WHERE so_dien_thoai IS NOT NULL AND regexp_replace(regexp_replace(so_dien_thoai, '[^0-9]', '', 'g'), '^84', '0') = regexp_replace(regexp_replace($1, '[^0-9]', '', 'g'), '^84', '0') AND ($2::integer IS NULL OR id <> $2) LIMIT 1`, [soDienThoai, exceptId], client);
        return rows.length > 0;
    }
    async soDienThoaiKhachHangDaTonTai(donViId, soDienThoai, client, exceptId = null) {
        const { rows } = await query(`SELECT id FROM khach_hang WHERE don_vi_id = $1 AND ngay_xoa IS NULL AND so_dien_thoai IS NOT NULL AND regexp_replace(regexp_replace(so_dien_thoai, '[^0-9]', '', 'g'), '^84', '0') = regexp_replace(regexp_replace($2, '[^0-9]', '', 'g'), '^84', '0') AND ($3::integer IS NULL OR id <> $3) LIMIT 1`, [donViId, soDienThoai, exceptId], client);
        return rows.length > 0;
    }
    async taoTaiKhoanKhachHang(data, client) {
        const { rows } = await query(`INSERT INTO tai_khoan (email,so_dien_thoai,ho_ten,ten_dang_nhap,mat_khau_bam,email_da_xac_minh,trang_thai,bat_buoc_doi_mat_khau,mat_khau_tam_het_han,don_vi_kich_hoat_id,ngay_sinh,gioi_tinh,quoc_tich,dan_toc,mo_ta,dia_chi_chi_tiet,quoc_gia,tinh_thanh_pho,phuong_xa) VALUES ($1,$2,$3,$4,$5,TRUE,'DANG_DUNG',TRUE,now()+interval '24 hours',$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id,email,ho_ten,ten_dang_nhap`, [data.email,data.so_dien_thoai,data.ho_ten,data.ten_dang_nhap,data.mat_khau_bam,data.don_vi_id,data.ngay_sinh,data.gioi_tinh,data.quoc_tich,data.dan_toc,data.mo_ta,data.dia_chi_chi_tiet,data.quoc_gia,data.tinh_thanh_pho,data.phuong_xa], client);
        return rows[0];
    }
    async suaTaiKhoanKhachHang(taiKhoanId, data, client) {
        const fields = ['ho_ten','email','so_dien_thoai','ngay_sinh','gioi_tinh','quoc_tich','dan_toc','mo_ta','dia_chi_chi_tiet','quoc_gia','tinh_thanh_pho','phuong_xa'];
        const entries = fields.filter(key => Object.hasOwn(data,key)).map(key => [key,data[key]]);
        if (!entries.length) return null;
        const values = [taiKhoanId,...entries.map(([,value]) => value)];
        const set = entries.map(([key],index) => `${key} = $${index + 2}`);
        const { rows: [row] } = await query(`UPDATE tai_khoan SET ${set.join(',')},ngay_cap_nhat = now() WHERE id = $1 RETURNING id`,values,client);
        return row ?? null;
    }
    async layTaiKhoanDeResetMatKhau(donViId, khachHangId, client) {
        const { rows: [row] } = await query(`SELECT tk.id,tk.email,tk.ho_ten,tk.ten_dang_nhap FROM khach_hang kh JOIN tai_khoan tk ON tk.id = kh.tai_khoan_id WHERE kh.don_vi_id = $1 AND kh.id = $2 AND kh.ngay_xoa IS NULL AND tk.trang_thai = 'DANG_DUNG' AND tk.email_da_xac_minh = TRUE FOR UPDATE OF tk`,[donViId,khachHangId],client);
        return row ?? null;
    }
    async tao(donViId, actorId, data, client) {
        const cot = ["don_vi_id","nguoi_tao_id","tai_khoan_id","ma_khach_hang",...COT_KHACH_HANG];
        const values = [donViId,actorId,data.tai_khoan_id ?? null,data.ma_khach_hang,...COT_KHACH_HANG.map(key => data[key])];
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
