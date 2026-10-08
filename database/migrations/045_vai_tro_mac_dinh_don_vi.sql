INSERT INTO vai_tro (don_vi_id, ma_vai_tro, ten_vai_tro, mo_ta, la_vai_tro_he_thong, trang_thai)
SELECT dv.id, mau.ma_vai_tro, mau.ten_vai_tro, mau.mo_ta, TRUE, 'DANG_DUNG'
FROM don_vi dv
CROSS JOIN (
    VALUES
        ('QUAN_TRI', 'Quản trị đơn vị', 'Quản trị hoạt động và phân quyền nội bộ'),
        ('NHAN_VIEN', 'Nhân viên', 'Nhân viên nghiệp vụ'),
        ('THU_THU', 'Thủ thư', 'Nhân viên xử lý nghiệp vụ thư viện')
) AS mau(ma_vai_tro, ten_vai_tro, mo_ta)
ON CONFLICT (don_vi_id, ma_vai_tro) DO UPDATE
SET ten_vai_tro = EXCLUDED.ten_vai_tro,
    mo_ta = EXCLUDED.mo_ta,
    la_vai_tro_he_thong = TRUE,
    trang_thai = 'DANG_DUNG',
    ngay_cap_nhat = now();

WITH quyenMacDinh(maVaiTro, maQuyen, phamVi) AS (
    VALUES
        ('QUAN_TRI', 'members.manage', 'DON_VI'),
        ('QUAN_TRI', 'roles.manage', 'DON_VI'),
        ('QUAN_TRI', 'units.manage', 'DON_VI'),
        ('QUAN_TRI', 'branches.manage', 'DON_VI'),
        ('QUAN_TRI', 'books.read', 'DON_VI'),
        ('QUAN_TRI', 'books.create', 'DON_VI'),
        ('QUAN_TRI', 'loans.return', 'DON_VI'),
        ('QUAN_TRI', 'payments.refund', 'DON_VI'),
        ('NHAN_VIEN', 'books.read', 'CHI_NHANH'),
        ('THU_THU', 'books.read', 'CHI_NHANH'),
        ('THU_THU', 'loans.return', 'CHI_NHANH')
)
INSERT INTO vai_tro_quyen (don_vi_id, vai_tro_id, quyen_id, pham_vi)
SELECT vt.don_vi_id, vt.id, q.id, qm.phamVi
FROM quyenMacDinh qm
JOIN vai_tro vt ON vt.ma_vai_tro = qm.maVaiTro
JOIN quyen q ON q.ma_quyen = qm.maQuyen AND q.trang_thai = 'DANG_DUNG'
WHERE vt.la_vai_tro_he_thong = TRUE AND vt.trang_thai = 'DANG_DUNG'
ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi) DO NOTHING;