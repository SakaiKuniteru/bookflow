INSERT INTO vai_tro (
    don_vi_id, ma_vai_tro, ten_vai_tro, mo_ta, la_vai_tro_he_thong
)
SELECT dv.id, mau.ma_vai_tro, mau.ten_vai_tro, mau.mo_ta, TRUE
FROM don_vi dv
CROSS JOIN (
    VALUES
        ('QUAN_TRI', 'Quản trị đơn vị', 'Quản trị trong phạm vi đơn vị.'),
        ('NHAN_VIEN', 'Nhân viên', 'Nhân viên nghiệp vụ theo chi nhánh.'),
        ('THU_THU', 'Thủ thư', 'Xử lý mượn trả theo chi nhánh.')
) AS mau(ma_vai_tro, ten_vai_tro, mo_ta)
ON CONFLICT (don_vi_id, ma_vai_tro) DO NOTHING;

WITH mau(ma_vai_tro, ma_quyen, pham_vi) AS (
    VALUES
        ('QUAN_TRI', 'books.read', 'DON_VI'),
        ('QUAN_TRI', 'books.create', 'DON_VI'),
        ('QUAN_TRI', 'loans.return', 'DON_VI'),
        ('QUAN_TRI', 'payments.refund', 'DON_VI'),
        ('NHAN_VIEN', 'books.read', 'CHI_NHANH'),
        ('THU_THU', 'books.read', 'CHI_NHANH'),
        ('THU_THU', 'loans.return', 'CHI_NHANH')
)
INSERT INTO vai_tro_quyen (
    don_vi_id, vai_tro_id, quyen_id, pham_vi
)
SELECT vt.don_vi_id, vt.id, q.id, mau.pham_vi
FROM mau
JOIN vai_tro vt
    ON vt.ma_vai_tro = mau.ma_vai_tro
   AND vt.la_vai_tro_he_thong = TRUE
JOIN quyen q ON q.ma_quyen = mau.ma_quyen
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi)
DO NOTHING;