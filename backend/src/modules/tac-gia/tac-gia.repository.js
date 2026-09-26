const { query } = require('../../database/query.js');
class TacGiaRepository {
    async danhSach(donViId, boLoc, client) {
        const values = [donViId, boLoc.trang_thai, `%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`];
        const where = `tg.don_vi_id = $1 AND ($2::text IS NULL OR tg.trang_thai = $2) AND (tg.ma_tac_gia ILIKE $3 ESCAPE '\\' OR tg.ho_ten ILIKE $3 ESCAPE '\\' OR tg.ten_hien_thi ILIKE $3 ESCAPE '\\' OR EXISTS (SELECT 1 FROM ten_khac_tac_gia tk WHERE tk.don_vi_id = tg.don_vi_id AND tk.tac_gia_id = tg.id AND tk.ten ILIKE $3 ESCAPE '\\'))`;
        const { rows: [tong] } = await query(`SELECT count(*)::integer AS tong_so FROM tac_gia tg WHERE ${where}`, values, client);
        const { rows } = await query(
            `SELECT tg.*, (SELECT count(*)::integer FROM ten_khac_tac_gia tk WHERE tk.don_vi_id = tg.don_vi_id AND tk.tac_gia_id = tg.id) AS so_ten_khac
             FROM tac_gia tg WHERE ${where} ORDER BY tg.ho_ten, tg.id LIMIT $4 OFFSET $5`,
            [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client
        );
        return { tac_gia: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / boLoc.kich_thuoc) } };
    }
    async layTacGia(donViId, tacGiaId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM tac_gia WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, tacGiaId], client);
        return rows[0] ?? null;
    }
    async danhSachTenKhac(donViId, tacGiaId, client) {
        const { rows } = await query(
            'SELECT * FROM ten_khac_tac_gia WHERE don_vi_id = $1 AND tac_gia_id = $2 ORDER BY la_ten_uu_tien DESC, loai_ten, id',
            [donViId, tacGiaId], client
        );
        return rows;
    }
    async layTenKhac(donViId, tacGiaId, tenKhacId, client, khoa = false) {
        const { rows } = await query(
            `SELECT * FROM ten_khac_tac_gia WHERE don_vi_id = $1 AND tac_gia_id = $2 AND id = $3${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, tacGiaId, tenKhacId], client
        );
        return rows[0] ?? null;
    }
    async tepTonTai(donViId, tepId, client) {
        const { rows } = await query('SELECT EXISTS (SELECT 1 FROM tep_dinh_kem WHERE don_vi_id = $1 AND id = $2) AS hop_le', [donViId, tepId], client);
        return rows[0].hop_le;
    }
    async taoTacGia(donViId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `INSERT INTO tac_gia (don_vi_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1, $2, ${cot.map((_, index) => `$${index + 3}`).join(', ')}) RETURNING *`,
            [donViId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0];
    }
    async suaTacGia(donViId, tacGiaId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE tac_gia SET ${cot.map((ten, index) => `${ten} = $${index + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 RETURNING *`,
            [donViId, tacGiaId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async doiTrangThai(donViId, tacGiaId, actorId, trangThai, client) {
        const { rows } = await query(
            'UPDATE tac_gia SET trang_thai = $3, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2 RETURNING *',
            [donViId, tacGiaId, trangThai, actorId], client
        );
        return rows[0] ?? null;
    }
    async xoaTacGia(donViId, tacGiaId, client) {
        const { rows } = await query('DELETE FROM tac_gia WHERE don_vi_id = $1 AND id = $2 RETURNING id', [donViId, tacGiaId], client);
        return rows[0] ?? null;
    }
    async taoTenKhac(donViId, tacGiaId, actorId, duLieu, client) {
        const { rows } = await query(
            `INSERT INTO ten_khac_tac_gia (don_vi_id, tac_gia_id, ten, loai_ten, ngon_ngu, la_ten_uu_tien, ghi_chu, nguoi_tao_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
            [donViId, tacGiaId, duLieu.ten, duLieu.loai_ten, duLieu.ngon_ngu, duLieu.la_ten_uu_tien, duLieu.ghi_chu, actorId], client
        );
        return rows[0];
    }
    async suaTenKhac(donViId, tacGiaId, tenKhacId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE ten_khac_tac_gia SET ${cot.map((ten, index) => `${ten} = $${index + 5}`).join(', ')}, nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND tac_gia_id = $2 AND id = $3 RETURNING *`,
            [donViId, tacGiaId, tenKhacId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async boTenUuTien(donViId, tacGiaId, loaiTen, tenKhacId, actorId, client) {
        await query(
            `UPDATE ten_khac_tac_gia SET la_ten_uu_tien = FALSE, nguoi_cap_nhat_id = $5
             WHERE don_vi_id = $1 AND tac_gia_id = $2 AND loai_ten = $3 AND id <> $4 AND la_ten_uu_tien = TRUE`,
            [donViId, tacGiaId, loaiTen, tenKhacId, actorId], client
        );
    }
    async xoaTenKhac(donViId, tacGiaId, tenKhacId, client) {
        const { rows } = await query(
            'DELETE FROM ten_khac_tac_gia WHERE don_vi_id = $1 AND tac_gia_id = $2 AND id = $3 RETURNING id',
            [donViId, tacGiaId, tenKhacId], client
        );
        return rows[0] ?? null;
    }
    async ghiNhatKy({ donViId, actorId, doiTuongLoai, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1,$2,$3,$4,$5,'THANH_CONG','Quản lý tác giả',$6,'API')`,
            [donViId, actorId, hanhDong, doiTuongLoai, doiTuongId, requestId], client
        );
    }
}
module.exports = new TacGiaRepository();