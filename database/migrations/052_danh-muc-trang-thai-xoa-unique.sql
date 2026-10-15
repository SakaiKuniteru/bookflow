CREATE UNIQUE INDEX IF NOT EXISTS uq_the_loai_ten
    ON the_loai_sach (don_vi_id, lower(btrim(ten_the_loai)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_nxb_ten
    ON nha_xuat_ban (don_vi_id, lower(btrim(ten_nha_xuat_ban)));

CREATE UNIQUE INDEX IF NOT EXISTS uq_ncc_ten
    ON nha_cung_cap (don_vi_id, lower(btrim(ten_nha_cung_cap)))
    WHERE ngay_xoa IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_phien_ban_ten
    ON phien_ban_sach (don_vi_id, lower(btrim(ten_phien_ban)))
    WHERE ten_phien_ban IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_kho_ten_chi_nhanh
    ON kho (don_vi_id, chi_nhanh_id, lower(btrim(ten_kho)))
    WHERE ngay_xoa IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hang_hoi_vien_ten
    ON hang_hoi_vien (don_vi_id, lower(btrim(ten_hang)));

ALTER TABLE hoi_vien
    ADD COLUMN IF NOT EXISTS ngay_xoa TIMESTAMPTZ;

ALTER TABLE hoi_vien
    DROP CONSTRAINT IF EXISTS hoi_vien_don_vi_id_khach_hang_id_key,
    DROP CONSTRAINT IF EXISTS hoi_vien_don_vi_id_ma_hoi_vien_key;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hoi_vien_khach_hang_active
    ON hoi_vien (don_vi_id, khach_hang_id)
    WHERE ngay_xoa IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_hoi_vien_ma_active
    ON hoi_vien (don_vi_id, upper(btrim(ma_hoi_vien)))
    WHERE ngay_xoa IS NULL;
