const { query } = require('../../database/query.js');
class HoiVienRepository {
    async danhSachHang(donViId, client) {
        const { rows } = await query('SELECT * FROM hang_hoi_vien WHERE don_vi_id = $1 ORDER BY thu_tu,diem_toi_thieu,id',[donViId],client);
        return rows;
    }
    async hang(donViId, hangId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM hang_hoi_vien WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,hangId],client);
        return rows[0] ?? null;
    }
    async taoHang(donViId, data, client) {
        const cot = ['ma_hang','ten_hang','thu_tu','diem_toi_thieu','chi_tieu_toi_thieu','mau_hien_thi','mo_ta'];
        const values = [donViId,...cot.map(key => data[key])];
        const { rows } = await query(`INSERT INTO hang_hoi_vien (don_vi_id,${cot.join(',')}) VALUES (${values.map((_,i) => `$${i + 1}`).join(',')}) RETURNING *`,values,client);
        return rows[0];
    }
    async suaHang(donViId, hangId, data, client) {
        const entries = Object.entries(data);
        const { rows } = await query(`UPDATE hang_hoi_vien SET ${entries.map(([key],i) => `${key} = $${i + 3}`).join(',')},ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[donViId,hangId,...entries.map(([,value]) => value)],client);
        return rows[0];
    }
    async danhSachChinhSach(donViId, hangId, client) {
        const { rows } = await query('SELECT * FROM chinh_sach_hoi_vien WHERE don_vi_id = $1 AND hang_hoi_vien_id = $2 ORDER BY phien_ban DESC',[donViId,hangId],client);
        return rows;
    }
    async chinhSachHienHanh(donViId, hangId, client) {
        const { rows } = await query('SELECT * FROM chinh_sach_hoi_vien WHERE don_vi_id = $1 AND hang_hoi_vien_id = $2 AND hieu_luc_tu <= now() AND (hieu_luc_den IS NULL OR hieu_luc_den > now()) ORDER BY phien_ban DESC LIMIT 1',[donViId,hangId],client);
        return rows[0] ?? null;
    }
    async taoChinhSach(donViId, hangId, actorId, data, client) {
        const cot = ['ty_le_tich_diem','so_tien_moi_diem','gia_tri_moi_diem','giam_gia_phan_tram','giam_gia_toi_da','mien_phi_van_chuyen','so_lan_gia_han_mien_phi','so_ngay_muon_them','han_su_dung_diem_ngay','dieu_kien','quyen_loi','hieu_luc_tu','hieu_luc_den'];
        const values = [donViId,hangId,actorId,...cot.map(key => data[key])];
        const { rows } = await query(`INSERT INTO chinh_sach_hoi_vien (don_vi_id,hang_hoi_vien_id,nguoi_tao_id,phien_ban,${cot.join(',')}) VALUES ($1,$2,$3,(SELECT COALESCE(MAX(phien_ban),0) + 1 FROM chinh_sach_hoi_vien WHERE don_vi_id = $1 AND hang_hoi_vien_id = $2),${cot.map((_,i) => `$${i + 4}`).join(',')}) RETURNING *`,values,client);
        return rows[0];
    }
    async danhSach(donViId, loc, client) {
        const values = [donViId];
        const where = ['hv.don_vi_id = $1'];
        if (loc.tu_khoa) { values.push(`%${loc.tu_khoa}%`); where.push(`(hv.ma_hoi_vien ILIKE $${values.length} OR kh.ho_ten ILIKE $${values.length} OR kh.ma_khach_hang ILIKE $${values.length})`); }
        if (loc.hang_hoi_vien_id) { values.push(loc.hang_hoi_vien_id); where.push(`hv.hang_hoi_vien_id = $${values.length}`); }
        const from = 'FROM hoi_vien hv JOIN khach_hang kh ON kh.don_vi_id = hv.don_vi_id AND kh.id = hv.khach_hang_id JOIN hang_hoi_vien h ON h.don_vi_id = hv.don_vi_id AND h.id = hv.hang_hoi_vien_id';
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so ${from} WHERE ${dieuKien}`,values,client);
        const { rows } = await query(`SELECT hv.*,kh.ma_khach_hang,kh.ho_ten,kh.email,kh.so_dien_thoai,h.ma_hang,h.ten_hang ${from} WHERE ${dieuKien} ORDER BY hv.ngay_tao DESC,hv.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,[...values,loc.kich_thuoc,(loc.trang - 1) * loc.kich_thuoc],client);
        return { danh_sach: rows, phan_trang: { trang: loc.trang, kich_thuoc: loc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / loc.kich_thuoc) } };
    }
    async hoiVien(donViId, hoiVienId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM hoi_vien WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,hoiVienId],client);
        return rows[0] ?? null;
    }
    async khachHang(donViId, khachHangId, client) {
        const { rows } = await query('SELECT * FROM khach_hang WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL',[donViId,khachHangId],client);
        return rows[0] ?? null;
    }
    async taoHoiVien(donViId, data, client) {
        const { rows } = await query(`INSERT INTO hoi_vien (don_vi_id,khach_hang_id,hang_hoi_vien_id,ma_hoi_vien,ngay_het_han) VALUES ($1,$2,$3,$4,$5) RETURNING *`,[donViId,data.khach_hang_id,data.hang_hoi_vien_id,data.ma_hoi_vien,data.ngay_het_han],client);
        return rows[0];
    }
    async chuyenHang(donViId, hoiVienId, hangId, client) {
        const { rows } = await query('UPDATE hoi_vien SET hang_hoi_vien_id = $3,ngay_xet_hang = now(),ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[donViId,hoiVienId,hangId],client);
        return rows[0];
    }
    async lichSuHang(donViId, hoiVienId, client) {
        const { rows } = await query('SELECT * FROM lich_su_hang_hoi_vien WHERE don_vi_id = $1 AND hoi_vien_id = $2 ORDER BY ngay_thay_doi DESC,id DESC',[donViId,hoiVienId],client);
        return rows;
    }
    async ghiLichSuHang(donViId, hoiVienId, hangCuId, hangMoiId, actorId, lyDo, client) {
        const { rows } = await query('INSERT INTO lich_su_hang_hoi_vien (don_vi_id,hoi_vien_id,hang_cu_id,hang_moi_id,nguoi_thuc_hien_id,ly_do) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *',[donViId,hoiVienId,hangCuId,hangMoiId,actorId,lyDo],client);
        return rows[0];
    }
    async giaoDichDiem(donViId, hoiVienId, client, limit = 100) {
        const { rows } = await query('SELECT * FROM giao_dich_diem_hoi_vien WHERE don_vi_id = $1 AND hoi_vien_id = $2 ORDER BY ngay_tao DESC,id DESC LIMIT $3',[donViId,hoiVienId,limit],client);
        return rows;
    }
    async giaoDichTheoKhoa(donViId, khoa, client) {
        const { rows } = await query('SELECT * FROM giao_dich_diem_hoi_vien WHERE don_vi_id = $1 AND khoa_chong_trung = $2',[donViId,khoa],client);
        return rows[0] ?? null;
    }
    async capNhatDiem(donViId, hoiVienId, diemMoi, tongDiemMoi, client) {
        const { rows } = await query('UPDATE hoi_vien SET diem_kha_dung = $3,tong_diem_tich_luy = $4,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[donViId,hoiVienId,diemMoi,tongDiemMoi],client);
        return rows[0];
    }
    async ghiGiaoDichDiem(donViId, hoiVienId, actorId, data, delta, truoc, sau, client) {
        const { rows } = await query(`INSERT INTO giao_dich_diem_hoi_vien (don_vi_id,hoi_vien_id,loai_giao_dich,so_diem_thay_doi,diem_truoc,diem_sau,loai_tham_chieu,tham_chieu_id,khoa_chong_trung,ngay_het_han,ghi_chu,nguoi_thuc_hien_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,[donViId,hoiVienId,data.loai_giao_dich,delta,truoc,sau,data.loai_tham_chieu,data.tham_chieu_id,data.khoa_chong_trung,data.ngay_het_han,data.ghi_chu,actorId],client);
        return rows[0];
    }
    async nhatKy(donViId, actorId, doiTuongLoai, doiTuongId, hanhDong, requestId, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,doi_tuong_id,ket_qua,ly_do,request_id,nguon) VALUES ($1,$2,$3,$4,$5,'THANH_CONG','Quản lý hội viên',$6,'API')`,[donViId,actorId,hanhDong,doiTuongLoai,doiTuongId,requestId],client);
    }
}
module.exports = new HoiVienRepository();