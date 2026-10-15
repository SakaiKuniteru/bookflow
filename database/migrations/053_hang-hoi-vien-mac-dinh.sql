INSERT INTO hang_hoi_vien (don_vi_id, ma_hang, ten_hang, thu_tu)
SELECT dv.id, mac_dinh.ma_hang, mac_dinh.ten_hang, mac_dinh.thu_tu
FROM don_vi dv
CROSS JOIN (
    VALUES
        ('CO_BAN', 'Hội viên Cơ bản', 1),
        ('BAC', 'Hội viên Bạc', 2),
        ('VANG', 'Hội viên Vàng', 3),
        ('KIM_CUONG', 'Hội viên Kim cương', 4)
) AS mac_dinh(ma_hang, ten_hang, thu_tu)
ON CONFLICT DO NOTHING;
