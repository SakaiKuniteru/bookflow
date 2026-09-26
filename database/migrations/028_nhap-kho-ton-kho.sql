CREATE TABLE IF NOT EXISTS bo_dem_phieu_nhap (
    don_vi_id INTEGER NOT NULL,
    nam SMALLINT NOT NULL CHECK (nam BETWEEN 2000 AND 2099),
    so_cuoi INTEGER NOT NULL DEFAULT 0 CHECK (so_cuoi BETWEEN 0 AND 99999),
    PRIMARY KEY (don_vi_id, nam)
);
CREATE TABLE IF NOT EXISTS phieu_nhap_kho (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    kho_id INTEGER NOT NULL,
    nha_cung_cap_id INTEGER,
    so_phieu VARCHAR(9) NOT NULL,
    ngay_nhap DATE NOT NULL DEFAULT CURRENT_DATE,
    loai_nhap VARCHAR(30) NOT NULL DEFAULT 'NHA_CUNG_CAP' CHECK (loai_nhap IN ('NHA_CUNG_CAP','KHAC')),
    trang_thai VARCHAR(20) NOT NULL DEFAULT 'NHAP' CHECK (trang_thai IN ('NHAP','DANG_KIEM_NHAN','DA_XAC_NHAN','DA_HUY')),
    so_chung_tu VARCHAR(100),
    ngay_chung_tu DATE,
    ghi_chu TEXT,
    nguoi_tao_id INTEGER NOT NULL,
    nguoi_cap_nhat_id INTEGER,
    nguoi_xac_nhan_id INTEGER,
    ngay_xac_nhan TIMESTAMPTZ,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_phieu_nhap_so UNIQUE (don_vi_id, so_phieu),
    CONSTRAINT ck_phieu_nhap_so CHECK (so_phieu ~ '^[0-9]{9}$'),
    CONSTRAINT ck_phieu_nhap_ncc CHECK (loai_nhap <> 'NHA_CUNG_CAP' OR nha_cung_cap_id IS NOT NULL),
    CONSTRAINT ck_phieu_nhap_xac_nhan CHECK (trang_thai <> 'DA_XAC_NHAN' OR (nguoi_xac_nhan_id IS NOT NULL AND ngay_xac_nhan IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_kho_don_vi ON phieu_nhap_kho (don_vi_id, kho_id, ngay_tao DESC);
CREATE INDEX IF NOT EXISTS idx_phieu_nhap_ncc ON phieu_nhap_kho (don_vi_id, nha_cung_cap_id, ngay_tao DESC);
CREATE TABLE IF NOT EXISTS chi_tiet_phieu_nhap (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    phieu_nhap_kho_id INTEGER NOT NULL REFERENCES phieu_nhap_kho(id) ON DELETE RESTRICT,
    phien_ban_sach_id INTEGER NOT NULL,
    vi_tri_kho_id INTEGER,
    so_luong_du_kien INTEGER NOT NULL CHECK (so_luong_du_kien > 0),
    so_luong_dat INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_dat >= 0),
    so_luong_loi INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_loi >= 0),
    don_gia_nhap NUMERIC(18,2) NOT NULL DEFAULT 0 CHECK (don_gia_nhap >= 0),
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_chi_tiet_kiem_nhan CHECK (so_luong_dat + so_luong_loi <= so_luong_du_kien)
);
CREATE INDEX IF NOT EXISTS idx_chi_tiet_phieu_nhap ON chi_tiet_phieu_nhap (don_vi_id, phieu_nhap_kho_id);
CREATE TABLE IF NOT EXISTS ton_kho (
    id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    kho_id INTEGER NOT NULL,
    phien_ban_sach_id INTEGER NOT NULL,
    vi_tri_kho_id INTEGER,
    so_luong_thuc_te INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_thuc_te >= 0),
    so_luong_giu_cho INTEGER NOT NULL DEFAULT 0 CHECK (so_luong_giu_cho >= 0),
    ngay_cap_nhat TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_ton_kho_giu_cho CHECK (so_luong_giu_cho <= so_luong_thuc_te)
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_ton_kho_vi_tri ON ton_kho (don_vi_id, kho_id, phien_ban_sach_id, vi_tri_kho_id) NULLS NOT DISTINCT;
CREATE INDEX IF NOT EXISTS idx_ton_kho_phien_ban ON ton_kho (don_vi_id, phien_ban_sach_id, kho_id);
CREATE TABLE IF NOT EXISTS bien_dong_ton_kho (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    don_vi_id INTEGER NOT NULL,
    kho_id INTEGER NOT NULL,
    phien_ban_sach_id INTEGER NOT NULL,
    vi_tri_kho_id INTEGER,
    loai_bien_dong VARCHAR(30) NOT NULL CHECK (loai_bien_dong IN ('NHAP_KHO','XUAT_KHO','DIEU_CHUYEN_VAO','DIEU_CHUYEN_RA','KIEM_KE_TANG','KIEM_KE_GIAM','GIU_CHO','HUY_GIU_CHO')),
    so_luong_thay_doi INTEGER NOT NULL CHECK (so_luong_thay_doi <> 0),
    ton_truoc INTEGER NOT NULL CHECK (ton_truoc >= 0),
    ton_sau INTEGER NOT NULL CHECK (ton_sau >= 0),
    phieu_nhap_kho_id INTEGER REFERENCES phieu_nhap_kho(id) ON DELETE RESTRICT,
    chi_tiet_phieu_nhap_id INTEGER REFERENCES chi_tiet_phieu_nhap(id) ON DELETE RESTRICT,
    ma_tham_chieu VARCHAR(100),
    nguoi_thuc_hien_id INTEGER NOT NULL,
    ghi_chu TEXT,
    ngay_tao TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT ck_bien_dong_can_bang CHECK (ton_sau = ton_truoc + so_luong_thay_doi),
    CONSTRAINT ck_bien_dong_nhap CHECK (loai_bien_dong <> 'NHAP_KHO' OR (phieu_nhap_kho_id IS NOT NULL AND chi_tiet_phieu_nhap_id IS NOT NULL))
);
ALTER TABLE bien_dong_ton_kho
ADD COLUMN IF NOT EXISTS phieu_nhap_kho_id INTEGER
REFERENCES phieu_nhap_kho(id) ON DELETE RESTRICT;

ALTER TABLE bien_dong_ton_kho
ADD COLUMN IF NOT EXISTS chi_tiet_phieu_nhap_id INTEGER
REFERENCES chi_tiet_phieu_nhap(id) ON DELETE RESTRICT;
CREATE UNIQUE INDEX IF NOT EXISTS uq_bien_dong_chi_tiet_nhap ON bien_dong_ton_kho (chi_tiet_phieu_nhap_id) WHERE loai_bien_dong = 'NHAP_KHO';
CREATE INDEX IF NOT EXISTS idx_bien_dong_ton_kho ON bien_dong_ton_kho (don_vi_id, kho_id, phien_ban_sach_id, ngay_tao DESC);