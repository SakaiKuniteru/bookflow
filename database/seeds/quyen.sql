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
    'loans.return',
    'Nhận trả sách',
    'muon_tra',
    'Được tiếp nhận và xử lý việc trả sách.',
    FALSE
),
(
    'payments.refund',
    'Hoàn tiền',
    'thanh_toan',
    'Được đề nghị hoặc thực hiện hoàn tiền theo quy trình duyệt.',
    TRUE
)
ON CONFLICT (ma_quyen)
DO NOTHING;