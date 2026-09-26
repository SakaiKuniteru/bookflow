CREATE TABLE IF NOT EXISTS bo_dem_ma_chung (
    don_vi_id INTEGER NOT NULL REFERENCES don_vi(id),
    tien_to VARCHAR(12) NOT NULL CHECK (tien_to ~ '^[A-Z]{2,12}$'),
    ngay DATE NOT NULL,
    gia_tri INTEGER NOT NULL DEFAULT 0 CHECK (gia_tri BETWEEN 0 AND 99999),
    PRIMARY KEY (don_vi_id,tien_to,ngay)
);
DO $$
DECLARE bang TEXT; cot TEXT;
BEGIN
    FOREACH bang IN ARRAY ARRAY['bang_gia_sach','ma_giam_gia','don_hang','chi_tiet_don_hang','van_don','ca_ban_hang','su_dung_ma_giam_gia','giao_dich_thanh_toan','phan_bo_thanh_toan','yeu_cau_hoan_tien','doi_soat_thanh_toan','chi_tiet_doi_soat_thanh_toan','cong_no','but_toan_cong_no','tien_coc','giao_dich_tien_coc'] LOOP
        FOR cot IN SELECT column_name FROM information_schema.columns WHERE table_schema = 'public' AND table_name = bang AND data_type = 'numeric' AND numeric_precision = 18 AND numeric_scale = 2 LOOP
            EXECUTE format('ALTER TABLE public.%I ALTER COLUMN %I TYPE NUMERIC(18,3)',bang,cot);
        END LOOP;
    END LOOP;
END $$;
ALTER TABLE tien_coc ADD COLUMN IF NOT EXISTS so_tien_dang_giu NUMERIC(18,3) NOT NULL DEFAULT 0;
ALTER TABLE tien_coc ADD CONSTRAINT ck_tien_coc_giu_thuc CHECK (so_tien_dang_giu >= 0 AND so_tien_dang_giu + so_tien_da_khau_tru + so_tien_da_hoan <= so_tien_da_thu);
ALTER TABLE yeu_cau_hoan_tien ADD COLUMN IF NOT EXISTS tien_coc_id BIGINT;
ALTER TABLE yeu_cau_hoan_tien ADD CONSTRAINT fk_yeu_cau_hoan_tien_coc FOREIGN KEY (don_vi_id,tien_coc_id) REFERENCES tien_coc(don_vi_id,id);
ALTER TABLE phuong_thuc_thanh_toan ADD CONSTRAINT fk_pttt_chi_nhanh_don_vi FOREIGN KEY (don_vi_id,chi_nhanh_id) REFERENCES chi_nhanh(don_vi_id,id);
ALTER TABLE tai_khoan_nhan_tien ADD CONSTRAINT fk_tknt_chi_nhanh_don_vi FOREIGN KEY (don_vi_id,chi_nhanh_id) REFERENCES chi_nhanh(don_vi_id,id);
ALTER TABLE cong_no ADD CONSTRAINT fk_cong_no_ncc_don_vi FOREIGN KEY (don_vi_id,nha_cung_cap_id) REFERENCES nha_cung_cap(don_vi_id,id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_cong_no_nguon_dang_dung ON cong_no(don_vi_id,loai_cong_no,loai_nguon,nguon_id) WHERE nguon_id IS NOT NULL AND trang_thai <> 'DA_HUY';
CREATE UNIQUE INDEX IF NOT EXISTS uq_coc_nguon_dang_dung ON tien_coc(don_vi_id,loai_doi_tuong,doi_tuong_id) WHERE loai_doi_tuong <> 'KHAC' AND trang_thai <> 'DA_HUY';
CREATE UNIQUE INDEX IF NOT EXISTS uq_tknt_mac_dinh_chi_nhanh ON tai_khoan_nhan_tien(don_vi_id,COALESCE(chi_nhanh_id,0),loai) WHERE mac_dinh = TRUE AND hoat_dong = TRUE;
CREATE UNIQUE INDEX IF NOT EXISTS uq_refund_giao_dich ON yeu_cau_hoan_tien(don_vi_id,giao_dich_hoan_id) WHERE giao_dich_hoan_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_thu_chuyen_khoan_ref ON giao_dich_thanh_toan(don_vi_id,tai_khoan_nhan_id,ma_giao_dich_doi_tac) WHERE loai_giao_dich = 'THU' AND ma_giao_dich_doi_tac IS NOT NULL AND tai_khoan_nhan_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_cong_no_nguon ON cong_no(don_vi_id,loai_nguon,nguon_id);
INSERT INTO quyen(ma_quyen,ten_quyen,nhom_quyen,mo_ta,la_quyen_nhay_cam) VALUES
('payments.read','Xem thanh toán','tai_chinh','Xem danh mục và giao dịch thanh toán',FALSE),
('payments.manage','Quản lý cấu hình thanh toán','tai_chinh','Quản lý phương thức, tài khoản nhận tiền',TRUE),
('payments.collect','Tạo giao dịch thu','tai_chinh','Ghi nhận thu tiền mặt và tạo chuyển khoản/QR',TRUE),
('payments.disburse','Tạo giao dịch chi','tai_chinh','Chi thanh toán công nợ phải trả',TRUE),
('payments.confirm','Xác nhận chuyển khoản','tai_chinh','Xác minh chứng từ tiền đã vào/ra',TRUE),
('payments.refund','Yêu cầu hoàn tiền','tai_chinh','Tạo và xem yêu cầu hoàn tiền',TRUE),
('payments.refund.approve','Duyệt hoàn tiền','tai_chinh','Duyệt khoản hoàn tiền',TRUE),
('payments.reconcile','Đối soát thanh toán','tai_chinh','Đối soát và chốt các đợt',TRUE),
('debts.read','Xem công nợ','tai_chinh','Xem khoản phải thu, phải trả',FALSE),
('debts.manage','Quản lý công nợ','tai_chinh','Tạo, điều chỉnh và xóa nợ',TRUE),
('debts.settle','Thanh toán công nợ','tai_chinh','Thu hoặc chi công nợ',TRUE),
('deposits.read','Xem tiền cọc','tai_chinh','Xem số dư và lịch sử cọc',FALSE),
('deposits.manage','Quản lý tiền cọc','tai_chinh','Tạo, giữ và giải tỏa cọc',TRUE),
('deposits.settle','Thu/khấu trừ/hoàn cọc','tai_chinh','Thu, khấu trừ và yêu cầu hoàn cọc',TRUE)
ON CONFLICT(ma_quyen) DO NOTHING;