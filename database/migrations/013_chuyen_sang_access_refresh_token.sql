UPDATE phien_dang_nhap
SET ngay_thu_hoi = now(),
    ly_do_thu_hoi = 'CHUYEN_SANG_ACCESS_REFRESH'
WHERE ngay_thu_hoi IS NULL;