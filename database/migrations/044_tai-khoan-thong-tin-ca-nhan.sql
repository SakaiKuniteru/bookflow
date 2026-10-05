ALTER TABLE tai_khoan
    ADD COLUMN ngay_sinh DATE,
    ADD COLUMN gioi_tinh VARCHAR(20),
    ADD COLUMN quoc_tich VARCHAR(100),
    ADD COLUMN dan_toc VARCHAR(100),
    ADD COLUMN mo_ta TEXT,
    ADD COLUMN dia_chi_chi_tiet VARCHAR(300),
    ADD COLUMN quoc_gia VARCHAR(100),
    ADD COLUMN tinh_thanh_pho VARCHAR(150),
    ADD COLUMN phuong_xa VARCHAR(150);

ALTER TABLE tai_khoan
    ADD CONSTRAINT ck_tai_khoan_gioi_tinh
    CHECK (gioi_tinh IS NULL OR gioi_tinh IN ('NAM', 'NU', 'KHAC', 'KHONG_TIET_LO'));