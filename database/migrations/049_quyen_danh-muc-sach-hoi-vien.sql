INSERT INTO quyen (
    ma_quyen,
    ten_quyen,
    nhom_quyen,
    mo_ta,
    la_quyen_nhay_cam
)
VALUES
    (
        'books.read',
        'Xem sách',
        'sach',
        'Được xem dữ liệu sách theo phạm vi được cấp.',
        FALSE
    ),
    (
        'books.create',
        'Thêm sách',
        'sach',
        'Được tạo đầu sách và phiên bản trong phạm vi được cấp.',
        FALSE
    ),
    (
        'members.read',
        'Xem thành viên',
        'thanh_vien',
        'Xem thành viên trong phạm vi được cấp.',
        FALSE
    )
ON CONFLICT (ma_quyen) DO UPDATE
SET ten_quyen = EXCLUDED.ten_quyen,
    nhom_quyen = EXCLUDED.nhom_quyen,
    mo_ta = EXCLUDED.mo_ta,
    la_quyen_nhay_cam = EXCLUDED.la_quyen_nhay_cam,
    trang_thai = 'DANG_DUNG',
    ngay_cap_nhat = now();

INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi)
SELECT vt.don_vi_id, vt.id, q.id, 'DON_VI'
FROM vai_tro vt
JOIN quyen q ON q.ma_quyen IN ('books.read', 'books.create', 'members.read')
WHERE vt.ma_vai_tro = 'QUAN_TRI'
  AND vt.la_vai_tro_he_thong = TRUE
  AND vt.trang_thai = 'DANG_DUNG'
  AND q.trang_thai = 'DANG_DUNG'
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;
