-- 007: Bang audit dung chung, theo tu dien du lieu BookFlow.

CREATE TABLE nhat_ky_he_thong (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    don_vi_id UUID NOT NULL REFERENCES don_vi(id),
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    tai_khoan_id UUID REFERENCES tai_khoan(id),
    thanh_vien_don_vi_id UUID,
    chi_nhanh_id UUID,
    hanh_dong VARCHAR(120) NOT NULL,
    doi_tuong_loai VARCHAR(80) NOT NULL,
    doi_tuong_id UUID,
    ket_qua VARCHAR(24) NOT NULL,
    du_lieu_truoc_da_loc JSONB,
    du_lieu_sau_da_loc JSONB,
    ly_do TEXT,
    dia_chi_ip INET,
    request_id VARCHAR(100),
    trace_id VARCHAR(100),
    nguon VARCHAR(24) NOT NULL,

    CONSTRAINT fk_nkht_thanh_vien
        FOREIGN KEY (don_vi_id, thanh_vien_don_vi_id)
        REFERENCES thanh_vien_don_vi (don_vi_id, id),

    CONSTRAINT fk_nkht_chi_nhanh
        FOREIGN KEY (don_vi_id, chi_nhanh_id)
        REFERENCES chi_nhanh (don_vi_id, id),

    CONSTRAINT ck_nkht_ket_qua
        CHECK (ket_qua IN ('THANH_CONG', 'THAT_BAI', 'TU_CHOI')),

    CONSTRAINT ck_nkht_nguon
        CHECK (nguon IN ('WEB', 'API', 'WORKER', 'TICH_HOP'))
);

CREATE INDEX idx_nkht_don_vi_thoi_gian
ON nhat_ky_he_thong (don_vi_id, ngay_tao DESC, hanh_dong);

CREATE INDEX idx_nkht_doi_tuong
ON nhat_ky_he_thong (don_vi_id, doi_tuong_loai, doi_tuong_id, ngay_tao DESC);

CREATE INDEX idx_nkht_request_id
ON nhat_ky_he_thong (request_id)
WHERE request_id IS NOT NULL;

-- Ung dung chi duoc them audit, khong sua/xoa audit da ghi.
CREATE FUNCTION public.chan_sua_nhat_ky_he_thong()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Nhat ky he thong chi duoc them, khong duoc sua hoac xoa';
END;
$$;

CREATE TRIGGER trg_nkht_chi_them
BEFORE UPDATE OR DELETE ON nhat_ky_he_thong
FOR EACH ROW
EXECUTE FUNCTION public.chan_sua_nhat_ky_he_thong();