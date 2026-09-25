-- 006: Rang buoc phan cong chi nhanh va gan vai tro.

ALTER TABLE thanh_vien_chi_nhanh
ADD CONSTRAINT ck_tvcn_khoang_ngay
CHECK (ngay_ket_thuc IS NULL OR ngay_ket_thuc >= ngay_bat_dau);

ALTER TABLE thanh_vien_vai_tro
ADD CONSTRAINT ck_tvvt_khoang_ngay
CHECK (ngay_ket_thuc IS NULL OR ngay_ket_thuc > ngay_bat_dau);

-- Mot thanh vien khong co hai phan cong dang mo tai cung mot chi nhanh.
-- Phan cong tam dung van duoc xem la dang mo de khong tao ban ghi trung.
CREATE UNIQUE INDEX uq_tvcn_phan_cong_dang_mo
ON thanh_vien_chi_nhanh (don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id)
WHERE ngay_ket_thuc IS NULL AND trang_thai IN ('HIEU_LUC', 'TAM_DUNG');

-- Moi thanh vien chi co mot chi nhanh chinh dang hieu luc.
CREATE UNIQUE INDEX uq_tvcn_chi_nhanh_chinh
ON thanh_vien_chi_nhanh (don_vi_id, thanh_vien_don_vi_id)
WHERE la_chi_nhanh_chinh = TRUE
  AND trang_thai = 'HIEU_LUC'
  AND ngay_ket_thuc IS NULL;

-- Tranh gan trung vai tro dang mo; NULLS NOT DISTINCT giup
-- hai ban ghi chi_nhanh_id NULL cung duoc coi la trung.
-- BookFlow dang dung PostgreSQL 17.
CREATE UNIQUE INDEX uq_tvvt_vai_tro_dang_mo
ON thanh_vien_vai_tro (
    don_vi_id, thanh_vien_don_vi_id, vai_tro_id, chi_nhanh_id
) NULLS NOT DISTINCT
WHERE ngay_ket_thuc IS NULL;

CREATE INDEX idx_tvcn_pham_vi_hieu_luc
ON thanh_vien_chi_nhanh (don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id)
WHERE trang_thai = 'HIEU_LUC';

CREATE INDEX idx_tvvt_tra_quyen
ON thanh_vien_vai_tro (
    don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id, ngay_bat_dau
)
WHERE ngay_ket_thuc IS NULL;