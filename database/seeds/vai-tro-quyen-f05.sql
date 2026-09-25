WITH quyen_moi AS (
    INSERT INTO vai_tro_quyen (
        don_vi_id, vai_tro_id, quyen_id, pham_vi
    )
    SELECT vt.don_vi_id, vt.id, q.id, 'DON_VI'
    FROM vai_tro vt
    JOIN quyen q ON q.ma_quyen IN (
        'tenants.read', 'tenants.update',
        'branches.read', 'branches.create', 'branches.update',
        'members.read', 'members.manage',
        'roles.read', 'roles.manage'
    )
    WHERE vt.ma_vai_tro = 'QUAN_TRI'
      AND vt.la_vai_tro_he_thong = TRUE
    ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi)
    DO NOTHING
    RETURNING id, don_vi_id
)
INSERT INTO nhat_ky_he_thong (
    don_vi_id, hanh_dong, doi_tuong_loai, doi_tuong_id,
    ket_qua, ly_do, nguon
)
SELECT don_vi_id, 'permission.grant', 'vai_tro_quyen', id,
       'THANH_CONG', 'Cap quyen quan tri mac dinh F05', 'WORKER'
FROM quyen_moi;