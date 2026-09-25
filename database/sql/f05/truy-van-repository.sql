-- ==========================================================
-- TAI KHOAN: taoTaiKhoan
-- $1: email da chuan hoa; $2: hash Argon2id; $3: ho ten.
-- ==========================================================

INSERT INTO tai_khoan (email, mat_khau_bam, ho_ten)
VALUES (lower(btrim($1::text)), $2, $3)
RETURNING id, email, ho_ten, trang_thai, email_da_xac_minh;

-- ==========================================================
-- XAC THUC: tim tai khoan de kiem tra mat khau tai backend.
-- Khong tra mat_khau_bam ve frontend.
-- ==========================================================

SELECT id, email, mat_khau_bam, trang_thai,
       email_da_xac_minh, so_lan_dang_nhap_sai,
       khoa_den, phien_ban_xac_thuc
FROM tai_khoan
WHERE lower(email) = lower(btrim($1::text));

-- Dang nhap sai: cap nhat bo dem trong transaction.
-- Backend con phai gioi han theo IP/ngu canh tai Redis.

UPDATE tai_khoan
SET so_lan_dang_nhap_sai = so_lan_dang_nhap_sai + 1,
    khoa_den = CASE
        WHEN so_lan_dang_nhap_sai + 1 >= 5
        THEN now() + interval '15 minutes'
        ELSE khoa_den
    END
WHERE id = $1
RETURNING so_lan_dang_nhap_sai, khoa_den;

-- Sau khi het thoi gian khoa, service co the mo khoa va dat lai bo dem.
UPDATE tai_khoan
SET so_lan_dang_nhap_sai = 0, khoa_den = NULL
WHERE id = $1 AND khoa_den IS NOT NULL AND khoa_den <= now()
RETURNING id;

-- Dang nhap thanh cong.
UPDATE tai_khoan
SET so_lan_dang_nhap_sai = 0, khoa_den = NULL,
    ngay_dang_nhap_cuoi = now()
WHERE id = $1
RETURNING id, phien_ban_xac_thuc;

-- ==========================================================
-- XAC THUC: tao phien; $2 la SHA-256 cua token ngau nhien
-- co entropy cao, khong phai token ro.
-- ==========================================================

INSERT INTO phien_dang_nhap (
    tai_khoan_id, ma_phien_bam, ngay_het_han,
    phien_ban_xac_thuc, nen_tang, dia_chi_ip, user_agent
)
SELECT id, $2, $3, phien_ban_xac_thuc, $4, $5, $6
FROM tai_khoan
WHERE id = $1 AND trang_thai = 'DANG_DUNG'
RETURNING id, ngay_het_han;

-- Lay phien: $1 la hash token do backend tinh tu cookie.
SELECT p.id, p.tai_khoan_id, p.don_vi_dang_chon_id,
       p.chi_nhanh_dang_chon_id, p.ngay_het_han
FROM phien_dang_nhap p
JOIN tai_khoan tk ON tk.id = p.tai_khoan_id
WHERE p.ma_phien_bam = $1
  AND p.ngay_thu_hoi IS NULL
  AND p.ngay_het_han > now()
  AND p.phien_ban_xac_thuc = tk.phien_ban_xac_thuc
  AND tk.trang_thai = 'DANG_DUNG'
  AND (tk.khoa_den IS NULL OR tk.khoa_den <= now());

-- Dang xuat hoac thu hoi phien.
UPDATE phien_dang_nhap
SET ngay_thu_hoi = now(), ly_do_thu_hoi = $2
WHERE id = $1 AND ngay_thu_hoi IS NULL
RETURNING id;

-- Doi/dat lai mat khau: hash moi do backend tao.
-- Tang phien ban de vo hieu cac phien truoc do.
UPDATE tai_khoan
SET mat_khau_bam = $2,
    phien_ban_xac_thuc = phien_ban_xac_thuc + 1
WHERE id = $1
RETURNING id, phien_ban_xac_thuc;

-- ==========================================================
-- DON VI: tao don vi.
-- Service phai tao thanh vien, vai tro va gan vai tro
-- quan tri dau tien trong cung transaction.
-- ==========================================================

INSERT INTO don_vi (ma_don_vi, ten_hien_thi, email_lien_he)
VALUES ($1, $2, $3)
RETURNING id, ma_don_vi, ten_hien_thi;

-- Tao thanh vien dau tien cua don vi.
INSERT INTO thanh_vien_don_vi (
    don_vi_id, tai_khoan_id, ngay_gia_nhap, trang_thai
)
VALUES ($1, $2, now(), 'DANG_LAM')
RETURNING id, don_vi_id, tai_khoan_id;

-- Gan vai tro QUAN_TRI cho thanh vien dau tien.
-- $1: don_vi da tao; $2: thanh_vien_don_vi.id.
INSERT INTO thanh_vien_vai_tro (
    don_vi_id, thanh_vien_don_vi_id, vai_tro_id
)
SELECT vt.don_vi_id, $2, vt.id
FROM vai_tro vt
WHERE vt.don_vi_id = $1
  AND vt.ma_vai_tro = 'QUAN_TRI'
  AND vt.la_vai_tro_he_thong = TRUE
RETURNING id;

-- Xem don vi da duoc backend xac minh.
SELECT id, ma_don_vi, ten_hien_thi, email_lien_he,
       trang_thai, ngay_tao
FROM don_vi
WHERE id = $1;

-- Cap nhat don vi: $1 lay tu session/tenant-scope,
-- khong lay truc tiep tu body de quyet dinh pham vi.
UPDATE don_vi
SET ten_hien_thi = $2, email_lien_he = $3
WHERE id = $1 AND trang_thai = 'DANG_DUNG'
RETURNING id, ten_hien_thi, email_lien_he;

-- ==========================================================
-- CHI NHANH: tat ca truy van deu gioi han don_vi_id.
-- $1: don_vi da xac minh; $2: ma/ID chi nhanh.
-- ==========================================================

INSERT INTO chi_nhanh (
    don_vi_id, ma_chi_nhanh, ten_chi_nhanh,
    loai_chi_nhanh, nguoi_tao_id
)
VALUES ($1, $2, $3, $4, $5)
RETURNING id, don_vi_id, ma_chi_nhanh, ten_chi_nhanh;

SELECT id, ma_chi_nhanh, ten_chi_nhanh,
       loai_chi_nhanh, trang_thai
FROM chi_nhanh
WHERE don_vi_id = $1
ORDER BY ngay_tao DESC, id DESC;

UPDATE chi_nhanh
SET ten_chi_nhanh = $3, nguoi_cap_nhat_id = $4
WHERE don_vi_id = $1 AND id = $2
RETURNING id, don_vi_id, ten_chi_nhanh;

-- Kiem tra chi nhanh thuoc dung don vi va dang hoat dong.
SELECT EXISTS (
    SELECT 1 FROM chi_nhanh
    WHERE don_vi_id = $1 AND id = $2 AND trang_thai = 'DANG_DUNG'
) AS chi_nhanh_hop_le;

-- ==========================================================
-- PHAN QUYEN: phan cong nhan vien vao chi nhanh.
-- ==========================================================

INSERT INTO thanh_vien_chi_nhanh (
    don_vi_id, thanh_vien_don_vi_id, chi_nhanh_id,
    ngay_bat_dau, la_chi_nhanh_chinh
)
VALUES ($1, $2, $3, CURRENT_DATE, $4)
RETURNING id;

-- Gan vai tro: $1 don vi, $2 thanh vien, $3 vai tro,
-- $4 chi nhanh hoac NULL neu vai tro cap don vi.
INSERT INTO thanh_vien_vai_tro (
    don_vi_id, thanh_vien_don_vi_id, vai_tro_id,
    chi_nhanh_id, nguoi_cap_id, ly_do
)
VALUES ($1, $2, $3, $4, $5, $6)
RETURNING id;

-- Thu hoi vai tro: ket thuc hieu luc, khong xoa lich su.
UPDATE thanh_vien_vai_tro
SET ngay_ket_thuc = now(), ly_do = $3
WHERE don_vi_id = $1
  AND id = $2
  AND ngay_ket_thuc IS NULL
RETURNING id, don_vi_id, thanh_vien_don_vi_id, vai_tro_id;