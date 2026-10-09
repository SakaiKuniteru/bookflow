CREATE TABLE IF NOT EXISTS bo_dem_ma_khach_hang (
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id),
    tien_to VARCHAR(12) NOT NULL,
    nam SMALLINT NOT NULL CHECK (nam BETWEEN 0 AND 9999),
    thang SMALLINT NOT NULL CHECK (thang BETWEEN 1 AND 12),
    gia_tri INTEGER NOT NULL CHECK (gia_tri BETWEEN 1 AND 999999),
    PRIMARY KEY (don_vi_id, tien_to, nam, thang)
);

INSERT INTO quyen (ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam)
VALUES
    ('customers.read', 'Xem khách hàng', 'khach_hang', 'Xem danh sách và thông tin khách hàng', FALSE),
    ('customers.manage', 'Quản lý khách hàng', 'khach_hang', 'Tạo, cập nhật và quản lý khách hàng', FALSE)
ON CONFLICT (ma_quyen) DO UPDATE
SET ten_quyen = EXCLUDED.ten_quyen,
    nhom_quyen = EXCLUDED.nhom_quyen,
    mo_ta = EXCLUDED.mo_ta,
    trang_thai = 'DANG_DUNG',
    ngay_cap_nhat = now();

INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi)
SELECT vt.don_vi_id, vt.id, q.id, 'DON_VI'
FROM vai_tro vt
JOIN quyen q ON q.ma_quyen IN ('customers.read', 'customers.manage')
WHERE vt.ma_vai_tro = 'QUAN_TRI'
  AND vt.la_vai_tro_he_thong = TRUE
  AND vt.trang_thai = 'DANG_DUNG'
  AND q.trang_thai = 'DANG_DUNG'
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;

UPDATE khach_hang
SET loai_khach_hang = 'CA_NHAN',
    ten_to_chuc = NULL,
    ma_so_thue = NULL
WHERE loai_khach_hang <> 'CA_NHAN';