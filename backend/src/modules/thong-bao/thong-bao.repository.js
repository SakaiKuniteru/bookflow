const { query } = require('../../database/query.js');

class ThongBaoRepository {
    async timTaiKhoanTheoLienHe({ email, soDienThoai }, client) {
        const dieuKien = [];
        const thamSo = [];
        if (email) {
            thamSo.push(email.toLowerCase());
            dieuKien.push(`lower(email) = $${thamSo.length}`);
        }
        if (soDienThoai) {
            thamSo.push(soDienThoai);
            dieuKien.push(`so_dien_thoai = $${thamSo.length}`);
        }
        if (!dieuKien.length) return [];
        const { rows } = await query(`SELECT id, ho_ten, email, so_dien_thoai, email_da_xac_minh, trang_thai FROM tai_khoan WHERE trang_thai <> 'DA_DONG' AND (${dieuKien.join(' OR ')}) ORDER BY id`, thamSo, client);
        return rows;
    }

    async layTaiKhoan(taiKhoanId, client) {
        const { rows } = await query(`SELECT id, ho_ten, email, so_dien_thoai, email_da_xac_minh, trang_thai FROM tai_khoan WHERE id = $1 AND trang_thai <> 'DA_DONG'`, [taiKhoanId], client);
        return rows[0] ?? null;
    }

    async taoSuKien({ donViId, maSuKien, loaiSuKien, doiTuongLoai, doiTuongId, tieuDe, noiDung, duLieu }, client) {
        const { rows } = await query(`INSERT INTO thong_bao_su_kien (don_vi_id, ma_su_kien, loai_su_kien, doi_tuong_loai, doi_tuong_id, tieu_de, noi_dung, du_lieu) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb) ON CONFLICT (don_vi_id, ma_su_kien) DO UPDATE SET ma_su_kien = EXCLUDED.ma_su_kien RETURNING id, don_vi_id, ma_su_kien, loai_su_kien, doi_tuong_loai, doi_tuong_id, tieu_de, noi_dung, du_lieu, ngay_tao`, [donViId, maSuKien, loaiSuKien, doiTuongLoai, doiTuongId, tieuDe, noiDung, JSON.stringify(duLieu)], client);
        return rows[0];
    }

    async taoThongBao({ donViId, suKienId, taiKhoanId, tieuDe, noiDung, duLieu }, client) {
        const { rows } = await query(`INSERT INTO thong_bao (don_vi_id, su_kien_id, tai_khoan_id, tieu_de, noi_dung, du_lieu) VALUES ($1,$2,$3,$4,$5,$6::jsonb) ON CONFLICT (su_kien_id, tai_khoan_id) DO UPDATE SET tieu_de = EXCLUDED.tieu_de, noi_dung = EXCLUDED.noi_dung, du_lieu = EXCLUDED.du_lieu RETURNING id, don_vi_id, su_kien_id, tai_khoan_id, tieu_de, noi_dung, du_lieu, trang_thai_doc, ngay_doc, ngay_tao`, [donViId, suKienId, taiKhoanId, tieuDe, noiDung, JSON.stringify(duLieu)], client);
        return rows[0];
    }

    async taoKenh({ thongBaoId, kenh, diaChi }, client) {
        const { rows } = await query(`INSERT INTO thong_bao_kenh (thong_bao_id, kenh, dia_chi, trang_thai, ngay_gui_tiep) VALUES ($1,$2,$3,'CHO_GUI',now()) ON CONFLICT (thong_bao_id, kenh) DO UPDATE SET dia_chi = COALESCE(EXCLUDED.dia_chi, thong_bao_kenh.dia_chi) RETURNING id, thong_bao_id, kenh, dia_chi, trang_thai, so_lan_thu, ngay_gui_cuoi, ngay_gui_tiep, loi_cuoi, ngay_tao`, [thongBaoId, kenh, diaChi], client);
        return rows[0];
    }

    async taoLich({ donViId, maLich, taiKhoanId, loaiLich, doiTuongLoai, doiTuongId, tieuDe, noiDung, duLieu, thoiDiemGuiTiep, lapLaiPhut, thoiDiemKetThuc }, client) {
        const { rows } = await query(`INSERT INTO lich_thong_bao (don_vi_id, ma_lich, tai_khoan_id, loai_lich, doi_tuong_loai, doi_tuong_id, tieu_de, noi_dung, du_lieu, thoi_diem_gui_tiep, lap_lai_phut, thoi_diem_ket_thuc) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10,$11,$12) ON CONFLICT (don_vi_id, ma_lich) DO UPDATE SET tai_khoan_id = EXCLUDED.tai_khoan_id, loai_lich = EXCLUDED.loai_lich, doi_tuong_loai = EXCLUDED.doi_tuong_loai, doi_tuong_id = EXCLUDED.doi_tuong_id, tieu_de = EXCLUDED.tieu_de, noi_dung = EXCLUDED.noi_dung, du_lieu = EXCLUDED.du_lieu, thoi_diem_gui_tiep = EXCLUDED.thoi_diem_gui_tiep, lap_lai_phut = EXCLUDED.lap_lai_phut, thoi_diem_ket_thuc = EXCLUDED.thoi_diem_ket_thuc, trang_thai = 'HOAT_DONG', ngay_cap_nhat = now() RETURNING *`, [donViId, maLich, taiKhoanId, loaiLich, doiTuongLoai, doiTuongId, tieuDe, noiDung, JSON.stringify(duLieu), thoiDiemGuiTiep, lapLaiPhut, thoiDiemKetThuc], client);
        return rows[0];
    }

    async huyLich({ donViId, maLich }, client) {
        const { rows } = await query(`UPDATE lich_thong_bao SET trang_thai = 'DA_HUY', ngay_cap_nhat = now() WHERE don_vi_id = $1 AND ma_lich = $2 AND trang_thai <> 'DA_HUY' RETURNING *`, [donViId, maLich], client);
        return rows[0] ?? null;
    }

    async layDanhSach(auth, boLoc, client) {
        const thamSo = [auth.donViId, auth.taiKhoanId];
        const dieuKien = ['tb.don_vi_id = $1', 'tb.tai_khoan_id = $2'];
        if (boLoc.trangThaiDoc) {
            thamSo.push(boLoc.trangThaiDoc);
            dieuKien.push(`tb.trang_thai_doc = $${thamSo.length}`);
        }
        if (boLoc.loaiSuKien) {
            thamSo.push(boLoc.loaiSuKien);
            dieuKien.push(`sk.loai_su_kien = $${thamSo.length}`);
        }
        thamSo.push(boLoc.kichThuoc);
        const limitIndex = thamSo.length;
        thamSo.push((boLoc.trang - 1) * boLoc.kichThuoc);
        const offsetIndex = thamSo.length;
        const { rows } = await query(`SELECT tb.id, tb.tieu_de, tb.noi_dung, tb.du_lieu, tb.trang_thai_doc, tb.ngay_doc, tb.ngay_tao, sk.ma_su_kien, sk.loai_su_kien, sk.doi_tuong_loai, sk.doi_tuong_id FROM thong_bao tb JOIN thong_bao_su_kien sk ON sk.id = tb.su_kien_id WHERE ${dieuKien.join(' AND ')} ORDER BY tb.ngay_tao DESC, tb.id DESC LIMIT $${limitIndex} OFFSET $${offsetIndex}`, thamSo, client);
        const { rows: tongRows } = await query(`SELECT COUNT(*)::bigint AS tong FROM thong_bao tb JOIN thong_bao_su_kien sk ON sk.id = tb.su_kien_id WHERE ${dieuKien.join(' AND ')}`, thamSo.slice(0, -2), client);
        return { items: rows, tong: tongRows[0]?.tong ?? '0' };
    }

    async layChiTiet(auth, thongBaoId, client) {
        const { rows } = await query(`SELECT tb.id, tb.tieu_de, tb.noi_dung, tb.du_lieu, tb.trang_thai_doc, tb.ngay_doc, tb.ngay_tao, sk.ma_su_kien, sk.loai_su_kien, sk.doi_tuong_loai, sk.doi_tuong_id FROM thong_bao tb JOIN thong_bao_su_kien sk ON sk.id = tb.su_kien_id WHERE tb.id = $1 AND tb.don_vi_id = $2 AND tb.tai_khoan_id = $3`, [thongBaoId, auth.donViId, auth.taiKhoanId], client);
        return rows[0] ?? null;
    }

    async danhDauDaDoc(auth, thongBaoId, client) {
        const { rows } = await query(`UPDATE thong_bao SET trang_thai_doc = 'DA_DOC', ngay_doc = COALESCE(ngay_doc, now()) WHERE id = $1 AND don_vi_id = $2 AND tai_khoan_id = $3 RETURNING id, trang_thai_doc, ngay_doc`, [thongBaoId, auth.donViId, auth.taiKhoanId], client);
        return rows[0] ?? null;
    }

    async danhDauTatCaDaDoc(auth, client) {
        const { rowCount } = await query(`UPDATE thong_bao SET trang_thai_doc = 'DA_DOC', ngay_doc = COALESCE(ngay_doc, now()) WHERE don_vi_id = $1 AND tai_khoan_id = $2 AND trang_thai_doc = 'CHUA_DOC'`, [auth.donViId, auth.taiKhoanId], client);
        return rowCount;
    }

    async layLichDenHan(limit = 50, client) {
        const { rows } = await query(`SELECT * FROM lich_thong_bao WHERE trang_thai = 'HOAT_DONG' AND thoi_diem_gui_tiep <= now() AND (thoi_diem_ket_thuc IS NULL OR thoi_diem_gui_tiep <= thoi_diem_ket_thuc) ORDER BY thoi_diem_gui_tiep ASC, id ASC LIMIT $1 FOR UPDATE SKIP LOCKED`, [limit], client);
        return rows;
    }

    async capNhatLichSauKhiGui(id, { trangThai, thoiDiemGuiTiep }, client) {
        const { rows } = await query(`UPDATE lich_thong_bao SET trang_thai = $2, thoi_diem_gui_tiep = $3, lan_gui_cuoi = now(), so_lan_gui = so_lan_gui + 1, ngay_cap_nhat = now() WHERE id = $1 RETURNING *`, [id, trangThai, thoiDiemGuiTiep], client);
        return rows[0] ?? null;
    }

    async taoKenhLog({ thongBaoKenhId, lanThu, trangThai, loi }, client) {
        await query(`INSERT INTO thong_bao_kenh_log (thong_bao_kenh_id, lan_thu, trang_thai, loi) VALUES ($1,$2,$3,$4)`, [thongBaoKenhId, lanThu, trangThai, loi], client);
    }

    async layEmailChoGui(limit = 50, client) {
        const { rows } = await query(`SELECT tbk.id, tbk.thong_bao_id, tbk.dia_chi, tbk.so_lan_thu, tb.tieu_de, tb.noi_dung, tk.ho_ten FROM thong_bao_kenh tbk JOIN thong_bao tb ON tb.id = tbk.thong_bao_id JOIN tai_khoan tk ON tk.id = tb.tai_khoan_id WHERE tbk.kenh = 'EMAIL' AND tbk.trang_thai IN ('CHO_GUI','THAT_BAI') AND COALESCE(tbk.ngay_gui_tiep, now()) <= now() AND tk.trang_thai <> 'DA_DONG' ORDER BY COALESCE(tbk.ngay_gui_tiep, now()), tbk.id LIMIT $1 FOR UPDATE OF tbk SKIP LOCKED`, [limit], client);
        return rows;
    }

    async danhDauEmailDangGui(id, lanThu, client) {
        const { rows } = await query(`UPDATE thong_bao_kenh SET trang_thai = 'DANG_GUI', so_lan_thu = $2, ngay_gui_cuoi = now(), loi_cuoi = NULL WHERE id = $1 RETURNING *`, [id, lanThu], client);
        return rows[0] ?? null;
    }

    async danhDauEmailThanhCong(id, client) {
        const { rows } = await query(`UPDATE thong_bao_kenh SET trang_thai = 'DA_GUI', ngay_gui_tiep = NULL, loi_cuoi = NULL WHERE id = $1 RETURNING *`, [id], client);
        return rows[0] ?? null;
    }

    async danhDauEmailThatBai(id, lanThu, loi, ngayGuiTiep, client) {
        const { rows } = await query(`UPDATE thong_bao_kenh SET trang_thai = CASE WHEN $2 >= 8 THEN 'THAT_BAI' ELSE 'CHO_GUI' END, so_lan_thu = $2, ngay_gui_tiep = $4, loi_cuoi = $3 WHERE id = $1 RETURNING *`, [id, lanThu, loi, ngayGuiTiep], client);
        return rows[0] ?? null;
    }
}

module.exports = new ThongBaoRepository();