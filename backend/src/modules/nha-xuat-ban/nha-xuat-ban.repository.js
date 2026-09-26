const { query } = require('../../database/query.js');
class NhaXuatBanRepository {
    async danhSach(donViId, boLoc, client) {
        const values = [donViId, boLoc.trang_thai, `%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`];
        const where = `nxb.don_vi_id = $1 AND ($2::text IS NULL OR nxb.trang_thai = $2) AND (nxb.ma_nha_xuat_ban ILIKE $3 ESCAPE '\\' OR nxb.ten_nha_xuat_ban ILIKE $3 ESCAPE '\\' OR nxb.ten_viet_tat ILIKE $3 ESCAPE '\\' OR nxb.ten_quoc_te ILIKE $3 ESCAPE '\\' OR nxb.ma_so_thue ILIKE $3 ESCAPE '\\')`;
        const { rows: [tong] } = await query(`SELECT count(*)::integer AS tong_so FROM nha_xuat_ban nxb WHERE ${where}`, values, client);
        const { rows } = await query(
            `SELECT nxb.*, (SELECT count(*)::integer FROM thuong_hieu_xuat_ban th WHERE th.don_vi_id = nxb.don_vi_id AND th.nha_xuat_ban_id = nxb.id) AS so_thuong_hieu
             FROM nha_xuat_ban nxb WHERE ${where} ORDER BY nxb.ten_nha_xuat_ban, nxb.id LIMIT $4 OFFSET $5`,
            [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client
        );
        return { nha_xuat_ban: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / boLoc.kich_thuoc) } };
    }
    async layNhaXuatBan(donViId, nhaXuatBanId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM nha_xuat_ban WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, nhaXuatBanId], client);
        return rows[0] ?? null;
    }
    async danhSachThuongHieu(donViId, nhaXuatBanId, client) {
        const { rows } = await query(
            'SELECT * FROM thuong_hieu_xuat_ban WHERE don_vi_id = $1 AND nha_xuat_ban_id = $2 ORDER BY ten_thuong_hieu, id',
            [donViId, nhaXuatBanId], client
        );
        return rows;
    }
    async layThuongHieu(donViId, nhaXuatBanId, thuongHieuId, client, khoa = false) {
        const { rows } = await query(
            `SELECT * FROM thuong_hieu_xuat_ban WHERE don_vi_id = $1 AND nha_xuat_ban_id = $2 AND id = $3${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, nhaXuatBanId, thuongHieuId], client
        );
        return rows[0] ?? null;
    }
    async tepTonTai(donViId, tepId, client) {
        const { rows } = await query('SELECT EXISTS (SELECT 1 FROM tep_dinh_kem WHERE don_vi_id = $1 AND id = $2) AS hop_le', [donViId, tepId], client);
        return rows[0].hop_le;
    }
    async taoNhaXuatBan(donViId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `INSERT INTO nha_xuat_ban (don_vi_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1, $2, ${cot.map((_, index) => `$${index + 3}`).join(', ')}) RETURNING *`,
            [donViId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0];
    }
    async suaNhaXuatBan(donViId, nhaXuatBanId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE nha_xuat_ban SET ${cot.map((ten, index) => `${ten} = $${index + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 RETURNING *`,
            [donViId, nhaXuatBanId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async doiTrangThai(donViId, nhaXuatBanId, actorId, trangThai, client) {
        const { rows } = await query(
            'UPDATE nha_xuat_ban SET trang_thai = $3, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2 RETURNING *',
            [donViId, nhaXuatBanId, trangThai, actorId], client
        );
        return rows[0] ?? null;
    }
    async xoaNhaXuatBan(donViId, nhaXuatBanId, client) {
        const { rows } = await query('DELETE FROM nha_xuat_ban WHERE don_vi_id = $1 AND id = $2 RETURNING id', [donViId, nhaXuatBanId], client);
        return rows[0] ?? null;
    }
    async taoThuongHieu(donViId, nhaXuatBanId, actorId, duLieu, client) {
        const { rows } = await query(
            `INSERT INTO thuong_hieu_xuat_ban (don_vi_id, nha_xuat_ban_id, ma_thuong_hieu, ten_thuong_hieu, mo_ta, logo_tep_id, nguoi_tao_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
            [donViId, nhaXuatBanId, duLieu.ma_thuong_hieu, duLieu.ten_thuong_hieu, duLieu.mo_ta, duLieu.logo_tep_id, actorId], client
        );
        return rows[0];
    }
    async suaThuongHieu(donViId, nhaXuatBanId, thuongHieuId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE thuong_hieu_xuat_ban SET ${cot.map((ten, index) => `${ten} = $${index + 5}`).join(', ')}, nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND nha_xuat_ban_id = $2 AND id = $3 RETURNING *`,
            [donViId, nhaXuatBanId, thuongHieuId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async doiTrangThaiThuongHieu(donViId, nhaXuatBanId, thuongHieuId, actorId, trangThai, client) {
        const { rows } = await query(
            'UPDATE thuong_hieu_xuat_ban SET trang_thai = $4, nguoi_cap_nhat_id = $5 WHERE don_vi_id = $1 AND nha_xuat_ban_id = $2 AND id = $3 RETURNING *',
            [donViId, nhaXuatBanId, thuongHieuId, trangThai, actorId], client
        );
        return rows[0] ?? null;
    }
    async xoaThuongHieu(donViId, nhaXuatBanId, thuongHieuId, client) {
        const { rows } = await query(
            'DELETE FROM thuong_hieu_xuat_ban WHERE don_vi_id = $1 AND nha_xuat_ban_id = $2 AND id = $3 RETURNING id',
            [donViId, nhaXuatBanId, thuongHieuId], client
        );
        return rows[0] ?? null;
    }
    async ghiNhatKy({ donViId, actorId, doiTuongLoai, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1,$2,$3,$4,$5,'THANH_CONG','Quản lý nhà xuất bản',$6,'API')`,
            [donViId, actorId, hanhDong, doiTuongLoai, doiTuongId, requestId], client
        );
    }
}
module.exports = new NhaXuatBanRepository();