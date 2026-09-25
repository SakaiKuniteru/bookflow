CREATE TABLE don_vi (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    ma_don_vi VARCHAR(40) NOT NULL UNIQUE,
    ten_hien_thi VARCHAR(200) NOT NULL,

    ten_phap_ly VARCHAR(255),
    ma_so_thue VARCHAR(30),
    email_lien_he VARCHAR(254) NOT NULL,
    so_dien_thoai VARCHAR(30),
    website TEXT,

    -- FK sang tep_dinh_kem duoc tao o migration file.
    logo_tep_id UUID,

    mui_gio VARCHAR(64)
        NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',

    don_vi_tien_te CHAR(3)
        NOT NULL DEFAULT 'VND',

    ngon_ngu VARCHAR(10)
        NOT NULL DEFAULT 'vi',

    trang_thai VARCHAR(24)
        NOT NULL DEFAULT 'DANG_DUNG',

    ngay_kich_hoat TIMESTAMPTZ,
    ngay_tam_khoa TIMESTAMPTZ,
    ly_do_tam_khoa TEXT,

    CONSTRAINT ck_don_vi_trang_thai
        CHECK (
            trang_thai IN (
                'DANG_DUNG',
                'TAM_KHOA',
                'NGUNG_DICH_VU'
            )
        )
);

CREATE INDEX idx_don_vi_trang_thai
ON don_vi (trang_thai);

CREATE TRIGGER trg_don_vi_ngay_cap_nhat
BEFORE UPDATE ON don_vi
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_ngay_cap_nhat();


CREATE TABLE chi_nhanh (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    don_vi_id UUID NOT NULL
        REFERENCES don_vi(id),

    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- FK sang tai_khoan duoc bo sung o migration 003.
    nguoi_tao_id UUID,
    nguoi_cap_nhat_id UUID,

    ma_chi_nhanh VARCHAR(40) NOT NULL,
    ten_chi_nhanh VARCHAR(200) NOT NULL,

    loai_chi_nhanh VARCHAR(24)
        NOT NULL DEFAULT 'KET_HOP',

    dia_chi_chi_tiet VARCHAR(300),
    ma_tinh_thanh VARCHAR(20),
    ten_tinh_thanh VARCHAR(100),
    ma_phuong_xa VARCHAR(20),
    ten_phuong_xa VARCHAR(100),

    quoc_gia CHAR(2) NOT NULL DEFAULT 'VN',

    vi_do NUMERIC(10,7),
    kinh_do NUMERIC(10,7),

    so_dien_thoai VARCHAR(30),
    email VARCHAR(254),

    -- FK sang thanh_vien_don_vi tao o migration 003.
    quan_ly_thanh_vien_id UUID,

    cho_nhan_tai_quay BOOLEAN
        NOT NULL DEFAULT TRUE,

    cho_ban_truc_tuyen BOOLEAN
        NOT NULL DEFAULT TRUE,

    trang_thai VARCHAR(24)
        NOT NULL DEFAULT 'DANG_DUNG',

    CONSTRAINT uq_chi_nhanh_ma
        UNIQUE (don_vi_id, ma_chi_nhanh),

    CONSTRAINT uq_chi_nhanh_don_vi_id
        UNIQUE (don_vi_id, id),

    CONSTRAINT ck_chi_nhanh_loai
        CHECK (
            loai_chi_nhanh IN (
                'NHA_SACH',
                'THU_VIEN',
                'KET_HOP'
            )
        ),

    CONSTRAINT ck_chi_nhanh_vi_do
        CHECK (
            vi_do IS NULL
            OR vi_do BETWEEN -90 AND 90
        ),

    CONSTRAINT ck_chi_nhanh_kinh_do
        CHECK (
            kinh_do IS NULL
            OR kinh_do BETWEEN -180 AND 180
        )
);

CREATE INDEX idx_chi_nhanh_don_vi_trang_thai
ON chi_nhanh (don_vi_id, trang_thai);

CREATE TRIGGER trg_chi_nhanh_ngay_cap_nhat
BEFORE UPDATE ON chi_nhanh
FOR EACH ROW
EXECUTE FUNCTION public.cap_nhat_ngay_cap_nhat();