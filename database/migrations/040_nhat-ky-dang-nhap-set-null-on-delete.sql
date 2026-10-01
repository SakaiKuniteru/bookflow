ALTER TABLE nhat_ky_dang_nhap
DROP CONSTRAINT IF EXISTS nhat_ky_dang_nhap_tai_khoan_id_fkey;

ALTER TABLE nhat_ky_dang_nhap
ADD CONSTRAINT nhat_ky_dang_nhap_tai_khoan_id_fkey
FOREIGN KEY (tai_khoan_id)
REFERENCES tai_khoan(id)
ON DELETE SET NULL;