INSERT INTO quyen (
    ma_quyen, ten_quyen, nhom_quyen, mo_ta, la_quyen_nhay_cam
)
VALUES
    ('tenants.read', 'Xem đơn vị', 'don_vi', 'Xem thông tin đơn vị được phép.', FALSE),
    ('tenants.update', 'Cập nhật đơn vị', 'don_vi', 'Cập nhật thông tin và cấu hình đơn vị.', TRUE),
    ('branches.read', 'Xem chi nhánh', 'chi_nhanh', 'Xem chi nhánh trong phạm vi được cấp.', FALSE),
    ('branches.create', 'Tạo chi nhánh', 'chi_nhanh', 'Tạo chi nhánh thuộc đơn vị đang quản lý.', TRUE),
    ('branches.update', 'Cập nhật chi nhánh', 'chi_nhanh', 'Cập nhật hoặc thay đổi trạng thái chi nhánh.', TRUE),
    ('members.read', 'Xem thành viên', 'thanh_vien', 'Xem thành viên trong phạm vi được cấp.', FALSE),
    ('members.manage', 'Quản lý thành viên', 'thanh_vien', 'Mời, khóa và phân công thành viên.', TRUE),
    ('roles.read', 'Xem phân quyền', 'phan_quyen', 'Xem vai trò và quyền của đơn vị.', FALSE),
    ('roles.manage', 'Quản lý phân quyền', 'phan_quyen', 'Tạo vai trò, cấp hoặc thu hồi quyền.', TRUE)
ON CONFLICT (ma_quyen) DO NOTHING;