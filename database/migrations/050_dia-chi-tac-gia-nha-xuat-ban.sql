ALTER TABLE tac_gia
    ADD COLUMN IF NOT EXISTS ma_tinh_thanh_xuat_than VARCHAR(20),
    ADD COLUMN IF NOT EXISTS tinh_thanh_xuat_than VARCHAR(120),
    ADD COLUMN IF NOT EXISTS ma_phuong_xa_xuat_than VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phuong_xa_xuat_than VARCHAR(120);

ALTER TABLE nha_xuat_ban
    ADD COLUMN IF NOT EXISTS ma_tinh_thanh VARCHAR(20),
    ADD COLUMN IF NOT EXISTS ma_phuong_xa VARCHAR(20),
    ADD COLUMN IF NOT EXISTS phuong_xa VARCHAR(120);
