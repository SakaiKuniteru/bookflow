BEGIN;

CREATE TABLE IF NOT EXISTS gia_han_muon_tra (
    id BIGSERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    muon_tra_id BIGINT NOT NULL,
    chi_tiet_muon_tra_id BIGINT NOT NULL,
    lan_gia_han INTEGER NOT NULL DEFAULT 1,
    ngay_han_cu TIMESTAMPTZ NOT NULL,
    ngay_han_moi TIMESTAMPTZ NOT NULL,
    so_ngay_gia_han INTEGER NOT NULL,
    ly_do VARCHAR(2000),
    trang_thai VARCHAR(30) NOT NULL DEFAULT 'DA_DUYET',
    nguoi_yeu_cau_id INTEGER,
    nguoi_duyet_id INTEGER,
    ngay_yeu_cau TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_duyet TIMESTAMPTZ,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_gia_han_so_ngay
        CHECK (so_ngay_gia_han > 0),

    CONSTRAINT ck_gia_han_lan
        CHECK (lan_gia_han > 0),

    CONSTRAINT ck_gia_han_ngay
        CHECK (ngay_han_moi > ngay_han_cu),

    CONSTRAINT ck_gia_han_trang_thai
        CHECK (trang_thai IN ('CHO_DUYET','DA_DUYET','TU_CHOI','DA_HUY')),

    CONSTRAINT fk_gia_han_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id),

    CONSTRAINT fk_gia_han_muon_tra
        FOREIGN KEY (muon_tra_id)
        REFERENCES muon_tra(id),

    CONSTRAINT fk_gia_han_chi_tiet
        FOREIGN KEY (chi_tiet_muon_tra_id)
        REFERENCES chi_tiet_muon_tra(id),

    CONSTRAINT fk_gia_han_nguoi_yeu_cau
        FOREIGN KEY (nguoi_yeu_cau_id)
        REFERENCES tai_khoan(id),

    CONSTRAINT fk_gia_han_nguoi_duyet
        FOREIGN KEY (nguoi_duyet_id)
        REFERENCES tai_khoan(id)
);

CREATE INDEX IF NOT EXISTS idx_gia_han_don_vi_muon_tra
    ON gia_han_muon_tra (don_vi_id, muon_tra_id);

CREATE INDEX IF NOT EXISTS idx_gia_han_don_vi_chi_tiet
    ON gia_han_muon_tra (don_vi_id, chi_tiet_muon_tra_id);

CREATE INDEX IF NOT EXISTS idx_gia_han_trang_thai
    ON gia_han_muon_tra (don_vi_id, trang_thai);

CREATE INDEX IF NOT EXISTS idx_gia_han_ngay_tao
    ON gia_han_muon_tra (don_vi_id, ngay_tao DESC);

CREATE UNIQUE INDEX IF NOT EXISTS uq_gia_han_lan
    ON gia_han_muon_tra (
        don_vi_id,
        chi_tiet_muon_tra_id,
        lan_gia_han
    );

CREATE TABLE IF NOT EXISTS cau_hinh_gia_han (
    id BIGSERIAL PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    hinh_thuc VARCHAR(20) NOT NULL,
    so_lan_toi_da INTEGER NOT NULL DEFAULT 0,
    so_ngay_toi_da_moi_lan INTEGER NOT NULL DEFAULT 0,
    cho_gia_han_khi_qua_han BOOLEAN NOT NULL DEFAULT FALSE,
    cho_gia_han_khi_co_phi_phat BOOLEAN NOT NULL DEFAULT FALSE,
    cho_gia_han_khi_co_dat_truoc BOOLEAN NOT NULL DEFAULT FALSE,
    yeu_cau_duyet BOOLEAN NOT NULL DEFAULT TRUE,
    hoat_dong BOOLEAN NOT NULL DEFAULT TRUE,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT ck_cau_hinh_gia_han_hinh_thuc
        CHECK (hinh_thuc IN ('MUON','THUE')),

    CONSTRAINT ck_cau_hinh_gia_han_lan
        CHECK (so_lan_toi_da >= 0),

    CONSTRAINT ck_cau_hinh_gia_han_ngay
        CHECK (so_ngay_toi_da_moi_lan >= 0),

    CONSTRAINT fk_cau_hinh_gia_han_don_vi
        FOREIGN KEY (don_vi_id)
        REFERENCES don_vi(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_cau_hinh_gia_han
    ON cau_hinh_gia_han (don_vi_id, hinh_thuc);

CREATE OR REPLACE FUNCTION cap_nhat_ngay_cap_nhat_gia_han()
RETURNS TRIGGER AS $$
BEGIN
    NEW.ngay_cap_nhat = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_gia_han_ngay_cap_nhat
    ON gia_han_muon_tra;

CREATE TRIGGER trg_gia_han_ngay_cap_nhat
BEFORE UPDATE ON gia_han_muon_tra
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_ngay_cap_nhat_gia_han();

DROP TRIGGER IF EXISTS trg_cau_hinh_gia_han_ngay_cap_nhat
    ON cau_hinh_gia_han;

CREATE TRIGGER trg_cau_hinh_gia_han_ngay_cap_nhat
BEFORE UPDATE ON cau_hinh_gia_han
FOR EACH ROW
EXECUTE FUNCTION cap_nhat_ngay_cap_nhat_gia_han();

COMMIT;