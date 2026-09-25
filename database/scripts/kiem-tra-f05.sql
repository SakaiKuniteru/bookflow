DO $$
DECLARE
    thieu_bang TEXT;
    thieu_rang_buoc TEXT;
BEGIN
    SELECT string_agg(ten_bang, ', ' ORDER BY ten_bang)
    INTO thieu_bang
    FROM unnest(ARRAY[
        'don_vi', 'chi_nhanh', 'tai_khoan', 'phien_dang_nhap',
        'ma_xac_minh', 'thanh_vien_don_vi', 'thanh_vien_chi_nhanh',
        'vai_tro', 'quyen', 'vai_tro_quyen', 'thanh_vien_vai_tro',
        'nhat_ky_dang_nhap', 'lich_su_migration'
    ]) AS bang(ten_bang)
    WHERE to_regclass('public.' || ten_bang) IS NULL;

    IF thieu_bang IS NOT NULL THEN
        RAISE EXCEPTION 'Thieu bang: %', thieu_bang;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'vector') THEN
        RAISE EXCEPTION 'Chua cai extension vector';
    END IF;

    IF (
        SELECT COUNT(*)
        FROM lich_su_migration
        WHERE ten_file IN (
            '001_extensions.sql',
            '002_nen-tang.sql',
            '003_tai-khoan-phan-quyen.sql'
        )
    ) <> 3 THEN
        RAISE EXCEPTION 'Lich su migration F03 chua day du';
    END IF;

    SELECT string_agg(ten, ', ' ORDER BY ten)
    INTO thieu_rang_buoc
    FROM unnest(ARRAY[
        'fk_tvcn_thanh_vien',
        'fk_tvcn_chi_nhanh',
        'fk_vai_tro_quyen_vai_tro',
        'fk_tvvt_thanh_vien',
        'fk_tvvt_vai_tro',
        'fk_tvvt_chi_nhanh'
    ]) AS rang_buoc(ten)
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = ten
          AND connamespace = 'public'::regnamespace
    );

    IF thieu_rang_buoc IS NOT NULL THEN
        RAISE EXCEPTION 'Thieu FK pham vi: %', thieu_rang_buoc;
    END IF;
END;
$$;

SELECT 'F05.1: bang, extension va FK F03 hop le' AS ket_qua;

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'phien_dang_nhap'
ORDER BY ordinal_position;