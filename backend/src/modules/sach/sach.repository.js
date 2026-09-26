const { query } = require('../../database/query.js');
const { LIEN_KET } = require('./sach.validation.js');
class SachRepository {
    async danhSach(donViId, boLoc, client) {
        const values = [
            donViId, boLoc.trang_thai, boLoc.loai_tac_pham,
            `%${boLoc.tu_khoa.replace(/[\\%_]/g, '\\$&')}%`,
            boLoc.tac_gia_id, boLoc.the_loai_id, boLoc.bo_sach_id,
            boLoc.isbn, boLoc.cho_hien_thi_cong_khai
        ];
        const where = `ds.don_vi_id = $1 AND ds.ngay_xoa IS NULL
            AND ($2::text IS NULL OR ds.trang_thai = $2)
            AND ($3::text IS NULL OR ds.loai_tac_pham = $3)
            AND (ds.ma_dau_sach ILIKE $4 ESCAPE '\\' OR ds.ten_sach ILIKE $4 ESCAPE '\\' OR ds.ten_goc ILIKE $4 ESCAPE '\\' OR ds.ten_hien_thi ILIKE $4 ESCAPE '\\' OR ds.ma_dau_sach_ngoai ILIKE $4 ESCAPE '\\' OR EXISTS (SELECT 1 FROM dau_sach_ten_khac tk WHERE tk.don_vi_id = ds.don_vi_id AND tk.dau_sach_id = ds.id AND tk.ten ILIKE $4 ESCAPE '\\'))
            AND ($5::integer IS NULL OR EXISTS (SELECT 1 FROM dau_sach_tac_gia tg WHERE tg.don_vi_id = ds.don_vi_id AND tg.dau_sach_id = ds.id AND tg.tac_gia_id = $5))
            AND ($6::integer IS NULL OR EXISTS (SELECT 1 FROM dau_sach_the_loai tl WHERE tl.don_vi_id = ds.don_vi_id AND tl.dau_sach_id = ds.id AND tl.the_loai_id = $6))
            AND ($7::integer IS NULL OR EXISTS (SELECT 1 FROM bo_sach_dau_sach bs WHERE bs.don_vi_id = ds.don_vi_id AND bs.dau_sach_id = ds.id AND bs.bo_sach_id = $7))
            AND ($8::text IS NULL OR EXISTS (SELECT 1 FROM phien_ban_sach pb WHERE pb.don_vi_id = ds.don_vi_id AND pb.dau_sach_id = ds.id AND ($8 = pb.isbn_10 OR $8 = pb.isbn_13 OR $8 = pb.ma_ean_13)))
            AND ($9::boolean IS NULL OR ds.cho_hien_thi_cong_khai = $9)`;
        const { rows: [tong] } = await query(`SELECT count(*)::integer AS tong_so FROM dau_sach ds WHERE ${where}`, values, client);
        const { rows } = await query(
            `SELECT ds.*,
                (SELECT count(*)::integer FROM phien_ban_sach pb WHERE pb.don_vi_id = ds.don_vi_id AND pb.dau_sach_id = ds.id) AS so_phien_ban,
                (SELECT count(*)::integer FROM dau_sach_tac_gia tg WHERE tg.don_vi_id = ds.don_vi_id AND tg.dau_sach_id = ds.id) AS so_nguoi_dong_gop,
                (SELECT count(*)::integer FROM dau_sach_the_loai tl WHERE tl.don_vi_id = ds.don_vi_id AND tl.dau_sach_id = ds.id) AS so_the_loai
             FROM dau_sach ds WHERE ${where} ORDER BY ds.ngay_tao DESC, ds.id DESC LIMIT $10 OFFSET $11`,
            [...values, boLoc.kich_thuoc, (boLoc.trang - 1) * boLoc.kich_thuoc], client
        );
        return { sach: rows, phan_trang: { trang: boLoc.trang, kich_thuoc: boLoc.kich_thuoc, tong_so: tong.tong_so, tong_trang: Math.ceil(tong.tong_so / boLoc.kich_thuoc) } };
    }
    async laySach(donViId, sachId, client, khoa = false, gomDaXoa = false) {
        const { rows } = await query(
            `SELECT * FROM dau_sach WHERE don_vi_id = $1 AND id = $2${gomDaXoa ? '' : ' AND ngay_xoa IS NULL'}${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, sachId], client
        );
        return rows[0] ?? null;
    }
    async layTheoMa(donViId, maDauSach, client) {
        const { rows } = await query('SELECT * FROM dau_sach WHERE don_vi_id = $1 AND ma_dau_sach = $2 AND ngay_xoa IS NULL', [donViId, maDauSach], client);
        return rows[0] ?? null;
    }
    async thamChieuTonTai(bang, donViId, id, client) {
        if (!['tep_dinh_kem', 'tac_gia', 'the_loai_sach', 'tu_khoa_sach', 'bo_sach', 'dau_sach'].includes(bang)) throw new Error('Bảng tham chiếu không hợp lệ');
        const themDieuKien = bang === 'dau_sach' ? ' AND ngay_xoa IS NULL' : '';
        const { rows } = await query(`SELECT EXISTS (SELECT 1 FROM ${bang} WHERE don_vi_id = $1 AND id = $2${themDieuKien}) AS hop_le`, [donViId, id], client);
        return rows[0].hop_le;
    }
    async taoSach(donViId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `INSERT INTO dau_sach (don_vi_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1, $2, ${cot.map((_, i) => `$${i + 3}`).join(', ')}) RETURNING *`,
            [donViId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0];
    }
    async suaSach(donViId, sachId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE dau_sach SET ${cot.map((ten, i) => `${ten} = $${i + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL RETURNING *`,
            [donViId, sachId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async doiTrangThai(donViId, sachId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE dau_sach SET ${cot.map((ten, i) => `${ten} = $${i + 4}`).join(', ')}, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL RETURNING *`,
            [donViId, sachId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async xoaMem(donViId, sachId, actorId, client) {
        const { rows } = await query(
            `UPDATE dau_sach SET ngay_xoa = now(), cho_hien_thi_cong_khai = FALSE, ngay_an = now(), trang_thai = 'TAM_AN', nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NULL RETURNING *`,
            [donViId, sachId, actorId], client
        );
        return rows[0] ?? null;
    }
    async khoiPhuc(donViId, sachId, actorId, client) {
        const { rows } = await query(
            `UPDATE dau_sach SET ngay_xoa = NULL, trang_thai = 'NHAP', cho_hien_thi_cong_khai = FALSE, ngay_cong_bo = NULL, ngay_an = NULL, nguoi_cap_nhat_id = $3 WHERE don_vi_id = $1 AND id = $2 AND ngay_xoa IS NOT NULL RETURNING *`,
            [donViId, sachId, actorId], client
        );
        return rows[0] ?? null;
    }
    async danhSachLienKet(loai, donViId, sachId, client) {
        const cauHinh = LIEN_KET[loai];
        if (!cauHinh) throw new Error('Loại liên kết không hợp lệ');
        const boSung = {
            'tac-gia': `, tg.ma_tac_gia, tg.ho_ten, tg.ten_hien_thi AS ten_tac_gia`,
            'the-loai': `, tl.ma_the_loai, tl.ten_the_loai`,
            'tu-khoa': `, tk.ten_tu_khoa`,
            'bo-sach': `, bs.ma_bo_sach, bs.ten_bo_sach`,
            'lien-quan': `, ds.ma_dau_sach AS ma_sach_lien_quan, ds.ten_sach AS ten_sach_lien_quan`
        };
        const join = {
            'tac-gia': ` JOIN tac_gia tg ON tg.don_vi_id = lk.don_vi_id AND tg.id = lk.tac_gia_id`,
            'the-loai': ` JOIN the_loai_sach tl ON tl.don_vi_id = lk.don_vi_id AND tl.id = lk.the_loai_id`,
            'tu-khoa': ` JOIN tu_khoa_sach tk ON tk.don_vi_id = lk.don_vi_id AND tk.id = lk.tu_khoa_id`,
            'bo-sach': ` JOIN bo_sach bs ON bs.don_vi_id = lk.don_vi_id AND bs.id = lk.bo_sach_id`,
            'lien-quan': ` JOIN dau_sach ds ON ds.don_vi_id = lk.don_vi_id AND ds.id = lk.dau_sach_lien_quan_id`
        };
        const order = {
            'ten-khac': 'lk.thu_tu, lk.id',
            'tac-gia': 'lk.thu_tu_hien_thi, lk.id',
            'the-loai': 'lk.la_the_loai_chinh DESC, lk.thu_tu_hien_thi, lk.id',
            'tu-khoa': 'lk.id',
            'bo-sach': 'lk.thu_tu, lk.id',
            'lien-quan': 'lk.thu_tu, lk.id',
            'phan-loai': 'lk.la_phan_loai_chinh DESC, lk.id'
        };
        const { rows } = await query(
            `SELECT lk.*${boSung[loai] ?? ''} FROM ${cauHinh.bang} lk${join[loai] ?? ''} WHERE lk.don_vi_id = $1 AND lk.dau_sach_id = $2 ORDER BY ${order[loai]}`,
            [donViId, sachId], client
        );
        return rows;
    }
    async layLienKet(loai, donViId, sachId, lienKetId, client, khoa = false) {
        const cauHinh = LIEN_KET[loai];
        if (!cauHinh) throw new Error('Loại liên kết không hợp lệ');
        const { rows } = await query(
            `SELECT * FROM ${cauHinh.bang} WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3${khoa ? ' FOR UPDATE' : ''}`,
            [donViId, sachId, lienKetId], client
        );
        return rows[0] ?? null;
    }
    async taoLienKet(loai, donViId, sachId, actorId, duLieu, client) {
        const cauHinh = LIEN_KET[loai];
        if (!cauHinh) throw new Error('Loại liên kết không hợp lệ');
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `INSERT INTO ${cauHinh.bang} (don_vi_id, dau_sach_id, nguoi_tao_id, ${cot.join(', ')}) VALUES ($1,$2,$3,${cot.map((_, i) => `$${i + 4}`).join(', ')}) RETURNING *`,
            [donViId, sachId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0];
    }
    async suaLienKet(loai, donViId, sachId, lienKetId, actorId, duLieu, client) {
        const cauHinh = LIEN_KET[loai];
        if (!cauHinh) throw new Error('Loại liên kết không hợp lệ');
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE ${cauHinh.bang} SET ${cot.map((ten, i) => `${ten} = $${i + 5}`).join(', ')}, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3 RETURNING *`,
            [donViId, sachId, lienKetId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async xoaLienKet(loai, donViId, sachId, lienKetId, client) {
        const cauHinh = LIEN_KET[loai];
        if (!cauHinh) throw new Error('Loại liên kết không hợp lệ');
        const { rows } = await query(
            `DELETE FROM ${cauHinh.bang} WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3 RETURNING id`,
            [donViId, sachId, lienKetId], client
        );
        return rows[0] ?? null;
    }
    async boDanhDauChinh(loai, donViId, sachId, lienKetId, actorId, client) {
        const cot = { 'the-loai': 'la_the_loai_chinh', 'tac-gia': 'la_nguoi_dong_gop_chinh', 'phan-loai': 'la_phan_loai_chinh', 'ten-khac': 'la_ten_uu_tien' }[loai];
        if (!cot) return;
        const bang = LIEN_KET[loai].bang;
        await query(
            `UPDATE ${bang} SET ${cot} = FALSE, nguoi_cap_nhat_id = $4 WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id <> $3 AND ${cot} = TRUE`,
            [donViId, sachId, lienKetId, actorId], client
        );
    }
    async phienBan(donViId, sachId, client) {
        const { rows } = await query(
            `SELECT * FROM phien_ban_sach WHERE don_vi_id = $1 AND dau_sach_id = $2 ORDER BY ngay_tao DESC, id DESC`,
            [donViId, sachId], client
        );
        return rows;
    }
    async nguonDuLieu(donViId, sachId, client) {
        const { rows } = await query(
            `SELECT id, don_vi_id, dau_sach_id, phien_ban_sach_id, ten_nguon, loai_nguon, ma_ban_ghi_nguon, url_nguon, ngay_lay_du_lieu, ngay_doi_chieu, nguoi_doi_chieu_id, trang_thai, ngay_tao, ngay_cap_nhat, nguoi_tao_id, nguoi_cap_nhat_id FROM nguon_du_lieu_sach WHERE don_vi_id = $1 AND dau_sach_id = $2 ORDER BY ngay_tao DESC, id DESC`,
            [donViId, sachId], client
        );
        return rows;
    }
    async quyenNoiDung(donViId, sachId, client) {
        const { rows } = await query(
            `SELECT * FROM quyen_noi_dung_sach WHERE don_vi_id = $1 AND dau_sach_id = $2 ORDER BY ngay_tao DESC, id DESC`,
            [donViId, sachId], client
        );
        return rows;
    }

    async danhSachAnh(donViId, sachId, client) {
        const { rows } = await query(
            `SELECT a.*, t.ma_tep, t.ten_tep_goc, t.mime_type_xac_minh, t.duoi_tep,
                t.kich_thuoc_byte, t.chieu_rong_px, t.chieu_cao_px, t.trang_thai AS trang_thai_tep,
                t.trang_thai_quet_virus, t.pham_vi_truy_cap, t.ngay_tao AS ngay_tai_len
             FROM anh_dau_sach a
             JOIN tep_dinh_kem t ON t.id = a.tep_dinh_kem_id AND t.don_vi_so_huu_id = a.don_vi_id
             WHERE a.don_vi_id = $1 AND a.dau_sach_id = $2
             ORDER BY a.la_anh_chinh DESC, a.thu_tu ASC, a.id ASC`,
            [donViId, sachId], client
        );
        return rows;
    }
    async layAnh(donViId, sachId, anhId, client) {
        const { rows } = await query(
            'SELECT * FROM anh_dau_sach WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3',
            [donViId, sachId, anhId], client
        );
        return rows[0] ?? null;
    }
    async layTepAnh(donViId, tepId, client) {
        const { rows } = await query(
            `SELECT id, loai_tep, mime_type_xac_minh, trang_thai, trang_thai_quet_virus,
                pham_vi_truy_cap, chieu_rong_px, chieu_cao_px
             FROM tep_dinh_kem WHERE don_vi_so_huu_id = $1 AND id = $2`,
            [donViId, tepId], client
        );
        return rows[0] ?? null;
    }
    async taoAnh(donViId, sachId, actorId, duLieu, client) {
        const { rows } = await query(
            `INSERT INTO anh_dau_sach (
                don_vi_id, dau_sach_id, tep_dinh_kem_id, loai_anh, tieu_de, mo_ta,
                van_ban_thay_the, thu_tu, la_anh_chinh, hien_thi_cong_khai, nguoi_tao_id
             ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
            [
                donViId, sachId, duLieu.tep_dinh_kem_id, duLieu.loai_anh ?? 'ANH_KHAC',
                duLieu.tieu_de ?? null, duLieu.mo_ta ?? null, duLieu.van_ban_thay_the ?? null,
                duLieu.thu_tu ?? 0, duLieu.la_anh_chinh ?? false,
                duLieu.hien_thi_cong_khai ?? true, actorId
            ], client
        );
        return rows[0];
    }
    async suaAnh(donViId, sachId, anhId, actorId, duLieu, client) {
        const cot = Object.keys(duLieu);
        const { rows } = await query(
            `UPDATE anh_dau_sach SET ${cot.map((ten, i) => `${ten} = $${i + 5}`).join(', ')},
                nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3 RETURNING *`,
            [donViId, sachId, anhId, actorId, ...cot.map(ten => duLieu[ten])], client
        );
        return rows[0] ?? null;
    }
    async boAnhChinh(donViId, sachId, actorId, client) {
        await query(
            `UPDATE anh_dau_sach SET la_anh_chinh = FALSE, nguoi_cap_nhat_id = $3
             WHERE don_vi_id = $1 AND dau_sach_id = $2 AND la_anh_chinh = TRUE`,
            [donViId, sachId, actorId], client
        );
    }
    async dongBoAnhChinh(donViId, sachId, actorId, client) {
        const { rows: [anh] } = await query(
            `SELECT id, tep_dinh_kem_id FROM anh_dau_sach
            WHERE don_vi_id = $1 AND dau_sach_id = $2 AND hien_thi_cong_khai = TRUE
            ORDER BY la_anh_chinh DESC, thu_tu ASC, id ASC LIMIT 1`,
            [donViId, sachId], client
        );
        if (anh) {
            await query(
                `UPDATE anh_dau_sach SET la_anh_chinh = (id = $3), nguoi_cap_nhat_id = $4
                 WHERE don_vi_id = $1 AND dau_sach_id = $2 AND la_anh_chinh IS DISTINCT FROM (id = $3)`,
                [donViId, sachId, anh.id, actorId], client
            );
        }
        await query(
            `UPDATE dau_sach SET anh_bia_chinh_id = $3, nguoi_cap_nhat_id = $4
             WHERE don_vi_id = $1 AND id = $2`,
            [donViId, sachId, anh?.tep_dinh_kem_id ?? null, actorId], client
        );
        return anh ?? null;
    }
    async xoaAnh(donViId, sachId, anhId, client) {
        const { rows } = await query(
            'DELETE FROM anh_dau_sach WHERE don_vi_id = $1 AND dau_sach_id = $2 AND id = $3 RETURNING *',
            [donViId, sachId, anhId], client
        );
        return rows[0] ?? null;
    }
    async sapXepAnh(donViId, sachId, anhIds, actorId, client) {
        const { rows } = await query(
            `UPDATE anh_dau_sach a SET thu_tu = x.thu_tu, nguoi_cap_nhat_id = $3
             FROM unnest($4::integer[]) WITH ORDINALITY AS x(id, thu_tu)
             WHERE a.don_vi_id = $1 AND a.dau_sach_id = $2 AND a.id = x.id
             RETURNING a.id`,
            [donViId, sachId, actorId, anhIds], client
        );
        return rows;
    }
    async ghiNhatKy({ donViId, actorId, doiTuongLoai, doiTuongId, hanhDong, requestId }, client) {
        await query(
            `INSERT INTO nhat_ky_he_thong (don_vi_id, tai_khoan_id, hanh_dong, doi_tuong_loai, doi_tuong_id, ket_qua, ly_do, request_id, nguon)
             VALUES ($1,$2,$3,$4,$5,'THANH_CONG','Quản lý đầu sách',$6,'API')`,
            [donViId, actorId, hanhDong, doiTuongLoai, doiTuongId, requestId], client
        );
    }
}
module.exports = new SachRepository();