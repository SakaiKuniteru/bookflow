CREATE TABLE IF NOT EXISTS bo_dem_ma_chung (
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id),
    tien_to VARCHAR(12) NOT NULL CHECK (tien_to ~ '^[A-Z]{2,12}$'),
    ngay DATE NOT NULL,
    gia_tri INTEGER NOT NULL DEFAULT 0 CHECK (gia_tri BETWEEN 0 AND 99999),
    PRIMARY KEY (don_vi_id,tien_to,ngay)
);
DO $$
DECLARE
    bang TEXT;
    cot TEXT;
BEGIN
    FOREACH bang IN ARRAY ARRAY['bang_gia_sach','ma_giam_gia','don_hang','chi_tiet_don_hang','van_don','ca_ban_hang','su_dung_ma_giam_gia','giao_dich_thanh_toan','phan_bo_thanh_toan','yeu_cau_hoan_tien','doi_soat_thanh_toan','chi_tiet_doi_soat_thanh_toan','cong_no','but_toan_cong_no','tien_coc','giao_dich_tien_coc'] LOOP
        FOR cot IN SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = bang AND data_type = 'numeric' AND numeric_precision = 18 AND numeric_scale = 2 LOOP
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE NUMERIC(18,3)',bang,cot);
        END LOOP;
    END LOOP;
END $$;
CREATE UNIQUE INDEX IF NOT EXISTS uq_ca_ban_hang_thu_ngan_dang_mo ON ca_ban_hang(don_vi_id,chi_nhanh_id,thu_ngan_id) WHERE trang_thai = 'DANG_MO';
CREATE UNIQUE INDEX IF NOT EXISTS uq_phien_ban_hang_don_hang ON phien_ban_hang(don_vi_id,don_hang_id) WHERE don_hang_id IS NOT NULL;
ALTER TABLE giu_cho_ton_kho
    ALTER COLUMN chung_tu_id TYPE BIGINT,
    ALTER COLUMN chi_tiet_chung_tu_id TYPE BIGINT;