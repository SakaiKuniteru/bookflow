const { query } = require('../../database/query.js');
class PhienBanSachRepository {
    async danhSach(donViId, boLoc, client) {
        const values = [donViId, boLoc.dau_sach_id, boLoc.nha_xuat_ban_id, boLoc.loai_phien_ban, boLoc.trang_thai, `%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`];
        const where = `pb.don_vi_id = $1 AND ($2::integer IS NULL OR pb.dau_sach_id = $2) AND ($3::integer IS NULL OR pb.nha_xuat_ban_id = $3) AND ($4::text IS NULL OR pb.loai_phien_ban = $4) AND ($5::text IS NULL OR pb.trang_thai = $5) AND (pb.ma_phien_ban ILIKE $6 ESCAPE '\\' OR pb.ma_sku_noi_bo ILIKE $6 ESCAPE '\\' OR pb.ten_phien_ban ILIKE $6 ESCAPE '\\' OR pb.ten_hien_thi ILIKE $6 ESCAPE '\\' OR pb.isbn_10 ILIKE $6 ESCAPE '\\' OR pb.isbn_13 ILIKE $6 ESCAPE '\\')`;
        const { rows: [tong] } = await query(`SELECT count(*)::integer AS tong_so FROM phien_ban_sach pb WHERE ${where}`, values, client);
        const { rows } = await query(
            `SELECT pb.*, ds.ten_sach AS ten_dau_sach, nxb.ten_nha_xuat_ban, th.ten_thuong_hieu, nph.ten_nha_phat_hanh
             FROM phien_ban_sach pb JOIN dau_sach ds ON ds.don_vi_id = pb.don_vi_id AND ds.id = pb.dau_sach_id
             LEFT JOIN nha_xuat_ban nxb ON nxb.don_vi_id = pb.don_vi_id AND nxb.id = pb.nha_xuat_ban_id
             LEFT JOIN thuong_hieu_xuat_ban th ON th.don_vi_id = pb.don_vi_id AND th.id = pb.thuong_hieu_xuat_ban_id
             LEFT JOIN nha_phat_hanh nph ON nph.don_vi_id = pb.don_vi_id AND nph.id = pb.nha_phat_hanh_id
             WHERE ${where} ORDER BY pb.ngay_tao DESC, pb.id DESC LIMIT $7 OFFSET $8`,
            [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client
        );
        return { phien_ban_sach: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / boLoc.kich_thuoc) } };
    }
    async layPhienBan(donViId, phienBanId, client, khoa = false) {
        const { rows } = await query(`SELECT * FROM phien_ban_sach WHERE don_vi_id = $1 AND id = $2${khoa ? ' FOR UPDATE' : ''}`, [donViId, phienBanId], client);
        return rows[0] ?? null;
    }
    async layChiTiet(donViId, phienBanId, client) {
        const { rows } = await query(
            `SELECT pb.*, ds.ten_sach AS ten_dau_sach, nxb.ten_nha_xuat_ban, th.ten_thuong_hieu, nph.ten_nha_phat_hanh
             FROM phien_ban_sach pb JOIN dau_sach ds ON ds.don_vi_id = pb.don_vi_id AND ds.id = pb.dau_sach_id
             LEFT JOIN nha_xuat_ban nxb ON nxb.don_vi_id = pb.don_vi_id AND nxb.id = pb.nha_xuat_ban_id
             LEFT JOIN thuong_hieu_xuat_ban th ON th.don_vi_id = pb.don_vi_id AND th.id = pb.thuong_hieu_xuat_ban_id
             LEFT JOIN nha_phat_hanh nph ON nph.don_vi_id = pb.don_vi_id AND nph.id = pb.nha_phat_hanh_id
             WHERE pb.don_vi_id = $1 AND pb.id = $2`,
            [donViId, phienBanId], client
        );
        return rows[0] ?? null;
    }
    async nguoiDongGop(donViId, phienBanId, client) {
        const { rows } = await query(
            `SELECT ndg.*, tg.ma_tac_gia, tg.ho_ten, tg.ten_hien_thi
             FROM phien_ban_nguoi_dong_gop ndg JOIN tac_gia tg ON tg.don_vi_id = ndg.don_vi_id AND tg.id = ndg.tac_gia_id
             WHERE ndg.don_vi_id = $1 AND ndg.phien_ban_sach_id = $2 ORDER BY ndg.thu_tu_hien_thi, ndg.id`,
            [donViId, phienBanId], client
        );
        return rows;
    }
    async ngonNgu(donViId, phienBanId, client) {
        const { rows } = await query('SELECT * FROM phien_ban_ngon_ngu WHERE don_vi_id = $1 AND phien_ban_sach_id = $2 ORDER BY id', [donViId, phienBanId], client);
        return rows;
    }
    async maDinhDanh(donViId, phienBanId, client) {
        const { rows } = await query('SELECT * FROM phien_ban_ma_dinh_danh WHERE don_vi_id = $1 AND phien_ban_sach_id = $2 ORDER BY id', [donViId, phienBanId], client);
        return rows;
    }
    async tepSach(donViId, phienBanId, client) {
        const { rows } = await query('SELECT * FROM tep_sach WHERE don_vi_id = $1 AND phien_ban_sach_id = $2 ORDER BY thu_tu, id', [donViId, phienBanId], client);
        return rows;
    }
    async thamChieuTonTai(bang, donViId, id, client) {
        if (!['dau_sach', 'nha_xuat_ban', 'thuong_hieu_xuat_ban', 'nha_phat_hanh', 'tep_dinh_kem'].includes(bang)) throw new Error('Bảng tham chiếu không hợp lệ');
        const { rows } = await query(`SELECT EXISTS (SELECT 1 FROM ${bang} WHERE don_vi_id = $1 AND id = $2) AS hop_le`, [donViId, id], client);
        return rows[0].hop_le;
    }
    async thuongHieuThuocNhaXuatBan(donViId, thuongHieuId, nhaXuatBanId, client) {
        const { rows } = await query('SELECT EXISTS (SELECT 1 FROM thuong_hieu_xuat_ban WHERE don_vi_id = $1 AND id = $2 AND nha_xuat_ban_id = $3) AS hop_le', [donViId, thuongHieuId, nhaXuatBanId], client);
        return rows[0].hop_le;
    }
    async taoPhienBan(donViId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `INSERT INTO phien_ban_sach (don_vi_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1, $2, ${cot.map((_, index) => `$${index + 3}`).join(', ')}) RETURNING *`,
            [donViId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0];
    }
    async suaPhienBan(donViId, phienBanId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE phien_ban_sach SET ${cot.map((ten, index) => `${ten} = $${index + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 RETURNING *`,
            [donViId, phienBanId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async doiTrangThai(donViId, phienBanId, actorId, trangThai, client) {
        const { rows } = await query('UPDATE phien_ban_sach SET trang_thai = $3, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND id = $2 RETURNING *', [donViId, phienBanId, trangThai, actorId], client);
        return rows[0] ?? null;
    }
    async xoaPhienBan(donViId, phienBanId, client) {
        const { rows } = await query('DELETE FROM phien_ban_sach WHERE don_vi_id = $1 AND id = $2 RETURNING id', [donViId, phienBanId], client);
        return rows[0] ?? null;
    }
    async ghiNhatKy({ donViId, actorId, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1,$2,$3,'phien_ban_sach',$4,'THANH_CONG','Quản lý phiên bản sách',$5,'API')`,
            [donViId, actorId, hanhDong, doiTuongId, requestId], client
        );
    }
}
module.exports = new PhienBanSachRepository();