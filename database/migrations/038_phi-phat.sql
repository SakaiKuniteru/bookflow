BEGIN;

CREATE TABLE IF NOT EXISTS loai_phi_phat (
    id SERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    ma_loai VARCHAR(50) NOT NULL,
    ten_loai VARCHAR(255) NOT NULL,
    loai VARCHAR(30) NOT NULL,
    cach_tinh VARCHAR(30) NOT NULL,
    muc_tien NUMERIC(18,3) NOT NULL DEFAULT 0,
    ty_le_phan_tram NUMERIC(9,3),
    cho_phep_mien_giam BOOLEAN NOT NULL DEFAULT TRUE,
    cho_phep_mien_phi BOOLEAN NOT NULL DEFAULT TRUE,
    hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_loai_phi_phat_loai
        CHECK (loai IN ('QUA_HAN','MAT_SACH','HU_HONG','KHAC')),

    CONSTRAINT ck_loai_phi_phat_cach_tinh
        CHECK (cach_tinh IN ('CO_DINH','THEO_NGAY','THEO_TY_LE','THEO_GIA_TRI')),

    CONSTRAINT ck_loai_phi_phat_muc_tien
        CHECK (muc_tien >= 0),

    CONSTRAINT ck_loai_phi_phat_ty_le
        CHECK (
            ty_le_phan_tram IS NULL
            OR (
                ty_le_phan_tram >= 0
                AND ty_le_phan_tram <= 100
            )
        ),

    CONSTRAINT fk_loai_phi_phat_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_loai_phi_phat_ma
    ON loai_phi_phat (don_vi_id, ma_loai);


-- =========================================================
-- 1. CHUYỂN PHIÊN BẢN PHI_PHAT CŨ TỪ MIGRATION 033
-- =========================================================

DO $$
BEGIN
    /*
     * Migration 033 đã tạo phi_phat với schema cũ.
     *
     * Nếu bảng phi_phat cũ tồn tại thì đổi tên thành
     * phi_phat_legacy để không mất dữ liệu.
     *
     * Sau đó migration 038 tạo phi_phat theo schema mới.
     */

    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'phi_phat'
    )
    AND NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'phi_phat_legacy'
    ) THEN

        ALTER TABLE phi_phat
            RENAME TO phi_phat_legacy;

    END IF;
END $$;


-- =========================================================
-- 2. TẠO PHI_PHAT THEO SCHEMA MỚI
-- =========================================================

CREATE TABLE IF NOT EXISTS phi_phat (
    id BIGSERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,

    muon_tra_id BIGINT NOT NULL,
    chi_tiet_muon_tra_id BIGINT NOT NULL,

    loai_phi_phat_id INTEGER,

    loai VARCHAR(30) NOT NULL,
    ma_phieu VARCHAR(50) NOT NULL,

    so_ngay_qua_han INTEGER NOT NULL DEFAULT 0,
    so_luong INTEGER NOT NULL DEFAULT 1,

    don_gia NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_goc NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_giam NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_mien_phi NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_phai_thu NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_da_thu NUMERIC(18,3) NOT NULL DEFAULT 0,
    tien_con_lai NUMERIC(18,3) NOT NULL DEFAULT 0,

    tien_te CHAR(3) NOT NULL DEFAULT 'VND',

    ly_do VARCHAR(2000),
    ghi_chu VARCHAR(5000),

    trang_thai VARCHAR(30) NOT NULL DEFAULT 'CHO_THU',

    nguoi_tao_id INTEGER,
    nguoi_duyet_id INTEGER,

    ngay_phat_sinh TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_duyet TIMESTAMPTZ,
    ngay_hoan_tat TIMESTAMPTZ,
    ngay_huy TIMESTAMPTZ,

    ly_do_huy VARCHAR(2000),

    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_phi_phat_loai
        CHECK (
            loai IN (
                'QUA_HAN',
                'MAT_SACH',
                'HU_HONG',
                'KHAC'
            )
        ),

    CONSTRAINT ck_phi_phat_so_ngay
        CHECK (so_ngay_qua_han >= 0),

    CONSTRAINT ck_phi_phat_so_luong
        CHECK (so_luong > 0),

    CONSTRAINT ck_phi_phat_tien
        CHECK (
            don_gia >= 0
            AND tien_goc >= 0
            AND tien_giam >= 0
            AND tien_mien_phi >= 0
            AND tien_phai_thu >= 0
            AND tien_da_thu >= 0
            AND tien_con_lai >= 0
        ),

    CONSTRAINT ck_phi_phat_trang_thai
        CHECK (
            trang_thai IN (
                'CHO_DUYET',
                'CHO_THU',
                'THU_MOT_PHAN',
                'DA_THU',
                'MIEN_PHI',
                'HUY'
            )
        ),

    CONSTRAINT fk_phi_phat_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id),

    CONSTRAINT fk_phi_phat_muon_tra
        FOREIGN KEY (don_vi_id, muon_tra_id)
        REFERENCES muon_tra(don_vi_id, id),

    CONSTRAINT fk_phi_phat_chi_tiet
        FOREIGN KEY (don_vi_id, chi_tiet_muon_tra_id)
        REFERENCES chi_tiet_muon_tra(don_vi_id, id),

    CONSTRAINT fk_phi_phat_loai
        FOREIGN KEY (loai_phi_phat_id)
        REFERENCES loai_phi_phat(id),

    CONSTRAINT fk_phi_phat_nguoi_tao
        FOREIGN KEY (nguoi_tao_id)
        REFERENCES tai_khoan(id),

    CONSTRAINT fk_phi_phat_nguoi_duyet
        FOREIGN KEY (nguoi_duyet_id)
        REFERENCES tai_khoan(id)
);


-- =========================================================
-- 3. INDEX PHI_PHAT
-- =========================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_phi_phat_ma
    ON phi_phat (don_vi_id, ma_phieu);

CREATE INDEX IF NOT EXISTS idx_phi_phat_muon_tra
    ON phi_phat (don_vi_id, muon_tra_id);

CREATE INDEX IF NOT EXISTS idx_phi_phat_chi_tiet
    ON phi_phat (don_vi_id, chi_tiet_muon_tra_id);

CREATE INDEX IF NOT EXISTS idx_phi_phat_loai
    ON phi_phat (don_vi_id, loai_phi_phat_id);

CREATE INDEX IF NOT EXISTS idx_phi_phat_trang_thai
    ON phi_phat (don_vi_id, trang_thai);

CREATE INDEX IF NOT EXISTS idx_phi_phat_ngay_phat_sinh
    ON phi_phat (don_vi_id, ngay_phat_sinh DESC);


-- =========================================================
-- 4. GIAO DỊCH PHÍ PHẠT
-- =========================================================

CREATE TABLE IF NOT EXISTS giao_dich_phi_phat (
    id BIGSERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    phi_phat_id BIGINT NOT NULL,
    giao_dich_thanh_toan_id BIGINT NOT NULL,

    so_tien NUMERIC(18,3) NOT NULL,

    loai VARCHAR(20) NOT NULL DEFAULT 'THU',

    ghi_chu VARCHAR(2000),

    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_giao_dich_phi_phat_so_tien
        CHECK (so_tien > 0),

    CONSTRAINT ck_giao_dich_phi_phat_loai
        CHECK (loai IN ('THU','HOAN')),

    CONSTRAINT fk_giao_dich_phi_phat_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id),

    CONSTRAINT fk_giao_dich_phi_phat_phi
        FOREIGN KEY (phi_phat_id)
        REFERENCES phi_phat(id),

    CONSTRAINT fk_giao_dich_phi_phat_giao_dich
        FOREIGN KEY (giao_dich_thanh_toan_id)
        REFERENCES giao_dich_thanh_toan(id)
);

CREATE INDEX IF NOT EXISTS idx_giao_dich_phi_phat_phi
    ON giao_dich_phi_phat (don_vi_id, phi_phat_id);


-- =========================================================
-- 5. MIỄN GIẢM PHÍ PHẠT
-- =========================================================

CREATE TABLE IF NOT EXISTS mien_giam_phi_phat (
    id BIGSERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    phi_phat_id BIGINT NOT NULL,

    so_tien_mien_giam NUMERIC(18,3) NOT NULL DEFAULT 0,

    ly_do VARCHAR(2000) NOT NULL,

    nguoi_thuc_hien_id INTEGER,

    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_mien_giam_phi_phat_so_tien
        CHECK (so_tien_mien_giam > 0),

    CONSTRAINT fk_mien_giam_phi_phat_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id),

    CONSTRAINT fk_mien_giam_phi_phat_phi
        FOREIGN KEY (phi_phat_id)
        REFERENCES phi_phat(id),

    CONSTRAINT fk_mien_giam_phi_phat_nguoi
        FOREIGN KEY (nguoi_thuc_hien_id)
        REFERENCES tai_khoan(id)
);

CREATE INDEX IF NOT EXISTS idx_mien_giam_phi_phat_phi
    ON mien_giam_phi_phat (don_vi_id, phi_phat_id);


-- =========================================================
-- 6. TRIGGER CẬP NHẬT NGÀY CẬP NHẬT
-- =========================================================

DROP TRIGGER IF EXISTS trg_loai_phi_phat_ngay_cap_nhat
    ON loai_phi_phat;

CREATE TRIGGER trg_loai_phi_phat_ngay_cap_nhat
BEFORE UPDATE ON loai_phi_phat
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_ngay_cap_nhat_gia_han();


DROP TRIGGER IF EXISTS trg_phi_phat_ngay_cap_nhat
    ON phi_phat;

CREATE TRIGGER trg_phi_phat_ngay_cap_nhat
BEFORE UPDATE ON phi_phat
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_ngay_cap_nhat_gia_han();


COMMIT;