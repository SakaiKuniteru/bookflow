-- Luu phien ban xac thuc tai thoi diem tao phien.
-- Khong dat DEFAULT 1 cho phien moi: service phai lay tu tai_khoan.

ALTER TABLE phien_dang_nhap
ADD COLUMN phien_ban_xac_thuc INTEGER;

UPDATE phien_dang_nhap AS p
SET phien_ban_xac_thuc = t.phien_ban_xac_thuc
FROM tai_khoan AS t
WHERE p.tai_khoan_id = t.id;

ALTER TABLE phien_dang_nhap
ALTER COLUMN phien_ban_xac_thuc SET NOT NULL;

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT ck_phien_ban_xac_thuc
CHECK (phien_ban_xac_thuc >= 1);


-- Ngữ cảnh đã được backend xác minh.
-- FK chỉ kiểm tra cấu trúc dữ liệu; quyền thành viên
-- vẫn phải được kiểm tra trong service của F05.

ALTER TABLE phien_dang_nhap
ADD COLUMN don_vi_dang_chon_id UUID,
ADD COLUMN chi_nhanh_dang_chon_id UUID;

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT fk_phien_don_vi_dang_chon
FOREIGN KEY (don_vi_dang_chon_id)
REFERENCES don_vi(id);

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT ck_phien_chi_nhanh_can_don_vi
CHECK (
    chi_nhanh_dang_chon_id IS NULL
    OR don_vi_dang_chon_id IS NOT NULL
);

ALTER TABLE phien_dang_nhap
ADD CONSTRAINT fk_phien_chi_nhanh_dang_chon
FOREIGN KEY (
    don_vi_dang_chon_id,
    chi_nhanh_dang_chon_id
)
REFERENCES chi_nhanh (
    don_vi_id,
    id
);


-- Các trạng thái đã có trong từ điển dữ liệu.

ALTER TABLE tai_khoan
ADD CONSTRAINT ck_tai_khoan_trang_thai
CHECK (
    trang_thai IN (
        'CHO_XAC_MINH', 'DANG_DUNG',
        'TAM_KHOA', 'DA_DONG'
    )
);

ALTER TABLE thanh_vien_don_vi
ADD CONSTRAINT ck_thanh_vien_don_vi_trang_thai
CHECK (
    trang_thai IN (
        'CHO_MOI', 'DANG_LAM',
        'TAM_KHOA', 'DA_ROI'
    )
);

ALTER TABLE thanh_vien_chi_nhanh
ADD CONSTRAINT ck_thanh_vien_chi_nhanh_trang_thai
CHECK (
    trang_thai IN (
        'HIEU_LUC', 'KET_THUC', 'TAM_DUNG'
    )
);

ALTER TABLE vai_tro_quyen
ADD CONSTRAINT ck_vai_tro_quyen_pham_vi
CHECK (
    pham_vi IN ('DON_VI', 'CHI_NHANH', 'CA_NHAN')
);