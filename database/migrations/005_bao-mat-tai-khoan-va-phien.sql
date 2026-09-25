-- 005: Chi bo sung rang buoc/index cho bang da ton tai.
-- Khong sua migration 001-004.

-- Mot phien chon don vi phai thuoc tai khoan co thanh vien tai don vi do.
-- FK chi chung minh ton tai thanh vien; service van phai kiem tra trang thai.
ALTER TABLE phien_dang_nhap
ADD CONSTRAINT fk_phien_thanh_vien_dang_chon
FOREIGN KEY (don_vi_dang_chon_id, tai_khoan_id)
REFERENCES thanh_vien_don_vi (don_vi_id, tai_khoan_id);

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT ck_phien_thoi_han
CHECK (ngay_het_han > ngay_tao);

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT ck_phien_ngay_thu_hoi
CHECK (ngay_thu_hoi IS NULL OR ngay_thu_hoi >= ngay_tao);

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT ck_phien_ma_bam
CHECK (btrim(ma_phien_bam) ~ '^[0-9a-f]{64}$');

CREATE INDEX idx_phien_chua_thu_hoi
ON phien_dang_nhap (tai_khoan_id, ngay_het_han)
WHERE ngay_thu_hoi IS NULL;

CREATE INDEX idx_phien_don_vi_dang_chon
ON phien_dang_nhap (don_vi_dang_chon_id, tai_khoan_id)
WHERE don_vi_dang_chon_id IS NOT NULL AND ngay_thu_hoi IS NULL;

-- Chi luu HMAC/hash ma xac minh, khong luu OTP hoac reset token ro.
ALTER TABLE ma_xac_minh
ADD CONSTRAINT ck_ma_xac_minh_muc_dich
CHECK (muc_dich IN ('DANG_KY', 'DAT_LAI_MAT_KHAU', 'DOI_EMAIL', 'XAC_MINH_SDT'));

ALTER TABLE ma_xac_minh
ADD CONSTRAINT ck_ma_xac_minh_ma_bam
CHECK (btrim(ma_bam) ~ '^[0-9a-f]{64}$');

ALTER TABLE ma_xac_minh
ADD CONSTRAINT ck_ma_xac_minh_thoi_han
CHECK (ngay_het_han > ngay_tao);

ALTER TABLE ma_xac_minh
ADD CONSTRAINT ck_ma_xac_minh_ngay_su_dung
CHECK (ngay_su_dung IS NULL OR ngay_su_dung >= ngay_tao);

CREATE INDEX idx_ma_xac_minh_chua_su_dung
ON ma_xac_minh (dia_chi_dich, muc_dich, ngay_het_han)
WHERE ngay_su_dung IS NULL;

-- Trang thai dang nhap theo tu dien da duyet.
ALTER TABLE nhat_ky_dang_nhap
ADD CONSTRAINT ck_nhat_ky_dang_nhap_ket_qua
CHECK (ket_qua IN ('THANH_CONG', 'SAI_MAT_KHAU', 'KHOA', 'MFA_THAT_BAI'));

CREATE INDEX idx_nhat_ky_dang_nhap_email
ON nhat_ky_dang_nhap (email_da_nhap, ngay_tao DESC)
WHERE email_da_nhap IS NOT NULL;

-- Phuc vu tim tai khoan tam khoa va xu ly gioi han dang nhap.
CREATE INDEX idx_tai_khoan_khoa_den
ON tai_khoan (khoa_den)
WHERE khoa_den IS NOT NULL;