-- Chay SAU migration 001-008. Khong chinh sua migration da ap dung.
ALTER TABLE tai_khoan ADD COLUMN ten_dang_nhap VARCHAR(40), ADD COLUMN bat_buoc_doi_mat_khau BOOLEAN NOT NULL DEFAULT FALSE, ADD COLUMN mat_khau_tam_het_han TIMESTAMPTZ, ADD COLUMN don_vi_kich_hoat_id INTEGER REFERENCES don_vi(id);
CREATE UNIQUE INDEX uq_tai_khoan_ten_dang_nhap ON tai_khoan (lower(ten_dang_nhap)) WHERE ten_dang_nhap IS NOT NULL;
ALTER TABLE tai_khoan ADD CONSTRAINT ck_tk_ten_dang_nhap CHECK (ten_dang_nhap IS NULL OR ten_dang_nhap ~ '^[A-Za-z0-9._-]{3,40}$');
ALTER TABLE tai_khoan ADD CONSTRAINT ck_tk_mat_khau_tam CHECK (NOT bat_buoc_doi_mat_khau OR (mat_khau_tam_het_han IS NOT NULL AND don_vi_kich_hoat_id IS NOT NULL));
ALTER TABLE phien_dang_nhap ADD COLUMN csrf_token_bam CHAR(64);
ALTER TABLE ma_xac_minh DROP CONSTRAINT IF EXISTS ck_ma_xac_minh_muc_dich;
ALTER TABLE ma_xac_minh ADD CONSTRAINT ck_ma_xac_minh_muc_dich CHECK (muc_dich IN ('DANG_KY', 'DAT_LAI_MAT_KHAU', 'DOI_EMAIL', 'XAC_MINH_SDT', 'DOI_MAT_KHAU', 'KICH_HOAT_NHAN_VIEN'));
INSERT INTO quyen (ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam) VALUES ('members.manage', 'Quản lý nhân viên', 'thanh_vien', 'Tạo, mời và quản lý nhân viên của đơn vị', TRUE) ON CONFLICT (ma_quyen) DO NOTHING;
INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi) SELECT v.don_vi_id, v.id, q.id, 'DON_VI' FROM vai_tro v JOIN quyen q ON q.ma_quyen = 'members.manage' WHERE v.ma_vai_tro = 'QUAN_TRI' AND v.la_vai_tro_he_thong = TRUE ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;
