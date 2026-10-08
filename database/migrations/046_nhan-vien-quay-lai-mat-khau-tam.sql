ALTER TABLE thanh_vien_don_vi
    ADD COLUMN ly_do_nghi_viec TEXT,
    ADD COLUMN ngay_quay_lai_lam TIMESTAMPTZ,
    ADD COLUMN da_quay_lai_lam BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tai_khoan DROP CONSTRAINT ck_tk_mat_khau_tam;
ALTER TABLE tai_khoan ADD CONSTRAINT ck_tk_mat_khau_tam CHECK (NOT bat_buoc_doi_mat_khau OR mat_khau_tam_het_han IS NOT NULL);