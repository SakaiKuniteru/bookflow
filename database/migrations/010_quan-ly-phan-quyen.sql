INSERT INTO quyen (ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam)
VALUES ('roles.manage', 'Quản lý vai trò và phân quyền', 'phan_quyen', 'Tạo vai trò, cấu hình quyền và gán vai trò cho nhân viên trong đơn vị', TRUE)
ON CONFLICT (ma_quyen) DO NOTHING;

INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi)
SELECT vt.don_vi_id, vt.id, q.id, 'DON_VI'
FROM vai_tro vt
JOIN quyen q ON q.ma_quyen = 'roles.manage'
WHERE vt.ma_vai_tro = 'QUAN_TRI' AND vt.la_vai_tro_he_thong = TRUE
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;