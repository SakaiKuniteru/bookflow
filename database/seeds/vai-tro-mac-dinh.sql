INSERT INTO vai_tro (
    don_vi_id,
    ma_vai_tro,
    ten_vai_tro,
    mo_ta,
    la_vai_tro_he_thong
)
SELECT
    don_vi.id,
    mau.ma_vai_tro,
    mau.ten_vai_tro,
    mau.mo_ta,
    TRUE
FROM don_vi
CROSS JOIN (
    VALUES
    (
        'QUAN_TRI',
        'Quản trị đơn vị',
        'Vai trò quản trị trong phạm vi đơn vị.'
    ),
    (
        'NHAN_VIEN',
        'Nhân viên',
        'Vai trò nhân viên nghiệp vụ.'
    ),
    (
        'THU_THU',
        'Thủ thư',
        'Vai trò xử lý mượn và trả sách.'
    )
) AS mau (
    ma_vai_tro,
    ten_vai_tro,
    mo_ta
)
ON CONFLICT (don_vi_id, ma_vai_tro)
DO NOTHING;


INSERT INTO vai_tro_quyen (
    don_vi_id,
    vai_tro_id,
    quyen_id,
    pham_vi
)
SELECT
    vai_tro.don_vi_id,
    vai_tro.id,
    quyen.id,
    'DON_VI'
FROM vai_tro
JOIN quyen
    ON (
        vai_tro.ma_vai_tro = 'QUAN_TRI'
        AND quyen.ma_quyen IN (
            'books.read',
            'books.create',
            'loans.return',
            'payments.refund'
        )
    )
    OR (
        vai_tro.ma_vai_tro = 'NHAN_VIEN'
        AND quyen.ma_quyen = 'books.read'
    )
    OR (
        vai_tro.ma_vai_tro = 'THU_THU'
        AND quyen.ma_quyen IN (
            'books.read',
            'loans.return'
        )
    )
ON CONFLICT (
    don_vi_id,
    vai_tro_id,
    quyen_id,
    pham_vi
)
DO NOTHING;