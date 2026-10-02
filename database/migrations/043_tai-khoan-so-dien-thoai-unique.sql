CREATE UNIQUE INDEX uq_tai_khoan_so_dien_thoai
ON tai_khoan (so_dien_thoai)
WHERE so_dien_thoai IS NOT NULL;