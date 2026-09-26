const { query } = require('../../database/query.js');
class TheLoaiRepository {
    async danhSach(donViId, boLoc, client) {
        const values = [donViId, boLoc.trang_thai, boLoc.the_loai_cha_id, `%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`];
        const where = `tl.don_vi_id = $1 AND ($2::text IS NULL OR tl.trang_thai = $2) AND ($3::integer IS NULL OR tl.the_loai_cha_id = $3) AND (tl.ma_the_loai ILIKE $4 ESCAPE '\\' OR tl.ten_the_loai ILIKE $4 ESCAPE '\\')`;
        const { rows: [tong] } = await query(`SELECT count(*)::integer AS tong_so FROM the_loai_sach tl WHERE ${where}`, values, client);
        const { rows } = await query(
            `SELECT tl.*, cha.ma_the_loai AS ma_the_loai_cha, cha.ten_the_loai AS ten_the_loai_cha,
                (SELECT count(*)::integer FROM the_loai_sach con WHERE con.don_vi_id = tl.don_vi_id AND con.the_loai_cha_id = tl.id) AS so_the_loai_con
             FROM the_loai_sach tl
             LEFT JOIN the_loai_sach cha ON cha.don_vi_id = tl.don_vi_id AND cha.id = tl.the_loai_cha_id
             WHERE ${where} ORDER BY tl.thu_tu, tl.ten_the_loai, tl.id LIMIT $5 OFFSET $6`,
            [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client
        );
        return { the_loai: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / boLoc.kich_thuoc) } };
    }
    async layTheLoai(donViId, theLoaiId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM the_loai_sach WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, theLoaiId], client);
        return rows[0] ?? null;
    }
    async cayTheLoai(donViId, client) {
        const { rows } = await query('SELECT * FROM the_loai_sach WHERE don_vi_id = $1 ORDER BY cap_do, thu_tu, ten_the_loai, id', [donViId], client);
        return rows;
    }
    async nhanhTheLoai(donViId, theLoaiId, client) {
        const { rows } = await query(
            `WITH RECURSIVE nhanh AS (
                SELECT id, the_loai_cha_id, cap_do FROM the_loai_sach WHERE don_vi_id = $1 AND id = $2
                UNION ALL
                SELECT con.id, con.the_loai_cha_id, con.cap_do FROM the_loai_sach con
                JOIN nhanh cha ON con.the_loai_cha_id = cha.id WHERE con.don_vi_id = $1
             ) SELECT * FROM nhanh`,
            [donViId, theLoaiId], client
        );
        return rows;
    }
    async tepTonTai(donViId, tepId, client) {
        const { rows } = await query('SELECT EXISTS (SELECT 1 FROM tep_dinh_kem WHERE don_vi_id = $1 AND id = $2) AS hop_le', [donViId, tepId], client);
        return rows[0].hop_le;
    }
    async taoTheLoai(donViId, actorId, duLieu, capDo, client) {
        const { rows } = await query(
            `INSERT INTO the_loai_sach (don_vi_id, ma_the_loai, ten_the_loai, ten_tieng_anh, the_loai_cha_id, mo_ta, duong_dan, thu_tu, cap_do, anh_dai_dien_tep_id, icon_tep_id, hien_thi_menu, hien_thi_trang_chu, nguoi_tao_id)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
            [donViId, duLieu.ma_the_loai, duLieu.ten_the_loai, duLieu.ten_tieng_anh, duLieu.the_loai_cha_id, duLieu.mo_ta, duLieu.duong_dan, duLieu.thu_tu, capDo, duLieu.anh_dai_dien_tep_id, duLieu.icon_tep_id, duLieu.hien_thi_menu, duLieu.hien_thi_trang_chu, actorId], client
        );
        return rows[0];
    }
    async suaTheLoai(donViId, theLoaiId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE the_loai_sach SET ${cot.map((ten, index) => `${ten} = $${index + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 RETURNING *`,
            [donViId, theLoaiId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async capNhatCapDoNhanh(donViId, ids, doLech, actorId, client) {
        await query('UPDATE the_loai_sach SET cap_do = cap_do + $3, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = ANY($2::integer[])', [donViId, ids, doLech, actorId], client);
    }
    async doiTrangThai(donViId, theLoaiId, actorId, trangThai, client) {
        const { rows } = await query('UPDATE the_loai_sach SET trang_thai = $3, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2 RETURNING *', [donViId, theLoaiId, trangThai, actorId], client);
        return rows[0] ?? null;
    }
    async xoaTheLoai(donViId, theLoaiId, client) {
        const { rows } = await query('DELETE FROM the_loai_sach WHERE don_vi_id = $1 AND id = $2 RETURNING id', [donViId, theLoaiId], client);
        return rows[0] ?? null;
    }
    async ghiNhatKy({ donViId, actorId, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1,$2,$3,'the_loai_sach',$4,'THANH_CONG','Quản lý thể loại sách',$5,'API')`,
            [donViId, actorId, hanhDong, doiTuongId, requestId], client
        );
    }
}
module.exports = new TheLoaiRepository();