const { query } = require('../../database/query.js');
class NhapKhoRepository {
    async capSoPhieu(donViId, ngayNhap, client) {
        const nam = Number(ngayNhap.slice(0, 4));
        const thang = ngayNhap.slice(5, 7);
        if (nam < 2000 || nam > 2099) throw new RangeError('Năm lập phiếu phải trong khoảng 2000–2099');
        const { rows } = await query(`INSERT INTO bo_dem_phieu_nhap (don_vi_id, nam, so_cuoi) VALUES ($1,$2,1) ON CONFLICT (don_vi_id, nam) DO UPDATE SET so_cuoi = bo_dem_phieu_nhap.so_cuoi + 1 WHERE bo_dem_phieu_nhap.so_cuoi < 99999 RETURNING so_cuoi`, [donViId, nam], client);
        if (!rows.length) return null;
        return `${String(nam).slice(-2)}${thang}${String(rows[0].so_cuoi).padStart(5, '0')}`;
    }
    async thamChieuTonTai(donViId, bang, id, client) {
        if (!['kho', 'nha_cung_cap', 'phien_ban_sach', 'vi_tri_kho'].includes(bang)) throw new TypeError('Bảng tham chiếu không hợp lệ');
        const { rows } = await query(`SELECT * FROM ${bang} WHERE don_vi_id = $1 AND id = $2`, [donViId, id], client);
        return rows[0] ?? null;
    }
    async danhSach(donViId, boLoc, client) {
        const where = ['p.don_vi_id = $1'];
        const values = [donViId];
        if (boLoc.chi_nhanh_id) {
            values.push(boLoc.chi_nhanh_id);
            where.push(`EXISTS (SELECT 1 FROM kho k WHERE k.don_vi_id = p.don_vi_id AND k.id = p.kho_id AND k.chi_nhanh_id = $${values.length})`);
        }
        const them = (sql, value) => { values.push(value); where.push(sql.replace('?', `$${values.length}`)); };
        if (boLoc.kho_id) them('p.kho_id = ?', boLoc.kho_id);
        if (boLoc.nha_cung_cap_id) them('p.nha_cung_cap_id = ?', boLoc.nha_cung_cap_id);
        if (boLoc.trang_thai) them('p.trang_thai = ?', boLoc.trang_thai);
        if (boLoc.tu_ngay) them('p.ngay_nhap >= ?', boLoc.tu_ngay);
        if (boLoc.den_ngay) them('p.ngay_nhap <= ?', boLoc.den_ngay);
        if (boLoc.tu_khoa) {
            values.push(`%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`);
            where.push(`(p.so_phieu ILIKE $${values.length} ESCAPE '\\' OR p.so_chung_tu ILIKE $${values.length} ESCAPE '\\')`);
        }
        const dieuKien = where.join(' AND ');
        const { rows: [dem] } = await query(`SELECT count(*)::integer AS tong_so FROM phieu_nhap_kho p WHERE ${dieuKien}`, values, client);
        const { rows } = await query(`SELECT p.*, (SELECT count(*)::integer FROM chi_tiet_phieu_nhap ct WHERE ct.don_vi_id = p.don_vi_id AND ct.phieu_nhap_kho_id = p.id) AS so_dong FROM phieu_nhap_kho p WHERE ${dieuKien} ORDER BY p.ngay_tao DESC, p.id DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`, [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client);
        return { phieu_nhap_kho: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: dem.tong_so, tong_trang: Math.ceil(dem.tong_so / boLoc.kich_thuoc) } };
    }
    async layPhieu(donViId, id, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM phieu_nhap_kho WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, id], client);
        return rows[0] ?? null;
    }
    async layChiTiet(donViId, phieuId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM chi_tiet_phieu_nhap WHERE don_vi_id = $1 AND phieu_nhap_kho_id = $2 ORDER BY id${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId], client);
        return rows;
    }
    async layDong(donViId, phieuId, dongId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM chi_tiet_phieu_nhap WHERE don_vi_id = $1 AND phieu_nhap_kho_id = $2 AND id = $3${khoa ? ' FOR UPDATE' : ''}`, [donViId, phieuId, dongId], client);
        return rows[0] ?? null;
    }
    async taoPhieu(donViId, actorId, soPhieu, data, client) {
        const { rows } = await query(`INSERT INTO phieu_nhap_kho (don_vi_id,kho_id,nha_cung_cap_id,so_phieu,ngay_nhap,loai_nhap,so_chung_tu,ngay_chung_tu,ghi_chu,nguoi_tao_id) VALUES ($1,$2,$3,$4,COALESCE($5::date,CURRENT_DATE),$6,$7,$8,$9,$10) RETURNING *`, [donViId, data.kho_id, data.nha_cung_cap_id, soPhieu, data.ngay_nhap, data.loai_nhap, data.so_chung_tu, data.ngay_chung_tu, data.ghi_chu, actorId], client);
        return rows[0];
    }
    async suaPhieu(donViId, phieuId, actorId, data, client) {
        const cot = Object.keys(data);
        const { rows } = await query(`UPDATE phieu_nhap_kho SET ${cot.map((ten, i) => `${ten} = $${i + 4}`).join(', ')}, nguoi_cap_nhat_id = $3, ngay_cap_nhat = now() WHERE don_vi_id = $1 AND id = $2 RETURNING *`, [donViId, phieuId, actorId, ...cot.map(ten => data[ten])], client);
        return rows[0];
    }
    async taoDong(donViId, phieuId, data, client) {
        const { rows } = await query(`INSERT INTO chi_tiet_phieu_nhap (don_vi_id,phieu_nhap_kho_id,phien_ban_sach_id,vi_tri_kho_id,so_luong_du_kien,don_gia_nhap,ghi_chu) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`, [donViId, phieuId, data.phien_ban_sach_id, data.vi_tri_kho_id ?? null, data.so_luong_du_kien, data.don_gia_nhap ?? 0, data.ghi_chu ?? null], client);
        return rows[0];
    }
    async suaDong(donViId, phieuId, dongId, data, client) {
        const cot = Object.keys(data);
        const { rows } = await query(`UPDATE chi_tiet_phieu_nhap SET ${cot.map((ten, i) => `${ten} = $${i + 4}`).join(', ')}, ngay_cap_nhat = now() WHERE don_vi_id = $1 AND phieu_nhap_kho_id = $2 AND id = $3 RETURNING *`, [donViId, phieuId, dongId, ...cot.map(ten => data[ten])], client);
        return rows[0];
    }
    async xoaDong(donViId, phieuId, dongId, client) {
        const { rows } = await query('DELETE FROM chi_tiet_phieu_nhap WHERE don_vi_id = $1 AND phieu_nhap_kho_id = $2 AND id = $3 RETURNING id', [donViId, phieuId, dongId], client);
        return rows[0] ?? null;
    }
    async trangThai(donViId, phieuId, actorId, trangThai, client) {
        const xacNhan = trangThai === 'DA_XAC_NHAN';
        const { rows } = await query(`UPDATE phieu_nhap_kho SET trang_thai = $3, nguoi_cap_nhat_id = $4, ngay_cap_nhat = now(), nguoi_xac_nhan_id = CASE WHEN $5 THEN $4 ELSE nguoi_xac_nhan_id END, ngay_xac_nhan = CASE WHEN $5 THEN now() ELSE ngay_xac_nhan END WHERE don_vi_id = $1 AND id = $2 RETURNING *`, [donViId, phieuId, trangThai, actorId, xacNhan], client);
        return rows[0];
    }
    async ghiNhatKy(donViId, actorId, phieuId, hanhDong, requestId, client) {
        await query(`INSERT INTO nhat_ky_he_thong (don_vi_id,tai_khoan_id,hanh_dong,doi_tuong_loai,doi_tuong_id,ket_qua,ly_do,request_id,nguon) VALUES ($1,$2,$3,'phieu_nhap_kho',$4,'THANH_CONG','Nghiệp vụ nhập kho',$5,'API')`, [donViId, actorId, hanhDong, phieuId, requestId], client);
    }
}
module.exports = new NhapKhoRepository();