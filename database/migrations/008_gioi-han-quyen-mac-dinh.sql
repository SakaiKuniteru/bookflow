-- 008: Thu hep cac quyen nghiep vu mac dinh ve CHI_NHANH.
-- Ghi audit truoc khi xoa ban cap quyen pham vi rong.

DO $$
DECLARE
    ban_ghi RECORD;
BEGIN
    FOR ban_ghi IN
        SELECT vtq.id, vtq.don_vi_id, vtq.vai_tro_id, vtq.quyen_id,
               vt.ma_vai_tro, q.ma_quyen
        FROM vai_tro_quyen vtq
        JOIN vai_tro vt
            ON vt.id = vtq.vai_tro_id
           AND vt.don_vi_id = vtq.don_vi_id
        JOIN quyen q ON q.id = vtq.quyen_id
        WHERE vt.la_vai_tro_he_thong = TRUE
          AND vtq.pham_vi = 'DON_VI'
          AND (
              (vt.ma_vai_tro = 'NHAN_VIEN' AND q.ma_quyen = 'books.read')
              OR
              (vt.ma_vai_tro = 'THU_THU'
               AND q.ma_quyen IN ('books.read', 'loans.return'))
          )
    LOOP
        INSERT INTO vai_tro_quyen (
            don_vi_id, vai_tro_id, quyen_id, pham_vi
        )
        VALUES (
            ban_ghi.don_vi_id, ban_ghi.vai_tro_id,
            ban_ghi.quyen_id, 'CHI_NHANH'
        )
        ON CONFLICT (don_vi_id, vai_tro_id, quyen_id, pham_vi)
        DO NOTHING;

        INSERT INTO nhat_ky_he_thong (
            don_vi_id, hanh_dong, doi_tuong_loai, doi_tuong_id,
            ket_qua, du_lieu_truoc_da_loc, du_lieu_sau_da_loc,
            ly_do, nguon
        )
        VALUES (
            ban_ghi.don_vi_id,
            'permission.scope.narrow',
            'vai_tro_quyen',
            ban_ghi.id,
            'THANH_CONG',
            jsonb_build_object(
                'vai_tro', ban_ghi.ma_vai_tro,
                'ma_quyen', ban_ghi.ma_quyen,
                'pham_vi', 'DON_VI'
            ),
            jsonb_build_object(
                'vai_tro', ban_ghi.ma_vai_tro,
                'ma_quyen', ban_ghi.ma_quyen,
                'pham_vi', 'CHI_NHANH'
            ),
            'Chuan hoa pham vi vai tro he thong tai F05',
            'WORKER'
        );

        DELETE FROM vai_tro_quyen WHERE id = ban_ghi.id;
    END LOOP;
END;
$$;