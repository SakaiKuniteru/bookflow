const { query } = require('../../database/query.js');
class ThanhToanRepository {
    async mot(sql,params = [],client) { const { rows } = await query(sql,params,client); return rows[0] ?? null; }
    async nhieu(sql,params = [],client) { const { rows } = await query(sql,params,client); return rows; }
    async chay(sql,params = [],client) { return query(sql,params,client); }
    async danhSachPhuongThuc(donViId,chiNhanhId,client) {
        return this.nhieu('SELECT id,don_vi_id,ma,ten,loai,chi_nhanh_id,thu_tu,hoat_dong,ngay_tao FROM phuong_thuc_thanh_toan WHERE don_vi_id = $1 AND ($2::integer IS NULL OR chi_nhanh_id IS NULL OR chi_nhanh_id = $2) ORDER BY thu_tu,id',[donViId,chiNhanhId],client);
    }
    async layPhuongThuc(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM phuong_thuc_thanh_toan WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async taoPhuongThuc(donViId,data,client) {
        return this.mot('INSERT INTO phuong_thuc_thanh_toan(don_vi_id,ma,ten,loai,cau_hinh,chi_nhanh_id,thu_tu,hoat_dong) VALUES($1,$2,$3,$4,$5::jsonb,$6,$7,$8) RETURNING *',[donViId,data.ma,data.ten,data.loai,JSON.stringify(data.cau_hinh ?? {}),data.chi_nhanh_id ?? null,data.thu_tu ?? 0,data.hoat_dong ?? true],client);
    }
    async suaPhuongThuc(donViId,id,data,client) {
        const keys = Object.keys(data);
        const params = keys.map(key => key === 'cau_hinh' ? JSON.stringify(data[key]) : data[key]);
        const sets = keys.map((key,index) => `${key} = $${index + 3}${key === 'cau_hinh' ? '::jsonb' : ''}`);
        return this.mot(`UPDATE phuong_thuc_thanh_toan SET ${sets.join(',')} WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[donViId,id,...params],client);
    }
    async danhSachTaiKhoan(donViId,chiNhanhId,client) {
        return this.nhieu('SELECT * FROM tai_khoan_nhan_tien WHERE don_vi_id = $1 AND ($2::integer IS NULL OR chi_nhanh_id IS NULL OR chi_nhanh_id = $2) ORDER BY mac_dinh DESC,id',[donViId,chiNhanhId],client);
    }
    async layTaiKhoan(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM tai_khoan_nhan_tien WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async boMacDinh(donViId,chiNhanhId,loai,client) {
        await this.chay('UPDATE tai_khoan_nhan_tien SET mac_dinh = FALSE WHERE don_vi_id = $1 AND chi_nhanh_id IS NOT DISTINCT FROM $2 AND loai = $3 AND mac_dinh = TRUE',[donViId,chiNhanhId,loai],client);
    }
    async taoTaiKhoan(donViId,data,client) {
        return this.mot('INSERT INTO tai_khoan_nhan_tien(don_vi_id,chi_nhanh_id,ten_ngan_hang,ma_ngan_hang,so_tai_khoan,chu_tai_khoan,ma_vi,loai,mac_dinh,hoat_dong) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *',[donViId,data.chi_nhanh_id ?? null,data.ten_ngan_hang ?? null,data.ma_ngan_hang ?? null,data.so_tai_khoan ?? null,data.chu_tai_khoan ?? null,data.ma_vi ?? null,data.loai,data.mac_dinh ?? false,data.hoat_dong ?? true],client);
    }
    async suaTaiKhoan(donViId,id,data,client) {
        const keys = Object.keys(data);
        return this.mot(`UPDATE tai_khoan_nhan_tien SET ${keys.map((key,index) => `${key} = $${index + 3}`).join(',')} WHERE don_vi_id = $1 AND id = $2 RETURNING *`,[donViId,id,...keys.map(key => data[key])],client);
    }
    async danhSachGiaoDich(donViId,filter,client) {
        const values = [donViId];
        const where = ['don_vi_id = $1'];
        if (filter.trang_thai) { values.push(filter.trang_thai); where.push(`trang_thai = $${values.length}`); }
        if (filter.loai_giao_dich) { values.push(filter.loai_giao_dich); where.push(`loai_giao_dich = $${values.length}`); }
        if (filter.chi_nhanh_id) { values.push(filter.chi_nhanh_id); where.push(`chi_nhanh_id = $${values.length}`); }
        const tong = await this.mot(`SELECT count(*)::integer AS n FROM giao_dich_thanh_toan WHERE ${where.join(' AND ')}`,values,client);
        const rows = await this.nhieu(`SELECT id,don_vi_id,chi_nhanh_id,khach_hang_id,phuong_thuc_id,tai_khoan_nhan_id,ma_giao_dich,ma_giao_dich_doi_tac,loai_giao_dich,so_tien,tien_te,trang_thai,noi_dung,thoi_gian_thanh_cong,nguoi_thuc_hien_id,ngay_tao FROM giao_dich_thanh_toan WHERE ${where.join(' AND ')} ORDER BY ngay_tao DESC,id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,[...values,filter.limit,filter.offset],client);
        return { danh_sach: rows,phan_trang: { trang: filter.trang,kich_thuoc: filter.kich_thuoc,tong_so: tong.n,tong_trang: Math.ceil(tong.n / filter.kich_thuoc) } };
    }
    async layGiaoDich(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async layTheoKhoa(donViId,khoa,client) {
        return this.mot('SELECT * FROM giao_dich_thanh_toan WHERE don_vi_id = $1 AND khoa_chong_trung = $2',[donViId,khoa],client);
    }
    async taoGiaoDich(donViId,data,ma,actorId,client) {
        return this.mot('INSERT INTO giao_dich_thanh_toan(don_vi_id,chi_nhanh_id,khach_hang_id,phuong_thuc_id,tai_khoan_nhan_id,ma_giao_dich,loai_giao_dich,so_tien,trang_thai,khoa_chong_trung,du_lieu_yeu_cau,noi_dung,nguoi_thuc_hien_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::jsonb,$12,$13) RETURNING *',[donViId,data.chi_nhanh_id,data.khach_hang_id ?? null,data.phuong_thuc_id,data.tai_khoan_nhan_id,ma,data.loai_giao_dich,data.so_tien,data.trang_thai,data.khoa_chong_trung,JSON.stringify(data.du_lieu_yeu_cau ?? {}),data.noi_dung,actorId],client);
    }
    async ghiKetQua(donViId,id,trangThai,maDoiTac,phanHoi,client) {
        return this.mot('UPDATE giao_dich_thanh_toan SET trang_thai = $3,ma_giao_dich_doi_tac = COALESCE($4,ma_giao_dich_doi_tac),du_lieu_phan_hoi = $5::jsonb,thoi_gian_thanh_cong = CASE WHEN $3 = \'THANH_CONG\' THEN now() ELSE thoi_gian_thanh_cong END,ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *',[donViId,id,trangThai,maDoiTac,JSON.stringify(phanHoi)],client);
    }
    async phanBo(donViId,id,alloc,client) {
        return this.mot('INSERT INTO phan_bo_thanh_toan(don_vi_id,giao_dich_id,loai_doi_tuong,doi_tuong_id,so_tien) VALUES($1,$2,$3,$4,$5) RETURNING *',[donViId,id,alloc.loai_doi_tuong,alloc.doi_tuong_id,alloc.so_tien],client);
    }
    async phanBoTheoGiaoDich(donViId,id,client) {
        return this.nhieu('SELECT * FROM phan_bo_thanh_toan WHERE don_vi_id = $1 AND giao_dich_id = $2 ORDER BY id',[donViId,id],client);
    }
    async taoYeuCauHoan(donViId,data,ma,actorId,client) {
        return this.mot('INSERT INTO yeu_cau_hoan_tien(don_vi_id,giao_dich_goc_id,don_hang_id,tien_coc_id,ma_yeu_cau,so_tien,ly_do,nguoi_yeu_cau_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *',[donViId,data.giao_dich_goc_id,data.don_hang_id,data.tien_coc_id,ma,data.so_tien,data.ly_do,actorId],client);
    }
    async layYeuCauHoan(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM yeu_cau_hoan_tien WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async danhSachHoan(donViId,filter,client) {
        return this.nhieu('SELECT * FROM yeu_cau_hoan_tien WHERE don_vi_id = $1 AND ($2::varchar IS NULL OR trang_thai = $2) ORDER BY ngay_tao DESC,id DESC LIMIT $3 OFFSET $4',[donViId,filter.trang_thai ?? null,filter.limit,filter.offset],client);
    }
    async taoDotDoiSoat(donViId,data,ma,actorId,client) {
        return this.mot('INSERT INTO doi_soat_thanh_toan(don_vi_id,ma_dot,nha_cung_cap,tai_khoan_nhan_id,tu_ngay,den_ngay,nguoi_tao_id) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING *',[donViId,ma,data.nha_cung_cap,data.tai_khoan_nhan_id,data.tu_ngay,data.den_ngay,actorId],client);
    }
    async layDotDoiSoat(donViId,id,client,khoa = false) {
        return this.mot(`SELECT * FROM doi_soat_thanh_toan WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`,[donViId,id],client);
    }
    async danhSachDot(donViId,limit,offset,client) {
        return this.nhieu('SELECT * FROM doi_soat_thanh_toan WHERE don_vi_id = $1 ORDER BY ngay_tao DESC,id DESC LIMIT $2 OFFSET $3',[donViId,limit,offset],client);
    }
    async chiTietDot(donViId,id,client) {
        return this.nhieu('SELECT * FROM chi_tiet_doi_soat_thanh_toan WHERE don_vi_id = $1 AND doi_soat_id = $2 ORDER BY id',[donViId,id],client);
    }
    async nhatKy(donViId,actorId,loai,hanhDong,requestId,lyDo,client) {
        await this.chay('INSERT INTO nhat_ky_he_thong(don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,ket_qua,ly_do,request_id,nguon) VALUES($1,$2,$3,$4,\'THANH_CONG\',$5,$6,\'API\')',[donViId,actorId,hanhDong,loai,lyDo ?? 'Nghiệp vụ tài chính',requestId ?? null],client);
    }
}
module.exports = new ThanhToanRepository();