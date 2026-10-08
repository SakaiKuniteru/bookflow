ALTER TABLE thanh_vien_don_vi
    ADD COLUMN ngay_vao_lam DATE;

UPDATE thanh_vien_don_vi tv
SET ngay_vao_lam = (tv.ngay_gia_nhap AT TIME ZONE dv.mui_gio)::date
FROM don_vi dv
WHERE dv.id = tv.don_vi_id AND tv.ngay_vao_lam IS NULL AND tv.ngay_gia_nhap IS NOT NULL;

ALTER TABLE ho_so_nhan_vien
    ADD COLUMN cccd_so VARCHAR(30),
    ADD COLUMN cccd_ngay_cap DATE,
    ADD COLUMN cccd_noi_cap VARCHAR(200),
    ADD COLUMN lien_he_khan_cap_ho_ten VARCHAR(200),
    ADD COLUMN lien_he_khan_cap_quan_he VARCHAR(100),
    ADD COLUMN lien_he_khan_cap_so_dien_thoai VARCHAR(30),
    ADD COLUMN lien_he_khan_cap_dia_chi VARCHAR(500),
    ADD COLUMN trinh_do_hoc_van VARCHAR(200),
    ADD COLUMN chuyen_nganh VARCHAR(200),
    ADD COLUMN truong VARCHAR(200),
    ADD COLUMN chung_chi TEXT,
    ADD COLUMN ngoai_ngu TEXT,
    ADD COLUMN ky_nang TEXT;
