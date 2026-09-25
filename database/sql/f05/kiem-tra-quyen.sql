WITH ngu_canh AS (
    SELECT
        p.tai_khoan_id,
        p.don_vi_dang_chon_id AS don_vi_id,
        p.chi_nhanh_dang_chon_id AS chi_nhanh_id,
        tv.id AS thanh_vien_id
    FROM phien_dang_nhap p
    JOIN tai_khoan tk ON tk.id = p.tai_khoan_id
    JOIN don_vi dv ON dv.id = p.don_vi_dang_chon_id
    JOIN thanh_vien_don_vi tv
        ON tv.don_vi_id = dv.id
       AND tv.tai_khoan_id = tk.id
    WHERE p.ma_phien_bam = $1
      AND p.ngay_thu_hoi IS NULL
      AND p.ngay_het_han > now()
      AND p.phien_ban_xac_thuc = tk.phien_ban_xac_thuc
      AND tk.trang_thai = 'DANG_DUNG'
      AND (tk.khoa_den IS NULL OR tk.khoa_den <= now())
      AND dv.trang_thai = 'DANG_DUNG'
      AND tv.trang_thai = 'DANG_LAM'
      AND (tv.ngay_nghi_viec IS NULL OR tv.ngay_nghi_viec > now())
)
SELECT EXISTS (
    SELECT 1
    FROM ngu_canh nc
    JOIN thanh_vien_vai_tro tvvt
        ON tvvt.don_vi_id = nc.don_vi_id
       AND tvvt.thanh_vien_don_vi_id = nc.thanh_vien_id
    JOIN vai_tro vt
        ON vt.id = tvvt.vai_tro_id
       AND vt.don_vi_id = nc.don_vi_id
    JOIN vai_tro_quyen vtq
        ON vtq.vai_tro_id = vt.id
       AND vtq.don_vi_id = nc.don_vi_id
    JOIN quyen q ON q.id = vtq.quyen_id
    WHERE q.ma_quyen = $2
      AND q.trang_thai = 'DANG_DUNG'
      AND vt.trang_thai = 'DANG_DUNG'
      AND tvvt.ngay_bat_dau <= now()
      AND (tvvt.ngay_ket_thuc IS NULL OR tvvt.ngay_ket_thuc > now())
      AND (
          tvvt.chi_nhanh_id IS NULL
          OR (
              tvvt.chi_nhanh_id = nc.chi_nhanh_id
              AND EXISTS (
                  SELECT 1
                  FROM thanh_vien_chi_nhanh tvcn
                  WHERE tvcn.don_vi_id = nc.don_vi_id
                    AND tvcn.thanh_vien_don_vi_id = nc.thanh_vien_id
                    AND tvcn.chi_nhanh_id = nc.chi_nhanh_id
                    AND tvcn.trang_thai = 'HIEU_LUC'
                    AND tvcn.ngay_bat_dau <= CURRENT_DATE
                    AND (tvcn.ngay_ket_thuc IS NULL
                         OR tvcn.ngay_ket_thuc >= CURRENT_DATE)
              )
          )
      )
      AND (
          (vtq.pham_vi = 'DON_VI' AND tvvt.chi_nhanh_id IS NULL)
          OR (
              vtq.pham_vi = 'CHI_NHANH'
              AND nc.chi_nhanh_id IS NOT NULL
              AND EXISTS (
                  SELECT 1 FROM chi_nhanh cn
                  WHERE cn.id = nc.chi_nhanh_id
                    AND cn.don_vi_id = nc.don_vi_id
                    AND cn.trang_thai = 'DANG_DUNG'
              )
          )
          OR (
              vtq.pham_vi = 'CA_NHAN'
              AND $3::uuid = nc.tai_khoan_id
          )
      )
) AS duoc_phep;