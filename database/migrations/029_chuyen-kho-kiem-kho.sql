CREATE TABLE IF NOT EXISTS phieu_chuyen_kho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    kho_nguon_id INTEGER NOT NULL,
    kho_dich_id INTEGER NOT NULL,
    ma_phieu VARCHAR(40) NOT NULL,
    trang_thai VARCHAR(24) NOT NULL DEFAULT 'NHAP' CHECK (trang_thai IN ('NHAP','DA_XUAT','DA_NHAN','DA_HUY')),
    ly_do TEXT,
    ghi_chu TEXT,
    nguoi_tao_id INTEGER NOT NULL,
    nguoi_xuat_id INTEGER,
    nguoi_nhan_id INTEGER,
    ngay_xuat TIMESTAMPTZ,
    ngay_nhan TIMESTAMPTZ,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_phieu_chuyen_kho_ma UNIQUE (don_vi_id,ma_phieu),
    CONSTRAINT ck_phieu_chuyen_kho_khac_kho CHECK (kho_nguon_id <> kho_dich_id)
);
CREATE INDEX IF NOT EXISTS idx_phieu_chuyen_kho_nguon ON phieu_chuyen_kho (don_vi_id,kho_nguon_id,ngay_tao DESC);
CREATE INDEX IF NOT EXISTS idx_phieu_chuyen_kho_dich ON phieu_chuyen_kho (don_vi_id,kho_dich_id,ngay_tao DESC);
CREATE TABLE IF NOT EXISTS chi_tiet_chuyen_kho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    phieu_chuyen_kho_id BIGINT NOT NULL REFERENCES phieu_chuyen_kho(id) ON DELETE RESTRICT,
    phien_ban_sach_id INTEGER NOT NULL,
    vi_tri_nguon_id INTEGER,
    vi_tri_dich_id INTEGER,
    so_luong INTEGER NOT NULL CHECK (so_luong > 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_chuyen_kho_phieu ON chi_tiet_chuyen_kho (don_vi_id,phieu_chuyen_kho_id);
CREATE TABLE IF NOT EXISTS phieu_kiem_kho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    kho_id INTEGER NOT NULL,
    ma_phieu VARCHAR(40) NOT NULL,
    trang_thai VARCHAR(24) NOT NULL DEFAULT 'NHAP' CHECK (trang_thai IN ('NHAP','DANG_KIEM','CHO_DUYET','DA_DUYET','DA_HUY')),
    ly_do TEXT,
    ghi_chu TEXT,
    nguoi_tao_id INTEGER NOT NULL,
    nguoi_duyet_id INTEGER,
    ngay_bat_dau TIMESTAMPTZ,
    ngay_duyet TIMESTAMPTZ,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_phieu_kiem_kho_ma UNIQUE (don_vi_id,ma_phieu)
);
CREATE INDEX IF NOT EXISTS idx_phieu_kiem_kho ON phieu_kiem_kho (don_vi_id,kho_id,ngay_tao DESC);
CREATE TABLE IF NOT EXISTS chi_tiet_kiem_kho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    phieu_kiem_kho_id BIGINT NOT NULL REFERENCES phieu_kiem_kho(id) ON DELETE RESTRICT,
    phien_ban_sach_id INTEGER NOT NULL,
    vi_tri_kho_id INTEGER,
    so_luong_so_sach INTEGER NOT NULL CHECK (so_luong_so_sach >= 0),
    so_luong_thuc_dem INTEGER CHECK (so_luong_thuc_dem >= 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_chi_tiet_kiem_kho ON chi_tiet_kiem_kho (don_vi_id,phieu_kiem_kho_id,phien_ban_sach_id,vi_tri_kho_id) NULLS NOT DISTINCT;